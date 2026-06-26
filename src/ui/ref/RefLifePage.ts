import { sectionTitle, ua, starsHtml, demoBanner, fmtMoney, refToast } from './refShared'
import { i18n, fmt } from '../../i18n'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefSubTabs } from './RefSubTabs'
import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { Sibling } from '../../game/Siblings'
import { VISIT_SIBLING_COST } from '../../game/Siblings'
import {
  RESIDENCES, VEHICLES, PETS, WELLBEING_ACTIVITIES, HOME_ROOMS,
  lifestyleMonthlyExpense, lifestyleRentalIncome, lifestyleReputationBonus,
  stressLabel, hasHomeRoom,
  residenceName, residenceDesc, vehicleName, vehicleDesc,
  homeRoomName, homeRoomBonus, wellbeingName, wellbeingDesc, petName,
  type ResidenceId, type VehicleId, type PetId, type WellbeingActivityId, type HomeRoomId,
} from '../../game/Lifestyle'
import { TRAVEL_DESTINATIONS, travelName, travelDesc, travelBonus, type TravelDestinationId } from '../../game/Travel'
import { HOBBIES, hobbyName, hobbyBonus, type HobbyId } from '../../game/Hobby'
import { gameDay } from '../../game/GameClock'
import {
  SPOUSE_OPTIONS, DYNASTY_LEGACY_ITEMS, CHILD_EDUCATION_MAX,
  gameYearsElapsed, childCareerDef,
  spouseBonusLabel, legacyItemLabel, legacyItemBonusLabel, childCareerName,
  type ChildRecord,
} from '../../game/Dynasty'

const TRAIT_EMOJI: Record<string, string> = {
  merchant: '💰', diplomat: '🤝', innovator: '💡', risk_taker: '🎲',
}
const TRAIT_KEY = {
  merchant: 'ref_life_trait_merchant', diplomat: 'ref_life_trait_diplomat',
  innovator: 'ref_life_trait_innovator', risk_taker: 'ref_life_trait_risk_taker',
} as const

function traitLabel(id: string): string {
  const key = (TRAIT_KEY as Record<string, keyof import('../../i18n/keys').Translations>)[id]
  if (!key) return id
  return `${TRAIT_EMOJI[id]} ${i18n.t(key)}`
}

/**
 * YAŞAM sayfası — 5 alt sekme:
 *  👨‍👩‍👧 Hanedan: eş + çocuklar + miras (eski Aile sayfası içeriği)
 *  🏠 Ev & Araç: konut/araç katalogu, al/sat/kiraya ver + ev odaları
 *  ✈️ Seyahat & Hobi: destinasyonlar + hobi seçimi + huzur aktiviteleri
 *  🐾 Evcil & Kardeşler: pet katalog/ömür + kardeş ziyaretleri
 *  🛍️ Alışveriş: yaşam gideri özeti + hızlı alımlar
 */
