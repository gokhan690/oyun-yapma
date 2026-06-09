import { sectionTitle, ua, starsHtml, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { spouseOptionsForPlayer } from '../../game/Dynasty'
import { SaveManager } from '../../security/SaveManager'

const TRAIT_TR: Record<string, string> = {
  merchant: 'Tüccar', diplomat: 'Diplomat', innovator: 'Yenilikçi', risk_taker: 'Risk Alan',
}
const RISK_TR: Record<string, string> = {
  low: 'Güvenli', gambler: 'Maceraperest', illegal: 'Riskli', scandal: 'Skandal',
}

export class RefFamilyPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'AİLE'
  private state?: GameState

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-family-page'
    this.el.addEventListener('click', (e) => this.handleClick(e))
    this.build()
  }

  refresh(st: GameState): void {
    this.state = st
    this.el.innerHTML = ''
    this.build()
  }

  private build(): void {
    const s = this.state
    if (!s) { this.buildMock(); return }
    this.buildReal(s)
  }

  // ── Gerçek dynasty verisi ────────────────────────────────────────────
  private buildReal(s: GameState): void {
    const d = s.dynasty

    // ── Hanedan başlığı ──────────────────────────────────────────────
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">${s.playerName || 'Baron'} Hanedanı</div>
        <div class="ref-dynasty-sub">${d.generation}. Nesil</div>
        <div class="ref-dynasty-stars">${starsHtml(Math.min(5, d.generation))}</div>
      </div>
      <div class="ref-dynasty-score">
        <div class="ref-dynasty-score__n">${Math.round(s.reputation)}</div>
        <div class="ref-dynasty-score__l">İtibar</div>
      </div>
    `
    this.el.appendChild(crest)

    // ── Eş (evliyse göster, değilse evlilik seçenekleri) ─────────────
    if (d.spouseName) {
      const spouseCard = document.createElement('div')
      spouseCard.className = 'ref-heir-card'
      spouseCard.innerHTML = `
        <img src="${ua(REF_ASSETS_V2_GENERIC.avatars.femaleAdult)}" alt="" class="ref-heir-avatar">
        <div class="ref-heir-main">
          <div class="ref-heir-top">
            <span class="ref-heir-crown">💍</span>
            <span class="ref-heir-name">${d.spouseName}</span>
            <span class="ref-heir-tag">EŞ</span>
          </div>
          <div class="ref-heir-meta">${d.spouseTrait ? (TRAIT_TR[d.spouseTrait] ?? d.spouseTrait) : '—'}</div>
        </div>
      `
      this.el.appendChild(spouseCard)
    } else {
      this.el.appendChild(sectionTitle('Evlilik Adayları'))
      const options = spouseOptionsForPlayer(s.playerGender)
      if (options.length === 0) {
        const note = document.createElement('div')
        note.className = 'ref-preview-note'
        note.textContent = 'Cinsiyet tercihine uygun aday bulunamadı.'
        this.el.appendChild(note)
      } else {
        const grid = document.createElement('div')
        grid.className = 'ref-spouse-grid'
        grid.innerHTML = options.map((sp) => {
          const canAfford = s.canAfford(sp.cost)
          return `
            <div class="ref-spouse-card">
              <span class="ref-spouse-emoji">${sp.emoji}</span>
              <div class="ref-spouse-name">${sp.name}</div>
              <div class="ref-spouse-trait">${TRAIT_TR[sp.trait] ?? sp.trait}</div>
              <div class="ref-spouse-bonus">${sp.bonusLabel}</div>
              <button type="button" class="ref-spouse-btn"
                data-marry="${sp.id}"
                ${canAfford ? '' : 'disabled'}
              >${canAfford ? `Evlen · ${fmtMoney(sp.cost)}` : fmtMoney(sp.cost)}</button>
            </div>`
        }).join('')
        this.el.appendChild(grid)
      }
    }

    // ── Çocuklar ────────────────────────────────────────────────────
    if (d.children.length > 0) {
      this.el.appendChild(sectionTitle('Çocuklar', `${d.children.length} evlat`))
      const list = document.createElement('div')
      list.className = 'ref-member-list'
      list.innerHTML = d.children.map((c) => {
        const isHeir = c.id === d.activeHeirId
        const eduPct = Math.min(100, Math.round(c.educationXp))
        return `
          <div class="ref-member-row">
            <img src="${ua(REF_ASSETS_V2_GENERIC.avatars.youngMale)}" alt="" class="ref-member-avatar">
            <div class="ref-member-main">
              <div class="ref-member-name">${c.name} ${isHeir ? '<span class="ref-heir-tag">VARİS</span>' : ''}</div>
              <div class="ref-member-role">${TRAIT_TR[c.trait] ?? c.trait} · ${RISK_TR[c.riskProfile] ?? c.riskProfile}</div>
              <div class="ref-member-tags">
                <span class="ref-member-chip">🎓 Eğitim %${eduPct}</span>
              </div>
              <div class="ref-perf-track sm"><div class="ref-perf-fill ${eduPct >= 70 ? 'high' : 'medium'}" style="width:${eduPct}%"></div></div>
            </div>
            <div class="ref-stars ref-member-stars">${starsHtml(Math.min(5, Math.round(eduPct / 20)))}</div>
          </div>`
      }).join('')
      this.el.appendChild(list)
    }

    // ── Miras kalemleri (view-only) ──────────────────────────────────
    const legacyItems = [
      { name: 'Varis Eğitimi',   pct: d.activeHeirId ? Math.min(100, (d.children.find(c => c.id === d.activeHeirId)?.educationXp ?? 0)) : 0 },
      { name: 'Miras Planı',     pct: Math.min(100, d.generation * 15) },
      { name: 'Servet Koruması', pct: Math.min(100, Math.round(s.reputation)) },
    ]
    this.el.appendChild(sectionTitle('Miras Hazırlığı'))
    const legacy = document.createElement('div')
    legacy.className = 'ref-legacy-list'
    legacy.innerHTML = legacyItems.map((l) => `
      <div class="ref-legacy-row">
        <img src="${ua(REF_ASSETS_V2_GENERIC.family.inheritanceShield)}" alt="" class="ref-legacy-ico">
        <div class="ref-legacy-main">
          <div class="ref-legacy-head"><span class="ref-legacy-name">${l.name}</span><span class="ref-legacy-pct">%${l.pct}</span></div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${l.pct >= 70 ? 'high' : 'medium'}" style="width:${l.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(legacy)
  }

  // ── Click handler: evlilik ───────────────────────────────────────────
  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-marry]')
    if (!btn || btn.disabled) return
    const id = btn.dataset.marry!
    const ok = s.marrySpouse(id)
    if (ok) {
      new SaveManager().save(s)
      refToast(`${s.dynasty.spouseName} ile evlenildi! 💍`, 'ok')
      this.el.innerHTML = ''
      this.buildReal(s)
    } else {
      refToast('Evlilik gerçekleşmedi — zaten evli ya da para yetersiz', 'err')
    }
  }

  // ── Mock (state yok) ─────────────────────────────────────────────────
  private buildMock(): void {
    const banner = document.createElement('div')
    banner.className = 'ref-demo-banner'
    banner.innerHTML = '<span>🧪</span><span><b>Demo veri</b> — hanedan/aile paneli oyun verisine bağlı değil</span>'
    this.el.appendChild(banner)
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">Karahan Hanedanı</div>
        <div class="ref-dynasty-sub">3. Nesil · Demo</div>
        <div class="ref-dynasty-stars">${starsHtml(5)}</div>
      </div>
    `
    this.el.appendChild(crest)
  }
}
