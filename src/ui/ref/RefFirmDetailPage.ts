import './ref-ui.css'
import { type FirmData, type FirmStatus, firmHeroSrc } from './RefCard'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { assetUrl } from '../../utils/assetUrl'
import { areaChartSvg, gaugeSvg, donutSvg, refToast } from './refShared'
import { i18n } from '../../i18n'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, producerName, type ProducerDef } from '../../game/Economy'
import { fmt } from '../../i18n'
import { FIRM_MAX_LEVEL, firmLevelIncomeMult, isFirmMaxLevel } from '../../game/FirmLevels'
import { hasManager } from '../../game/Managers'

/** Detay sayfasını gerçek GameState'e bağlayan opsiyonel bağlam. */
export interface FirmDetailLiveCtx {
  state: GameState
  producerId: string
  /** Canlı aksiyon (level-up/manager/modernize) sonrası FirmData'yı güncel
   *  state'ten yeniden üretir → açık detay ekranı stale snapshot göstermez. */
  rebuild?: () => FirmData
}

/*
 * Firma Detay sayfası.
 * KURAL: Tüm metin (name / slogan / city / level) firm verisinden DİNAMİK gelir.
 *        Hero görseli SADECE category (iş türü) üzerinden gelir; firma adına bağlı değil.
 *
 * VERİ KAYNAĞI: gelir / gider / büyüme / performans / yıldız / risk → GERÇEK
 * (adapter'dan firmData). Aşağıdaki türetilenler GameState'te ölçülmüyor:
 *   - Gelir trendi (14 gün)   → firmaya özgü deterministik tahmini eğri
 *   - Müşteri memnuniyeti      → performanstan türetilmiş tahmin
 *   - Gider dağılımı            → tipik sektör dağılımı (tahmini yüzde)
 *   - Şubeler                   → GERÇEK firma gelirinden tahmini bölüşüm (toplam ≤ gelir)
 *   - Geliştirme/Şube fiyatları → firma gelirine göre tahmini, deterministik
 * Hepsi UI'da 'tahmini' etiketiyle işaretlenir; aksiyon butonları işlem YAPMAZ (önizleme).
 */

// Tipik sektör gider dağılımı (gerçek gider kalemleri tutulmuyor → tahmini yüzde)
const EXPENSE_SPLIT = [
  { labelKey: 'ref_detail_expense_staff',  value: 42, color: '#2563EB' },
  { labelKey: 'ref_detail_expense_supply', value: 31, color: '#F6A609' },
  { labelKey: 'ref_detail_expense_rent',   value: 18, color: '#13B8A6' },
  { labelKey: 'ref_detail_expense_other',  value: 9,  color: '#94B4C2' },
]

function firmStatusLabel(status: FirmStatus): string {
  if (status === 'karli')   return i18n.t('ref_firm_status_karli')
  if (status === 'buyuyor') return i18n.t('ref_firm_status_buyuyor')
  return i18n.t('ref_firm_status_riskli')
}

