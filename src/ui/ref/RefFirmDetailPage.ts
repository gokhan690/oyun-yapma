import './ref-ui.css'
import { type FirmData, firmHeroSrc } from './RefCard'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { assetUrl } from '../../utils/assetUrl'
import { areaChartSvg, gaugeSvg, donutSvg } from './refShared'

const REVENUE_TREND = [42, 48, 45, 52, 58, 55, 63, 61, 68, 72, 70, 78, 82, 88]
const EXPENSE_SPLIT = [
  { label: 'Personel',  value: 42, color: '#2563EB' },
  { label: 'Tedarik',   value: 31, color: '#F6A609' },
  { label: 'Kira',      value: 18, color: '#13B8A6' },
  { label: 'Diğer',     value: 9,  color: '#94B4C2' },
]
const BRANCHES = [
  { city: 'Merkez Şube', perf: 88, income: 240_000 },
  { city: '2. Şube',     perf: 74, income: 180_000 },
  { city: '3. Şube',     perf: 61, income: 120_000 },
]

/*
 * Firma Detay sayfası.
 * KURAL: Tüm metin (name / slogan / city / level) firm verisinden DİNAMİK gelir.
 *        Hero görseli SADECE category (iş türü) üzerinden gelir; firma adına bağlı değil.
 */

function fmtMoney(n: number): string {
  if (n >= 1e9) return `₺${(n / 1e9).toFixed(1)}M`
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

/** Detay sayfasında gösterilen örnek "geliştirme" kartları (mock). */
const UPGRADE_TILES: { asset: string; label: string }[] = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.quality,        label: 'Kalite' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketing,      label: 'Pazarlama' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.staffTraining,  label: 'Eğitim' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.automation,     label: 'Otomasyon' },
]

export class RefFirmDetailPage {
  readonly el: HTMLElement
  private firm: FirmData | null = null

