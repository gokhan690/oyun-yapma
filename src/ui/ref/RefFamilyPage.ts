import { sectionTitle, ua, starsHtml, demoBanner } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { gameDay } from '../../game/GameClock'
import { siblingAge } from '../../game/Siblings'

interface Member { avatar: string; name: string; role: string; age: number; trait: string; edu: string; stars: number; heir?: boolean }
const MEMBERS: Member[] = [
  { avatar: REF_ASSETS_V2_GENERIC.avatars.femaleAdult, name: 'Selin Karahan', role: 'Eş · CFO',     age: 31, trait: 'Stratejik', edu: 'MBA',        stars: 4 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngMale,   name: 'Kaan Karahan',  role: 'Oğul · Varis',  age: 19, trait: 'Hırslı',    edu: 'Üniversite', stars: 4, heir: true },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngFemale, name: 'Defne Karahan', role: 'Kız · Stajyer', age: 16, trait: 'Yaratıcı',  edu: 'Lise',       stars: 3 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.elder,       name: 'Rıfat Karahan', role: 'Mentor',        age: 64, trait: 'Bilge',     edu: 'Doktora',    stars: 5 },
]

const HEIR = MEMBERS.find(m => m.heir)!

interface Legacy { asset: string; name: string; pct: number }
const LEGACY: Legacy[] = [
  { asset: REF_ASSETS_V2_GENERIC.family.heirCrown,         name: 'Varis Eğitimi',   pct: 72 },
  { asset: REF_ASSETS_V2_GENERIC.family.inheritanceShield, name: 'Miras Planı',     pct: 55 },
  { asset: REF_ASSETS_V2_GENERIC.family.protectionBadge,   name: 'Servet Koruması', pct: 88 },
]

