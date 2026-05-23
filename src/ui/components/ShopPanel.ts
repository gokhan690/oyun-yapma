import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, formatMoney, formatIncomeRate, formatIncomeRateHint, producerIconPath, earlyUnlockCost, isProducerUnlocked, scaledUnlockAt, producerCategory, type ProducerDef, type UpgradeDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost } from '../../game/Research'
import { getActiveSynergies } from '../../game/Synergies'
import { PRESTIGE_THRESHOLD } from '../../game/Prestige'
import { prestigeMultiplier } from '../../game/Prestige'
import { managerCost, hasManager } from '../../game/Managers'
import { profitLoss, priceChangePct, portfolioSummary, sparklinePath, STOCK_DEFS, fearLabel, isBankruptTicker } from '../../game/StockMarket'
import { depositRate, bondRate, loanRate } from '../../game/FinanceBank'
import { PRESTIGE_TREE_NODES, canBuyNode, hasNode } from '../../game/PrestigeTree'
import { dailyGoalProgress, scaledDailyGoalTarget } from '../../game/DailyGoal'
import { assetUrl } from '../../utils/assetUrl'
import {
  getBestRecommendation,
  sortProducers,
  formatRoi,
  producerRoiSeconds,
  formatRecommendationSummary,
  type BizSortOrder,
} from '../../game/ShopAdvisor'
import { UNDERGROUND_TREE_NODES, treeNodeCost } from '../../game/UndergroundTree'

export type BuyMode = 1 | 10 | 'max'
export type ShopHub = 'growth' | 'powerup' | 'finance' | 'empire'
export type GrowthSub = 'businesses' | 'management'
export type PowerupSub = 'upgrades' | 'research'
export type EmpireSub = 'sport' | 'politics' | 'dark'
export type IpoSubTab = 'stock' | 'bank' | 'prestige' | 'ipo'
export type UpgradeFilter = 'all' | 'click' | 'global' | 'producer'
export type BizTypeFilter = 'all' | 'legal' | 'illegal' | 'sport' | 'politics' | 'dark'

const HUB_SUBTITLES: Record<ShopHub, string> = {
  growth: 'İşletme satın al, yönetici işe al',
  powerup: 'Yükseltme ve Ar-Ge',
  finance: 'Borsa, banka, prestij ve IPO',
  empire: 'Spor, siyaset ve yeraltı yatırımları',
}

const HUB_ICONS: Record<ShopHub, string> = {
  growth: assetUrl('icons/nav/shop.svg'),
  powerup: assetUrl('icons/businesses/ai.svg'),
  finance: assetUrl('icons/businesses/tuzaq.svg'),
  empire: assetUrl('icons/nav/empire.svg'),
}

const MILESTONES = [1, 10, 25, 50, 100]

export class ShopPanel {
  readonly root: HTMLElement
  private buyMode: BuyMode = 1
  private activeHub: ShopHub = 'growth'
  private growthSub: GrowthSub = 'businesses'
  private powerupSub: PowerupSub = 'upgrades'
  private panels: Record<string, HTMLElement> = {}
  private tabButtons: HTMLButtonElement[] = []
  private subTabButtons: HTMLButtonElement[] = []
  private buyModesEl!: HTMLElement
  private shopSubEl!: HTMLElement
  private shopHubEl!: HTMLElement
  private advisorEl!: HTMLElement
  private subTabsEl!: HTMLElement
  private businessCards = new Map<string, HTMLDivElement>()
  private synergyEl: HTMLElement | null = null
  private ipoSubTab: IpoSubTab = 'stock'
  private upgradeFilter: UpgradeFilter = 'all'
  private bizTypeFilter: BizTypeFilter = 'all'
  private empireSub: EmpireSub = 'sport'
  private empireCards = new Map<string, HTMLDivElement>()
  private bizSortOrder: BizSortOrder = 'profit'

