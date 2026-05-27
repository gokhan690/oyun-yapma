import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, formatMoney, formatIncomeRate, producerIconPath, earlyUnlockCost, isProducerUnlocked, scaledUnlockAt, scaledBaseIncome, producerCategory, producerName, producerDesc, upgradeName, upgradeDesc, type ProducerDef, type UpgradeDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost, researchNodesByBranch, researchIsUnlocked, researchPrereqName, researchNodeName, researchNodeDesc, type ResearchBranch } from '../../game/Research'
import { reputationLoanBlocked } from '../../game/Reputation'
import { NAMED_MANAGERS } from '../../game/NamedManagers'
import { getActiveSynergies, getNearSynergies, synergyName } from '../../game/Synergies'
import { tRaw } from '../../i18n'
import {
  isShopHubLocked,
  shopHubLockReason,
  type ShopHubLock,
} from '../../game/ProgressiveUnlock'
import { PRESTIGE_THRESHOLD, ipoThreshold } from '../../game/Prestige'
import {
  renderCommoditiesPanel,
  renderInsurancePanel,
  renderOpportunitiesPanel,
  renderUndergroundMarketPanel,
} from './shop/ShopAltFinancePanels'
import {
  BIZ_TIER_BANDS,
  activeTierBandId,
  bandUnlocked,
  filterProducersForShop,
  producersInBand,
  renderLockedPreviewCard,
  tierBandLabel,
} from './shop/ShopBusinessTierView'
import { prestigeMultiplier } from '../../game/Prestige'
import { managerCost, hasManager } from '../../game/Managers'
import { profitLoss, priceChangePct, portfolioSummary, sparklinePath, STOCK_DEFS, fearLabel, isBankruptTicker } from '../../game/StockMarket'
import { depositRate, bondRate, loanRate, projectInterestTick, interestTickCountdownMs, INTEREST_TICK_MS } from '../../game/FinanceBank'
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
import { modernizeCost } from '../../game/TechObsolescence'
import { appendFranchiseSection, franchiseNearCount, franchiseReadyCount } from './shop/FranchiseBlock'
import { ADVISOR_FEE } from '../../game/AdvisorNPC'
import { t as i18nT } from '../../i18n'

export type BuyMode = 1 | 10 | 100 | 'max'
export type ShopHub = 'growth' | 'powerup' | 'finance' | 'empire'
export type GrowthSub = 'businesses' | 'management'
export type PowerupSub = 'upgrades' | 'research'
export type EmpireSub = 'sport' | 'politics' | 'dark' | 'luxury' | 'finance' | 'science'
export type IpoSubTab = 'stock' | 'bank' | 'prestige' | 'ipo' | 'insurance' | 'commodities' | 'opportunities' | 'underground_market'
export type UpgradeFilter = 'all' | 'click' | 'global' | 'producer'
export type BizTypeFilter = 'all' | 'legal' | 'illegal' | 'sport' | 'politics' | 'dark' | 'luxury' | 'finance' | 'science'

