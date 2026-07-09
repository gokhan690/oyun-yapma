import { RefKpiStrip, type KpiItem }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import { fmtMoney, refToast } from './refShared'
import { i18n, fmt, requiredDomainText } from '../../i18n'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, isProducerUnlocked, producerName, producerDesc, type ProducerDef } from '../../game/Economy'
import { FIRM_MAX_LEVEL, firmLevelIncomeMult, isFirmMaxLevel } from '../../game/FirmLevels'
import { hasManager } from '../../game/Managers'
import { namedManagerDef, managerDisplayName } from '../../game/NamedManagers'
import { modernizeCost } from '../../game/TechObsolescence'
import type { FirmEconomyBreakdown, InvestmentLabel } from '../../game/CompanyEconomy'

/* ── Mock data (gerçek veri/state yoksa saf önizleme) ──────────────────── */
const MOCK_FIRMS: FirmData[] = [
  { id: 'firin_1', name: 'Karahan Fırınları', slogan: 'Taze her gün', category: 'bakery', sector: 'gida', emoji: '🥖', level: 7, stars: 4, status: 'buyuyor', income: 580_000, expense: 210_000, growth: 12.1, city: 'Ankara', performance: 76 },
  { id: 'firin_2', name: 'Altın Ekmek', category: 'bakery', sector: 'gida', emoji: '🥖', level: 5, stars: 3, status: 'karli', income: 410_000, expense: 160_000, growth: 9.4, city: 'Konya', performance: 71 },
  { id: 'kahve_1', name: 'Mavi Çekirdek', category: 'coffee', sector: 'gida', emoji: '☕', level: 8, stars: 5, status: 'karli', income: 1_120_000, expense: 340_000, growth: 9.7, city: 'İzmir', performance: 84 },
  { id: 'berber_1', name: 'Beyoğlu Berber', category: 'barber', sector: 'hizmet', emoji: '💈', level: 6, stars: 4, status: 'karli', income: 320_000, expense: 120_000, growth: 8.3, city: 'İstanbul', performance: 82 },
  { id: 'eticaret_1', name: 'TrendAl', category: 'ecommerce', sector: 'teknoloji', emoji: '🛒', level: 6, stars: 4, status: 'buyuyor', income: 890_000, expense: 260_000, growth: 15.2, city: 'İstanbul', performance: 88 },
  { id: 'yazilim_1', name: 'Piksel Stüdyo', category: 'software', sector: 'teknoloji', emoji: '💻', level: 5, stars: 3, status: 'karli', income: 760_000, expense: 190_000, growth: 11.4, city: 'Bursa', performance: 63 },
  { id: 'lojistik_1', name: 'Hızlı Kargo', category: 'logistics', sector: 'hizmet', emoji: '🚚', level: 4, stars: 2, status: 'riskli', income: 1_050_000, expense: 180_000, growth: 7.6, city: 'Mersin', performance: 48, riskLevel: 65 },
]

/* ── Kategori ayrımı: İmparatorluk yatırımları normal listeden ayrılır ──── */
const EMPIRE_PRODUCER_IDS = new Set(
  PRODUCERS
    .filter(p => p.category === 'sport' || p.category === 'politics' || p.category === 'dark' || p.category === 'luxury' || p.illegal)
    .map(p => p.id)
)
const NORMAL_PRODUCERS = PRODUCERS.filter(p => !EMPIRE_PRODUCER_IDS.has(p.id))

/* ── B3: Firma sıralaması — yalnız görüntü sırası, PRODUCERS/state mutate edilmez ── */
const FIRM_SORT_STORAGE_KEY = 'tur15b_firm_sort'
const SORT_MODES = ['tier_asc', 'price_asc', 'price_desc', 'net_desc', 'payback_asc', 'affordable_first'] as const
type SortMode = typeof SORT_MODES[number]
const PRODUCERS_INDEX = new Map(PRODUCERS.map((p, i) => [p.id, i]))
/** Deterministik tie-break: 1) tier artan, 2) orijinal PRODUCERS dizisindeki index. */
function tieBreak(a: ProducerDef, b: ProducerDef): number {
  return (a.tier - b.tier) || ((PRODUCERS_INDEX.get(a.id) ?? 0) - (PRODUCERS_INDEX.get(b.id) ?? 0))
}

/* ── Önizleme kategori filtreleri (mock mod) ───────────────────────────── */
type CategoryKey = 'tumu' | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya' | 'illegal'
const CATEGORIES: { id: CategoryKey; labelKey: string; icon: string }[] = [
  { id: 'tumu', labelKey: 'firms_cat_tumu', icon: '' },
  { id: 'gida', labelKey: 'firms_cat_gida', icon: '🍔' },
  { id: 'hizmet', labelKey: 'firms_cat_hizmet', icon: '🤝' },
  { id: 'teknoloji', labelKey: 'firms_cat_teknoloji', icon: '🚀' },
  { id: 'finans', labelKey: 'firms_cat_finans', icon: '💰' },
  { id: 'turizm', labelKey: 'firms_cat_turizm', icon: '✈️' },
  { id: 'medya', labelKey: 'firms_cat_medya', icon: '🎬' },
  { id: 'illegal', labelKey: 'firms_cat_illegal', icon: '🚫' },
]