export class RefFamilyPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'AİLE'
  private liveState?: GameState

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-family-page'
    this.buildStatic()
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  refresh(state: GameState): void {
    this.liveState = state
    this.updateDynamic(state)
  }

  private buildStatic(): void {
    this.el.appendChild(demoBanner('hanedan/aile paneli henüz oyun verisine bağlı değil'))

    // Hanedan başlığı
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">Karahan Hanedanı</div>
        <div class="ref-dynasty-sub">3. Nesil · Kuruluş 1998</div>
        <div class="ref-dynasty-stars">${starsHtml(5)}</div>
      </div>
      <div class="ref-dynasty-score">
        <div class="ref-dynasty-score__n">A+</div>
        <div class="ref-dynasty-score__l">Koruma</div>
      </div>
    `
    this.el.appendChild(crest)

    // Seçilen varis kartı
    const heir = document.createElement('div')
    heir.className = 'ref-heir-card'
    heir.innerHTML = `
      <img src="${ua(HEIR.avatar)}" alt="" class="ref-heir-avatar">
      <div class="ref-heir-main">
        <div class="ref-heir-top"><span class="ref-heir-crown">👑</span><span class="ref-heir-name">${HEIR.name}</span><span class="ref-heir-tag">VARİS</span></div>
        <div class="ref-heir-meta">${HEIR.age} yaş · ${HEIR.trait} · ${HEIR.edu}</div>
        <div class="ref-stars ref-heir-stars">${starsHtml(HEIR.stars)}</div>
      </div>
    `
    this.el.appendChild(heir)

    // Miras hazırlığı
    this.el.appendChild(sectionTitle('Miras Hazırlığı'))
    const legacy = document.createElement('div')
    legacy.className = 'ref-legacy-list'
    legacy.innerHTML = LEGACY.map(l => `
      <div class="ref-legacy-row">
        <img src="${ua(l.asset)}" alt="" class="ref-legacy-ico">
        <div class="ref-legacy-main">
          <div class="ref-legacy-head"><span class="ref-legacy-name">${l.name}</span><span class="ref-legacy-pct">%${l.pct}</span></div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${l.pct >= 70 ? 'high' : 'medium'}" style="width:${l.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(legacy)

    // Aile üyeleri (zengin satır)
    this.el.appendChild(sectionTitle('Aile Üyeleri', `${MEMBERS.length} kişi`))
    const list = document.createElement('div')
    list.className = 'ref-member-list'
    list.innerHTML = MEMBERS.map(m => `
      <div class="ref-member-row">
        <img src="${ua(m.avatar)}" alt="" class="ref-member-avatar">
        <div class="ref-member-main">
          <div class="ref-member-name">${m.name} ${m.heir ? '<span class="ref-heir-tag">VARİS</span>' : ''}</div>
          <div class="ref-member-role">${m.role}</div>
          <div class="ref-member-tags">
            <span class="ref-member-chip">🎂 ${m.age}</span>
            <span class="ref-member-chip">✨ ${m.trait}</span>
            <span class="ref-member-chip">🎓 ${m.edu}</span>
          </div>
        </div>
        <div class="ref-stars ref-member-stars">${starsHtml(m.stars)}</div>
      </div>
    `).join('')
    this.el.appendChild(list)

    // Dynamic sections placeholder
    const sibSection = document.createElement('div')
    sibSection.id = 'ref-siblings-section'
    this.el.appendChild(sibSection)

    const petSection = document.createElement('div')
    petSection.id = 'ref-pets-section'
    this.el.appendChild(petSection)
  }

  private updateDynamic(state: GameState): void {
    this.renderSiblings(state)
    this.renderPets(state)
  }

  private renderSiblings(state: GameState): void {
    const section = this.el.querySelector('#ref-siblings-section')
    if (!section) return
    const siblings = (state.siblings ?? []).filter(s => s.alive)
    if (!siblings.length) { section.innerHTML = ''; return }
    const playerAge = state.playerAge()
    const currentDay = gameDay(state.gameTimeMs)
    section.innerHTML = ''
    const title = sectionTitle('Kardeşler', `${siblings.length} kişi`)
    section.appendChild(title)
    const list = document.createElement('div')
    list.className = 'ref-sibling-list'
    list.innerHTML = siblings.map(s => {
      const age = siblingAge(playerAge, s)
      const rel = s.relationScore
      const relColor = rel >= 70 ? 'high' : rel >= 40 ? 'medium' : 'low'
      const canVisit = s.lastVisitDay < currentDay
      return `
        <div class="ref-sibling-row" data-sibling-id="${s.id}">
          <div class="ref-sibling-avatar">${s.gender === 'male' ? '👨' : '👩'}</div>
          <div class="ref-sibling-main">
            <div class="ref-sibling-name">${s.name}</div>
            <div class="ref-sibling-meta">${age} yaş · ${s.job}</div>
            <div class="ref-sibling-rel">
              <span>İlişki</span>
              <div class="ref-perf-track sm"><div class="ref-perf-fill ${relColor}" style="width:${rel}%"></div></div>
              <span>${rel}/100</span>
            </div>
          </div>
          <button class="ref-sibling-visit-btn${canVisit ? '' : ' disabled'}" data-visit="${s.id}" type="button" ${canVisit ? '' : 'disabled'}>
            ${canVisit ? '🤝 Ziyaret' : '✓ Bugün'}
          </button>
        </div>
      `
    }).join('')
    section.appendChild(list)
  }

  private renderPets(state: GameState): void {
    const section = this.el.querySelector('#ref-pets-section')
    if (!section) return
    const ownedPets = state.lifestyle.ownedPets ?? []
    if (!ownedPets.length) { section.innerHTML = ''; return }
    const currentDay = gameDay(state.gameTimeMs)
    const PET_EMOJI: Record<string, string> = { kopek: '🐕', kedi: '🐈', kus: '🦜', akvaryum: '🐠', at: '🐎', kaplan: '🐅' }
    section.innerHTML = ''
    const title = sectionTitle('Evcil Hayvanlar', `${ownedPets.length} hayvan`)
    section.appendChild(title)
    const list = document.createElement('div')
    list.className = 'ref-pet-list'
    list.innerHTML = ownedPets.map(p => {
      const age = currentDay - p.adoptedDay
      const lifePct = Math.max(0, Math.round((1 - age / p.lifespanDays) * 100))
      const lifeColor = lifePct >= 50 ? 'high' : lifePct >= 25 ? 'medium' : 'low'
      const ageYears = Math.floor(age / 365)
      return `
        <div class="ref-pet-row">
          <span class="ref-pet-ico">${PET_EMOJI[p.id] ?? '🐾'}</span>
          <div class="ref-pet-main">
            <div class="ref-pet-name">${p.name}</div>
            <div class="ref-pet-meta">${ageYears} yaşında</div>
            <div class="ref-pet-life">
              <span>Ömür</span>
              <div class="ref-perf-track sm"><div class="ref-perf-fill ${lifeColor}" style="width:${lifePct}%"></div></div>
              <span>%${lifePct}</span>
            </div>
          </div>
        </div>
      `
    }).join('')
    section.appendChild(list)
  }

  private handleClick(e: Event): void {
    const target = e.target as HTMLElement
    const visitBtn = target.closest('[data-visit]') as HTMLElement | null
    if (visitBtn && this.liveState) {
      const sibId = visitBtn.dataset.visit as string
      this.liveState.visitSibling(sibId)
      this.updateDynamic(this.liveState)
    }
  }
}