const HUB_SUBTITLES = (): Record<ShopHub, string> => ({
  growth: i18nT('shop_sub_growth'),
  powerup: i18nT('shop_sub_powerup'),
  finance: i18nT('shop_sub_finance'),
  empire: i18nT('shop_sub_empire'),
})

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
  private shopMetaHintsEl!: HTMLElement
  private subTabsEl!: HTMLElement
  private businessCards = new Map<string, HTMLDivElement>()
  private expandedBands = new Set<string>(['starter'])
  private tierBandsInit = false
  private synergyEl: HTMLElement | null = null
  private hubLabelEls = new Map<ShopHub, HTMLElement>()
  private ipoSubTab: IpoSubTab = 'stock'
  private upgradeFilter: UpgradeFilter = 'all'
  private researchBranch: ResearchBranch | 'all' = 'all'
  private bizTypeFilter: BizTypeFilter = 'all'
  private empireSub: EmpireSub = 'sport'
  private empireCards = new Map<string, HTMLDivElement>()
  private bizSortOrder: BizSortOrder = 'profit'
  private viewContext: 'shop' | 'market' = 'shop'
  private titleEl!: HTMLElement

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
    if (id === 'sport' || id === 'politics' || id === 'dark' || id === 'luxury' || id === 'finance' || id === 'science') {
      return { hub: 'empire', empireSub: id }
    }
    if (id === 'ipo' || id === 'stock' || id === 'bank' || id === 'prestige' || id === 'insurance' || id === 'commodities' || id === 'opportunities' || id === 'underground_market') {
      return { hub: 'finance', ipoSub: (['stock', 'bank', 'prestige', 'insurance', 'commodities', 'opportunities', 'underground_market'].includes(id) ? id : this.ipoSubTab) as IpoSubTab }
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
    title.textContent = i18nT('shop_context_business')
    this.titleEl = title
    this.shopSubEl = document.createElement('span')
    this.shopSubEl.className = 'shop-sub'
    this.shopSubEl.textContent = HUB_SUBTITLES().growth
    header.append(title, this.shopSubEl)

    const buyModes = document.createElement('div')
    buyModes.className = 'buy-modes'
    this.buyModesEl = buyModes
    for (const mode of ['1', '10', '100', 'max'] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'buy-mode-btn'
      btn.dataset.action = 'buy-mode'
      btn.dataset.count = mode
      btn.textContent = mode === 'max' ? 'MAX' : `×${mode}`
      if (mode === '1') btn.classList.add('active')
      buyModes.appendChild(btn)
    }

    this.advisorEl = document.createElement('div')
    this.advisorEl.className = 'shop-advisor-strip'

    this.shopMetaHintsEl = document.createElement('div')
    this.shopMetaHintsEl.className = 'shop-meta-hints'
    this.shopMetaHintsEl.hidden = true

    this.subTabsEl = document.createElement('div')
    this.subTabsEl.className = 'shop-sub-tabs'

    const tabs = document.createElement('div')
    tabs.className = 'shop-tabs-pill shop-hub-tabs'
    const hubDefs: { id: ShopHub; label: string }[] = [
      { id: 'growth', label: i18nT('shop_growth') },
      { id: 'powerup', label: i18nT('shop_powerup') },
      { id: 'empire', label: i18nT('shop_empire') },
    ]
    for (const hd of hubDefs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab-btn shop-hub-btn'
      btn.dataset.action = 'shop-tab'
      btn.dataset.id = hd.id
      btn.dataset.tab = hd.id
      const img = document.createElement('img')
      img.src = HUB_ICONS[hd.id]
      img.alt = ''
      img.width = 18
      img.height = 18
      const label = document.createElement('span')
      label.textContent = hd.label
      this.hubLabelEls.set(hd.id, label)
      btn.append(img, label)
      if (hd.id === 'growth') btn.classList.add('active')
      this.tabButtons.push(btn)
      tabs.appendChild(btn)
    }

    for (const id of ['businesses', 'management', 'upgrades', 'research', 'ipo', 'empire_sport', 'empire_politics', 'empire_dark', 'empire_luxury', 'empire_finance', 'empire_science']) {
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
    chrome.append(header, tabsWrap, this.subTabsEl, buyModes, this.shopHubEl)
    this.renderSubTabs()

    const body = document.createElement('div')
    body.className = 'shop-body'
    for (const panel of Object.values(this.panels)) {
      body.appendChild(panel)
    }

    // Advisor ve meta-hints scrollable panel içinde (chrome'u şişirmez)
    this.panels['businesses']!.prepend(this.shopMetaHintsEl, this.advisorEl)

    this.root.append(chrome, body)
  }

  setViewContext(ctx: 'shop' | 'market', state?: GameState): void {
    this.viewContext = ctx
    if (ctx === 'market') {
      this.activeHub = 'finance'
      this.ipoSubTab = 'stock'
    } else if (this.activeHub === 'finance') {
      this.activeHub = 'growth'
      this.growthSub = 'businesses'
    }
    this.applyViewChrome(state)
    const panelId = this.activePanelId()
    for (const [pid, panel] of Object.entries(this.panels)) {
      panel.hidden = pid !== panelId
    }
  }

  private shopContextClass(): 'market' | 'business' {
    return this.viewContext === 'market' ? 'market' : 'business'
  }

  private applyRootClasses(hub: ShopHub = this.activeHub): void {
    this.root.className = `shop-panel shop-hub-${hub} shop-context-${this.shopContextClass()}`
  }

  private relabelHubTabs(): void {
    this.hubLabelEls.get('growth')!.textContent = i18nT('shop_growth')
    this.hubLabelEls.get('powerup')!.textContent = i18nT('shop_powerup')
    this.hubLabelEls.get('empire')!.textContent = i18nT('shop_empire')
  }

  private applyViewChrome(state?: GameState): void {
    const isMarket = this.viewContext === 'market'
    this.applyRootClasses()
    this.relabelHubTabs()
    this.titleEl.textContent = isMarket ? `📈 ${i18nT('market_stocks')} & ${i18nT('market_bank')}` : `🏢 ${i18nT('shop_context_business')}`
    this.shopSubEl.textContent = isMarket
      ? `${i18nT('market_stocks')} · ${i18nT('market_bank')} · ${i18nT('stat_prestige')} · ${i18nT('tab_merge')}`
      : HUB_SUBTITLES()[this.activeHub === 'finance' ? 'growth' : this.activeHub]
    this.buyModesEl.classList.toggle('is-hidden', isMarket)
    this.advisorEl.classList.toggle('is-hidden', isMarket)
    const hubTabs = this.root.querySelector('.shop-hub-tabs') as HTMLElement | null
    const tabsWrap = this.root.querySelector('.shop-tabs-wrap') as HTMLElement | null
    if (hubTabs) hubTabs.hidden = isMarket
    if (tabsWrap) tabsWrap.hidden = isMarket
    this.shopHubEl.hidden = isMarket
    const modEl = this.root.querySelector('.finance-modifiers') as HTMLElement | null
    if (modEl) modEl.hidden = isMarket || this.viewContext === 'shop'
    if (state) {
      this.renderSubTabs(state)
      this.updateTabBadges(state)
      this.applyProgressiveLocks(state)
    }
  }

  private applyProgressiveLocks(state: GameState): void {
    const hubMap: Partial<Record<ShopHub, ShopHubLock>> = {
      powerup: 'powerup',
      empire: 'empire',
    }
    if (isShopHubLocked('management', state.producers, state.totalEarned) && this.growthSub === 'management') {
      this.growthSub = 'businesses'
    }
    if (isShopHubLocked('powerup', state.producers, state.totalEarned) && this.activeHub === 'powerup') {
      this.activeHub = 'growth'
    }
    if (isShopHubLocked('empire', state.producers, state.totalEarned) && this.activeHub === 'empire') {
      this.activeHub = 'growth'
    }
    for (const btn of this.tabButtons) {
      const hub = btn.dataset.tab as ShopHub
      const lockKey = hubMap[hub]
      if (!lockKey) {
        btn.classList.remove('shop-hub-locked')
        btn.removeAttribute('title')
        continue
      }
      const locked = isShopHubLocked(lockKey, state.producers, state.totalEarned)
      btn.classList.toggle('shop-hub-locked', locked)
      btn.title = locked ? shopHubLockReason(lockKey, state.producers, state.totalEarned) ?? '' : ''
    }
    for (const btn of this.subTabButtons) {
      if (btn.dataset.id !== 'management') continue
      const locked = isShopHubLocked('management', state.producers, state.totalEarned)
      btn.classList.toggle('shop-hub-locked', locked)
      btn.title = locked ? shopHubLockReason('management', state.producers, state.totalEarned) ?? '' : ''
    }
  }

  getViewContext(): 'shop' | 'market' {
    return this.viewContext
  }

  setTab(id: string, state?: GameState): void {
    const resolved = this.resolveTab(id)
    this.activeHub = resolved.hub
    if (resolved.growthSub) this.growthSub = resolved.growthSub
    if (resolved.powerupSub) this.powerupSub = resolved.powerupSub
    if (resolved.ipoSub) this.ipoSubTab = resolved.ipoSub
    if (resolved.empireSub) this.empireSub = resolved.empireSub
    const panelId = this.activePanelId()
    this.applyRootClasses()
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === this.activeHub)
      btn.hidden = this.viewContext === 'market'
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
    this.buyModesEl.hidden = !showBuy
    this.buyModesEl.classList.toggle('is-hidden', !showBuy)
    this.shopSubEl.textContent = HUB_SUBTITLES()[this.activeHub]
    this.applyViewChrome(state)
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
    this.viewContext = 'market'
    this.ipoSubTab = 'stock'
    this.activeHub = 'finance'
    if (tickerId) this.highlightStockTicker = tickerId
  }

  private highlightStockTicker: string | null = null

  getIpoSubTab(): IpoSubTab {
    return this.ipoSubTab
  }

  private renderSubTabs(state?: GameState): void {
    this.subTabsEl.replaceChildren()
    this.subTabButtons = []
    if (this.viewContext === 'market' || this.activeHub === 'finance') {
      const finTabs: [IpoSubTab, string][] = [
        ['stock', i18nT('market_stocks')],
        ['bank', i18nT('market_bank')],
        ['insurance', i18nT('market_insurance')],
        ['commodities', i18nT('tab_commodities')],
        ['opportunities', i18nT('tab_opportunities')],
        ['underground_market', i18nT('tab_underground_market')],
        ['prestige', i18nT('stat_prestige')],
        ['ipo', i18nT('tab_merge')],
      ]
      for (const [id, label] of finTabs) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab ipo-nav-tab${this.ipoSubTab === id ? ' active' : ''}`
        btn.dataset.action = 'ipo-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        if (id === 'ipo' && state?.prestigeEligible()) {
          const badge = document.createElement('span')
          badge.className = 'tab-badge tab-badge-inline'
          badge.title = 'Birleşme hazır'
          btn.appendChild(badge)
        }
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
      return
    }
    if (this.activeHub === 'growth') {
      for (const [id, label] of [['businesses', i18nT('shop_context_business')], ['management', i18nT('tab_management')]] as [GrowthSub, string][]) {
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
      for (const [id, label] of [['upgrades', i18nT('shop_context_upgrades')], ['research', i18nT('shop_context_research')]] as [PowerupSub, string][]) {
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
      const empTabs: [EmpireSub, string][] = [
        ['sport', i18nT('tab_sport')],
        ['politics', i18nT('tab_politics')],
        ['dark', i18nT('tab_dark')],
        ['luxury', i18nT('tab_luxury')],
        ['finance', i18nT('tab_finance_empire')],
        ['science', i18nT('tab_science')],
      ]
      for (const [id, label] of empTabs) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `shop-sub-tab${this.empireSub === id ? ' active' : ''}`
        btn.dataset.action = 'shop-sub-tab'
        btn.dataset.id = id
        btn.textContent = label
        this.subTabButtons.push(btn)
        this.subTabsEl.appendChild(btn)
      }
      const manageBtn = document.createElement('button')
      manageBtn.type = 'button'
      manageBtn.className = 'shop-sub-tab shop-sub-tab-manage'
      manageBtn.dataset.action = 'open-empire-manage'
      manageBtn.textContent = '⚔️ Yönet'
      manageBtn.title = 'Satın aldığın varlıkları yönet'
      this.subTabsEl.appendChild(manageBtn)
    }
  }

  setEmpireSub(sub: EmpireSub): void {
    this.empireSub = sub
    this.activeHub = 'empire'
    const panelId = this.activePanelId()
    this.applyRootClasses('empire')
    for (const [pid, panel] of Object.entries(this.panels)) {
      panel.hidden = pid !== panelId
    }
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === 'empire')
      btn.hidden = this.viewContext === 'market'
    }
    this.buyModesEl.hidden = true
    this.buyModesEl.classList.add('is-hidden')
    this.applyViewChrome()
  }

  setIpoSubTab(tab: IpoSubTab): void {
    this.ipoSubTab = tab
  }

  setUpgradeFilter(filter: UpgradeFilter): void {
    this.upgradeFilter = filter
  }

  setResearchBranch(branch: ResearchBranch | 'all'): void {
    this.researchBranch = branch
  }

  setBizTypeFilter(filter: BizTypeFilter): void {
    this.bizTypeFilter = filter
  }

  hasShopBadge(state: GameState): boolean {
    state.ensureMissions()
    const upgradeReady = state.availableUpgrades().some((u) => state.canAfford(state.upgradeCostFor(u)))
    const earlyUnlock = PRODUCERS.some((p) => {
      if (isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)) return false
      return state.canAfford(earlyUnlockCost(p))
    })
    return upgradeReady || earlyUnlock
  }

  hasMarketBadge(state: GameState): boolean {
    return state.prestigeEligible()
      || !!state.investmentOffer
      || state.pendingInvestments.length > 0
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
    this.applyViewChrome(state)
    if (this.viewContext === 'shop') {
      this.shopHubEl.hidden = true
      this.shopHubEl.replaceChildren()
      this.renderAdvisorStrip(state)
      this.renderMetaHints(state)
    } else {
      this.renderShopHub(state)
      this.shopMetaHintsEl.hidden = true
    }
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
    for (const sub of ['sport', 'politics', 'dark', 'luxury', 'finance', 'science'] as const) {
      if (this.activeHub === 'empire' && this.empireSub === sub) {
        this.renderEmpireCategory(state, sub)
      }
    }
    this.updateTabBadges(state)
  }

  patchAffordability(state: GameState): void {
    const panelId = this.activePanelId()
    if (panelId === 'businesses') this.renderBusinesses(state, true)
    else if (panelId.startsWith('empire_')) this.patchEmpireLockedCards(state)
    this.renderAdvisorStrip(state)
    this.renderMetaHints(state)
  }

  private renderMetaHints(state: GameState): void {
    if (this.viewContext !== 'shop') {
      this.shopMetaHintsEl.hidden = true
      return
    }
    const hints: { emoji: string; text: string; action?: string }[] = []
    const torpilActive = state.torpil.some((t) => t.active)
    if (!torpilActive && state.money >= 15_000) {
      hints.push({
        emoji: '🤝',
        text: 'Torpil ağı — indirim & kredi (Baron > Dünya)',
        action: 'open-torpil',
      })
    } else if (state.torpil.some((t) => t.giftDue)) {
      hints.push({ emoji: '🎁', text: 'Torpil hediyesi bekliyor', action: 'open-torpil' })
    }
    const ready = franchiseReadyCount(state)
    const near = franchiseNearCount(state)
    if (ready > 0) {
      hints.push({ emoji: '🏪', text: `${ready} işletmede franchise açılabilir — kartlara bak` })
    } else if (near > 0) {
      hints.push({ emoji: '🏪', text: `${near} işletme franchise\'a yakın (10+ adet)` })
    }
    if (hints.length === 0) {
      this.shopMetaHintsEl.hidden = true
      return
    }
    this.shopMetaHintsEl.hidden = false
    this.shopMetaHintsEl.replaceChildren()
    for (const h of hints) {
      if (h.action) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'shop-meta-hint-btn'
        btn.dataset.action = h.action
        btn.textContent = `${h.emoji} ${h.text}`
        this.shopMetaHintsEl.appendChild(btn)
      } else {
        const span = document.createElement('span')
        span.className = 'shop-meta-hint'
        span.textContent = `${h.emoji} ${h.text}`
        this.shopMetaHintsEl.appendChild(span)
      }
    }
  }

  private patchLockedCards(state: GameState, root: ParentNode): void {
    root.querySelectorAll<HTMLElement>('.biz-card-locked-preview[data-producer-id]').forEach((card) => {
      const id = card.dataset.producerId
      if (!id) return
      const def = PRODUCERS.find((p) => p.id === id)
      if (!def) return
      this.patchEarlyUnlockFooter(card, def, state, scaledUnlockAt(def))
    })
  }

  private patchEmpireLockedCards(state: GameState): void {
    const panelId = this.activePanelId()
    const panel = this.panels[panelId]
    if (!panel) return
    this.patchLockedCards(state, panel)
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
      case 'empire_luxury':
      case 'empire_finance':
      case 'empire_science':
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

  toggleTierBand(bandId: string): void {
    if (this.expandedBands.has(bandId)) this.expandedBands.delete(bandId)
    else this.expandedBands.add(bandId)
  }

  private renderShopHub(state: GameState): void {
    if (this.viewContext !== 'market') {
      this.shopHubEl.hidden = true
      return
    }
    this.shopHubEl.hidden = false
    const ipd = state.incomePerDay()
    const click = state.clickIncomePerTap()
    const illegalIpd = state.illegalIncomePerDay()
    const ownedBiz = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length
    const nextUnlock = PRODUCERS.find((p) => !isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks))
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, scaledDailyGoalTarget(state.incomePerDay())))
    const nextText = nextUnlock ? `${nextUnlock.emoji} ${producerName(nextUnlock)}` : (tRaw('shop_all_unlocked') ?? 'Hepsi açık')
    const hasIllegal = illegalIpd > 0
    const heatPct = Math.round(state.illegalHeat)
    const illegalStat = hasIllegal
      ? `<span class="hub-stat hub-stat-illegal"><strong>${formatIncomeRate(illegalIpd)}</strong><small>Illegal pasif</small></span>
         <span class="hub-stat hub-stat-heat"><strong>${state.illegalRiskLabel()}</strong><small>Radar ${heatPct}%</small></span>`
      : ''
    this.shopHubEl.innerHTML = `
      <span class="hub-stat hub-stat-wallet"><strong>${formatMoney(state.money)}</strong><small>Cüzdan</small></span>
      <span class="hub-stat"><strong>${formatMoney(state.totalEarned)}</strong><small>Toplam kazanç</small></span>
      <span class="hub-stat"><strong>${formatIncomeRate(ipd)}</strong><small>Pasif / gün</small></span>
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
    label.textContent = i18nT('shop_active_effects')
    modEl.appendChild(label)
    for (const c of chips) {
      const chip = document.createElement('span')
      chip.className = 'finance-mod-chip'
      chip.title = c.detail
      chip.textContent = `${c.emoji} ${c.label}`
      modEl.appendChild(chip)
    }
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
    el.className = 'revenue-distribution revenue-distribution-compact'
    const title = document.createElement('strong')
    title.textContent = i18nT('shop_revenue_title')
    el.appendChild(title)
    const bar = document.createElement('div')
    bar.className = 'revenue-bar'
    const colors = ['var(--accent)', 'var(--green)', 'var(--blue)']
    top3.forEach((e, i) => {
      const seg = document.createElement('span')
      seg.className = 'revenue-seg'
      seg.style.flex = String(e.income / total)
      seg.style.background = colors[i] ?? 'var(--muted)'
      seg.title = `${producerName(e.p)}: ${formatIncomeRate(e.income)}`
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

  private patchEarlyUnlockFooter(
    card: HTMLElement,
    def: ProducerDef,
    state: GameState,
    unlockAt: number,
  ): void {
    const earlyBtn = card.querySelector('.btn-early-unlock') as HTMLButtonElement | null
    const earlyHint = card.querySelector('.btn-early-unlock-hint') as HTMLElement | null
    if (!earlyBtn) return
    const cost = earlyUnlockCost(def)
    const canAfford = state.canAfford(cost)
    earlyBtn.textContent = canAfford
      ? `${i18nT('biz_early_unlock')} · ${formatMoney(cost)}`
      : `${i18nT('biz_early_unlock')} · ${formatMoney(cost)} / ${formatMoney(state.money)}`
    earlyBtn.disabled = false
    earlyBtn.classList.toggle('btn-early-unlock-ready', canAfford)
    earlyBtn.title = canAfford
      ? `${i18nT('shop_from_wallet')} · Normal açılış: ${formatMoney(unlockAt)} toplam kazanç`
      : `Gerekli: ${formatMoney(cost)} · Cüzdan: ${formatMoney(state.money)} · ${i18nT('shop_missing_amount').replace('{amount}', formatMoney(Math.max(0, cost - state.money)))}`
    if (earlyHint) {
      earlyHint.textContent = canAfford ? i18nT('shop_from_wallet') : i18nT('shop_missing_amount').replace('{amount}', formatMoney(Math.max(0, cost - state.money)))
      earlyHint.hidden = false
      earlyHint.classList.toggle('hint-ready', canAfford)
    }
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

  private createFinanceDash(state: GameState): HTMLElement {
    const bank = state.bank
    const portfolio = portfolioSummary(state.stock)
    const plClass = portfolio.totalPl >= 0 ? 'pl-positive' : 'pl-negative'
    const el = document.createElement('div')
    el.className = 'finance-dash'
    el.innerHTML = `
      <div class="finance-dash-hero">
        <small>${i18nT('finance_net_worth')}</small>
        <strong>${formatMoney(state.financeNetWorth())}</strong>
        <span class="finance-dash-sub">${i18nT('finance_net_formula')}</span>
      </div>
      <div class="finance-dash-grid">
        <span><small>${i18nT('finance_cash')}</small><strong>${formatMoney(state.money)}</strong></span>
        <span><small>${i18nT('finance_portfolio')}</small><strong>${formatMoney(portfolio.totalValue)}</strong></span>
        <span><small>${i18nT('finance_deposit')}</small><strong>${formatMoney(bank.deposit)}</strong></span>
        <span><small>${i18nT('finance_bonds')}</small><strong>${formatMoney(bank.bonds)}</strong></span>
        <span class="${bank.loan > 0 ? 'finance-dash-debt' : ''}"><small>${i18nT('finance_debt')}</small><strong>${formatMoney(bank.loan)}</strong></span>
        <span><small>${i18nT('finance_pl')}</small><strong class="${plClass}">${formatMoney(portfolio.totalPl)}</strong></span>
      </div>
    `
    return el
  }

  private createFinanceMacroBar(state: GameState): HTMLElement {
    const macro = document.createElement('div')
    macro.className = 'finance-macro-bar'
    const ratePct = (state.stock.centralBankRate * 100).toFixed(1)
    const fear = state.stock.marketFear
    macro.innerHTML = `
      <div class="finance-macro-stat"><small>${i18nT('finance_central_rate')}</small><strong>%${ratePct}</strong></div>
      <div class="finance-macro-stat"><small>${i18nT('finance_market_fear')}</small><strong class="${fear >= 60 ? 'pl-negative' : fear <= 35 ? 'pl-positive' : ''}">${Math.round(fear)} · ${fearLabel(fear)}</strong></div>
      <div class="finance-macro-stat"><small>${i18nT('finance_prestige_pts')}</small><strong>${Math.floor(state.prestigePoints)}</strong></div>
    `
    if (state.stock.macroHeadline) {
      const headline = document.createElement('p')
      headline.className = 'finance-macro-headline'
      headline.textContent = state.stock.macroHeadline
      macro.appendChild(headline)
    }
    return macro
  }

  private createBankActions(
    title: string,
    hint: string,
    btns: [string, string, string][],
    customActions?: [string, string][],
  ): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'finance-action-panel'
    const head = document.createElement('div')
    head.className = 'finance-action-head'
    head.innerHTML = `<strong>${title}</strong><small>${hint}</small>`
    wrap.appendChild(head)
    const row = document.createElement('div')
    row.className = 'finance-action-row'
    for (const [action, label, count] of btns) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = action === 'bank-loan' ? 'btn-buy-stock btn-sm' : 'btn-secondary btn-sm'
      btn.dataset.action = action
      btn.dataset.count = count
      btn.textContent = label
      row.appendChild(btn)
    }
    wrap.appendChild(row)
    if (customActions && customActions.length > 0) {
      const customRow = document.createElement('div')
      customRow.className = 'finance-custom-row'
      const input = document.createElement('input')
      input.type = 'number'
      input.min = '1'
      input.placeholder = i18nT('bank_custom_placeholder')
      input.className = 'finance-custom-input'
      customRow.appendChild(input)
      for (const [action, label] of customActions) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = action.includes('loan') || action.includes('deposit') || action.includes('buy') ? 'btn-buy-stock btn-sm' : 'btn-secondary btn-sm'
        btn.dataset.action = action
        btn.dataset.count = 'custom'
        btn.textContent = label
        btn.addEventListener('pointerdown', (e) => e.preventDefault())
        customRow.appendChild(btn)
      }
      wrap.appendChild(customRow)
    }
    return wrap
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
    const titles: Record<EmpireSub, { icon: string; titleKey: string; title: string; desc: string }> = {
      sport: { icon: '⚽', titleKey: 'cat_sport', title: 'Futbol İmparatorluğu', desc: 'Kulüp satın al, İmparatorluk sekmesinden yönet.' },
      politics: { icon: '🏛️', titleKey: 'cat_politics', title: 'Siyasi Kariyer', desc: 'Meclisten küresel lobi gücüne.' },
      dark: { icon: '🏭', titleKey: 'cat_dark', title: 'Siyah Endüstri', desc: 'Yüksek gelir, yüksek radar riski.' },
      luxury: { icon: '💎', titleKey: 'cat_luxury', title: 'Lüks İmparatorluk', desc: 'Yat, F1, casino — milyarder oyuncakları.' },
      finance: { icon: '📈', titleKey: 'cat_finance', title: 'Finans Gücü', desc: 'Fon, banka, PE — sermaye ile hükmet.' },
      science: { icon: '🔬', titleKey: 'cat_science', title: 'Bilim & Uzay', desc: 'Ar-Ge, uzay istasyonu, biyotek.' },
    }
    const t = titles[category]
    hero.innerHTML = `<span class="shop-tab-hero-icon">${t.icon}</span><div class="shop-tab-hero-text"><strong>${tRaw(t.titleKey) ?? t.title}</strong><small>${t.desc}</small></div>`
    panel.prepend(hero)

    const grid = this.getCardsGrid(panel)
    const visibleIds = new Set<string>()
    const list = sortProducers(
      PRODUCERS.filter((p) => p.category === category),
      this.bizSortOrder,
      state,
    )

    for (const p of list) {
      const unlocked = isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)
      const key = `${category}:${p.id}`
      visibleIds.add(p.id)

      if (unlocked) {
        const owned = state.producers[p.id] ?? 0
        let count = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : this.buyMode
        if (count < 1) count = 1
        let card = this.empireCards.get(key)
        if (!card) {
          card = this.createBusinessCard(p)
          this.empireCards.set(key, card)
          grid.appendChild(card)
        }
        card.hidden = false
        card.classList.remove('biz-card-locked-preview')
        card.classList.toggle('biz-card-illegal', !!p.illegal)
        const buyCount = this.buyMode === 'max' ? Math.max(1, state.countMaxAffordable(p.id)) : count
        this.updateBusinessCard(card, p, state, owned, buyCount)
      } else {
        let card = this.empireCards.get(key)
        if (!card) {
          card = document.createElement('div')
          card.className = 'biz-card biz-card-locked-preview'
          card.dataset.producerId = p.id
          this.empireCards.set(key, card)
          grid.appendChild(card)
        }
        card.hidden = false
        const unlockAt = scaledUnlockAt(p)
        card.replaceChildren()
        const inner = document.createElement('div')
        inner.className = 'biz-locked-inner'
        inner.innerHTML = `
          <span class="biz-emoji-display">${p.emoji}</span>
          <div class="biz-locked-info">
            <strong>🔒 ${producerName(p)}</strong>
            <small>${formatMoney(unlockAt)} kazançta açılır</small>
            <small class="biz-locked-tier">Tier ${p.tier} · +${formatIncomeRate(scaledBaseIncome(p.baseIncome, p))}</small>
          </div>
        `
        const overlay = document.createElement('div')
        overlay.className = 'biz-locked-overlay biz-locked-overlay-compact'
        overlay.innerHTML = `<span class="biz-locked-icon">${p.illegal ? '🕶️' : '🔒'}</span>`
        const footer = document.createElement('div')
        footer.className = 'biz-card-locked-footer'
        const earlyBtn = document.createElement('button')
        earlyBtn.type = 'button'
        earlyBtn.className = 'btn-early-unlock'
        earlyBtn.dataset.action = 'early-unlock'
        earlyBtn.dataset.id = p.id
        const earlyHint = document.createElement('small')
        earlyHint.className = 'btn-early-unlock-hint'
        footer.append(earlyBtn, earlyHint)
        card.append(inner, overlay, footer)
        this.patchEarlyUnlockFooter(card, p, state, unlockAt)
      }
    }

    for (const [key, card] of this.empireCards) {
      if (!key.startsWith(`${category}:`) || !visibleIds.has(key.split(':')[1]!)) {
        if (key.startsWith(`${category}:`)) {
          card.remove()
          this.empireCards.delete(key)
        }
      }
    }

    panel.querySelector('.biz-card-locked-preview:not([data-producer-id])')?.remove()

    if (category === 'dark' && state.illegalIncomePerDay() > 0) {
      this.renderUndergroundTree(state, panel)
    }
  }

  private renderUndergroundTree(state: GameState, panel: HTMLElement): void {
    panel.querySelector('.underground-tree-section')?.remove()
    const section = document.createElement('div')
    section.className = 'underground-tree-section'
    section.appendChild(this.createSectionHeader(tRaw('cat_underground') ?? 'Underground Ağacı', 'Gelir · Risk · Gizlilik'))
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
      card.innerHTML = `<span class="shop-card-icon">${node.emoji}</span><div class="shop-card-body"><strong>${tRaw('res_' + node.id) ?? node.name}</strong><small>${tRaw('res_' + node.id + '_desc') ?? node.description}</small><span class="shop-level-label">${level}/${node.maxLevel}</span></div><span class="shop-card-price">${maxed ? (tRaw('res_maxed') ?? 'Tamam') : formatMoney(cost)}</span>`
      grid.appendChild(card)
    }
    section.appendChild(grid)
    panel.appendChild(section)
  }

  private getTierList(panel: HTMLElement): HTMLElement {
    panel.querySelector('.biz-cards-grid')?.remove()
    let list = panel.querySelector('.biz-tier-list') as HTMLElement | null
    if (!list) {
      list = document.createElement('div')
      list.className = 'biz-tier-list'
      panel.appendChild(list)
    }
    return list
  }

  private renderBusinesses(state: GameState, patchOnly = false): void {
    const panel = this.panels.businesses!
    const near = getNearSynergies(state.producers)
    const synergies = getActiveSynergies(state.producers).filter((s) => s.active)

    if (synergies.length > 0 || near.length > 0) {
      if (!this.synergyEl) {
        this.synergyEl = document.createElement('div')
        this.synergyEl.className = 'synergy-bar synergy-card'
        panel.prepend(this.synergyEl)
      }
      const activeDetail = synergies.map((s) => `${synergyName(s.def)} (+${Math.round(s.def.bonus * 100)}%)`).join(' · ')
      const nearDetail = near.slice(0, 3).map((n) => {
        const missingP = PRODUCERS.find((p) => p.id === n.missing[0])
        const missingName = missingP ? producerName(missingP) : n.missing[0]
        return `${synergyName(n.def)} → ${missingName}`
      }).join(' · ')
      this.synergyEl.innerHTML = [
        synergies.length > 0 ? `<strong>⚡ Sinerji aktif</strong><span>${activeDetail}</span>` : '',
        near.length > 0 ? `<div class="synergy-near-preview"><strong>Yakında:</strong> ${nearDetail}</div>` : '',
      ].filter(Boolean).join('')
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
        else panel.prepend(revDist)
      } else {
        revEl?.remove()
      }

      panel.querySelector('.finance-summary')?.remove()
    }

    if (!this.tierBandsInit) {
      for (const band of BIZ_TIER_BANDS) {
        if (bandUnlocked(band, state.totalEarned)) this.expandedBands.add(band.id)
      }
      this.expandedBands.add(activeTierBandId(state))
      this.tierBandsInit = true
    }

    const tierList = this.getTierList(panel)
    const visibleIds = new Set<string>()
    const allFiltered = filterProducersForShop(state, this.bizTypeFilter, this.bizSortOrder, (p, f) => this.matchesBizFilter(p, f))

    if (!patchOnly) tierList.replaceChildren()

    for (const band of BIZ_TIER_BANDS) {
      const unlocked = bandUnlocked(band, state.totalEarned)
      const expanded = unlocked && this.expandedBands.has(band.id)
      const bandProducers = allFiltered.filter((p) => p.tier >= band.minTier && p.tier <= band.maxTier)
      const ownedInBand = bandProducers.filter((p) => (state.producers[p.id] ?? 0) > 0).length

      let section = tierList.querySelector(`[data-tier-band="${band.id}"]`) as HTMLElement | null
      if (!section) {
        section = document.createElement('section')
        section.className = 'tier-band'
        section.dataset.tierBand = band.id
        tierList.appendChild(section)
      }

      section.classList.toggle('tier-band-locked', !unlocked)
      section.classList.toggle('tier-band-active', band.id === activeTierBandId(state))
      section.classList.toggle('tier-band-open', expanded)

      let header = section.querySelector('.tier-band-header') as HTMLButtonElement | null
      if (!header) {
        header = document.createElement('button')
        header.type = 'button'
        header.className = 'tier-band-header'
        header.dataset.action = 'toggle-tier-band'
        section.prepend(header)
      }
      header.dataset.id = band.id
      const lockHint = unlocked ? '' : ` · 🔒 ${formatMoney(band.unlockAt)}`
      header.innerHTML = `
        <span class="tier-band-chevron">${expanded ? '▼' : '▶'}</span>
        <span class="tier-band-label">${band.emoji} ${tierBandLabel(band.id)}</span>
        <span class="tier-band-meta">T${band.minTier}–${band.maxTier}${ownedInBand > 0 ? ` · ${ownedInBand} aktif` : ''}${lockHint}</span>
      `
      header.disabled = !unlocked

      let body = section.querySelector('.tier-band-body') as HTMLElement | null
      if (!body) {
        body = document.createElement('div')
        body.className = 'tier-band-body'
        section.appendChild(body)
      }
      body.hidden = !expanded
      if (!expanded) continue
      body.replaceChildren()

      for (const p of bandProducers) {
        visibleIds.add(p.id)
        let card = this.businessCards.get(p.id)
        if (!card) {
          card = this.createBusinessCard(p)
          this.businessCards.set(p.id, card)
        }
        const ownedCount = state.producers[p.id] ?? 0
        const buyCountForCard = this.buyMode === 'max' ? Math.max(1, state.countMaxAffordable(p.id)) : (this.buyMode as number)
        this.updateBusinessCard(card, p, state, ownedCount, buyCountForCard)
        body.appendChild(card)
      }

      const lockedPreview = producersInBand(band).filter(
        (p) => !isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)
          && this.matchesBizFilter(p, this.bizTypeFilter),
      ).slice(0, 3)

      if (bandProducers.length === 0 && lockedPreview.length === 0 && unlocked) {
        const empty = document.createElement('p')
        empty.className = 'tier-band-empty'
        empty.textContent = i18nT('shop_tier_empty')
        body.appendChild(empty)
      }

      for (const p of lockedPreview) {
        if (bandProducers.some((x) => x.id === p.id)) continue
        body.appendChild(renderLockedPreviewCard(p, state))
      }
    }

    for (const [id, card] of this.businessCards) {
      if (!visibleIds.has(id)) {
        card.remove()
        this.businessCards.delete(id)
      }
    }

    if (!patchOnly && visibleIds.size === 0) {
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
    const iconWrap = document.createElement('div')
    iconWrap.className = 'biz-icon-wrap'
    const emoji = document.createElement('span')
    emoji.className = 'biz-emoji-display'
    emoji.textContent = p.emoji
    iconWrap.appendChild(emoji)
    const icon = document.createElement('img')
    icon.className = 'biz-icon'
    icon.src = producerIconPath(p.id)
    icon.alt = ''
    icon.loading = 'lazy'
    icon.onerror = () => { icon.remove() }
    icon.onload = () => { iconWrap.appendChild(icon) }
    const info = document.createElement('div')
    info.className = 'biz-info-block'
    const name = document.createElement('strong')
    name.textContent = producerName(p)
    const desc = document.createElement('small')
    desc.textContent = producerDesc(p)
    info.append(name, desc)
    left.append(iconWrap, info)
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
    const batchIncome = state.marginalProducerIncome(p, buyCount)
    const incText = buyCount > 1
      ? `+${formatIncomeRate(batchIncome)} (${buyCount} ad.)`
      : `+${formatIncomeRate(batchIncome)}`
    const effectiveBuy = affordableCount >= 1 ? Math.min(buyCount, affordableCount) : buyCount
    const roiSec = affordableCount >= 1 ? producerRoiSeconds(state, p, effectiveBuy) : Infinity
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

    const activeSyns = getActiveSynergies(state.producers).filter(
      (s) => s.active && (s.def.requires.includes(p.id) || s.def.targetProducer === p.id),
    )
    let synBadge = card.querySelector('.biz-synergy-badge') as HTMLElement | null
    if (activeSyns.length > 0) {
      const s = activeSyns[0]!
      if (!synBadge) {
        synBadge = document.createElement('span')
        synBadge.className = 'biz-synergy-badge'
        card.appendChild(synBadge)
      }
      synBadge.textContent = `⚡ +${Math.round(s.def.bonus * 100)}% ${synergyName(s.def)}`
      synBadge.title = 'Aktif sinerji bonusu'
      synBadge.hidden = false
    } else if (synBadge) synBadge.hidden = true

    const nearForProd = getNearSynergies(state.producers).filter((n) => n.missing.includes(p.id))
    let nearBadge = card.querySelector('.biz-synergy-near') as HTMLElement | null
    if (nearForProd.length > 0 && (!synBadge || synBadge.hidden)) {
      const n = nearForProd[0]!
      if (!nearBadge) {
        nearBadge = document.createElement('span')
        nearBadge.className = 'biz-synergy-near'
        card.appendChild(nearBadge)
      }
      nearBadge.textContent = `⚡ ${synergyName(n.def)}`
      nearBadge.title = `Sinerji için ${synergyName(n.def)} — 1 işletme eksik`
      nearBadge.hidden = false
    } else if (nearBadge) nearBadge.hidden = true

    const obsLabel = state.obsolescenceLabel(p.id)
    let obsBadge = card.querySelector('.biz-obsolete-badge') as HTMLElement | null
    if (obsLabel && owned > 0) {
      if (!obsBadge) {
        obsBadge = document.createElement('span')
        obsBadge.className = 'biz-obsolete-badge'
        card.appendChild(obsBadge)
      }
      obsBadge.textContent = obsLabel
      obsBadge.hidden = false
    } else if (obsBadge) obsBadge.hidden = true

    card.querySelectorAll('.biz-milestone-dot').forEach((dot) => {
      const ms = Number((dot as HTMLElement).dataset.milestone)
      dot.classList.toggle('reached', owned >= ms)
    })

    if (p.illegal && p.riskChance) {
      const riskBadge = card.querySelector('.biz-risk-badge')
      const chancePct = Math.round(p.riskChance * 100 * (1 + state.illegalHeat / 100))
      if (riskBadge) riskBadge.textContent = `🕶️ Baskın ~${chancePct}%/dk`
    }

    let actionRow = card.querySelector('.biz-action-row') as HTMLElement | null
    const showSell = owned > 0
    const showModernize = owned > 0 && !!obsLabel && !state.producerModernized[p.id]
    if (showSell || showModernize) {
      if (!actionRow) {
        actionRow = document.createElement('div')
        actionRow.className = 'biz-action-row'
        card.appendChild(actionRow)
      }
      actionRow.replaceChildren()
      if (showSell) {
        const sellBtn = document.createElement('button')
        sellBtn.type = 'button'
        sellBtn.className = 'btn-secondary biz-sell-btn'
        sellBtn.dataset.action = 'sell-producer'
        sellBtn.dataset.id = p.id
        sellBtn.textContent = 'Sat (1)'
        actionRow.appendChild(sellBtn)
      }
      if (showModernize) {
        const modCost = modernizeCost(p.tier, owned)
        const modBtn = document.createElement('button')
        modBtn.type = 'button'
        modBtn.className = 'btn-primary biz-modernize-btn'
        modBtn.dataset.action = 'modernize-producer'
        modBtn.dataset.id = p.id
        modBtn.textContent = `Modernize · ${formatMoney(modCost)}`
        modBtn.disabled = !state.canAfford(modCost)
        actionRow.appendChild(modBtn)
      }
      actionRow.hidden = false
    } else if (actionRow) {
      actionRow.hidden = true
    }

    let franchiseBlock = card.querySelector('.biz-franchise-block') as HTMLElement | null
    const ownedForFranchise = owned
    const branches = state.franchises.filter((f) => f.producerId === p.id)
    const showFranchise = branches.length > 0 || state.canOpenFranchise(p.id) || ownedForFranchise >= 8
    if (showFranchise) {
      if (!franchiseBlock) {
        franchiseBlock = document.createElement('div')
        card.appendChild(franchiseBlock)
      }
      franchiseBlock.replaceChildren()
      appendFranchiseSection(franchiseBlock, p.id, producerName(p), ownedForFranchise, state)
      franchiseBlock.hidden = franchiseBlock.childElementCount === 0
    } else if (franchiseBlock) {
      franchiseBlock.hidden = true
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
    panel.appendChild(this.createTabHero('👔', i18nT('mgr_hub_title'), i18nT('mgr_hub_desc'), `${hiredCount}/${ownedCount} aktif`))

    const namedTitle = document.createElement('h3')
    namedTitle.className = 'shop-section-title'
    namedTitle.textContent = i18nT('mgr_named_title')
    panel.appendChild(namedTitle)
    for (const m of NAMED_MANAGERS) {
      const hired = state.namedManagers.some((h) => h.id === m.id)
      const card = document.createElement('div')
      card.className = `shop-card manager-card${hired ? ' manager-active' : ''}`
      card.innerHTML = `<strong>${m.emoji} ${tRaw('mgr_' + m.id + '_name') ?? m.name}</strong><p>${tRaw('mgr_' + m.id + '_specialty') ?? m.specialty}</p><span>Maaş: ${formatMoney(m.dailySalary)}/gün</span>`
      if (!hired) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary'
        btn.dataset.action = 'hire-named-manager'
        btn.dataset.id = m.id
        btn.textContent = i18nT('mgr_hire_btn').replace('{cost}', formatMoney(m.hireCost))
        btn.disabled = !state.canAfford(m.hireCost)
        card.appendChild(btn)
      } else {
        const ok = document.createElement('span')
        ok.className = 'manager-status-ok'
        ok.textContent = i18nT('mgr_status_active')
        card.appendChild(ok)
      }
      panel.appendChild(card)
    }

    const bizTitle = document.createElement('h3')
    bizTitle.className = 'shop-section-title'
    bizTitle.textContent = i18nT('mgr_biz_title')
    panel.appendChild(bizTitle)

    if (missing > 0) {
      const summary = document.createElement('div')
      summary.className = 'manager-summary-banner'
      summary.textContent = i18nT('mgr_missing_hint').replace('{n}', String(missing))
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
      name.textContent = producerName(p)
      const desc = document.createElement('small')
      desc.textContent = hired ? i18nT('mgr_hired_desc') : i18nT('mgr_not_hired_desc')
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
        btn.textContent = i18nT('mgr_hire_btn_full').replace('{cost}', formatMoney(state.managerDiscountActive ? cost * 0.5 : cost))
        btn.disabled = !state.canAfford(state.managerDiscountActive ? cost * 0.5 : cost)
        actions.appendChild(btn)
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-ad'
        adBtn.dataset.action = 'ad-manager-discount'
        adBtn.dataset.id = p.id
        adBtn.textContent = i18nT('mgr_ad_discount')
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
      name.textContent = upgradeName(u)
      const desc = document.createElement('small')
      desc.textContent = upgradeDesc(u)
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
      summary.textContent = i18nT('upg_purchased').replace('{n}', String(purchased.length))
      details.appendChild(summary)
      for (const u of purchased) {
        const row = document.createElement('div')
        row.className = 'purchased-upgrade-row'
        row.innerHTML = `<span>${this.upgradeEffectIcon(u)} ${upgradeName(u)}</span><small>${this.upgradeEffectLabel(u)}</small>`
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
    const allNodes = RESEARCH_NODES
    const nodes = this.researchBranch === 'all'
      ? allNodes
      : researchNodesByBranch(this.researchBranch)
    const totalLevels = allNodes.reduce((s, n) => s + (state.research[n.id] ?? 0), 0)
    const maxLevels = allNodes.reduce((s, n) => s + n.maxLevel, 0)
    panel.appendChild(this.createTabHero('🔬', 'Ar-Ge Laboratuvarı', 'Uzun vadeli bonuslar — dal seçerek ilerle', `${totalLevels}/${maxLevels} seviye`))

    const branchLabels: Record<ResearchBranch | 'all', string> = {
      all: 'Tümü', operasyon: '⚡ Operasyon', finans: '💰 Finans', imparatorluk: '👑 İmparatorluk',
    }
    panel.appendChild(this.createFilterPills(
      (['all', 'operasyon', 'finans', 'imparatorluk'] as const).map((id) => ({ id, label: branchLabels[id] })),
      this.researchBranch,
      'research-branch',
    ))

    const nodeEmojis: Record<string, string> = {
      marketing: '📣', automation: '🤖', accounting: '📊', lobby: '🏛️', efficiency: '⚡',
      logistics: '🚚', automation2: '🔧', energy_eff: '🌿', finance_interest: '💰',
      credit_mgmt: '💳', stock_analysis: '📈', tax_shield: '🛡️', football_fan: '⚽',
      stadium_ops: '🏟️', politics_lobby_r: '🤝', dark_stealth: '🕶️', dark_production: '🏭',
    }
    const branchCfg: Record<ResearchBranch, { label: string; icon: string; color: string }> = {
      operasyon: { label: 'Operasyon', icon: '⚡', color: 'var(--green)' },
      finans: { label: 'Finans', icon: '💰', color: '#60a5fa' },
      imparatorluk: { label: 'İmparatorluk', icon: '👑', color: '#c084fc' },
    }

    const treeGrid = document.createElement('div')
    treeGrid.className = 'research-tree-visual'

    const branches = this.researchBranch === 'all'
      ? (['operasyon', 'finans', 'imparatorluk'] as ResearchBranch[])
      : [this.researchBranch]

    for (const branch of branches) {
      const cfg = branchCfg[branch]
      const branchNodes = nodes.filter((n) => n.branch === branch)
      const branchDone = branchNodes.reduce((s, n) => s + (state.research[n.id] ?? 0), 0)
      const branchMax = branchNodes.reduce((s, n) => s + n.maxLevel, 0)

      const col = document.createElement('div')
      col.className = `research-tree-branch-col branch-${branch}`

      const head = document.createElement('h4')
      head.className = 'research-tree-branch-head'
      head.style.setProperty('--branch-color', cfg.color)
      head.innerHTML = `<span class="research-branch-icon">${cfg.icon}</span><span>${cfg.label}</span><span class="research-branch-progress">${branchDone}/${branchMax}</span>`
      col.appendChild(head)

      const chain = document.createElement('div')
      chain.className = 'research-tree-chain'

      for (let ni = 0; ni < branchNodes.length; ni++) {
        const node = branchNodes[ni]
        const prevNode = ni > 0 ? branchNodes[ni - 1] : null
        if (prevNode && node.prerequisite === prevNode.id) {
          const prereqMet = researchIsUnlocked(node.id, state.research)
          const connector = document.createElement('div')
          connector.className = `research-tree-connector${prereqMet ? ' prereq-met' : ''}`
          connector.innerHTML = `<svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" stroke-width="2"/><polyline points="2,10 6,16 10,10" stroke="currentColor" stroke-width="2" fill="none"/></svg>`
          chain.appendChild(connector)
        }
        const level = state.research[node.id] ?? 0
        const maxed = level >= node.maxLevel
        const cost = state.researchCostWithWeekly(researchCost(node, level))
        const prereqMet = researchIsUnlocked(node.id, state.research)
        const canBuy = prereqMet && !maxed && (node.currency === 'money' ? state.canAfford(cost) : state.prestigePoints >= cost)

        const card = document.createElement('button')
        card.type = 'button'
        card.className = `shop-card shop-card-research research-tree-node branch-${branch}${canBuy ? ' affordable' : ''}${maxed ? ' research-maxed' : ''}${!prereqMet ? ' locked-prereq' : ''}${node.currency === 'prestige' ? ' research-prestige' : ' research-money'}`
        card.dataset.action = 'buy-research'
        card.dataset.id = node.id
        card.disabled = !canBuy

        const icon = document.createElement('span')
        icon.className = 'shop-card-icon'
        icon.textContent = !prereqMet ? '🔒' : (nodeEmojis[node.id] ?? '🔬')

        const body = document.createElement('div')
        body.className = 'shop-card-body'
        const name = document.createElement('strong')
        name.textContent = researchNodeName(node)
        const desc = document.createElement('small')
        desc.textContent = researchNodeDesc(node)

        if (!prereqMet) {
          const prereqHint = document.createElement('span')
          prereqHint.className = 'research-prereq-hint'
          prereqHint.textContent = `Önce: ${researchPrereqName(node.id) ?? '?'}`
          body.append(name, desc, prereqHint)
        } else {
          const progressBar = document.createElement('div')
          progressBar.className = 'research-node-progress'
          const fill = document.createElement('div')
          fill.className = 'research-node-progress-fill'
          fill.style.width = `${maxed ? 100 : Math.round((level / node.maxLevel) * 100)}%`
          fill.style.background = maxed ? 'var(--green)' : cfg.color
          progressBar.appendChild(fill)

          const levelLabel = document.createElement('span')
          levelLabel.className = 'shop-level-label'
          levelLabel.textContent = maxed ? '✅ Tamamlandı' : `${level}/${node.maxLevel} seviye`
          body.append(name, desc, progressBar, levelLabel)
        }

        const price = document.createElement('span')
        price.className = `shop-card-price${node.currency === 'prestige' ? ' price-prestige' : ''}`
        price.textContent = !prereqMet ? '🔒' : maxed ? '✓' : node.currency === 'money' ? formatMoney(cost) : `${cost} ✦`

        card.append(icon, body, price)
        chain.appendChild(card)
      }
      col.appendChild(chain)
      treeGrid.appendChild(col)
    }
    panel.appendChild(treeGrid)
  }

  private renderIpo(state: GameState): void {
    const panel = this.panels.ipo!
    panel.replaceChildren()

    panel.appendChild(this.createFinanceDash(state))
    panel.appendChild(this.createFinanceMacroBar(state))

    const subHint = document.createElement('p')
    subHint.className = 'finance-sub-hint'
    const hints: Record<IpoSubTab, string> = {
      stock: '7 sektör hissesi — al/sat, grafik izle, portföyünü büyüt',
      bank: 'Paranı güvene al veya kredi çek — faiz her dakika işler',
      prestige: 'Kalıcı prestij puanlarıyla run gücünü artır',
      ipo: 'Run sonu birleşmesi — kalıcı prestij hissesi kazan (oyun bitirmez, reset)',
      insurance: 'Risk al — sigortasız oyna veya güvenlik için öde',
      commodities: 'Altın, petrol, buğday, kahve — haberlerle al/sat',
      opportunities: 'Süreli startup yatırımları — yüksek getiri, garantisiz',
      underground_market: 'Kara borsa — heat artırır ama gelir çok yüksek',
    }
    subHint.textContent = hints[this.ipoSubTab]
    panel.appendChild(subHint)

    if (this.ipoSubTab === 'stock') this.renderIpoStock(state, panel)
    else if (this.ipoSubTab === 'bank') this.renderIpoBank(state, panel)
    else if (this.ipoSubTab === 'prestige') this.renderIpoPrestige(state, panel)
    else if (this.ipoSubTab === 'insurance') renderInsurancePanel(state, panel, (a, b, c, d) => this.createTabHero(a, b, c, d))
    else if (this.ipoSubTab === 'commodities') renderCommoditiesPanel(state, panel, (a, b, c, d) => this.createTabHero(a, b, c, d))
    else if (this.ipoSubTab === 'opportunities') renderOpportunitiesPanel(state, panel, (a, b, c, d) => this.createTabHero(a, b, c, d))
    else if (this.ipoSubTab === 'underground_market') renderUndergroundMarketPanel(state, panel, (a, b, c, d) => this.createTabHero(a, b, c, d))
    else this.renderIpoMerge(state, panel)
  }

  private renderIpoStock(state: GameState, panel: HTMLElement): void {
    const summary = portfolioSummary(state.stock)
    const portfolioPlClass = summary.totalPl >= 0 ? 'pl-positive' : 'pl-negative'

    // --- Aktif Etkiler bölümü ---
    const stockChips: string[] = []

    if (Date.now() < state.stock.marketEventUntil) {
      const pct = Math.round(Math.abs(state.stock.marketEventMult) * 100)
      if (state.stock.marketEventMult < 0) {
        stockChips.push(`📉 Piyasa Çöküşü: −${pct}%`)
      } else {
        stockChips.push(`📈 Piyasa Rallisi: +${pct}%`)
      }
    }

    if (state.advisorTip) {
      const acc = Math.round(state.advisorTip.accuracy * 100)
      stockChips.push(`🧠 Danışman Aktif: ${acc}% doğruluk`)
    }

    if (state.vipPassActive) {
      stockChips.push('👑 VIP: +25% kazanç')
    }

    if (Date.now() < state.adIncomeBoostUntil) {
      stockChips.push('📺 Gelir Bostu aktif')
    }

    if (stockChips.length > 0) {
      const fxEl = document.createElement('div')
      fxEl.className = 'stock-active-effects'
      fxEl.innerHTML = stockChips.map(c => `<span class="fx-chip">${c}</span>`).join('')
      panel.appendChild(fxEl)
    }
    // --- /Aktif Etkiler ---

    if (Date.now() < state.stock.marketEventUntil) {
      const ev = document.createElement('div')
      ev.className = 'market-event-banner market-event-banner-top'
      ev.textContent = state.stock.marketEventMult < 0 ? '📉 Piyasa çöküşü — fiyatlar baskı altında!' : '📈 Piyasa rallisi — fırsat penceresi!'
      panel.appendChild(ev)
    }

    const portfolioEl = document.createElement('div')
    portfolioEl.className = 'stock-portfolio-summary stock-portfolio-hero'
    portfolioEl.innerHTML = `
      <div class="stock-portfolio-stat"><small>Portföy değeri</small><strong>${formatMoney(summary.totalValue)}</strong></div>
      <div class="stock-portfolio-stat"><small>Nakit (cüzdan)</small><strong>${formatMoney(state.money)}</strong></div>
      <div class="stock-portfolio-stat"><small>Açık pozisyon</small><strong>${summary.holdings}/${STOCK_DEFS.length}</strong></div>
      <div class="stock-portfolio-stat"><small>Toplam K/Z</small><strong class="${portfolioPlClass}">${formatMoney(summary.totalPl)}</strong></div>
    `
    panel.appendChild(portfolioEl)

    if (state.advisorTip) {
      const adv = document.createElement('div')
      adv.className = 'advisor-card'
      const acc = Math.round(state.advisorTip.accuracy * 100)
      adv.innerHTML = `<strong>${i18nT('fin_advisor')}</strong><p>${state.advisorTip.headline}</p><small>${i18nT('fin_advisor_acc').replace('{acc}', String(acc))}</small>`
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-secondary'
      btn.dataset.action = 'advisor-pay'
      btn.textContent = i18nT('com_advisor_btn').replace('{cost}', formatMoney(ADVISOR_FEE))
      adv.appendChild(btn)
      panel.appendChild(adv)
    }

    const boardTitle = document.createElement('h3')
    boardTitle.className = 'stock-board-title'
    boardTitle.textContent = 'Piyasa tahtası'
    panel.appendChild(boardTitle)

    const board = document.createElement('div')
    board.className = 'stock-market-board'
    for (const def of STOCK_DEFS) {
      const t = state.stock.tickers[def.id]!
      const tPl = profitLoss(t)
      const tChg = priceChangePct(t)
      const tPlClass = tPl >= 0 ? 'pl-positive' : 'pl-negative'
      const chgClass = tChg >= 0 ? 'pl-positive' : 'pl-negative'
      const isActive = state.stock.activeTickerId === def.id
      const spark = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      spark.setAttribute('class', 'stock-board-spark')
      spark.setAttribute('viewBox', '0 0 80 28')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', sparklinePath(t.history, 80, 28))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', tChg >= 0 ? '#34d399' : '#f87171')
      path.setAttribute('stroke-width', '2')
      spark.appendChild(path)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `stock-board-card${isActive ? ' active' : ''}${isBankruptTicker(state.stock, def.id) ? ' stock-bankrupt' : ''}`
      card.dataset.action = 'stock-ticker'
      card.dataset.id = def.id
      card.innerHTML = `
        <div class="stock-board-head">
          <span class="stock-board-emoji">${def.emoji}</span>
          <div class="stock-board-names">
            <strong>${def.name}</strong>
            <small>${t.shares > 0 ? `${t.shares} lot · ${formatMoney(tPl)}` : i18nT('stock_no_pos')}</small>
          </div>
          <span class="stock-change ${chgClass}">${tChg >= 0 ? '+' : ''}${tChg.toFixed(1)}%</span>
        </div>
        <div class="stock-board-price-row">
          <strong>${formatMoney(t.price)}</strong>
          <small class="${tPlClass}">${t.shares > 0 ? formatMoney(tPl) : '—'}</small>
        </div>
      `
      card.appendChild(spark)
      board.appendChild(card)
    }
    panel.appendChild(board)

    const ticker = state.stock.tickers[state.stock.activeTickerId]!
    const pl = profitLoss(ticker)
    const plClass = pl >= 0 ? 'pl-positive' : 'pl-negative'
    const chg = priceChangePct(ticker)
    const chgClass = chg >= 0 ? 'pl-positive' : 'pl-negative'
    const trend = state.stock.trendDirection === 'up' ? i18nT('stock_trend_up') : state.stock.trendDirection === 'down' ? i18nT('stock_trend_down') : i18nT('stock_trend_flat')

    const tradePanel = document.createElement('div')
    tradePanel.className = 'stock-trade-panel'
    tradePanel.innerHTML = `
      <div class="stock-trade-head">
        <span class="stock-trade-emoji">${ticker.emoji}</span>
        <div>
          <h3>${ticker.name}</h3>
          <small>${i18nT('stock_sector_col')}: ${ticker.sector} · ${i18nT('stock_volatility')} ${Math.round(ticker.volatility * 100)}%</small>
        </div>
        <div class="stock-trade-price">
          <strong>${formatMoney(ticker.price)}</strong>
          <span class="stock-change ${chgClass}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</span>
        </div>
      </div>
    `

    const detailGrid = document.createElement('div')
    detailGrid.className = 'stock-detail-grid stock-detail-grid-lg'
    detailGrid.innerHTML = `
      <span><small>${i18nT('stock_lot_label')}</small><strong>${ticker.shares}</strong></span>
      <span><small>${i18nT('stock_avg_cost')}</small><strong>${ticker.shares > 0 ? formatMoney(ticker.avgBuyPrice) : '—'}</strong></span>
      <span><small>${i18nT('stock_position_val')}</small><strong>${formatMoney(ticker.shares * ticker.price)}</strong></span>
      <span><small>${i18nT('stock_pl_label')}</small><strong class="${plClass}">${formatMoney(pl)}</strong></span>
      <span><small>${i18nT('stock_trend_label')}</small><strong>${trend}</strong></span>
      <span><small>${i18nT('stock_buy_cost')}</small><strong>${formatMoney(ticker.price)}</strong></span>
    `
    tradePanel.appendChild(detailGrid)

    const sparkLg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    sparkLg.setAttribute('class', 'stock-sparkline stock-sparkline-xl')
    sparkLg.setAttribute('viewBox', '0 0 320 80')
    const pathLg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pathLg.setAttribute('d', sparklinePath(ticker.history, 320, 80))
    pathLg.setAttribute('fill', 'none')
    pathLg.setAttribute('stroke', chg >= 0 ? '#34d399' : '#f87171')
    pathLg.setAttribute('stroke-width', '2.5')
    sparkLg.appendChild(pathLg)
    tradePanel.appendChild(sparkLg)

    const stockActions = document.createElement('div')
    stockActions.className = 'stock-actions finance-trade-bar stock-trade-actions'
    for (const [action, label, count] of [
      ['stock-buy', i18nT('btn_buy_n').replace('{n}', '1'), '1'],
      ['stock-buy', i18nT('btn_buy_n').replace('{n}', '10'), '10'],
      ['stock-buy', i18nT('btn_buy_n').replace('{n}', '50'), '50'],
      ['stock-sell', i18nT('btn_sell_n').replace('{n}', '1'), '1'],
      ['stock-sell', i18nT('btn_sell_n').replace('{n}', '10'), '10'],
      ['stock-sell', i18nT('btn_sell_all'), 'max'],
    ] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = action.includes('buy') ? 'btn-buy-stock' : 'btn-sell-stock'
      btn.dataset.action = action
      btn.dataset.count = count
      btn.textContent = label
      stockActions.appendChild(btn)
    }
    const stockCustomRow = document.createElement('div')
    stockCustomRow.className = 'finance-custom-row stock-custom-row'
    const stockInput = document.createElement('input')
    stockInput.type = 'number'
    stockInput.inputMode = 'numeric'
    stockInput.min = '1'
    stockInput.step = '1'
    stockInput.placeholder = i18nT('stock_qty_hint')
    stockInput.className = 'finance-custom-input'
    const stockBuyCustom = document.createElement('button')
    stockBuyCustom.type = 'button'
    stockBuyCustom.className = 'btn-buy-stock btn-sm'
    stockBuyCustom.dataset.action = 'stock-buy'
    stockBuyCustom.dataset.count = 'custom'
    stockBuyCustom.textContent = i18nT('btn_buy')
    stockBuyCustom.addEventListener('pointerdown', (e) => e.preventDefault())
    const stockSellCustom = document.createElement('button')
    stockSellCustom.type = 'button'
    stockSellCustom.className = 'btn-sell-stock btn-sm'
    stockSellCustom.dataset.action = 'stock-sell'
    stockSellCustom.dataset.count = 'custom'
    stockSellCustom.textContent = i18nT('btn_sell')
    stockSellCustom.addEventListener('pointerdown', (e) => e.preventDefault())
    stockCustomRow.append(stockInput, stockBuyCustom, stockSellCustom)
    stockActions.appendChild(stockCustomRow)
    tradePanel.appendChild(stockActions)
    panel.appendChild(tradePanel)

    if (Date.now() < state.stock.trendHintUntil) {
      const hint = document.createElement('p')
      hint.className = 'stock-hint stock-hint-box'
      const dirShort = state.stock.trendDirection === 'up' ? i18nT('stock_up_short') : state.stock.trendDirection === 'down' ? i18nT('stock_down_short') : i18nT('stock_flat_short')
      hint.textContent = i18nT('stock_market_hint').replace('{dir}', dirShort)
      panel.appendChild(hint)
    }

    const hintAd = document.createElement('button')
    hintAd.type = 'button'
    hintAd.className = 'btn-ad stock-hint-btn'
    hintAd.dataset.action = 'ad-stock-hint'
    hintAd.textContent = state.isStockHintFree() ? i18nT('stock_hint_free') : i18nT('stock_hint_ad')
    panel.appendChild(hintAd)

    if (this.highlightStockTicker) {
      board.querySelectorAll('.stock-board-card').forEach((el) => {
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
    const score = Math.round(bank.creditScore)

    const rateStrip = document.createElement('div')
    rateStrip.className = 'finance-rate-strip'
    rateStrip.innerHTML = `
      <span><small>${i18nT('bank_rate_deposit')}</small><strong>%${dRate}</strong></span>
      <span><small>${i18nT('bank_rate_bond')}</small><strong>%${bRate}</strong></span>
      <span><small>${i18nT('bank_rate_loan')}</small><strong>%${lRate}</strong></span>
      <span><small>${i18nT('bank_rate_score')}</small><strong>${score}/100</strong></span>
    `
    panel.appendChild(rateStrip)

    if (reputationLoanBlocked(state.reputation)) {
      const repWarn = document.createElement('p')
      repWarn.className = 'bank-reputation-warn'
      repWarn.textContent = i18nT('bank_rep_warn').replace('{rep}', String(state.reputation))
      panel.appendChild(repWarn)
    }

    const now = Date.now()
    const countdownSec = Math.ceil(interestTickCountdownMs(bank, now) / 1000)
    const last = bank.lastInterestSnapshot
    const projected = projectInterestTick(bank, rate)
    const netClass = projected.net >= 0 ? 'pl-positive' : 'pl-negative'

    const interestSummary = document.createElement('div')
    interestSummary.className = 'bank-interest-summary'
    interestSummary.innerHTML = `
      <div class="bank-interest-summary-head">
        <strong>${i18nT('bank_interest_title')}</strong>
        <small>${i18nT('bank_next_tick').replace('{sec}', String(countdownSec)).replace('{interval}', String(INTEREST_TICK_MS / 1000))}</small>
      </div>
      <div class="bank-interest-last">
        <small>${i18nT('bank_last_tick_lbl')}</small>
        <span>${last
          ? `+${formatMoney(last.depositGain)} ${i18nT('fin_deposit')} · +${formatMoney(last.bondGain)} ${i18nT('fin_bond')} · −${formatMoney(last.loanCost)} ${i18nT('fin_loan')} = <strong class="${last.net >= 0 ? 'pl-positive' : 'pl-negative'}">${last.net >= 0 ? '+' : ''}${formatMoney(last.net)}</strong> ${i18nT('fin_net')}`
          : 'Henüz faiz işlenmedi'}
        </span>
      </div>
      <div class="bank-interest-projected">
        <small>${i18nT('bank_projected_lbl')}</small>
        <span>+${formatMoney(projected.depositGain)} · +${formatMoney(projected.bondGain)} · −${formatMoney(projected.loanCost)} = <strong class="${netClass}">${projected.net >= 0 ? '+' : ''}${formatMoney(projected.net)}</strong></span>
      </div>
      <p class="bank-interest-hint">${i18nT('bank_interest_hint')}</p>
    `
    panel.appendChild(interestSummary)

    const accounts = document.createElement('div')
    accounts.className = 'bank-accounts finance-account-grid'
    accounts.innerHTML = `
      <div class="bank-account-card">
        <h4>${i18nT('bank_deposit_lbl')}</h4>
        <strong>${formatMoney(bank.deposit)}</strong>
        <small>${i18nT('bank_deposit_sub')}</small>
      </div>
      <div class="bank-account-card">
        <h4>${i18nT('bank_bond_lbl')}</h4>
        <strong>${formatMoney(bank.bonds)}</strong>
        <small>${i18nT('bank_bond_sub')}</small>
      </div>
      <div class="bank-account-card${bank.loan > 0 ? ' bank-debt' : ''}">
        <h4>${i18nT('bank_loan_lbl')}</h4>
        <strong>${formatMoney(bank.loan)}</strong>
        <small>${i18nT('bank_loan_sub').replace('{amount}', formatMoney(maxLoan))}</small>
      </div>
    `
    panel.appendChild(accounts)

    const warn = document.createElement('p')
    warn.className = 'bank-warn'
    warn.textContent = bank.loan > state.financeNetWorth() * 0.5
      ? i18nT('bank_high_debt')
      : i18nT('bank_normal_info')
    panel.appendChild(warn)

    panel.appendChild(this.createBankActions(i18nT('bank_actions_deposit'), i18nT('bank_actions_deposit_hint'), [
      ['bank-deposit', i18nT('bank_dep_n').replace('{n}', '1K'), '1000'],
      ['bank-deposit', i18nT('bank_dep_n').replace('{n}', '10K'), '10000'],
      ['bank-deposit', i18nT('bank_dep_n').replace('{n}', 'max'), 'max'],
      ['bank-withdraw', i18nT('bank_wdraw_n').replace('{n}', '10K'), '10000'],
      ['bank-withdraw', i18nT('bank_wdraw_n').replace('{n}', 'max'), 'max'],
    ], [['bank-deposit', i18nT('bank_dep_n').replace('{n}', '')], ['bank-withdraw', i18nT('bank_wdraw_n').replace('{n}', '')]]))
    panel.appendChild(this.createBankActions(i18nT('bank_actions_bond'), i18nT('bank_actions_bond_hint'), [
      ['bank-buy-bonds', i18nT('btn_buy_n').replace('{n}', '5K'), '5000'],
      ['bank-buy-bonds', i18nT('btn_buy_n').replace('{n}', 'max'), 'max'],
      ['bank-sell-bonds', i18nT('btn_sell_n').replace('{n}', 'max'), 'max'],
    ], [['bank-buy-bonds', i18nT('btn_buy')], ['bank-sell-bonds', i18nT('btn_sell')]]))
    panel.appendChild(this.createBankActions(i18nT('bank_actions_loan'), i18nT('bank_actions_loan_hint'), [
      ['bank-loan', i18nT('bank_wdraw_n').replace('{n}', '25K'), '25000'],
      ['bank-loan', i18nT('bank_wdraw_n').replace('{n}', 'max'), 'max'],
      ['bank-repay', i18nT('bank_repay') + ' 10K', '10000'],
      ['bank-repay', i18nT('bank_repay') + ' max', 'max'],
    ], [['bank-loan', i18nT('bank_wdraw_n').replace('{n}', '')], ['bank-repay', i18nT('bank_repay')]]))
  }

  private renderIpoPrestige(state: GameState, panel: HTMLElement): void {
    panel.appendChild(this.createSectionHeader(
      'Prestij Ağacı',
      `${state.prestigePoints} harcanabilir puan · kalıcı run güçlendirme`,
    ))

    const branchLabels: Record<string, string> = {
      income: '💰 Gelir',
      economy: '📉 Ekonomi',
      meta: '⚙️ Meta',
    }
    const wrap = document.createElement('div')
    wrap.className = 'prestige-tree-visual'

    for (const branch of ['income', 'economy', 'meta'] as const) {
      const col = document.createElement('div')
      col.className = 'prestige-branch-col'
      const head = document.createElement('h4')
      head.className = 'prestige-branch-head'
      head.textContent = branchLabels[branch] ?? branch
      col.appendChild(head)

      const chain = document.createElement('div')
      chain.className = 'prestige-branch-chain'
      for (const node of PRESTIGE_TREE_NODES.filter((n) => n.branch === branch)) {
        const owned = hasNode(state.prestigeTree, node.id)
        const canBuy = canBuyNode(state.prestigeTree, node, state.prestigePoints)
        if (node.requires) {
          const reqNode = PRESTIGE_TREE_NODES.find((n) => n.id === node.requires)
          const reqLine = document.createElement('div')
          reqLine.className = 'prestige-requires-line'
          reqLine.textContent = reqNode ? `↑ ${tRaw('res_' + reqNode.id) ?? reqNode.name}` : '↑ ön koşul'
          chain.appendChild(reqLine)
        }
        const card = document.createElement('button')
        card.type = 'button'
        card.className = `tree-node prestige-tree-node ${owned ? 'owned' : canBuy ? 'available' : 'locked'}`
        card.dataset.action = owned ? '' : 'buy-tree-node'
        card.dataset.id = node.id
        card.disabled = owned || !canBuy
        card.innerHTML = `<strong>${tRaw('res_' + node.id) ?? node.name}</strong><small>${tRaw('res_' + node.id + '_desc') ?? node.description}</small><span class="tree-node-cost">${owned ? '✓ Alındı' : `${node.cost} puan`}</span>`
        chain.appendChild(card)
      }
      col.appendChild(chain)
      wrap.appendChild(col)
    }
    panel.appendChild(wrap)
  }

  private renderIpoMerge(state: GameState, panel: HTMLElement): void {
    const explain = document.createElement('div')
    explain.className = 'ipo-explain-box'
    explain.innerHTML = `
      <strong>Run Birleşmesi (IPO) nedir?</strong>
      <p>Oyunu silmez — imparatorluğunu <em>kalıcı güçlendirerek</em> yeni tura başlatırsın.</p>
      <ul>
        <li><strong>${formatMoney(PRESTIGE_THRESHOLD)}+ toplam kazanç</strong> ile birleşme açılır — her IPO'da eşik katlanır</li>
        <li>Borsa & banka varlıkların nakde çevrilir, run sıfırlanır</li>
        <li><strong>Kalıcı prestij hissesi</strong> kazanırsın → tüm gelirlerin kalıcı çarpanı artar</li>
        <li>Prestij ağacı, hanedan, sezon ve imparatorluk yönetimi <strong>korunur</strong></li>
      </ul>
    `
    panel.appendChild(explain)
    panel.appendChild(this.createSectionHeader('Şirket Birleşmesi'))

    const preview = state.ipoPreview()
    const ipoCard = document.createElement('div')
    ipoCard.className = 'shop-card ipo-card'
    const currentMult = prestigeMultiplier(state.prestigePoints)
    const threshold = ipoThreshold(state.ipoCount)
    const remaining = Math.max(0, threshold - state.totalEarned)

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
      : `IPO #${state.ipoCount + 1} için ${formatMoney(threshold)} toplam kazanç gerekir. Şu an ${formatMoney(state.totalEarned)} — ${formatMoney(remaining)} kaldı.`

    const ipoPct = Math.min(100, (state.totalEarned / threshold) * 100)
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

    // IPO Önizleme kartı (Adım 8)
    {
      const previewCard = document.createElement('div')
      previewCard.className = 'ipo-preview-card'

      const previewTitle = document.createElement('div')
      previewTitle.className = 'ipo-preview-title'
      previewTitle.textContent = 'Bu IPO\'dan kazanacakların:'
      previewCard.appendChild(previewTitle)

      const gainRows: [string, string][] = preview.pointsToEarn > 0
        ? [
            [i18nT('finance_prestige_pts'), `+${preview.pointsToEarn} ✦`],
            ['Yeni kalıcı çarpan', `x${currentMult.toFixed(2)} → x${preview.newMultiplier.toFixed(2)}`],
            ['Başlangıç sermayesi', `₺${formatMoney(preview.startingCash)}`],
          ]
        : [['Başlangıç sermayesi', `₺${formatMoney(preview.startingCash)}`]]
      for (const [label, val] of gainRows) {
        const row = document.createElement('div')
        row.className = 'ipo-preview-row ipo-preview-gain'
        row.innerHTML = `<span>${label}</span><strong>${val}</strong>`
        previewCard.appendChild(row)
      }

      const loseTitle = document.createElement('div')
      loseTitle.className = 'ipo-preview-subtitle'
      loseTitle.textContent = 'Kaybedeceklerin:'
      previewCard.appendChild(loseTitle)
      const loseRow = document.createElement('div')
      loseRow.className = 'ipo-preview-row ipo-preview-lose'
      loseRow.innerHTML = '<span>Para, işletmeler (yöneticiler korunur)</span>'
      previewCard.appendChild(loseRow)

      const keepTitle = document.createElement('div')
      keepTitle.className = 'ipo-preview-subtitle'
      keepTitle.textContent = 'Koruyacakların:'
      previewCard.appendChild(keepTitle)
      const keepRow = document.createElement('div')
      keepRow.className = 'ipo-preview-row ipo-preview-keep'
      keepRow.innerHTML = '<span>Araştırma, prestij ağacı bonusları</span>'
      previewCard.appendChild(keepRow)

      ipoCard.appendChild(previewCard)
    }

    ipoCard.append(info, bar, btn)
    panel.appendChild(ipoCard)
  }
}
