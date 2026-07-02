import './ref-ui.css'
import { type FirmData, type FirmStatus, firmHeroSrc } from './RefCard'
import { areaChartSvg, gaugeSvg, donutSvg, refToast, registerSheetDismiss, formatSignedMoneyPerDay, fmtMoneyTrim } from './refShared'
import { i18n } from '../../i18n'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, producerName, type ProducerDef } from '../../game/Economy'
import { fmt } from '../../i18n'
import { FIRM_MAX_LEVEL, firmLevelIncomeMult } from '../../game/FirmLevels'
import { hasManager, MANAGER_BONUS } from '../../game/Managers'
import { firmUpgradesForProducer } from '../../game/FirmUpgrades'
import {
  NAMED_MANAGERS, namedManagerDef, namedManagerFirmBonus,
  managerDisplayName, managerSpecialty, type NamedManagerId,
} from '../../game/NamedManagers'

/** Detay sayfasını gerçek GameState'e bağlayan opsiyonel bağlam. */
export interface FirmDetailLiveCtx {
  state: GameState
  producerId: string
  initialPanel?: 'manager'
  /** Canlı aksiyon (level-up/manager/modernize) sonrası FirmData'yı güncel
   *  state'ten yeniden üretir → açık detay ekranı stale snapshot göstermez. */
  rebuild?: () => FirmData
  onPersist?: () => void
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
 *   - Şube fiyatları            → firma gelirine göre tahmini, deterministik
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
    if (live?.initialPanel === 'manager') {
      const def = this.liveDef()
      if (def) this.openManagerPanel(live.state, def)
    }
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

        ${this.live ? this.liveUpgradeHtml() : ''}

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
  private liveUpgradeHtml(): string {
    const def = this.liveDef()
    const s = this.live?.state
    if (!def || !s) return ''
    const upgrades = firmUpgradesForProducer(def)
    if (upgrades.length === 0) return ''
    return `
      <div class="ref-detail-section-title">${i18n.t('ref_detail_upgrades_section')}</div>
      <div class="ref-detail-upgrades live">
        ${upgrades.map((u) => {
          const st = s.firmUpgradeStatus(def.id, u.id)
          const statusText = this.upgradeStatusText(st)
          const payback = st.paybackDays == null
            ? i18n.t('ref_detail_upgrade_payback_never')
            : `${st.paybackDays} ${i18n.t('time_days')}`
          return `
            <div class="ref-detail-upg live ${st.purchased ? 'owned' : ''}" data-upgrade-id="${u.id}">
              <div class="ref-detail-upg__head">
                <span class="ref-detail-upg__emoji">${u.emoji}</span>
                <div>
                  <div class="ref-detail-upg__lbl">${u.name}</div>
                  <div class="ref-detail-upg__desc">${u.description}</div>
                </div>
              </div>
              <div class="ref-detail-upg__metrics">
                <div><span>${i18n.t('ref_detail_upgrade_current_income')}</span><b>${fmtMoney(st.incomeBefore)}/${i18n.t('time_day')}</b></div>
                <div><span>${i18n.t('ref_detail_upgrade_after_income')}</span><b>${fmtMoney(st.incomeAfter)}/${i18n.t('time_day')}</b></div>
                <div><span>${i18n.t('ref_detail_upgrade_daily_delta')}</span><b class="inc">+${fmtMoney(st.dailyIncomeDelta)}/${i18n.t('time_day')}</b></div>
                <div><span>${i18n.t('ref_detail_upgrade_payback')}</span><b>${payback}</b></div>
              </div>
              <div class="ref-detail-upg__foot">
                <span class="ref-detail-upg__price">${fmtMoney(st.cost)}</span>
                <button class="ref-btn develop ref-detail-upg__buy" type="button" data-upgrade-buy="${u.id}" ${st.canBuy ? '' : 'disabled'}>${statusText}</button>
              </div>
            </div>
          `
        }).join('')}
      </div>`
  }

