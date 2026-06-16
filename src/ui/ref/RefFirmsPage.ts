import { RefKpiStrip, type KpiItem }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import { fmtMoney, refToast } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, isProducerUnlocked, type ProducerDef } from '../../game/Economy'
import { FIRM_MAX_LEVEL, firmLevelIncomeMult, isFirmMaxLevel } from '../../game/FirmLevels'
import { hasManager } from '../../game/Managers'
import { modernizeCost } from '../../game/TechObsolescence'

/* ── Mock data (gerçek veri/state yoksa saf önizleme) ──────────────────── */
const MOCK_FIRMS: FirmData[] = [
  { id: 'firin_1', name: 'Karahan Fırınları', slogan: 'Taze her gün', category: 'bakery', sector: 'gida', emoji: '🥖', level: 7, stars: 4, status: 'Büyüyor', income: 580_000, expense: 210_000, growth: 12.1, city: 'Ankara', performance: 76 },
  { id: 'firin_2', name: 'Altın Ekmek', category: 'bakery', sector: 'gida', emoji: '🥖', level: 5, stars: 3, status: 'Karlı', income: 410_000, expense: 160_000, growth: 9.4, city: 'Konya', performance: 71 },
  { id: 'kahve_1', name: 'Mavi Çekirdek', category: 'coffee', sector: 'gida', emoji: '☕', level: 8, stars: 5, status: 'Karlı', income: 1_120_000, expense: 340_000, growth: 9.7, city: 'İzmir', performance: 84 },
  { id: 'berber_1', name: 'Beyoğlu Berber', category: 'barber', sector: 'hizmet', emoji: '💈', level: 6, stars: 4, status: 'Karlı', income: 320_000, expense: 120_000, growth: 8.3, city: 'İstanbul', performance: 82 },
  { id: 'eticaret_1', name: 'TrendAl', category: 'ecommerce', sector: 'teknoloji', emoji: '🛒', level: 6, stars: 4, status: 'Büyüyor', income: 890_000, expense: 260_000, growth: 15.2, city: 'İstanbul', performance: 88 },
  { id: 'yazilim_1', name: 'Piksel Stüdyo', category: 'software', sector: 'teknoloji', emoji: '💻', level: 5, stars: 3, status: 'Karlı', income: 760_000, expense: 190_000, growth: 11.4, city: 'Bursa', performance: 63 },
  { id: 'lojistik_1', name: 'Hızlı Kargo', category: 'logistics', sector: 'hizmet', emoji: '🚚', level: 4, stars: 2, status: 'Riskli', income: 1_050_000, expense: 180_000, growth: 7.6, city: 'Mersin', performance: 48, riskLevel: 65 },
]

/* ── Kategori ayrımı: İmparatorluk yatırımları normal listeden ayrılır ──── */
const EMPIRE_PRODUCER_IDS = new Set(
  PRODUCERS
    .filter(p => p.category === 'sport' || p.category === 'politics' || p.category === 'dark' || p.category === 'luxury' || p.illegal)
    .map(p => p.id)
)
const NORMAL_PRODUCERS = PRODUCERS.filter(p => !EMPIRE_PRODUCER_IDS.has(p.id))

/* ── Önizleme kategori filtreleri (mock mod) ───────────────────────────── */
type CategoryKey = 'tumu' | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya' | 'illegal'
const CATEGORIES: { id: CategoryKey; label: string; icon: string }[] = [
  { id: 'tumu', label: 'Tümü', icon: '' },
  { id: 'gida', label: 'Gıda', icon: '🍔' },
  { id: 'hizmet', label: 'Hizmet', icon: '🤝' },
  { id: 'teknoloji', label: 'Teknoloji', icon: '🚀' },
  { id: 'finans', label: 'Finans', icon: '💰' },
  { id: 'turizm', label: 'Turizm', icon: '✈️' },
  { id: 'medya', label: 'Medya', icon: '🎬' },
  { id: 'illegal', label: 'Illegal', icon: '🚫' },
]

