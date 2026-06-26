import { sectionTitle, ua, fmtMoney, demoBanner, refToast } from './refShared'
import { i18n, fmt } from '../../i18n'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefSubTabs } from './RefSubTabs'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, type UpgradeDef } from '../../game/Economy'
import { politicsLevelLabel } from '../../game/Empire'
import { EXPANSION_CITIES, canUnlockCity, cityProducerBonus, cityLabel, type CityId } from '../../game/ExpansionMap'
import { TORPIL_CONTACTS, torpilName, torpilRole, torpilDesc, type TorpilId } from '../../game/TorpilNetwork'
import { RESEARCH_NODES, researchCost, researchIsUnlocked, researchPrereqName, researchNodeName, researchNodeDesc, type ResearchNode } from '../../game/Research'
import {
  RIVAL_FAMILY_DEFS, isRivalUnlocked, nextLockedRivalDef,
  attitudeLabel, mergeRivalCost, rivalFamilyName, rivalStageLabel, rivalPersonalityLabel,
} from '../../game/Rivals'
import { DEPARTMENTS, DEPARTMENT_MAX_LEVEL, departmentUpgradeCost, departmentName, departmentBonus, type DepartmentId } from '../../game/EmpireDepartments'
import { producerName, upgradeName, upgradeDesc } from '../../game/Economy'

const REGIONAL_BONUSES = [
  { id: 'ankara', categoryKey: 'ref_empire_regional_ankara_cat' as const, bonusKey: 'ref_empire_regional_ankara_bonus' as const },
  { id: 'izmir',  categoryKey: 'ref_empire_regional_izmir_cat'  as const, bonusKey: 'ref_empire_regional_izmir_bonus'  as const },
  { id: 'dubai',  categoryKey: 'ref_empire_regional_dubai_cat'  as const, bonusKey: 'ref_empire_regional_dubai_bonus'  as const },
  { id: 'london', categoryKey: 'ref_empire_regional_london_cat' as const, bonusKey: 'ref_empire_regional_london_bonus' as const },
]

interface Dept { asset: string; lvl: number }
const DEPTS: Dept[] = [
  { asset: REF_ASSETS_V2_GENERIC.departments.operations,   lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.finance,      lvl: 6 },
  { asset: REF_ASSETS_V2_GENERIC.departments.marketing,    lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.legal,        lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.rnd,          lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.logistics,    lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.security,     lvl: 2 },
  { asset: REF_ASSETS_V2_GENERIC.departments.familyOffice, lvl: 4 },
]

/** Eşik dizisinde değerin kaçıncı basamağı geçtiğini döndürür (0 = henüz yok). */
function lvlFrom(value: number, thresholds: number[]): number {
  let lvl = 0
  for (const t of thresholds) if (value >= t) lvl++
  return lvl
}

const POLITICS_LVL: Record<string, number> = { none: 0, belediye: 3, milletvekili: 5, bakan: 8, cumhurbaskan: 10 }

