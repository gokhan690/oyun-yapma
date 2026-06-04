export type FirmStatus   = 'Karlı' | 'Büyüyor' | 'Riskli'
export type FirmCategory = 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya' | 'illegal'

export interface FirmData {
  id: string
  name: string
  emoji: string
  level: number
  stars: number
  maxStars?: number
  status: FirmStatus
  category: FirmCategory
  income: number
  expense: number
  growth: number
  city: string
  performance: number
  riskLevel?: number
}

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

export class RefCard {
  readonly el: HTMLElement
  readonly data: FirmData

  constructor(firm: FirmData) {
    this.data = firm
    this.el = document.createElement('div')
    this.el.className = 'ref-firm-card'
    this.el.dataset.id = firm.id
    this.el.dataset.category = firm.category
    this.render()
  }

  private render(): void {
    const f = this.data
    const badgeCls = f.status === 'Karlı' ? 'karli' : f.status === 'Büyüyor' ? 'buyuyor' : 'riskli'
    const perf = perfClass(f.performance)

    this.el.innerHTML = `
      <div class="ref-firm-card__body">

        <!-- Left: info block -->
        <div class="ref-firm-card__info">

          <!-- Name row -->
          <div class="ref-firm-top">
            <div class="ref-firm-icon ${f.category}">${f.emoji}</div>
            <div class="ref-firm-head">
              <div class="ref-firm-namebar">
                <span class="ref-firm-name">${f.name}</span>
                <span class="ref-firm-badge ${badgeCls}">${f.status}</span>
                <span class="ref-firm-menu">⋮</span>
              </div>
              <div class="ref-firm-level">
                <span class="ref-level-txt">Seviye ${f.level}</span>
                <div class="ref-stars">${stars(f.stars, f.maxStars ?? 5)}</div>
              </div>
            </div>
          </div>

          ${f.status === 'Riskli' && f.riskLevel != null ? `
          <div class="ref-risk-bar">
            <span>⚠️</span>
            Risk Seviyesi ${f.riskLevel}/100
          </div>` : ''}

          <!-- Stats 2×2 -->
          <div class="ref-firm-stats">
            <div class="ref-stat">
              <span class="ref-stat-lbl">Günlük Gelir</span>
              <span class="ref-stat-val income">${fmtMoney(f.income)}</span>
            </div>
            <div class="ref-stat">
              <span class="ref-stat-lbl">Günlük Gider</span>
              <span class="ref-stat-val expense">${fmtMoney(f.expense)}</span>
            </div>
            <div class="ref-stat">
              <span class="ref-stat-lbl">Büyüme Oranı</span>
              <span class="ref-stat-val growth">▲${f.growth.toFixed(1)}%</span>
            </div>
            <div class="ref-stat">
              <span class="ref-stat-lbl">Şehir</span>
              <span class="ref-stat-val">${f.city}</span>
            </div>
          </div>

          <!-- Performance bar -->
          <div class="ref-perf">
            <div class="ref-perf-row">
              <span class="ref-perf-lbl">Performans</span>
              <span class="ref-perf-pct">${f.performance}%</span>
            </div>
            <div class="ref-perf-track">
              <div class="ref-perf-fill ${perf}" style="width:${f.performance}%"></div>
            </div>
          </div>
        </div>

        <!-- Right: action buttons -->
        <div class="ref-firm-card__btns">
          <button class="ref-btn develop">📈 GELİŞTİR</button>
          <button class="ref-btn modernize">⚙️ MODERNİZE ET</button>
          <button class="ref-btn manager">👤 MANAGER ATA</button>
        </div>
      </div>
    `
  }
}
