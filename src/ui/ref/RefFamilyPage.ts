import { sectionTitle, ua, starsHtml, demoBanner, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { Sibling } from '../../game/Siblings'
import { VISIT_SIBLING_COST } from '../../game/Siblings'
import { PETS } from '../../game/Lifestyle'
import {
  SPOUSE_OPTIONS, DYNASTY_LEGACY_ITEMS, CHILD_EDUCATION_MAX,
  gameYearsElapsed, childCareerDef,
  type DynastyState, type ChildRecord,
} from '../../game/Dynasty'

/* ── Mock veri (yalnız state yokken saf önizleme) ── */
interface Member { avatar: string; name: string; role: string; age: number; trait: string; edu: string; stars: number; heir?: boolean }
const MEMBERS: Member[] = [
  { avatar: REF_ASSETS_V2_GENERIC.avatars.femaleAdult, name: 'Selin Karahan', role: 'Eş · CFO',     age: 31, trait: 'Stratejik', edu: 'MBA',        stars: 4 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngMale,   name: 'Kaan Karahan',  role: 'Oğul · Varis',  age: 19, trait: 'Hırslı',    edu: 'Üniversite', stars: 4, heir: true },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngFemale, name: 'Defne Karahan', role: 'Kız · Stajyer', age: 16, trait: 'Yaratıcı',  edu: 'Lise',       stars: 3 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.elder,       name: 'Rıfat Karahan', role: 'Mentor',        age: 64, trait: 'Bilge',     edu: 'Doktora',    stars: 5 },
]
const HEIR = MEMBERS.find(m => m.heir)!

const TRAIT_LABELS: Record<string, string> = {
  merchant: '💰 Tüccar', diplomat: '🤝 Diplomat', innovator: '💡 Yenilikçi', risk_taker: '🎲 Risk Alıcı',
}