  private upgradeStatusText(st: ReturnType<GameState['firmUpgradeStatus']>): string {
    if (st.purchased) return i18n.t('ref_detail_upgrade_owned')
    if (st.code === 'not_owned') return i18n.t('ref_detail_upgrade_not_owned')
    if (st.code === 'insufficient_money') {
      return `${i18n.t('ref_detail_upgrade_insufficient')} · ${fmt('ref_detail_upgrade_missing_fmt', { amount: fmtMoney(st.missingMoney) })}`
    }
    if (st.code === 'already_purchased') return i18n.t('ref_detail_upgrade_already_owned')
    if (!st.canBuy) return i18n.t('ref_detail_upgrade_failed')
    return i18n.t('ref_detail_upgrade_buy')
  }

  private liveManageHtml(): string {
    const ctx = this.live!
    const def = this.liveDef()
    if (!def) return ''
    const s = ctx.state
    const lvStatus = s.firmLevelUpStatus(def)
    const lv = lvStatus.level
    const maxed = lvStatus.atMax
    const canLevel = lvStatus.canLevelUp

    // TUR14 P5: isimli menajer ataması (varsa) generic legacy müdürün yerine geçer.
    const assignedId = s.firmAssignedManager(def.id)
    const assignedDef = assignedId ? namedManagerDef(assignedId) : undefined
    const genericManager = hasManager(s.managers, def.id)

    const isModern = !!s.producerModernized[def.id]
    const modAvailable = s.ipoCount > 0

    const pips = Array.from({ length: FIRM_MAX_LEVEL }, (_, i) =>
      `<span class="ref-prod-lvl-pip${i < lv ? ' on' : ''}"></span>`).join('')

    const lvDisabledReason = (!maxed && !canLevel && lvStatus.reason === 'insufficient')
      ? `<span class="ref-detail-develop-reason">${i18n.t('firms_insufficient')}</span>` : ''
    const lvBtn = maxed
      ? `<button class="ref-btn develop" type="button" disabled>${i18n.t('ref_detail_max_level_button')}</button>`
      : `<button class="ref-btn develop" type="button" data-act="level" ${canLevel ? '' : 'disabled'}>
          <span class="ref-detail-develop-main">${fmt('ref_detail_develop_level_fmt', { lv: lvStatus.nextLevel, cost: fmtMoney(lvStatus.cost) })}</span>
          <span class="ref-detail-develop-preview">${fmt('firms_levelup_arrow_fmt', { from: String(lv), to: String(lvStatus.nextLevel) })} · ${fmtMoney(lvStatus.currentIncome)}→${fmtMoney(lvStatus.nextIncome)} · ${fmt('firms_levelup_income_pct_fmt', { pct: String(lvStatus.incomePct) })}</span>
          ${lvDisabledReason}
        </button>`

    const modBtn = !modAvailable
      ? `<button class="ref-btn modernize" type="button" disabled>${i18n.t('ref_detail_modernize_ipo_required')}</button>`
      : isModern
        ? `<button class="ref-btn modernize" type="button" disabled>${i18n.t('ref_detail_modernized_done')}</button>`
        : `<button class="ref-btn modernize" type="button" data-act="modern">${i18n.t('ref_detail_modernize_button')}</button>`

    // Menajer bloğu: atanmış isimli menajer kartı (Değiştir/Görevden Al) ya da
    // legacy generic müdür kartı (isimli menajere yükselt) ya da "Ata" butonu.
    let manBlock: string
    if (assignedDef) {
      const bonusPct = Math.round(namedManagerFirmBonus(assignedDef, def.id) * 100)
      manBlock = `
        <div class="ref-mgr-current">
          <div class="ref-mgr-current__info">
            <span class="ref-mgr-current__emoji">${assignedDef.emoji}</span>
            <div>
              <div class="ref-mgr-current__name">${managerDisplayName(assignedDef)}</div>
              <div class="ref-mgr-current__bonus">${i18n.t('ref_mgr_income_bonus')}: +%${bonusPct} · ${fmtMoneyTrim(assignedDef.dailySalary)}/${i18n.t('time_day')}</div>
            </div>
          </div>
          <div class="ref-mgr-current__actions">
            <button class="ref-btn manager sm" type="button" data-act="manager-panel">${i18n.t('ref_mgr_change')}</button>
          </div>
        </div>`
    } else if (genericManager) {
      manBlock = `
        <div class="ref-mgr-current">
          <div class="ref-mgr-current__info">
            <span class="ref-mgr-current__emoji">🧑‍💼</span>
            <div>
              <div class="ref-mgr-current__name">${i18n.t('ref_mgr_generic_name')}</div>
              <div class="ref-mgr-current__bonus">${i18n.t('ref_mgr_income_bonus')}: +%${Math.round(MANAGER_BONUS * 100)}</div>
            </div>
          </div>
          <button class="ref-btn manager sm" type="button" data-act="manager-panel">${i18n.t('ref_mgr_assign_named')}</button>
        </div>`
    } else {
      manBlock = `<button class="ref-btn manager" type="button" data-act="manager-panel">${i18n.t('ref_mgr_assign_button')}</button>`
    }

    const owned = s.producers[def.id] ?? 0
    const lvMult = firmLevelIncomeMult(lv)
    // TEK GELİR KAYNAĞI — toplam/birim, GameState.producerIncome pipeline'ından.
    const actualIncome = Math.round(s.producerIncome(def))
    const unitIncome = Math.round(s.producerUnitIncome(def))

    const incomeBreakdown = owned > 0 ? `
      <div class="ref-detail-income-breakdown">
        <div class="ref-detail-ib-title">${i18n.t('ref_detail_income_summary')}</div>
        <div class="ref-detail-ib-row ref-detail-ib-row--total"><span>${i18n.t('firms_stat_total_income')}</span><b>${fmtMoney(actualIncome)}</b></div>
        <div class="ref-detail-ib-row"><span>${i18n.t('firms_stat_unit_income')}</span><b>${fmtMoney(unitIncome)}</b></div>
        <div class="ref-detail-ib-row"><span>${i18n.t('firms_stat_count')}</span><b>${owned}</b></div>
        <div class="ref-detail-ib-row"><span>${fmt('ref_detail_level_mult_fmt', { lv })}</span><b>×${lvMult.toFixed(2)}</b></div>
        ${assignedDef ? `<div class="ref-detail-ib-row"><span>${i18n.t('ref_detail_manager_bonus_label')}</span><b>${assignedDef.emoji} ${managerDisplayName(assignedDef)}</b></div>`
          : genericManager ? `<div class="ref-detail-ib-row"><span>${i18n.t('ref_detail_manager_bonus_label')}</span><b>${i18n.t('ref_mgr_generic_name')}</b></div>` : ''}
      </div>` : ''

    return `
      <div class="ref-detail-section-title">${fmt('ref_detail_management_fmt', { lv, max: FIRM_MAX_LEVEL })} ${lv > 1 ? `<span class="ref-detail-mult">×${firmLevelIncomeMult(lv).toFixed(2)} ${i18n.t('ref_detail_income_mult_suffix')}</span>` : ''}</div>
      <div class="ref-detail-lvl-pips">${pips}</div>
      ${incomeBreakdown}
      <div class="ref-detail-actions live two">
        ${lvBtn}
        ${modBtn}
      </div>
      <div class="ref-mgr-block">${manBlock}</div>
      ${owned > 0 ? `<button class="ref-btn sell-firm" type="button" data-act="sell">${fmt('ref_detail_sell_button_fmt', { count: String(owned) })}</button>` : ''}
      <div class="ref-preview-note live">${i18n.t('ref_detail_live_note')}</div>`
  }