  private matchesBizFilter(p: ProducerDef, filter: BizTypeFilter): boolean {
    const cat = producerCategory(p)
    if (filter === 'all') return !p.category
    if (filter === 'legal') return cat === 'legal'
    if (filter === 'illegal') return cat === 'illegal'
    return p.category === filter
  }

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'shop-panel shop-hub-growth'
    this.build()
  }

  private resolveTab(id: string): { hub: ShopHub; growthSub?: GrowthSub; powerupSub?: PowerupSub; empireSub?: EmpireSub; ipoSub?: IpoSubTab } {
    if (id === 'growth' || id === 'powerup' || id === 'finance' || id === 'empire') return { hub: id }
    if (id === 'businesses' || id === 'management') return { hub: 'growth', growthSub: id }
    if (id === 'upgrades' || id === 'research') return { hub: 'powerup', powerupSub: id }
    if (id === 'sport' || id === 'politics' || id === 'dark') return { hub: 'empire', empireSub: id }
    if (id === 'ipo' || id === 'stock' || id === 'bank' || id === 'prestige') {
      return { hub: 'finance', ipoSub: (id === 'stock' || id === 'bank' || id === 'prestige' ? id : this.ipoSubTab) as IpoSubTab }
    }
    return { hub: 'growth', growthSub: 'businesses' }
  }

  private activePanelId(): string {
    if (this.activeHub === 'growth') return this.growthSub
    if (this.activeHub === 'powerup') return this.powerupSub
    if (this.activeHub === 'empire') return `empire_${this.empireSub}`
    return 'ipo'
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'shop-header'
    const title = document.createElement('span')
    title.className = 'shop-title'
    title.textContent = 'Mağaza'
    this.shopSubEl = document.createElement('span')
    this.shopSubEl.className = 'shop-sub'
    this.shopSubEl.textContent = HUB_SUBTITLES.growth
    header.append(title, this.shopSubEl)

    const buyModes = document.createElement('div')
    buyModes.className = 'buy-modes'
    this.buyModesEl = buyModes
    for (const mode of ['1', '10', 'max'] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'buy-mode-btn'
      btn.dataset.action = 'buy-mode'
      btn.dataset.count = mode
      btn.textContent = mode === 'max' ? 'Hepsi' : mode
      if (mode === '1') btn.classList.add('active')
      buyModes.appendChild(btn)
    }

    this.advisorEl = document.createElement('div')
    this.advisorEl.className = 'shop-advisor-strip'

    this.subTabsEl = document.createElement('div')
    this.subTabsEl.className = 'shop-sub-tabs'

    const tabs = document.createElement('div')
    tabs.className = 'shop-tabs-pill shop-hub-tabs'
    const hubDefs: { id: ShopHub; label: string }[] = [
      { id: 'growth', label: 'Büyüme' },
      { id: 'powerup', label: 'Güçlendir' },
      { id: 'finance', label: 'Finans' },
      { id: 'empire', label: 'İmparatorluk' },
    ]
    for (const t of hubDefs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab-btn shop-hub-btn'
      btn.dataset.action = 'shop-tab'
      btn.dataset.id = t.id
      btn.dataset.tab = t.id
      const img = document.createElement('img')
      img.src = HUB_ICONS[t.id]
      img.alt = ''
      img.width = 18
      img.height = 18
      const label = document.createElement('span')
      label.textContent = t.label
      btn.append(img, label)
      if (t.id === 'growth') btn.classList.add('active')
      this.tabButtons.push(btn)
      tabs.appendChild(btn)
    }

    for (const id of ['businesses', 'management', 'upgrades', 'research', 'ipo', 'empire_sport', 'empire_politics', 'empire_dark']) {
      const panel = document.createElement('div')
      panel.className = 'tab-panel'
      panel.dataset.panel = id
      panel.hidden = id !== 'businesses'
      this.panels[id] = panel
    }

    const tabsWrap = document.createElement('div')
    tabsWrap.className = 'shop-tabs-wrap'
    tabsWrap.appendChild(tabs)

    const chrome = document.createElement('div')
    chrome.className = 'shop-chrome'
    this.shopHubEl = document.createElement('div')
    this.shopHubEl.className = 'shop-hub-strip'
    chrome.append(header, this.shopHubEl, this.advisorEl, buyModes, this.subTabsEl, tabsWrap)
    this.renderSubTabs()

    const body = document.createElement('div')
    body.className = 'shop-body'
    for (const panel of Object.values(this.panels)) {
      body.appendChild(panel)
    }

    this.root.append(chrome, body)
  }

  setTab(id: string, state?: GameState): void {
    const resolved = this.resolveTab(id)
    this.activeHub = resolved.hub
    if (resolved.growthSub) this.growthSub = resolved.growthSub
    if (resolved.powerupSub) this.powerupSub = resolved.powerupSub
    if (resolved.ipoSub) this.ipoSubTab = resolved.ipoSub
    if (resolved.empireSub) this.empireSub = resolved.empireSub
    if (this.activeHub === 'finance' && state?.prestigeEligible()) {
      this.ipoSubTab = 'ipo'
    }
    const panelId = this.activePanelId()
    this.root.className = `shop-panel shop-hub-${this.activeHub}`
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === this.activeHub)
    }
    for (const [pid, panel] of Object.entries(this.panels)) {
      const show = pid === panelId
      panel.hidden = !show
      if (show) {
        panel.scrollTop = 0
        panel.classList.remove('tab-fade-in')
        void panel.offsetWidth
        panel.classList.add('tab-fade-in')
      }
    }
    this.renderSubTabs(state)
    const showBuy = (this.activeHub === 'growth' && this.growthSub === 'businesses')
      || (this.activeHub === 'empire')
    this.buyModesEl.hidden = !showBuy
    this.buyModesEl.classList.toggle('is-hidden', !showBuy)
    this.shopSubEl.textContent = HUB_SUBTITLES[this.activeHub]
    const activeBtn = this.tabButtons.find((b) => b.dataset.tab === this.activeHub)
    activeBtn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }

  setGrowthSub(sub: GrowthSub): void {
    this.growthSub = sub
    this.setTab(sub)
  }

  setPowerupSub(sub: PowerupSub): void {
    this.powerupSub = sub
    this.setTab(sub)
  }

  goToFinanceStock(tickerId?: string): void {
    this.ipoSubTab = 'stock'
    this.setTab('finance')
    if (tickerId) this.highlightStockTicker = tickerId
  }

  private highlightStockTicker: string | null = null

  getIpoSubTab(): IpoSubTab {
    return this.ipoSubTab
  }

  private renderSubTabs(state?: GameState): void {
    this.subTabsEl.replaceChildren()
    this.subTabButtons = []
    if (this.activeHub === 'growth') {
      for (const [id, label] of [['businesses', 'İşletme'], ['management', 'Yönetim']] as const) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab${this.growthSub === id ? ' active' : ''}`
        btn.dataset.action = 'shop-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
    } else if (this.activeHub === 'powerup') {
      for (const [id, label] of [['upgrades', 'Yükseltme'], ['research', 'Ar-Ge']] as const) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab${this.powerupSub === id ? ' active' : ''}`
        btn.dataset.action = 'shop-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
    } else if (this.activeHub === 'empire') {
      for (const [id, label] of [['sport', 'Spor'], ['politics', 'Siyaset'], ['dark', 'Yeraltı']] as const) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab${this.empireSub === id ? ' active' : ''}`
        btn.dataset.action = 'shop-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
    } else if (this.activeHub === 'finance') {
      for (const [id, label] of [['stock', 'Hisse'], ['bank', 'Banka'], ['prestige', 'Prestij'], ['ipo', 'IPO']] as const) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab ipo-nav-tab${this.ipoSubTab === id ? ' active' : ''}`
        btn.dataset.action = 'ipo-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        if (id === 'ipo' && state?.prestigeEligible()) {
          const badge = document.createElement('span')
          badge.className = 'sub-tab-ready-dot'
          badge.title = 'IPO hazır'
          btn.appendChild(badge)
        }
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
    }
  }

  setEmpireSub(sub: EmpireSub): void {
    this.empireSub = sub
    this.setTab(sub)
  }

  setIpoSubTab(tab: IpoSubTab): void {
    this.ipoSubTab = tab
  }

  setUpgradeFilter(filter: UpgradeFilter): void {
    this.upgradeFilter = filter
  }

  setBizTypeFilter(filter: BizTypeFilter): void {
    this.bizTypeFilter = filter
  }

  hasShopBadge(state: GameState): boolean {
    state.ensureMissions()
    const missionReady = state.missions.some((m) => m.progress >= m.target && !m.claimed)
    const ipoReady = state.prestigeEligible()
    const upgradeReady = state.availableUpgrades().some((u) => state.canAfford(state.upgradeCostFor(u)))
    const earlyUnlock = PRODUCERS.some((p) => {
      if (isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)) return false
      return state.canAfford(earlyUnlockCost(p))
    })
    return missionReady || ipoReady || upgradeReady || earlyUnlock
  }

  updateTabBadges(state: GameState): void {
    state.ensureMissions()
    for (const btn of this.tabButtons) {
      const hub = btn.dataset.tab as ShopHub
      let show = false
      if (hub === 'finance') show = state.prestigeEligible()
      if (hub === 'powerup') {
        show = state.availableUpgrades().some((u) => state.canAfford(state.upgradeCostFor(u)))
      }
      if (hub === 'growth') {
        show = PRODUCERS.some((p) => {
          if (isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)) return false
          return state.canAfford(earlyUnlockCost(p))
        })
      }
      let badge = btn.querySelector('.tab-badge') as HTMLElement | null
      if (show && !badge) {
        badge = document.createElement('span')
        badge.className = 'tab-badge'
        btn.appendChild(badge)
      }
      if (badge) badge.hidden = !show
    }
  }

  getActiveTab(): string {
    return this.activeHub
  }

  getBuyMode(): BuyMode {
    return this.buyMode
  }

  render(state: GameState, onlyActiveTab = false, patch = false): void {
    this.renderShopHub(state)
    this.renderAdvisorStrip(state)
    this.renderSubTabs(state)
    const panelId = this.activePanelId()
    if (patch && panelId === 'businesses') {
      this.renderBusinesses(state, true)
      return
    }
    if (onlyActiveTab) {
      this.renderTab(state, panelId)
      this.renderSubTabs(state)
      this.updateTabBadges(state)
      return
    }
    this.renderBusinesses(state, false)
    this.renderManagement(state)
    this.renderUpgrades(state)
    this.renderResearch(state)
    this.renderIpo(state)
    this.updateTabBadges(state)
  }

  patchAffordability(state: GameState): void {
    if (this.activePanelId() === 'businesses') this.renderBusinesses(state, true)
    this.renderAdvisorStrip(state)
  }

  private renderAdvisorStrip(state: GameState): void {
    const rec = getBestRecommendation(state)
    this.advisorEl.replaceChildren()
    if (!rec) {
      this.advisorEl.hidden = true
      return
    }
    this.advisorEl.hidden = false
    const card = document.createElement('div')
    card.className = `shop-advisor-card${rec.affordable ? '' : ' shop-advisor-locked'}`
    const text = document.createElement('div')
    text.className = 'shop-advisor-text'
    text.innerHTML = `<strong>Şimdi al</strong><span>${formatRecommendationSummary(rec)}</span><small>${rec.reason}</small>`
    const actions = document.createElement('div')
    actions.className = 'shop-advisor-actions'
    const buyBtn = document.createElement('button')
    buyBtn.type = 'button'
    buyBtn.className = 'btn-primary btn-sm'
    buyBtn.dataset.action = 'advisor-buy'
    buyBtn.dataset.id = `${rec.kind}:${rec.id}`
    buyBtn.textContent = rec.affordable ? 'Satın al' : `Eksik: ${formatMoney(Math.max(0, rec.cost - state.money))}`
    buyBtn.disabled = !rec.affordable
    actions.appendChild(buyBtn)
    if (!rec.affordable && state.pendingOfflineEarnings > 0) {
      const adBtn = document.createElement('button')
      adBtn.type = 'button'
      adBtn.className = 'btn-ad btn-sm'
      adBtn.dataset.action = 'ad-offline'
      adBtn.textContent = '📺 Offline topla'
      actions.appendChild(adBtn)
    }
    card.append(text, actions)
    this.advisorEl.appendChild(card)
  }

  private renderTab(state: GameState, tab: string): void {
    switch (tab) {
      case 'businesses': this.renderBusinesses(state); break
      case 'management': this.renderManagement(state); break
      case 'upgrades': this.renderUpgrades(state); break
      case 'research': this.renderResearch(state); break
      case 'empire_sport':
      case 'empire_politics':
      case 'empire_dark':
        this.renderEmpireCategory(state, tab.replace('empire_', '') as EmpireSub)
        break
      case 'ipo': this.renderIpo(state); break
    }
  }

  setBizSortOrder(order: BizSortOrder): void {
    this.bizSortOrder = order
  }

  setBuyMode(mode: BuyMode): void {
    this.buyMode = mode
    const root = this.root.querySelector('.buy-modes')
    if (!root) return
    root.querySelectorAll('.buy-mode-btn').forEach((node) => {
      const btn = node as HTMLButtonElement
      const key = btn.dataset.count
      btn.classList.toggle('active', key === String(mode) || (mode === 'max' && key === 'max'))
    })
  }

  flashCard(producerId: string): void {
    const card = this.businessCards.get(producerId)
    if (!card) return
    card.classList.remove('just-bought')
    void card.offsetWidth
    card.classList.add('just-bought')
    window.setTimeout(() => card.classList.remove('just-bought'), 450)
  }

  private renderShopHub(state: GameState): void {
    const ipd = state.incomePerDay()
    const click = state.clickIncomePerTap()
    const illegalIpd = state.illegalIncomePerDay()
    const ownedBiz = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length
    const nextUnlock = PRODUCERS.find((p) => !isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks))
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, scaledDailyGoalTarget(state.incomePerDay())))
    const nextText = nextUnlock ? `${nextUnlock.emoji} ${nextUnlock.name}` : 'Hepsi açık'
    const hasIllegal = illegalIpd > 0
    const heatPct = Math.round(state.illegalHeat)
    const illegalStat = hasIllegal
      ? `<span class="hub-stat hub-stat-illegal"><strong>${formatIncomeRate(illegalIpd)}</strong><small>Illegal pasif</small></span>
         <span class="hub-stat hub-stat-heat"><strong>${state.illegalRiskLabel()}</strong><small>Radar ${heatPct}%</small></span>`
      : ''
    this.shopHubEl.innerHTML = `
      <span class="hub-stat hub-stat-wallet"><strong>${formatMoney(state.money)}</strong><small>Cüzdan</small></span>
      <span class="hub-stat"><strong>${formatMoney(state.totalEarned)}</strong><small>Toplam kazanç</small></span>
      <span class="hub-stat"><strong>${formatIncomeRate(ipd)}</strong><small>Pasif / sn</small></span>
      <span class="hub-stat"><strong>${formatMoney(click)}</strong><small>Tık / vuruş</small></span>
      ${illegalStat}
      <span class="hub-stat"><strong>${ownedBiz}</strong><small>İşletme</small></span>
      <span class="hub-stat"><strong>${nextText}</strong><small>Sıradaki kilit</small></span>
      <span class="hub-stat"><strong>${goalPct}%</strong><small>Günlük hedef</small></span>
      <span class="hub-stat hub-stat-note"><small>Cüzdan harcanır · Toplam kazanç kilit/rütbe için (düşmez)</small></span>
    `
    this.renderFinanceModifiers(state)
  }

  private renderFinanceModifiers(state: GameState): void {
    let modEl = this.root.querySelector('.finance-modifiers') as HTMLElement | null
    if (!modEl) {
      modEl = document.createElement('div')
      modEl.className = 'finance-modifiers'
      this.shopHubEl.after(modEl)
    }
    const chips = state.incomeModifierChips()
    if (chips.length === 0) {
      modEl.hidden = true
      return
    }
    modEl.hidden = false
    modEl.replaceChildren()
    const label = document.createElement('span')
    label.className = 'finance-modifiers-label'
    label.textContent = 'Aktif etkiler:'
    modEl.appendChild(label)
    for (const c of chips) {
      const chip = document.createElement('span')
      chip.className = 'finance-mod-chip'
      chip.title = c.detail
      chip.textContent = `${c.emoji} ${c.label}`
      modEl.appendChild(chip)
    }
  }

  private createFinanceSummary(state: GameState): HTMLElement {
    const el = document.createElement('div')
    el.className = 'finance-summary'
    const ipd = state.incomePerDay()
    const click = state.clickIncomePerTap()
    const money = state.money
    const total = state.totalEarned
    el.innerHTML = `
      <div class="finance-summary-row finance-summary-row-4">
        <span><strong>${formatMoney(money)}</strong><small>Cüzdan</small></span>
        <span><strong>${formatMoney(total)}</strong><small>Toplam kazanç</small></span>
        <span><strong>${formatIncomeRate(ipd)}</strong><small>Pasif</small></span>
        <span><strong>${formatMoney(click)}</strong><small>Tıklama</small></span>
      </div>
      <p class="finance-summary-hint">Cüzdan = elindeki para (alışveriş buradan). Toplam kazanç = bu run'da kazandığın her şey; işletme kilidi ve rütbe buna bakar, harcamayla düşmez.</p>
      <p class="finance-summary-hint finance-summary-extra">${formatIncomeRateHint(ipd)} · 1 sn = 1 oyun günü</p>
    `
    return el
  }

  private createFilterPills(
    filters: { id: string; label: string }[],
    activeId: string,
    action: string,
  ): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'shop-filter-pills'
    for (const f of filters) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `filter-pill${f.id === activeId ? ' active' : ''}`
      btn.dataset.action = action
      btn.dataset.id = f.id
      btn.textContent = f.label
      wrap.appendChild(btn)
    }
    return wrap
  }

  private createRevenueDistribution(state: GameState): HTMLElement | null {
    const entries = PRODUCERS
      .map((p) => ({ p, income: state.producerIncome(p) }))
      .filter((e) => e.income > 0)
      .sort((a, b) => b.income - a.income)
    if (entries.length === 0) return null
    const total = entries.reduce((s, e) => s + e.income, 0)
    const top3 = entries.slice(0, 3)
    const el = document.createElement('div')
    el.className = 'revenue-distribution'
    const title = document.createElement('strong')
    title.textContent = 'Gelir dağılımı'
    el.appendChild(title)
    const bar = document.createElement('div')
    bar.className = 'revenue-bar'
    const colors = ['var(--accent)', 'var(--green)', 'var(--blue)']
    top3.forEach((e, i) => {
      const seg = document.createElement('span')
      seg.className = 'revenue-seg'
      seg.style.flex = String(e.income / total)
      seg.style.background = colors[i] ?? 'var(--muted)'
      seg.title = `${e.p.name}: ${formatIncomeRate(e.income)}`
      bar.appendChild(seg)
    })
    el.appendChild(bar)
    const legend = document.createElement('div')
    legend.className = 'revenue-legend'
    for (const e of top3) {
      const item = document.createElement('span')
      item.textContent = `${e.p.emoji} ${Math.round((e.income / total) * 100)}%`
      legend.appendChild(item)
    }
    el.appendChild(legend)
    return el
  }

  private formatEta(days: number): string {
    if (!Number.isFinite(days) || days <= 0) return '—'
    if (days < 1) return `${Math.ceil(days * 24)}sa`
    if (days < 30) return `${Math.ceil(days)}g`
    if (days < 365) return `${Math.ceil(days / 30)}ay`
    return `${Math.ceil(days / 365)}y`
  }

  private createSectionHeader(title: string, subtitle?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'shop-section-header'
    const strong = document.createElement('strong')
    strong.textContent = title
    el.appendChild(strong)
    if (subtitle) {
      const small = document.createElement('small')
      small.textContent = subtitle
      el.appendChild(small)
    }
    return el
  }

  private createTabHero(icon: string, title: string, subtitle: string, stat?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'shop-tab-hero'
    const iconEl = document.createElement('span')
    iconEl.className = 'shop-tab-hero-icon'
    iconEl.textContent = icon
    const text = document.createElement('div')
    text.className = 'shop-tab-hero-text'
    const h = document.createElement('strong')
    h.textContent = title
    const sub = document.createElement('small')
    sub.textContent = subtitle
    text.append(h, sub)
    el.append(iconEl, text)
    if (stat) {
      const statEl = document.createElement('span')
      statEl.className = 'shop-tab-hero-stat'
      statEl.textContent = stat
      el.appendChild(statEl)
    }
    return el
  }

  private createProgressBar(pct: number, extraClass = ''): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = `progress-bar${extraClass ? ` ${extraClass}` : ''}`
    const fill = document.createElement('div')
    fill.className = 'progress-fill'
    fill.style.width = `${Math.min(100, Math.max(0, pct))}%`
    wrap.appendChild(fill)
    return wrap
  }

  private createEmptyState(icon: string, text: string, hint?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'empty-state'
    const iconEl = document.createElement('span')
    iconEl.className = 'empty-state-icon'
    iconEl.textContent = icon
    const p = document.createElement('p')
    p.textContent = text
    el.append(iconEl, p)
    if (hint) {
      const small = document.createElement('small')
      small.textContent = hint
      el.appendChild(small)
    }
    return el
  }

  private upgradeEffectLabel(u: UpgradeDef): string {
    if (u.effect === 'click_mult') return 'Tıklama'
    if (u.effect === 'global_mult') return 'Global'
    return 'İşletme'
  }

  private upgradeEffectIcon(u: UpgradeDef): string {
    if (u.effect === 'click_mult') return '👆'
    if (u.effect === 'global_mult') return '🌍'
    return '🏢'
  }

  private getCardsGrid(panel: HTMLElement): HTMLElement {
    let grid = panel.querySelector('.biz-cards-grid') as HTMLElement | null
    if (!grid) {
      grid = document.createElement('div')
      grid.className = 'biz-cards-grid'
      panel.appendChild(grid)
    }
    return grid
  }

  private renderEmpireCategory(state: GameState, category: EmpireSub): void {
    const panel = this.panels[`empire_${category}`]!
    panel.querySelector('.empire-shop-hero')?.remove()
    const hero = document.createElement('div')
    hero.className = 'shop-tab-hero empire-shop-hero'
    const titles: Record<EmpireSub, { icon: string; title: string; desc: string }> = {
      sport: { icon: '⚽', title: 'Futbol İmparatorluğu', desc: 'Kulüp satın al, İmparatorluk sekmesinden yönet.' },
      politics: { icon: '🏛️', title: 'Siyasi Kariyer', desc: 'Meclisten cumhurbaşkanlığına uzanan yol.' },
      dark: { icon: '🏭', title: 'Siyah Endüstri', desc: 'Yüksek gelir, yüksek radar riski.' },
    }
    const t = titles[category]
    hero.innerHTML = `<span class="shop-tab-hero-icon">${t.icon}</span><div class="shop-tab-hero-text"><strong>${t.title}</strong><small>${t.desc}</small></div>`
    panel.prepend(hero)

    const grid = this.getCardsGrid(panel)
    const visibleIds = new Set<string>()
    const list = sortProducers(
      PRODUCERS.filter((p) => p.category === category && isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)),
      this.bizSortOrder,
      state,
    )

    for (const p of list) {
      const owned = state.producers[p.id] ?? 0
      let count = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : this.buyMode
      if (count < 1) count = 1
      visibleIds.add(p.id)
      const key = `${category}:${p.id}`
      let card = this.empireCards.get(key)
      if (!card) {
        card = this.createBusinessCard(p)
        this.empireCards.set(key, card)
        grid.appendChild(card)
      }
      card.hidden = false
      card.classList.toggle('biz-card-illegal', !!p.illegal)
      const buyCount = this.buyMode === 'max' ? Math.max(1, state.countMaxAffordable(p.id)) : count
      this.updateBusinessCard(card, p, state, owned, buyCount)
    }

    for (const [key, card] of this.empireCards) {
      if (!key.startsWith(`${category}:`) || !visibleIds.has(key.split(':')[1]!)) {
        if (key.startsWith(`${category}:`)) {
          card.remove()
          this.empireCards.delete(key)
        }
      }
    }

    const nextLocked = PRODUCERS.find((p) => p.category === category && !isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks))
    panel.querySelector('.biz-card-locked-preview')?.remove()
    if (nextLocked) {
      const lockedCard = document.createElement('div')
      lockedCard.className = 'biz-card biz-card-locked-preview'
      lockedCard.innerHTML = `<div class="biz-locked-overlay"><strong>🔒 ${nextLocked.name}</strong><small>${formatMoney(scaledUnlockAt(nextLocked))} kazançta açılır</small></div>`
      grid.appendChild(lockedCard)
    }

    if (category === 'dark' && state.illegalIncomePerDay() > 0) {
      this.renderUndergroundTree(state, panel)
    }
  }

  private renderUndergroundTree(state: GameState, panel: HTMLElement): void {
    panel.querySelector('.underground-tree-section')?.remove()
    const section = document.createElement('div')
    section.className = 'underground-tree-section'
    section.appendChild(this.createSectionHeader('Underground Ağacı', 'Gelir · Risk · Gizlilik'))
    const grid = document.createElement('div')
    grid.className = 'underground-tree-grid'
    for (const node of UNDERGROUND_TREE_NODES) {
      const level = state.undergroundTree[node.id] ?? 0
      const maxed = level >= node.maxLevel
      const cost = treeNodeCost(node, level)
      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card underground-tree-node${maxed ? ' research-maxed' : ''}`
      card.dataset.action = 'buy-underground-node'
      card.dataset.id = node.id
      card.disabled = maxed || !state.canAfford(cost)
      card.innerHTML = `<span class="shop-card-icon">${node.emoji}</span><div class="shop-card-body"><strong>${node.name}</strong><small>${node.description}</small><span class="shop-level-label">${level}/${node.maxLevel}</span></div><span class="shop-card-price">${maxed ? 'Tamam' : formatMoney(cost)}</span>`
      grid.appendChild(card)
    }
    section.appendChild(grid)
    panel.appendChild(section)
  }

  private renderBusinesses(state: GameState, patchOnly = false): void {
    const panel = this.panels.businesses!
    const synergies = getActiveSynergies(state.producers).filter((s) => s.active)
    const synergyText = synergies.length > 0
      ? `Sinerji aktif: ${synergies.map((s) => s.def.name).join(', ')}`
      : ''

    if (synergyText) {
      if (!this.synergyEl) {
        this.synergyEl = document.createElement('div')
        this.synergyEl.className = 'synergy-bar synergy-card'
        panel.prepend(this.synergyEl)
      }
      const detail = synergies.map((s) => `${s.def.name} (+${Math.round(s.def.bonus * 100)}%)`).join(' · ')
      if (this.synergyEl.textContent !== detail) {
        this.synergyEl.innerHTML = `<strong>⚡ Sinerji aktif</strong><span>${detail}</span>`
      }
      this.synergyEl.hidden = false
    } else if (this.synergyEl) {
      this.synergyEl.hidden = true
    }

    if (!patchOnly) {
      let heroEl = panel.querySelector('.growth-tab-hero') as HTMLElement | null
      const ownedCount = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0 && !p.category).length
      const hero = this.createTabHero('🏢', 'İşletmeler', 'Yasal ve illegal işletmeler — pasif gelir kaynağın', `${ownedCount} aktif`)
      hero.classList.add('growth-tab-hero')
      if (heroEl) heroEl.replaceWith(hero)
      else panel.prepend(hero)
      heroEl = hero

      let filterBar = panel.querySelector('.biz-type-filters') as HTMLElement | null
      if (!filterBar) {
        const wrap = document.createElement('div')
        wrap.className = 'biz-filter-row'
        filterBar = this.createFilterPills([
          { id: 'all', label: 'Tümü' },
          { id: 'legal', label: 'Yasal' },
          { id: 'illegal', label: 'Illegal' },
        ], this.bizTypeFilter, 'biz-filter')
        filterBar.classList.add('biz-type-filters')
        const sortBar = this.createFilterPills([
          { id: 'profit', label: 'En karlı' },
          { id: 'cheap', label: 'En ucuz' },
          { id: 'name', label: 'A-Z' },
          { id: 'unlockable', label: 'Kilit' },
        ], this.bizSortOrder, 'biz-sort')
        sortBar.classList.add('biz-sort-filters')
        wrap.append(filterBar, sortBar)
        panel.prepend(wrap)
      } else {
        filterBar.querySelectorAll('.filter-pill').forEach((node) => {
          const btn = node as HTMLButtonElement
          if (btn.closest('.biz-type-filters')) {
            btn.classList.toggle('active', btn.dataset.id === this.bizTypeFilter)
          }
        })
        panel.querySelector('.biz-sort-filters')?.querySelectorAll('.filter-pill').forEach((node) => {
          const btn = node as HTMLButtonElement
          btn.classList.toggle('active', btn.dataset.id === this.bizSortOrder)
        })
      }

      const revDist = this.createRevenueDistribution(state)
      let revEl = panel.querySelector('.revenue-distribution') as HTMLElement | null
      if (revDist) {
        if (revEl) revEl.replaceWith(revDist)
        else {
          const finance = panel.querySelector('.finance-summary')
          if (finance) finance.after(revDist)
          else panel.prepend(revDist)
        }
      } else {
        revEl?.remove()
      }

      let financeEl = panel.querySelector('.finance-summary') as HTMLElement | null
      const finance = this.createFinanceSummary(state)
      if (financeEl) financeEl.replaceWith(finance)
      else panel.prepend(finance)
      financeEl = finance
    }

    const grid = this.getCardsGrid(panel)
    const visibleIds = new Set<string>()
    const unlocked = sortProducers(
      state.unlockedProducers().filter((p) => this.matchesBizFilter(p, this.bizTypeFilter)),
      this.bizSortOrder,
      state,
    )

    for (const p of unlocked) {
      const owned = state.producers[p.id] ?? 0
      let count = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : this.buyMode
      if (count < 1) count = 1
      visibleIds.add(p.id)

      let card = this.businessCards.get(p.id)
      if (!card) {
        card = this.createBusinessCard(p)
        this.businessCards.set(p.id, card)
        grid.appendChild(card)
      }
      card.hidden = false
      card.classList.toggle('biz-card-illegal', !!p.illegal)
      const buyCount = this.buyMode === 'max' ? Math.max(1, state.countMaxAffordable(p.id)) : count
      this.updateBusinessCard(card, p, state, owned, buyCount)
    }

    for (const [id, card] of this.businessCards) {
      if (!visibleIds.has(id)) {
        card.remove()
        this.businessCards.delete(id)
      }
    }

    if (!patchOnly) {
      const nextLockedDef = PRODUCERS.find((p) => {
        if (isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)) return false
        if (!this.matchesBizFilter(p, this.bizTypeFilter)) return false
        return true
      })
      if (nextLockedDef) {
        let lockedCard = panel.querySelector('.biz-card-locked-preview') as HTMLElement | null
        if (!lockedCard) {
          lockedCard = document.createElement('div')
          lockedCard.className = 'biz-card biz-card-locked-preview'
          lockedCard.dataset.producerId = nextLockedDef.id
          const inner = document.createElement('div')
          inner.className = 'biz-card-locked-inner'
          const emojiEl = document.createElement('span')
          emojiEl.className = 'biz-emoji'
          const icon = document.createElement('img')
          icon.className = 'biz-icon'
          icon.src = producerIconPath(nextLockedDef.id)
          icon.alt = ''
          icon.onerror = () => {
            icon.remove()
            emojiEl.textContent = nextLockedDef.emoji
          }
          emojiEl.appendChild(icon)
          const infoEl = document.createElement('div')
          const nameEl = document.createElement('strong')
          nameEl.textContent = nextLockedDef.name
          const descEl = document.createElement('small')
          descEl.className = 'biz-lock-desc'
          descEl.textContent = nextLockedDef.description
          const hintEl = document.createElement('small')
          hintEl.className = 'biz-lock-hint'
          hintEl.textContent = 'İşletmeler toplam kazanç ile açılır (cüzdan değil)'
          infoEl.append(nameEl, descEl, hintEl)
          inner.append(emojiEl, infoEl)
          const overlay = document.createElement('div')
          overlay.className = 'biz-locked-overlay'
          const lockIcon = document.createElement('span')
          lockIcon.className = 'biz-locked-icon'
          lockIcon.textContent = nextLockedDef.illegal ? '🕶️' : '🔒'
          const lockText = document.createElement('span')
          lockText.className = 'biz-locked-text'
          const earlyBtn = document.createElement('button')
          earlyBtn.type = 'button'
          earlyBtn.className = 'btn-early-unlock'
          earlyBtn.dataset.action = 'early-unlock'
          earlyBtn.dataset.id = nextLockedDef.id
          overlay.append(lockIcon, lockText, earlyBtn)
          lockedCard.append(inner, overlay)
          grid.appendChild(lockedCard)
        } else {
          lockedCard.dataset.producerId = nextLockedDef.id
        }
        const unlockAt = scaledUnlockAt(nextLockedDef)
        const pct = unlockAt > 0
          ? (state.totalEarned / unlockAt) * 100
          : 100
        const lockText = lockedCard.querySelector('.biz-locked-text')
        if (lockText) {
          const remaining = Math.max(0, unlockAt - state.totalEarned)
          const ipd = state.incomePerDay()
          const eta = ipd > 0 ? remaining / ipd : Infinity
          lockText.textContent = `${formatMoney(state.totalEarned)} / ${formatMoney(unlockAt)} kazanç · ~${this.formatEta(eta)}`
        }
        const earlyBtn = lockedCard.querySelector('.btn-early-unlock') as HTMLButtonElement | null
        if (earlyBtn) {
          const cost = earlyUnlockCost(nextLockedDef)
          const canAfford = state.canAfford(cost)
          earlyBtn.textContent = canAfford ? `Erken aç · ${formatMoney(cost)}` : `Erken aç · ${formatMoney(cost)} (yetersiz)`
          earlyBtn.disabled = !canAfford
          earlyBtn.title = `Cüzdandan ödenir · Normal açılış: ${formatMoney(unlockAt)} toplam kazanç`
        }
        let progressBar = lockedCard.querySelector('.unlock-progress') as HTMLElement | null
        if (!progressBar) {
          progressBar = this.createProgressBar(pct, 'unlock-progress')
          lockedCard.appendChild(progressBar)
        } else {
          const fill = progressBar.querySelector('.progress-fill') as HTMLElement
          if (fill) fill.style.width = `${Math.min(100, pct)}%`
        }
      } else {
        panel.querySelector('.biz-card-locked-preview')?.remove()
      }
    }

    if (!patchOnly && panel.querySelectorAll('.biz-card:not([hidden]):not(.biz-card-locked-preview)').length === 0 && visibleIds.size === 0) {
      let empty = panel.querySelector('.empty-state') as HTMLElement | null
      if (!empty) {
        empty = this.createEmptyState('🏢', 'Daha fazla kazan', 'Yeni işletmeler açılacak')
        panel.appendChild(empty)
      }
    } else {
      panel.querySelector('.empty-state')?.remove()
    }
  }

  private createBusinessCard(p: ProducerDef): HTMLDivElement {
    const card = document.createElement('div')
    card.className = 'biz-card'
    card.dataset.producerId = p.id

    const infoBtn = document.createElement('button')
    infoBtn.type = 'button'
    infoBtn.className = 'biz-info-btn'
    infoBtn.dataset.action = 'biz-detail'
    infoBtn.dataset.id = p.id
    infoBtn.textContent = 'ℹ️'
    infoBtn.title = 'Gelir dökümü'

    const buyBtn = document.createElement('button')
    buyBtn.type = 'button'
    buyBtn.className = 'biz-buy-btn'
    buyBtn.dataset.action = 'buy-business'
    buyBtn.dataset.id = p.id

    const top = document.createElement('div')
    top.className = 'biz-top'
    const left = document.createElement('div')
    left.className = 'biz-left'
    const emoji = document.createElement('span')
    emoji.className = 'biz-emoji'
    const icon = document.createElement('img')
    icon.className = 'biz-icon'
    icon.src = producerIconPath(p.id)
    icon.alt = ''
    icon.onerror = () => {
      icon.remove()
      emoji.textContent = p.emoji
    }
    emoji.appendChild(icon)
    const info = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = p.name
    const desc = document.createElement('small')
    desc.textContent = p.description
    info.append(name, desc)
    left.append(emoji, info)
    const countEl = document.createElement('span')
    countEl.className = 'biz-owned'
    top.append(left, countEl)

    const milestoneDots = document.createElement('div')
    milestoneDots.className = 'biz-milestone-dots'
    for (const ms of MILESTONES) {
      const dot = document.createElement('span')
      dot.className = 'biz-milestone-dot'
      dot.dataset.milestone = String(ms)
      dot.title = `${ms} adet`
      milestoneDots.appendChild(dot)
    }

    const bottom = document.createElement('div')
    bottom.className = 'biz-bottom'
    const costEl = document.createElement('span')
    costEl.className = 'biz-cost'
    const inc = document.createElement('span')
    inc.className = 'biz-income'
    bottom.append(costEl, inc)

    buyBtn.append(top, milestoneDots, bottom)
    card.append(buyBtn, infoBtn)

    const tierBadge = document.createElement('div')
    tierBadge.className = `biz-tier-badge biz-tier-${p.tier}`
    tierBadge.textContent = `T${p.tier}`
    card.appendChild(tierBadge)

    if (p.illegal) {
      const riskBadge = document.createElement('span')
      riskBadge.className = 'biz-risk-badge'
      riskBadge.textContent = '🕶️ Risk'
      card.appendChild(riskBadge)
    }

    return card
  }

  private updateBusinessCard(
    card: HTMLDivElement,
    p: ProducerDef,
    state: GameState,
    owned: number,
    count: number,
  ): void {
    const affordableCount = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : count
    const buyCount = this.buyMode === 'max' ? Math.max(1, affordableCount) : count
    const cost = state.producerCostFor(p, owned, buyCount)
    const income = state.producerIncome(p)
    const affordable = affordableCount >= 1 && state.canAfford(cost)

    const buyBtn = card.querySelector('.biz-buy-btn') as HTMLButtonElement
    if (buyBtn) {
      buyBtn.dataset.count = String(affordableCount >= 1 ? affordableCount : 1)
      buyBtn.disabled = !affordable
    }
    card.classList.toggle('affordable', affordable)

    const ownedEl = card.querySelector('.biz-owned')
    const costEl = card.querySelector('.biz-cost')
    const incEl = card.querySelector('.biz-income')
    const ownedText = owned > 0 ? `${owned} adet` : 'Yeni'
    const costText = this.buyMode === 'max' && affordableCount > 1
      ? `${formatMoney(cost)} (${affordableCount} adet)`
      : formatMoney(cost)
    const incText = owned > 0
      ? formatIncomeRate(income)
      : `+${formatIncomeRate(state.marginalProducerIncome(p, 1))}`
    const roiSec = producerRoiSeconds(state, p, buyCount)
    const roiText = `ROI ~${formatRoi(roiSec)}`

    if (ownedEl && ownedEl.textContent !== ownedText) ownedEl.textContent = ownedText
    if (costEl && costEl.textContent !== costText) costEl.textContent = costText
    if (incEl && incEl.textContent !== incText) incEl.textContent = incText

    let roiEl = card.querySelector('.biz-roi') as HTMLElement | null
    if (!roiEl) {
      roiEl = document.createElement('span')
      roiEl.className = 'biz-roi'
      card.querySelector('.biz-bottom')?.appendChild(roiEl)
    }
    if (roiEl.textContent !== roiText) roiEl.textContent = roiText

    const synIds = getActiveSynergies(state.producers).flatMap((s) => [...s.def.requires, s.def.targetProducer ?? ''])
    let synBadge = card.querySelector('.biz-synergy-badge') as HTMLElement | null
    if (synIds.includes(p.id)) {
      if (!synBadge) {
        synBadge = document.createElement('span')
        synBadge.className = 'biz-synergy-badge'
        card.appendChild(synBadge)
      }
      synBadge.textContent = '⚡ Sinerji'
      synBadge.hidden = false
    } else if (synBadge) synBadge.hidden = true

    card.querySelectorAll('.biz-milestone-dot').forEach((dot) => {
      const ms = Number((dot as HTMLElement).dataset.milestone)
      dot.classList.toggle('reached', owned >= ms)
    })

    if (p.illegal && p.riskChance) {
      const riskBadge = card.querySelector('.biz-risk-badge')
      const chancePct = Math.round(p.riskChance * 100 * (1 + state.illegalHeat / 100))
      if (riskBadge) riskBadge.textContent = `🕶️ Baskın ~${chancePct}%/dk`
    }
  }

  private renderManagement(state: GameState): void {
    const panel = this.panels.management!
    panel.replaceChildren()

    const ownedProducers = PRODUCERS
      .filter((p) => (state.producers[p.id] ?? 0) > 0)
      .sort((a, b) => state.producerIncome(b) - state.producerIncome(a))
    const hiredCount = ownedProducers.filter((p) => hasManager(state.managers, p.id)).length
    const ownedCount = ownedProducers.length
    const missing = ownedCount - hiredCount
    panel.appendChild(this.createTabHero('👔', 'Yönetim Merkezi', 'Yöneticiler geliri artırır; yokken biriken kazancı yükseltir (reklamla toplanır)', `${hiredCount}/${ownedCount} aktif`))

    if (missing > 0) {
      const summary = document.createElement('div')
      summary.className = 'manager-summary-banner'
      summary.textContent = `${missing} işletmede yönetici eksik — toplu işe almayı düşün`
      panel.appendChild(summary)
    }

    for (const p of ownedProducers) {
      const owned = state.producers[p.id] ?? 0
      const hired = hasManager(state.managers, p.id)
      const cost = managerCost(p.baseIncome, owned)
      const autoOn = state.managerAutoBuy[p.id]
      const income = state.producerIncome(p)

      const card = document.createElement('div')
      card.className = `shop-card manager-card${hired ? ' manager-active' : ''}`

      const portrait = document.createElement('div')
      portrait.className = 'manager-portrait'
      portrait.textContent = p.emoji

      const info = document.createElement('div')
      info.className = 'manager-info'
      const name = document.createElement('strong')
      name.textContent = p.name
      const desc = document.createElement('small')
      desc.textContent = hired ? 'Yönetici aktif (+25% gelir, yokken +50% birikim)' : 'Yönetici işe al — pasif gelir artar'
      const incomeChip = document.createElement('span')
      incomeChip.className = 'manager-income-chip'
      incomeChip.textContent = formatIncomeRate(income)
      info.append(name, desc, incomeChip)

      const badges = document.createElement('div')
      badges.className = 'manager-badges'
      if (hired) {
        const statusBadge = document.createElement('span')
        statusBadge.className = 'manager-status-badge active'
        statusBadge.textContent = 'Aktif'
        badges.appendChild(statusBadge)
        if (autoOn) {
          const autoBadge = document.createElement('span')
          autoBadge.className = 'manager-status-badge auto'
          autoBadge.textContent = 'Auto'
          badges.appendChild(autoBadge)
        }
      } else {
        const chip = document.createElement('span')
        chip.className = 'manager-bonus-chip'
        chip.textContent = '+25% gelir'
        badges.appendChild(chip)
      }

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      body.append(info, badges)

      const actions = document.createElement('div')
      actions.className = 'shop-card-actions'

      if (!hired) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary'
        btn.dataset.action = 'hire-manager'
        btn.dataset.id = p.id
        btn.textContent = `İşe al — ${formatMoney(state.managerDiscountActive ? cost * 0.5 : cost)}`
        btn.disabled = !state.canAfford(state.managerDiscountActive ? cost * 0.5 : cost)
        actions.appendChild(btn)
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-ad'
        adBtn.dataset.action = 'ad-manager-discount'
        adBtn.dataset.id = p.id
        adBtn.textContent = '📺 %50 indirim'
        actions.appendChild(adBtn)
      } else {
        const autoBtn = document.createElement('button')
        autoBtn.type = 'button'
        autoBtn.className = 'btn-secondary auto-buy-btn'
        autoBtn.dataset.action = 'toggle-autobuy'
        autoBtn.dataset.id = p.id
        autoBtn.textContent = autoOn ? '🤖 Auto: Açık' : '🤖 Auto: Kapalı'
        actions.appendChild(autoBtn)
      }

      card.append(portrait, body, actions)
      panel.appendChild(card)
    }

    if (panel.querySelectorAll('.manager-card').length === 0) {
      panel.appendChild(this.createEmptyState('👔', 'Henüz yönetici yok', 'Önce işletme satın al'))
    }
  }

  private renderUpgrades(state: GameState): void {
    const panel = this.panels.upgrades!
    panel.replaceChildren()
    const allAvailable = state.availableUpgrades()
    const filterMap: Record<UpgradeFilter, (u: UpgradeDef) => boolean> = {
      all: () => true,
      click: (u) => u.effect === 'click_mult',
      global: (u) => u.effect === 'global_mult',
      producer: (u) => u.effect === 'producer_mult',
    }
    const list = allAvailable.filter(filterMap[this.upgradeFilter])
    const purchased = UPGRADES.filter((u) => state.purchasedUpgrades.has(u.id))

    panel.appendChild(this.createTabHero('⬆️', 'Yükseltmeler', 'Kalıcı güç artışları — stratejik seçimler yap', `${list.length} mevcut`))
    panel.appendChild(this.createFilterPills([
      { id: 'all', label: 'Tümü' },
      { id: 'click', label: 'Tıklama' },
      { id: 'global', label: 'Global' },
      { id: 'producer', label: 'İşletme' },
    ], this.upgradeFilter, 'upgrade-filter'))

    const upgradeGrid = document.createElement('div')
    upgradeGrid.className = 'upgrade-cards-grid'

    if (list.length === 0 && purchased.length === 0) {
      panel.appendChild(this.createEmptyState('⬆️', 'Tüm yükseltmeler alındı!', 'IPO sonrası yeni bonuslar açılabilir'))
      return
    }

    if (list.length === 0) {
      panel.appendChild(this.createEmptyState('⬆️', 'Bu kategoride yükseltme yok', 'Başka filtre dene'))
    }

    for (const u of list) {
      const upgradeCost = state.upgradeCostFor(u)
      const affordable = state.canAfford(upgradeCost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card shop-card-upgrade${affordable ? ' affordable' : ''}`
      card.dataset.action = 'buy-upgrade'
      card.dataset.id = u.id
      card.disabled = !affordable

      const icon = document.createElement('span')
      icon.className = 'shop-card-icon'
      icon.textContent = this.upgradeEffectIcon(u)

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      const name = document.createElement('strong')
      name.textContent = u.name
      const desc = document.createElement('small')
      desc.textContent = u.description
      const tag = document.createElement('span')
      tag.className = 'shop-effect-tag'
      tag.textContent = this.upgradeEffectLabel(u)
      body.append(name, desc, tag)

      const price = document.createElement('span')
      price.className = 'shop-card-price'
      price.textContent = formatMoney(upgradeCost)

      card.append(icon, body, price)
      upgradeGrid.appendChild(card)
    }
    panel.appendChild(upgradeGrid)

    if (purchased.length > 0) {
      const details = document.createElement('details')
      details.className = 'purchased-upgrades-section'
      const summary = document.createElement('summary')
      summary.textContent = `Satın alınanlar (${purchased.length})`
      details.appendChild(summary)
      for (const u of purchased) {
        const row = document.createElement('div')
        row.className = 'purchased-upgrade-row'
        row.innerHTML = `<span>${this.upgradeEffectIcon(u)} ${u.name}</span><small>${this.upgradeEffectLabel(u)}</small>`
        details.appendChild(row)
      }
      panel.appendChild(details)
    }

    this.renderPowerupAdCards(state, panel)
  }

  private renderPowerupAdCards(state: GameState, panel: HTMLElement): void {
    let ads = panel.querySelector('.shop-ad-cards') as HTMLElement | null
    if (!ads) {
      ads = document.createElement('div')
      ads.className = 'shop-ad-cards'
      panel.appendChild(ads)
    }
    ads.replaceChildren()
    const boost = document.createElement('button')
    boost.type = 'button'
    boost.className = 'shop-ad-card'
    boost.dataset.action = 'ad-shop-boost'
    boost.innerHTML = '<span>📺</span><div><strong>15 dk +50% gelir</strong><small>Reklam izle</small></div>'
    boost.disabled = state.isShopBoostActive()
    const disc = document.createElement('button')
    disc.type = 'button'
    disc.className = 'shop-ad-card'
    disc.dataset.action = 'ad-upgrade-discount'
    disc.innerHTML = '<span>📺</span><div><strong>Sonraki yükseltme −30%</strong><small>Tek kullanım</small></div>'
    disc.disabled = state.upgradeDiscountActive
    ads.append(boost, disc)
  }

  private renderResearch(state: GameState): void {
    const panel = this.panels.research!
    panel.replaceChildren()
    const totalLevels = RESEARCH_NODES.reduce((s, n) => s + (state.research[n.id] ?? 0), 0)
    const maxLevels = RESEARCH_NODES.reduce((s, n) => s + n.maxLevel, 0)
    panel.appendChild(this.createTabHero('🔬', 'Ar-Ge Laboratuvarı', 'Uzun vadeli bonuslar — her seviye kalıcı etki', `${totalLevels}/${maxLevels} seviye`))

    const treeGrid = document.createElement('div')
    treeGrid.className = 'research-tree-grid'

    for (const node of RESEARCH_NODES) {
      const level = state.research[node.id] ?? 0
      const maxed = level >= node.maxLevel
      const cost = state.researchCostWithWeekly(researchCost(node, level))
      const canBuy = !maxed && (node.currency === 'money' ? state.canAfford(cost) : state.prestigePoints >= cost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card shop-card-research research-tree-node${canBuy ? ' affordable' : ''}${maxed ? ' research-maxed' : ''}${node.currency === 'prestige' ? ' research-prestige' : ' research-money'}`
      card.dataset.action = 'buy-research'
      card.dataset.id = node.id
      card.disabled = !canBuy

      const icon = document.createElement('span')
      icon.className = 'shop-card-icon'
      icon.textContent = '🔬'

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      const name = document.createElement('strong')
      name.textContent = node.name
      const desc = document.createElement('small')
      desc.textContent = node.description
      const dots = document.createElement('div')
      dots.className = 'research-level-dots'
      for (let i = 0; i < node.maxLevel; i++) {
        const dot = document.createElement('span')
        dot.className = `research-level-dot${i < level ? ' filled' : ''}`
        dots.appendChild(dot)
      }
      const levelLabel = document.createElement('span')
      levelLabel.className = 'shop-level-label'
      levelLabel.textContent = `${level}/${node.maxLevel}`
      body.append(name, desc, dots, levelLabel)

      const price = document.createElement('span')
      price.className = `shop-card-price${node.currency === 'prestige' ? ' price-prestige' : ''}`
      price.textContent = maxed ? 'Tamam' : node.currency === 'money' ? formatMoney(cost) : `${cost} hisse`

      card.append(icon, body, price)
      treeGrid.appendChild(card)
    }
    panel.appendChild(treeGrid)
  }

  private renderIpo(state: GameState): void {
    const panel = this.panels.ipo!
    panel.replaceChildren()

    panel.appendChild(this.createTabHero('📈', 'Finans Merkezi', 'Borsa, prestij ağacı ve şirket birleşmesi', `${state.prestigePoints} kalıcı hisse`))

    if (this.ipoSubTab === 'stock') this.renderIpoStock(state, panel)
    else if (this.ipoSubTab === 'bank') this.renderIpoBank(state, panel)
    else if (this.ipoSubTab === 'prestige') this.renderIpoPrestige(state, panel)
    else this.renderIpoMerge(state, panel)
  }

  private renderIpoStock(state: GameState, panel: HTMLElement): void {
    const summary = portfolioSummary(state.stock)
    const tickerCount = STOCK_DEFS.length

    const macro = document.createElement('div')
    macro.className = 'finance-macro-bar'
    const ratePct = (state.stock.centralBankRate * 100).toFixed(1)
    const fear = state.stock.marketFear
    macro.innerHTML = `
      <div class="finance-macro-stat"><small>Merkez faiz</small><strong>%${ratePct}</strong></div>
      <div class="finance-macro-stat"><small>Korku endeksi</small><strong class="${fear >= 60 ? 'pl-negative' : fear <= 35 ? 'pl-positive' : ''}">${Math.round(fear)} · ${fearLabel(fear)}</strong></div>
      <div class="finance-macro-stat"><small>Net değer</small><strong>${formatMoney(state.financeNetWorth())}</strong></div>
    `
    if (state.stock.macroHeadline) {
      const headline = document.createElement('p')
      headline.className = 'finance-macro-headline'
      headline.textContent = state.stock.macroHeadline
      macro.appendChild(headline)
    }
    panel.appendChild(macro)

    const portfolioEl = document.createElement('div')
    portfolioEl.className = 'stock-portfolio-summary'
    const portfolioPlClass = summary.totalPl >= 0 ? 'pl-positive' : 'pl-negative'
    portfolioEl.innerHTML = `
      <div class="stock-portfolio-stat"><strong>${formatMoney(summary.totalValue)}</strong><small>Portföy değeri</small></div>
      <div class="stock-portfolio-stat"><strong>${summary.holdings}/${tickerCount}</strong><small>Pozisyon</small></div>
      <div class="stock-portfolio-stat"><strong class="${portfolioPlClass}">${formatMoney(summary.totalPl)}</strong><small>Toplam K/Z</small></div>
      <div class="stock-portfolio-stat"><strong>${formatMoney(state.money)}</strong><small>Nakit</small></div>
    `
    panel.appendChild(portfolioEl)

    const tickerTabs = document.createElement('div')
    tickerTabs.className = 'ticker-tabs'
    for (const def of STOCK_DEFS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ticker-tab'
      btn.dataset.action = 'stock-ticker'
      btn.dataset.id = def.id
      if (state.stock.activeTickerId === def.id) btn.classList.add('active')
      btn.textContent = `${def.emoji} ${def.name}`
      tickerTabs.appendChild(btn)
    }
    panel.appendChild(tickerTabs)

    const ticker = state.stock.tickers[state.stock.activeTickerId]!
    const pl = profitLoss(ticker)
    const plClass = pl >= 0 ? 'pl-positive' : 'pl-negative'
    const chg = priceChangePct(ticker)
    const chgClass = chg >= 0 ? 'pl-positive' : 'pl-negative'

    const stockCard = document.createElement('div')
    stockCard.className = 'shop-card stock-card'

    const stockTitle = document.createElement('h3')
    stockTitle.className = 'stock-card-title'
    stockTitle.textContent = `${ticker.emoji} ${ticker.name}`

    const priceRow = document.createElement('div')
    priceRow.className = 'stock-price-row'
    const trend = state.stock.trendDirection === 'up' ? '↑' : state.stock.trendDirection === 'down' ? '↓' : '→'
    priceRow.innerHTML = `<strong>${formatMoney(ticker.price)}</strong> <span class="stock-trend">${trend}</span> <span class="stock-change ${chgClass}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</span>`

    const detailGrid = document.createElement('div')
    detailGrid.className = 'stock-detail-grid'
    detailGrid.innerHTML = `
      <span><small>Lot</small><strong>${ticker.shares}</strong></span>
      <span><small>Ort. maliyet</small><strong>${ticker.shares > 0 ? formatMoney(ticker.avgBuyPrice) : '—'}</strong></span>
      <span><small>Pozisyon değeri</small><strong>${formatMoney(ticker.shares * ticker.price)}</strong></span>
      <span><small>K/Z</small><strong class="${plClass}">${formatMoney(pl)}</strong></span>
    `

    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    spark.setAttribute('class', 'stock-sparkline stock-sparkline-lg')
    spark.setAttribute('viewBox', '0 0 120 40')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', sparklinePath(ticker.history, 120, 40))
    path.setAttribute('fill', 'none')
    const trendColor = state.stock.trendDirection === 'up' ? '#34d399' : state.stock.trendDirection === 'down' ? '#f87171' : '#60a5fa'
    path.setAttribute('stroke', trendColor)
    path.setAttribute('stroke-width', '2')
    spark.appendChild(path)

    const stockInfo = document.createElement('p')
    stockInfo.className = 'stock-info'
    const bankrupt = isBankruptTicker(state.stock, ticker.id)
    stockInfo.textContent = bankrupt
      ? `⚠️ İflas riski — fiyat baskı altında · Volatilite ${Math.round(ticker.volatility * 100)}%`
      : `Sektör: ${ticker.sector} · Volatilite ${Math.round(ticker.volatility * 100)}% · Fiyat ~30 sn'de güncellenir`

    stockCard.append(stockTitle, priceRow, detailGrid, spark, stockInfo)
    panel.appendChild(stockCard)

    const holdingsTitle = document.createElement('h4')
    holdingsTitle.className = 'stock-holdings-title'
    holdingsTitle.textContent = 'Tüm Hisseler'
    panel.appendChild(holdingsTitle)

    const holdingsGrid = document.createElement('div')
    holdingsGrid.className = 'stock-holdings-grid'
    for (const def of STOCK_DEFS) {
      const t = state.stock.tickers[def.id]!
      const tPl = profitLoss(t)
      const tChg = priceChangePct(t)
      const card = document.createElement('button')
      card.type = 'button'
      card.className = `stock-holding-card${state.stock.activeTickerId === def.id ? ' active' : ''}`
      card.dataset.action = 'stock-ticker'
      card.dataset.id = def.id
      card.innerHTML = `
        <span class="stock-holding-emoji">${def.emoji}</span>
        <strong>${formatMoney(t.price)}</strong>
        <small>${t.shares > 0 ? `${t.shares} lot · ${formatMoney(tPl)}` : 'Pozisyon yok'}</small>
        <small class="stock-change ${tChg >= 0 ? 'pl-positive' : 'pl-negative'}">${tChg >= 0 ? '+' : ''}${tChg.toFixed(1)}%</small>
      `
      holdingsGrid.appendChild(card)
    }
    panel.appendChild(holdingsGrid)

    if (Date.now() < state.stock.trendHintUntil) {
      const hint = document.createElement('p')
      hint.className = 'stock-hint'
      hint.textContent = `Piyasa ipucu: trend ${state.stock.trendDirection === 'up' ? 'YUKARI' : state.stock.trendDirection === 'down' ? 'AŞAĞI' : 'YATAY'}`
      panel.appendChild(hint)
    }
    if (Date.now() < state.stock.marketEventUntil) {
      const ev = document.createElement('p')
      ev.className = 'market-event-banner'
      ev.textContent = state.stock.marketEventMult < 0 ? '📉 Piyasa çöküşü!' : '📈 Piyasa rallisi!'
      panel.appendChild(ev)
    }

    const stockActions = document.createElement('div')
    stockActions.className = 'stock-actions'
    for (const [action, label, count] of [
      ['stock-buy', 'Al 1', '1'],
      ['stock-buy', 'Al 10', '10'],
      ['stock-sell', 'Sat 1', '1'],
      ['stock-sell', 'Sat hepsi', 'max'],
    ] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = action.includes('buy') ? 'btn-buy-stock' : 'btn-sell-stock'
      btn.dataset.action = action
      btn.dataset.count = count
      btn.textContent = label
      stockActions.appendChild(btn)
    }
    panel.appendChild(stockActions)

    const hintAd = document.createElement('button')
    hintAd.type = 'button'
    hintAd.className = 'btn-ad stock-hint-btn'
    hintAd.dataset.action = 'ad-stock-hint'
    hintAd.textContent = state.isStockHintFree() ? '📊 Ücretsiz piyasa analizi (1 saat)' : '📺 Piyasa analizi — reklam izle'
    panel.appendChild(hintAd)

    if (this.highlightStockTicker) {
      panel.querySelectorAll('.ticker-tab').forEach((el) => {
        el.classList.toggle('ticker-highlight', (el as HTMLElement).dataset.id === this.highlightStockTicker)
      })
      this.highlightStockTicker = null
    }
  }

  private renderIpoBank(state: GameState, panel: HTMLElement): void {
    const bank = state.bank
    const rate = state.stock.centralBankRate
    const dRate = (depositRate(rate) * 100).toFixed(2)
    const bRate = (bondRate(rate) * 100).toFixed(2)
    const lRate = (loanRate(rate, bank.creditScore) * 100).toFixed(2)
    const maxLoan = state.maxAvailableLoan()

    panel.appendChild(this.createSectionHeader('Merkez Bankası & Mevduat', `Kredi skoru: ${Math.round(bank.creditScore)}/100`))

    const overview = document.createElement('div')
    overview.className = 'bank-overview-grid'
    overview.innerHTML = `
      <div class="bank-stat"><small>Mevduat faizi</small><strong>%${dRate}/dk</strong></div>
      <div class="bank-stat"><small>Tahvil getirisi</small><strong>%${bRate}/dk</strong></div>
      <div class="bank-stat"><small>Kredi faizi</small><strong>%${lRate}/dk</strong></div>
      <div class="bank-stat"><small>Merkez faiz</small><strong>%${(rate * 100).toFixed(1)}</strong></div>
    `
    panel.appendChild(overview)

    const accounts = document.createElement('div')
    accounts.className = 'bank-accounts'
    accounts.innerHTML = `
      <div class="bank-account-card">
        <h4>💰 Vadesiz mevduat</h4>
        <strong>${formatMoney(bank.deposit)}</strong>
        <small>Güvenli · anında çekilir · faiz kazanır</small>
      </div>
      <div class="bank-account-card">
        <h4>📜 Devlet tahvili</h4>
        <strong>${formatMoney(bank.bonds)}</strong>
        <small>Daha yüksek getiri · faiz riski düşük</small>
      </div>
      <div class="bank-account-card${bank.loan > 0 ? ' bank-debt' : ''}">
        <h4>🏦 Kredi borcu</h4>
        <strong>${formatMoney(bank.loan)}</strong>
        <small>Limit: ${formatMoney(maxLoan)} · gecikme iflas riski</small>
      </div>
    `
    panel.appendChild(accounts)

    const warn = document.createElement('p')
    warn.className = 'bank-warn'
    warn.textContent = bank.loan > state.financeNetWorth() * 0.5
      ? '⚠️ Borç yüksek — faiz ödeyemezsen iflas koruması hisselerini ucuz satar.'
      : 'Faiz her dakika işler. Korku endeksi yüksekken borsa daha oynak, iflas haberleri gelebilir.'
    panel.appendChild(warn)

    const actions = (title: string, btns: [string, string, string][]) => {
      const wrap = document.createElement('div')
      wrap.className = 'bank-action-group'
      const h = document.createElement('h4')
      h.textContent = title
      wrap.appendChild(h)
      const row = document.createElement('div')
      row.className = 'bank-action-row'
      for (const [action, label, count] of btns) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = action.includes('loan') && action.includes('take') ? 'btn-buy-stock' : 'btn-secondary btn-sm'
        btn.dataset.action = action
        btn.dataset.count = count
        btn.textContent = label
        row.appendChild(btn)
      }
      wrap.appendChild(row)
      return wrap
    }

    panel.appendChild(actions('Mevduat', [
      ['bank-deposit', 'Yatır 1K', '1000'],
      ['bank-deposit', 'Yatır 10K', '10000'],
      ['bank-deposit', 'Yatır max', 'max'],
      ['bank-withdraw', 'Çek 1K', '1000'],
      ['bank-withdraw', 'Çek max', 'max'],
    ]))
    panel.appendChild(actions('Tahvil', [
      ['bank-buy-bonds', 'Al 5K', '5000'],
      ['bank-buy-bonds', 'Al max', 'max'],
      ['bank-sell-bonds', 'Sat max', 'max'],
    ]))
    panel.appendChild(actions('Kredi', [
      ['bank-loan', 'Çek 25K', '25000'],
      ['bank-loan', 'Çek max', 'max'],
      ['bank-repay', 'Öde 10K', '10000'],
      ['bank-repay', 'Öde max', 'max'],
    ]))
  }

  private renderIpoPrestige(state: GameState, panel: HTMLElement): void {
    panel.appendChild(this.createSectionHeader('Prestij Ağacı', `${state.prestigePoints} harcanabilir puan`))

    const treeGrid = document.createElement('div')
    treeGrid.className = 'prestige-tree-grid'
    for (const node of PRESTIGE_TREE_NODES) {
      const owned = hasNode(state.prestigeTree, node.id)
      const canBuy = canBuyNode(state.prestigeTree, node, state.prestigePoints)
      const card = document.createElement('button')
      card.type = 'button'
      card.className = `tree-node ${owned ? 'owned' : canBuy ? 'available' : 'locked'}`
      card.dataset.action = owned ? '' : 'buy-tree-node'
      card.dataset.id = node.id
      card.disabled = owned || !canBuy
      card.innerHTML = `<strong>${node.name}</strong><small>${node.description}</small><span>${owned ? '✓' : `${node.cost} puan`}</span>`
      treeGrid.appendChild(card)
    }
    panel.appendChild(treeGrid)
  }

  private renderIpoMerge(state: GameState, panel: HTMLElement): void {
    panel.appendChild(this.createSectionHeader('Şirket Birleşmesi & IPO'))

    const preview = state.ipoPreview()
    const ipoCard = document.createElement('div')
    ipoCard.className = 'shop-card ipo-card'
    const currentMult = prestigeMultiplier(state.prestigePoints)
    const remaining = Math.max(0, PRESTIGE_THRESHOLD - state.totalEarned)

    const stats = document.createElement('div')
    stats.className = 'ipo-stats-grid'
    stats.innerHTML = `
      <span><small>Mevcut hisse</small><strong>${Math.floor(state.prestigePoints)}</strong></span>
      <span><small>Kalıcı çarpan</small><strong>x${currentMult.toFixed(2)}</strong></span>
      <span><small>IPO sayısı</small><strong>${state.ipoCount}</strong></span>
      <span><small>Başlangıç sermayesi</small><strong>${formatMoney(preview.startingCash)}</strong></span>
    `
    ipoCard.appendChild(stats)

    const steps = document.createElement('ol')
    steps.className = 'ipo-steps'
    steps.innerHTML = `
      <li>Borsa ve mevduatın nakde çevrilir (kredi kapanır)</li>
      <li>Run sıfırlanır — işletmeler, yükseltmeler, yöneticiler gider</li>
      <li>Kalıcı prestij hissesi + ${formatMoney(preview.startingCash)} ile yeni tur başlar</li>
      <li>Prestij ağacı, Ar-Ge, hanedan ve imparatorluk korunur</li>
    `
    ipoCard.appendChild(steps)

    const info = document.createElement('p')
    info.className = 'ipo-info-text'
    info.textContent = preview.pointsToEarn > 0
      ? `Hazırsın: +${preview.pointsToEarn} kalıcı hisse · çarpan x${currentMult.toFixed(2)} → x${preview.newMultiplier.toFixed(2)} · portföy ${formatMoney(preview.portfolioValue)} satılacak`
      : `IPO için ${formatMoney(PRESTIGE_THRESHOLD)} toplam kazanç gerekir. Şu an ${formatMoney(state.totalEarned)} — ${formatMoney(remaining)} kaldı.`

    const ipoPct = Math.min(100, (state.totalEarned / PRESTIGE_THRESHOLD) * 100)
    const bar = document.createElement('div')
    bar.className = 'progress-bar ipo-progress-bar'
    const fill = document.createElement('div')
    fill.className = `progress-fill ipo-progress-fill${ipoPct >= 80 ? ' ipo-near' : ''}`
    fill.style.width = `${ipoPct}%`
    bar.appendChild(fill)
    for (const ms of [25, 50, 75]) {
      const tick = document.createElement('div')
      tick.className = 'ipo-milestone-tick'
      tick.style.left = `${ms}%`
      bar.appendChild(tick)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-prestige'
    btn.dataset.action = 'ipo'
    btn.textContent = state.prestigeEligible()
      ? `🚀 IPO Yap · ${formatMoney(preview.startingCash)} ile başla`
      : `IPO için ${formatMoney(remaining)} kaldı`
    btn.disabled = !state.prestigeEligible()

    ipoCard.append(info, bar, btn)
    panel.appendChild(ipoCard)
  }
}