/* ── İmparatorluk alt sekmeleri ──────────────────────────────────────── */
type EmpireTab = 'futbol' | 'siyaset' | 'yeralti' | 'luks' | 'bilim' | 'finans'
const EMPIRE_TABS: { id: EmpireTab; labelKey: string; icon: string }[] = [
  { id: 'futbol', labelKey: 'firms_empire_tab_futbol', icon: '⚽' },
  { id: 'siyaset', labelKey: 'firms_empire_tab_siyaset', icon: '🏛️' },
  { id: 'yeralti', labelKey: 'firms_empire_tab_yeralti', icon: '🔥' },
  { id: 'luks', labelKey: 'firms_empire_tab_luks', icon: '💎' },
  { id: 'bilim', labelKey: 'firms_empire_tab_bilim', icon: '🔬' },
  { id: 'finans', labelKey: 'firms_empire_tab_finans', icon: '📊' },
]
const EMPIRE_PRODUCER_FILTER: Record<EmpireTab, (p: ProducerDef) => boolean> = {
  futbol:  p => p.category === 'sport',
  siyaset: p => p.category === 'politics',
  yeralti: p => p.category === 'dark' || (!!p.illegal && p.category !== 'sport' && p.category !== 'politics' && p.category !== 'luxury' && p.category !== 'science' && p.category !== 'finance'),
  luks:    p => p.category === 'luxury',
  bilim:   p => p.category === 'science',
  finans:  p => p.category === 'finance',
}

const CAT_LABEL_META: Partial<Record<string, { emoji: string; key: string }>> = {
  sport:    { emoji: '⚽', key: 'firms_empire_tab_futbol' },
  politics: { emoji: '🏛️', key: 'firms_empire_tab_siyaset' },
  dark:     { emoji: '🔥', key: 'firms_empire_tab_yeralti' },
  luxury:   { emoji: '💎', key: 'firms_empire_tab_luks' },
  science:  { emoji: '🔬', key: 'firms_empire_tab_bilim' },
  finance:  { emoji: '📊', key: 'firms_empire_tab_finans' },
}
/** Producer kategori → görünür çip etiketi (render-time i18n). */
function catLabel(category: string): string {
  const meta = CAT_LABEL_META[category]
  return meta ? `${meta.emoji} ${requiredDomainText(meta.key)}` : ''
}