/** Departman seviyeleri — tamamı mevcut state alanlarından SALT OKUNUR türetilir. */
function deptLevelsFromState(s: GameState): Dept[] {
  const ownedTypes  = Object.values(s.producers).filter(c => c > 0).length
  const totalUnits  = Object.values(s.producers).reduce((a, b) => a + b, 0)
  const managerCnt  = Object.values(s.managers).filter(Boolean).length
  const researchSum = Object.values(s.research).reduce((a, b) => a + b, 0)
  const insuranceCnt = (s.insurance.business ? 1 : 0) + (s.insurance.illegal ? 1 : 0) + (s.insurance.dynasty ? 1 : 0)
  const bankUsage   = s.bank.deposit + s.bank.bonds
  // 'media' ayrı kategori değil — medya/yayın işleri id üzerinden sayılır
  const mediaOwned  = PRODUCERS.filter(p => (p.id === 'medya' || p.id === 'streaming') && (s.producers[p.id] ?? 0) > 0).length
  const famSize     = (s.dynasty.spouseId ? 1 : 0) + s.dynasty.children.length

  return [
    { asset: REF_ASSETS_V2_GENERIC.departments.operations,     lvl: lvlFrom(ownedTypes, [1, 3, 6, 10, 15, 22, 30, 45, 65, 90]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.finance,        lvl: lvlFrom(bankUsage, [1_000, 10_000, 50_000, 200_000, 1e6, 5e6, 2e7, 1e8, 5e8, 1e9]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.marketing,      lvl: lvlFrom(s.reputation, [5, 15, 25, 35, 45, 55, 65, 75, 85, 95]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.hr,             lvl: lvlFrom(managerCnt, [1, 3, 6, 10, 15, 22, 30, 40, 55, 70]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.legal,          lvl: insuranceCnt * 3 + (s.bank.creditScore >= 80 ? 1 : 0) },
    { asset: REF_ASSETS_V2_GENERIC.departments.rnd,            lvl: lvlFrom(researchSum, [1, 3, 6, 10, 15, 21, 28, 36, 45, 55]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.logistics,      lvl: lvlFrom(totalUnits, [5, 20, 60, 150, 350, 700, 1500, 3000, 6000, 12000]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.security,       lvl: lvlFrom(100 - s.illegalHeat * 100, [10, 25, 40, 55, 70, 80, 88, 93, 97, 99]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.prMedia,        lvl: mediaOwned * 2 + lvlFrom(s.reputation, [30, 50, 70, 90]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.familyOffice,   lvl: famSize * 2 + s.dynasty.generation },
    { asset: REF_ASSETS_V2_GENERIC.departments.politics,       lvl: POLITICS_LVL[s.empire.politics.level] ?? 0 },
    { asset: REF_ASSETS_V2_GENERIC.departments.globalStrategy, lvl: Math.min(10, s.ipoCount + s.cities.unlocked.length) },
  ].map(d => ({ ...d, lvl: Math.max(0, Math.min(10, d.lvl)) }))
}

/**
 * İmparatorluk sayfası — 3 alt sekme:
 *  🏗️ Yönet: özet + kategori kartları + departmanlar + Ar-Ge + şehirler
 *  🌍 Dünya: şehir saygınlığı + dünya itibarı + torpil & rüşvet panelleri
 *  ⚔️ Rakipler: rakip aileler, teklifler, lobi/işbirliği/satın alma
 */
export class RefEmpirePage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_empire_title') }
  private state?: GameState
  private tabs: RefSubTabs
  private lastManageSig = ''
  private lastWorldSig = ''
  private lastRivalsSig = ''

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-empire-page'

    this.tabs = new RefSubTabs([
      { id: 'manage', label: i18n.t('ref_empire_tab_manage'), icon: '🏗️' },
      { id: 'world',  label: i18n.t('ref_empire_tab_city'),   icon: '🏙️' },
      { id: 'rivals', label: i18n.t('ref_empire_tab_rivals'), icon: '⚔️' },
    ])
    this.el.appendChild(this.tabs.tabsEl)
    this.el.appendChild(this.tabs.section('manage'))
    this.el.appendChild(this.tabs.section('world'))
    this.el.appendChild(this.tabs.section('rivals'))

    this.buildManage()
    this.buildWorld()
    this.buildRivals()
    if (state) {
      this.lastManageSig = this.manageSig(state)
      this.lastWorldSig = this.worldSig(state)
      this.lastRivalsSig = this.rivalsSig(state)
    }

    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /* ── İmza tabanlı refresh — yalnız değişen sekme içeriği yeniden kurulur ── */

  private manageSig(s: GameState): string {
    const owned = Object.entries(s.producers).filter(([, c]) => c > 0).map(([id, c]) => `${id}:${c}`).join(',')
    const depts = deptLevelsFromState(s).map(d => d.lvl).join('')
    const research = Object.values(s.research).reduce((a, b) => a + b, 0)
    const upgrades = s.purchasedUpgrades.size
    return `${owned}|${s.cities.unlocked.length}|${Math.round(s.illegalHeat * 100)}|${s.empire.politics.level}|${s.ipoCount}|${depts}|${research}|${upgrades}`
  }

  private worldSig(s: GameState): string {
    const cityRep = EXPANSION_CITIES.map(c => `${c.id}:${s.cities.unlocked.includes(c.id) ? 1 : 0}:${Math.round(s.cities.cityReputation[c.id] ?? 0)}`).join(',')
    const torpil = s.torpil.map(t => `${t.id}:${t.active ? 1 : 0}:${t.giftDue ? 1 : 0}`).join(',')
    const cooldowns = (['lawyer', 'bribe'] as const).map(a => s.undergroundCooldownRemaining(a) > 0 ? 1 : 0).join('')
    return `${cityRep}|${s.cities.activeCity}|${torpil}|${Math.round(s.reputation)}|${s.empire.politics.influence}|${Math.round(s.illegalHeat * 100)}|${cooldowns}|${Math.floor(s.money / 10_000)}`
  }

  private rivalsSig(s: GameState): string {
    const rivals = s.rivals.map(r => {
      const base = `${r.id}:${Math.round(r.netWorth / 1000)}:${r.attitude}:${r.relation}`
      // For bankrupt rivals include exact canAcquire so button enables immediately when affordable
      return r.relation === 'bankrupt' ? `${base}:${s.canAcquireBankruptRival(r.id) ? 1 : 0}` : base
    }).join(',')
    const offer = s.pendingRivalOffer ? s.pendingRivalOffer.rivalId : '-'
    const events = s.activeRivalEvents.map(e => e.id).join(',')
    return `${rivals}|${offer}|${events}|${Math.floor(s.totalEarned / 1000)}`
  }

  refresh(state: GameState): void {
    this.state = state
    const mSig = this.manageSig(state)
    if (mSig !== this.lastManageSig) { this.lastManageSig = mSig; this.buildManage() }
    const wSig = this.worldSig(state)
    if (wSig !== this.lastWorldSig) { this.lastWorldSig = wSig; this.buildWorld() }
    const rSig = this.rivalsSig(state)
    if (rSig !== this.lastRivalsSig) { this.lastRivalsSig = rSig; this.buildRivals() }
  }

  /* ── Aksiyonlar (tek delege dinleyici) ──────────────────────────────── */

  private handleClick(e: Event): void {
    const deptBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-upgrade-dept]')
    if (deptBtn && !deptBtn.disabled && this.state) {
      const id = deptBtn.dataset.upgradeDept as DepartmentId
      const ok = this.state.upgradeDepartment(id)
      if (ok) {
        const def = DEPARTMENTS.find(d => d.id === id)
        refToast(`${def?.emoji ?? '🏛️'} ${def ? departmentName(def) : id} Lv.${this.state.departments[id]}`, 'ok')
        this.buildManage()
      } else {
        refToast(i18n.t('ref_empire_insufficient_funds'), 'err')
      }
      return
    }
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || !this.state) return
    const action = btn.dataset.action ?? ''
    const sep = action.indexOf(':')
    const kind = sep === -1 ? action : action.slice(0, sep)
    const id = sep === -1 ? '' : action.slice(sep + 1)
    const s = this.state

    switch (kind) {
      case 'unlock_city': {
        const ok = s.unlockCity(id as CityId)
        refToast(ok ? i18n.t('ref_empire_city_unlocked') : i18n.t('ref_empire_city_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'set_active': {
        if (s.cities.unlocked.includes(id as CityId)) {
          s.cities.activeCity = id as CityId
          refToast(i18n.t('ref_empire_active_city_updated'), 'ok')
        }
        break
      }
      case 'torpil_hire': {
        const ok = s.hireTorpil(id as TorpilId)
        refToast(ok ? i18n.t('ref_empire_torpil_joined') : i18n.t('ref_empire_insufficient_funds'), ok ? 'ok' : 'err')
        break
      }
      case 'torpil_gift': {
        const ok = s.payTorpilGift(id as TorpilId)
        refToast(ok ? i18n.t('ref_empire_gift_given') : i18n.t('ref_empire_gift_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'bribe': {
        const ok = s.useUndergroundAction('bribe')
        refToast(ok ? i18n.t('ref_empire_bribe_success') : i18n.t('ref_empire_bribe_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'lawyer': {
        const ok = s.useUndergroundAction('lawyer')
        refToast(ok ? i18n.t('ref_empire_lawyer_hired') : i18n.t('ref_empire_lawyer_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'rival_lobby': {
        const ok = s.rivalLobby(id)
        refToast(ok ? i18n.t('ref_empire_lobby_success') : i18n.t('ref_empire_lobby_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'rival_coop': {
        const ok = s.rivalCooperate(id)
        refToast(ok ? i18n.t('ref_empire_cooperation_success') : i18n.t('ref_empire_cooperation_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'rival_merge': {
        const ok = s.rivalMerge(id)
        refToast(ok ? i18n.t('ref_empire_rival_acquired') : i18n.t('ref_empire_acquisition_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'rival_acquire': {
        const ok = s.acquireBankruptRival(id)
        refToast(ok ? i18n.t('ref_empire_bankrupt_rival_claimed') : i18n.t('ref_empire_insufficient_funds'), ok ? 'ok' : 'err')
        break
      }
      case 'offer_accept': {
        const ok = s.acceptRivalAllianceOffer()
        refToast(ok ? i18n.t('ref_empire_alliance_accepted') : i18n.t('ref_empire_offer_not_found'), ok ? 'ok' : 'err')
        break
      }
      case 'offer_decline': {
        s.declineRivalAlliance()
        refToast(i18n.t('ref_empire_offer_declined'), 'ok')
        break
      }
      case 'rival_event': {
        const [eventId, responseId] = id.split('@')
        if (eventId && responseId) {
          s.resolveRivalEvent(eventId, responseId)
          refToast(i18n.t('ref_empire_rival_event_resolved'), 'ok')
        }
        break
      }
      default: return
    }
    this.refresh(s)
  }

  /* ── 🏗️ YÖNET ─────────────────────────────────────────────────────── */

  private buildManage(): void {
    const wrap = this.tabs.section('manage')
    wrap.innerHTML = ''
    const s = this.state

    // ── Özet şerit ──
    const cityCount = s ? s.cities.unlocked.length : 3
    const firmCount = s ? Object.values(s.producers).filter(c => c > 0).length : 12

    const sportOwned    = s ? PRODUCERS.filter(p => p.category === 'sport'    && (s.producers[p.id] ?? 0) > 0) : []
    const politicsOwned = s ? PRODUCERS.filter(p => p.category === 'politics' && (s.producers[p.id] ?? 0) > 0) : []
    const darkOwned     = s ? PRODUCERS.filter(p => (p.category === 'dark' || p.illegal) && (s.producers[p.id] ?? 0) > 0) : []
    const luxOwned      = s ? PRODUCERS.filter(p => p.category === 'luxury'   && (s.producers[p.id] ?? 0) > 0) : []
    const sciOwned      = s ? PRODUCERS.filter(p => p.category === 'science'  && (s.producers[p.id] ?? 0) > 0) : []
    const finOwned      = s ? PRODUCERS.filter(p => p.category === 'finance'  && (s.producers[p.id] ?? 0) > 0) : []

    const empireIncome = s
      ? [...sportOwned, ...politicsOwned, ...darkOwned, ...luxOwned, ...sciOwned, ...finOwned].reduce((sum, p) => sum + s.producerIncome(p), 0)
      : 0

    const nwDisplay = s ? fmtMoney(Math.round(s.financeNetWorth())) : '—'
    const deptCount = s ? DEPARTMENTS.filter(d => (s.departments[d.id] ?? 0) > 0).length : DEPARTMENTS.length
    const summary = document.createElement('div')
    summary.className = 'ref-empire-summary'
    summary.innerHTML = `
      <div class="ref-empire-summary__item"><span>🏙️</span><b>${cityCount}</b><small>${i18n.t('ref_empire_summary_cities_label')}</small></div>
      <div class="ref-empire-summary__item"><span>🏢</span><b>${firmCount}</b><small>${i18n.t('ref_empire_summary_firms_label')}</small></div>
      <div class="ref-empire-summary__item"><span>🏛️</span><b>${deptCount}/${DEPARTMENTS.length}</b><small>${i18n.t('ref_empire_summary_departments_label')}</small></div>
      <div class="ref-empire-summary__item"><span>💰</span><b>${empireIncome > 0 ? fmtMoney(Math.round(empireIncome)) : nwDisplay}</b><small>${empireIncome > 0 ? i18n.t('ref_empire_summary_empire_income') : i18n.t('ref_empire_summary_net_worth')}</small></div>
    `
    wrap.appendChild(summary)

    // ── 6 kategori mini kartları ──
    const cats: { icon: string; name: string; owned: typeof sportOwned }[] = [
      { icon: '⚽', name: i18n.t('ref_empire_cat_football'),    owned: sportOwned },
      { icon: '🏛️', name: i18n.t('ref_empire_cat_politics'),    owned: politicsOwned },
      { icon: '🔥', name: i18n.t('ref_empire_cat_underground'), owned: darkOwned },
      { icon: '💎', name: i18n.t('ref_empire_cat_luxury'),      owned: luxOwned },
      { icon: '🔬', name: i18n.t('ref_empire_cat_science'),     owned: sciOwned },
      { icon: '📊', name: i18n.t('ref_empire_cat_finance'),     owned: finOwned },
    ]
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_investments_title'), i18n.t('ref_empire_investments_subtitle')))
    const catGrid = document.createElement('div')
    catGrid.className = 'ref-empire-cat-grid'
    catGrid.innerHTML = cats.map(c => {
      const income = s ? Math.round(c.owned.reduce((sum, p) => sum + s.producerIncome(p), 0)) : 0
      const active = c.owned.length > 0
      return `
        <div class="ref-empire-cat-card ${active ? '' : 'inactive'}">
          <span class="ref-empire-cat-card__ico">${c.icon}</span>
          <div class="ref-empire-cat-card__name">${c.name}</div>
          <div class="ref-empire-cat-card__meta">${active ? `${c.owned.length} ${i18n.t('ref_empire_assets_label')} · ${fmtMoney(income)}${i18n.t('ref_empire_per_day_suffix')}` : i18n.t('ref_empire_no_investments')}</div>
        </div>`
    }).join('')
    wrap.appendChild(catGrid)

    // ── Siyasi makam + polis ısısı (varsa) ──
    if (s && politicsOwned.length > 0) {
      const polCard = document.createElement('div')
      polCard.className = 'ref-politics-card'
      polCard.innerHTML = `
        <div class="ref-politics-card__level"><span>🏛️</span><b>${politicsLevelLabel(s.empire.politics.level)}</b></div>
        <div class="ref-politics-card__offices">
          ${politicsOwned.map(p => `<span class="ref-politics-tag">${p.emoji} ${producerName(p)} (${s.producers[p.id]})</span>`).join('')}
        </div>`
      wrap.appendChild(polCard)
    }
    if (s && darkOwned.length > 0) {
      const heat = Math.round(s.illegalHeat * 100)
      const heatFill = heat < 30 ? 'high' : heat < 60 ? 'medium' : 'low'
      const heatCard = document.createElement('div')
      heatCard.className = 'ref-dark-card'
      heatCard.innerHTML = `
        <div class="ref-dark-card__row"><span>${i18n.t('ref_empire_police_heat_label')}</span><span>${heat}%</span></div>
        <div class="ref-perf-track"><div class="ref-perf-fill ${heatFill}" style="width:${heat}%"></div></div>
        <div class="ref-dark-card__ops">
          ${darkOwned.map(p => `<span class="ref-dark-tag">${p.emoji} ${producerName(p)} (${s.producers[p.id]})</span>`).join('')}
        </div>`
      wrap.appendChild(heatCard)
    }

    // ── Departmanlar (yükseltme butonlu gerçek kartlar) ──
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_departments_title'), `${DEPARTMENTS.length}`))
    const deptGrid = document.createElement('div')
    deptGrid.className = 'ref-dept-grid2'
    if (s) {
      deptGrid.innerHTML = DEPARTMENTS.map(d => {
        const level = s.departments[d.id] ?? 0
        const maxed = level >= DEPARTMENT_MAX_LEVEL
        const cost  = departmentUpgradeCost(d.id, level)
        const canUp = !maxed && s.money >= cost
        const isMaxed    = maxed
        const isStrong   = level >= 5
        const isMid      = level >= 3
        const isLow      = level >= 1
        const isCritical = level === 0
        const badgeCls   = isStrong ? 'ref-dept-badge2--strong' : isMid ? 'ref-dept-badge2--mid' : isLow ? 'ref-dept-badge2--low' : isCritical ? 'ref-dept-badge2--critical' : ''
        const badgeTxt   = isMaxed ? i18n.t('ref_empire_dept_badge_max') : isStrong ? i18n.t('ref_empire_dept_badge_strong') : isMid ? `Lv.${level}` : isLow ? i18n.t('ref_empire_dept_badge_weak') : i18n.t('ref_empire_dept_badge_critical')
        const btnTxt     = maxed ? `✓ ${i18n.t('ref_empire_dept_max_level_button')}` : canUp ? `${i18n.t('ref_empire_dept_upgrade_prefix')} · ${fmtMoney(cost)}` : `🔒 ${fmtMoney(cost)}`
        return `
          <div class="ref-dept-card2 ${isCritical ? 'critical' : isStrong ? 'strong' : ''}">
            <div class="ref-dept-card2__head">
              <span class="ref-dept-card2__icon">${d.emoji}</span>
              <div class="ref-dept-card2__info">
                <span class="ref-dept-card2__name">${departmentName(d)}</span>
                <span class="ref-dept-card2__bonus">${departmentBonus(d)}</span>
              </div>
              <span class="ref-dept-badge2 ${badgeCls}">${badgeTxt}</span>
            </div>
            <div class="ref-dept-lvl-bar">
              ${Array.from({ length: DEPARTMENT_MAX_LEVEL }, (_, i) =>
                `<span class="ref-dept-lvl-pip${i < level ? ' on' : ''}"></span>`).join('')}
            </div>
            <button type="button" class="ref-dept-upgrade-btn${canUp ? '' : ' ref-dept-upgrade-btn--off'}"
              data-upgrade-dept="${d.id}" ${canUp ? '' : 'disabled'}>
              ${btnTxt}
            </button>
          </div>`
      }).join('')
    } else {
      deptGrid.innerHTML = DEPARTMENTS.map((dept, i) => {
        const lvl = DEPTS[i]?.lvl ?? 0
        return `
        <div class="ref-dept-card2">
          <div class="ref-dept-card2__head">
            <span class="ref-dept-card2__icon"><img src="${ua(DEPTS[i]?.asset ?? '')}" style="width:28px;height:28px;object-fit:cover;border-radius:6px" alt=""></span>
            <div class="ref-dept-card2__info">
              <span class="ref-dept-card2__name">${departmentName(dept)}</span>
            </div>
            <span class="ref-dept-badge2">${lvl === 0 ? '—' : `Lv.${lvl}`}</span>
          </div>
          <div class="ref-dept-lvl-bar">
            ${Array.from({ length: 10 }, (_, j) =>
              `<span class="ref-dept-lvl-pip${j < lvl ? ' on' : ''}"></span>`).join('')}
          </div>
        </div>`
      }).join('')
    }
    wrap.appendChild(deptGrid)

    // ── Ar-Ge & Yükseltmeler ──
    if (!s) {
      const rndNote = document.createElement('div')
      rndNote.className = 'ref-preview-note'
      rndNote.textContent = i18n.t('ref_empire_rnd_preview_note')
      wrap.appendChild(rndNote)
    }

    wrap.appendChild(sectionTitle(i18n.t('ref_empire_research_tree_title'), `${RESEARCH_NODES.length}`))
    const resList = document.createElement('div')
    resList.className = 'ref-rnd-list'
    for (const node of RESEARCH_NODES) {
      resList.appendChild(this.buildResearchRow(node, s))
    }
    wrap.appendChild(resList)

    wrap.appendChild(sectionTitle(i18n.t('ref_empire_upgrades_title'), `${UPGRADES.length}`))
    const upgList = document.createElement('div')
    upgList.className = 'ref-rnd-list'
    for (const upg of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
      upgList.appendChild(this.buildUpgradeRow(upg, s))
    }
    wrap.appendChild(upgList)

    // ── Şehirler özet notu → Şehir sekmesine yönlendirme ──
    const unlockedCnt = s ? s.cities.unlocked.length : 3
    const citiesNote = document.createElement('div')
    citiesNote.className = 'ref-cities-manage-note'
    citiesNote.textContent = `🏙️ ${fmt('ref_empire_cities_manage_note_fmt', { count: String(unlockedCnt), total: String(EXPANSION_CITIES.length) })}`
    wrap.appendChild(citiesNote)
  }

  /* ── 🏙️ ŞEHİR ──────────────────────────────────────────────────────── */

  private buildWorld(): void {
    const wrap = this.tabs.section('world')
    wrap.innerHTML = ''
    const s = this.state

    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_empire_demo_city_panel')))
      return
    }

    const unlocked = s.cities.unlocked
    const activeCity = s.cities.activeCity
    const financeBonus = Math.round(cityProducerBonus(s.cities, 'finance') * 100)

    // ── KPI şerit ──
    const kpi = document.createElement('div')
    kpi.className = 'ref-cities-kpi'
    kpi.innerHTML = `
      <div class="ref-cities-kpi__item"><span>🌍</span><b>${unlocked.length}/${EXPANSION_CITIES.length}</b><small>${i18n.t('ref_empire_city_kpi_cities')}</small></div>
      <div class="ref-cities-kpi__item"><span>💰</span><b>${fmtMoney(Math.round(s.incomePerDay()))}</b><small>${i18n.t('ref_empire_city_kpi_daily')}</small></div>
      <div class="ref-cities-kpi__item"><span>⭐</span><b>${Math.round(s.reputation)}</b><small>${i18n.t('ref_empire_city_kpi_reputation')}</small></div>
      <div class="ref-cities-kpi__item"><span>📊</span><b>${financeBonus > 0 ? `+%${financeBonus}` : '—'}</b><small>${i18n.t('ref_empire_city_kpi_finance_bonus')}</small></div>
    `
    wrap.appendChild(kpi)

    // ── Yolculuk zinciri ──
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_city_journey_title'), fmt('ref_empire_city_journey_subtitle_fmt', { count: String(unlocked.length) })))
    const journey = document.createElement('div')
    journey.className = 'ref-cities-journey'
    journey.innerHTML = `<div class="ref-cities-journey__inner">${
      EXPANSION_CITIES.map((c, i) => {
        const isUnlocked = unlocked.includes(c.id)
        const isLast = i === EXPANSION_CITIES.length - 1
        return `
          <div class="ref-journey-stop${isUnlocked ? ' ref-journey-stop--unlocked' : ''}">
            <div class="ref-journey-node">${isUnlocked ? c.emoji : '🔒'}</div>
            <div class="ref-journey-label">${cityLabel(c.id)}</div>
          </div>
          ${!isLast ? `<div class="ref-journey-connector${isUnlocked ? ' on' : ''}"></div>` : ''}`
      }).join('')
    }</div>`
    wrap.appendChild(journey)

    // ── Şehir yönetim kartları ──
    const activeLabel = cityLabel(activeCity)
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_city_mgmt_title'), fmt('ref_empire_city_mgmt_subtitle_fmt', { city: activeLabel })))
    const mgmtList = document.createElement('div')
    mgmtList.className = 'ref-city-mgmt-list'
    mgmtList.innerHTML = EXPANSION_CITIES.map(c => {
      const isUnlocked = unlocked.includes(c.id)
      const isActive = c.id === activeCity
      const bonusHtml = c.categoryBonuses
        ? Object.entries(c.categoryBonuses).map(([cat, val]) =>
            `<span class="ref-city-bonus-chip">+%${Math.round((val as number) * 100)} ${cat}</span>`
          ).join('')
        : `<span class="ref-city-bonus-chip">${i18n.t('ref_empire_city_no_bonuses_label')}</span>`
      const check = canUnlockCity(c.id, s.cities, s.money, s.reputation, s.ipoCount)

      if (isUnlocked) {
        return `
          <div class="ref-city-mgmt-card ref-city-mgmt-card--unlocked">
            <div class="ref-city-mgmt-card__head">
              <span class="ref-city-mgmt-card__emoji">${c.emoji}</span>
              <div class="ref-city-mgmt-card__info">
                <div class="ref-city-mgmt-card__name">${cityLabel(c.id)}</div>
                <div class="ref-city-mgmt-card__bonuses">${bonusHtml}</div>
              </div>
              ${isActive ? `<span class="ref-city-active-badge">${i18n.t('ref_empire_city_active_badge')}</span>` : ''}
            </div>
            ${isActive ? '' : `<button class="ref-city-mgmt-btn" type="button" data-action="set_active:${c.id}">${i18n.t('ref_empire_city_set_active_button')}</button>`}
          </div>`
      }
      return `
        <div class="ref-city-mgmt-card ref-city-mgmt-card--locked">
          <div class="ref-city-mgmt-card__head">
            <span class="ref-city-mgmt-card__emoji">🔒</span>
            <div class="ref-city-mgmt-card__info">
              <div class="ref-city-mgmt-card__name">${cityLabel(c.id)}</div>
              <div class="ref-city-mgmt-card__req">${fmtMoney(c.unlockCost)} · ${i18n.t('ref_empire_city_rep_req_label')} ${c.repReq}${c.ipoReq ? ` · ${c.ipoReq} IPO` : ''}</div>
              ${!check.ok ? `<div class="ref-city-mgmt-card__reason">${check.reason ?? ''}</div>` : ''}
            </div>
            <span class="ref-city-locked-cost">${fmtMoney(c.unlockCost)}</span>
          </div>
          <button class="ref-city-mgmt-btn${check.ok ? ' ref-city-mgmt-btn--unlock' : ' ref-city-mgmt-btn--off'}"
            type="button" data-action="unlock_city:${c.id}" ${check.ok ? '' : 'disabled'}>
            ${fmt('ref_empire_city_unlock_button_fmt', { cost: fmtMoney(c.unlockCost) })}
          </button>
        </div>`
    }).join('')
    wrap.appendChild(mgmtList)

    // ── Bölgesel Bonuslar ──
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_regional_bonuses_title'), i18n.t('ref_empire_regional_bonuses_subtitle')))
    const bonusTable = document.createElement('div')
    bonusTable.className = 'ref-city-bonus-table'
    bonusTable.innerHTML = REGIONAL_BONUSES.map(b => {
      const cityDef = EXPANSION_CITIES.find(c => c.id === b.id)
      const isOwned = unlocked.includes(b.id as CityId)
      return `
        <div class="ref-city-bonus-row${isOwned ? ' ref-city-bonus-row--owned' : ''}">
          <span class="ref-city-bonus-row__ico">${cityDef?.emoji ?? '🌍'}</span>
          <div class="ref-city-bonus-row__info">
            <span class="ref-city-bonus-row__city">${cityDef ? cityLabel(cityDef.id) : b.id}</span>
            <span class="ref-city-bonus-row__cat">${i18n.t(b.categoryKey)}</span>
          </div>
          <span class="ref-city-bonus-row__val">${i18n.t(b.bonusKey)}</span>
        </div>`
    }).join('')
    wrap.appendChild(bonusTable)

    // ── Torpil Ağı ──
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_torpil_section_title'), i18n.t('ref_empire_torpil_section_subtitle')))
    const torpilList = document.createElement('div')
    torpilList.className = 'ref-torpil-panel'
    torpilList.innerHTML = TORPIL_CONTACTS.map(def => {
      const st = s.torpil.find(t => t.id === def.id)
      const active = !!st?.active
      const giftDue = !!st?.giftDue
      let right: string
      if (!active) {
        right = s.money >= def.hireCost
          ? `<button class="ref-world-btn" type="button" data-action="torpil_hire:${def.id}">${fmt('ref_empire_torpil_meet_fmt', { cost: fmtMoney(def.hireCost) })}</button>`
          : `<span class="ref-world-city-row__reason">${fmtMoney(def.hireCost)}</span>`
      } else if (giftDue) {
        right = `<button class="ref-world-btn warn" type="button" data-action="torpil_gift:${def.id}">${fmt('ref_empire_torpil_gift_fmt', { cost: fmtMoney(def.giftCost) })}</button>`
      } else {
        right = `<span class="ref-torpil-ok">${i18n.t('ref_empire_torpil_active_label')}</span>`
      }
      return `
        <div class="ref-torpil-row ${active ? 'active' : ''} ${giftDue ? 'gift-due' : ''}">
          <span class="ref-torpil-row__ico">${def.emoji}</span>
          <div class="ref-torpil-row__main">
            <div class="ref-torpil-row__name">${torpilName(def)} <small>· ${torpilRole(def)}</small></div>
            <div class="ref-torpil-row__desc">${torpilDesc(def)}</div>
          </div>
          ${right}
        </div>`
    }).join('')
    wrap.appendChild(torpilList)

    // ── Rüşvet & Koruma ──
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_bribe_section_title'), i18n.t('ref_empire_bribe_section_subtitle')))
    const heat = Math.round(s.illegalHeat * 100)
    const bribeCooldown = s.undergroundCooldownRemaining('bribe') > 0
    const lawyerCooldown = s.undergroundCooldownRemaining('lawyer') > 0
    const bribeCost = Math.floor(s.money * 0.05)
    const rushvet = document.createElement('div')
    rushvet.className = 'ref-rushvet-panel'
    rushvet.innerHTML = `
      <div class="ref-dark-card__row"><span>${i18n.t('ref_empire_police_heat_label')}</span><span>${heat}%</span></div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${heat < 30 ? 'high' : heat < 60 ? 'medium' : 'low'}" style="width:${heat}%"></div></div>
      <div class="ref-rushvet-actions">
        <button class="ref-world-btn danger" type="button" data-action="bribe" ${bribeCooldown || bribeCost <= 0 ? 'disabled' : ''}>
          ${fmt('ref_empire_bribe_button_fmt', { cost: bribeCost > 0 ? fmtMoney(bribeCost) : '—' })}${bribeCooldown ? ` (${i18n.t('ref_empire_action_cooldown_label')})` : ''}
        </button>
        <button class="ref-world-btn" type="button" data-action="lawyer" ${lawyerCooldown ? 'disabled' : ''}>
          ${fmt('ref_empire_lawyer_button_fmt', { cost: fmtMoney(Math.round(s.incomePerDay() * 0.5)) })}${lawyerCooldown ? ` (${i18n.t('ref_empire_action_cooldown_label')})` : ''}
        </button>
      </div>
      <div class="ref-rushvet-note">${i18n.t('ref_empire_bribe_note')}</div>
    `
    wrap.appendChild(rushvet)
  }

  /* ── ⚔️ RAKİPLER ──────────────────────────────────────────────────── */

  private buildRivals(): void {
    const wrap = this.tabs.section('rivals')
    wrap.innerHTML = ''
    const s = this.state

    if (!s) {
      wrap.appendChild(demoBanner(i18n.t('ref_empire_demo_rivals_panel')))
      return
    }

    // ── Bekleyen ittifak teklifi ──
    if (s.pendingRivalOffer) {
      const offer = s.pendingRivalOffer
      const banner = document.createElement('div')
      banner.className = 'ref-rival-offer-banner'
      banner.innerHTML = `
        <div class="ref-rival-offer-banner__head">🤝 ${offer.rivalName} — ${i18n.t('rival_offer_title')}</div>
        <div class="ref-rival-offer-banner__msg">${offer.message}</div>
        <div class="ref-rival-offer-banner__actions">
          <button class="ref-world-btn" type="button" data-action="offer_accept">${i18n.t('rival_offer_accept')}</button>
          <button class="ref-world-btn danger" type="button" data-action="offer_decline">${i18n.t('rival_offer_decline')}</button>
        </div>`
      wrap.appendChild(banner)
    }

    // ── Aktif rakip olayları (saldırılar) ──
    for (const ev of s.activeRivalEvents) {
      const evCard = document.createElement('div')
      evCard.className = 'ref-rival-offer-banner attack'
      evCard.innerHTML = `
        <div class="ref-rival-offer-banner__head">⚔️ ${ev.headline}</div>
        <div class="ref-rival-offer-banner__msg">${ev.description}</div>
        <div class="ref-rival-offer-banner__actions">
          ${ev.responses.map(r => `
            <button class="ref-world-btn" type="button" data-action="rival_event:${ev.id}@${r.id}">
              ${r.emoji} ${r.label}${r.cost > 0 ? ' · ' + fmtMoney(r.cost) : ''}
            </button>`).join('')}
        </div>`
      wrap.appendChild(evCard)
    }

    // ── Rakip kartları ──
    const activeRivals = s.rivals.filter(r => isRivalUnlocked(r.id, s.totalEarned))
    wrap.appendChild(sectionTitle(i18n.t('ref_empire_rival_families'), `${activeRivals.length} ${i18n.t('ref_empire_rival_active_suffix')}`))
    const list = document.createElement('div')
    list.className = 'ref-rival-list'

    const playerNW = s.financeNetWorth()
    for (const rival of activeRivals) {
      const def = RIVAL_FAMILY_DEFS.find(d => d.id === rival.id)
      const att = rival.attitude
      const attPct = Math.max(0, Math.min(100, Math.round((att + 100) / 2)))
      const ahead = rival.netWorth > playerNW
      const gone = rival.relation === 'merged' || rival.relation === 'bankrupt'

      const card = document.createElement('div')
      card.className = `ref-rival-card ${gone ? 'gone' : ''} ${rival.relation}`
      card.innerHTML = `
        <div class="ref-rival-card__head">
          <span class="ref-rival-card__emoji">${rival.emoji}</span>
          <div class="ref-rival-card__info">
            <div class="ref-rival-card__name">${def ? rivalFamilyName(def) : rival.name}</div>
            <div class="ref-rival-card__meta">${def ? rivalStageLabel(def) : ''} · ${def ? rivalPersonalityLabel(def) : ''}</div>
          </div>
          <div class="ref-rival-card__worth ${ahead ? 'ahead' : ''}">
            ${fmtMoney(Math.round(rival.netWorth))}
            <small>${gone ? (rival.relation === 'merged' ? i18n.t('rival_card_acquired') : i18n.t('rival_card_bankrupt')) : ahead ? i18n.t('rival_ahead') : i18n.t('rival_behind')}</small>
          </div>
        </div>
        ${gone
          ? rival.relation === 'bankrupt'
            ? (() => {
                const acquireCost = s.bankruptRivalAcquireCost(rival.id)
                const canAcquire = s.canAcquireBankruptRival(rival.id)
                return `<div class="ref-rival-card__actions">
                  <button class="ref-world-btn sm acquire" type="button" data-action="rival_acquire:${rival.id}" ${canAcquire ? '' : 'disabled'}>
                    ${canAcquire
                      ? fmt('rival_action_acquire', { cost: fmtMoney(acquireCost) })
                      : fmt('rival_action_no_funds', { cost: fmtMoney(acquireCost) })}
                  </button>
                </div>`
              })()
            : ''
          : `
          <div class="ref-rival-relation">
            <span class="ref-rival-relation__lbl">${attitudeLabel(att)}</span>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${att >= 20 ? 'high' : att >= -20 ? 'medium' : 'low'}" style="width:${attPct}%"></div></div>
          </div>
          <div class="ref-rival-card__actions">
            <button class="ref-world-btn sm danger" type="button" data-action="rival_lobby:${rival.id}">${fmt('rival_action_lobby', { cost: fmtMoney(Math.round(Math.max(5000, s.incomePerDay() * 0.2))) })}</button>
            <button class="ref-world-btn sm" type="button" data-action="rival_coop:${rival.id}">${fmt('rival_action_cooperate', { cost: fmtMoney(Math.round(Math.max(3000, s.incomePerDay() * 0.1))) })}</button>
            <button class="ref-world-btn sm gold" type="button" data-action="rival_merge:${rival.id}" ${s.money >= mergeRivalCost(rival) ? '' : 'disabled'}>${fmt('rival_action_buy', { cost: fmtMoney(mergeRivalCost(rival)) })}</button>
          </div>`}
      `
      list.appendChild(card)
    }
    wrap.appendChild(list)

    if (activeRivals.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'ref-empire-empty-state'
      empty.innerHTML = `
        <div class="ref-empire-empty-state__ico">⚔️</div>
        <div class="ref-empire-empty-state__title">${i18n.t('rival_empty_title')}</div>
        <div class="ref-empire-empty-state__desc">${i18n.t('rival_empty_desc')}</div>`
      wrap.appendChild(empty)
    }

    // ── Kilitli sonraki rakip ──
    const nextDef = nextLockedRivalDef(s.totalEarned)
    if (nextDef) {
      const lockedCard = document.createElement('div')
      lockedCard.className = 'ref-rival-card locked-next'
      lockedCard.innerHTML = `
        <div class="ref-rival-card__head">
          <span class="ref-rival-card__emoji">🔒</span>
          <div class="ref-rival-card__info">
            <div class="ref-rival-card__name">${rivalFamilyName(nextDef)}</div>
            <div class="ref-rival-card__meta">${fmt('rival_locked_unlock_hint', { cost: fmtMoney(nextDef.minPlayerEarned) })}</div>
          </div>
        </div>`
      wrap.appendChild(lockedCard)
    }
  }

  /* ── Ar-Ge yardımcıları ─────────────────────────────────────────────── */

  private buildRndBranchLabel(branch: ResearchNode['branch']): string {
    if (branch === 'operasyon') return i18n.t('ref_empire_rnd_branch_operasyon')
    if (branch === 'finans') return i18n.t('ref_empire_rnd_branch_finans')
    return i18n.t('ref_empire_rnd_branch_empire')
  }

  private buildResearchRow(node: ResearchNode, s?: GameState): HTMLElement {
    const level    = s ? (s.research[node.id] ?? 0) : 0
    const maxed    = level >= node.maxLevel
    const unlocked = s ? researchIsUnlocked(node.id, s.research) : true
    const cost     = researchCost(node, level)
    const prereq   = researchPrereqName(node.id)
    const curr     = node.currency === 'prestige' ? 'Prestij' : '₺'

    const row = document.createElement('div')
    row.className = 'ref-rnd-row' + (maxed ? ' maxed' : !unlocked ? ' locked' : level > 0 ? ' active' : '')
    const statusRight = maxed
      ? `<span class="ref-rnd-status max">${i18n.t('ref_empire_research_status_max')}</span>`
      : !unlocked
        ? `<span class="ref-rnd-status lock">🔒 ${prereq ?? '?'}</span>`
        : `<span class="ref-rnd-cost">${node.currency === 'prestige' ? cost + ' ⭐' : fmtMoney(cost)}</span>`

    row.innerHTML = `
      <div class="ref-rnd-row__main">
        <div class="ref-rnd-row__head">
          <span class="ref-rnd-row__name">${researchNodeName(node)}</span>
          <span class="ref-rnd-branch">${this.buildRndBranchLabel(node.branch)}</span>
        </div>
        <div class="ref-rnd-row__desc">${researchNodeDesc(node)}</div>
        <div class="ref-rnd-levels">
          ${Array.from({ length: node.maxLevel }, (_, i) =>
            `<span class="ref-rnd-pip ${i < level ? 'on' : ''}"></span>`).join('')}
          <span class="ref-rnd-lvl-txt">${fmt('ref_empire_research_level_fmt', { level: String(level), max: String(node.maxLevel) })}</span>
        </div>
      </div>
      <div class="ref-rnd-row__right" title="${curr}">${statusRight}</div>`
    return row
  }

  private buildUpgradeRow(upg: UpgradeDef, s?: GameState): HTMLElement {
    const owned  = s ? s.purchasedUpgrades.has(upg.id) : false
    const cost   = s ? s.upgradeCostFor(upg) : upg.cost
    const afford = s ? s.money >= cost : false

    const row = document.createElement('div')
    row.className = 'ref-rnd-row upg' + (owned ? ' maxed' : afford ? ' active' : '')
    const right = owned
      ? `<span class="ref-rnd-status max">${i18n.t('ref_empire_upgrade_owned')}</span>`
      : `<span class="ref-rnd-cost ${afford ? '' : 'dim'}">${fmtMoney(cost)}</span>`
    row.innerHTML = `
      <div class="ref-rnd-row__main">
        <div class="ref-rnd-row__head">
          <span class="ref-rnd-row__name">${upgradeName(upg)}</span>
        </div>
        <div class="ref-rnd-row__desc">${upgradeDesc(upg)}</div>
      </div>
      <div class="ref-rnd-row__right">${right}</div>`
    return row
  }
}
