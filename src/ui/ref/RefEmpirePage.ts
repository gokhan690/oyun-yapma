import { sectionTitle, ua, fmtMoney, demoBanner, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefSubTabs } from './RefSubTabs'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, type UpgradeDef } from '../../game/Economy'
import { politicsLevelLabel } from '../../game/Empire'
import { EXPANSION_CITIES, canUnlockCity, cityProducerBonus, type CityId } from '../../game/ExpansionMap'
import { TORPIL_CONTACTS, type TorpilId } from '../../game/TorpilNetwork'
import { RESEARCH_NODES, researchCost, researchIsUnlocked, researchPrereqName, type ResearchNode } from '../../game/Research'
import {
  RIVAL_FAMILY_DEFS, isRivalUnlocked, nextLockedRivalDef,
  attitudeLabel, mergeRivalCost,
} from '../../game/Rivals'

const REGIONAL_BONUSES: { id: string; category: string; bonus: string }[] = [
  { id: 'ankara', category: 'Siyaset',     bonus: '+%20 Siyaset geliri' },
  { id: 'izmir',  category: 'Turizm/Lüks', bonus: '+%20 Turizm · +%10 Lüks' },
  { id: 'dubai',  category: 'Finans/Lüks', bonus: '+%25 Lüks · +%15 Finans' },
  { id: 'london', category: 'Finans/Bilim',bonus: '+%25 Finans · +%15 Bilim' },
]