type MainTab = 'normal' | 'empire'

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_firms_title') }

  onOpenFirm?: (firm: FirmData, live?: { state: GameState; producerId: string; rebuild?: () => FirmData; initialPanel?: 'manager' }) => void

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
  private lockBannerEl?: HTMLElement
  private lastSummaryHtml = ''
  private kpiStrip?: RefKpiStrip

  // Tur 2: Buy mode + tier filter
  private buyMode: 1 | 10 | 100 | 'max' = 1
  private tierFilter: 'tumu' | 'small' | 'medium' | 'large' = 'tumu'
  private buyModeRow?: HTMLElement
  private tierFilterRow?: HTMLElement

  // Tur 3 (B3): sıralama + gerçek ekonomi snapshot'ı (kart başına değil, refresh başına 1 kez)
  private sortMode: SortMode = 'tier_asc'
  private sortRow?: HTMLElement
  private economyMap = new Map<string, FirmEconomyBreakdown>()

  private firms?: FirmData[]
  private state?: GameState

  constructor(firms?: FirmData[], _hasRealData = false, state?: GameState) {
    this.firms = firms
    this.state = state
    this.loadSortMode()

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
      { icon: '🏢', label: i18n.t('firms_kpi_active_firm'), value: String(data.length), sub: i18n.t('firms_kpi_total_sub'), subDir: 'muted' },
      { icon: '📈', label: i18n.t('firms_kpi_income_label'), value: fmtMoney(totalIncome), sub: i18n.t('firms_kpi_income_sub'), subDir: 'up' },
      { icon: '💰', label: i18n.t('firms_kpi_illegal_income'), value: i18n.t('ref_life_none'), sub: i18n.t('firms_kpi_daily_sub'), subDir: 'muted' },
      { icon: '⚙️', label: i18n.t('firms_kpi_efficiency'), value: `${avgPerf}%`, sub: i18n.t('firms_kpi_efficiency_sub'), subDir: 'muted' },
    ]).el
  }

  // ── Ana sekmeler ─────────────────────────────────────────────────────
  private buildMainTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-main-tabs'
    const tabs: { id: MainTab; label: string; icon: string }[] = [
      { id: 'normal', label: i18n.t('ref_firms_tab_normal'), icon: '🏪' },
      { id: 'empire', label: i18n.t('ref_firms_tab_empire'), icon: '👑' },
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
      <span class="ref-buy-mode-lbl">${i18n.t('firms_qty_label')}</span>
      <button class="ref-buy-mode-btn active" data-buy-mode="1">1×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="10">10×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="100">100×</button>
      <button class="ref-buy-mode-btn" data-buy-mode="max">${i18n.t('firms_buy_max')}</button>`
    wrap.appendChild(this.buyModeRow)

    // Tier filter
    this.tierFilterRow = document.createElement('div')
    this.tierFilterRow.className = 'ref-tier-filter-row'
    this.tierFilterRow.innerHTML = `
      <button class="ref-tier-btn active" data-tier-filter="tumu">${i18n.t('firms_tier_all')}</button>
      <button class="ref-tier-btn" data-tier-filter="small">T1–3</button>
      <button class="ref-tier-btn" data-tier-filter="medium">T4–6</button>
      <button class="ref-tier-btn" data-tier-filter="large">T7+</button>`
    wrap.appendChild(this.tierFilterRow)

    // Tur 3 (B3): sıralama çip satırı
    this.sortRow = document.createElement('div')
    this.sortRow.className = 'ref-sort-row'
    this.sortRow.innerHTML = `
      <span class="ref-sort-lbl">${i18n.t('firms_sort_label')}</span>
      <div class="ref-sort-scroll">${this.buildSortRowHtml()}</div>`
    wrap.appendChild(this.sortRow)

    // Erken oyun firma-alımı kilidi ilerleme bandı (kilitliyken görünür)
    this.lockBannerEl = document.createElement('div')
    this.lockBannerEl.className = 'ref-firms-lock-banner'
    wrap.appendChild(this.lockBannerEl)
    this.updateLockBanner()

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
        return
      }
      const sortBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-sort]')
      if (sortBtn) {
        const mode = sortBtn.dataset.sort as SortMode
        this.sortMode = mode
        localStorage.setItem(FIRM_SORT_STORAGE_KEY, mode)
        this.sortRow?.querySelectorAll('.ref-sort-btn').forEach(b => {
          b.classList.toggle('active', (b as HTMLElement).dataset.sort === mode)
        })
        this.buildProducerCards()  // rebuild in new order
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
    // TUR15-B3: snapshot BİR KEZ alınır (138 kart için 138 çağrı değil).
    const snapshot = s.companyEconomySnapshot()
    this.economyMap = new Map(snapshot.firmBreakdowns.map(b => [b.producerId, b]))
    const sorted = this.sortedProducers(s)
    for (const def of sorted) {
      const card = this.buildOneProducerCard(def, s, this.economyMap.get(def.id))
      this.producerCards.set(def.id, card)
      this.producerCardsContainer.appendChild(card)
    }
  }

  /** localStorage'daki sıralama tercihini okur; geçersiz/eski değer → tier_asc. Save şemasına dokunmaz. */
  private loadSortMode(): void {
    const raw = localStorage.getItem(FIRM_SORT_STORAGE_KEY)
    this.sortMode = (raw && (SORT_MODES as readonly string[]).includes(raw)) ? (raw as SortMode) : 'tier_asc'
  }

  private buildSortRowHtml(): string {
    const options: { id: SortMode; key: string }[] = [
      { id: 'tier_asc', key: 'firms_sort_tier' },
      { id: 'price_asc', key: 'firms_sort_price_asc' },
      { id: 'price_desc', key: 'firms_sort_price_desc' },
      { id: 'net_desc', key: 'firms_sort_net_desc' },
      { id: 'payback_asc', key: 'firms_sort_payback_asc' },
      { id: 'affordable_first', key: 'firms_sort_affordable_first' },
    ]
    return options.map(o =>
      `<button class="ref-sort-btn${o.id === this.sortMode ? ' active' : ''}" data-sort="${o.id}">${requiredDomainText(o.key)}</button>`,
    ).join('')
  }

  /**
   * TUR15-B3 — Yalnız görüntü sırası: her zaman [...NORMAL_PRODUCERS] KOPYASI üzerinde
   * sıralanır; NORMAL_PRODUCERS/PRODUCERS/save state hiç mutate edilmez. Ekonomi alanları
   * (fiyat/net/payback/affordable) `this.economyMap`'teki (tek seferlik snapshot'tan
   * türetilmiş) `FirmEconomyBreakdown`'dan okunur — formül burada tekrarlanmaz.
   */
  private sortedProducers(s: GameState): ProducerDef[] {
    const list = [...NORMAL_PRODUCERS]
    const bd = (id: string) => this.economyMap.get(id)
    switch (this.sortMode) {
      case 'price_asc':
        list.sort((a, b) =>
          (s.producerCostFor(a, s.producers[a.id] ?? 0, 1) - s.producerCostFor(b, s.producers[b.id] ?? 0, 1)) || tieBreak(a, b),
        )
        break
      case 'price_desc':
        list.sort((a, b) =>
          (s.producerCostFor(b, s.producers[b.id] ?? 0, 1) - s.producerCostFor(a, s.producers[a.id] ?? 0, 1)) || tieBreak(a, b),
        )
        break
      case 'net_desc':
        list.sort((a, b) => {
          const na = bd(a.id)?.netProfit ?? 0
          const nb = bd(b.id)?.netProfit ?? 0
          const pa = na > 0 ? 1 : 0
          const pb = nb > 0 ? 1 : 0
          if (pa !== pb) return pb - pa // pozitif net kâr önce
          if (nb !== na) return nb - na
          return tieBreak(a, b)
        })
        break
      case 'payback_asc':
        list.sort((a, b) => {
          const pa = bd(a.id)?.paybackDays ?? null
          const pb = bd(b.id)?.paybackDays ?? null
          if (pa === null && pb === null) return tieBreak(a, b)
          if (pa === null) return 1 // null sona
          if (pb === null) return -1
          if (pa !== pb) return pa - pb
          return tieBreak(a, b)
        })
        break
      case 'affordable_first':
        list.sort((a, b) => {
          const bucketOf = (br?: FirmEconomyBreakdown): number => {
            if (!br || !br.unlocked) return 2 // kilitli sona
            if (br.owned === 0 && br.affordability) return 0 // alınabilir önce
            return 1 // sahipli / kilitsiz ama alınamaz
          }
          const diff = bucketOf(bd(a.id)) - bucketOf(bd(b.id))
          return diff !== 0 ? diff : tieBreak(a, b)
        })
        break
      case 'tier_asc':
      default:
        list.sort(tieBreak)
        break
    }
    return list
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
      name: producerName(def),
      slogan: producerDesc(def),
      category: cat,
      emoji: def.emoji,
      level: lv,
      stars: Math.min(5, Math.max(1, lv)),
      maxStars: FIRM_MAX_LEVEL,
      status: owned > 0 ? 'karli' : 'buyuyor',
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

  private buildOneProducerCard(def: ProducerDef, s: GameState, breakdown?: FirmEconomyBreakdown): HTMLElement {
    const owned    = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const purchaseLocked = !s.firmsPurchaseUnlocked()
    const qty      = this.getQty(def, s)
    const cost     = s.producerCostFor(def, owned, Math.max(1, qty))
    const canBuy   = unlocked && !purchaseLocked && qty > 0 && s.money >= cost

    // TEK GELİR KAYNAĞI: tüm gelir gösterimleri gerçek producerIncome pipeline'ından türetilir.
    const unitIncome  = Math.round(s.producerUnitIncome(def))
    const totalIncome = Math.round(s.producerIncome(def))
    const buyDelta    = Math.round(s.producerIncomeBuyDelta(def, Math.max(1, qty)))

    const firmLv   = owned > 0 ? (s.producerLevel ? s.producerLevel(def.id) : 1) : 0
    const lv       = s.firmLevelUpStatus(def)
    const canLevelUp = lv.canLevelUp

    const assignedManagerId = owned > 0 ? s.firmAssignedManager(def.id) : null
    const assignedManagerDef = assignedManagerId ? namedManagerDef(assignedManagerId) : undefined
    const genericManagerHired = hasManager(s.managers, def.id)

    const isModernized = !!s.producerModernized[def.id]
    const modCost      = owned > 0 && !isModernized && s.ipoCount > 0 ? modernizeCost(def, owned) : 0
    const canModernize = owned > 0 && !isModernized && s.ipoCount > 0 && s.money >= modCost && modCost > 0

    let stateClass: string
    if (!unlocked && def.ipoRequirement && s.ipoCount < def.ipoRequirement) stateClass = 'locked'
    else if (!unlocked) stateClass = 'locked'
    else if (owned > 0) stateClass = canBuy ? 'owned' : 'owned no-cash'
    else if (canBuy) stateClass = 'available'
    else stateClass = 'no-cash'

    const card = document.createElement('div')
    card.className = `ref-prod-card ${stateClass}`
    card.dataset.id = def.id
    card.dataset.tier = String(def.tier)

    let footRight: string
    if (!unlocked) {
      const reason = (def.ipoRequirement && s.ipoCount < def.ipoRequirement)
        ? `🔒 ${fmt('firms_lock_ipo_fmt', { n: String(def.ipoRequirement) })}`
        : `🔒 ${fmt('firms_lock_earn_fmt', { amount: fmtMoney(def.unlockAt) })}`
      footRight = `<span class="ref-prod-locked-lbl">${reason}</span>`
    } else if (purchaseLocked && owned === 0) {
      footRight = `<button class="ref-prod-btn disabled" type="button" disabled title="${i18n.t('firms_lock_banner_need_job')}">🔒 ${i18n.t('firms_lock_btn')}</button>`
    } else if (canBuy) {
      const qtyLbl = this.buyMode === 'max' ? `Max(${qty})×` : `+${qty}×`
      footRight = `<button class="ref-prod-btn buyable" type="button">${owned > 0 ? qtyLbl : i18n.t('firms_buy_button')} · ${fmtMoney(cost)}</button>`
    } else {
      const cost1 = s.producerCostFor(def, owned, 1)
      footRight = `<button class="ref-prod-btn disabled" type="button" disabled>${i18n.t('firms_insufficient')} · ${fmtMoney(cost1)}</button>`
    }

    const lvPips = owned > 0
      ? `<div class="ref-prod-lvl-pips">${Array.from({ length: FIRM_MAX_LEVEL }, (_, i) =>
          `<span class="ref-prod-lvl-pip${i < firmLv ? ' on' : ''}"></span>`).join('')}</div>`
      : ''

    const lvBadge = owned > 0
      ? `<span class="ref-prod-lv-badge${isFirmMaxLevel(firmLv) ? ' ref-prod-lv-badge--max' : ''}">Lv.${firmLv}</span>`
      : ''

    const incomeMult = owned > 0 && firmLv > 1 ? `<small class="ref-prod-lv-mult">${fmt('firms_income_mult_fmt', { mult: firmLevelIncomeMult(firmLv).toFixed(2) })}</small>` : ''

    const lvPreview = lv.atMax
      ? i18n.t('firms_upgrade_max')
      : `${fmt('firms_levelup_arrow_fmt', { from: String(lv.level), to: String(lv.nextLevel) })} · ${fmtMoney(lv.currentIncome)}→${fmtMoney(lv.nextIncome)} · ${fmt('firms_levelup_income_pct_fmt', { pct: String(lv.incomePct) })} · ${i18n.t('firms_stat_cost')}: ${fmtMoney(lv.cost)}`
    const lvBtn = owned > 0
      ? `<button class="ref-prod-lvl-btn${canLevelUp ? ' ref-prod-lvl-btn--active' : ''}" type="button" data-levelup="${def.id}" ${canLevelUp ? '' : 'disabled'} title="${lvPreview}">
          ⬆️ ${i18n.t('firms_upgrade_button')} ${lv.atMax ? `(${i18n.t('firms_upgrade_max')})` : `· Lv.${lv.nextLevel} · ${fmtMoney(lv.cost)}`}
        </button>`
      : ''

    const manLabel = assignedManagerDef
      ? `${assignedManagerDef.emoji} ${managerDisplayName(assignedManagerDef)} - ${i18n.t('firms_manager_owned')}`
      : genericManagerHired
        ? `${i18n.t('ref_mgr_generic_name')} - ${i18n.t('firms_manager_owned')}`
        : i18n.t('firms_manager_button')
    const manBtn = owned > 0
      ? `<button class="ref-prod-action-btn manager" type="button" data-manager-panel="${def.id}">${manLabel}</button>`
      : ''

    const modBtn = owned > 0 && s.ipoCount > 0 && !isModernized
      ? `<button class="ref-prod-action-btn modernize${canModernize ? '' : ' disabled'}" type="button" data-modernize="${def.id}" ${canModernize ? '' : 'disabled'}>
           🔧 ${i18n.t('firms_modernize_button')} · ${fmtMoney(modCost)}
         </button>`
      : owned > 0 && isModernized
        ? `<span class="ref-prod-badge-ok">✓ ${i18n.t('firms_modern_owned')}</span>`
        : ''

    card.innerHTML = `
      <div class="ref-prod-card__head">
        <span class="ref-prod-emoji">${def.emoji}</span>
        <div class="ref-prod-info">
          <div class="ref-prod-name">${producerName(def)}${owned > 0 ? `<span class="ref-prod-owned-badge">×${owned}</span>` : ''}${lvBadge}</div>
          <div class="ref-prod-desc">${producerDesc(def)}${incomeMult}</div>
        </div>
      </div>
      ${lvPips}
      <div class="ref-prod-stats">
        <span class="ref-prod-stat"><small>${i18n.t('firms_stat_tier')}</small><b>T${def.tier}</b></span>
        ${owned > 0
          ? `<span class="ref-prod-stat"><small>${i18n.t('firms_stat_total_income')}</small><b class="inc">${fmtMoney(totalIncome)}</b></span>
             <span class="ref-prod-stat"><small>${i18n.t('firms_stat_unit_income')}</small><b>${fmtMoney(unitIncome)}</b></span>
             <span class="ref-prod-stat"><small>${i18n.t('firms_stat_count')}</small><b>${owned}</b></span>`
          : `<span class="ref-prod-stat"><small>${i18n.t('firms_one_unit_income')}</small><b class="inc">${fmtMoney(unitIncome)}</b></span>
             <span class="ref-prod-stat"><small>${i18n.t('firms_stat_cost')}</small><b>${fmtMoney(s.producerCostFor(def, owned, 1))}</b></span>`}
      </div>
      <div class="ref-prod-econ-line">${unlocked ? this.economyLineHtml(owned, breakdown) : ''}</div>
      <div class="ref-prod-labels">${unlocked ? this.labelsHtml(breakdown) : ''}</div>
      ${owned === 0 && canBuy ? `<div class="ref-prod-buy-gain">${fmt('firms_buy_gain_fmt', { amount: fmtMoney(buyDelta) })}${this.buyMode !== 1 ? ` (${qty}×)` : ''}</div>` : ''}
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
          this.onOpenFirm?.(this.producerToFirmData(def, s2), {
            state: s2,
            producerId: def.id,
            rebuild: () => this.producerToFirmData(def, s2),
          })
        })
      }
    }

    card.querySelector<HTMLButtonElement>('.ref-prod-btn.buyable')?.addEventListener('click', () => {
      const buyQty = this.getQty(def, this.state!)
      const ok = this.state?.buyProducer(def.id, Math.max(1, buyQty))
      if (ok) refToast(`${def.emoji} ${fmt('firms_toast_bought_fmt', { name: producerName(def), qty: String(buyQty) })}`, 'ok')
      else refToast(i18n.t('firms_toast_buy_failed'), 'err')
    })

    card.querySelector<HTMLButtonElement>('[data-levelup]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const ok = this.state?.levelUpFirm(def.id)
      if (ok) {
        refToast(`⬆️ ${def.emoji} ${fmt('firms_toast_levelup_fmt', { name: producerName(def), level: String(this.state!.producerLevel(def.id)) })}`, 'ok')
        const newCard = this.buildOneProducerCard(def, this.state!, this.freshBreakdownFor(def.id, this.state!))
        card.replaceWith(newCard)
        this.producerCards.set(def.id, newCard)
        this.updateSummary()
      } else {
        const r = this.state?.firmLevelUpStatus(def).reason
        const msg = r === 'insufficient' ? i18n.t('firms_insufficient')
          : r === 'max' ? i18n.t('firms_upgrade_max')
          : r === 'not_owned' ? i18n.t('firms_levelup_reason_not_owned')
          : i18n.t('firms_toast_levelup_failed')
        refToast(msg, 'err')
      }
    })

    card.querySelector<HTMLButtonElement>('[data-manager-panel]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const s2 = this.state
      if (!s2) return
      this.onOpenFirm?.(this.producerToFirmData(def, s2), {
        state: s2,
        producerId: def.id,
        rebuild: () => this.producerToFirmData(def, s2),
        initialPanel: 'manager',
      })
    })

    card.querySelector<HTMLButtonElement>('[data-modernize]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const ok = this.state?.modernizeProducer(def.id)
      if (ok) {
        refToast(`🔧 ${fmt('firms_toast_modernized_fmt', { name: producerName(def) })}`, 'ok')
        const newCard = this.buildOneProducerCard(def, this.state!, this.freshBreakdownFor(def.id, this.state!))
        card.replaceWith(newCard)
        this.producerCards.set(def.id, newCard)
      } else {
        refToast(i18n.t('firms_toast_modernize_failed'), 'err')
      }
    })

    return card
  }

  /** Kompakt ekonomi satırı: net kâr/menajer maaşı (owned>0). Geri dönüş/amorti metni kaldırıldı. */
  private economyLineHtml(owned: number, breakdown?: FirmEconomyBreakdown): string {
    const parts: string[] = []
    if (owned > 0) {
      const netProfit = breakdown?.netProfit ?? 0
      const netCls = netProfit > 0 ? 'pos' : netProfit < 0 ? 'neg' : ''
      parts.push(`<span class="ref-prod-econ-item ${netCls}">${i18n.t('eco_net_profit')}: ${fmtMoney(Math.round(netProfit))}</span>`)
      const managerSalary = breakdown?.managerSalary ?? 0
      if (managerSalary > 0) {
        parts.push(`<span class="ref-prod-econ-item neg">${i18n.t('eco_manager_salary')}: -${fmtMoney(Math.round(managerSalary))}</span>`)
      }
    }
    return parts.join('')
  }

  /** Maks. 2 yatırım etiketi — CompanyEconomy.ts'in assignLabels() çıktısı aynen okunur. */
  private labelsHtml(breakdown?: FirmEconomyBreakdown): string {
    const labels = breakdown?.labels ?? []
    if (!labels.length) return ''
    return labels.map(l => `<span class="ref-prod-label-chip ref-prod-label-chip--${l}">${this.labelText(l)}</span>`).join('')
  }

  private labelText(label: InvestmentLabel): string {
    switch (label) {
      case 'fastest_payback': return i18n.t('firm_label_fastest_payback')
      case 'best_net': return i18n.t('firm_label_best_net')
      case 'affordable': return i18n.t('firm_label_affordable')
      case 'long_term': return i18n.t('firm_label_long_term')
      case 'low_reserve': return i18n.t('firm_label_low_reserve')
      case 'inefficient': return i18n.t('firm_label_inefficient')
      case 'risk_manager': return i18n.t('firm_label_risk_manager')
      default: return ''
    }
  }

  /**
   * Tek bir kullanıcı aksiyonu (level-up/modernize) sonrası bu firmanın GÜNCEL
   * breakdown'ını almak için tam snapshot'ı yeniden alır ve `this.economyMap`'i
   * tazeler (sonraki hafif senkronizasyonlar da güncel veriyle çalışsın diye).
   * Kart-başı döngüde KULLANILMAZ — yalnız tekil aksiyon geri bildirimi içindir.
   */
  private freshBreakdownFor(producerId: string, s: GameState): FirmEconomyBreakdown | undefined {
    const snapshot = s.companyEconomySnapshot()
    this.economyMap = new Map(snapshot.firmBreakdowns.map(b => [b.producerId, b]))
    return this.economyMap.get(producerId)
  }

  /** Kart tam yeniden kurulmadan ekonomi satırı + etiketleri günceller (global etiketler için gerekli). */
  private syncEconomyRow(card: HTMLElement, def: ProducerDef, s: GameState, breakdown?: FirmEconomyBreakdown): void {
    const econEl = card.querySelector<HTMLElement>('.ref-prod-econ-line')
    const labelsEl = card.querySelector<HTMLElement>('.ref-prod-labels')
    if (!econEl || !labelsEl) return
    const owned = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
    econEl.innerHTML = unlocked ? this.economyLineHtml(owned, breakdown) : ''
    labelsEl.innerHTML = unlocked ? this.labelsHtml(breakdown) : ''
  }

  private cardSignature(def: { id: string }, s: GameState): string {
    const owned    = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def as Parameters<typeof isProducerUnlocked>[0], s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const cost     = s.producerCostFor(def as Parameters<typeof s.producerCostFor>[0], owned, 1)
    const canBuy   = unlocked && s.money >= cost
    const income   = owned > 0 ? Math.round(s.producerIncome(def as Parameters<typeof s.producerIncome>[0])) : 0
    const mgr      = s.firmAssignedManager(def.id) ?? (hasManager(s.managers, def.id) ? 'generic' : 'none')
    const mod      = s.producerModernized[def.id] ? 1 : 0
    const plock    = s.firmsPurchaseUnlocked() ? 1 : 0
    return `${owned}|${unlocked ? 1 : 0}|${canBuy ? 1 : 0}|${cost}|${income}|${mgr}|${mod}|${this.buyMode}|${plock}`
  }

  /**
   * İmza tabanlı diff — yalnız durumu değişen kartı tam yeniden çizer.
   * TUR15-B3: snapshot burada da BİR KEZ alınır (kart başına değil). `best_net`/
   * `fastest_payback` gibi etiketler TÜM firmalara bağlı olduğundan, imza
   * DEĞİŞMEYEN kartlarda bile ekonomi satırı + etiketler hafifçe (tam kart
   * yeniden kurulmadan) senkronize edilir.
   */
  private refreshProducerCards(): void {
    if (!this.state || !this.producerCardsContainer) return
    const s = this.state
    const snapshot = s.companyEconomySnapshot()
    this.economyMap = new Map(snapshot.firmBreakdowns.map(b => [b.producerId, b]))
    for (const def of NORMAL_PRODUCERS) {
      const existing = this.producerCards.get(def.id)
      if (!existing) continue
      const sig = this.cardSignature(def, s)
      const breakdown = this.economyMap.get(def.id)
      if (sig === this.cardSignatures.get(def.id)) {
        this.syncEconomyRow(existing, def, s, breakdown)
        continue
      }
      this.cardSignatures.set(def.id, sig)
      const newCard = this.buildOneProducerCard(def, s, breakdown)
      existing.replaceWith(newCard)
      this.producerCards.set(def.id, newCard)
    }
    this.updateLockBanner()
    this.updateSummary()
  }

  /** Firma-alımı kilidi ilerleme bandını günceller (kilit kalkınca gizlenir). */
  private updateLockBanner(): void {
    if (!this.lockBannerEl || !this.state) return
    const st = this.state.firmsPurchaseLockStatus()
    if (!st.locked) { this.lockBannerEl.style.display = 'none'; this.lockBannerEl.innerHTML = ''; return }
    this.lockBannerEl.style.display = ''
    this.lockBannerEl.innerHTML = `
      <div class="ref-firms-lock-banner__title">🔒 ${i18n.t('firms_lock_btn')}</div>
      <div class="ref-firms-lock-banner__msg">${i18n.t('firms_lock_banner_need_job')}</div>
      <div class="ref-firms-lock-banner__progress">${fmt('firms_lock_banner_progress_fmt', { actions: String(st.actions), income: fmtMoney(st.income) })}</div>`
  }

  private updateSummary(): void {
    if (!this.summaryEl || !this.state) return
    const s = this.state
    const ownedTypes = NORMAL_PRODUCERS.filter(p => (s.producers[p.id] ?? 0) > 0).length
    const html = `
      <span class="ref-summary-count">${fmt('firms_summary_count_fmt', { total: String(NORMAL_PRODUCERS.length), owned: String(ownedTypes) })}</span>
      <span class="ref-summary-total">${fmt('firms_summary_cash_fmt', { cash: fmtMoney(Math.round(s.money)) })}</span>
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
    note.textContent = `🔒 ${i18n.t('firms_preview_note')}`
    wrap.appendChild(note)

    wrap.appendChild(this.buildCatTabs())

    const summary = document.createElement('div')
    summary.className = 'ref-summary-strip'
    const totalIncome = data.reduce((a, f) => a + f.income, 0)
    summary.innerHTML = `
      <span class="ref-summary-count">${fmt('firms_mock_count_fmt', { count: String(data.length) })}</span>
      <span class="ref-summary-total">${fmt('firms_mock_total_fmt', { total: fmtMoney(totalIncome) })}</span>`
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
      const catLabel = requiredDomainText(cat.labelKey)
      btn.innerHTML = cat.icon ? `<span class="tab-ico">${cat.icon}</span>${catLabel}` : catLabel
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
      ? `👑 ${i18n.t('firms_empire_live_note')}`
      : `🔒 ${i18n.t('firms_preview_note')}`
    wrap.appendChild(note)

    const tabBar = document.createElement('div')
    tabBar.className = 'ref-empire-tabs'
    const content = document.createElement('div')
    content.className = 'ref-empire-inv-content'
    this.empireContent = content
    for (const tab of EMPIRE_TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-empire-tab' + (tab.id === this.activeEmpireTab ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${requiredDomainText(tab.labelKey)}</span>`
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
      content.innerHTML = `<div class="ref-empire-empty">${i18n.t('firms_empire_empty')}</div>`
      return
    }
    const grid = document.createElement('div')
    grid.className = 'ref-empire-cards'
    const s = this.state
    for (const def of list) {
      const owned    = s ? (s.producers[def.id] ?? 0) : 0
      const unlocked = s ? isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount) : false
      const cost     = s ? s.producerCostFor(def, owned, 1) : def.baseCost
      const canBuy   = !!s && unlocked && s.firmsPurchaseUnlocked() && s.money >= cost
      // TEK GELİR KAYNAĞI — owned: gerçek toplam gelir; unowned: tek birim ön izleme.
      const unitIncome  = s ? Math.round(s.producerUnitIncome(def)) : Math.round(def.baseIncome)
      const totalIncome = s && owned > 0 ? Math.round(s.producerIncome(def)) : 0

      let foot: string
      if (!s) {
        foot = `<button class="ref-prod-btn disabled" type="button" disabled>${fmtMoney(def.baseCost)} · ${i18n.t('firms_preview_suffix')}</button>`
      } else if (!unlocked) {
        const reason = (def.ipoRequirement && s.ipoCount < def.ipoRequirement)
          ? `🔒 ${fmt('firms_lock_ipo_fmt', { n: String(def.ipoRequirement) })}`
          : `🔒 ${fmt('firms_lock_earn_fmt', { amount: fmtMoney(def.unlockAt) })}`
        foot = `<span class="ref-prod-locked-lbl">${reason}</span>`
      } else if (canBuy) {
        foot = `<button class="ref-prod-btn buyable" type="button" data-buy="${def.id}">${owned > 0 ? `📈 ${i18n.t('firms_grow_button')}` : i18n.t('firms_buy_button')} · ${fmtMoney(cost)}</button>`
      } else {
        foot = `<button class="ref-prod-btn disabled" type="button" disabled>${i18n.t('firms_insufficient')} · ${fmtMoney(cost)}</button>`
      }

      const card = document.createElement('div')
      card.className = 'ref-empire-card' + (owned > 0 ? ' owned' : '') + (s && !unlocked ? ' locked' : '') + (def.category ? ` ref-empire-card--cat-${def.category}` : '')
      const catChipLabel = def.category ? catLabel(def.category) : ''
      const catChip = catChipLabel
        ? `<span class="ref-empire-cat-chip ref-empire-cat-chip--${def.category}">${catChipLabel}</span>`
        : ''
      card.innerHTML = `
        <div class="ref-empire-card__head">
          <span class="ref-empire-card__emoji">${def.emoji}</span>
          <div class="ref-empire-card__info">
            <div class="ref-empire-card__name">${producerName(def)}${catChip}</div>
            <div class="ref-empire-card__tier">${fmt('firms_empire_tier_fmt', { tier: String(def.tier) })} · ${owned > 0
              ? `<b>${fmt('firms_empire_owned_fmt', { count: String(owned), income: fmtMoney(totalIncome) })}</b>`
              : (s && unlocked ? `${i18n.t('firms_one_unit_income')}: <b>${fmtMoney(unitIncome)}</b>` : i18n.t('firms_empire_not_owned'))}</div>
          </div>
          ${owned > 0 ? '<span class="ref-empire-card__badge">✓</span>' : ''}
        </div>
        <div class="ref-empire-card__foot">${foot}</div>`

      card.querySelector<HTMLButtonElement>('[data-buy]')?.addEventListener('click', () => {
        const ok = this.state?.buyProducer(def.id, 1)
        if (ok) refToast(`${def.emoji} ${fmt('firms_toast_grown_fmt', { name: producerName(def) })}`, 'ok')
        else refToast(i18n.t('firms_toast_buy_failed'), 'err')
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
      { icon: '🏪', label: i18n.t('firms_kpi_biz_type'),   value: String(NORMAL_PRODUCERS.length), sub: fmt('firms_kpi_owned_sub_fmt', { count: String(ownedNormal) }), subDir: 'muted' },
      { icon: '📈', label: i18n.t('firms_kpi_legal_income'),    value: fmtMoney(legalIncome), sub: i18n.t('firms_kpi_daily_sub'), subDir: 'up' },
      { icon: '💰', label: i18n.t('firms_kpi_illegal_income'), value: illegalIncome > 0 ? fmtMoney(illegalIncome) : i18n.t('ref_life_none'), sub: i18n.t('firms_kpi_daily_sub'), subDir: 'muted' },
      { icon: '💵', label: i18n.t('ref_career_cash_label'),          value: fmtMoney(Math.round(s.money)), sub: i18n.t('ref_dash_cash_sub'), subDir: 'muted' },
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