function fmtMoney(n: number): string {
  if (n >= 1e9) return `₺${(n / 1e9).toFixed(1)}Mr`
  if (n >= 1e6) return `₺${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `₺${(n / 1e3).toFixed(0)}K`
  return `₺${n}`
}

function stars(count: number, max = 5): string {
  return Array.from({ length: max }, (_, i) =>
    `<span class="${i < count ? 'on' : 'off'}">★</span>`
  ).join('')
}

function perfClass(pct: number): string {
  if (pct >= 70) return 'high'
  if (pct >= 45) return 'medium'
  return 'low'
}

function ua(p: string): string {
  return assetUrl(p.startsWith('/') ? p.slice(1) : p)
}

// Deterministik hash (firma id → sayı) — firmaya özgü tahmini değerler için
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Firmaya özgü, deterministik yükselen gelir trendi (14 nokta).
 *  Gerçek geçmiş yok → tahmini; eğim büyüme oranıyla artar, her firma farklı. */
function firmTrend(id: string, growth: number): number[] {
  let s = hash(id) || 1
  const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 8) / (1 << 23) }
  const slope = 0.6 + Math.min(1.6, growth / 11)
  const out: number[] = []
  let base = 38 + (hash(id) % 14)
  for (let i = 0; i < 14; i++) {
    base += slope + (rnd() - 0.42) * 5
    out.push(+Math.max(10, base).toFixed(1))
  }
  return out
}

/** Şube dağılımı — firmanın GERÇEK gelirinden tahmini bölüşüm.
 *  Şube sayısı seviyeye göre (1-3); şube gelirleri toplamı firma gelirini AŞMAZ. */
function firmBranches(f: FirmData): { name: string; perf: number; income: number }[] {
  const n = Math.min(3, Math.max(1, Math.ceil(f.level / 3)))
  const weights = [0.5, 0.3, 0.2].slice(0, n)
  const wsum = weights.reduce((a, b) => a + b, 0)
  const nameKeys = ['ref_detail_branch_main', 'ref_detail_branch_2nd', 'ref_detail_branch_3rd']
  return weights.map((w, i) => ({
    name: i18n.t(nameKeys[i] as Parameters<typeof i18n.t>[0]),
    income: Math.round((f.income * w) / wsum),
    perf: Math.max(40, Math.min(96, f.performance - i * 9)),
  }))
}

/** Detay sayfasında gösterilen "geliştirme" kartları (görsel/önizleme — işlem yapmaz).
 *  Fiyat firmanın GERÇEK gelirine göre tahmini ve deterministiktir (Math.random YOK). */
const UPGRADE_TILES: { asset: string; labelKey: string; mult: number }[] = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.quality,       labelKey: 'ref_detail_upg_quality',    mult: 0.6 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketing,     labelKey: 'ref_detail_upg_marketing',  mult: 1.0 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.staffTraining, labelKey: 'ref_detail_upg_training',   mult: 1.6 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.automation,    labelKey: 'ref_detail_upg_automation', mult: 2.4 },
]

export class RefFirmDetailPage {
  readonly el: HTMLElement
  private firm: FirmData | null = null
  /** Gerçek veriye bağlıysa (canlı oyun) — aksiyon butonları işlevsel olur. */
  private live?: FirmDetailLiveCtx

  /** Geri butonuna basılınca tetiklenir. */
  onBack?: () => void

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-shell ref-detail'
    this.el.hidden = true
  }

  show(firm: FirmData, live?: FirmDetailLiveCtx): void {
    this.firm = firm
    this.live = live
    this.render()
    this.el.hidden = false
    this.el.scrollTop = 0
  }

  private liveDef(): ProducerDef | undefined {
    if (!this.live) return undefined
    return PRODUCERS.find((p) => p.id === this.live!.producerId)
  }

  /** Canlı aksiyon sonrası: snapshot'ı güncel state'ten tazele, sonra render. */
  private refreshLive(): void {
    if (this.live?.rebuild) this.firm = this.live.rebuild()
    this.render()
  }

  hide(): void { this.el.hidden = true }

  mount(target: HTMLElement): void { target.appendChild(this.el) }

  private render(): void {
    const f = this.firm
    if (!f) return

    const badgeCls = f.status
    const statusLabel = firmStatusLabel(f.status)
    const perf = perfClass(f.performance)
    const net = f.income - f.expense
    const trend = firmTrend(f.id, f.growth)
    const branches = firmBranches(f)
    // Müşteri memnuniyeti: gerçek performanstan türetilen tahmin (ölçüm yok)
    const satisfaction = Math.min(96, f.performance + 12)

    this.el.innerHTML = `
      <!-- Hero -->
      <div class="ref-detail-hero">
        <img src="${firmHeroSrc(f)}" alt="" class="ref-detail-hero__img">
        <div class="ref-detail-hero__scrim"></div>
        <button class="ref-detail-back" type="button" aria-label="${i18n.t('ref_detail_back_button')}">‹</button>
        <span class="ref-firm-badge ${badgeCls} ref-detail-hero__badge">${statusLabel}</span>
        <div class="ref-detail-hero__title">
          <div class="ref-detail-name">${f.name}</div>
          ${f.slogan ? `<div class="ref-detail-slogan">${f.slogan}</div>` : ''}
        </div>
      </div>

      <!-- Scroll body -->
      <div class="ref-body ref-detail-body">

        <!-- Identity row -->
        <div class="ref-detail-id">
          <div class="ref-detail-id__left">
            <span class="ref-detail-lvl">${i18n.t('ref_detail_level_prefix')} ${f.level}</span>
            <div class="ref-stars ref-detail-stars">${stars(f.stars, f.maxStars ?? 5)}</div>
          </div>
          <div class="ref-detail-id__city"><span>📍</span> ${f.city}</div>
        </div>

        ${f.status === 'riskli' && f.riskLevel != null ? `
        <div class="ref-risk-bar ref-detail-risk">
          <span>⚠️</span> ${i18n.t('ref_detail_risk_level_title')} ${f.riskLevel}/100
        </div>` : ''}

        <!-- Net daily strip (GERÇEK gelir - tahmini gider) -->
        <div class="ref-detail-net">
          <span class="ref-detail-net__lbl">${i18n.t('ref_detail_net_daily')}</span>
          <span class="ref-detail-net__val">${fmtMoney(net)}</span>
          <span class="ref-detail-net__growth">▲ ${f.growth.toFixed(1)}%</span>
        </div>

        <!-- Stats grid -->
        <div class="ref-detail-stats">
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">${i18n.t('ref_detail_daily_income')}</span>
            <span class="ref-stat-val income">${fmtMoney(f.income)}</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">${i18n.t('ref_detail_daily_expense')} <span class="ref-est-tag">${i18n.t('ref_detail_est_tag')}</span></span>
            <span class="ref-stat-val expense">${fmtMoney(f.expense)}</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">${i18n.t('ref_detail_growth_label')}</span>
            <span class="ref-stat-val growth">▲${f.growth.toFixed(1)}%</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">${i18n.t('ref_detail_performance_label')}</span>
            <span class="ref-stat-val">${f.performance}%</span>
          </div>
        </div>

        <!-- Performance bar -->
        <div class="ref-perf ref-detail-perf">
          <div class="ref-perf-row">
            <span class="ref-perf-lbl">${i18n.t('ref_detail_operational_performance')}</span>
            <span class="ref-perf-pct">${f.performance}%</span>
          </div>
          <div class="ref-perf-track">
            <div class="ref-perf-fill ${perf}" style="width:${f.performance}%"></div>
          </div>
        </div>

        <!-- Gelir trendi (firmaya özgü tahmini eğri) -->
        <div class="ref-card-soft ref-detail-chart">
          <div class="ref-card-soft__title-row">
            <span class="ref-card-soft__title">${i18n.t('ref_detail_income_trend_title')} <span class="ref-est-tag">${i18n.t('ref_detail_est_tag')}</span></span>
            <span class="ref-chart-up">▲ ${f.growth.toFixed(1)}%</span>
          </div>
          ${areaChartSvg(trend, '#13B8A6', 320, 80)}
        </div>

        <!-- Memnuniyet gauge + Gider donut -->
        <div class="ref-detail-2col">
          <div class="ref-card-soft ref-detail-gauge">
            <div class="ref-card-soft__title">${i18n.t('ref_detail_customer_satisfaction_title')} <span class="ref-est-tag">${i18n.t('ref_detail_est_tag')}</span></div>
            ${gaugeSvg(satisfaction, '#28C76F')}
          </div>
          <div class="ref-card-soft ref-detail-expense">
            <div class="ref-card-soft__title">${i18n.t('ref_detail_expense_distribution_title')} <span class="ref-est-tag">${i18n.t('ref_detail_est_tag')}</span></div>
            <div class="ref-mini-donut">
              ${donutSvg(EXPENSE_SPLIT, 72, 13)}
              <div class="ref-donut-legend sm">
                ${EXPENSE_SPLIT.map(s => `
                  <div class="ref-legend-row">
                    <span class="ref-legend-dot" style="background:${s.color}"></span>
                    <span class="ref-legend-lbl">${i18n.t(s.labelKey as Parameters<typeof i18n.t>[0])}</span>
                    <span class="ref-legend-val">%${s.value}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Upgrades (önizleme) -->
        <div class="ref-detail-section-title">${i18n.t('ref_detail_upgrades_section')} <span class="ref-est-tag">${i18n.t('ref_detail_est_price_tag')}</span></div>
        <div class="ref-detail-upgrades">
          ${UPGRADE_TILES.map(u => `
            <div class="ref-detail-upg">
              <img src="${ua(u.asset)}" alt="" class="ref-detail-upg__img">
              <span class="ref-detail-upg__lbl">${i18n.t(u.labelKey as Parameters<typeof i18n.t>[0])}</span>
              <span class="ref-detail-upg__price">${fmtMoney(Math.max(10_000, Math.round(f.income * u.mult)))}</span>
            </div>
          `).join('')}
        </div>

        <!-- Şubeler (gerçek gelirden tahmini bölüşüm) -->
        <div class="ref-detail-section-title">${i18n.t('ref_detail_branches_section')} <span class="ref-est-tag">${i18n.t('ref_detail_est_tag')}</span></div>
        <div class="ref-branch-list">
          ${branches.map(b => `
            <div class="ref-branch-row">
              <span class="ref-branch-ico">🏬</span>
              <div class="ref-branch-main">
                <div class="ref-branch-name">${b.name}</div>
                <div class="ref-perf-track sm"><div class="ref-perf-fill ${perfClass(b.perf)}" style="width:${b.perf}%"></div></div>
              </div>
              <span class="ref-branch-income">${fmtMoney(b.income)}/g</span>
            </div>
          `).join('')}
        </div>

        ${this.live ? this.liveManageHtml() : `
        <!-- Actions (ÖNİZLEME — işlem yapmaz) -->
        <div class="ref-detail-actions">
          <button class="ref-btn develop" type="button" disabled>${i18n.t('ref_detail_develop_button')}</button>
          <button class="ref-btn modernize" type="button" disabled>${i18n.t('ref_detail_modernize_button')}</button>
          <button class="ref-btn manager" type="button" disabled>${i18n.t('ref_detail_manager_button')}</button>
        </div>
        <div class="ref-preview-note">${i18n.t('ref_detail_preview_note')}</div>`}
      </div>
    `

    const back = this.el.querySelector<HTMLButtonElement>('.ref-detail-back')
    back?.addEventListener('click', () => this.onBack?.())

    if (this.live) this.wireLiveActions()

    // Fade-in hero image after load; keep gradient fallback on error
    const heroImg = this.el.querySelector<HTMLImageElement>('.ref-detail-hero__img')
    if (heroImg) {
      if (heroImg.complete && heroImg.naturalWidth > 0) {
        heroImg.classList.add('loaded')
      } else {
        heroImg.addEventListener('load', () => heroImg.classList.add('loaded'))
      }
    }
  }

  /** Gerçek veriye bağlı yönetim paneli — firma seviyesi + işlevsel aksiyonlar. */
  private liveManageHtml(): string {
    const ctx = this.live!
    const def = this.liveDef()
    if (!def) return ''
    const s = ctx.state
    const lv = s.producerLevel(def.id)
    const maxed = isFirmMaxLevel(lv)
    const lvCost = !maxed ? s.firmLevelUpCostFor(def) : 0
    const canLevel = !maxed && s.money >= lvCost && lvCost > 0

    const managerHired = hasManager(s.managers, def.id)
    const manCost = !managerHired ? s.managerCostFor(def) : 0
    const canManager = !managerHired && s.money >= manCost && manCost > 0

    const isModern = !!s.producerModernized[def.id]
    const modAvailable = s.ipoCount > 0

    const pips = Array.from({ length: FIRM_MAX_LEVEL }, (_, i) =>
      `<span class="ref-prod-lvl-pip${i < lv ? ' on' : ''}"></span>`).join('')

    const lvBtn = maxed
      ? `<button class="ref-btn develop" type="button" disabled>${i18n.t('ref_detail_max_level_button')}</button>`
      : `<button class="ref-btn develop" type="button" data-act="level" ${canLevel ? '' : 'disabled'}>${fmt('ref_detail_develop_level_fmt', { lv: lv + 1, cost: fmtMoney(lvCost) })}</button>`

    const modBtn = !modAvailable
      ? `<button class="ref-btn modernize" type="button" disabled>${i18n.t('ref_detail_modernize_ipo_required')}</button>`
      : isModern
        ? `<button class="ref-btn modernize" type="button" disabled>${i18n.t('ref_detail_modernized_done')}</button>`
        : `<button class="ref-btn modernize" type="button" data-act="modern">${i18n.t('ref_detail_modernize_button')}</button>`

    const manBtn = managerHired
      ? `<button class="ref-btn manager" type="button" disabled>${i18n.t('ref_detail_manager_hired')}</button>`
      : `<button class="ref-btn manager" type="button" data-act="manager" ${canManager ? '' : 'disabled'}>${fmt('ref_detail_manager_hire_fmt', { cost: fmtMoney(manCost) })}</button>`

    const owned = s.producers[def.id] ?? 0
    const baseIncome = Math.round(def.baseIncome * owned)
    const lvMult = firmLevelIncomeMult(lv)
    const actualIncome = Math.round(s.producerIncome(def))

    const incomeBreakdown = owned > 0 ? `
      <div class="ref-detail-income-breakdown">
        <div class="ref-detail-ib-title">${i18n.t('ref_detail_income_summary')}</div>
        <div class="ref-detail-ib-row"><span>${fmt('ref_detail_branch_base_fmt', { count: owned })}</span><b>${fmtMoney(baseIncome)}</b></div>
        <div class="ref-detail-ib-row"><span>${fmt('ref_detail_level_mult_fmt', { lv })}</span><b>×${lvMult.toFixed(2)}</b></div>
        ${managerHired ? `<div class="ref-detail-ib-row"><span>${i18n.t('ref_detail_manager_bonus_label')}</span><b>✓</b></div>` : ''}
        <div class="ref-detail-ib-row ref-detail-ib-row--total"><span>${i18n.t('ref_detail_true_daily')}</span><b>${fmtMoney(actualIncome)}</b></div>
      </div>` : ''

    return `
      <div class="ref-detail-section-title">${fmt('ref_detail_management_fmt', { lv, max: FIRM_MAX_LEVEL })} ${lv > 1 ? `<span class="ref-detail-mult">×${firmLevelIncomeMult(lv).toFixed(2)} ${i18n.t('ref_detail_income_mult_suffix')}</span>` : ''}</div>
      <div class="ref-detail-lvl-pips">${pips}</div>
      ${incomeBreakdown}
      <div class="ref-detail-actions live">
        ${lvBtn}
        ${modBtn}
        ${manBtn}
      </div>
      <div class="ref-preview-note live">${i18n.t('ref_detail_live_note')}</div>`
  }

  private wireLiveActions(): void {
    const ctx = this.live!
    const def = this.liveDef()
    if (!def) return
    const s = ctx.state

    this.el.querySelector<HTMLButtonElement>('[data-act="level"]')?.addEventListener('click', () => {
      const ok = s.levelUpFirm(def.id)
      if (ok) { refToast(fmt('ref_detail_level_up_toast', { name: producerName(def), lv: s.producerLevel(def.id) }), 'ok'); this.refreshLive() }
      else refToast(i18n.t('ref_detail_upgrade_failed'), 'err')
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="modern"]')?.addEventListener('click', () => {
      const ok = s.modernizeProducer(def.id)
      if (ok) { refToast(fmt('ref_detail_modernize_ok_toast', { name: producerName(def) }), 'ok'); this.refreshLive() }
      else refToast(i18n.t('ref_detail_modernize_failed'), 'err')
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="manager"]')?.addEventListener('click', () => {
      const ok = s.hireManager(def.id)
      if (ok) { refToast(fmt('ref_detail_manager_ok_toast', { name: producerName(def) }), 'ok'); this.refreshLive() }
      else refToast(i18n.t('ref_detail_manager_failed'), 'err')
    })
  }
}
