import { sectionTitle, ua, starsHtml, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { spouseOptionsForPlayer, type ChildRecord } from '../../game/Dynasty'
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
    const spouseHarmony = Math.min(100, Math.round(d.spouseSatisfaction ?? 75))
    const legacyScore = Math.min(100, Math.round(
      (d.activeHeirId ? 30 : 0) +
      Math.min(30, d.generation * 10) +
      Math.min(40, Math.round(s.reputation * 0.4))
    ))
    const familyUnity = d.spouseName ? Math.min(100, spouseHarmony) : 0
    const dynastyEmoji = d.generation >= 3 ? '🏰' : d.generation >= 2 ? '🏛️' : '🏠'

    // ── Hanedan üst kart ──────────────────────────────────────────────
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head-card'
    crest.innerHTML = `
      <div class="ref-dynasty-head-card__main">
        <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
        <div class="ref-dynasty-info">
          <div class="ref-dynasty-name">${dynastyEmoji} ${s.playerName || 'Baron'} Hanedanı</div>
          <div class="ref-dynasty-sub">${d.generation}. Nesil · ${new Date().getFullYear() - d.generation * 25} kuruluşu</div>
          <div class="ref-dynasty-stars">${starsHtml(Math.min(5, d.generation))}</div>
        </div>
      </div>
      <div class="ref-dynasty-head-card__kpis">
        <div class="ref-dynasty-kpi">
          <span class="ref-dynasty-kpi__val">${Math.round(s.reputation)}</span>
          <span class="ref-dynasty-kpi__lbl">Aile Nüfuzu</span>
        </div>
        <div class="ref-dynasty-kpi">
          <span class="ref-dynasty-kpi__val">${familyUnity > 0 ? `%${familyUnity}` : '—'}</span>
          <span class="ref-dynasty-kpi__lbl">Aile Birliği</span>
        </div>
        <div class="ref-dynasty-kpi">
          <span class="ref-dynasty-kpi__val">${legacyScore}</span>
          <span class="ref-dynasty-kpi__lbl">Miras Skoru</span>
        </div>
      </div>
    `
    this.el.appendChild(crest)

    // ── Eş kart (evliyse) ─────────────────────────────────────────────
    if (d.spouseName) {
      this.el.appendChild(sectionTitle('Eş', '💍'))
      const spouseCard = document.createElement('div')
      spouseCard.className = 'ref-spouse-full-card'
      spouseCard.innerHTML = `
        <img src="${ua(REF_ASSETS_V2_GENERIC.avatars.femaleAdult)}" alt="" class="ref-spouse-full-card__avatar">
        <div class="ref-spouse-full-card__info">
          <div class="ref-spouse-full-card__name">${d.spouseName}</div>
          <div class="ref-spouse-full-card__trait">${d.spouseTrait ? (TRAIT_TR[d.spouseTrait] ?? d.spouseTrait) : '—'}</div>
          <div class="ref-spouse-full-card__harmony">
            <span class="ref-spouse-full-card__harmony-lbl">Uyum</span>
            <div class="ref-perf-track sm" style="flex:1"><div class="ref-perf-fill ${spouseHarmony >= 70 ? 'high' : 'medium'}" style="width:${spouseHarmony}%"></div></div>
            <span class="ref-spouse-full-card__harmony-val">%${spouseHarmony}</span>
          </div>
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

    // ── Varis Adayları Listesi ────────────────────────────────────────
    if (d.children.length > 0) {
      this.el.appendChild(sectionTitle('Varis Adayları', `${d.children.length} evlat`))
      const list = document.createElement('div')
      list.className = 'ref-heir-candidates'
      list.innerHTML = d.children.map((c: ChildRecord, idx: number) => {
        const isHeir = c.id === d.activeHeirId
        const eduPct = Math.min(100, Math.round(c.educationXp))
        const happiness = c.happiness ?? 80
        return `
          <div class="ref-heir-candidate-row${isHeir ? ' ref-heir-candidate-row--heir' : ''}">
            <div class="ref-heir-candidate-rank">#${idx + 1}</div>
            <img src="${ua(REF_ASSETS_V2_GENERIC.avatars.youngMale)}" alt="" class="ref-heir-candidate-avatar">
            <div class="ref-heir-candidate-info">
              <div class="ref-heir-candidate-name">
                ${c.name}
                ${isHeir ? '<span class="ref-heir-tag">VARİS</span>' : ''}
              </div>
              <div class="ref-heir-candidate-meta">
                ${TRAIT_TR[c.trait] ?? c.trait} · ${RISK_TR[c.riskProfile] ?? c.riskProfile}
              </div>
              <div class="ref-heir-candidate-stats">
                <span class="ref-heir-chip">🎓 %${eduPct}</span>
                <span class="ref-heir-chip">😊 %${happiness}</span>
                ${c.career ? `<span class="ref-heir-chip">💼 ${c.career}</span>` : ''}
              </div>
              <div class="ref-perf-track sm"><div class="ref-perf-fill ${eduPct >= 70 ? 'high' : 'medium'}" style="width:${eduPct}%"></div></div>
            </div>
            ${isHeir
              ? '<span class="ref-heir-crown-badge">👑</span>'
              : `<button type="button" class="ref-heir-select-btn" data-select-heir="${c.id}">Seç</button>`}
          </div>`
      }).join('')
      this.el.appendChild(list)
    }

    // ── Aile Zaman Çizelgesi ──────────────────────────────────────────
    const timelineItems = [
      { icon: '🏠', label: 'Hanedan Kuruluşu', desc: `${new Date().getFullYear() - d.generation * 25}`, done: true },
      { icon: '💍', label: 'İlk Evlilik', desc: d.spouseName ? d.spouseName : 'Henüz gerçekleşmedi', done: !!d.spouseName },
      { icon: '👶', label: 'İlk Evlat', desc: d.children.length > 0 ? `${d.children[0]!.name}` : 'Bekleniyor', done: d.children.length > 0 },
      { icon: '👑', label: 'Varis Seçimi', desc: d.activeHeirId ? (d.children.find((c) => c.id === d.activeHeirId)?.name ?? '—') : 'Bekleniyor', done: !!d.activeHeirId },
    ]
    this.el.appendChild(sectionTitle('Aile Zaman Çizelgesi'))
    const timeline = document.createElement('div')
    timeline.className = 'ref-family-timeline'
    timeline.innerHTML = timelineItems.map((item, i) => `
      <div class="ref-timeline-item${item.done ? ' ref-timeline-item--done' : ''}">
        <div class="ref-timeline-dot">${item.icon}</div>
        ${i < timelineItems.length - 1 ? '<div class="ref-timeline-line"></div>' : ''}
        <div class="ref-timeline-content">
          <div class="ref-timeline-label">${item.label}</div>
          <div class="ref-timeline-desc">${item.desc}</div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(timeline)

    // ── Miras Hazırlığı + Miras Koruma Skoru ──────────────────────────
    const heirEduPct = d.activeHeirId
      ? Math.min(100, Math.round(d.children.find((c) => c.id === d.activeHeirId)?.educationXp ?? 0))
      : 0
    const legacyItems = [
      { name: 'Varis Eğitimi',   pct: heirEduPct, icon: '🎓' },
      { name: 'Miras Planı',     pct: Math.min(100, d.generation * 15), icon: '📜' },
      { name: 'Servet Koruması', pct: Math.min(100, Math.round(s.reputation)), icon: '🛡️' },
      { name: 'Aile Birliği',    pct: familyUnity, icon: '❤️' },
    ]
    this.el.appendChild(sectionTitle('Miras Hazırlığı'))
    const legacy = document.createElement('div')
    legacy.className = 'ref-legacy-list'
    legacy.innerHTML = legacyItems.map((l) => `
      <div class="ref-legacy-row">
        <span class="ref-legacy-ico-emoji">${l.icon}</span>
        <div class="ref-legacy-main">
          <div class="ref-legacy-head"><span class="ref-legacy-name">${l.name}</span><span class="ref-legacy-pct">%${l.pct}</span></div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${l.pct >= 70 ? 'high' : 'medium'}" style="width:${l.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(legacy)

    // ── Miras Koruma Skoru ─────────────────────────────────────────────
    const scoreCard = document.createElement('div')
    scoreCard.className = 'ref-heritage-score-card'
    scoreCard.innerHTML = `
      <div class="ref-heritage-score-card__label">Miras Koruma Skoru</div>
      <div class="ref-heritage-score-card__score">${legacyScore}<span>/100</span></div>
      <div class="ref-perf-track">
        <div class="ref-perf-fill ${legacyScore >= 70 ? 'high' : legacyScore >= 40 ? 'medium' : 'low'}" style="width:${legacyScore}%"></div>
      </div>
      <div class="ref-heritage-score-card__note">${legacyScore >= 70 ? '✓ Hanedan güvende' : legacyScore >= 40 ? '⚠️ Orta risk' : '🔴 Miras planı yapın'}</div>
    `
    this.el.appendChild(scoreCard)
  }

  // ── Click handler: evlilik + varis seçimi ───────────────────────────
  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const t = e.target as HTMLElement

    const marriageBtn = t.closest<HTMLButtonElement>('[data-marry]')
    if (marriageBtn && !marriageBtn.disabled) {
      const id = marriageBtn.dataset.marry!
      const ok = s.marrySpouse(id)
      if (ok) {
        new SaveManager().save(s)
        refToast(`${s.dynasty.spouseName} ile evlenildi! 💍`, 'ok')
        this.el.innerHTML = ''
        this.buildReal(s)
      } else {
        refToast('Evlilik gerçekleşmedi — zaten evli ya da para yetersiz', 'err')
      }
      return
    }

    const heirBtn = t.closest<HTMLButtonElement>('[data-select-heir]')
    if (heirBtn && !heirBtn.disabled) {
      const heirId = heirBtn.dataset.selectHeir!
      const child = s.dynasty.children.find((c) => c.id === heirId)
      if (child) {
        s.dynasty.activeHeirId = heirId
        new SaveManager().save(s)
        refToast(`👑 ${child.name} varis seçildi`, 'ok')
        this.el.innerHTML = ''
        this.buildReal(s)
      }
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
