import { RefKpiStrip }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import { fmtMoney, refToast } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, isProducerUnlocked, type ProducerDef, type UpgradeDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost, researchIsUnlocked, researchPrereqName, type ResearchNode } from '../../game/Research'

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
type EmpireTab = 'spor' | 'siyaset' | 'yeralti' | 'luks' | 'finans'
const EMPIRE_TABS: { id: EmpireTab; label: string; icon: string }[] = [
  { id: 'spor', label: 'Spor', icon: '⚽' },
  { id: 'siyaset', label: 'Siyaset', icon: '🏛️' },
  { id: 'yeralti', label: 'Yeraltı', icon: '🔥' },
  { id: 'luks', label: 'Lüks', icon: '💎' },
  { id: 'finans', label: 'Finans', icon: '📊' },
]
const EMPIRE_PRODUCER_FILTER: Record<EmpireTab, (p: ProducerDef) => boolean> = {
  spor:    p => p.category === 'sport',
  siyaset: p => p.category === 'politics',
  yeralti: p => p.category === 'dark' || (!!p.illegal && p.category !== 'sport' && p.category !== 'politics' && p.category !== 'luxury'),
  luks:    p => p.category === 'luxury',
  finans:  p => p.category === 'finance' || p.category === 'science',
}

type MainTab = 'normal' | 'empire' | 'rnd'

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'FİRMALAR'

  onOpenFirm?: (firm: FirmData) => void

  private activeCategory: CategoryKey = 'tumu'
  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()

  private activeEmpireTab: EmpireTab = 'spor'

  // Canlı producer kartları
  private producerCardsContainer!: HTMLElement
  private producerCards = new Map<string, HTMLElement>()
  private summaryEl?: HTMLElement
  private unsub?: () => void

  private firms?: FirmData[]
  private state?: GameState
  private refreshThrottleTimer: number | null = null

  constructor(firms?: FirmData[], _hasRealData = false, state?: GameState) {
    this.firms = firms
    this.state = state

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-firms-page'
    this.buildPage()

    if (state) {
      this.unsub = state.subscribe((ev) => {
        if (ev.type === 'purchase') this.refreshProducerCards()
        else if (ev.type === 'money_changed') this.throttledRefresh()
      })
    }
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

    // C) Ar-Ge / Yükseltmeler
    const rnd = document.createElement('div')
    rnd.className = 'ref-firms-tab-content'
    rnd.dataset.tab = 'rnd'
    rnd.style.display = 'none'
    rnd.appendChild(this.buildRndSection())
    this.el.appendChild(rnd)
  }

  // ── KPI ─────────────────────────────────────────────────────────────
  private buildKpi(): HTMLElement {
    const s = this.state
    if (s) {
      const legalIncome   = Math.round(s.legalIncomePerDay())
      const illegalIncome = Math.round(s.illegalIncomePerDay())
      const ownedNormal   = NORMAL_PRODUCERS.filter(p => (s.producers[p.id] ?? 0) > 0).length
      const totalUnits    = NORMAL_PRODUCERS.reduce((sum, p) => sum + (s.producers[p.id] ?? 0), 0)
      return new RefKpiStrip([
        { icon: '🏪', label: 'İşletme Türü',   value: String(ownedNormal), sub: `${totalUnits} birim`, subDir: 'muted' },
        { icon: '📈', label: 'Yasal Gelir',    value: fmtMoney(legalIncome), sub: 'Günlük', subDir: 'up' },
        { icon: '💰', label: 'Yasadışı Gelir', value: illegalIncome > 0 ? fmtMoney(illegalIncome) : 'Yok', sub: 'Günlük', subDir: 'muted' },
        { icon: '💵', label: 'Nakit',          value: fmtMoney(Math.round(s.money)), sub: 'Likit', subDir: 'muted' },
      ]).el
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
      { id: 'normal', label: 'İşletmeler', icon: '🏪' },
      { id: 'empire', label: 'İmparatorluk', icon: '👑' },
      { id: 'rnd',    label: 'Ar-Ge', icon: '🔬' },
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

    const note = document.createElement('div')
    note.className = 'ref-preview-note ref-firms-note live-mode'
    note.textContent = '✅ Gerçek veri · maliyet ve gelir Economy.ts kaynağından · Satın Al aktif'
    wrap.appendChild(note)

    this.summaryEl = document.createElement('div')
    this.summaryEl.className = 'ref-summary-strip'
    wrap.appendChild(this.summaryEl)

    this.producerCardsContainer = document.createElement('div')
    this.producerCardsContainer.className = 'ref-prod-list'
    wrap.appendChild(this.producerCardsContainer)

    this.buildProducerCards()
    this.updateSummary()
    return wrap
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

  private buildOneProducerCard(def: ProducerDef, s: GameState): HTMLElement {
    const owned    = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const cost     = s.producerCostFor(def, owned, 1)
    const canBuy   = unlocked && s.money >= cost
    const income   = owned > 0 ? Math.round(s.producerIncome(def)) : Math.round(def.baseIncome)

    let stateClass: string
    if (!unlocked && def.ipoRequirement && s.ipoCount < def.ipoRequirement) stateClass = 'locked'
    else if (!unlocked) stateClass = 'locked'
    else if (owned > 0) stateClass = canBuy ? 'owned' : 'owned no-cash'
    else if (canBuy) stateClass = 'available'
    else stateClass = 'no-cash'

    const card = document.createElement('div')
    card.className = `ref-prod-card ${stateClass}`
    card.dataset.id = def.id

    // Foot: buton veya kilit etiketi
    let footRight: string
    if (!unlocked) {
      const reason = (def.ipoRequirement && s.ipoCount < def.ipoRequirement)
        ? `🔒 ${def.ipoRequirement} IPO gerekli`
        : `🔒 ${fmtMoney(def.unlockAt)} kazanınca`
      footRight = `<span class="ref-prod-locked-lbl">${reason}</span>`
    } else if (canBuy) {
      footRight = `<button class="ref-prod-btn buyable" type="button">${owned > 0 ? '+1 AL' : 'SATIN AL'} · ${fmtMoney(cost)}</button>`
    } else {
      footRight = `<button class="ref-prod-btn disabled" type="button" disabled>Para Yetersiz · ${fmtMoney(cost)}</button>`
    }

    card.innerHTML = `
      <div class="ref-prod-card__head">
        <span class="ref-prod-emoji">${def.emoji}</span>
        <div class="ref-prod-info">
          <div class="ref-prod-name">${def.name}${owned > 0 ? `<span class="ref-prod-owned-badge">×${owned}</span>` : ''}</div>
          <div class="ref-prod-desc">${def.description}</div>
        </div>
      </div>
      <div class="ref-prod-stats">
        <span class="ref-prod-stat"><small>Kademe</small><b>T${def.tier}</b></span>
        <span class="ref-prod-stat"><small>${owned > 0 ? 'Gelir' : 'Birim gelir'}</small><b class="inc">${fmtMoney(income)}/g</b></span>
        <span class="ref-prod-stat"><small>Sonraki</small><b>${fmtMoney(cost)}</b></span>
      </div>
      <div class="ref-prod-card__foot">${footRight}</div>
    `

    card.querySelector<HTMLButtonElement>('.ref-prod-btn.buyable')?.addEventListener('click', () => {
      const ok = this.state?.buyProducer(def.id, 1)
      if (ok) refToast(`${def.emoji} ${def.name} alındı`, 'ok')
      else refToast('Satın alınamadı', 'err')
    })
    return card
  }

  /** Satın alma/para değişince yalnız değişen kartları yeniden çiz (tüm sayfa değil). */
  private refreshProducerCards(): void {
    if (!this.state || !this.producerCardsContainer) return
    const s = this.state
    for (const def of NORMAL_PRODUCERS) {
      const existing = this.producerCards.get(def.id)
      if (!existing) continue
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
    this.summaryEl.innerHTML = `
      <span class="ref-summary-count">${NORMAL_PRODUCERS.length} işletme türü · ${ownedTypes} sahip</span>
      <span class="ref-summary-total">Nakit: ${fmtMoney(Math.round(s.money))}</span>
    `
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

  // ── İmparatorluk Yatırımları (view-only) ────────────────────────────
  private buildEmpireSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-empire-inv'

    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = '🔒 Önizleme · İmparatorluk satın alma henüz aktif değil (yönetim için İmparatorluk sekmesi)'
    wrap.appendChild(note)

    const tabBar = document.createElement('div')
    tabBar.className = 'ref-empire-tabs'
    const content = document.createElement('div')
    content.className = 'ref-empire-inv-content'
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

  private renderEmpireTab(id: EmpireTab, content: HTMLElement): void {
    const list = PRODUCERS.filter(EMPIRE_PRODUCER_FILTER[id]).sort((a, b) => a.tier - b.tier)
    content.innerHTML = ''
    if (!list.length) {
      content.innerHTML = '<div class="ref-empire-empty">Bu kategoride içerik yok.</div>'
      return
    }
    const grid = document.createElement('div')
    grid.className = 'ref-empire-cards'
    for (const def of list) {
      const owned = this.state ? (this.state.producers[def.id] ?? 0) : 0
      const card = document.createElement('div')
      card.className = 'ref-empire-card' + (owned > 0 ? ' owned' : '')
      card.innerHTML = `
        <div class="ref-empire-card__head">
          <span class="ref-empire-card__emoji">${def.emoji}</span>
          <div class="ref-empire-card__info">
            <div class="ref-empire-card__name">${def.name}</div>
            <div class="ref-empire-card__tier">Tier ${def.tier} · ${owned > 0 ? `<b>${owned} adet</b>` : 'Sahip değilsin'}</div>
          </div>
          ${owned > 0 ? '<span class="ref-empire-card__badge">✓</span>' : ''}
        </div>
        <div class="ref-empire-card__foot">
          <button class="ref-prod-btn disabled" type="button" disabled>${fmtMoney(def.baseCost)} · yakında</button>
        </div>`
      grid.appendChild(card)
    }
    content.appendChild(grid)
  }

  // ── Ar-Ge / Yükseltmeler (gerçek veri okunur, view-only) ─────────────
  private buildRndSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-rnd'
    const s = this.state

    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = s
      ? '🔬 Ar-Ge & Yükseltmeler · seviye/maliyet gerçek (satın alma bu aşamada kapalı)'
      : '🔬 Ar-Ge & Yükseltmeler · önizleme (gerçek veri yok)'
    wrap.appendChild(note)

    // Araştırma düğümleri
    const resTitle = document.createElement('div')
    resTitle.className = 'ref-sec-title'
    resTitle.innerHTML = `<span>Araştırma Ağacı</span><span class="ref-sec-action">${RESEARCH_NODES.length} düğüm</span>`
    wrap.appendChild(resTitle)

    const resList = document.createElement('div')
    resList.className = 'ref-rnd-list'
    for (const node of RESEARCH_NODES) {
      resList.appendChild(this.buildResearchRow(node, s))
    }
    wrap.appendChild(resList)

    // Yükseltmeler
    const upgTitle = document.createElement('div')
    upgTitle.className = 'ref-sec-title'
    upgTitle.innerHTML = `<span>Yükseltmeler</span><span class="ref-sec-action">${UPGRADES.length} adet</span>`
    wrap.appendChild(upgTitle)

    const upgList = document.createElement('div')
    upgList.className = 'ref-rnd-list'
    // Sahip olunanlar üstte, sonra fiyat sırası
    const sortedUpg = [...UPGRADES].sort((a, b) => a.cost - b.cost)
    for (const upg of sortedUpg) {
      upgList.appendChild(this.buildUpgradeRow(upg, s))
    }
    wrap.appendChild(upgList)
    return wrap
  }

  private buildRndBranchLabel(branch: ResearchNode['branch']): string {
    return branch === 'operasyon' ? 'Operasyon' : branch === 'finans' ? 'Finans' : 'İmparatorluk'
  }

  private buildResearchRow(node: ResearchNode, s?: GameState): HTMLElement {
    const level     = s ? (s.research[node.id] ?? 0) : 0
    const maxed     = level >= node.maxLevel
    const unlocked  = s ? researchIsUnlocked(node.id, s.research) : true
    const cost      = researchCost(node, level)
    const prereq    = researchPrereqName(node.id)
    const curr      = node.currency === 'prestige' ? 'Prestij' : '₺'

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
    const owned   = s ? s.purchasedUpgrades.has(upg.id) : false
    const cost    = s ? s.upgradeCostFor(upg) : upg.cost
    const afford  = s ? s.money >= cost : false

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

  private throttledRefresh(): void {
    if (this.refreshThrottleTimer !== null) return
    this.refreshThrottleTimer = window.setTimeout(() => {
      this.refreshThrottleTimer = null
      this.refreshProducerCards()
    }, 700)
  }

  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
    if (this.refreshThrottleTimer !== null) {
      window.clearTimeout(this.refreshThrottleTimer)
      this.refreshThrottleTimer = null
    }
  }
}