interface Dept { asset: string; name: string; lvl: number }
const DEPTS: Dept[] = [
  { asset: REF_ASSETS_V2_GENERIC.departments.operations,     name: 'Operasyon', lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.finance,        name: 'Finans',    lvl: 6 },
  { asset: REF_ASSETS_V2_GENERIC.departments.marketing,      name: 'Pazarlama', lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.hr,             name: 'İK',        lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.legal,          name: 'Hukuk',     lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.rnd,            name: 'Ar-Ge',     lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.logistics,      name: 'Lojistik',  lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.security,       name: 'Güvenlik',  lvl: 2 },
  { asset: REF_ASSETS_V2_GENERIC.departments.prMedia,        name: 'PR/Medya',  lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.familyOffice,   name: 'Aile Ofisi', lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.politics,       name: 'Siyaset',   lvl: 1 },
  { asset: REF_ASSETS_V2_GENERIC.departments.globalStrategy, name: 'Strateji',  lvl: 4 },
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
    { asset: REF_ASSETS_V2_GENERIC.departments.operations,     name: 'Operasyon', lvl: lvlFrom(ownedTypes, [1, 3, 6, 10, 15, 22, 30, 45, 65, 90]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.finance,        name: 'Finans',    lvl: lvlFrom(bankUsage, [1_000, 10_000, 50_000, 200_000, 1e6, 5e6, 2e7, 1e8, 5e8, 1e9]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.marketing,      name: 'Pazarlama', lvl: lvlFrom(s.reputation, [5, 15, 25, 35, 45, 55, 65, 75, 85, 95]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.hr,             name: 'İK',        lvl: lvlFrom(managerCnt, [1, 3, 6, 10, 15, 22, 30, 40, 55, 70]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.legal,          name: 'Hukuk',     lvl: insuranceCnt * 3 + (s.bank.creditScore >= 80 ? 1 : 0) },
    { asset: REF_ASSETS_V2_GENERIC.departments.rnd,            name: 'Ar-Ge',     lvl: lvlFrom(researchSum, [1, 3, 6, 10, 15, 21, 28, 36, 45, 55]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.logistics,      name: 'Lojistik',  lvl: lvlFrom(totalUnits, [5, 20, 60, 150, 350, 700, 1500, 3000, 6000, 12000]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.security,       name: 'Güvenlik',  lvl: lvlFrom(100 - s.illegalHeat * 100, [10, 25, 40, 55, 70, 80, 88, 93, 97, 99]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.prMedia,        name: 'PR/Medya',  lvl: mediaOwned * 2 + lvlFrom(s.reputation, [30, 50, 70, 90]) },
    { asset: REF_ASSETS_V2_GENERIC.departments.familyOffice,   name: 'Aile Ofisi', lvl: famSize * 2 + s.dynasty.generation },
    { asset: REF_ASSETS_V2_GENERIC.departments.politics,       name: 'Siyaset',   lvl: POLITICS_LVL[s.empire.politics.level] ?? 0 },
    { asset: REF_ASSETS_V2_GENERIC.departments.globalStrategy, name: 'Strateji',  lvl: Math.min(10, s.ipoCount + s.cities.unlocked.length) },
  ].map(d => ({ ...d, lvl: Math.max(0, Math.min(10, d.lvl)) }))
}

/**
 * İmparatorluk sayfası — 3 alt sekme:
 *  🏗️ Yönet: özet + kategori kartları + departmanlar + Ar-Ge
 *  🏙️ Şehir: yolculuk zinciri + şehir yönetimi + bölgesel bonuslar + torpil/rüşvet
 *  ⚔️ Rakipler: rakip aileler, teklifler, lobi/işbirliği/satın alma
 */
export class RefEmpirePage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'İMPARATORLUK'
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
      { id: 'manage', label: 'Yönet',    icon: '🏗️' },
      { id: 'world',  label: 'Şehir',    icon: '🏙️' },
      { id: 'rivals', label: 'Rakipler', icon: '⚔️' },
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
    const rivals = s.rivals.map(r => `${r.id}:${Math.round(r.netWorth / 1000)}:${r.attitude}:${r.relation}`).join(',')
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
        refToast(ok ? '🏙️ Yeni şehir açıldı!' : 'Şehir açılamadı', ok ? 'ok' : 'err')
        break
      }
      case 'set_active': {
        if (s.cities.unlocked.includes(id as CityId)) {
          s.cities.activeCity = id as CityId
          refToast(`🏙️ Aktif şehir güncellendi`, 'ok')
        }
        break
      }
      case 'torpil_hire': {
        const ok = s.hireTorpil(id as TorpilId)
        refToast(ok ? '🤝 Torpil ağına katıldı' : 'Yetersiz para', ok ? 'ok' : 'err')
        break
      }
      case 'torpil_gift': {
        const ok = s.payTorpilGift(id as TorpilId)
        refToast(ok ? '🎁 Hediye verildi' : 'Hediye verilemedi', ok ? 'ok' : 'err')
        break
      }
      case 'bribe': {
        const ok = s.useUndergroundAction('bribe')
        refToast(ok ? '💸 Rüşvet verildi — ısı düştü' : 'Rüşvet verilemedi (bekleme/para)', ok ? 'ok' : 'err')
        break
      }
      case 'lawyer': {
        const ok = s.useUndergroundAction('lawyer')
        refToast(ok ? '⚖️ Avukat tutuldu — koruma aktif' : 'Avukat tutulamadı (bekleme/para)', ok ? 'ok' : 'err')
        break
      }
      case 'rival_lobby': {
        const ok = s.rivalLobby(id)
        refToast(ok ? '🏛️ Lobi yapıldı — rakip zayıfladı' : 'Lobi yapılamadı', ok ? 'ok' : 'err')
        break
      }
      case 'rival_coop': {
        const ok = s.rivalCooperate(id)
        refToast(ok ? '🤝 İşbirliği anlaşması imzalandı' : 'İşbirliği yapılamadı', ok ? 'ok' : 'err')
        break
      }
      case 'rival_merge': {
        const ok = s.rivalMerge(id)
        refToast(ok ? '🛒 Rakip satın alındı!' : 'Satın alma başarısız', ok ? 'ok' : 'err')
        break
      }
      case 'offer_accept': {
        const ok = s.acceptRivalAllianceOffer()
        refToast(ok ? '🤝 İttifak kabul edildi' : 'Teklif bulunamadı', ok ? 'ok' : 'err')
        break
      }
      case 'offer_decline': {
        s.declineRivalAlliance()
        refToast('Teklif reddedildi', 'ok')
        break
      }
      case 'rival_event': {
        const [eventId, responseId] = id.split('@')
        if (eventId && responseId) {
          s.resolveRivalEvent(eventId, responseId)
          refToast('Hamle yapıldı', 'ok')
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

    const summary = document.createElement('div')
    summary.className = 'ref-empire-summary'
    summary.innerHTML = `
      <div class="ref-empire-summary__item"><span>🏙️</span><b>${cityCount}</b><small>Şehir</small></div>
      <div class="ref-empire-summary__item"><span>🏢</span><b>${firmCount}</b><small>Firma</small></div>
      <div class="ref-empire-summary__item"><span>🏛️</span><b>${DEPTS.length}</b><small>Departman</small></div>
      <div class="ref-empire-summary__item"><span>💎</span><b>${empireIncome > 0 ? fmtMoney(Math.round(empireIncome)) : '—'}</b><small>${empireIncome > 0 ? 'İmpGelir' : 'Değer'}</small></div>
    `
    wrap.appendChild(summary)

    // ── 6 kategori mini kartları ──
    const cats: { icon: string; name: string; owned: typeof sportOwned }[] = [
      { icon: '⚽', name: 'Futbol',  owned: sportOwned },
      { icon: '🏛️', name: 'Siyaset', owned: politicsOwned },
      { icon: '🔥', name: 'Yeraltı', owned: darkOwned },
      { icon: '💎', name: 'Lüks',    owned: luxOwned },
      { icon: '🔬', name: 'Bilim',   owned: sciOwned },
      { icon: '📊', name: 'Finans',  owned: finOwned },
    ]
    wrap.appendChild(sectionTitle('İmparatorluk Yatırımları', 'Firmalar → İmparatorluk'))
    const catGrid = document.createElement('div')
    catGrid.className = 'ref-empire-cat-grid'
    catGrid.innerHTML = cats.map(c => {
      const income = s ? Math.round(c.owned.reduce((sum, p) => sum + s.producerIncome(p), 0)) : 0
      const active = c.owned.length > 0
      return `
        <div class="ref-empire-cat-card ${active ? '' : 'inactive'}">
          <span class="ref-empire-cat-card__ico">${c.icon}</span>
          <div class="ref-empire-cat-card__name">${c.name}</div>
          <div class="ref-empire-cat-card__meta">${active ? `${c.owned.length} varlık · ${fmtMoney(income)}/g` : 'Yatırım yok'}</div>
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
          ${politicsOwned.map(p => `<span class="ref-politics-tag">${p.emoji} ${p.name} (${s.producers[p.id]})</span>`).join('')}
        </div>`
      wrap.appendChild(polCard)
    }
    if (s && darkOwned.length > 0) {
      const heat = Math.round(s.illegalHeat * 100)
      const heatFill = heat < 30 ? 'high' : heat < 60 ? 'medium' : 'low'
      const heatCard = document.createElement('div')
      heatCard.className = 'ref-dark-card'
      heatCard.innerHTML = `
        <div class="ref-dark-card__row"><span>🌡️ Polis Isısı</span><span>${heat}%</span></div>
        <div class="ref-perf-track"><div class="ref-perf-fill ${heatFill}" style="width:${heat}%"></div></div>
        <div class="ref-dark-card__ops">
          ${darkOwned.map(p => `<span class="ref-dark-tag">${p.emoji} ${p.name} (${s.producers[p.id]})</span>`).join('')}
        </div>`
      wrap.appendChild(heatCard)
    }

    // ── Departmanlar ──
    if (!s) wrap.appendChild(demoBanner('departman paneli — gerçek oyun verisi yok'))
    const depts = s ? deptLevelsFromState(s) : DEPTS
    wrap.appendChild(sectionTitle('Departmanlar', `${DEPTS.length} birim`))
    const deptGrid = document.createElement('div')
    deptGrid.className = 'ref-dept-grid'
    deptGrid.innerHTML = depts.map(d => `
      <div class="ref-dept-tile ${d.lvl === 0 ? 'inactive' : ''}">
        <img src="${ua(d.asset)}" alt="" class="ref-dept-tile__img">
        <span class="ref-dept-tile__name">${d.name}</span>
        <span class="ref-dept-tile__lvl">${d.lvl === 0 ? '—' : `Sv ${d.lvl}`}</span>
      </div>
    `).join('')
    wrap.appendChild(deptGrid)

    // ── Ar-Ge & Yükseltmeler ──
    const rndNote = document.createElement('div')
    rndNote.className = 'ref-preview-note' + (s ? ' live-mode' : '')
    rndNote.textContent = s
      ? '🔬 Ar-Ge & Yükseltmeler · seviye/maliyet gerçek (satın alma bu aşamada kapalı)'
      : '🔬 Ar-Ge & Yükseltmeler · önizleme (gerçek veri yok)'
    wrap.appendChild(rndNote)

    wrap.appendChild(sectionTitle('Araştırma Ağacı', `${RESEARCH_NODES.length} düğüm`))
    const resList = document.createElement('div')
    resList.className = 'ref-rnd-list'
    for (const node of RESEARCH_NODES) {
      resList.appendChild(this.buildResearchRow(node, s))
    }
    wrap.appendChild(resList)

    wrap.appendChild(sectionTitle('Yükseltmeler', `${UPGRADES.length} adet`))
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
    citiesNote.textContent = `🏙️ ${unlockedCnt}/${EXPANSION_CITIES.length} şehir açık — detaylar için "Şehir" sekmesine bakın`
    wrap.appendChild(citiesNote)
  }

  /* ── 🏙️ ŞEHİR ──────────────────────────────────────────────────────── */

  private buildWorld(): void {
    const wrap = this.tabs.section('world')
    wrap.innerHTML = ''
    const s = this.state

    if (!s) {
      wrap.appendChild(demoBanner('Şehir paneli — gerçek oyun verisi yok'))
      return
    }

    const unlocked = s.cities.unlocked
    const activeCity = s.cities.activeCity
    const financeBonus = Math.round(cityProducerBonus(s.cities, 'finance') * 100)

    // ── KPI şerit ──
    const kpi = document.createElement('div')
    kpi.className = 'ref-cities-kpi'
    kpi.innerHTML = `
      <div class="ref-cities-kpi__item"><span>🌍</span><b>${unlocked.length}/${EXPANSION_CITIES.length}</b><small>Şehir</small></div>
      <div class="ref-cities-kpi__item"><span>💰</span><b>${fmtMoney(Math.round(s.incomePerDay()))}</b><small>Günlük</small></div>
      <div class="ref-cities-kpi__item"><span>⭐</span><b>${Math.round(s.reputation)}</b><small>İtibar</small></div>
      <div class="ref-cities-kpi__item"><span>📊</span><b>${financeBonus > 0 ? `+%${financeBonus}` : '—'}</b><small>Finans B.</small></div>
    `
    wrap.appendChild(kpi)

    // ── Yolculuk zinciri ──
    wrap.appendChild(sectionTitle('Yolculuk', `${unlocked.length} şehir fethedildi`))
    const journey = document.createElement('div')
    journey.className = 'ref-cities-journey'
    journey.innerHTML = `<div class="ref-cities-journey__inner">${
      EXPANSION_CITIES.map((c, i) => {
        const isUnlocked = unlocked.includes(c.id)
        const isLast = i === EXPANSION_CITIES.length - 1
        return `
          <div class="ref-journey-stop${isUnlocked ? ' ref-journey-stop--unlocked' : ''}">
            <div class="ref-journey-node">${isUnlocked ? c.emoji : '🔒'}</div>
            <div class="ref-journey-label">${c.label}</div>
          </div>
          ${!isLast ? `<div class="ref-journey-connector${isUnlocked ? ' on' : ''}"></div>` : ''}`
      }).join('')
    }</div>`
    wrap.appendChild(journey)

    // ── Şehir yönetim kartları ──
    const activeLabel = EXPANSION_CITIES.find(c => c.id === activeCity)?.label ?? activeCity
    wrap.appendChild(sectionTitle('Şehir Yönetimi', `Aktif: ${activeLabel}`))
    const mgmtList = document.createElement('div')
    mgmtList.className = 'ref-city-mgmt-list'
    mgmtList.innerHTML = EXPANSION_CITIES.map(c => {
      const isUnlocked = unlocked.includes(c.id)
      const isActive = c.id === activeCity
      const bonusHtml = c.categoryBonuses
        ? Object.entries(c.categoryBonuses).map(([cat, val]) =>
            `<span class="ref-city-bonus-chip">+%${Math.round(val * 100)} ${cat}</span>`
          ).join('')
        : '<span class="ref-city-bonus-chip">Temel</span>'
      const check = canUnlockCity(c.id, s.cities, s.money, s.reputation, s.ipoCount)

      if (isUnlocked) {
        return `
          <div class="ref-city-mgmt-card ref-city-mgmt-card--active">
            <div class="ref-city-mgmt-card__head">
              <span class="ref-city-mgmt-card__emoji">${c.emoji}</span>
              <div class="ref-city-mgmt-card__info">
                <div class="ref-city-mgmt-card__name">${c.label}</div>
                <div class="ref-city-mgmt-card__bonuses">${bonusHtml}</div>
              </div>
              ${isActive ? '<span class="ref-city-active-badge">AKTİF</span>' : ''}
            </div>
            ${isActive ? '' : `<button class="ref-city-mgmt-btn" type="button" data-action="set_active:${c.id}">🏙️ Aktif Yap</button>`}
          </div>`
      }
      return `
        <div class="ref-city-mgmt-card ref-city-mgmt-card--locked">
          <div class="ref-city-mgmt-card__head">
            <span class="ref-city-mgmt-card__emoji">🔒</span>
            <div class="ref-city-mgmt-card__info">
              <div class="ref-city-mgmt-card__name">${c.label}</div>
              <div class="ref-city-mgmt-card__req">${fmtMoney(c.unlockCost)} · itibar ${c.repReq}${c.ipoReq ? ` · ${c.ipoReq} IPO` : ''}</div>
              ${!check.ok ? `<div class="ref-city-mgmt-card__reason">${check.reason ?? ''}</div>` : ''}
            </div>
            <span class="ref-city-locked-cost">${fmtMoney(c.unlockCost)}</span>
          </div>
          <button class="ref-city-mgmt-btn${check.ok ? ' ref-city-mgmt-btn--unlock' : ' ref-city-mgmt-btn--off'}"
            type="button" data-action="unlock_city:${c.id}" ${check.ok ? '' : 'disabled'}>
            🔓 Şehir Aç · ${fmtMoney(c.unlockCost)}
          </button>
        </div>`
    }).join('')
    wrap.appendChild(mgmtList)

    // ── Bölgesel Bonuslar ──
    wrap.appendChild(sectionTitle('Bölgesel Bonuslar', 'şehir açınca aktif olur'))
    const bonusTable = document.createElement('div')
    bonusTable.className = 'ref-city-bonus-table'
    bonusTable.innerHTML = REGIONAL_BONUSES.map(b => {
      const cityDef = EXPANSION_CITIES.find(c => c.id === b.id)
      const isOwned = unlocked.includes(b.id as CityId)
      return `
        <div class="ref-city-bonus-row${isOwned ? ' ref-city-bonus-row--owned' : ''}">
          <span class="ref-city-bonus-row__ico">${cityDef?.emoji ?? '🌍'}</span>
          <div class="ref-city-bonus-row__info">
            <span class="ref-city-bonus-row__city">${cityDef?.label ?? b.id}</span>
            <span class="ref-city-bonus-row__cat">${b.category}</span>
          </div>
          <span class="ref-city-bonus-row__val">${b.bonus}</span>
        </div>`
    }).join('')
    wrap.appendChild(bonusTable)

    // ── Torpil Ağı ──
    wrap.appendChild(sectionTitle('Torpil Ağı', 'tanıdık çevresi'))
    const torpilList = document.createElement('div')
    torpilList.className = 'ref-torpil-panel'
    torpilList.innerHTML = TORPIL_CONTACTS.map(def => {
      const st = s.torpil.find(t => t.id === def.id)
      const active = !!st?.active
      const giftDue = !!st?.giftDue
      let right: string
      if (!active) {
        right = s.money >= def.hireCost
          ? `<button class="ref-world-btn" type="button" data-action="torpil_hire:${def.id}">TANIŞ · ${fmtMoney(def.hireCost)}</button>`
          : `<span class="ref-world-city-row__reason">${fmtMoney(def.hireCost)}</span>`
      } else if (giftDue) {
        right = `<button class="ref-world-btn warn" type="button" data-action="torpil_gift:${def.id}">🎁 HEDİYE · ${fmtMoney(def.giftCost)}</button>`
      } else {
        right = '<span class="ref-torpil-ok">✓ Aktif</span>'
      }
      return `
        <div class="ref-torpil-row ${active ? 'active' : ''} ${giftDue ? 'gift-due' : ''}">
          <span class="ref-torpil-row__ico">${def.emoji}</span>
          <div class="ref-torpil-row__main">
            <div class="ref-torpil-row__name">${def.name} <small>· ${def.role}</small></div>
            <div class="ref-torpil-row__desc">${def.description}</div>
          </div>
          ${right}
        </div>`
    }).join('')
    wrap.appendChild(torpilList)

    // ── Rüşvet & Koruma ──
    wrap.appendChild(sectionTitle('Rüşvet & Koruma', 'riskli ama hızlı'))
    const heat = Math.round(s.illegalHeat * 100)
    const bribeCooldown = s.undergroundCooldownRemaining('bribe') > 0
    const lawyerCooldown = s.undergroundCooldownRemaining('lawyer') > 0
    const bribeCost = Math.floor(s.money * 0.05)
    const rushvet = document.createElement('div')
    rushvet.className = 'ref-rushvet-panel'
    rushvet.innerHTML = `
      <div class="ref-dark-card__row"><span>🌡️ Polis Isısı</span><span>${heat}%</span></div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${heat < 30 ? 'high' : heat < 60 ? 'medium' : 'low'}" style="width:${heat}%"></div></div>
      <div class="ref-rushvet-actions">
        <button class="ref-world-btn danger" type="button" data-action="bribe" ${bribeCooldown || bribeCost <= 0 ? 'disabled' : ''}>
          💸 Rüşvet Ver · ${bribeCost > 0 ? fmtMoney(bribeCost) : '—'}${bribeCooldown ? ' (bekleme)' : ''}
        </button>
        <button class="ref-world-btn" type="button" data-action="lawyer" ${lawyerCooldown ? 'disabled' : ''}>
          ⚖️ Avukat Tut · ${fmtMoney(Math.round(s.incomePerDay() * 0.5))}${lawyerCooldown ? ' (bekleme)' : ''}
        </button>
      </div>
      <div class="ref-rushvet-note">Rüşvet: ısıyı -40 düşürür, paranın %5'i. Avukat: -25 ısı + koruma süresi.</div>
    `
    wrap.appendChild(rushvet)
  }

  /* ── ⚔️ RAKİPLER ──────────────────────────────────────────────────── */

  private buildRivals(): void {
    const wrap = this.tabs.section('rivals')
    wrap.innerHTML = ''
    const s = this.state

    if (!s) {
      wrap.appendChild(demoBanner('Rakipler paneli — gerçek oyun verisi yok'))
      return
    }

    // ── Bekleyen ittifak teklifi ──
    if (s.pendingRivalOffer) {
      const offer = s.pendingRivalOffer
      const banner = document.createElement('div')
      banner.className = 'ref-rival-offer-banner'
      banner.innerHTML = `
        <div class="ref-rival-offer-banner__head">🤝 ${offer.rivalName} — İttifak Teklifi</div>
        <div class="ref-rival-offer-banner__msg">${offer.message}</div>
        <div class="ref-rival-offer-banner__actions">
          <button class="ref-world-btn" type="button" data-action="offer_accept">KABUL ET</button>
          <button class="ref-world-btn danger" type="button" data-action="offer_decline">REDDET</button>
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
    wrap.appendChild(sectionTitle('Rakip Aileler', `${activeRivals.length} aktif`))
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
            <div class="ref-rival-card__name">${rival.name}</div>
            <div class="ref-rival-card__meta">${def?.stageLabel ?? ''} · ${def?.personalityLabel ?? ''}</div>
          </div>
          <div class="ref-rival-card__worth ${ahead ? 'ahead' : ''}">
            ${fmtMoney(Math.round(rival.netWorth))}
            <small>${gone ? (rival.relation === 'merged' ? 'satın alındı' : 'iflas') : ahead ? '⚠️ önde' : 'geride'}</small>
          </div>
        </div>
        ${gone ? '' : `
          <div class="ref-rival-relation">
            <span class="ref-rival-relation__lbl">${attitudeLabel(att)}</span>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${att >= 20 ? 'high' : att >= -20 ? 'medium' : 'low'}" style="width:${attPct}%"></div></div>
          </div>
          <div class="ref-rival-card__actions">
            <button class="ref-world-btn sm danger" type="button" data-action="rival_lobby:${rival.id}">🏛️ Lobi · ${fmtMoney(Math.round(Math.max(5000, s.incomePerDay() * 0.2)))}</button>
            <button class="ref-world-btn sm" type="button" data-action="rival_coop:${rival.id}">🤝 İşbirliği · ${fmtMoney(Math.round(Math.max(3000, s.incomePerDay() * 0.1)))}</button>
            <button class="ref-world-btn sm gold" type="button" data-action="rival_merge:${rival.id}" ${s.money >= mergeRivalCost(rival) ? '' : 'disabled'}>🛒 Satın Al · ${fmtMoney(mergeRivalCost(rival))}</button>
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
        <div class="ref-empire-empty-state__title">Henüz rakip yok</div>
        <div class="ref-empire-empty-state__desc">Kazandıkça rakip aileler sahaya iner — büyümeye devam et.</div>`
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
            <div class="ref-rival-card__name">${nextDef.name}</div>
            <div class="ref-rival-card__meta">${fmtMoney(nextDef.minPlayerEarned)} toplam kazanca ulaşınca sahaya iner</div>
          </div>
        </div>`
      wrap.appendChild(lockedCard)
    }
  }

  /* ── Ar-Ge yardımcıları ─────────────────────────────────────────────── */

  private buildRndBranchLabel(branch: ResearchNode['branch']): string {
    return branch === 'operasyon' ? 'Operasyon' : branch === 'finans' ? 'Finans' : 'İmparatorluk'
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
      ? '<span class="ref-rnd-status max">MAKS</span>'
      : !unlocked
        ? `<span class="ref-rnd-status lock">🔒 ${prereq ?? '?'}</span>`
        : `<span class="ref-rnd-cost">${node.currency === 'prestige' ? cost + ' ⭐' : fmtMoney(cost)}</span>`

    row.innerHTML = `
      <div class="ref-rnd-row__main">
        <div class="ref-rnd-row__head">
          <span class="ref-rnd-row__name">${node.name}</span>
          <span class="ref-rnd-branch">${this.buildRndBranchLabel(node.branch)}</span>
        </div>
        <div class="ref-rnd-row__desc">${node.description}</div>
        <div class="ref-rnd-levels">
          ${Array.from({ length: node.maxLevel }, (_, i) =>
            `<span class="ref-rnd-pip ${i < level ? 'on' : ''}"></span>`).join('')}
          <span class="ref-rnd-lvl-txt">Sv ${level}/${node.maxLevel}</span>
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
      ? '<span class="ref-rnd-status max">SAHİP</span>'
      : `<span class="ref-rnd-cost ${afford ? '' : 'dim'}">${fmtMoney(cost)}</span>`
    row.innerHTML = `
      <div class="ref-rnd-row__main">
        <div class="ref-rnd-row__head">
          <span class="ref-rnd-row__name">${upg.name}</span>
        </div>
        <div class="ref-rnd-row__desc">${upg.description}</div>
      </div>
      <div class="ref-rnd-row__right">${right}</div>`
    return row
  }
}