/* ── İmparatorluk alt sekmeleri ──────────────────────────────────────── */
type EmpireTab = 'futbol' | 'siyaset' | 'yeralti' | 'luks' | 'bilim' | 'finans'
const EMPIRE_TABS: { id: EmpireTab; label: string; icon: string }[] = [
  { id: 'futbol', label: 'Futbol', icon: '⚽' },
  { id: 'siyaset', label: 'Siyaset', icon: '🏛️' },
  { id: 'yeralti', label: 'Yeraltı', icon: '🔥' },
  { id: 'luks', label: 'Lüks', icon: '💎' },
  { id: 'bilim', label: 'Bilim', icon: '🔬' },
  { id: 'finans', label: 'Finans', icon: '📊' },
]
const EMPIRE_PRODUCER_FILTER: Record<EmpireTab, (p: ProducerDef) => boolean> = {
  futbol:  p => p.category === 'sport',
  siyaset: p => p.category === 'politics',
  yeralti: p => p.category === 'dark' || (!!p.illegal && p.category !== 'sport' && p.category !== 'politics' && p.category !== 'luxury' && p.category !== 'science' && p.category !== 'finance'),
  luks:    p => p.category === 'luxury',
  bilim:   p => p.category === 'science',
  finans:  p => p.category === 'finance',
}

const CAT_LABELS: Partial<Record<string, string>> = {
  sport:    '⚽ Futbol',
  politics: '🏛️ Siyaset',
  dark:     '🔥 Yeraltı',
  luxury:   '💎 Lüks',
  science:  '🔬 Bilim',
  finance:  '📊 Finans',
}