export class RefLifePage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_life_title') }
  readonly titleDeco = '👨‍👩‍👧'

  private state?: GameState
  private tabs: RefSubTabs
  private kpiStrip?: RefKpiStrip
  private lastDynSig = ''
  private lastHomeSig = ''
  private lastTravelSig = ''
  private lastPetsSig = ''
  private lastShopSig = ''

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-life-page'

    if (!state) this.el.appendChild(demoBanner(i18n.t('ref_life_demo_panel')))

    if (state) {
      this.kpiStrip = new RefKpiStrip(this.buildKpis(state))
      this.el.appendChild(this.kpiStrip.el)
    }

    this.tabs = new RefSubTabs([
      { id: 'dynasty', label: i18n.t('ref_life_tab_dynasty'), icon: '👨‍👩‍👧' },
      { id: 'home',    label: i18n.t('ref_life_tab_home'),    icon: '🏠' },
      { id: 'travel',  label: i18n.t('ref_life_tab_travel'),  icon: '✈️' },
      { id: 'pets',    label: i18n.t('ref_life_tab_pets'),    icon: '🐾' },
      { id: 'shop',    label: i18n.t('ref_life_tab_shop'),    icon: '🛍️' },
    ])
    this.el.appendChild(this.tabs.tabsEl)
    for (const id of ['dynasty', 'home', 'travel', 'pets', 'shop']) {
      this.el.appendChild(this.tabs.section(id))
    }

    this.buildDynasty()
    this.buildHome()
    this.buildTravel()
    this.buildPets()
    this.buildShop()

    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /* ── KPI ─────────────────────────────────────────────────────────── */

  private buildKpis(s: GameState): KpiItem[] {
    const stress = Math.round(s.lifestyle.stress)
    const expense = Math.round(lifestyleMonthlyExpense(s.lifestyle))
    const rental = Math.round(lifestyleRentalIncome(s.lifestyle))
    const repBonus = lifestyleReputationBonus(s.lifestyle)
    return [
      { icon: '😰', label: i18n.t('ref_life_stress_label'), value: `${stress}%`, sub: stressLabel(stress), subDir: stress >= 50 ? 'down' : 'muted' },
      { icon: '💳', label: i18n.t('ref_life_expense'), value: fmtMoney(expense), sub: i18n.t('ref_life_monthly_label'), subDir: 'muted' },
      { icon: '🏠', label: i18n.t('ref_life_rental_income_label'), value: rental > 0 ? fmtMoney(rental) : '—', sub: i18n.t('ref_life_monthly_label'), subDir: rental > 0 ? 'up' : 'muted' },
      { icon: '⭐', label: i18n.t('ref_life_rep_bonus'), value: `+${repBonus}`, sub: i18n.t('ref_life_lifestyle_sub'), subDir: 'muted' },
    ]
  }

  /* ── İmzalar ─────────────────────────────────────────────────────── */

  private dynSig(s: GameState): string {
    const d = s.dynasty
    const siblings = s.siblings ?? []
    return [
      d.generation, d.spouseId ?? '-', Math.round(d.spouseSatisfaction ?? 70),
      d.children.map(c => `${c.id}:${Math.round(c.educationXp)}:${c.career ?? '-'}`).join(','),
      (d.legacyItems ?? []).join(','),
      siblings.map(x => `${x.id}:${x.isAlive}:${x.relationshipScore}`).join('|'),
    ].join('§')
  }

  private homeSig(s: GameState): string {
    const ls = s.lifestyle
    const res = ls.ownedResidences.map(r => `${r.id}:${r.isRenting ? 1 : 0}`).join(',')
    const veh = ls.ownedVehicles.map(v => `${v.id}:${v.isRenting ? 1 : 0}`).join(',')
    const rooms = (ls.homeRooms ?? []).join(',')
    const afford = [...RESIDENCES, ...VEHICLES].map(d => s.money >= d.buyCost ? 1 : 0).join('')
    return `${res}|${veh}|${rooms}|${afford}`
  }

  private travelSig(s: GameState): string {
    const t = s.travel
    const afford = TRAVEL_DESTINATIONS.map(d => (s.money >= d.cost && s.totalEarned >= d.unlockAt) ? 1 : 0).join('')
    const wb = WELLBEING_ACTIVITIES.map(w => s.money >= w.cost ? 1 : 0).join('')
    return `${t.lastDestinationId ?? '-'}|${t.travelBonusUntilDay}|${t.totalTrips}|${s.hobby.hobbyId ?? '-'}|${afford}|${wb}`
  }

  private petsSig(s: GameState): string {
    const pets = (s.lifestyle.ownedPets ?? []).map(p => `${p.id}:${p.adoptedDay}`).join(',')
    const siblings = (s.siblings ?? []).map(x => `${x.id}:${x.isAlive}:${x.relationshipScore}`).join('|')
    const afford = PETS.map(p => s.money >= p.buyCost ? 1 : 0).join('')
    return `${pets}|${siblings}|${afford}|${gameDay(s.gameTimeMs)}`
  }

  private shopSig(s: GameState): string {
    const ls = s.lifestyle
    return `${Math.round(lifestyleMonthlyExpense(ls))}|${Math.round(lifestyleRentalIncome(ls))}|${ls.ownedResidences.length}|${ls.ownedVehicles.length}|${(ls.ownedPets ?? []).length}|${s.hobby.hobbyId ?? '-'}`
  }

  refresh(state: GameState): void {
    this.state = state
    this.kpiStrip?.update(this.buildKpis(state))
    const dSig = this.dynSig(state)
    if (dSig !== this.lastDynSig) { this.lastDynSig = dSig; this.buildDynasty() }
    const hSig = this.homeSig(state)
    if (hSig !== this.lastHomeSig) { this.lastHomeSig = hSig; this.buildHome() }
    const tSig = this.travelSig(state)
    if (tSig !== this.lastTravelSig) { this.lastTravelSig = tSig; this.buildTravel() }
    const pSig = this.petsSig(state)
    if (pSig !== this.lastPetsSig) { this.lastPetsSig = pSig; this.buildPets() }
    const shSig = this.shopSig(state)
    if (shSig !== this.lastShopSig) { this.lastShopSig = shSig; this.buildShop() }
  }

  /* ── Aksiyonlar ──────────────────────────────────────────────────── */

  private handleClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || !this.state) return
    const action = btn.dataset.action ?? ''
    const sep = action.indexOf(':')
    const kind = sep === -1 ? action : action.slice(0, sep)
    const id = sep === -1 ? '' : action.slice(sep + 1)
    const s = this.state

    let ok = false
    let okMsg = `✓ ${i18n.t('ref_life_toast_done')}`
    switch (kind) {
      case 'buy_res':    ok = s.buyResidence(id as ResidenceId);  okMsg = `🏠 ${i18n.t('ref_life_toast_residence_bought')}`; break
      case 'sell_res':   ok = s.sellResidence(id as ResidenceId); okMsg = `🏠 ${i18n.t('ref_life_toast_residence_sold')}`; break
      case 'rent_res': {
        const entry = s.lifestyle.ownedResidences.find(r => r.id === id)
        ok = s.setRentResidence(id as ResidenceId, !(entry?.isRenting))
        okMsg = entry?.isRenting ? `🔑 ${i18n.t('ref_life_toast_rental_off')}` : `🔑 ${i18n.t('ref_life_toast_rental_on')}`
        break
      }
      case 'buy_veh':    ok = s.buyVehicle(id as VehicleId);  okMsg = `🚗 ${i18n.t('ref_life_toast_vehicle_bought')}`; break
      case 'sell_veh':   ok = s.sellVehicle(id as VehicleId); okMsg = `🚗 ${i18n.t('ref_life_toast_vehicle_sold')}`; break
      case 'rent_veh': {
        const entry = s.lifestyle.ownedVehicles.find(v => v.id === id)
        ok = s.setRentVehicle(id as VehicleId, !(entry?.isRenting))
        okMsg = entry?.isRenting ? `🔑 ${i18n.t('ref_life_toast_rental_off')}` : `🔑 ${i18n.t('ref_life_toast_rental_on')}`
        break
      }
      case 'buy_room':   ok = s.buyHomeRoom(id as HomeRoomId); okMsg = `🛋️ ${i18n.t('ref_life_toast_room_added')}`; break
      case 'buy_pet':    ok = s.buyPet(id as PetId); okMsg = `🐾 ${i18n.t('ref_life_toast_pet_adopted')}`; break
      case 'travel':     ok = s.goTravel(id as TravelDestinationId); okMsg = `✈️ ${i18n.t('ref_life_toast_travel_started')}`; break
      case 'hobby':      { s.setHobby(id as HobbyId); ok = true; okMsg = `🎯 ${i18n.t('ref_life_toast_hobby_selected')}` } break
      case 'wellbeing':  ok = s.buyWellbeing(id as WellbeingActivityId); okMsg = `🧘 ${i18n.t('ref_life_toast_wellbeing_done')}`; break
      case 'visit_sibling': {
        ok = (s as unknown as { visitSiblingById: (sid: string) => boolean }).visitSiblingById(id)
        okMsg = `💕 ${i18n.t('ref_life_toast_visit_done')}`
        break
      }
      default: return
    }
    refToast(ok ? okMsg : `💸 ${i18n.t('ref_life_toast_action_failed')}`, ok ? 'ok' : 'err')
    this.refresh(s)
  }

  /* ── 👨‍👩‍👧 HANEDAN ────────────────────────────────────────────────── */

  private buildDynasty(): void {
    const wrap = this.tabs.section('dynasty')
    wrap.innerHTML = ''
    const s = this.state
    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_life_demo_dynasty')))
      return
    }
    const d = s.dynasty

    // Hanedan başlığı
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    const famStars = Math.min(5, 1 + d.generation + (d.spouseId ? 1 : 0) + Math.min(2, d.children.length))
    const spouseCount = d.spouseId ? 1 : 0
    const memberCount = 1 + spouseCount + d.children.length
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">${fmt('ref_life_dynasty_name_fmt', { name: s.playerName || i18n.t('ref_life_dynasty_default_name') })}</div>
        <div class="ref-dynasty-sub">${fmt('ref_life_dynasty_generation_fmt', { gen: String(d.generation), members: String(memberCount) })}</div>
        <div class="ref-dynasty-stars">${starsHtml(famStars)}</div>
      </div>
      <div class="ref-dynasty-score">
        <div class="ref-dynasty-score__n">${s.insurance.dynasty ? 'A+' : '—'}</div>
        <div class="ref-dynasty-score__l">${s.insurance.dynasty ? i18n.t('ref_life_insured') : i18n.t('ref_life_uninsured')}</div>
      </div>
    `
    wrap.appendChild(crest)

    // Eş kartı
    const spouseCard = document.createElement('div')
    if (!d.spouseId) {
      spouseCard.className = 'ref-spouse-card single'
      spouseCard.innerHTML = `
        <span class="ref-spouse-emoji">💍</span>
        <div class="ref-spouse-main">
          <div class="ref-spouse-name">${i18n.t('ref_life_single_status')}</div>
          <div class="ref-spouse-meta">${i18n.t('ref_life_marriage_candidates_info')}</div>
        </div>`
    } else {
      const opt = SPOUSE_OPTIONS.find(o => o.id === d.spouseId)
      const sat = Math.round(d.spouseSatisfaction ?? 70)
      const satClass = sat >= 70 ? 'high' : sat >= 40 ? 'medium' : 'low'
      spouseCard.className = 'ref-spouse-card'
      spouseCard.innerHTML = `
        <span class="ref-spouse-emoji">${opt?.emoji ?? '💑'}</span>
        <div class="ref-spouse-main">
          <div class="ref-spouse-name">${d.spouseName ?? opt?.name ?? i18n.t('ref_life_spouse_tag')} <span class="ref-spouse-tag">${i18n.t('ref_life_spouse_tag')}</span></div>
          <div class="ref-spouse-meta">${d.spouseTrait ? traitLabel(d.spouseTrait) : ''} · ${opt ? spouseBonusLabel(opt) : ''}</div>
          <div class="ref-spouse-sat">
            <span>${i18n.t('ref_life_satisfaction_label')} ${sat}%</span>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${satClass}" style="width:${sat}%"></div></div>
          </div>
        </div>`
    }
    wrap.appendChild(spouseCard)

    // Çocuklar
    if (d.children.length > 0) {
      wrap.appendChild(sectionTitle(i18n.t('ref_life_children_section_title'), fmt('ref_life_children_count_fmt', { count: String(d.children.length) })))
      const list = document.createElement('div')
      list.className = 'ref-member-list'
      const heirId = d.activeHeirId ?? d.dynastyBonusId
      list.innerHTML = d.children.map((c: ChildRecord) => {
        const age = Math.floor(gameYearsElapsed(s.gameTimeMs, c.bornGameDay))
        const eduPct = Math.round((c.educationXp / CHILD_EDUCATION_MAX) * 100)
        const isHeir = c.id === heirId
        const careerInfo = c.career ? childCareerDef(c.career) : null
        const avatar = age < 13 ? '👶' : '🧒'
        return `
          <div class="ref-member-row">
            <span class="ref-child-avatar">${avatar}</span>
            <div class="ref-member-main">
              <div class="ref-member-name">${c.name} ${isHeir ? `<span class="ref-heir-tag">${i18n.t('ref_life_heir_tag')}</span>` : ''}</div>
              <div class="ref-member-role">${careerInfo ? `${careerInfo.emoji} ${childCareerName(careerInfo)}` : (age >= 18 ? i18n.t('ref_life_career_pending') : i18n.t('ref_life_in_education'))}</div>
              <div class="ref-member-tags">
                <span class="ref-member-chip">🎂 ${age}</span>
                <span class="ref-member-chip">${traitLabel(c.trait)}</span>
                ${c.happiness !== undefined ? `<span class="ref-member-chip">😊 ${Math.round(c.happiness)}%</span>` : ''}
              </div>
              <div class="ref-child-edu">
                <span>🎓 ${i18n.t('ref_life_education_label')} ${eduPct}%</span>
                <div class="ref-perf-track sm"><div class="ref-perf-fill ${eduPct >= 70 ? 'high' : 'medium'}" style="width:${eduPct}%"></div></div>
              </div>
            </div>
          </div>`
      }).join('')
      wrap.appendChild(list)
    } else {
      wrap.appendChild(sectionTitle(i18n.t('ref_life_children_section_title'), fmt('ref_life_children_count_fmt', { count: '0' })))
      const empty = document.createElement('div')
      empty.className = 'ref-life-empty'
      empty.innerHTML = `
        <span class="ref-life-empty__ico">👶</span>
        <div class="ref-life-empty__main">
          <div class="ref-life-empty__title">${i18n.t('ref_life_no_children_title')}</div>
          <div class="ref-life-empty__desc">${d.spouseId ? i18n.t('ref_life_no_children_married_info') : i18n.t('ref_life_no_children_single_info')}</div>
        </div>`
      wrap.appendChild(empty)
    }

    // Miras
    const selected = new Set(d.legacyItems ?? [])
    wrap.appendChild(sectionTitle(i18n.t('ref_life_legacy_preparation_title'), fmt('ref_life_legacy_selected_fmt', { sel: String(selected.size), total: String(DYNASTY_LEGACY_ITEMS.length) })))
    const legacyList = document.createElement('div')
    legacyList.className = 'ref-legacy-list'
    legacyList.innerHTML = DYNASTY_LEGACY_ITEMS.map(l => {
      const on = selected.has(l.id)
      return `
        <div class="ref-legacy-row ${on ? '' : 'off'}">
          <span class="ref-legacy-ico-emoji">${l.emoji}</span>
          <div class="ref-legacy-main">
            <div class="ref-legacy-head"><span class="ref-legacy-name">${legacyItemLabel(l)}</span><span class="ref-legacy-pct">${on ? `✓ ${i18n.t('ref_life_active_short')}` : i18n.t('ref_life_passive_short')}</span></div>
            <div class="ref-legacy-desc">${legacyItemBonusLabel(l)}</div>
          </div>
        </div>`
    }).join('')
    wrap.appendChild(legacyList)
  }

  /* ── 🏠 EV & ARAÇ ───────────────────────────────────────────────── */

  private buildHome(): void {
    const wrap = this.tabs.section('home')
    wrap.innerHTML = ''
    const s = this.state
    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_life_demo_home')))
      return
    }
    const ls = s.lifestyle

    // Boş state hint — hiç mülk/araç yokken
    if (ls.ownedResidences.length + ls.ownedVehicles.length === 0) {
      const hint = document.createElement('div')
      hint.className = 'ref-life-tab-hint'
      hint.textContent = `🏠 ${i18n.t('ref_life_no_property_vehicle_hint')}`
      wrap.appendChild(hint)
    }

    // Konutlar
    wrap.appendChild(sectionTitle(i18n.t('ref_life_residences_title'), fmt('ref_life_owned_count_fmt', { count: String(ls.ownedResidences.length) })))
    const resList = document.createElement('div')
    resList.className = 'ref-life-cat-list'
    resList.innerHTML = RESIDENCES.filter(r => r.buyCost > 0).map(def => {
      const entry = ls.ownedResidences.find(r => r.id === def.id)
      const owned = !!entry
      const canBuy = s.money >= def.buyCost
      return `
        <div class="ref-life-item-row ${owned ? 'owned' : ''}">
          <span class="ref-life-item-row__ico">${def.emoji}</span>
          <div class="ref-life-item-row__main">
            <div class="ref-life-item-row__name">${residenceName(def)}${owned ? ` <span class="ref-life-owned-tag">${i18n.t('ref_life_owned_badge')}</span>` : ''}</div>
            <div class="ref-life-item-row__desc">${residenceDesc(def)}</div>
            <div class="ref-life-item-row__meta">😊 +${def.happinessBonus} · ⭐ +${def.reputationBonus} · 😌 -${def.stressReduction} ${i18n.t('ref_life_stress_unit')}</div>
          </div>
          <div class="ref-life-item-row__actions">
            ${owned
              ? `<button class="ref-world-btn sm ${entry.isRenting ? 'warn' : ''}" type="button" data-action="rent_res:${def.id}">${entry.isRenting ? `🔑 ${i18n.t('ref_life_renting_state')}` : i18n.t('ref_life_set_rental')}</button>
                 <button class="ref-world-btn sm danger" type="button" data-action="sell_res:${def.id}">${i18n.t('ref_life_sell_action')}</button>`
              : canBuy
                ? `<button class="ref-world-btn sm" type="button" data-action="buy_res:${def.id}">${i18n.t('ref_life_buy_button_prefix')} · ${fmtMoney(def.buyCost)}</button>`
                : `<button type="button" class="ref-world-btn sm" disabled>${i18n.t('ref_life_buy_button_prefix')} · ${fmtMoney(def.buyCost)}</button>`}
          </div>
        </div>`
    }).join('')
    wrap.appendChild(resList)

    // Ev odaları
    wrap.appendChild(sectionTitle(i18n.t('ref_life_rooms_title'), `${(ls.homeRooms ?? []).length}/${HOME_ROOMS.length}`))
    const roomGrid = document.createElement('div')
    roomGrid.className = 'ref-life-room-grid'
    roomGrid.innerHTML = HOME_ROOMS.map(room => {
      const owned = hasHomeRoom(ls, room.id)
      const canBuy = s.money >= room.cost
      return `
        <div class="ref-life-room-card ${owned ? 'owned' : ''}">
          <span class="ref-life-room-card__ico">${room.emoji}</span>
          <div class="ref-life-room-card__name">${homeRoomName(room)}</div>
          <div class="ref-life-room-card__desc">${homeRoomBonus(room)}</div>
          ${owned
            ? '<span class="ref-life-owned-tag">✓</span>'
            : `<button class="ref-world-btn sm" type="button" data-action="buy_room:${room.id}" ${canBuy ? '' : 'disabled'}>${fmtMoney(room.cost)}</button>`}
        </div>`
    }).join('')
    wrap.appendChild(roomGrid)

    // Araçlar
    wrap.appendChild(sectionTitle(i18n.t('ref_life_vehicles_title'), fmt('ref_life_owned_count_fmt', { count: String(ls.ownedVehicles.length) })))
    const vehList = document.createElement('div')
    vehList.className = 'ref-life-cat-list'
    vehList.innerHTML = VEHICLES.filter(v => v.buyCost > 0).map(def => {
      const entry = ls.ownedVehicles.find(v => v.id === def.id)
      const owned = !!entry
      const canBuy = s.money >= def.buyCost
      return `
        <div class="ref-life-item-row ${owned ? 'owned' : ''}">
          <span class="ref-life-item-row__ico">${def.emoji}</span>
          <div class="ref-life-item-row__main">
            <div class="ref-life-item-row__name">${vehicleName(def)}${owned ? ` <span class="ref-life-owned-tag">${i18n.t('ref_life_owned_badge')}</span>` : ''}</div>
            <div class="ref-life-item-row__desc">${vehicleDesc(def)}</div>
            <div class="ref-life-item-row__meta">⭐ +${def.reputationBonus} · ${i18n.t('ref_life_income_multiplier_label')} ×${def.incomeMult} · ${i18n.t('ref_life_maintenance_label')} ${fmtMoney(def.monthlyUpkeep)}${i18n.t('ref_life_monthly_unit')}</div>
          </div>
          <div class="ref-life-item-row__actions">
            ${owned
              ? `<button class="ref-world-btn sm ${entry.isRenting ? 'warn' : ''}" type="button" data-action="rent_veh:${def.id}">${entry.isRenting ? `🔑 ${i18n.t('ref_life_renting_state')}` : i18n.t('ref_life_set_rental')}</button>
                 <button class="ref-world-btn sm danger" type="button" data-action="sell_veh:${def.id}">${i18n.t('ref_life_sell_action')}</button>`
              : canBuy
                ? `<button class="ref-world-btn sm" type="button" data-action="buy_veh:${def.id}">${i18n.t('ref_life_buy_button_prefix')} · ${fmtMoney(def.buyCost)}</button>`
                : `<button type="button" class="ref-world-btn sm" disabled>${i18n.t('ref_life_buy_button_prefix')} · ${fmtMoney(def.buyCost)}</button>`}
          </div>
        </div>`
    }).join('')
    wrap.appendChild(vehList)
  }

  /* ── ✈️ SEYAHAT & HOBİ ──────────────────────────────────────────── */

  private buildTravel(): void {
    const wrap = this.tabs.section('travel')
    wrap.innerHTML = ''
    const s = this.state
    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_life_demo_travel')))
      return
    }
    const day = gameDay(s.gameTimeMs)

    // Aktif seyahat bonusu
    if (s.travel.travelBonusUntilDay > day && s.travel.lastDestinationId) {
      const dest = TRAVEL_DESTINATIONS.find(d => d.id === s.travel.lastDestinationId)
      const banner = document.createElement('div')
      banner.className = 'ref-life-travel-banner'
      banner.innerHTML = `✨ <b>${dest ? travelName(dest) : ''}</b> ${i18n.t('ref_life_travel_bonus_active')} — ${dest ? travelBonus(dest) : ''} (${fmt('ref_life_days_remaining', { days: String(s.travel.travelBonusUntilDay - day) })})`
      wrap.appendChild(banner)
    }

    // Destinasyonlar
    wrap.appendChild(sectionTitle(i18n.t('ref_life_travel_section_title'), fmt('ref_life_trips_count_fmt', { count: String(s.travel.totalTrips) })))
    const destList = document.createElement('div')
    destList.className = 'ref-life-cat-list'
    destList.innerHTML = TRAVEL_DESTINATIONS.map(dest => {
      const unlocked = s.totalEarned >= dest.unlockAt
      const canGo = unlocked && s.money >= dest.cost
      return `
        <div class="ref-life-item-row ${unlocked ? '' : 'locked'}">
          <span class="ref-life-item-row__ico">${dest.emoji}</span>
          <div class="ref-life-item-row__main">
            <div class="ref-life-item-row__name">${travelName(dest)}</div>
            <div class="ref-life-item-row__desc">${travelDesc(dest)}</div>
            <div class="ref-life-item-row__meta">😌 -${dest.stressReduction} ${i18n.t('ref_life_stress_unit')} · ${dest.durationDays} ${i18n.t('ref_life_days_unit')} · 🎁 ${travelBonus(dest)}</div>
          </div>
          <div class="ref-life-item-row__actions">
            ${!unlocked
              ? `<span class="ref-world-city-row__reason">🔒 ${fmtMoney(dest.unlockAt)} ${i18n.t('ref_life_earn_to_unlock_suffix')}</span>`
              : canGo
                ? `<button class="ref-world-btn sm" type="button" data-action="travel:${dest.id}">${i18n.t('ref_life_go_button')} · ${fmtMoney(dest.cost)}</button>`
                : `<span class="ref-world-city-row__reason">${fmtMoney(dest.cost)}</span>`}
          </div>
        </div>`
    }).join('')
    wrap.appendChild(destList)

    // Hobi
    const activeHobby = s.hobby.hobbyId ? HOBBIES.find(h => h.id === s.hobby.hobbyId) : null
    wrap.appendChild(sectionTitle(i18n.t('ref_life_hobby_label'), activeHobby ? `${i18n.t('ref_life_active_hobby_label')}: ${hobbyName(activeHobby)}` : i18n.t('ref_life_hobby_not_selected')))
    const hobbyGrid = document.createElement('div')
    hobbyGrid.className = 'ref-life-room-grid'
    hobbyGrid.innerHTML = HOBBIES.map(h => {
      const active = s.hobby.hobbyId === h.id
      return `
        <div class="ref-life-room-card ${active ? 'owned' : ''}">
          <span class="ref-life-room-card__ico">${h.emoji}</span>
          <div class="ref-life-room-card__name">${hobbyName(h)}</div>
          <div class="ref-life-room-card__desc">${hobbyBonus(h)} · ${fmtMoney(h.monthlyCost)}${i18n.t('ref_life_monthly_unit')}</div>
          ${active
            ? `<span class="ref-life-owned-tag">✓ ${i18n.t('ref_life_active_short')}</span>`
            : `<button class="ref-world-btn sm" type="button" data-action="hobby:${h.id}">${i18n.t('ref_life_select_button')}</button>`}
        </div>`
    }).join('')
    wrap.appendChild(hobbyGrid)

    // Huzur aktiviteleri
    wrap.appendChild(sectionTitle(i18n.t('ref_life_wellbeing_health_title')))
    const wbList = document.createElement('div')
    wbList.className = 'ref-life-cat-list'
    wbList.innerHTML = WELLBEING_ACTIVITIES.map(w => {
      const canBuy = s.money >= w.cost
      return `
        <div class="ref-life-item-row">
          <span class="ref-life-item-row__ico">${w.emoji}</span>
          <div class="ref-life-item-row__main">
            <div class="ref-life-item-row__name">${wellbeingName(w)}</div>
            <div class="ref-life-item-row__desc">${wellbeingDesc(w)}</div>
            <div class="ref-life-item-row__meta">😌 -${w.stressReduction} ${i18n.t('ref_life_stress_unit')}${w.durationDays ? ` · ${w.durationDays} ${i18n.t('ref_life_days_unit')}` : ''}</div>
          </div>
          <div class="ref-life-item-row__actions">
            ${canBuy
              ? `<button class="ref-world-btn sm" type="button" data-action="wellbeing:${w.id}">${fmtMoney(w.cost)}</button>`
              : `<button type="button" class="ref-world-btn sm" disabled>🔒 ${fmtMoney(w.cost)}</button>`}
          </div>
        </div>`
    }).join('')
    wrap.appendChild(wbList)
  }

  /* ── 🐾 EVCİL & KARDEŞLER ───────────────────────────────────────── */

  private buildPets(): void {
    const wrap = this.tabs.section('pets')
    wrap.innerHTML = ''
    const s = this.state
    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_life_demo_pets')))
      return
    }
    const day = gameDay(s.gameTimeMs)
    const ownedPets = s.lifestyle.ownedPets ?? []

    // Boş state hint
    if (ownedPets.length === 0) {
      const hint = document.createElement('div')
      hint.className = 'ref-life-tab-hint'
      hint.textContent = `🐾 ${i18n.t('ref_life_no_pets_hint')}`
      wrap.appendChild(hint)
    }

    // Sahip olunan evciller
    if (ownedPets.length > 0) {
      wrap.appendChild(sectionTitle(i18n.t('ref_life_owned_pets_title'), fmt('ref_life_count_pieces_fmt', { count: String(ownedPets.length) })))
      const list = document.createElement('div')
      list.className = 'ref-pet-list'
      for (const pet of ownedPets) {
        const petDef = PETS.find(p => p.id === pet.id)
        const elapsed = day - pet.adoptedDay
        const lifePct = Math.max(0, Math.min(100, Math.round((1 - elapsed / pet.lifespanDays) * 100)))
        const row = document.createElement('div')
        row.className = 'ref-pet-row'
        row.innerHTML = `
          <span class="ref-pet-emoji">${petDef?.emoji ?? '🐾'}</span>
          <div class="ref-pet-main">
            <div class="ref-pet-name">${pet.name}</div>
            <div class="ref-pet-meta">${petDef ? petName(petDef) : ''} · 😌 -${petDef?.dailyStressReduction ?? 0} ${i18n.t('ref_life_stress_per_day_unit')}</div>
            <div class="ref-perf-track sm"><div class="ref-pet-life ref-perf-fill ${lifePct > 50 ? 'high' : lifePct > 25 ? 'medium' : 'low'}" style="width:${lifePct}%"></div></div>
          </div>`
        list.appendChild(row)
      }
      wrap.appendChild(list)
    }

    // Pet katalog
    wrap.appendChild(sectionTitle(i18n.t('ref_life_adopt_section_title'), fmt('ref_life_types_count_fmt', { count: String(PETS.length) })))
    const catalog = document.createElement('div')
    catalog.className = 'ref-life-room-grid'
    catalog.innerHTML = PETS.map(p => {
      const canBuy = s.money >= p.buyCost
      return `
        <div class="ref-life-room-card">
          <span class="ref-life-room-card__ico">${p.emoji}</span>
          <div class="ref-life-room-card__name">${petName(p)}</div>
          <div class="ref-life-room-card__desc">😌 -${p.dailyStressReduction} ${i18n.t('ref_life_stress_per_day_unit')} · ${i18n.t('ref_life_maintenance_label')} ${fmtMoney(p.monthlyUpkeep)}${i18n.t('ref_life_monthly_unit')}</div>
          ${canBuy
            ? `<button class="ref-world-btn sm" type="button" data-action="buy_pet:${p.id}">${i18n.t('ref_life_buy_button_prefix')} · ${fmtMoney(p.buyCost)}</button>`
            : `<button class="ref-world-btn sm" type="button" disabled>🔒 ${fmtMoney(p.buyCost)}</button>`}
        </div>`
    }).join('')
    wrap.appendChild(catalog)

    // Kardeşler
    const siblings = s.siblings ?? []
    if (siblings.length > 0) {
      const alive = siblings.filter(x => x.isAlive)
      wrap.appendChild(sectionTitle(i18n.t('ref_life_siblings_title'), fmt('ref_life_active_count_fmt', { count: String(alive.length) })))
      const list = document.createElement('div')
      list.className = 'ref-sibling-list'
      for (const sib of siblings as Sibling[]) {
        const row = document.createElement('div')
        row.className = `ref-sibling-row${sib.isAlive ? '' : ' deceased'}`
        const relBar = sib.isAlive
          ? `<div class="ref-perf-track sm"><div class="ref-perf-fill ${sib.relationshipScore >= 70 ? 'high' : 'medium'}" style="width:${sib.relationshipScore}%"></div></div>`
          : `<span class="ref-sibling-deceased">${i18n.t('ref_life_deceased_label')}</span>`
        row.innerHTML = `
          <span class="ref-sibling-emoji">${sib.relation === 'brother' ? '👦' : '👧'}</span>
          <div class="ref-sibling-main">
            <div class="ref-sibling-name">${sib.name}</div>
            <div class="ref-sibling-meta">${sib.age} ${i18n.t('ref_age_suffix')} · ${i18n.t('ref_life_relationship_label')} ${sib.relationshipScore}%</div>
            ${relBar}
          </div>
          ${sib.isAlive ? `<button class="ref-sibling-visit-btn" type="button" data-action="visit_sibling:${sib.id}">${i18n.t('ref_life_visit_button_prefix')} · ${fmtMoney(VISIT_SIBLING_COST)}</button>` : ''}
        `
        list.appendChild(row)
      }
      wrap.appendChild(list)
    }
  }

  /* ── 🛍️ ALIŞVERİŞ ──────────────────────────────────────────────── */

  private buildShop(): void {
    const wrap = this.tabs.section('shop')
    wrap.innerHTML = ''
    const s = this.state
    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_life_demo_shop')))
      return
    }
    const ls = s.lifestyle

    // Harcama özeti
    wrap.appendChild(sectionTitle(i18n.t('ref_life_expenses_section')))
    const summary = document.createElement('div')
    summary.className = 'ref-world-rep-card'
    const expense = Math.round(lifestyleMonthlyExpense(ls))
    const rental = Math.round(lifestyleRentalIncome(ls))
    const activeHobby = s.hobby.hobbyId ? HOBBIES.find(h => h.id === s.hobby.hobbyId) : null
    summary.innerHTML = `
      <div class="ref-world-rep-row"><span>💳 ${i18n.t('ref_life_monthly_expense_label')}</span><b>${fmtMoney(expense)}</b></div>
      <div class="ref-world-rep-row"><span>🔑 ${i18n.t('ref_life_rental_income_label')}</span><b>${rental > 0 ? '+' + fmtMoney(rental) : '—'}</b></div>
      <div class="ref-world-rep-row"><span>🏠 ${i18n.t('ref_life_property_label')}</span><b>${fmt('ref_life_count_pieces_fmt', { count: String(ls.ownedResidences.length) })}</b></div>
      <div class="ref-world-rep-row"><span>🚗 ${i18n.t('ref_life_vehicle_label')}</span><b>${fmt('ref_life_count_pieces_fmt', { count: String(ls.ownedVehicles.length) })}</b></div>
      <div class="ref-world-rep-row"><span>🐾 ${i18n.t('ref_life_pet_label')}</span><b>${fmt('ref_life_count_pieces_fmt', { count: String((ls.ownedPets ?? []).length) })}</b></div>
      <div class="ref-world-rep-row"><span>🎯 ${i18n.t('ref_life_hobby_label')}</span><b>${activeHobby ? `${activeHobby.emoji} ${hobbyName(activeHobby)}` : i18n.t('ref_life_none')}</b></div>
    `
    wrap.appendChild(summary)

    // Hızlı yönlendirme kartları
    wrap.appendChild(sectionTitle(i18n.t('ref_life_categories_title')))
    const nav = document.createElement('div')
    nav.className = 'ref-life-room-grid'
    const cats: { icon: string; name: string; desc: string; tab: string }[] = [
      { icon: '🏠', name: i18n.t('ref_life_tab_home'), desc: i18n.t('ref_life_category_home_desc'), tab: 'home' },
      { icon: '✈️', name: i18n.t('ref_life_tab_travel'), desc: i18n.t('ref_life_category_travel_desc'), tab: 'travel' },
      { icon: '🐾', name: i18n.t('ref_life_tab_pets'), desc: i18n.t('ref_life_category_pet_desc'), tab: 'pets' },
      { icon: '👨‍👩‍👧', name: i18n.t('ref_life_tab_dynasty'), desc: i18n.t('ref_life_category_family_desc'), tab: 'dynasty' },
    ]
    for (const c of cats) {
      const card = document.createElement('div')
      card.className = 'ref-life-room-card clickable'
      card.innerHTML = `
        <span class="ref-life-room-card__ico">${c.icon}</span>
        <div class="ref-life-room-card__name">${c.name}</div>
        <div class="ref-life-room-card__desc">${c.desc}</div>`
      card.addEventListener('click', () => this.tabs.setActive(c.tab))
      nav.appendChild(card)
    }
    wrap.appendChild(nav)
  }
}