export class RefFamilyPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'AİLE'

  private state?: GameState
  private dynSection!: HTMLElement
  private lastDynSig = ''

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-family-page'

    if (!state) {
      // ── Mock önizleme: gerçek veri yok ──
      this.el.appendChild(demoBanner('hanedan/aile paneli — gerçek oyun verisi yok'))
      this.buildMockBlocks()
    }

    // Canlı bölüm: state varsa hanedan + eş + çocuk + miras + kardeş + pet hepsi buradan
    this.dynSection = document.createElement('div')
    this.dynSection.className = 'ref-family-dyn'
    this.el.appendChild(this.dynSection)

    this.renderDyn()
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /* ── Mock bloklar (state yokken) ── */
  private buildMockBlocks(): void {
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
  }

  /* ── Canlı hanedan (gerçek Dynasty verisi) ── */
  private renderDyn(): void {
    const state = this.state
    if (!state) return
    const d = state.dynasty
    const siblings = (state as unknown as { siblings?: Sibling[] }).siblings ?? []
    const ownedPets = (state as unknown as { lifestyle?: { ownedPets?: { id: string; name: string; adoptedDay: number; lifespanDays: number }[] } }).lifestyle?.ownedPets ?? []

    const sig = [
      d.generation, d.spouseId ?? '-', Math.round(d.spouseSatisfaction ?? 70),
      d.children.map(c => `${c.id}:${Math.round(c.educationXp)}:${c.career ?? '-'}:${Math.round(c.happiness ?? 0)}`).join(','),
      d.activeHeirId ?? d.dynastyBonusId ?? '-',
      (d.legacyItems ?? []).join(','),
      siblings.map(s => `${s.id}:${s.isAlive}:${s.relationshipScore}`).join('|'),
      ownedPets.length,
    ].join('§')
    if (sig === this.lastDynSig) return
    this.lastDynSig = sig

    this.dynSection.innerHTML = ''
    this.dynSection.appendChild(this.buildDynastyHead(state, d))
    this.dynSection.appendChild(this.buildSpouseCard(d))
    if (d.children.length > 0) {
      this.dynSection.appendChild(this.buildChildrenSection(state, d))
    }
    this.dynSection.appendChild(this.buildLegacySection(d))
    if (siblings.length > 0) {
      this.dynSection.appendChild(this.buildSiblingSection(siblings))
    }
    if (ownedPets.length > 0) {
      this.dynSection.appendChild(this.buildPetSection(ownedPets))
    }
  }

  private buildDynastyHead(state: GameState, d: DynastyState): HTMLElement {
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    const famStars = Math.min(5, 1 + d.generation + (d.spouseId ? 1 : 0) + Math.min(2, d.children.length))
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">${state.playerName || 'Baron'} Hanedanı</div>
        <div class="ref-dynasty-sub">${d.generation}. Nesil · ${d.children.length} çocuk</div>
        <div class="ref-dynasty-stars">${starsHtml(famStars)}</div>
      </div>
      <div class="ref-dynasty-score">
        <div class="ref-dynasty-score__n">${state.insurance.dynasty ? 'A+' : '—'}</div>
        <div class="ref-dynasty-score__l">${state.insurance.dynasty ? 'Sigortalı' : 'Sigortasız'}</div>
      </div>
    `
    return crest
  }

  private buildSpouseCard(d: DynastyState): HTMLElement {
    const card = document.createElement('div')
    if (!d.spouseId) {
      card.className = 'ref-spouse-card single'
      card.innerHTML = `
        <span class="ref-spouse-emoji">💍</span>
        <div class="ref-spouse-main">
          <div class="ref-spouse-name">Bekarsın</div>
          <div class="ref-spouse-meta">Evlilik adayları ana oyundaki Hanedan panelinde</div>
        </div>
      `
      return card
    }
    const opt = SPOUSE_OPTIONS.find(o => o.id === d.spouseId)
    const sat = Math.round(d.spouseSatisfaction ?? 70)
    const satClass = sat >= 70 ? 'high' : sat >= 40 ? 'medium' : 'low'
    card.className = 'ref-spouse-card'
    card.innerHTML = `
      <span class="ref-spouse-emoji">${opt?.emoji ?? '💑'}</span>
      <div class="ref-spouse-main">
        <div class="ref-spouse-name">${d.spouseName ?? opt?.name ?? 'Eş'} <span class="ref-spouse-tag">EŞ</span></div>
        <div class="ref-spouse-meta">${TRAIT_LABELS[d.spouseTrait ?? ''] ?? ''} · ${opt?.bonusLabel ?? ''}</div>
        <div class="ref-spouse-sat">
          <span>Memnuniyet ${sat}%</span>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${satClass}" style="width:${sat}%"></div></div>
        </div>
      </div>
    `
    return card
  }

  private buildChildrenSection(state: GameState, d: DynastyState): HTMLElement {
    const wrap = document.createElement('div')
    wrap.appendChild(sectionTitle('Çocuklar', `${d.children.length} çocuk`))
    const list = document.createElement('div')
    list.className = 'ref-member-list'
    const heirId = d.activeHeirId ?? d.dynastyBonusId
    list.innerHTML = d.children.map((c: ChildRecord) => {
      const age = Math.floor(gameYearsElapsed(state.gameTimeMs, c.bornGameDay))
      const eduPct = Math.round((c.educationXp / CHILD_EDUCATION_MAX) * 100)
      const isHeir = c.id === heirId
      const careerInfo = c.career ? childCareerDef(c.career) : null
      const avatar = age < 13 ? '👶' : '🧒'
      return `
        <div class="ref-member-row">
          <span class="ref-child-avatar">${avatar}</span>
          <div class="ref-member-main">
            <div class="ref-member-name">${c.name} ${isHeir ? '<span class="ref-heir-tag">VARİS</span>' : ''}</div>
            <div class="ref-member-role">${careerInfo ? `${careerInfo.emoji} ${careerInfo.name}` : (age >= 18 ? 'Kariyer seçimi bekliyor' : 'Eğitimde')}</div>
            <div class="ref-member-tags">
              <span class="ref-member-chip">🎂 ${age}</span>
              <span class="ref-member-chip">${TRAIT_LABELS[c.trait] ?? c.trait}</span>
              ${c.happiness !== undefined ? `<span class="ref-member-chip">😊 ${Math.round(c.happiness)}%</span>` : ''}
            </div>
            <div class="ref-child-edu">
              <span>🎓 Eğitim ${eduPct}%</span>
              <div class="ref-perf-track sm"><div class="ref-perf-fill ${eduPct >= 70 ? 'high' : 'medium'}" style="width:${eduPct}%"></div></div>
            </div>
          </div>
        </div>`
    }).join('')
    wrap.appendChild(list)
    return wrap
  }

  private buildLegacySection(d: DynastyState): HTMLElement {
    const wrap = document.createElement('div')
    const selected = new Set(d.legacyItems ?? [])
    wrap.appendChild(sectionTitle('Miras Hazırlığı', `${selected.size}/${DYNASTY_LEGACY_ITEMS.length} seçili`))
    const list = document.createElement('div')
    list.className = 'ref-legacy-list'
    list.innerHTML = DYNASTY_LEGACY_ITEMS.map(l => {
      const on = selected.has(l.id)
      return `
        <div class="ref-legacy-row ${on ? '' : 'off'}">
          <span class="ref-legacy-ico-emoji">${l.emoji}</span>
          <div class="ref-legacy-main">
            <div class="ref-legacy-head"><span class="ref-legacy-name">${l.label}</span><span class="ref-legacy-pct">${on ? '✓ Aktif' : 'Pasif'}</span></div>
            <div class="ref-legacy-desc">${l.bonusLabel}</div>
          </div>
        </div>`
    }).join('')
    wrap.appendChild(list)
    return wrap
  }

  private buildSiblingSection(siblings: Sibling[]): HTMLElement {
    const alive = siblings.filter(s => s.isAlive)
    const wrap = document.createElement('div')
    wrap.appendChild(sectionTitle('Kardeşler', `${alive.length} aktif`))
    const list = document.createElement('div')
    list.className = 'ref-sibling-list'
    for (const s of siblings) {
      const row = document.createElement('div')
      row.className = `ref-sibling-row${s.isAlive ? '' : ' deceased'}`
      const relBar = s.isAlive
        ? `<div class="ref-perf-track sm"><div class="ref-perf-fill ${s.relationshipScore >= 70 ? 'high' : 'medium'}" style="width:${s.relationshipScore}%"></div></div>`
        : '<span class="ref-sibling-deceased">Vefat etti</span>'
      row.innerHTML = `
        <span class="ref-sibling-emoji">${s.relation === 'brother' ? '👦' : '👧'}</span>
        <div class="ref-sibling-main">
          <div class="ref-sibling-name">${s.name}</div>
          <div class="ref-sibling-meta">${s.age} yaş · İlişki ${s.relationshipScore}%</div>
          ${relBar}
        </div>
        ${s.isAlive ? `<button class="ref-sibling-visit-btn" type="button" data-sibling="${s.id}">Ziyaret · ${fmtMoney(VISIT_SIBLING_COST)}</button>` : ''}
      `
      list.appendChild(row)
    }
    wrap.appendChild(list)
    return wrap
  }

  private buildPetSection(pets: { id: string; name: string; adoptedDay: number; lifespanDays: number }[]): HTMLElement {
    const wrap = document.createElement('div')
    wrap.appendChild(sectionTitle('Evcil Hayvanlar', `${pets.length} adet`))
    const list = document.createElement('div')
    list.className = 'ref-pet-list'
    for (const pet of pets) {
      const petDef = PETS.find(p => p.id === pet.id)
      const lifePct = Math.max(0, Math.min(100, Math.round((1 - pet.adoptedDay / pet.lifespanDays) * 100)))
      const row = document.createElement('div')
      row.className = 'ref-pet-row'
      row.innerHTML = `
        <span class="ref-pet-emoji">${petDef?.emoji ?? '🐾'}</span>
        <div class="ref-pet-main">
          <div class="ref-pet-name">${pet.name}</div>
          <div class="ref-pet-meta">${petDef?.name ?? ''}</div>
          <div class="ref-perf-track sm"><div class="ref-pet-life ref-perf-fill ${lifePct > 50 ? 'high' : lifePct > 25 ? 'medium' : 'low'}" style="width:${lifePct}%"></div></div>
        </div>
      `
      list.appendChild(row)
    }
    wrap.appendChild(list)
    return wrap
  }

  refresh(state: GameState): void {
    this.state = state
    this.renderDyn()
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-sibling]')
    if (!btn?.dataset.sibling) return
    const ok = (this.state as unknown as { visitSiblingById: (id: string) => boolean }).visitSiblingById(btn.dataset.sibling)
    refToast(ok ? '💕 Ziyaret tamamlandı!' : '💸 Para yetersiz', ok ? 'ok' : 'err')
  }
}