type MainTab = 'normal' | 'empire'

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'FİRMALAR'

  onOpenFirm?: (firm: FirmData, live?: { state: GameState; producerId: string }) => void

  private activeCategory: CategoryKey = 'tumu'
  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()

  private activeEmpireTab: EmpireTab = 'futbol'
  private empireContent?: HTMLElement
  private lastEmpireSig = ''

  // Canlı producer kartları
  private producerCardsContainer!: HTMLElement
  private producerCards = new Map<string, HTMLElement>()
  private cardSignatures = new Map<string, string>()
  private summaryEl?: HTMLElement
  private lastSummaryHtml = ''
  private kpiStrip?: RefKpiStrip

  // Tur 2: Buy mode + tier filter
  private buyMode: 1 | 10 | 100 | 'max' = 1
  private tierFilter: 'tumu' | 'small' | 'medium' | 'large' = 'tumu'
  private buyModeRow?: HTMLElement
  private tierFilterRow?: HTMLElement

  private firms?: FirmData[]
  private state?: GameState

  constructor(firms?: FirmData[], _hasRealData = false, state?: GameState) {
    this.firms = firms
    this.state = state

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-firms-page'
    this.buildPage()
    // Canlı para/KPI refresh'i RefApp'in tek aboneliğinden gelir → refresh().
  }

  private buildPage(): void {
    // KPI strip — state varsa gerçek, yoksa mock'tan türetilir
    this.el.appendChild(this.buildKpi())

    // Ana sekmeler
    this.el.appendChild(this.buildMainTabs())

    // A) Normal İşletmeler
    const normal = document.createElement('div')
    normal.className = 'ref-firms-tab-content'
    normal.dataset.tab = 'normal'
    if (this.state) {
      normal.appendChild(this.buildLiveProducerSection())
    } else {
      normal.appendChild(this.buildMockSection())
    }
    this.el.appendChild(normal)

    // B) İmparatorluk Yatırımları
    const empire = document.createElement('div')
    empire.className = 'ref-firms-tab-content'
    empire.dataset.tab = 'empire'
    empire.style.display = 'none'
    empire.appendChild(this.buildEmpireSection())
    this.el.appendChild(empire)

  }

  // ── KPI ─────────────────────────────────────────────────────────────
  private buildKpi(): HTMLElement {
    const s = this.state
    if (s) {
      this.kpiStrip = new RefKpiStrip(this.liveKpiItems(s))
      return this.kpiStrip.el
    }
    // Mock
    const data = (this.firms && this.firms.length) ? this.firms : MOCK_FIRMS
    const totalIncome = data.reduce((a, f) => a + f.income, 0)
    const avgPerf = data.length ? Math.round(data.reduce((a, f) => a + f.performance, 0) / data.length) : 0
    return new RefKpiStrip([
      { icon: '🏢', label: 'Aktif Firma', value: String(data.length), sub: 'Toplam', subDir: 'muted' },
      { icon: '📈', label: 'Firmalardan Gelir', value: fmtMoney(totalIncome), sub: 'İşletme gelirleri', subDir: 'up' },
      { icon: '💰', label: 'Yasadışı Gelir', value: 'Yok', sub: 'Günlük', subDir: 'muted' },
      { icon: '⚙️', label: 'Verimlilik', value: `${avgPerf}%`, sub: 'Ortalama', subDir: 'muted' },
    ]).el
  }

  // ── Ana sekmeler ─────────────────────────────────────────────────────
  private buildMainTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-main-tabs'
    const tabs: { id: MainTab; label: string; icon: string }[] = [
      { id: 'normal', label: 'Normal Firmalar', icon: '🏪' },
      { id: 'empire', label: 'İmparatorluk Yatırımları', icon: '👑' },
    ]
    for (const tab of tabs) {
      const btn = document.createElement('button')
      btn.className = 'ref-main-tab' + (tab.id === 'normal' ? ' active' : '')
      btn.dataset.tab = tab.id
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchMainTab(tab.id))
      wrap.appendChild(btn)
    }
    return wrap
  }

  private switchMainTab(id: MainTab): void {
    this.el.querySelectorAll<HTMLButtonElement>('.ref-main-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id)
    })
    this.el.querySelectorAll<HTMLElement>('.ref-firms-tab-content').forEach(sec => {
      sec.style.display = (sec.dataset.tab === id) ? '' : 'none'
    })
  }

  // ── Canlı Normal İşletmeler (state varken — TÜM normal producer'lar) ──
  private buildLiveProducerSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-live-biz'

    // Buy mode selector
    this.buyModeRow = document.createElement('div')
    this.buyModeRow.className = 'ref-buy-mode-row'
    this.buyModeRow.innerHTML = `
      <span class="ref-buy-mode-lbl">Adet:</span>
      <button class="ref-buy-mode-btn active" data-buy-mode="1">1×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="10">10×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="100">100×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="max">Max</button>`
    wrap.appendChild(this.buyModeRow)

    // Tier filter
    this.tierFilterRow = document.createElement('div')
    this.tierFilterRow.className = 'ref-tier-filter-row'
    this.tierFilterRow.innerHTML = `
      <button class="ref-tier-btn active" data-tier-filter="tumu">Tümü</button>
      <button class="ref-tier-btn" data-tier-filter="small">T1–3</button>
      <button class="ref-tier-btn" data-tier-filter="medium">T4–6</button>
      <button class="ref-tier-btn" data-tier-filter="large">T7+</button>`
    wrap.appendChild(this.tierFilterRow)

    this.summaryEl = document.createElement('div')
    this.summaryEl.className = 'ref-summary-strip'
    wrap.appendChild(this.summaryEl)

    this.producerCardsContainer = document.createElement('div')
    this.producerCardsContainer.className = 'ref-prod-list'
    wrap.appendChild(this.producerCardsContainer)

    // Click delegation: buy-mode + tier filter
    wrap.addEventListener('click', (e) => {
      const buyBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-mode]')
      if (buyBtn) {
        const raw = buyBtn.dataset.buyMode!
        this.buyMode = (raw === 'max' ? 'max' : Number(raw) as 1 | 10 | 100)
        this.buyModeRow?.querySelectorAll('.ref-buy-mode-btn').forEach(b => {
          b.classList.toggle('active', (b as HTMLElement).dataset.buyMode === raw)
        })
        this.buildProducerCards()  // rebuild with new qty
        this.applyTierFilter()
        return
      }
      const tierBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tier-filter]')
      if (tierBtn) {
        this.tierFilter = tierBtn.dataset.tierFilter as typeof this.tierFilter
        this.tierFilterRow?.querySelectorAll('.ref-tier-btn').forEach(b => {
          b.classList.toggle('active', (b as HTMLElement).dataset.tierFilter === this.tierFilter)
        })
        this.applyTierFilter()
      }
    })

    this.buildProducerCards()
    this.updateSummary()
    return wrap
  }

  private applyTierFilter(): void {
    for (const [id, card] of this.producerCards) {
      const def = NORMAL_PRODUCERS.find(p => p.id === id)
      if (!def) continue
      const tier = def.tier
      const show = this.tierFilter === 'tumu'
        || (this.tierFilter === 'small'  && tier <= 3)
        || (this.tierFilter === 'medium' && tier >= 4 && tier <= 6)
        || (this.tierFilter === 'large'  && tier >= 7)
      card.style.display = show ? '' : 'none'
    }
  }

  private buildProducerCards(): void {
    this.producerCards.clear()
    this.producerCardsContainer.innerHTML = ''
    const s = this.state!
    const sorted = [...NORMAL_PRODUCERS].sort((a, b) => a.tier - b.tier || a.unlockAt - b.unlockAt)
    for (const def of sorted) {
      const card = this.buildOneProducerCard(def, s)
      this.producerCards.set(def.id, card)
      this.producerCardsContainer.appendChild(card)
    }
  }

  /** ProducerDef + canlı state → detay ekranı için FirmData (gerçek değerler). */
  private producerToFirmData(def: ProducerDef, s: GameState): FirmData {
    const owned = s.producers[def.id] ?? 0
    const lv = s.producerLevel ? s.producerLevel(def.id) : 1
    const income = Math.round(s.producerIncome(def))
    const expense = Math.round(income * 0.28)  // gider ölçülmüyor → tahmini
    const perf = Math.min(96, 45 + lv * 10)
    const cat = (def as ProducerDef & { category?: string }).category ?? def.id
    return {
      id: def.id,
      name: def.name,
      slogan: def.description,
      category: cat,
      emoji: def.emoji,
      level: lv,
      stars: Math.min(5, Math.max(1, lv)),
      maxStars: FIRM_MAX_LEVEL,
      status: owned > 0 ? 'Karlı' : 'Büyüyor',
      income,
      expense,
      growth: 5 + lv * 1.5,
      city: 'İstanbul',
      performance: perf,
    }
  }

  /** Satın alınacak adet: buy mode + max hesabı */
  private getQty(def: ProducerDef, s: GameState): number {
    if (this.buyMode !== 'max') return this.buyMode
    const owned = s.producers[def.id] ?? 0
    if (!isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)) return 0
    if (s.money < s.producerCostFor(def, owned, 1)) return 0
    let lo = 1, hi = 2000
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (s.producerCostFor(def, owned, mid) <= s.money) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  private buildOneProducerCard(def: ProducerDef, s: GameState): HTMLElement {
    const owned    = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const qty      = this.getQty(def, s)
    const cost     = s.producerCostFor(def, owned, Math.max(1, qty))
    const canBuy   = unlocked && qty > 0 && s.money >= cost

    const income   = owned > 0 ? Math.round(s.producerIncome(def)) : Math.round(def.baseIncome)

    const firmLv   = owned > 0 ? (s.producerLevel ? s.producerLevel(def.id) : 1) : 0
    const lvCost   = owned > 0 && !isFirmMaxLevel(firmLv) ? (s.firmLevelUpCostFor ? s.firmLevelUpCostFor(def) : 0) : 0
    const canLevelUp = owned > 0 && !isFirmMaxLevel(firmLv) && s.money >= lvCost && lvCost > 0

    const managerHired = hasManager(s.managers, def.id)
    const manCost      = owned > 0 && !managerHired ? s.managerCostFor(def) : 0
    const canManager   = owned > 0 && !managerHired && s.money >= manCost && manCost > 0

    const isModernized = !!s.producerModernized[def.id]
    const modCost      = owned > 0 && !isModernized && s.ipoCount > 0 ? modernizeCost(def.tier, owned) : 0
    const canModernize = owned > 0 && !isModernized && s.ipoCount > 0 && s.money >= modCost && modCost > 0

    let stateClass: string
    if (!unlocked && def.ipoRequirement && s.ipoCount < def.ipoRequirement) stateClass = 'locked'
    else if (!unlocked) stateClass = 'locked'
    else if (owned > 0) stateClass = canBuy ? 'owned' : 'owned no-cash'
    else if (canBuy) stateClass = 'available'
    else stateClass = 'no-cash'

    const card = document.createElement('div')
    card.className = `ref-prod-card ${stateClass}`
    if (def.category) card.classList.add(`ref-prod-card--cat-${def.category}`)
    card.dataset.id = def.id
    card.dataset.tier = String(def.tier)

    const catChip = def.category && CAT_LABELS[def.category]
      ? `<span class="ref-prod-cat-chip ref-prod-cat-chip--${def.category}">${CAT_LABELS[def.category]}</span>`
      : ''

    let footRight: string
    if (!unlocked) {
      const reason = (def.ipoRequirement && s.ipoCount < def.ipoRequirement)
        ? `🔒 ${def.ipoRequirement} IPO gerekli`
        : `🔒 ${fmtMoney(def.unlockAt)} kazanınca`
      footRight = `<span class="ref-prod-locked-lbl">${reason}</span>`
    } else if (canBuy) {
      const qtyLbl = this.buyMode === 'max' ? `Max(${qty})×` : `+${qty}×`
      footRight = `<button class="ref-prod-btn buyable" type="button">${owned > 0 ? qtyLbl : 'SATIN AL'} · ${fmtMoney(cost)}</button>`
    } else {
      const cost1 = s.producerCostFor(def, owned, 1)
      footRight = `<button class="ref-prod-btn disabled" type="button" disabled>Para Yetersiz · ${fmtMoney(cost1)}</button>`
    }

    const lvPips = owned > 0
      ? `<div class="ref-prod-lvl-pips">${Array.from({ length: FIRM_MAX_LEVEL }, (_, i) =>
          `<span class="ref-prod-lvl-pip${i < firmLv ? ' on' : ''}"></span>`).join('')}</div>`
      : ''

    const lvBadge = owned > 0
      ? `<span class="ref-prod-lv-badge${isFirmMaxLevel(firmLv) ? ' ref-prod-lv-badge--max' : ''}">Lv.${firmLv}</span>`
      : ''

    const incomeMult = owned > 0 && firmLv > 1 ? `<small class="ref-prod-lv-mult">×${firmLevelIncomeMult(firmLv).toFixed(2)} gelir</small>` : ''

    const lvBtn = owned > 0
      ? `<button class="ref-prod-lvl-btn${canLevelUp ? ' ref-prod-lvl-btn--active' : ''}" type="button" data-levelup="${def.id}" ${canLevelUp ? '' : 'disabled'}>
          ⬆️ GELİŞTİR ${isFirmMaxLevel(firmLv) ? '(MAK)' : `· Lv.${firmLv + 1} · ${fmtMoney(lvCost)}`}
        </button>`
      : ''

    const manBtn = owned > 0 && !managerHired
      ? `<button class="ref-prod-action-btn manager${canManager ? '' : ' disabled'}" type="button" data-manager="${def.id}" ${canManager ? '' : 'disabled'}>
           👔 YÖNET. · ${fmtMoney(manCost)}
         </button>`
      : owned > 0 && managerHired
        ? `<span class="ref-prod-badge-ok">✓ Yönetici</span>`
        : ''

    const modBtn = owned > 0 && s.ipoCount > 0 && !isModernized
      ? `<button class="ref-prod-action-btn modernize${canModernize ? '' : ' disabled'}" type="button" data-modernize="${def.id}" ${canModernize ? '' : 'disabled'}>
           🔧 MODERNİZE · ${fmtMoney(modCost)}
         </button>`
      : owned > 0 && isModernized
        ? `<span class="ref-prod-badge-ok">✓ Modern</span>`
        : ''

    card.innerHTML = `
      <div class="ref-prod-card__head">
        <span class="ref-prod-emoji">${def.emoji}</span>
        <div class="ref-prod-info">
          <div class="ref-prod-name">${def.name}${owned > 0 ? `<span class="ref-prod-owned-badge">×${owned}</span>` : ''}${lvBadge}</div>
          ${catChip}
          <div class="ref-prod-desc">${def.description}${incomeMult}</div>
        </div>
      </div>
      ${lvPips}
      <div class="ref-prod-stats">
        <span class="ref-prod-stat"><small>Kademe</small><b>T${def.tier}</b></span>
        <span class="ref-prod-stat"><small>${owned > 0 ? 'Gelir/g' : 'Birim'}</small><b class="inc">${fmtMoney(income)}</b></span>
        <span class="ref-prod-stat"><small>Adet</small><b>${owned > 0 ? owned : '—'}</b></span>
        <span class="ref-prod-stat"><small>Maliyet</small><b>${fmtMoney(s.producerCostFor(def, owned, 1))}</b></span>
      </div>
      <div class="ref-prod-card__foot">
        ${footRight}
        ${lvBtn}
      </div>
      ${(manBtn || modBtn) ? `<div class="ref-prod-action-row">${manBtn}${modBtn}</div>` : ''}
    `

    // Sahip olunan firmanın başlığına tıkla → detay ekranı (gerçek veri + yönetim)
    if (owned > 0) {
      const head = card.querySelector<HTMLElement>('.ref-prod-card__head')
      if (head) {
        head.classList.add('ref-prod-card__head--clickable')
        head.addEventListener('click', () => {
          const s2 = this.state
          if (!s2) return
          this.onOpenFirm?.(this.producerToFirmData(def, s2), { state: s2, producerId: def.id })
        })
      }
    }

    card.querySelector<HTMLButtonElement>('.ref-prod-btn.buyable')?.addEventListener('click', () => {
      const buyQty = this.getQty(def, this.state!)
      const ok = this.state?.buyProducer(def.id, Math.max(1, buyQty))
      if (ok) refToast(`${def.emoji} ${def.name} ×${buyQty} alındı`, 'ok')
      else refToast('Satın alınamadı', 'err')
    })

    card.querySelector<HTMLButtonElement>('[data-levelup]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const ok = this.state?.levelUpFirm(def)
      if (ok) {
        refToast(`⬆️ ${def.emoji} ${def.name} Lv.${this.state!.producerLevel(def.id)}`, 'ok')
        const newCard = this.buildOneProducerCard(def, this.state!)
        card.replaceWith(newCard)
        this.producerCards.set(def.id, newCard)
        this.updateSummary()
      } else {
        refToast('Seviye atlatılamadı', 'err')
      }
    })

    card.querySelector<HTMLButtonElement>('[data-manager]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const ok = this.state?.hireManager(def.id)
      if (ok) {
        refToast(`👔 ${def.name} yöneticisi işe alındı`, 'ok')
        const newCard = this.buildOneProducerCard(def, this.state!)
        card.replaceWith(newCard)
        this.producerCards.set(def.id, newCard)
      } else {
        refToast('Yönetici işe alınamadı', 'err')
      }
    })

    card.querySelector<HTMLButtonElement>('[data-modernize]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const ok = this.state?.modernizeProducer(def.id)
      if (ok) {
        refToast(`🔧 ${def.name} modernize edildi`, 'ok')
        const newCard = this.buildOneProducerCard(def, this.state!)
        card.replaceWith(newCard)
        this.producerCards.set(def.id, newCard)
      } else {
        refToast('Modernize edilemedi', 'err')
      }
    })

    return card
  }

  private cardSignature(def: { id: string }, s: GameState): string {
    const owned    = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def as Parameters<typeof isProducerUnlocked>[0], s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const cost     = s.producerCostFor(def as Parameters<typeof s.producerCostFor>[0], owned, 1)
    const canBuy   = unlocked && s.money >= cost
    const income   = owned > 0 ? Math.round(s.producerIncome(def as Parameters<typeof s.producerIncome>[0])) : 0
    const mgr      = hasManager(s.managers, def.id) ? 1 : 0
    const mod      = s.producerModernized[def.id] ? 1 : 0
    return `${owned}|${unlocked ? 1 : 0}|${canBuy ? 1 : 0}|${cost}|${income}|${mgr}|${mod}|${this.buyMode}`
  }

  /** İmza tabanlı diff — yalnız durumu değişen kartı yeniden çizer. */
  private refreshProducerCards(): void {
    if (!this.state || !this.producerCardsContainer) return
    const s = this.state
    for (const def of NORMAL_PRODUCERS) {
      const existing = this.producerCards.get(def.id)
      if (!existing) continue
      const sig = this.cardSignature(def, s)
      if (sig === this.cardSignatures.get(def.id)) continue
      this.cardSignatures.set(def.id, sig)
      const newCard = this.buildOneProducerCard(def, s)
      existing.replaceWith(newCard)
      this.producerCards.set(def.id, newCard)
    }
    this.updateSummary()
  }

  private updateSummary(): void {
    if (!this.summaryEl || !this.state) return
    const s = this.state
    const ownedTypes = NORMAL_PRODUCERS.filter(p => (s.producers[p.id] ?? 0) > 0).length
    const html = `
      <span class="ref-summary-count">${NORMAL_PRODUCERS.length} işletme türü · ${ownedTypes} sahip</span>
      <span class="ref-summary-total">Nakit: ${fmtMoney(Math.round(s.money))}</span>
    `
    if (html === this.lastSummaryHtml) return
    this.lastSummaryHtml = html
    this.summaryEl.innerHTML = html
  }

  // ── Mock (saf önizleme, state yok) ───────────────────────────────────
  private buildMockSection(): HTMLElement {
    const wrap = document.createElement('div')
    const data = (this.firms && this.firms.length) ? this.firms : MOCK_FIRMS

    const note = document.createElement('div')
    note.className = 'ref-preview-note ref-firms-note'
    note.textContent = '🔒 Önizleme modu · gerçek oyun verisi yok (mock)'
    wrap.appendChild(note)

    wrap.appendChild(this.buildCatTabs())

    const summary = document.createElement('div')
    summary.className = 'ref-summary-strip'
    const totalIncome = data.reduce((a, f) => a + f.income, 0)
    summary.innerHTML = `
      <span class="ref-summary-count">${data.length} firma gösteriliyor</span>
      <span class="ref-summary-total">Toplam: ${fmtMoney(totalIncome)} / Gün</span>`
    wrap.appendChild(summary)

    this.cardsContainer = document.createElement('div')
    this.cardsContainer.className = 'ref-cards-list'
    wrap.appendChild(this.cardsContainer)

    for (const firm of data) {
      const card = new RefCard(firm)
      this.cardEls.set(firm.id, card)
      card.el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.ref-btn, .ref-firm-menu')) return
        this.onOpenFirm?.(firm)
      })
      this.cardsContainer.appendChild(card.el)
    }
    return wrap
  }

  private buildCatTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-cat-tabs'
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button')
      btn.className = 'ref-cat-tab' + (cat.id === 'tumu' ? ' active' : '')
      btn.innerHTML = cat.icon ? `<span class="tab-ico">${cat.icon}</span>${cat.label}` : cat.label
      btn.addEventListener('click', () => this.setCategory(cat.id))
      this.catBtns.set(cat.id, btn)
      wrap.appendChild(btn)
    }
    return wrap
  }

  private setCategory(id: CategoryKey): void {
    this.activeCategory = id
    this.catBtns.forEach((btn, key) => btn.classList.toggle('active', key === id))
    for (const [, card] of this.cardEls) {
      const match = this.activeCategory === 'tumu' || card.data.sector === this.activeCategory
      card.el.style.display = match ? '' : 'none'
    }
  }

  // ── İmparatorluk Yatırımları (canlı — Büyüt aktif) ───────────────────
  private buildEmpireSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-empire-inv'

    const note = document.createElement('div')
    note.className = 'ref-preview-note' + (this.state ? ' live-mode' : '')
    note.textContent = this.state
      ? '👑 İmparatorluk yatırımları · gerçek veri · Büyüt aktif'
      : '🔒 Önizleme modu · gerçek oyun verisi yok (mock)'
    wrap.appendChild(note)

    const tabBar = document.createElement('div')
    tabBar.className = 'ref-empire-tabs'
    const content = document.createElement('div')
    content.className = 'ref-empire-inv-content'
    this.empireContent = content
    for (const tab of EMPIRE_TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-empire-tab' + (tab.id === this.activeEmpireTab ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchEmpireTab(tab.id, tabBar, content))
      tabBar.appendChild(btn)
    }
    wrap.appendChild(tabBar)
    wrap.appendChild(content)
    this.renderEmpireTab(this.activeEmpireTab, content)
    return wrap
  }

  private switchEmpireTab(id: EmpireTab, tabBar: HTMLElement, content: HTMLElement): void {
    this.activeEmpireTab = id
    tabBar.querySelectorAll<HTMLButtonElement>('.ref-empire-tab').forEach((btn, i) => {
      btn.classList.toggle('active', EMPIRE_TABS[i]?.id === id)
    })
    this.renderEmpireTab(id, content)
  }

  private empireTabSig(id: EmpireTab, s: GameState): string {
    return PRODUCERS.filter(EMPIRE_PRODUCER_FILTER[id])
      .map(def => this.cardSignature(def, s))
      .join(';')
  }

  private renderEmpireTab(id: EmpireTab, content: HTMLElement): void {
    const list = PRODUCERS.filter(EMPIRE_PRODUCER_FILTER[id]).sort((a, b) => a.tier - b.tier || a.unlockAt - b.unlockAt)
    content.innerHTML = ''
    this.lastEmpireSig = this.state ? this.empireTabSig(id, this.state) : ''
    if (!list.length) {
      content.innerHTML = '<div class="ref-empire-empty">Bu kategoride içerik yok.</div>'
      return
    }
    const grid = document.createElement('div')
    grid.className = 'ref-empire-cards'
    const s = this.state
    for (const def of list) {
      const owned    = s ? (s.producers[def.id] ?? 0) : 0
      const unlocked = s ? isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount) : false
      const cost     = s ? s.producerCostFor(def, owned, 1) : def.baseCost
      const canBuy   = !!s && unlocked && s.money >= cost
      const income   = s && owned > 0 ? Math.round(s.producerIncome(def)) : Math.round(def.baseIncome)

      let foot: string
      if (!s) {
        foot = `<button class="ref-prod-btn disabled" type="button" disabled>${fmtMoney(def.baseCost)} · önizleme</button>`
      } else if (!unlocked) {
        const reason = (def.ipoRequirement && s.ipoCount < def.ipoRequirement)
          ? `🔒 ${def.ipoRequirement} IPO gerekli`
          : `🔒 ${fmtMoney(def.unlockAt)} kazanınca`
        foot = `<span class="ref-prod-locked-lbl">${reason}</span>`
      } else if (canBuy) {
        foot = `<button class="ref-prod-btn buyable" type="button" data-buy="${def.id}">${owned > 0 ? '📈 BÜYÜT' : 'SATIN AL'} · ${fmtMoney(cost)}</button>`
      } else {
        foot = `<button class="ref-prod-btn disabled" type="button" disabled>Para Yetersiz · ${fmtMoney(cost)}</button>`
      }

      const card = document.createElement('div')
      card.className = 'ref-empire-card' + (owned > 0 ? ' owned' : '') + (s && !unlocked ? ' locked' : '')
      card.innerHTML = `
        <div class="ref-empire-card__head">
          <span class="ref-empire-card__emoji">${def.emoji}</span>
          <div class="ref-empire-card__info">
            <div class="ref-empire-card__name">${def.name}</div>
            <div class="ref-empire-card__tier">Tier ${def.tier} · ${owned > 0 ? `<b>${owned} adet · ${fmtMoney(income)}/g</b>` : 'Sahip değilsin'}</div>
          </div>
          ${owned > 0 ? '<span class="ref-empire-card__badge">✓</span>' : ''}
        </div>
        <div class="ref-empire-card__foot">${foot}</div>`

      card.querySelector<HTMLButtonElement>('[data-buy]')?.addEventListener('click', () => {
        const ok = this.state?.buyProducer(def.id, 1)
        if (ok) refToast(`${def.emoji} ${def.name} büyütüldü`, 'ok')
        else refToast('Satın alınamadı', 'err')
      })
      grid.appendChild(card)
    }
    content.appendChild(grid)
  }

  /** Aktif imparatorluk sekmesini imza değiştiyse yeniden çiz. */
  private refreshEmpireSection(): void {
    if (!this.state || !this.empireContent) return
    const sig = this.empireTabSig(this.activeEmpireTab, this.state)
    if (sig === this.lastEmpireSig) return
    this.renderEmpireTab(this.activeEmpireTab, this.empireContent)
  }

  private liveKpiItems(s: GameState): KpiItem[] {
    const legalIncome   = Math.round(s.legalIncomePerDay())
    const illegalIncome = Math.round(s.illegalIncomePerDay())
    const ownedNormal   = NORMAL_PRODUCERS.filter(p => (s.producers[p.id] ?? 0) > 0).length
    return [
      { icon: '🏪', label: 'İşletme Türü',   value: String(NORMAL_PRODUCERS.length), sub: `${ownedNormal} sahip`, subDir: 'muted' },
      { icon: '📈', label: 'Yasal Gelir',    value: fmtMoney(legalIncome), sub: 'Günlük', subDir: 'up' },
      { icon: '💰', label: 'Yasadışı Gelir', value: illegalIncome > 0 ? fmtMoney(illegalIncome) : 'Yok', sub: 'Günlük', subDir: 'muted' },
      { icon: '💵', label: 'Nakit',          value: fmtMoney(Math.round(s.money)), sub: 'Likit', subDir: 'muted' },
    ]
  }

  private updateKpi(): void {
    if (this.kpiStrip && this.state) this.kpiStrip.update(this.liveKpiItems(this.state))
  }

  /** RefApp tek aboneliğinden çağrılır: KPI + kart durumlarını canlı tazeler (DOM yeniden kurmadan). */
  refresh(state: GameState): void {
    this.state = state
    this.updateKpi()
    this.refreshProducerCards()
    this.refreshEmpireSection()
  }
}