  /** Geri butonuna basılınca tetiklenir. */
  onBack?: () => void

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-shell ref-detail'
    this.el.hidden = true
  }

  show(firm: FirmData): void {
    this.firm = firm
    this.render()
    this.el.hidden = false
    this.el.scrollTop = 0
  }

  hide(): void { this.el.hidden = true }

  mount(target: HTMLElement): void { target.appendChild(this.el) }

  private render(): void {
    const f = this.firm
    if (!f) return

    const badgeCls = f.status === 'Karlı' ? 'karli' : f.status === 'Büyüyor' ? 'buyuyor' : 'riskli'
    const perf = perfClass(f.performance)
    const net = f.income - f.expense

    this.el.innerHTML = `
      <!-- Hero -->
      <div class="ref-detail-hero">
        <img src="${firmHeroSrc(f)}" alt="" class="ref-detail-hero__img">
        <div class="ref-detail-hero__scrim"></div>
        <button class="ref-detail-back" type="button" aria-label="Geri">‹</button>
        <span class="ref-firm-badge ${badgeCls} ref-detail-hero__badge">${f.status}</span>
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
            <span class="ref-detail-lvl">Seviye ${f.level}</span>
            <div class="ref-stars ref-detail-stars">${stars(f.stars, f.maxStars ?? 5)}</div>
          </div>
          <div class="ref-detail-id__city"><span>📍</span> ${f.city}</div>
        </div>

        ${f.status === 'Riskli' && f.riskLevel != null ? `
        <div class="ref-risk-bar ref-detail-risk">
          <span>⚠️</span> Risk Seviyesi ${f.riskLevel}/100
        </div>` : ''}

        <!-- Net daily strip -->
        <div class="ref-detail-net">
          <span class="ref-detail-net__lbl">Net Günlük</span>
          <span class="ref-detail-net__val">${fmtMoney(net)}</span>
          <span class="ref-detail-net__growth">▲ ${f.growth.toFixed(1)}%</span>
        </div>

        <!-- Stats grid -->
        <div class="ref-detail-stats">
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">Günlük Gelir</span>
            <span class="ref-stat-val income">${fmtMoney(f.income)}</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">Günlük Gider</span>
            <span class="ref-stat-val expense">${fmtMoney(f.expense)}</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">Büyüme</span>
            <span class="ref-stat-val growth">▲${f.growth.toFixed(1)}%</span>
          </div>
          <div class="ref-detail-stat">
            <span class="ref-stat-lbl">Performans</span>
            <span class="ref-stat-val">${f.performance}%</span>
          </div>
        </div>

        <!-- Performance bar -->
        <div class="ref-perf ref-detail-perf">
          <div class="ref-perf-row">
            <span class="ref-perf-lbl">Operasyonel Performans</span>
            <span class="ref-perf-pct">${f.performance}%</span>
          </div>
          <div class="ref-perf-track">
            <div class="ref-perf-fill ${perf}" style="width:${f.performance}%"></div>
          </div>
        </div>

        <!-- Gelir trendi -->
        <div class="ref-card-soft ref-detail-chart">
          <div class="ref-card-soft__title-row">
            <span class="ref-card-soft__title">Gelir Trendi · 14 gün</span>
            <span class="ref-chart-up">▲ ${f.growth.toFixed(1)}%</span>
          </div>
          ${areaChartSvg(REVENUE_TREND, '#13B8A6', 320, 80)}
        </div>

        <!-- Memnuniyet gauge + Gider donut -->
        <div class="ref-detail-2col">
          <div class="ref-card-soft ref-detail-gauge">
            <div class="ref-card-soft__title">Müşteri Memnuniyeti</div>
            ${gaugeSvg(Math.min(96, f.performance + 12), '#28C76F')}
          </div>
          <div class="ref-card-soft ref-detail-expense">
            <div class="ref-card-soft__title">Gider Dağılımı</div>
            <div class="ref-mini-donut">
              ${donutSvg(EXPENSE_SPLIT, 72, 13)}
              <div class="ref-donut-legend sm">
                ${EXPENSE_SPLIT.map(s => `
                  <div class="ref-legend-row">
                    <span class="ref-legend-dot" style="background:${s.color}"></span>
                    <span class="ref-legend-lbl">${s.label}</span>
                    <span class="ref-legend-val">%${s.value}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Upgrades -->
        <div class="ref-detail-section-title">Geliştirmeler</div>
        <div class="ref-detail-upgrades">
          ${UPGRADE_TILES.map(u => `
            <div class="ref-detail-upg">
              <img src="${ua(u.asset)}" alt="" class="ref-detail-upg__img">
              <span class="ref-detail-upg__lbl">${u.label}</span>
              <span class="ref-detail-upg__price">₺${(120 + Math.round(Math.random() * 80))}K</span>
            </div>
          `).join('')}
        </div>

        <!-- Şubeler -->
        <div class="ref-detail-section-title">Şubeler</div>
        <div class="ref-branch-list">
          ${BRANCHES.map(b => `
            <div class="ref-branch-row">
              <span class="ref-branch-ico">🏬</span>
              <div class="ref-branch-main">
                <div class="ref-branch-name">${b.city}</div>
                <div class="ref-perf-track sm"><div class="ref-perf-fill ${perfClass(b.perf)}" style="width:${b.perf}%"></div></div>
              </div>
              <span class="ref-branch-income">${fmtMoney(b.income)}/g</span>
            </div>
          `).join('')}
        </div>

        <!-- Actions -->
        <div class="ref-detail-actions">
          <button class="ref-btn develop">📈 GELİŞTİR</button>
          <button class="ref-btn modernize">⚙️ MODERNİZE ET</button>
          <button class="ref-btn manager">👤 MANAGER ATA</button>
        </div>
      </div>
    `

    const back = this.el.querySelector<HTMLButtonElement>('.ref-detail-back')
    back?.addEventListener('click', () => this.onBack?.())
  }
}