  /** Geliştir başarısızlığında gerçek nedeni döndürür (genel "başarısız" yerine). */
  private levelUpFailReason(s: GameState, def: ProducerDef): string {
    const st = s.firmLevelUpStatus(def)
    if (st.reason === 'insufficient') return i18n.t('firms_insufficient')
    if (st.reason === 'max') return i18n.t('ref_detail_max_level_button')
    if (st.reason === 'not_owned') return i18n.t('firms_levelup_reason_not_owned')
    return i18n.t('ref_detail_upgrade_failed')
  }

  private wireLiveActions(): void {
    const ctx = this.live!
    const def = this.liveDef()
    if (!def) return
    const s = ctx.state

    this.el.querySelector<HTMLButtonElement>('[data-act="level"]')?.addEventListener('click', () => {
      const ok = s.levelUpFirm(def.id)
      if (ok) { refToast(fmt('ref_detail_level_up_toast', { name: producerName(def), lv: s.producerLevel(def.id) }), 'ok'); this.refreshLive() }
      else refToast(this.levelUpFailReason(s, def), 'err')
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="modern"]')?.addEventListener('click', () => {
      const ok = s.modernizeProducer(def.id)
      if (ok) { refToast(fmt('ref_detail_modernize_ok_toast', { name: producerName(def) }), 'ok'); this.refreshLive() }
      else refToast(i18n.t('ref_detail_modernize_failed'), 'err')
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="manager-panel"]')?.addEventListener('click', () => {
      this.openManagerPanel(s, def)
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="sell"]')?.addEventListener('click', () => {
      this.openSalePanel(s, def)
    })
    this.el.querySelectorAll<HTMLButtonElement>('[data-upgrade-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const upgradeId = btn.dataset.upgradeBuy
        if (!upgradeId) return
        const status = s.firmUpgradeStatus(def.id, upgradeId)
        if (!status.canBuy) {
          refToast(this.upgradeStatusText(status), 'err')
          return
        }
        const ok = s.buyFirmUpgrade(def.id, upgradeId)
        if (ok) {
          this.refreshLive()
          ctx.onPersist?.()
          refToast(i18n.t('ref_detail_upgrade_bought_toast'), 'ok')
        } else {
          refToast(i18n.t('ref_detail_upgrade_failed'), 'err')
        }
      })
    })
  }

  /* ── TUR14 P5: İsimli menajer seçim paneli ── */
  private mgrOverlay: HTMLElement | null = null
  private mgrDismiss: (() => void) | null = null

  private closeManagerPanel(): void {
    if (this.mgrOverlay) { this.mgrOverlay.remove(); this.mgrOverlay = null }
    this.mgrDismiss?.(); this.mgrDismiss = null
  }

  private openManagerPanel(s: GameState, def: ProducerDef): void {
    this.closeManagerPanel()
    const overlay = document.createElement('div')
    overlay.className = 'ref-trade-overlay'
    const sheet = document.createElement('div')
    sheet.className = 'ref-trade-sheet ref-mgr-sheet'
    overlay.appendChild(sheet)
    this.mgrOverlay = overlay
    this.mgrDismiss = registerSheetDismiss(() => this.closeManagerPanel())
    let confirmingDismiss = false
    const render = () => { sheet.innerHTML = this.managerPanelHtml(s, def, confirmingDismiss) }
    overlay.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement
      if (target === overlay || target.closest('[data-mgr-close]')) { this.closeManagerPanel(); return }
      const dismissBtn = target.closest<HTMLButtonElement>('[data-mgr-dismiss]')
      if (dismissBtn && !dismissBtn.disabled) {
        if (!confirmingDismiss) { confirmingDismiss = true; render(); return }
        if (s.unassignFirmManager(def.id)) {
          confirmingDismiss = false
          this.refreshLive()
          this.live?.onPersist?.()
          render()
          refToast(i18n.t('ref_mgr_dismissed_toast'), 'ok')
        }
        return
      }
      const assignBtn = target.closest<HTMLButtonElement>('[data-mgr-assign]')
      if (assignBtn && !assignBtn.disabled) {
        const r = s.assignFirmManager(def.id, assignBtn.dataset.mgrAssign as NamedManagerId)
        if (r.ok) {
          this.closeManagerPanel()
          this.refreshLive()
          this.live?.onPersist?.()
          refToast(i18n.t('ref_mgr_assigned_toast'), 'ok')
        } else {
          refToast(this.managerReasonText(r.reason), 'err')
          render() // yetersiz bakiye vb. durumda paneli güncel tut
        }
      }
    })
    document.body.appendChild(overlay)
    render()
  }

  private managerReasonText(reason: string): string {
    if (reason === 'insufficient') return i18n.t('ref_mgr_reason_insufficient')
    if (reason === 'not_owned') return i18n.t('ref_mgr_reason_not_owned')
    if (reason === 'already_here') return i18n.t('ref_mgr_reason_already_here')
    if (reason === 'not_eligible') return i18n.t('ref_mgr_reason_not_eligible')
    if (reason === 'firm_level_required') return i18n.t('ref_mgr_reason_firm_level')
    if (reason === 'firm_has_manager') return i18n.t('ref_mgr_reason_firm_has_manager')
    if (reason === 'assigned_elsewhere') return i18n.t('ref_mgr_reason_assigned_elsewhere')
    return i18n.t('ref_detail_manager_failed')
  }

  /** Tek bir menajer kartı (uygunluk grubuna göre filtrelenmiş listede gösterilir). */
  private managerCardHtml(def: ProducerDef, m: typeof NAMED_MANAGERS[number], pv: ReturnType<GameState['managerHireStatus']>, showAssignButton = true): string {
    let statusLbl: string, statusCls: string
    if (pv.assignedFirmId === def.id) { statusLbl = i18n.t('ref_mgr_status_here'); statusCls = 'here' }
    else if (pv.assignedFirmId) { statusLbl = i18n.t('ref_mgr_status_other'); statusCls = 'other' }
    else if (pv.alreadyHired) { statusLbl = i18n.t('ref_mgr_status_idle'); statusCls = 'idle' }
    else { statusLbl = i18n.t('ref_mgr_status_new'); statusCls = 'new' }

    const applLbl = pv.applicabilityType === 'specific' ? i18n.t('ref_mgr_appl_specific') : i18n.t('ref_mgr_appl_general')
    const firmBonus = namedManagerFirmBonus(m, def.id)
    const bonusLine = firmBonus > 0
      ? fmt('ref_mgr_firm_income_fmt', { from: fmtMoneyTrim(pv.incomeBefore), to: fmtMoneyTrim(pv.incomeAfter) })
      : `<span class="ref-mgr-nobonus">${i18n.t('ref_mgr_no_firm_bonus')}</span>`
    const netCls = pv.netDailyDelta > 0 ? 'up' : pv.netDailyDelta < 0 ? 'down' : 'muted'
    const hireLine = pv.alreadyHired
      ? i18n.t('ref_mgr_already_hired')
      : fmt('ref_mgr_hire_cost_fmt', { cost: fmtMoneyTrim(pv.hireCost) })
    const paybackLine = pv.paybackDays == null
      ? i18n.t(pv.netDailyDelta <= 0 ? 'ref_mgr_inefficient' : 'ref_mgr_payback_none')
      : fmt('ref_mgr_payback_fmt', { days: String(pv.paybackDays) })
    const lossWarn = pv.netDailyDelta < 0
      ? `<div class="ref-mgr-card__loss">${fmt('ref_mgr_loss_warn', { amount: fmtMoneyTrim(Math.abs(pv.netDailyDelta)) })}</div>` : ''
    const reasonNote = (!pv.canAssign && pv.reason !== 'already_here')
      ? `<div class="ref-mgr-card__reason">${this.managerReasonText(pv.reason)}</div>` : ''
    const btnLbl = pv.assignedFirmId === def.id ? i18n.t('ref_mgr_status_here') : i18n.t('ref_mgr_assign_here')
    return `
      <div class="ref-mgr-card">
        <div class="ref-mgr-card__head">
          <span class="ref-mgr-card__emoji">${m.emoji}</span>
          <div class="ref-mgr-card__id">
            <div class="ref-mgr-card__name">${managerDisplayName(m)}</div>
            <div class="ref-mgr-card__spec">${managerSpecialty(m)} · <span class="ref-mgr-appl ${pv.applicabilityType}">${applLbl}</span></div>
          </div>
          <span class="ref-mgr-card__status ${statusCls}">${statusLbl}</span>
        </div>
        <div class="ref-mgr-card__rows">
          <div class="ref-mgr-row"><span>${hireLine}</span><span>${i18n.t('ref_mgr_daily_salary')}: ${fmtMoneyTrim(pv.salaryPerDay)}</span></div>
          <div class="ref-mgr-row firm">${bonusLine}</div>
          <div class="ref-mgr-row gross"><span>${i18n.t('ref_mgr_gross_daily')}</span><b>${formatSignedMoneyPerDay(pv.grossDailyDelta)}</b></div>
          <div class="ref-mgr-row net"><span>${i18n.t('ref_mgr_net_daily')}</span><b class="ref-pl-${netCls}">${formatSignedMoneyPerDay(pv.netDailyDelta)}</b></div>
          <div class="ref-mgr-row payback"><span>${i18n.t('ref_mgr_payback_label')}</span><span>${paybackLine}</span></div>
        </div>
        ${lossWarn}
        ${reasonNote}
        ${showAssignButton ? `<button class="ref-btn manager mgr-assign" type="button" data-mgr-assign="${m.id}" ${pv.canAssign ? '' : 'disabled'}>${btnLbl}</button>` : ''}
      </div>`
  }

  private currentManagerHtml(s: GameState, def: ProducerDef, confirmingDismiss: boolean): string {
    const assignedId = s.firmAssignedManager(def.id)
    const m = assignedId ? namedManagerDef(assignedId) : undefined
    if (!m) return ''
    const pv = s.managerHireStatus(def.id, m.id)
    const dismissLabel = confirmingDismiss ? i18n.t('ref_mgr_dismiss_confirm') : i18n.t('ref_mgr_dismiss')
    return `
      <div class="ref-mgr-current-section" data-testid="manager-current-section">
        <div class="ref-mgr-group-title">${i18n.t('ref_mgr_current_section')}</div>
        ${this.managerCardHtml(def, m, pv, false)}
        <button class="ref-btn manager mgr-dismiss" type="button" data-mgr-dismiss>${dismissLabel}</button>
      </div>`
  }

  private managerPanelHtml(s: GameState, def: ProducerDef, confirmingDismiss = false): string {
    // Yalnız bu firmada ANLAMLI menajerler: firmaya özel + genel bonus (gerçek
    // bonus tanımından türetilir; alakasız menajer panelde GÖSTERİLMEZ).
    const assignedId = s.firmAssignedManager(def.id)
    const entries = NAMED_MANAGERS
      .map((m) => ({ m, pv: s.managerHireStatus(def.id, m.id) }))
      .filter((e) => e.pv.appliesToFirm)
      .filter((e) => e.m.id !== assignedId)
    const specific = entries.filter((e) => e.pv.applicabilityType === 'specific')
    const general = entries.filter((e) => e.pv.applicabilityType === 'general')
    // Küçük firma uyarısı: gösterilen tüm uygun seçenekler net-negatifse.
    const allNegative = entries.length > 0 && entries.every((e) => e.pv.netDailyDelta < 0)
    const smallWarn = allNegative ? `<div class="ref-mgr-toosmall">⚠️ ${i18n.t('ref_mgr_firm_too_small')}</div>` : ''
    const group = (title: string, testId: string, list: typeof entries) => list.length === 0 ? '' : `
      <div class="ref-mgr-group" data-testid="${testId}">
      <div class="ref-mgr-group-title">${title}</div>
      ${list.map((e) => this.managerCardHtml(def, e.m, e.pv)).join('')}`
      + '</div>'
    const body = entries.length === 0
      ? `<div class="ref-mgr-empty">${i18n.t('ref_mgr_none_applicable')}</div>`
      : this.currentManagerHtml(s, def, confirmingDismiss)
        + group(i18n.t('ref_mgr_group_specific'), 'manager-group-specific', specific)
        + group(i18n.t('ref_mgr_group_general'), 'manager-group-general', general)
    return `
      <div class="ref-trade-handle"></div>
      <div class="ref-trade-head">
        <div class="ref-trade-title">👔 ${i18n.t('ref_mgr_panel_title')} — ${producerName(def)}</div>
        <button class="ref-trade-close" type="button" data-mgr-close>✕</button>
      </div>
      ${smallWarn}
      <div class="ref-mgr-list">${body}</div>`
  }

  /* ── TUR14 P5: Firma satış paneli (1 / 10 / Tümü) ── */
  private saleOverlay: HTMLElement | null = null
  private saleDismiss: (() => void) | null = null
  private saleBusy = false

  private closeSalePanel(): void {
    if (this.saleOverlay) { this.saleOverlay.remove(); this.saleOverlay = null }
    this.saleDismiss?.(); this.saleDismiss = null
    this.saleBusy = false
  }

  private resolveSaleQty(s: GameState, def: ProducerDef, key: string): number {
    const owned = s.producers[def.id] ?? 0
    if (key === '1') return Math.min(1, owned)
    if (key === '10') return Math.min(10, owned)
    if (key === 'all') return owned
    return Math.min(1, owned)
  }

  private openSalePanel(s: GameState, def: ProducerDef): void {
    this.closeSalePanel()
    let qty = Math.min(1, s.producers[def.id] ?? 0)
    let confirmingLast = false

    const overlay = document.createElement('div')
    overlay.className = 'ref-trade-overlay'
    const sheet = document.createElement('div')
    sheet.className = 'ref-trade-sheet'
    overlay.appendChild(sheet)
    this.saleOverlay = overlay
    this.saleDismiss = registerSheetDismiss(() => this.closeSalePanel())

    const render = () => { sheet.innerHTML = this.salePanelHtml(s, def, qty, confirmingLast) }

    overlay.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement
      if (target === overlay || target.closest('[data-sale-close]')) { this.closeSalePanel(); return }
      const qBtn = target.closest<HTMLElement>('[data-sale-qty]')
      if (qBtn) { qty = this.resolveSaleQty(s, def, qBtn.dataset.saleQty!); confirmingLast = false; render(); return }
      const confirmBtn = target.closest<HTMLButtonElement>('[data-sale-confirm]')
      if (confirmBtn && !confirmBtn.disabled) {
        if (this.saleBusy) return                  // çift işlem koruması
        const owned = s.producers[def.id] ?? 0
        // Son birimi satıyorsa ikinci onay iste (firma tamamen kapanır).
        if (qty >= owned && !confirmingLast) { confirmingLast = true; render(); return }
        this.saleBusy = true
        const ok = s.sellProducer(def.id, qty)
        this.closeSalePanel()
        if (ok) {
          refToast(fmt('ref_detail_sell_ok_toast', { name: producerName(def), count: String(qty) }), 'ok')
          // Firma tamamen kapandıysa stale detay ekranı bırakma — listeye dön.
          if ((s.producers[def.id] ?? 0) <= 0) this.onBack?.()
          else this.refreshLive()
        } else refToast(i18n.t('ref_detail_sell_failed'), 'err')
      }
    })
    document.body.appendChild(overlay)
    render()
  }

  private salePanelHtml(s: GameState, def: ProducerDef, qty: number, confirmingLast: boolean): string {
    const owned = s.producers[def.id] ?? 0
    const pv = s.sellProducerPreview(def.id, qty)
    const presets: { key: string; label: string }[] = [
      { key: '1', label: '1' }, { key: '10', label: '10' },
      { key: 'all', label: i18n.t('ref_detail_sell_all') },
    ]
    const qtyBtns = presets.map((p) => `<button class="ref-trade-qty-btn" type="button" data-sale-qty="${p.key}">${p.label}</button>`).join('')
    const confirmLabel = confirmingLast
      ? i18n.t('ref_detail_sell_confirm_last')
      : fmt('ref_detail_sell_confirm_fmt', { count: String(pv.count) })
    return `
      <div class="ref-trade-handle"></div>
      <div class="ref-trade-head">
        <div class="ref-trade-title">🏷️ ${producerName(def)}</div>
        <button class="ref-trade-close" type="button" data-sale-close>✕</button>
      </div>
      <div class="ref-trade-position">
        ${this.saleRow(i18n.t('ref_detail_sell_owned'), String(owned))}
      </div>
      <div class="ref-trade-qtyrow three">${qtyBtns}</div>
      <div class="ref-trade-preview">
        ${this.saleRow(i18n.t('ref_detail_sell_qty'), String(pv.count))}
        ${this.saleRow(i18n.t('ref_detail_sell_proceeds'), fmtMoney(pv.refund), 'strong')}
        ${this.saleRow(i18n.t('ref_detail_sell_income_drop'), `−${fmtMoney(pv.incomeDrop)}/g`)}
        ${this.saleRow(i18n.t('ref_detail_sell_remaining'), String(pv.remaining))}
      </div>
      ${confirmingLast ? `<div class="ref-sale-warn">⚠️ ${i18n.t('ref_detail_sell_last_warn')}</div>` : ''}
      <button class="ref-trade-confirm sell" type="button" data-sale-confirm ${pv.count <= 0 ? 'disabled' : ''}>${confirmLabel}</button>`
  }

  private saleRow(label: string, value: string, mod = ''): string {
    return `<div class="ref-trade-row ${mod}"><span>${label}</span><b>${value}</b></div>`
  }
}
