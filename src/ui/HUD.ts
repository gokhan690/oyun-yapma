import type { GameState } from '../game/GameState'
import type { AdManager } from '../ads/AdManager'
import type { SoundManager } from '../audio/SoundManager'
import type { SaveManager } from '../security/SaveManager'
import { formatMoney, formatIncomeRate, PRODUCERS, earlyUnlockCost, scaledUnlockAt, isProducerUnlocked } from '../game/Economy'
import { crisisDef } from '../game/CrisisEvents'
import { buildSkylineBuildings } from './Skyline'
import { cityDef, EXPANSION_CITIES, canUnlockCity } from '../game/ExpansionMap'
import { applyEraTheme, eraForBaron } from '../game/EraTheme'
import { formatProgressLine } from '../game/ProgressPath'
import type { BaronRecord } from '../game/BaronLegacy'
import { assetUrl } from '../utils/assetUrl'
import { currentRank, rankProgress } from '../game/PlayerRank'
import { dayBonusExtra, nightBonusExtra } from '../game/PrestigeTree'
import { StatsBar } from './components/StatsBar'
import { ShopPanel } from './components/ShopPanel'
import type { ResearchBranch } from '../game/Research'
import { ModalManager } from './components/ModalManager'
import { SettingsPanel } from './components/SettingsPanel'
import { StatsScreen } from './components/StatsScreen'
import { Tutorial } from './Tutorial'
import { Skyline } from './Skyline'
import { ParticleSystem } from '../effects/ParticleSystem'
import { Leaderboard } from '../game/Leaderboard'
import { BottomNav, type NavView } from './components/BottomNav'
import { getBaronTabs, type BaronSection } from './components/BaronSections'
import { DISASTERS } from '../game/NaturalDisasters'
import { GoalsSheet } from './components/GoalsSheet'
import { EventsPanel } from './components/EventsPanel'
import { EmpirePanel } from './components/EmpirePanel'
import { UndergroundSheet } from './components/UndergroundSheet'
import { OwnerPanel } from './components/OwnerPanel'
import { applyDocumentTheme } from '../utils/themeApply'
import type { ThemeId } from '../game/Themes'
import { isOwnerSession } from '../owner/OwnerAuth'
import { OwnerAccessGate } from '../owner/OwnerAccessGate'
import { formatGameClock } from '../game/GameClock'
import { EventDirector } from '../game/EventDirector'
import type { GameEventDef } from '../game/Events'
import { activeTicker } from '../game/StockMarket'
import { parseFranchiseAction } from './components/shop/FranchiseBlock'
import { markRecentlyBought } from './components/shop/ShopBusinessTierView'
import { LifestylePanel } from './components/LifestylePanel'
import { FRANCHISE_CITIES, franchiseOpenFailureReason } from '../game/Franchise'
import { iapManager } from '../monetization/IAPManager'
import { hapticLight, hapticHeavy, hapticPurchase, hapticCombo10, hapticDeath, hapticIpo, hapticDisaster } from '../utils/haptics'
import { navLockReason, isShopHubLocked, shopHubLockReason } from '../game/ProgressiveUnlock'
import { i18n, LANG_META, t, type LangCode } from '../i18n'
import { applyCountry, type CountryId } from '../game/Countries'

export class HUD {
  private root: HTMLElement
  private tapWrap!: HTMLElement
  private tapArea!: HTMLButtonElement
  private floatLayer!: HTMLElement
  private comboFill!: HTMLElement
  private comboCountEl!: HTMLElement
  private comboMultEl!: HTMLElement
  private rankChip!: HTMLElement
  private rankProgressFill!: HTMLElement
  private rankProgressLabel!: HTMLElement
  private unlockProgressFill!: HTMLElement
  private unlockProgressLabel!: HTMLElement
  private rankRing!: HTMLElement
  private nextBizPreview!: HTMLElement
  private sessionClickIncome!: HTMLElement
  private sessionComboMult!: HTMLElement
  private sessionPassiveIncome!: HTMLElement
  private progressPathWidget!: HTMLElement
  private profileQuickBtn!: HTMLButtonElement
  private eraStrip!: HTMLElement
  private cityStrip!: HTMLElement
  private earnModifiersEl!: HTMLElement
  private baronView!: HTMLElement
  private baronSubTab: BaronSection = 'profile'
  private heatMeterFill!: HTMLElement
  private heatMeterLabel!: HTMLElement
  private heatMeterRow!: HTMLElement
  private weeklyBanner!: HTMLElement
  private goalsChip!: HTMLButtonElement
  private dayNightChip!: HTMLElement
  private pauseBtn!: HTMLButtonElement
  private earnView!: HTMLElement
  private gameMain!: HTMLElement
  private bottomNav: BottomNav
  private goalsSheet: GoalsSheet
  private eventsPanel: EventsPanel
  private empirePanel: EmpirePanel
  private undergroundSheet: UndergroundSheet
  private ownerPanel: OwnerPanel
  private titleEl!: HTMLHeadingElement
  private ownerAccessGate = new OwnerAccessGate()
  private profileHoldTimer: number | null = null
  private suppressProfileNav = false
  private adBannerSlot!: HTMLElement
  private statsBar: StatsBar
  private shop: ShopPanel
  private modals: ModalManager
  private settings: SettingsPanel
  private statsScreen: StatsScreen
  private lifestylePanel: LifestylePanel
  private tutorial: Tutorial
  private leaderboard: Leaderboard
  private skyline!: Skyline
  private particles!: ParticleSystem
  private pendingOffline = 0
  private eventTimerInterval: number | null = null
  private goldenEventExpiresAt = 0
  private lastShopRefresh = 0
  private lastShopPatch = 0
  private lastRankId = ''
  private uiSyncTimer: number | null = null
  private state: GameState
  private ads: AdManager
  private sound: SoundManager
  private saveManager: SaveManager
  private unsub: (() => void) | null = null
  private eventDirector = new EventDirector()
  private adPromptShown = false
  private lastUserTapMs = Date.now()
  private postIntroTasks = new Map<string, () => void>()

  constructor(
    state: GameState,
    ads: AdManager,
    sound: SoundManager,
    saveManager: SaveManager,
    app: HTMLElement,
  ) {
    this.state = state
    this.ads = ads
    this.sound = sound
    this.saveManager = saveManager
    this.root = app
    this.modals = new ModalManager()
    this.statsBar = new StatsBar(state)
    this.shop = new ShopPanel()
    this.bottomNav = new BottomNav()
    this.goalsSheet = new GoalsSheet()
    this.eventsPanel = new EventsPanel()
    this.empirePanel = new EmpirePanel()
    this.undergroundSheet = new UndergroundSheet()
    this.ownerPanel = new OwnerPanel(state, saveManager, () => this.renderAll())
    this.leaderboard = new Leaderboard()
    this.settings = new SettingsPanel(state, sound, saveManager, () => {
      this.tutorial.restart()
    }, () => this.renderAll(), (themeId) => {
      applyDocumentTheme(themeId)
    })
    this.statsScreen = new StatsScreen(state, this.leaderboard)
    this.lifestylePanel = new LifestylePanel()
    this.tutorial = new Tutorial(state)
    this.tutorial.setTabHandler((tab) => this.shop.setTab(tab, this.state))
    this.tutorial.setMandatoryCompleteHandler(() => this.handleIntroFlowReady())
    this.build()
    this.skyline = new Skyline(this.tapArea.parentElement!)
    this.skyline.setBuildingClickHandler((producerId) => {
      const p = PRODUCERS.find((x) => x.id === producerId)
      const income = this.state.producerIncome(p!)
      this.modals.showToast(this.root, `${p?.emoji ?? ''} ${p?.name ?? producerId}: ${formatIncomeRate(income)}`)
    })
    this.particles = new ParticleSystem(this.tapArea.parentElement!)
    this.bindEvents()
    this.startIdleDetection()
    this.renderAll()
    this.updateNavBadges()
    this.setView('earn')
    if (this.tutorial.shouldShow()) {
      window.setTimeout(() => this.tutorial.start(), 600)
    }
    if (this.state.hasPendingBankruptcyRecovery()) {
      window.setTimeout(() => {
        this.showBankruptcyPopup(
          'İflas sonrası kurtarma bekliyor',
          0,
          this.state.bankruptcyRecoveryPool,
          this.state.bankruptcySeizedSnapshot.map((item) => item.id),
        )
      }, 900)
    }
    this.bindOwnerAccess()
  }

  openOwnerPanel(): void {
    if (isOwnerSession()) this.ownerPanel.openDashboard()
    else this.ownerPanel.openLogin()
  }

  private bindOwnerAccess(): void {
    const holdMs = 3000
    const startProfileHold = (): void => {
      if (this.profileHoldTimer !== null) return
      this.profileHoldTimer = window.setTimeout(() => {
        this.profileHoldTimer = null
        this.ownerAccessGate.arm()
        this.suppressProfileNav = true
        window.setTimeout(() => { this.suppressProfileNav = false }, 500)
        void hapticHeavy()
      }, holdMs)
    }
    const cancelProfileHold = (): void => {
      if (this.profileHoldTimer !== null) {
        window.clearTimeout(this.profileHoldTimer)
        this.profileHoldTimer = null
      }
    }
    const baronBtn = this.bottomNav.root.querySelector('[data-id="profile"]')
    if (baronBtn) {
      baronBtn.addEventListener('pointerdown', startProfileHold)
      baronBtn.addEventListener('pointerup', cancelProfileHold)
      baronBtn.addEventListener('pointerleave', cancelProfileHold)
      baronBtn.addEventListener('pointercancel', cancelProfileHold)
    }

    this.titleEl.addEventListener('click', (e) => {
      e.stopPropagation()
      if (this.ownerAccessGate.registerTitleTap()) this.openOwnerPanel()
    })

    window.addEventListener('keydown', (e) => {
      if (this.ownerPanel.isOpen()) return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        if (this.ownerAccessGate.registerKey(e.key)) this.openOwnerPanel()
      }
    })
  }

  private build(): void {
    this.root.replaceChildren()
    this.root.className = 'app-root v4'

    this.weeklyBanner = document.createElement('div')
    this.weeklyBanner.className = 'weekly-banner'
    this.weeklyBanner.hidden = true

    const header = document.createElement('header')
    header.className = 'hud-header compact'
    const titleRow = document.createElement('div')
    titleRow.className = 'title-row'
    const title = document.createElement('h1')
    title.textContent = t('app_title')
    this.titleEl = title
    const actions = document.createElement('div')
    actions.className = 'header-actions'

    this.goalsChip = document.createElement('button')
    this.goalsChip.type = 'button'
    this.goalsChip.className = 'goals-chip'
    this.goalsChip.dataset.action = 'open-goals'
    this.goalsChip.textContent = t('hud_goals')

    this.dayNightChip = document.createElement('span')
    this.dayNightChip.className = 'day-night-chip'

    this.pauseBtn = document.createElement('button')
    this.pauseBtn.type = 'button'
    this.pauseBtn.className = 'btn-pause'
    this.pauseBtn.dataset.action = 'toggle-pause'
    this.pauseBtn.setAttribute('aria-label', 'Oyunu duraklat')
    this.pauseBtn.textContent = '⏸'

    const dailyBtn = document.createElement('button')
    dailyBtn.type = 'button'
    dailyBtn.className = 'btn-daily'
    dailyBtn.dataset.action = 'daily'
    dailyBtn.textContent = '🎁'
    actions.append(this.goalsChip, this.pauseBtn, this.dayNightChip, dailyBtn)
    titleRow.append(title, actions)
    this.progressPathWidget = document.createElement('div')
    this.progressPathWidget.className = 'progress-path-widget'
    this.profileQuickBtn = document.createElement('button')
    this.profileQuickBtn.type = 'button'
    this.profileQuickBtn.className = 'header-profile-btn'
    this.profileQuickBtn.dataset.action = 'open-profile'
    this.profileQuickBtn.title = 'Baron profili'
    header.append(titleRow, this.profileQuickBtn, this.progressPathWidget, this.statsBar.root)

    const main = document.createElement('main')
    main.className = 'game-main'
    this.gameMain = main

    this.earnView = document.createElement('div')
    this.earnView.className = 'earn-view'

    const tapWrap = document.createElement('div')
    tapWrap.className = 'tap-wrap'
    this.tapWrap = tapWrap

    this.tapArea = document.createElement('button')
    this.tapArea.type = 'button'
    this.tapArea.className = 'tap-area'
    this.tapArea.setAttribute('aria-label', 'Kazanç için tıkla')
    const tapInner = document.createElement('div')
    tapInner.className = 'tap-inner'
    const mascot = document.createElement('img')
    mascot.className = 'tap-mascot'
    mascot.src = assetUrl('assets/mascot.svg')
    mascot.alt = ''
    mascot.onerror = () => {
      mascot.remove()
      const tapEmoji = document.createElement('span')
      tapEmoji.className = 'tap-emoji'
      tapEmoji.textContent = '💼'
      tapInner.prepend(tapEmoji)
    }
    const tapLabel = document.createElement('span')
    tapLabel.className = 'tap-label'
    tapLabel.textContent = t('tap_label')
    tapInner.append(mascot, tapLabel)
    this.tapArea.appendChild(tapInner)

    this.floatLayer = document.createElement('div')
    this.floatLayer.className = 'float-layer'

    const comboWrap = document.createElement('div')
    comboWrap.className = 'combo-wrap'
    const comboRow = document.createElement('div')
    comboRow.className = 'combo-label-row'
    this.comboCountEl = document.createElement('span')
    this.comboCountEl.className = 'combo-count'
    this.comboCountEl.textContent = 'Combo x0'
    this.comboMultEl = document.createElement('span')
    this.comboMultEl.className = 'combo-mult'
    this.comboMultEl.textContent = '1x'
    comboRow.append(this.comboCountEl, this.comboMultEl)
    const comboTrack = document.createElement('div')
    comboTrack.className = 'combo-track'
    this.comboFill = document.createElement('div')
    this.comboFill.className = 'combo-fill'
    comboTrack.appendChild(this.comboFill)
    comboWrap.append(comboRow, comboTrack)

    tapWrap.append(this.tapArea, this.floatLayer)

    const progressStrip = document.createElement('div')
    progressStrip.className = 'player-progress-strip'
    const progressTop = document.createElement('div')
    progressTop.className = 'progress-strip-top'
    this.rankRing = document.createElement('div')
    this.rankRing.className = 'rank-ring'
    this.rankChip = document.createElement('div')
    this.rankChip.className = 'rank-chip'
    progressTop.append(this.rankRing, this.rankChip)
    this.nextBizPreview = document.createElement('div')
    this.nextBizPreview.className = 'next-biz-preview'
    const rankBars = document.createElement('div')
    rankBars.className = 'progress-strip-bars'
    const rankBlock = document.createElement('div')
    rankBlock.className = 'progress-mini'
    this.rankProgressLabel = document.createElement('span')
    this.rankProgressLabel.className = 'progress-mini-label'
    const rankBar = document.createElement('div')
    rankBar.className = 'progress-bar progress-mini-bar'
    this.rankProgressFill = document.createElement('div')
    this.rankProgressFill.className = 'progress-fill'
    rankBar.appendChild(this.rankProgressFill)
    rankBlock.append(this.rankProgressLabel, rankBar)
    const unlockBlock = document.createElement('div')
    unlockBlock.className = 'progress-mini'
    this.unlockProgressLabel = document.createElement('span')
    this.unlockProgressLabel.className = 'progress-mini-label'
    const unlockBar = document.createElement('div')
    unlockBar.className = 'progress-bar progress-mini-bar'
    this.unlockProgressFill = document.createElement('div')
    this.unlockProgressFill.className = 'progress-fill unlock-fill'
    unlockBar.appendChild(this.unlockProgressFill)
    unlockBlock.append(this.unlockProgressLabel, unlockBar)
    rankBars.append(rankBlock, unlockBlock)
    progressStrip.append(progressTop, this.nextBizPreview, rankBars)

    const sessionPanel = document.createElement('div')
    sessionPanel.className = 'session-panel'
    const sessionGrid = document.createElement('div')
    sessionGrid.className = 'session-grid'
    const clickBlock = document.createElement('div')
    clickBlock.className = 'session-stat'
    const clickLabel = document.createElement('span')
    clickLabel.className = 'session-label'
    clickLabel.textContent = t('hud_click_label')
    this.sessionClickIncome = document.createElement('strong')
    this.sessionClickIncome.className = 'session-value'
    clickBlock.append(clickLabel, this.sessionClickIncome)
    const comboBlock = document.createElement('div')
    comboBlock.className = 'session-stat'
    const comboLabel = document.createElement('span')
    comboLabel.className = 'session-label'
    comboLabel.textContent = t('combo_label')
    this.sessionComboMult = document.createElement('strong')
    this.sessionComboMult.className = 'session-value session-combo'
    comboBlock.append(comboLabel, this.sessionComboMult)
    const passiveBlock = document.createElement('div')
    passiveBlock.className = 'session-stat session-stat-wide'
    const passiveLabel = document.createElement('span')
    passiveLabel.className = 'session-label'
    passiveLabel.textContent = t('hud_passive_label')
    this.sessionPassiveIncome = document.createElement('strong')
    this.sessionPassiveIncome.className = 'session-value session-passive'
    passiveBlock.append(passiveLabel, this.sessionPassiveIncome)
    sessionGrid.append(clickBlock, comboBlock, passiveBlock)
    sessionPanel.appendChild(sessionGrid)

    const heatRow = document.createElement('div')
    heatRow.className = 'heat-meter-row'
    heatRow.hidden = true
    this.heatMeterRow = heatRow
    const heatLabel = document.createElement('span')
    heatLabel.className = 'heat-meter-title'
    heatLabel.textContent = t('hud_radar_label')
    this.heatMeterLabel = document.createElement('span')
    this.heatMeterLabel.className = 'heat-meter-status'
    const heatBar = document.createElement('div')
    heatBar.className = 'progress-bar heat-meter-bar'
    this.heatMeterFill = document.createElement('div')
    this.heatMeterFill.className = 'progress-fill heat-meter-fill'
    heatBar.appendChild(this.heatMeterFill)
    heatRow.append(heatLabel, this.heatMeterLabel, heatBar)
    const heatCleanBtn = document.createElement('button')
    heatCleanBtn.type = 'button'
    heatCleanBtn.className = 'btn-underground-open'
    heatCleanBtn.dataset.action = 'open-underground'
    heatCleanBtn.textContent = t('hud_radar_clean')
    heatRow.appendChild(heatCleanBtn)
    sessionPanel.appendChild(heatRow)

    const adsPanel = document.createElement('div')
    adsPanel.className = 'quick-ads collapsible-boosts'
    const adDouble = document.createElement('button')
    adDouble.type = 'button'
    adDouble.className = 'quick-ad-card'
    adDouble.dataset.action = 'ad-double'
    adDouble.innerHTML = `<span class="quick-ad-icon">📺</span><span class="quick-ad-text"><strong>${t('hud_ad_double')}</strong><small>${t('hud_ad_double_desc')}</small></span>`
    const adChest = document.createElement('button')
    adChest.type = 'button'
    adChest.className = `quick-ad-card${this.state.luckyChestReady ? ' chest-ready' : ''}`
    adChest.dataset.action = 'ad-chest'
    adChest.innerHTML = `<span class="quick-ad-icon">🎁</span><span class="quick-ad-text"><strong>${t('hud_chest')}</strong><small>${t('hud_chest_desc')}</small></span>`
    adsPanel.append(adDouble, adChest)

    const earnHero = document.createElement('div')
    earnHero.className = 'earn-tab-hero'
    earnHero.innerHTML = `<h2>${t('hud_tap_hero_title')}</h2><p>${t('hud_tap_hero_desc')}</p>`

    this.eraStrip = document.createElement('div')
    this.eraStrip.className = 'era-strip'
    this.cityStrip = document.createElement('div')
    this.cityStrip.className = 'city-strip'
    this.earnModifiersEl = document.createElement('div')
    this.earnModifiersEl.className = 'earn-modifiers-strip'
    this.earnModifiersEl.hidden = true

    this.baronView = document.createElement('div')
    this.baronView.className = 'baron-view tab-panel'
    this.baronView.hidden = true
    const baronSubNav = document.createElement('div')
    baronSubNav.className = 'baron-subnav'
    for (const { id, label } of getBaronTabs()) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `baron-subnav-btn${id === 'profile' ? ' active' : ''}`
      btn.dataset.action = 'baron-tab'
      btn.dataset.id = id
      btn.textContent = label
      baronSubNav.appendChild(btn)
    }
    this.baronView.append(baronSubNav)
    this.baronView.appendChild(this.eventsPanel.root)
    this.baronView.appendChild(this.lifestylePanel.root)
    this.statsScreen.embedIn(this.baronView)

    this.earnView.append(this.weeklyBanner, this.eraStrip, this.cityStrip, this.earnModifiersEl, tapWrap, comboWrap, sessionPanel, progressStrip, adsPanel)
    main.append(this.earnView, this.shop.root, this.baronView, this.empirePanel.root)

    this.adBannerSlot = document.createElement('div')
    this.adBannerSlot.className = 'ad-banner-slot'
    this.adBannerSlot.id = 'ad-banner'

    this.goalsSheet.mount(this.root)
    this.undergroundSheet.mount(this.root)
    this.root.append(header, main, this.adBannerSlot, this.settings.layer, this.modals.layer)
    document.body.appendChild(this.bottomNav.root)
    this.syncAdBanner()
    this.renderDayNightChip()
    this.renderProgressStrip()
    this.lastRankId = currentRank(this.state.totalEarned).id
  }

  private setView(view: NavView): void {
    this.goalsSheet.close()
    this.closeModalAndPump()
    this.tutorial.onViewChange(view)
    this.bottomNav.setActive(view)
    this.earnView.hidden = view !== 'earn'
    this.shop.root.hidden = view !== 'shop' && view !== 'market'
    this.baronView.hidden = view !== 'profile' && view !== 'events'
    this.empirePanel.root.hidden = true
    this.empirePanel.root.classList.remove('empire-overlay-open')
    this.gameMain.classList.toggle('earn-active', view === 'earn')
    this.gameMain.classList.toggle('shop-scroll-lock', view === 'shop' || view === 'market' || view === 'events' || view === 'profile')
    this.root.dataset.view = view
    if (view === 'shop') {
      this.shop.setViewContext('shop', this.state)
      this.refreshShop(true)
    }
    if (view === 'market') {
      this.shop.setViewContext('market', this.state)
      this.refreshShop(true)
    }
    if (view === 'events') {
      this.baronSubTab = 'events'
      this.syncBaronTab()
    } else if (view === 'profile') {
      this.syncBaronTab()
    } else {
      this.settings.hide()
    }
  }

  private baronShowsEvents(): boolean {
    return this.bottomNav.getActive() === 'events' || (this.bottomNav.getActive() === 'profile' && this.baronSubTab === 'events')
  }

  private refreshBaronPanel(): void {
    if (this.bottomNav.getActive() !== 'profile' && this.bottomNav.getActive() !== 'events') return
    if (this.baronSubTab === 'events' || this.baronSubTab === 'lifestyle') return
    this.statsScreen.renderSection(this.baronSubTab)
  }

  private static readonly BARON_TAB_KEYS: Record<string, keyof import('../i18n/keys').Translations> = {
    profile: 'tab_profile',
    dynasty: 'tab_dynasty',
    world: 'tab_world',
    lifestyle: 'tab_lifestyle',
    events: 'tab_events',
  }

  private relabelBaronNav(): void {
    this.baronView.querySelectorAll<HTMLElement>('.baron-subnav-btn').forEach((btn) => {
      const key = HUD.BARON_TAB_KEYS[btn.dataset.id ?? '']
      if (key) btn.textContent = i18n.t(key)
    })
  }

  private syncBaronTab(): void {
    const tab = this.baronSubTab
    const isEvents = tab === 'events'
    const isLifestyle = tab === 'lifestyle'
    this.baronView.classList.toggle('events-standalone', isEvents && this.bottomNav.getActive() === 'events')
    this.eventsPanel.root.hidden = !isEvents
    this.lifestylePanel.root.hidden = !isLifestyle
    if (isEvents) {
      this.statsScreen.hide()
      this.lifestylePanel.root.hidden = true
      this.eventsPanel.render(this.state)
    } else if (isLifestyle) {
      this.statsScreen.hide()
      this.lifestylePanel.render(this.state)
    } else {
      this.statsScreen.show(tab)
    }
    this.baronView.querySelectorAll('.baron-subnav-btn').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.id === tab)
    })
  }

  private isIntroFlowReady(): boolean {
    return this.state.onboardingComplete || this.state.tutorialDone
  }

  private runWhenIntroReady(id: string, task: () => void): boolean {
    if (this.isIntroFlowReady()) return true
    this.postIntroTasks.set(id, task)
    return false
  }

  private handleIntroFlowReady(): void {
    this.state.startTick()
    this.state.startEventLoop()
    this.saveManager.save(this.state)
    const tasks = [...this.postIntroTasks.values()]
    this.postIntroTasks.clear()
    for (const task of tasks) task()
    this.eventDirector.release()
    this.renderAll()
  }

  private renderProfileQuickBtn(): void {
    const name = this.state.playerName.trim() || 'Baron'
    const title = this.state.playerTitle()
    const emoji = document.createElement('span')
    emoji.className = 'header-profile-emoji'
    emoji.textContent = title.emoji
    const text = document.createElement('span')
    text.className = 'header-profile-text'
    text.textContent = name
    this.profileQuickBtn.replaceChildren(emoji, text)
  }

  private updateNavBadges(): void {
    const target = this.state.dailyGoalTarget()
    const dailyGoalReady = this.state.dailyGoalEarned >= target && !this.state.dailyGoalClaimed
    this.bottomNav.setBadges(
      false,
      this.shop.hasShopBadge(this.state),
      this.shop.hasMarketBadge(this.state),
      this.state.hasClaimableSeasonReward()
        || this.state.hasClaimableCampaignReward()
        || this.state.luckyChestReady
        || (this.state.weekly.progress >= this.state.weekly.target && !this.state.weekly.claimed)
        || dailyGoalReady
        || this.state.canClaimDaily()
        || this.state.hasPendingBoosts(),
    )
  }

  private renderMarketNewsBanner(): void {
    const headline = this.state.currentMarketHeadline()
    if (headline) {
      this.weeklyBanner.hidden = false
      this.weeklyBanner.className = 'weekly-banner market-news-banner market-news-clickable'
      this.weeklyBanner.textContent = headline
      this.weeklyBanner.dataset.action = 'open-finance-news'
      return
    }
    this.weeklyBanner.dataset.action = ''
    this.renderWeeklyBanner()
  }

  private renderDayNightChip(): void {
    const clock = formatGameClock(this.state.gameTimeMs)
    if (this.state.isPaused()) {
      this.dayNightChip.textContent = `⏸ Duraklatıldı · ${clock}`
      this.pauseBtn.textContent = '▶'
      this.pauseBtn.setAttribute('aria-label', 'Oyunu devam ettir')
      this.pauseBtn.classList.add('is-paused')
      return
    }
    this.pauseBtn.textContent = '⏸'
    this.pauseBtn.setAttribute('aria-label', 'Oyunu duraklat')
    this.pauseBtn.classList.remove('is-paused')
    if (this.state.isNight) {
      const pct = Math.round((0.15 + nightBonusExtra(this.state.prestigeTree)) * 100)
      this.dayNightChip.textContent = `${clock} · ` + t('hud_weekend_bonus').replace('{pct}', String(pct))
    } else {
      const pct = Math.round((0.1 + dayBonusExtra(this.state.prestigeTree)) * 100)
      this.dayNightChip.textContent = `${clock} · ` + t('hud_weekday_bonus').replace('{pct}', String(pct))
    }
  }

  private startIdleDetection(): void {
    const IDLE_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
    const check = (): void => {
      const elapsed = Date.now() - this.lastUserTapMs
      if (elapsed >= IDLE_THRESHOLD_MS) {
        const passiveIncome = this.state.incomePerSecond()
        if (passiveIncome > 0) {
          this.modals.showToast(
            this.root,
            `💤 Pasif gelir birikiyor — yönetici alırsan tıklamasan da kazanırsın!`,
          )
        }
        this.lastUserTapMs = Date.now() // Reset so hint doesn't repeat immediately
      }
      window.setTimeout(check, IDLE_THRESHOLD_MS)
    }
    window.setTimeout(check, IDLE_THRESHOLD_MS)
  }

  private bindEvents(): void {
    let lastTapMs = 0
    const performTap = (clientX: number, clientY: number): void => {
      const now = Date.now()
      if (now - lastTapMs < 80) return
      lastTapMs = now
      this.lastUserTapMs = now
      this.sound.resume()
      void hapticLight()
      this.tapArea.classList.remove('tap-ripple')
      void this.tapArea.offsetWidth
      this.tapArea.classList.add('tap-ripple')
      window.setTimeout(() => this.tapArea.classList.remove('tap-ripple'), 450)
      const rect = this.tapArea.getBoundingClientRect()
      this.state.click(clientX - rect.left, clientY - rect.top)
      this.tutorial.onTapMade()
    }
    this.tapArea.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      performTap(e.clientX, e.clientY)
    })
    this.tapArea.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      const rect = this.tapArea.getBoundingClientRect()
      performTap(rect.left + rect.width / 2, rect.top + rect.height / 2)
    })

    const onActionClick = (e: Event): void => {
      const target = e.target as HTMLElement
      if (target.closest('.owner-pin-input, .owner-login-card, .owner-panel-body input, .owner-panel-body textarea, .owner-panel-body form')) return
      const el = target.closest('[data-action]') as HTMLElement | null
      if (!el?.dataset.action) return
      if (el instanceof HTMLButtonElement && el.disabled) return
      e.preventDefault()
      let countVal = el.dataset.count
      if (countVal === 'custom') {
        const inputEl = el.closest('.finance-custom-row, .stock-custom-row')?.querySelector<HTMLInputElement>('.finance-custom-input')
        countVal = inputEl?.value && Number(inputEl.value) > 0 ? inputEl.value : undefined
      }
      void this.handleAction(el.dataset.action, el.dataset.id, countVal)
    }
    this.root.addEventListener('click', onActionClick)
    this.shop.root.addEventListener('click', onActionClick)
    this.bottomNav.root.addEventListener('click', onActionClick)
    this.eventsPanel.root.addEventListener('click', onActionClick)
    this.modals.layer.addEventListener('click', onActionClick)

    this.goalsSheet.scrim.addEventListener('click', onActionClick)
    this.goalsSheet.sheet.addEventListener('click', onActionClick)
    this.ownerPanel.layer.addEventListener('click', onActionClick)
    this.undergroundSheet.scrim.addEventListener('click', onActionClick)
    this.undergroundSheet.sheet.addEventListener('click', onActionClick)

    this.settings.layer.addEventListener('click', onActionClick)
    this.statsScreen.layer.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null
      if (el?.dataset.action === 'close-stats') {
        this.statsScreen.hide()
        return
      }
      if (el?.dataset.action) {
        void this.handleAction(el.dataset.action, el.dataset.id, el.dataset.count)
      }
    })

    this.unsub = this.state.subscribe((ev) => {
      if (ev.type === 'money_changed') {
        this.statsBar.render(false)
        const nav = this.bottomNav.getActive()
        if (nav === 'shop' && this.shop.getViewContext() === 'shop') {
          const hub = this.shop.getActiveTab()
          if (hub === 'growth' || hub === 'empire') {
            this.shop.patchAffordability(this.state)
          } else {
            this.refreshShop(false)
          }
        } else if (nav === 'shop' || nav === 'market') {
          this.refreshShop(false)
        }
        if (this.baronShowsEvents()) {
          if (!this.eventsPanel.patchLive(this.state)) this.eventsPanel.render(this.state)
        }
        this.scheduleUiSync()
        this.renderProgressStrip()
        this.checkRankUp()
      }
      if (ev.type === 'click') {
        this.root.classList.add('money-pulse')
        window.setTimeout(() => this.root.classList.remove('money-pulse'), 220)
      }
      if (ev.type === 'illegal_raid') {
        const p = PRODUCERS.find((x) => x.id === ev.producerId)
        this.modals.showToast(this.root, `🚨 Baskın! ${p?.name ?? 'Illegal iş'} — ${formatMoney(ev.fine)} ceza`)
        this.renderHeatMeter()
        this.renderAll()
      }
      if (ev.type === 'illegal_heat') {
        this.renderHeatMeter()
        if (this.bottomNav.getActive() === 'shop' || this.bottomNav.getActive() === 'market') {
          this.shop.render(this.state, false)
        }
      }
      if (ev.type === 'producer_unlocked') {
        this.modals.showToast(this.root, '🔓 Yeni işletme erken açıldı!')
        this.refreshShop(true)
      }
      if (ev.type === 'passive_income') {
        this.patchShopAffordability()
      }
      if (ev.type === 'stock_tick' && this.bottomNav.getActive() === 'market') {
        this.shop.render(this.state, true)
      }
      if (ev.type === 'click') {
        this.sound.playClick(ev.critical, ev.combo)
        this.sound.playCombo(ev.combo)
        if (this.state.hapticsEnabled) {
          void hapticLight()
          if (ev.combo >= 10 && ev.combo % 5 === 0) void hapticCombo10()
        }
        if (ev.critical) {
          this.particles.spawnCritical(ev.x, ev.y)
          void hapticHeavy()
          this.tapWrap.classList.remove('shake')
          void this.tapWrap.offsetWidth
          this.tapWrap.classList.add('shake')
          window.setTimeout(() => this.tapWrap.classList.remove('shake'), 300)
        } else {
          this.particles.spawnCoins(ev.x, ev.y)
        }
        this.spawnFloat(ev.amount, ev.x, ev.y, ev.critical, ev.combo)
        this.renderCombo(ev.combo, this.state.comboMultiplier)
        // Mascot bounce animasyonu
        const mascotEl = this.tapArea.querySelector('.tap-mascot, .tap-emoji') as HTMLElement | null
        if (mascotEl) {
          mascotEl.classList.remove('mascot-bounce')
          void mascotEl.offsetWidth
          mascotEl.classList.add('mascot-bounce')
          window.setTimeout(() => mascotEl.classList.remove('mascot-bounce'), 400)
        }
        if (ev.combo >= 25) {
          this.tapWrap.classList.add('combo-fire')
          window.setTimeout(() => this.tapWrap.classList.remove('combo-fire'), 400)
        } else if (ev.combo >= 10) {
          this.tapWrap.classList.add('combo-heat')
          window.setTimeout(() => this.tapWrap.classList.remove('combo-heat'), 300)
        }
        // Her 10 combo'da ekrana ışık çakması
        if (ev.combo > 0 && ev.combo % 10 === 0) {
          const flash = document.createElement('div')
          flash.className = 'combo-flash'
          this.root.appendChild(flash)
          window.setTimeout(() => flash.remove(), 600)
        }
        // Haptic feedback (mobil)
        if ('vibrate' in navigator) navigator.vibrate(20)
      }
      if (ev.type === 'combo_changed') this.renderCombo(ev.combo, ev.multiplier)
      if (ev.type === 'purchase' || ev.type === 'manager_hired' || ev.type === 'auto_buy') {
        this.sound.playPurchase()
        if (this.state.hapticsEnabled) void hapticPurchase()
        this.particles.spawnPurchasePulse()
        if (ev.type === 'purchase') {
          this.particles.spawnMoneyToHeader()
          this.tutorial.onPurchaseMade()
          this.maybePromptFirstBusinessAd()
        }
        this.statsBar.updateMeta()
        this.refreshShop(true)
        this.refreshSkyline()
      }
      if (ev.type === 'prestige') {
        this.sound.playPrestige()
        if (this.state.hapticsEnabled) void hapticIpo()
        this.sound.setAmbient('day')
        this.skyline.flashUpgrade()
        this.showIpoAnimation(ev.points)
        this.renderAll()
      }
      if (ev.type === 'achievement') {
        this.sound.playAchievement()
        this.particles.spawnConfetti()
        this.modals.showAchievementToast(ev.def.emoji, ev.def.name, formatMoney(ev.def.reward))
        this.refreshShop(true)
      }
      if (ev.type === 'milestone_reached') this.showMilestone(ev.amount)
      if (ev.type === 'golden_event_preview') {
        this.modals.showToast(this.root, `⏳ ${ev.hint}`)
      }
      if (ev.type === 'golden_event') {
        this.sound.playEvent()
        const { event, expiresAt } = ev
        this.eventDirector.enqueue({
          id: 'golden',
          priority: 2,
          run: () => this.showGoldenEventModal(event, expiresAt),
        })
      }
      if (ev.type === 'event_missed') {
        this.clearGoldenEventTimer()
        const { event } = ev
        this.eventDirector.enqueue({
          id: 'missed',
          priority: 2,
          run: () => this.showMissedEventOffer(event),
        })
      }
      if (ev.type === 'event_claimed') {
        this.clearGoldenEventTimer()
        this.closeModalAndPump()
        const msg = ev.event.rewardType === 'income_boost'
          ? `${ev.event.title} — bonus envantere eklendi`
          : `${ev.event.title} — +${formatMoney(ev.reward)}`
        this.modals.showToast(this.root, msg)
        this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'daily_goal_updated') {
        this.goalsSheet.render(this.state)
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'day_night' || ev.type === 'game_time' || ev.type === 'game_pause') {
        this.renderDayNightChip()
        if (ev.type === 'day_night') {
          this.renderMarketNewsBanner()
          this.statsBar.updateMeta()
          this.sound.setAmbient(ev.isNight ? 'night' : 'day')
          this.refreshShop(true)
        } else {
          this.statsBar.tickBoostTimers()
        }
        if (this.baronShowsEvents()) {
          if (!this.eventsPanel.patchLive(this.state)) this.eventsPanel.render(this.state)
        }
      }
      if (ev.type === 'life_event_triggered') {
        this.showLifeEventModal(ev.eventDef)
      }
      if (ev.type === 'life_event_consequence') {
        this.modals.showToast(this.root, ev.headline)
        if (this.baronSubTab === 'lifestyle') this.lifestylePanel.render(this.state)
      }
      if (ev.type === 'market_news') {
        this.renderMarketNewsBanner()
        this.statsBar.updateMeta()
        this.refreshShop(true)
      }
      if (ev.type === 'dynasty_update') {
        this.refreshBaronPanel()
        this.renderEraStrip()
        this.renderCityStrip()
      }
      if (ev.type === 'reputation_changed') {
        if (ev.delta <= -5) this.toast(`⭐ İtibar ${ev.reputation} (${ev.delta})`, true)
      }
      if (ev.type === 'loan_denied') {
        this.toast(`🏦 ${ev.reason}`, true)
      }
      if (ev.type === 'crisis_started') {
        this.sound.setAmbient('crisis')
        this.showCrisisModal(ev.crisisId, ev.title)
      }
      if (ev.type === 'crisis_resolved') {
        this.sound.setAmbient(this.state.isNight ? 'night' : 'day')
        this.closeModalAndPump()
      }
      if (ev.type === 'victory_mechanic_unlocked') {
        this.eventDirector.enqueue({
          id: `mechanic-${ev.victoryId}`,
          priority: 1,
          run: () => {
            this.modals.show(
              `${ev.emoji} Yeni kapı açıldı!`,
              `${ev.title} — ${ev.description}\n\nOyun devam ediyor; yeni stratejiler deneyebilirsin.`,
              [(() => {
                const b = document.createElement('button')
                b.type = 'button'
                b.className = 'btn-primary'
                b.dataset.action = 'close-modal'
                b.textContent = 'Keşfet!'
                return b
              })()],
            )
          },
        })
      }
      if (ev.type === 'rival_alliance_offer') {
        this.showRivalAllianceModal(ev.offer)
      }
      if (ev.type === 'investment_offer') {
        this.updateNavBadges()
        this.refreshShop(true)
      }
      if (ev.type === 'player_title') {
        this.renderEraStrip()
      }
      if (ev.type === 'rival_action') {
        this.refreshBaronPanel()
      }
      if (ev.type === 'rival_surpassed') {
        this.modals.showToast(
          this.root,
          `⚠️ ${ev.rivalName} sizi geçti! Net servet: ${formatMoney(ev.rivalWorth)}`,
          'important',
        )
        this.refreshBaronPanel()
      }
      if (ev.type === 'victory_unlocked') {
        this.eventDirector.enqueue({
          id: `victory-${ev.victoryId}`,
          priority: 1,
          run: () => {
            this.modals.show(
              `${ev.emoji} Zafer yolu tamamlandı!`,
              `${ev.name} — yeni mekanik açıldı, oyun devam ediyor.`,
              [(() => {
                const b = document.createElement('button')
                b.type = 'button'
                b.className = 'btn-primary'
                b.dataset.action = 'close-modal'
                b.textContent = t('btn_continue')
                return b
              })()],
            )
          },
        })
        this.refreshBaronPanel()
      }
      if (ev.type === 'child_crisis') {
        this.refreshBaronPanel()
      }
      if (ev.type === 'player_death') {
        // Özet baron_eulogy ile gösterilir
      }
      if (ev.type === 'baron_eulogy') {
        this.sound.playDeath()
        if (this.state.hapticsEnabled) void hapticDeath()
        this.showBaronEulogy(ev.record, ev.hasHeir)
      }
      if (ev.type === 'disaster_hit') {
        this.sound.playDisaster()
        if (this.state.hapticsEnabled) void hapticDisaster()
        this.showDisasterModal(ev)
      }
      if (ev.type === 'undo_available') {
        this.showUndoPrompt(ev.label, ev.cost, ev.undoId)
      }
      if (ev.type === 'season_updated' || ev.type === 'season_claimed') {
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'prestige_tree') {
        this.statsBar.updateMeta()
        this.refreshShop(true)
        this.renderDayNightChip()
      }
      if (ev.type === 'market_event') {
        this.refreshShop(true)
      }
      if (ev.type === 'macro_event') {
        if (this.shop.getViewContext() === 'market') this.refreshShop(true)
      }
      if (ev.type === 'bankruptcy') {
        const { reason, loss, recoveryPool, seizedBusinesses } = ev
        this.eventDirector.enqueue({
          id: 'bankruptcy',
          priority: 1,
          run: () => this.renderBankruptcyPopup(reason, loss, recoveryPool, seizedBusinesses),
        })
        this.refreshShop(true)
      }
      if (ev.type === 'mission_complete') {
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
        this.refreshShop(true)
      }
      if (ev.type === 'weekly_updated') {
        this.goalsSheet.render(this.state)
        this.renderWeeklyBanner()
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'daily_goal_updated' || ev.type === 'daily_reward' || ev.type === 'season_updated' || ev.type === 'season_claimed') {
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
      }
      if (ev.type === 'story_beat') {
        // sessiz — kronikte görünür
      }
      if (ev.type === 'chest_opened' && ev.loot?.rarity === 'legendary') {
        this.sound.playLegendaryChest()
      }
      if (ev.type === 'near_miss') {
        // sessiz
      }
      if (ev.type === 'match_result') {
        const icon = ev.won ? '⚽' : '🏟️'
        const bonus = ev.bonus > 0 ? ` · +${formatMoney(ev.bonus)}` : ''
        this.modals.showToast(
          this.root,
          `${icon} ${ev.clubName} ${ev.score} · +${ev.fanGain.toLocaleString('tr-TR')} taraftar${bonus}`,
        )
        if (this.empirePanel.root && !this.empirePanel.root.hidden) {
          this.empirePanel.render(this.state)
        }
      }
      if (ev.type === 'surprise_investor') {
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'pending_boost_added' || ev.type === 'boost_activated') {
        this.statsBar.updateMeta()
        if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'comeback_ready') {
        this.showComebackPopup()
      }
      if (ev.type === 'theme_unlocked') {
        this.modals.showToast(this.root, `🎨 Yeni tema: ${ev.themeId}!`)
        applyDocumentTheme(this.state.activeTheme)
      }
      if (ev.type === 'badge_earned') {
        this.modals.showToast(this.root, '🏅 Yeni rozet kazandın!')
        this.refreshBaronPanel()
      }
      if (ev.type === 'underground_action') {
        this.undergroundSheet.render(this.state)
        this.renderHeatMeter()
      }
      if (ev.type === 'daily_reward') {
        this.updateNavBadges()
      }
      if (ev.type === 'stock_trade') {
        this.particles.spawnPurchasePulse()
        this.refreshShop(true)
      }
      if (ev.type === 'ad_boost') {
        this.statsBar.updateMeta()
        if (this.baronShowsEvents()) {
          if (!this.eventsPanel.patchLive(this.state)) this.eventsPanel.render(this.state)
        }
      }
      if (ev.type === 'research_purchased') {
        this.sound.playPurchase()
        this.refreshShop(true)
      }
      if (ev.type === 'calendar_event') {
        this.modals.showToast(this.root, `${ev.emoji} ${ev.headline}`, 'important')
      }
    })
  }

  private refreshShop(force: boolean): void {
    const nav = this.bottomNav.getActive()
    if (nav !== 'shop' && nav !== 'market') return
    const now = Date.now()
    if (force || now - this.lastShopRefresh >= 800) {
      this.lastShopRefresh = now
      this.shop.render(this.state, !force, false)
    }
  }

  private patchShopAffordability(): void {
    const now = Date.now()
    if (now - this.lastShopPatch < 350) return
    this.lastShopPatch = now
    this.shop.patchAffordability(this.state)
  }

  private renderDailyGoalBar(): void {
    this.goalsSheet.render(this.state)
  }

  private clearGoldenEventTimer(): void {
    if (this.eventTimerInterval !== null) {
      clearInterval(this.eventTimerInterval)
      this.eventTimerInterval = null
    }
  }

  private renderWeeklyBanner(): void {
    const def = this.state.getWeeklyEventDef()
    const w = this.state.weekly
    const pct = w.target > 0 ? Math.min(100, (w.progress / w.target) * 100) : 0
    this.weeklyBanner.replaceChildren()
    this.weeklyBanner.hidden = false
    const text = document.createElement('span')
    text.textContent = `🗓️ ${def.name}: ${formatMoney(w.progress)} / ${formatMoney(w.target)}`
    const bar = document.createElement('div')
    bar.className = 'weekly-bar'
    const fill = document.createElement('div')
    fill.className = 'weekly-fill'
    fill.style.width = `${pct}%`
    bar.appendChild(fill)
    this.weeklyBanner.append(text, bar)
    if (w.progress >= w.target && !w.claimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'weekly-claim'
      btn.dataset.action = 'claim-weekly'
      btn.textContent = t('btn_collect')
      this.weeklyBanner.appendChild(btn)
    }
  }

  private showMilestone(amount: number): void {
    this.particles.spawnConfetti()
    const keyMap: Record<number, keyof import('../i18n/keys').Translations> = {
      1_000: 'milestone_1k',
      10_000: 'milestone_10k',
      100_000: 'milestone_100k',
      1_000_000: 'milestone_1m',
      10_000_000: 'milestone_10m',
      100_000_000: 'milestone_100m',
      1_000_000_000: 'milestone_1b',
    }
    const key = keyMap[amount]
    const text = key ? t(key) : `${formatMoney(amount)}`
    const overlay = document.createElement('div')
    overlay.className = 'milestone-overlay'
    overlay.innerHTML = `<span class="milestone-emoji">🎉</span><span class="milestone-text">${text}</span><span class="milestone-amount">${formatMoney(amount)}</span>`
    this.root.appendChild(overlay)
    // Altın parlama arka plan efekti
    this.root.classList.add('milestone-glow')
    window.setTimeout(() => this.root.classList.remove('milestone-glow'), 2000)
    window.setTimeout(() => overlay.remove(), 3200)
  }

  private async handleAction(action: string, id?: string, count?: string): Promise<void> {
    if (action.startsWith('owner-')) {
      if (this.ownerPanel.handleAction(action)) return
    }
    switch (action) {
      case 'open-goals':
        this.goalsSheet.toggle()
        this.goalsSheet.render(this.state)
        break
      case 'close-goals':
        this.goalsSheet.close()
        break
      case 'open-expansion':
        this.baronSubTab = 'world'
        this.setView('profile')
        break
      case 'baron-tab':
        if (id === 'events' || id === 'profile' || id === 'dynasty' || id === 'world' || id === 'lifestyle') {
          this.baronSubTab = id
          if (this.bottomNav.getActive() !== 'profile') this.setView('profile')
          else this.syncBaronTab()
        }
        break
      case 'nav-view':
        if (id === 'profile' && this.suppressProfileNav) break
        if (id) {
          const view = id as NavView
          const reason = navLockReason(view, this.state.producers, this.state.totalEarned)
          if (reason) {
            this.toast(reason)
            return
          }
          this.setView(view)
        }
        break
      case 'open-stats':
      case 'open-profile':
        this.baronSubTab = 'profile'
        this.setView('profile')
        break
      case 'open-torpil':
        this.baronSubTab = 'world'
        this.setView('profile')
        break
      case 'open-settings':
        this.settings.show()
        this.statsScreen.hide()
        break
      case 'close-settings':
        this.settings.hide()
        if (this.bottomNav.getActive() === 'profile') {
          this.syncBaronTab()
        } else {
          this.setView('earn')
        }
        break
      case 'set-language': {
        if (id) {
          await i18n.setLang(id as LangCode)
          this.bottomNav.relabel()
          this.renderAll()
          this.settings.rebuild()
          this.modals.showToast(this.root, `🌐 ${LANG_META[id as LangCode]?.nativeLabel ?? id}`)
        }
        break
      }
      case 'set-country': {
        if (id) {
          this.state.country = id as CountryId
          applyCountry(id as CountryId)
          this.saveManager.save(this.state)
          this.settings.rebuild()
          this.modals.showToast(this.root, `🌍 Ülke değiştirildi`)
        }
        break
      }
      case 'restart-tutorial':
        this.settings.hide()
        this.tutorial.restart()
        this.setView('earn')
        break
      case 'close-stats':
        this.setView('earn')
        break
      case 'toggle-pause':
        this.state.togglePause()
        this.renderDayNightChip()
        break
      case 'daily': {
        if (!this.state.canClaimDaily()) {
          this.modals.showToast(this.root, 'Bugünkü ödül alındı')
          return
        }
        const streakLost = this.state.peekDailyStreakReset()
        const nextStreak = this.state.dailyLastClaim && !streakLost
          ? this.state.dailyStreak + 1
          : 1
        const preview = this.state.dailyLoginRewardPreview(nextStreak)
        this.modals.showDailyReward(
          nextStreak,
          formatMoney(preview),
          () => {
            const amount = this.state.claimDailyReward()
            if (amount > 0) this.modals.showToast(this.root, `+${formatMoney(amount)}`)
            this.renderAll()
          },
          streakLost,
        )
        break
      }
      case 'open-underground':
        this.undergroundSheet.render(this.state)
        this.undergroundSheet.open()
        break
      case 'close-underground':
        this.undergroundSheet.close()
        break
      case 'underground-use':
        if (id && this.state.useUndergroundAction(id as 'lawyer' | 'bribe' | 'launder')) {
          this.modals.showToast(this.root, 'Underground aksiyon kullanıldı')
          this.undergroundSheet.render(this.state)
          this.renderHeatMeter()
        } else {
          this.modals.showToast(this.root, 'Aksiyon kullanılamadı')
        }
        break
      case 'set-theme':
        if (id) {
          this.settings.applyTheme(id as ThemeId)
          applyDocumentTheme(id as ThemeId)
        }
        break
      case 'claim-comeback':
        break
      case 'ad-comeback':
        await this.handleAdComeback(1)
        break
      case 'ad-comeback-x2':
        await this.handleAdComeback(2)
        break
      case 'ad-bankruptcy-recovery':
        await this.handleAdBankruptcyRecovery(1)
        break
      case 'ad-bankruptcy-recovery-x2':
        await this.handleAdBankruptcyRecovery(2)
        break
      case 'skip-bankruptcy-recovery':
        this.state.discardBankruptcyRecovery()
        this.closeModalAndPump()
        break
      case 'skip-comeback':
        this.state.discardComeback()
        this.closeModalAndPump()
        break
      case 'early-unlock':
        if (id && this.state.earlyUnlockProducer(id)) {
          this.modals.showToast(this.root, '🔓 İşletme erken açıldı!')
          this.refreshShop(true)
        } else if (id) {
          const def = PRODUCERS.find((p) => p.id === id)
          const cost = def ? earlyUnlockCost(def) : 0
          const wallet = this.state.money
          const short = Math.max(0, cost - wallet)
          this.modals.showToast(
            this.root,
            `Erken aç: ${formatMoney(cost)} gerekli · Cüzdan: ${formatMoney(wallet)} · Eksik: ${formatMoney(short)}`,
          )
        }
        break
      case 'empire-section':
        if (id === 'football' || id === 'politics' || id === 'dark') {
          this.empirePanel.setSection(id)
          this.empirePanel.render(this.state)
        }
        break
      case 'empire-stadium':
        if (id && this.state.upgradeFootballStadium(id)) {
          this.modals.showToast(this.root, 'Stadyum yükseltildi!')
          this.empirePanel.render(this.state)
          this.renderAll()
        }
        break
      case 'empire-league':
        if (id && this.state.upgradeFootballLeague(id)) {
          this.modals.showToast(this.root, 'Lig yükseltildi!')
          this.empirePanel.render(this.state)
          this.renderAll()
        }
        break
      case 'empire-lobby':
        if (this.state.empireLobby()) {
          this.modals.showToast(this.root, 'Lobi faaliyeti başarılı')
          this.empirePanel.render(this.state)
          this.renderAll()
        }
        break
      case 'empire-donate':
        if (this.state.empireDonate(Math.max(5000, this.state.incomePerDay() * 0.1))) {
          this.modals.showToast(this.root, 'Kampanyaya bağış yapıldı')
          this.empirePanel.render(this.state)
          this.renderAll()
        }
        break
      case 'empire-dark-boost':
        if (this.state.empireBoostDarkProduction()) {
          this.modals.showToast(this.root, 'Üretim artırıldı')
          this.empirePanel.render(this.state)
          this.renderAll()
        }
        break
      case 'empire-dark-radar':
        if (this.state.empireReduceDarkHeat()) {
          this.modals.showToast(this.root, 'Radar düşürüldü')
          this.empirePanel.render(this.state)
          this.renderHeatMeter()
          this.renderAll()
        }
        break
      case 'biz-filter':
        if (id) {
          this.shop.setBizTypeFilter(id as 'all' | 'legal' | 'illegal')
          this.refreshShop(true)
        }
        break
      case 'save-profile': {
        const nameInput = this.root.querySelector<HTMLInputElement>('#profile-name')
        const yearInput = this.root.querySelector<HTMLInputElement>('#profile-birth-year')
        const genderInput = this.root.querySelector<HTMLSelectElement>('#profile-gender')
        if (nameInput?.value.trim()) this.state.playerName = nameInput.value.trim().slice(0, 24)
        if (yearInput?.value) {
          const y = Number(yearInput.value)
          if (y >= 1920 && y <= new Date().getFullYear()) this.state.birthYear = y
        }
        if (genderInput?.value === 'female' || genderInput?.value === 'male') {
          this.state.playerGender = genderInput.value
        }
        this.modals.showToast(this.root, 'Profil kaydedildi')
        this.statsScreen.render()
        break
      }
      case 'export-legacy': {
        const code = this.saveManager.exportLegacyCode(this.state)
        void navigator.clipboard.writeText(code).then(() => {
          this.modals.showToast(this.root, 'Miras kodu panoya kopyalandı')
        }).catch(() => {
          prompt('Miras kodunu kopyala:', code)
        })
        break
      }
      case 'import-legacy': {
        const input = this.root.querySelector<HTMLTextAreaElement>('#legacy-import')
        const code = input?.value ?? prompt('Miras kodunu yapıştır:') ?? ''
        const result = this.saveManager.importLegacyCode(this.state, code)
        if (result.ok) {
          this.modals.showToast(this.root, 'Miras kodu yüklendi!')
          this.renderAll()
        } else {
          this.modals.showToast(this.root, result.reason ?? 'Kod geçersiz')
        }
        break
      }
      case 'buy-business':
        if (id) {
          let ok = false
          if (count === 'max') {
            ok = this.state.buyMaxProducer(id) > 0
          } else if (count) {
            ok = this.state.buyProducer(id, Number(count))
          } else {
            const mode = this.shop.getBuyMode()
            if (mode === 'max') {
              ok = this.state.buyMaxProducer(id) > 0
            } else {
              ok = this.state.buyProducer(id, mode === 10 ? 10 : 1)
            }
          }
          if (ok) {
            markRecentlyBought(id)
            this.shop.flashCard(id)
          } else {
            this.modals.showToast(this.root, 'Satın alınamadı — yeterli para yok', 'important')
          }
        }
        break
      case 'toggle-tier-band':
        if (id) {
          this.shop.toggleTierBand(id)
          this.refreshShop(true)
        }
        break
      case 'biz-detail':
        if (id) this.showBusinessDetail(id)
        break
      case 'claim-daily-goal': {
        const reward = this.state.claimDailyGoalReward()
        if (reward > 0) {
          this.modals.showToast(this.root, `Günlük hedef: +${formatMoney(reward)}`)
          this.renderDailyGoalBar()
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
        } else {
          this.modals.showToast(this.root, 'Henüz toplanamaz — hedefi tamamla veya zaten aldın')
        }
        break
      }
      case 'close-modal':
        this.closeModalAndPump()
        break
      case 'restore-save-backup': {
        if (this.saveManager.tryRestoreBackup(this.state)) {
          this.toast('Yedek kayıt yüklendi ✓')
          this.renderAll()
          this.saveManager.save(this.state)
        } else if (this.saveManager.load(this.state).ok) {
          this.toast('Kayıt geri yüklendi ✓')
          this.renderAll()
          this.saveManager.save(this.state)
        } else {
          this.toast('Yedek kayıt bulunamadı veya bozuk')
        }
        break
      }
      case 'shop-tab':
        if (id) {
          const hubLock = id === 'powerup' ? 'powerup' as const : id === 'empire' ? 'empire' as const : null
          if (hubLock && isShopHubLocked(hubLock, this.state.producers, this.state.totalEarned)) {
            this.toast(shopHubLockReason(hubLock, this.state.producers, this.state.totalEarned)!)
            return
          }
          this.shop.setTab(id, this.state)
          this.refreshShop(true)
        }
        break
      case 'shop-sub-tab':
        if (id === 'management' && isShopHubLocked('management', this.state.producers, this.state.totalEarned)) {
          this.toast(shopHubLockReason('management', this.state.producers, this.state.totalEarned)!)
          return
        }
        if (id === 'businesses' || id === 'management') this.shop.setGrowthSub(id)
        else if (id === 'upgrades' || id === 'research') this.shop.setPowerupSub(id)
        else if (id === 'sport' || id === 'politics' || id === 'dark' || id === 'luxury' || id === 'finance' || id === 'science') {
          this.shop.setEmpireSub(id as 'sport' | 'politics' | 'dark' | 'luxury' | 'finance' | 'science')
        }
        this.refreshShop(true)
        break
      case 'open-empire-manage':
        this.empirePanel.render(this.state)
        this.empirePanel.root.hidden = false
        this.empirePanel.root.classList.add('empire-overlay-open')
        break
      case 'close-empire-manage':
        this.empirePanel.root.hidden = true
        this.empirePanel.root.classList.remove('empire-overlay-open')
        break
      case 'biz-sort':
        if (id) {
          this.shop.setBizSortOrder(id as 'profit' | 'cheap' | 'name' | 'unlockable')
          this.refreshShop(true)
        }
        break
      case 'advisor-buy': {
        if (!id || !id.includes(':')) break
        const [kind, recId] = id.split(':') as [string, string]
        let ok = false
        if (kind === 'business') {
          const mode = this.shop.getBuyMode()
          const n = mode === 'max' ? this.state.countMaxAffordable(recId) : mode
          ok = n >= 1 && this.state.buyProducer(recId, n)
        } else if (kind === 'upgrade') ok = this.state.buyUpgrade(recId)
        else if (kind === 'manager') ok = this.state.hireManager(recId)
        if (ok) {
          this.state.incrementAdvisorBuy()
          this.renderAll()
        } else {
          this.modals.showToast(this.root, 'Satın alınamadı')
        }
        break
      }
      case 'ad-shop-boost':
        await this.handleAdShopBoost()
        break
      case 'ad-upgrade-discount':
        await this.handleAdUpgradeDiscount()
        break
      case 'buy-underground-node':
        if (id) {
          this.state.buyUndergroundTreeNode(id)
          this.refreshShop(true)
        }
        break
      case 'open-finance-news': {
        const ticker = this.state.marketNewsStockTickerId()
        this.bottomNav.setActive('market')
        this.setView('market')
        this.shop.goToFinanceStock(ticker ?? undefined)
        this.refreshShop(true)
        break
      }
      case 'ipo-sub-tab':
        if (id) {
          this.shop.setIpoSubTab(id as 'stock' | 'bank' | 'prestige' | 'ipo')
          this.refreshShop(true)
        }
        break
      case 'upgrade-filter':
        if (id) {
          this.shop.setUpgradeFilter(id as 'all' | 'click' | 'global' | 'producer')
          this.refreshShop(true)
        }
        break
      case 'research-branch':
        if (id) {
          this.shop.setResearchBranch(id as ResearchBranch | 'all')
          this.refreshShop(true)
        }
        break
      case 'buy-mode':
        if (count === 'max') this.shop.setBuyMode('max')
        else if (count === '100') this.shop.setBuyMode(100)
        else if (count === '10') this.shop.setBuyMode(10)
        else this.shop.setBuyMode(1)
        this.refreshShop(true)
        break
      case 'buy-upgrade':
        if (id) this.state.buyUpgrade(id)
        break
      case 'buy-research':
        if (id) this.state.buyResearch(id)
        break
      case 'hire-manager':
        if (id) this.state.hireManager(id)
        break
      case 'ad-manager-discount':
        await this.handleAdManagerDiscount(id)
        break
      case 'stock-buy': {
        const n = count === 'max' ? 9999 : Number(count ?? 1)
        this.state.stockBuy(this.state.stock.activeTickerId, n)
        break
      }
      case 'stock-sell': {
        const t = activeTicker(this.state.stock)
        const n = count === 'max' ? t.shares : Number(count ?? 1)
        this.state.stockSell(this.state.stock.activeTickerId, n)
        break
      }
      case 'stock-ticker':
        if (id) {
          this.state.setActiveStockTicker(id)
          this.refreshShop(true)
        }
        break
      case 'bank-deposit': {
        const n = count === 'max' ? this.state.money : Number(count ?? 1000)
        if (this.state.bankDeposit(n)) this.refreshShop(true)
        else this.modals.showToast(this.root, 'Yatırılamadı')
        break
      }
      case 'bank-withdraw': {
        const n = count === 'max' ? this.state.bank.deposit : Number(count ?? 1000)
        if (this.state.bankWithdraw(n)) this.refreshShop(true)
        break
      }
      case 'bank-loan': {
        const n = count === 'max' ? this.state.maxAvailableLoan() : Number(count ?? 25000)
        if (this.state.bankTakeLoan(n)) this.refreshShop(true)
        else this.modals.showToast(this.root, 'Kredi limiti dolu')
        break
      }
      case 'bank-repay': {
        const n = count === 'max' ? Math.min(this.state.money, this.state.bank.loan) : Number(count ?? 10000)
        if (this.state.bankRepayLoan(n)) this.refreshShop(true)
        break
      }
      case 'bank-buy-bonds': {
        const n = count === 'max' ? this.state.money : Number(count ?? 5000)
        if (this.state.bankBuyBonds(n)) this.refreshShop(true)
        break
      }
      case 'bank-sell-bonds': {
        const n = count === 'max' ? this.state.bank.bonds : Number(count ?? 5000)
        if (this.state.bankSellBonds(n)) this.refreshShop(true)
        break
      }
      case 'buy-tree-node':
        if (id) this.state.buyPrestigeTreeNode(id)
        break
      case 'toggle-autobuy':
        if (id) {
          this.state.toggleManagerAutoBuy(id)
          this.refreshShop(true)
        }
        break
      case 'claim-season-premium':
        if (id) {
          const ok = this.state.claimSeasonTier(Number(id), 'premium')
          if (ok) this.modals.showToast(this.root, 'Premium sezon ödülü toplandı ✓')
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
        }
        break
      case 'iap-season-premium':
        await this.handleIAPSeasonPremium()
        break
      case 'iap-chest-pack':
        await this.handleIAPChestPack()
        break
      case 'iap-remove-ads': {
        void iapManager.purchase('remove_ads').then((r) => {
          if (r.success) {
            this.state.removeAdsOwned = true
            this.modals.showToast(this.root, '🚫📺 Reklamlar kaldırıldı!')
            this.renderAll()
          } else {
            this.modals.showToast(this.root, r.reason ?? 'Satın alma başarısız')
          }
        })
        break
      }
      case 'iap-vip-pass': {
        void iapManager.purchase('vip_pass').then((r) => {
          if (r.success) {
            this.state.vipPassActive = true
            this.modals.showToast(this.root, '👑 VIP Baron Pasaportu aktif!')
            this.renderAll()
          } else {
            this.modals.showToast(this.root, r.reason ?? 'Satın alma başarısız')
          }
        })
        break
      }
      case 'wellbeing-ad-boost': {
        const adBoostBtn = document.querySelector(`[data-action="wellbeing-ad-boost"][data-id="${id}"]`) as HTMLButtonElement | null
        if (adBoostBtn) { adBoostBtn.disabled = true; adBoostBtn.textContent = t('ad_loading') }
        window.setTimeout(() => {
          this.state.lifestyle.stress = Math.max(0, this.state.lifestyle.stress - 10)
          this.modals.showToast(this.root, '📺 Reklam izlendi! Stres -10 düştü 🧘')
          this.lifestylePanel.render(this.state)
        }, 1500)
        break
      }
      case 'buy-residence': {
        const ok = id ? this.state.buyResidence(id as import('../game/Lifestyle').ResidenceId) : false
        if (ok) { this.modals.showToast(this.root, '🏠 Mülk satın alındı!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'move-to-residence': {
        if (id) { this.state.lifestyle.residence = id as import('../game/Lifestyle').ResidenceId; this.lifestylePanel.render(this.state) }
        break
      }
      case 'sell-residence': {
        const ok = id ? this.state.sellResidence(id as import('../game/Lifestyle').ResidenceId) : false
        if (ok) { this.modals.showToast(this.root, '💰 Mülk satıldı!'); this.lifestylePanel.render(this.state); this.statsBar.render() }
        break
      }
      case 'rent-out-residence': {
        if (id) { this.state.setRentResidence(id as import('../game/Lifestyle').ResidenceId, true); this.lifestylePanel.render(this.state) }
        break
      }
      case 'stop-rent-residence': {
        if (id) { this.state.setRentResidence(id as import('../game/Lifestyle').ResidenceId, false); this.lifestylePanel.render(this.state) }
        break
      }
      case 'buy-vehicle': {
        const ok = id ? this.state.buyVehicle(id as import('../game/Lifestyle').VehicleId) : false
        if (ok) { this.modals.showToast(this.root, '🚗 Araç alındı!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'use-vehicle': {
        if (id) { this.state.lifestyle.vehicle = id as import('../game/Lifestyle').VehicleId; this.lifestylePanel.render(this.state) }
        break
      }
      case 'sell-vehicle': {
        const ok = id ? this.state.sellVehicle(id as import('../game/Lifestyle').VehicleId) : false
        if (ok) { this.modals.showToast(this.root, '💰 Araç satıldı!'); this.lifestylePanel.render(this.state); this.statsBar.render() }
        break
      }
      case 'rent-out-vehicle': {
        if (id) { this.state.setRentVehicle(id as import('../game/Lifestyle').VehicleId, true); this.lifestylePanel.render(this.state) }
        break
      }
      case 'stop-rent-vehicle': {
        if (id) { this.state.setRentVehicle(id as import('../game/Lifestyle').VehicleId, false); this.lifestylePanel.render(this.state) }
        break
      }
      case 'buy-pet': {
        const ok = id ? this.state.buyPet(id as import('../game/Lifestyle').PetId) : false
        if (ok) { this.modals.showToast(this.root, '🐾 Evcil hayvan sahiplenildi!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'buy-wellbeing': {
        const ok = id ? this.state.buyWellbeing(id as import('../game/Lifestyle').WellbeingActivityId) : false
        if (ok) { this.modals.showToast(this.root, '🧘 Refah aktivitesi başladı!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'open-free-chest':
        this.handleOpenFreeChest()
        break
      case 'open-paid-chest':
        this.handleOpenPaidChest()
        break
      case 'claim-campaign': {
        const reward = this.state.claimCampaignStep()
        if (reward) {
          this.modals.showToast(this.root, `Kampanya: +${formatMoney(reward.money)}`)
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
        }
        break
      }
      case 'claim-season':
        if (id) {
          const ok = this.state.claimSeasonTier(Number(id))
          if (ok) this.modals.showToast(this.root, 'Sezon ödülü toplandı ✓')
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
        }
        break
      case 'ad-season-xp':
        await this.handleAdSeasonXp()
        break
      case 'ad-stock-hint':
        await this.handleAdStockHint()
        break
      case 'claim-weekly': {
        const reward = this.state.claimWeeklyReward()
        if (reward > 0) {
          this.modals.showToast(this.root, `Haftalık ödül: +${formatMoney(reward)}`)
        } else {
          this.modals.showToast(this.root, 'Haftalık ödül henüz hazır değil')
        }
        this.goalsSheet.render(this.state)
        this.eventsPanel.render(this.state)
        this.renderWeeklyBanner()
        this.updateNavBadges()
        break
      }
      case 'ad-weekly':
        await this.handleAdWeekly()
        break
      case 'claim-mission':
        if (id) {
          const result = this.state.claimMission(id)
          if (result.money > 0) {
            this.modals.showToast(this.root, `Görev: +${formatMoney(result.money)}`)
          } else if (result.boostMinutes > 0) {
            this.modals.showToast(this.root, `Görev: ${result.boostMinutes} dk bonus envantere eklendi`)
          } else {
            this.modals.showToast(this.root, 'Görev ödülü alınamadı')
          }
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
          this.refreshShop(true)
        }
        break
      case 'activate-boost':
        if (id && this.state.activatePendingBoost(id)) {
          // Visual feedback: flash the tap wrap
          this.tapWrap.classList.add('boost-activate-flash')
          window.setTimeout(() => this.tapWrap.classList.remove('boost-activate-flash'), 500)
          this.modals.showToast(this.root, '⚡ Bonus aktifleştirildi! Gelir artıyor...')
          this.eventsPanel.render(this.state)
          this.statsBar.updateMeta()
          this.refreshShop(true)
        }
        break
      case 'claim-mission-ad': {
        if (!id) break
        const result = await this.ads.showRewarded('mission_double')
        if (!result.success) {
          this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
          return
        }
        this.state.incrementRewardedAdCount()
        const claim = this.state.claimMission(id, true)
        if (claim.money > 0) this.modals.showToast(this.root, `Görev x2: +${formatMoney(claim.money)}`)
        else if (claim.boostMinutes > 0) this.modals.showToast(this.root, `Görev x2: ${claim.boostMinutes} dk bonus envantere eklendi`)
        this.renderAll()
        break
      }
      case 'ipo':
        await this.handleIpo()
        break
      case 'ad-double':
        await this.handleAdDouble()
        break
      case 'ad-chest':
        await this.handleAdChest()
        break
      case 'ad-heat-shield':
        await this.handleAdHeatShield()
        break
      case 'ad-restore-event':
        await this.handleRestoreEvent()
        break
      case 'skip-offline':
        this.state.discardPendingOffline()
        this.pendingOffline = 0
        this.closeModalAndPump()
        break
      case 'ad-offline':
        await this.handleAdOffline(1)
        break
      case 'ad-offline-x2':
        await this.handleAdOffline(2)
        break
      case 'dynasty-marry':
        if (id && this.state.marrySpouse(id)) {
          this.modals.showToast(this.root, '💍 Evet! Hanedan kuruldu.')
          this.statsScreen.render()
          this.renderEraStrip()
          this.renderCityStrip()
          this.renderAll()
        } else {
          this.modals.showToast(this.root, 'Evlenilemedi — yeterli para yok veya zaten evlisin.')
        }
        break
      case 'dynasty-succession':
        if (id && this.state.successionToChild(id)) {
          this.modals.close()
          this.modals.showToast(this.root, `👑 ${this.state.playerName} imparatorluğu devraldı!`)
          this.statsScreen.render()
          this.renderEraStrip()
          this.renderCityStrip()
          this.renderAll()
        }
        break
      case 'death-continue-no-heir':
        if (this.state.resolveDeathWithoutHeir()) {
          this.modals.close()
          this.renderEraStrip()
          this.renderCityStrip()
          this.statsScreen.render()
          this.renderAll()
        }
        break
      case 'dynasty-succession-open':
        this.showSuccessionPicker(this.state.needsSuccession())
        break
      case 'rival-lobby':
        if (id && this.state.rivalLobby(id)) {
          this.modals.showToast(this.root, '🏛️ Lobi başarılı')
          this.statsScreen.render()
        } else {
          this.modals.showToast(this.root, 'Lobi başarısız — yeterli para yok')
        }
        break
      case 'rival-coop':
        if (id && this.state.rivalCooperate(id)) {
          this.modals.showToast(this.root, '🤝 İşbirliği anlaşması imzalandı')
          this.statsScreen.render()
        } else {
          this.modals.showToast(this.root, 'İşbirliği başarısız')
        }
        break
      case 'rival-merge':
        if (id && this.state.rivalMerge(id)) {
          this.modals.showToast(this.root, '🛒 Rakip aile satın alındı!')
          this.statsScreen.render()
          this.renderAll()
        } else {
          this.modals.showToast(this.root, 'Satın alma başarısız — yeterli para yok')
        }
        break
      case 'crisis-choice':
        if (id) this.state.resolveCrisis(id)
        break
      case 'life-event-choice': {
        if (id) {
          const [eventId, choiceId] = id.split(':')
          if (eventId && choiceId) {
            this.state.resolveLifeEventChoice(eventId as import('../game/LifeEvents').LifeEventId, choiceId)
            this.closeModalAndPump()
          }
        }
        break
      }
      case 'rival-acquire':
        if (id) {
          const rv = this.state.rivals.find((r) => r.id === id)
          if (rv && rv.relation === 'bankrupt') {
            const cost = Math.max(50_000, Math.floor(rv.netWorth * 0.4))
            if (this.state.canAfford(cost)) {
              this.state.spendMoney(cost)
              this.state.reputation = Math.min(100, this.state.reputation + 10)
              rv.relation = 'merged'
              this.modals.showToast(this.root, `🏴 ${rv.name} varlıkları satın alındı! İtibar +10`)
              this.refreshBaronPanel()
            } else {
              this.modals.showToast(this.root, 'Yeterli para yok', 'important')
            }
          }
        }
        break
      case 'rival-alliance-accept':
        if (this.state.acceptRivalAllianceOffer()) {
          this.modals.showToast(this.root, '🤝 Sektör anlaşması imzalandı')
          this.closeModalAndPump()
        }
        break
      case 'rival-alliance-decline':
        this.state.declineRivalAlliance()
        this.closeModalAndPump()
        break
      case 'insurance-toggle':
        if (id === 'business' || id === 'illegal' || id === 'dynasty') {
          this.state.toggleInsurance(id)
          this.refreshShop(true)
        }
        break
      case 'commodity-buy':
        if (id) this.state.buyCommodity(id as import('../game/Commodities').CommodityId, 1)
        this.refreshShop(true)
        break
      case 'commodity-sell':
        if (id) this.state.sellCommodity(id as import('../game/Commodities').CommodityId, 1)
        this.refreshShop(true)
        break
      case 'investment-accept':
        if (this.state.acceptInvestmentOffer()) {
          this.modals.showToast(this.root, '💡 Yatırım yapıldı — 7 gün bekle')
        }
        this.refreshShop(true)
        break
      case 'investment-dismiss':
        this.state.dismissInvestmentOffer()
        this.refreshShop(true)
        break
      case 'hire-named-manager':
        if (id && this.state.hireNamedManager(id as import('../game/NamedManagers').NamedManagerId)) {
          this.modals.showToast(this.root, '👔 Yönetici işe alındı')
          this.refreshShop(true)
        }
        break
      case 'underground-market-toggle':
        if (id) {
          this.state.toggleUndergroundMarket(id as import('../game/UndergroundMarket').UndergroundMarketAction)
          this.refreshShop(true)
        }
        break
      case 'advisor-pay':
        {
          const tip = this.state.payAdvisorTip()
          if (!tip) {
            this.modals.showToast(this.root, 'Danışman ücreti ödenemedi')
            break
          }
          const acc = Math.round(tip.accuracy * 100)
          this.modals.showToast(this.root, `👨‍💼 Kemal (%${acc}): ${tip.headline}`)
          if (tip.action === 'buy_stock' || tip.action === 'sell_stock') {
            this.setView('market')
            this.shop.setViewContext('market', this.state)
            this.shop.setTab('stock', this.state)
            this.refreshShop(true)
          } else if (tip.action === 'buy_commodity') {
            this.setView('market')
            this.shop.setViewContext('market', this.state)
            this.shop.setTab('commodities', this.state)
            this.refreshShop(true)
          }
        }
        break
      case 'eulogy-succession':
        this.modals.close()
        this.showSuccessionPicker(true)
        break
      case 'eulogy-continue':
        this.modals.close()
        if (this.state.hasPendingDeath()) this.state.resolveDeathWithoutHeir()
        this.renderEraStrip()
        this.renderCityStrip()
        break
      case 'undo-exec':
        if (this.state.executeUndo()) {
          this.modals.showToast(this.root, '↩️ Geri alındı')
          this.modals.close()
          this.refreshShop(true)
        } else {
          this.modals.showToast(this.root, 'Geri alınamadı')
        }
        break
      case 'undo-dismiss':
        this.state.dismissUndo()
        this.modals.close()
        break
      case 'unlock-city':
        if (id && this.state.unlockCity(id as import('../game/ExpansionMap').CityId)) {
          this.modals.showToast(this.root, '🗺️ Yeni şehir açıldı!')
          this.refreshSkyline()
          this.refreshShop(true)
        }
        break
      case 'set-active-city':
        if (id && this.state.setActiveCity(id as import('../game/ExpansionMap').CityId)) {
          this.refreshSkyline()
          this.modals.showToast(this.root, `📍 ${id} aktif`)
        }
        break
      case 'hire-torpil':
        if (id && this.state.hireTorpil(id as import('../game/TorpilNetwork').TorpilId)) {
          this.modals.showToast(this.root, '🤝 Torpil ağına katıldı')
          this.refreshShop(true)
        }
        break
      case 'pay-torpil-gift':
        if (id && this.state.payTorpilGift(id as import('../game/TorpilNetwork').TorpilId)) {
          this.modals.showToast(this.root, '🎁 Hediye verildi')
          this.refreshShop(true)
        }
        break
      case 'sell-producer':
        if (id && this.state.sellProducer(id, count ? Number(count) : 1)) {
          this.refreshShop(true)
        }
        break
      case 'modernize-producer':
        if (id && this.state.modernizeProducer(id)) {
          this.modals.showToast(this.root, '🔧 İşletme modernize edildi')
          this.refreshShop(true)
        }
        break
      case 'open-franchise': {
        const parsed = id ? parseFranchiseAction(id) : null
        if (!parsed) {
          this.modals.showToast(this.root, 'Franchise seçimi geçersiz')
          break
        }
        const fail = franchiseOpenFailureReason(this.state, parsed.producerId, parsed.city)
        if (fail) {
          this.modals.showToast(this.root, `🏪 ${fail}`)
          break
        }
        if (this.state.openFranchise(parsed.producerId, parsed.city)) {
          const city = FRANCHISE_CITIES.find((c) => c.id === parsed.city)
          const p = PRODUCERS.find((x) => x.id === parsed.producerId)
          this.modals.showToast(this.root, `🏪 ${p?.name ?? 'İşletme'} — ${city?.label ?? parsed.city} franchise açıldı!`)
          this.refreshShop(true)
        } else {
          this.modals.showToast(this.root, '🏪 Franchise açılamadı — tekrar dene')
        }
        break
      }
      case 'iap-restore': {
        const restored = await iapManager.restorePurchases()
        if (restored.length > 0) {
          this.modals.showToast(this.root, `✅ ${restored.length} satın alma geri yüklendi`)
          if (this.baronShowsEvents()) this.eventsPanel.render(this.state)
        } else {
          this.modals.showToast(this.root, 'Geri yüklenecek satın alma yok')
        }
        break
      }
      default:
        break
    }
  }

  private renderCombo(combo: number, mult: number): void {
    this.comboCountEl.textContent = combo > 0 ? `Combo x${combo}` : 'Combo x0'
    this.comboMultEl.textContent = `${mult}x`
    this.comboMultEl.hidden = combo <= 0
    this.comboFill.style.width = `${Math.min(100, (combo / 30) * 100)}%`
    this.tapWrap.classList.toggle('combo-glow', combo >= 10)
    this.tapWrap.classList.toggle('combo-max', combo >= 25)
    if (combo >= 30) {
      this.comboFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)'
      this.comboFill.classList.add('combo-pulse')
    } else if (combo >= 20) {
      this.comboFill.style.background = 'linear-gradient(90deg, #f97316, #ef4444)'
      this.comboFill.classList.remove('combo-pulse')
    } else if (combo >= 10) {
      this.comboFill.style.background = 'linear-gradient(90deg, #fb923c, #f97316)'
      this.comboFill.classList.remove('combo-pulse')
    } else {
      this.comboFill.style.background = ''
      this.comboFill.classList.remove('combo-pulse')
    }
  }

  private scheduleUiSync(): void {
    if (this.uiSyncTimer !== null) return
    this.uiSyncTimer = window.setTimeout(() => {
      this.uiSyncTimer = null
      this.shop.updateTabBadges(this.state)
      this.goalsSheet.render(this.state)
      this.updateNavBadges()
      this.leaderboard.update({
        lifetimeEarned: this.state.lifetimeTotalEarned,
        comboBest: this.state.comboBest,
        ipoCount: this.state.ipoCount,
      })
    }, 180)
  }

  private renderProgressStrip(): void {
    const rank = currentRank(this.state.totalEarned)
    const prog = rankProgress(this.state.totalEarned)
    this.rankChip.textContent = `${rank.emoji} ${rank.name}`
    this.rankRing.style.background = `conic-gradient(var(--accent) ${prog.pct}%, rgba(255,255,255,0.08) ${prog.pct}%)`

    if (prog.next) {
      this.rankProgressLabel.textContent = t('rank_progress').replace('{next}', `${prog.next.emoji} ${prog.next.name}`)
      this.rankProgressFill.style.width = `${prog.pct}%`
    } else {
      this.rankProgressLabel.textContent = t('rank_max')
      this.rankProgressFill.style.width = '100%'
    }

    const nextBiz = PRODUCERS.find((p) => !isProducerUnlocked(p, this.state.totalEarned, this.state.forcedUnlocks))
    if (nextBiz) {
      const unlockAt = scaledUnlockAt(nextBiz)
      const pct = unlockAt > 0
        ? Math.min(100, (this.state.totalEarned / unlockAt) * 100)
        : 0
      this.unlockProgressLabel.textContent = t('hud_unlock_to_biz').replace('{name}', `${nextBiz.emoji} ${nextBiz.name}`)
      this.unlockProgressFill.style.width = `${pct}%`
      this.nextBizPreview.innerHTML = `<span class="next-biz-emoji">${nextBiz.emoji}</span><span class="next-biz-name">${nextBiz.name}</span><span class="next-biz-pct">${Math.floor(pct)}%</span>`
      this.nextBizPreview.hidden = false
    } else {
      this.unlockProgressLabel.textContent = t('hud_all_biz_unlocked')
      this.unlockProgressFill.style.width = '100%'
      this.nextBizPreview.hidden = true
    }

    this.renderSessionPanel()
    this.renderEraStrip()
    this.renderCityStrip()
    this.renderEarnModifiers()
    this.renderHeatMeter()
    this.renderProgressPathWidget()
  }

  private renderEraStrip(): void {
    const era = eraForBaron(this.state.baronCounter, this.state.dynasty.generation)
    applyEraTheme(this.root, this.state.baronCounter, this.state.dynasty.generation)
    this.eraStrip.innerHTML = `
      <span class="era-year">${era.year}</span>
      <span class="era-label">${era.label}</span>
      <small class="era-flavor">${era.flavor}</small>
    `
  }

  private renderEarnModifiers(): void {
    const chips = this.state.incomeModifierChips()
    if (chips.length === 0) {
      this.earnModifiersEl.hidden = true
      return
    }
    this.earnModifiersEl.hidden = false
    this.earnModifiersEl.replaceChildren()
    for (const c of chips) {
      const chip = document.createElement('span')
      chip.className = 'earn-mod-chip'
      chip.title = c.detail
      chip.textContent = `${c.emoji} ${c.label}`
      this.earnModifiersEl.appendChild(chip)
    }
  }

  private renderCityStrip(): void {
    const city = cityDef(this.state.activeCityId())
    const cityId = this.state.activeCityId()
    const unlockable = EXPANSION_CITIES.some((c) =>
      !this.state.cities.unlocked.includes(c.id)
      && canUnlockCity(c.id, this.state.cities, this.state.money, this.state.reputation, this.state.ipoCount).ok,
    )
    const hasDisasterRisk = DISASTERS.some((d) => d.affectedCities.includes(cityId))
    const insured = this.state.insurance.business
    const riskLabel = hasDisasterRisk ? (insured ? ' · 🛡️ Sigortalı' : ' · ⚠️ Afet riski') : ''
    this.cityStrip.innerHTML = `
      <button type="button" class="city-strip-btn" data-action="open-expansion">
        ${city.emoji} ${city.label} · Baron #${this.state.baronCounter}${riskLabel}
        ${unlockable ? ' · 🗺️ Yeni şehir!' : ''}
      </button>
    `
  }

  private renderProgressPathWidget(): void {
    const p = this.state.progressPath()
    this.progressPathWidget.innerHTML = `
      <div class="progress-path-row">
        <span class="progress-path-current">${p.currentEmoji} ${p.currentRank}</span>
        <span class="progress-path-ipo">IPO ${p.ipoPct.toFixed(1)}%</span>
      </div>
      <div class="progress-path-bar"><div class="progress-path-fill" style="width:${p.rankPct}%"></div></div>
      <small class="progress-path-next">${formatProgressLine(p)}</small>
    `
  }

  private refreshSkyline(): void {
    const buildings = buildSkylineBuildings(this.state.producers, (id) => {
      const p = PRODUCERS.find((x) => x.id === id)
      return p ? this.state.producerIncome(p) : 0
    })
    this.skyline.update(buildings, this.state.skylineWorldStageId(), this.state.gameTimeMs, this.state.legacyMonuments, cityDef(this.state.activeCityId()).skylineClass)
    this.skyline.setCrisis(this.state.activeCrisis !== null)
  }

  private showCrisisModal(crisisId: import('../game/CrisisEvents').CrisisId, title: string): void {
    const def = crisisDef(crisisId)
    const buttons = def.choices.map((c) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn-secondary crisis-choice-btn'
      b.dataset.action = 'crisis-choice'
      b.dataset.id = c.id
      b.innerHTML = `<strong>${c.label}</strong><small>${c.description}</small>`
      return b
    })
    this.eventDirector.enqueue({
      id: `crisis-${crisisId}`,
      priority: 1,
      run: () => this.modals.show(`${def.emoji} ${title}`, def.description, buttons),
    })
  }

  private showLifeEventModal(def: import('../game/LifeEvents').LifeEventDef): void {
    const buttons = def.choices.map((choice) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn-secondary life-event-choice-btn'
      b.dataset.action = 'life-event-choice'
      b.dataset.id = `${def.id}:${choice.id}`
      const delta = []
      if (choice.moneyDelta > 0) delta.push(`+${formatMoney(choice.moneyDelta)}`)
      else if (choice.moneyDelta < 0) delta.push(formatMoney(choice.moneyDelta))
      if (choice.reputationDelta > 0) delta.push(`İtibar +${choice.reputationDelta}`)
      else if (choice.reputationDelta < 0) delta.push(`İtibar ${choice.reputationDelta}`)
      if (choice.stressDelta > 0) delta.push(`Stres +${choice.stressDelta}`)
      else if (choice.stressDelta < 0) delta.push(`Stres ${choice.stressDelta}`)
      b.innerHTML = `<strong>${choice.emoji} ${choice.label}</strong><small>${delta.join(' · ')}</small>`
      return b
    })
    this.eventDirector.enqueue({
      id: `life-event-${def.id}`,
      priority: 2,
      run: () => this.modals.showContent(`${def.emoji} ${def.title}`, (() => { const p = document.createElement('p'); p.textContent = def.description; return p })(), buttons, true),
    })
  }

  private showRivalAllianceModal(offer: import('../game/Rivals').RivalAllianceOffer): void {
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.className = 'btn-primary'
    accept.dataset.action = 'rival-alliance-accept'
    accept.textContent = t('btn_accept')
    const decline = document.createElement('button')
    decline.type = 'button'
    decline.className = 'btn-secondary'
    decline.dataset.action = 'rival-alliance-decline'
    decline.textContent = t('btn_decline')
    this.eventDirector.enqueue({
      id: `rival-alliance-${offer.rivalId}`,
      priority: 2,
      run: () => this.modals.show('🤝 İttifak Teklifi', offer.message, [accept, decline]),
    })
  }

  private renderHeatMeter(): void {
    const heat = this.state.illegalHeat
    const hasIllegal = PRODUCERS.some((p) => p.illegal && (this.state.producers[p.id] ?? 0) > 0)
    this.heatMeterRow.hidden = !hasIllegal
    if (!hasIllegal) return
    const pct = Math.min(100, Math.round(heat))
    this.heatMeterFill.style.width = `${pct}%`
    this.heatMeterFill.classList.toggle('heat-high', heat >= 55)
    this.heatMeterFill.classList.toggle('heat-critical', heat >= 80)
    this.heatMeterLabel.textContent = `${this.state.illegalRiskLabel()} · ${pct}%`
  }

  private renderSessionPanel(): void {
    const clickIncome = this.state.clickIncomePerTap()
    const comboMult = this.state.comboMultiplier
    const passive = this.state.incomePerDay()
    this.sessionClickIncome.textContent = formatMoney(clickIncome)
    this.sessionComboMult.textContent = `${comboMult.toFixed(1)}x`
    this.sessionPassiveIncome.textContent = formatIncomeRate(passive)
  }

  private checkRankUp(): void {
    const rank = currentRank(this.state.totalEarned)
    if (rank.id !== this.lastRankId) {
      const prev = this.lastRankId
      this.lastRankId = rank.id
      if (prev) {
        this.sound.playAchievement()
        this.modals.showToast(this.root, `${rank.emoji} Yeni rütbe: ${rank.name}!`)
      }
    }
  }

  private spawnFloat(amount: number, x: number, y: number, critical: boolean, combo = 0): void {
    const el = document.createElement('span')
    el.className = `float-text${critical ? ' critical' : ''}`
    let comboEmoji = ''
    if (combo >= 20) comboEmoji = ' 💥'
    else if (combo >= 10) comboEmoji = ' ⚡'
    else if (combo >= 5) comboEmoji = ' 🔥'
    el.textContent = `+${formatMoney(amount)}${comboEmoji}`
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    this.floatLayer.appendChild(el)
    window.setTimeout(() => el.remove(), 900)
  }

  toast(message: string, important = false): void {
    this.modals.showToast(this.root, message, important ? 'important' : 'normal')
  }

  showCorruptedSaveNotice(): void {
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-primary'
    close.dataset.action = 'close-modal'
    close.textContent = t('btn_ok_confirm')
    this.modals.show('Kayıt Hatası', 'Kayıt dosyası okunamadı. Yedekten geri yüklemeyi dene.', [close])
  }

  showNewGameNotice(): void {
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-primary'
    close.dataset.action = 'close-modal'
    close.textContent = t('btn_ok_confirm')
    this.modals.show(
      'Yeni oyun',
      'Kayıt bulunamadı veya okunamadı. Eski kaydın silinmedi — Ayarlar → Miras kodu ile yükleyebilirsin.',
      [close],
    )
  }

  showSaveRecoveryNotice(onRestore: () => void): void {
    const restore = document.createElement('button')
    restore.type = 'button'
    restore.className = 'btn-primary'
    restore.textContent = t('btn_restore_save')
    restore.addEventListener('click', () => {
      this.modals.close()
      onRestore()
    })
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-secondary'
    close.dataset.action = 'close-modal'
    close.textContent = t('btn_new_game')
    close.addEventListener('click', () => {
      this.saveManager.setSaveEnabled(true)
    })
    this.modals.show(
      'Kayıt sorunu',
      'Ana kayıt açılamadı ama yedek veya eski sürüm bulunabilir. Geri yüklemeyi dene — aksi halde yeni oyun başlar (eski dosya silinmez).',
      [restore, close],
    )
  }

  private maybePromptFirstBusinessAd(): void {
    if (this.adPromptShown || this.state.ownedBusinessTiers() !== 1) return
    this.adPromptShown = true
    window.setTimeout(() => {
      this.modals.showToast(this.root, '📺 İlk işletmen açık! Kazan sekmesinde 2x gelir reklamını dene.')
    }, 1800)
  }

  private updateProgressiveUnlock(): void {
    const locks: Partial<Record<NavView, string | null>> = {}
    for (const view of ['earn', 'shop', 'market', 'events', 'profile'] as NavView[]) {
      locks[view] = navLockReason(view, this.state.producers, this.state.totalEarned)
    }
    this.bottomNav.setNavLocked(locks)
  }

  showOfflinePopup(amount: number): void {
    if (!this.runWhenIntroReady('offline-popup', () => this.showOfflinePopup(amount))) return
    this.eventDirector.enqueue({
      id: 'offline-popup',
      priority: 3,
      run: () => this.renderOfflinePopup(amount),
    })
  }

  private renderOfflinePopup(amount: number): void {
    this.pendingOffline = amount
    const hero = document.createElement('div')
    hero.className = 'offline-popup-hero offline-popup-animated'
    hero.innerHTML = `<span class="offline-popup-label">Birikmiş kazanç</span><strong class="offline-popup-amount" data-target="${amount}">${formatMoney(0)}</strong>`
    const ad2 = document.createElement('button')
    ad2.type = 'button'
    ad2.className = 'btn-primary offline-btn-hero'
    ad2.dataset.action = 'ad-offline-x2'
    ad2.textContent = `📺 x2 Topla — ${formatMoney(amount * 2)}`
    const ad = document.createElement('button')
    ad.type = 'button'
    ad.className = 'btn-ad offline-btn-hero'
    ad.dataset.action = 'ad-offline'
    ad.textContent = `📺 Topla — ${formatMoney(amount)}`
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'btn-secondary'
    skip.dataset.action = 'skip-offline'
    skip.textContent = 'Vazgeç'
    const body = document.createElement('div')
    body.className = 'offline-popup-body'
    body.append(hero, ad2, ad, skip)
    this.modals.show(
      'Tekrar hoş geldin!',
      'Yokken biriken kazancını toplamak için reklam izlemen gerek.',
      [body],
    )
    const amountEl = hero.querySelector('.offline-popup-amount') as HTMLElement | null
    if (amountEl) this.animateOfflineAmount(amountEl, amount)
  }

  private animateOfflineAmount(el: HTMLElement, target: number): void {
    const start = performance.now()
    const duration = 900
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      el.textContent = formatMoney(Math.floor(target * eased))
      if (t < 1) requestAnimationFrame(tick)
      else el.textContent = formatMoney(target)
    }
    requestAnimationFrame(tick)
  }

  private showGoldenEventModal(
    event: { emoji: string; title: string; description: string },
    expiresAt: number,
  ): void {
    this.clearGoldenEventTimer()
    this.goldenEventExpiresAt = expiresAt
    this.modals.openGoldenEvent(
      event.emoji,
      event.title,
      `${event.description} Ödül envantere gider — Etkinlikler'den aktifleştirmen gerekir.`,
      () => {
        void this.claimGoldenEventWithAd()
      },
    )
    const tick = (): void => {
      if (!this.modals.hasGoldenEventOpen()) {
        this.clearGoldenEventTimer()
        return
      }
      const left = Math.ceil((this.goldenEventExpiresAt - Date.now()) / 1000)
      if (left <= 0) {
        this.clearGoldenEventTimer()
        this.closeModalAndPump()
        return
      }
      this.modals.updateGoldenEventTimer(left)
    }
    tick()
    this.eventTimerInterval = window.setInterval(tick, 500)
  }

  private async claimGoldenEventWithAd(): Promise<void> {
    const result = await this.ads.showRewarded('golden_event')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    if (this.state.claimGoldenEvent()) {
      this.clearGoldenEventTimer()
      this.closeModalAndPump()
      this.modals.showToast(this.root, '🎁 Bonus envanterine eklendi — Etkinlikler\'den aktifleştir')
      this.eventsPanel.render(this.state)
      this.updateNavBadges()
    }
  }

  private showBaronEulogy(record: BaronRecord, hasHeir: boolean): void {
    const ach = record.achievements.map((a) => `<li>${a}</li>`).join('')
    const weak = record.weaknesses.length > 0
      ? record.weaknesses.map((w) => `<li>${w}</li>`).join('')
      : '<li>Büyük zayıflık kaydedilmedi</li>'
    const body = document.createElement('div')
    body.className = 'baron-eulogy-body'
    body.innerHTML = `
      <div class="baron-eulogy-header">
        <span class="baron-eulogy-scroll">📜</span>
        <h2>BARON #${record.baronNumber} — ${record.name.toUpperCase()}</h2>
        <p class="baron-eulogy-years">${record.birthYear} - ${record.deathYear} · ${record.yearsRuled} yıl · ${record.ageAtDeath} yaş</p>
        <p class="baron-eulogy-cause">${record.causeEmoji} ${record.causeLabel}</p>
      </div>
      <div class="baron-eulogy-section">
        <h3>🏆 Başarıları</h3>
        <ul>${ach}</ul>
      </div>
      <div class="baron-eulogy-section baron-eulogy-weak">
        <h3>💀 Zayıf Noktası</h3>
        <ul>${weak}</ul>
      </div>
      <blockquote class="baron-eulogy-quote">"${record.epitaph}"</blockquote>
    `
    const cont = document.createElement('button')
    cont.type = 'button'
    cont.className = 'btn-primary'
    cont.dataset.action = hasHeir ? 'eulogy-succession' : 'eulogy-continue'
    cont.textContent = hasHeir ? 'Varis seç →' : t('btn_continue')
    this.eventDirector.enqueue({
      id: 'baron-eulogy',
      priority: 1,
      run: () => this.modals.showContent('📜 Baron Özeti', body, [cont]),
    })
  }

  private showDisasterModal(ev: { title: string; emoji: string; city: string; damage: number; insured: boolean }): void {
    const body = document.createElement('div')
    body.className = 'disaster-modal-body'
    body.innerHTML = `
      <h2>${ev.emoji} ${ev.title.toUpperCase()} — ${ev.city}'i etkiledi!</h2>
      <p>Fabrika ve işletmelere hasar:</p>
      <ul>
        <li>${ev.insured ? 'Sigortalı → Zarar karşılandı ✅' : `Sigortalı değil → ${formatMoney(ev.damage)} zarar`}</li>
      </ul>
    `
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.className = 'btn-primary'
    ok.dataset.action = 'close-modal'
    ok.textContent = t('btn_continue')
    this.modals.showContent('Doğal Afet', body, [ok])
  }

  private showUndoPrompt(label: string, cost: number, _undoId: string): void {
    const undo = document.createElement('button')
    undo.type = 'button'
    undo.className = 'btn-secondary'
    undo.dataset.action = 'undo-exec'
    undo.textContent = `Geri Al — ${formatMoney(cost)}`
    const keep = document.createElement('button')
    keep.type = 'button'
    keep.className = 'btn-primary'
    keep.dataset.action = 'undo-dismiss'
    keep.textContent = 'Kabul Et'
    this.modals.show('↩️ Geri al?', `${label}\n\nTazminat: ${formatMoney(cost)}`, [undo, keep])
  }

  private showSuccessionPicker(urgent = false, deathIntro?: HTMLElement): void {
    const children = this.state.dynasty.children
    if (children.length === 0) {
      this.modals.showToast(this.root, 'Miras devri için önce çocuk yetiştirmelisin.')
      return
    }
    const body = document.createElement('div')
    body.className = 'succession-picker'
    if (deathIntro) {
      body.appendChild(deathIntro)
    } else {
      const intro = document.createElement('p')
      intro.textContent = urgent
        ? `${this.state.playerAge()} yaşındasın — bir varis seçerek imparatorluğu devral.`
        : 'Hangi çocukla imparatorluğa devam etmek istiyorsun?'
      body.appendChild(intro)
    }
    const grid = document.createElement('div')
    grid.className = 'dynasty-children'
    for (const c of children) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'dynasty-child-card succession-pick-card'
      card.dataset.action = 'dynasty-succession'
      card.dataset.id = c.id
      card.innerHTML = `<span class="dynasty-child-emoji">👑</span><div><strong>${c.name}</strong><small>Eğitim ${Math.floor(c.educationXp ?? 0)}%</small></div>`
      grid.appendChild(card)
    }
    body.appendChild(grid)
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'btn-secondary'
    cancel.dataset.action = 'close-modal'
    cancel.textContent = urgent ? 'Sonra seç' : 'İptal'
    this.modals.showContent(urgent ? '👑 Miras Zorunlu' : '👑 Miras Devri', body, [cancel])
  }

  private showBusinessDetail(id: string): void {
    const detail = this.state.getProducerBreakdown(id)
    if (!detail) return
    const rows = [
      { label: 'Adet', value: String(detail.owned) },
      { label: 'Birim gelir', value: formatIncomeRate(detail.basePerUnit) },
      ...detail.lines,
      { label: 'Toplam', value: formatIncomeRate(detail.totalPerDay) },
    ]
    this.modals.showDetail(`${detail.name} — Gelir Dökümü`, rows, 'Kapat butonuna bas.')
  }

  private closeModalAndPump(): void {
    this.modals.close()
    this.eventDirector.release()
  }

  private showMissedEventOffer(event: GameEventDef): void {
    const nextIn = Math.ceil(this.state.getNextGoldenEventInMs() / 1000)
    const ad = document.createElement('button')
    ad.type = 'button'
    ad.className = 'btn-ad'
    ad.dataset.action = 'ad-restore-event'
    ad.textContent = '📺 Fırsatı geri getir'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-primary'
    close.dataset.action = 'close-modal'
    close.textContent = 'Kapat'
    const detail = `${event.title} kaçırıldı — reklam izleyerek gelir bonusunu envantere ekleyebilirsin.`
    const timing = nextIn > 0
      ? ` Sonraki otomatik fırsat ~${nextIn} sn sonra.`
      : ' Yeni fırsat yakında tekrar denenecek.'
    this.modals.show('Fırsat Kaçtı!', `${detail}${timing}`, [ad, close])
  }

  private showIpoAnimation(points: number): void {
    const overlay = document.createElement('div')
    overlay.className = 'ipo-overlay'
    overlay.textContent = `IPO! +${points} Hisse 📈`
    this.root.appendChild(overlay)
    window.setTimeout(() => overlay.remove(), 2500)

    // Skyline flash celebration
    this.skyline.flashUpgrade()

    // Show post-IPO summary modal
    window.setTimeout(() => {
      const prevBaron = this.state.baronHistory[0]
      if (!prevBaron) return
      const modal = document.createElement('div')
      modal.className = 'ipo-summary-modal modal-overlay'
      const card = document.createElement('div')
      card.className = 'ipo-summary-card'
      card.innerHTML = `
        <h2>🚀 IPO Tamamlandı!</h2>
        <div class="ipo-summary-row"><span>Nesil ${prevBaron.generation} · ${prevBaron.name}</span></div>
        <div class="ipo-summary-stat"><label>Toplam Kazanç</label><strong>${formatMoney(prevBaron.totalEarnedLife)}</strong></div>
        <div class="ipo-summary-stat"><label>Prestige Puanı</label><strong>+${points} ✦</strong></div>
        <div class="ipo-summary-stat"><label>IPO Sayısı</label><strong>#${this.state.ipoCount}</strong></div>
        <p class="ipo-summary-hint">Yeni nesil başlıyor — prestige bonusların aktif!</p>
      `
      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.className = 'btn-primary'
      closeBtn.textContent = 'Devam Et ✦'
      closeBtn.addEventListener('click', () => modal.remove())
      card.appendChild(closeBtn)
      modal.appendChild(card)
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })
      this.root.appendChild(modal)
      window.setTimeout(() => modal.remove(), 15_000)
    }, 600)
  }

  private async handleIpo(): Promise<void> {
    if (!this.state.prestigeEligible()) return
    const preview = this.state.ipoPreview()
    this.modals.showIpoPreview(preview, async () => {
      this.modals.close()
      const points = this.state.doPrestige()
      if (points > 0) {
        await this.ads.showInterstitial()
        const cash = preview.startingCash
        this.modals.showToast(this.root, `IPO! +${points} hisse · ${formatMoney(cash)} başlangıç`)
        this.shop.setIpoSubTab('stock')
        this.refreshShop(true)
      }
    })
  }

  private async handleAdShopBoost(): Promise<void> {
    const result = await this.ads.showRewarded('shop_boost_15m')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateShopBoost()
    this.modals.showToast(this.root, '15 dk +50% gelir aktif!')
    this.renderAll()
  }

  private async handleAdUpgradeDiscount(): Promise<void> {
    const result = await this.ads.showRewarded('upgrade_discount')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateUpgradeDiscount()
    this.modals.showToast(this.root, 'Sonraki yükseltme %30 indirimli!')
    this.refreshShop(true)
  }

  private async handleAdDouble(): Promise<void> {
    const result = await this.ads.showRewarded('double_income')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateAdBoost()
    this.ads.syncRewardedCount(this.state.rewardedAdsToday, this.state.rewardedAdsDay)
    this.sound.playReward()
    this.modals.showToast(this.root, '2x gelir 5 dk!')
    this.statsBar.render()
  }

  private async handleAdChest(): Promise<void> {
    const result = await this.ads.showRewarded('lucky_chest')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    let loot = this.state.openLuckyChest()
    if (!loot) {
      const ipd = this.state.incomePerDay()
      this.state.addMoney(Math.max(80, Math.floor(ipd * 0.85)))
      this.modals.showToast(this.root, `Sandık: +${formatMoney(Math.max(80, Math.floor(ipd * 0.85)))}`)
    } else {
      this.showChestToast(loot)
    }
    this.sound.playReward()
    this.renderAll()
  }

  private handleOpenFreeChest(): void {
    const loot = this.state.openLuckyChest()
    if (!loot) {
      this.modals.showToast(this.root, 'Sandık hazır değil')
      return
    }
    this.showChestToast(loot)
    this.sound.playReward()
    this.renderAll()
  }

  private handleOpenPaidChest(): void {
    const loot = this.state.openPaidChest()
    if (!loot) {
      this.modals.showToast(this.root, 'Sandık bileti yok')
      return
    }
    this.showChestToast(loot)
    this.sound.playReward()
    this.renderAll()
  }

  private showChestToast(loot: { emoji: string; label: string; money: number; boostMinutes: number; seasonXp: number }): void {
    const parts = [`${loot.emoji} ${loot.label}`]
    if (loot.money > 0) parts.push(`+${formatMoney(loot.money)}`)
    if (loot.boostMinutes > 0) parts.push(`${loot.boostMinutes} dk bonus`)
    if (loot.seasonXp > 0) parts.push(`${loot.seasonXp} sezon XP`)
    this.modals.showToast(this.root, parts.join(' · '))
  }

  private async handleIAPSeasonPremium(): Promise<void> {
    const res = await iapManager.purchase('season_premium')
    if (!res.success) {
      this.modals.showToast(this.root, res.reason ?? 'Satın alma iptal')
      return
    }
    this.state.unlockSeasonPremium()
    this.modals.showToast(this.root, '⭐ Premium sezon yolu açıldı!')
    this.eventsPanel.render(this.state)
    this.updateNavBadges()
  }

  private async handleIAPChestPack(): Promise<void> {
    const res = await iapManager.purchase('chest_pack_5')
    if (!res.success) {
      this.modals.showToast(this.root, res.reason ?? 'Satın alma iptal')
      return
    }
    this.state.grantChestTickets(5)
    this.modals.showToast(this.root, '🎫 5 sandık bileti eklendi')
    this.eventsPanel.render(this.state)
  }

  private async handleAdOffline(multiplier = 1): Promise<void> {
    if (this.pendingOffline <= 0 && this.state.pendingOfflineEarnings <= 0) {
      this.closeModalAndPump()
      return
    }
    const result = await this.ads.showRewarded('offline_bonus')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    const amount = this.state.claimOfflineViaAd(multiplier)
    this.pendingOffline = 0
    this.closeModalAndPump()
    this.modals.showToast(this.root, `Offline: +${formatMoney(amount)}`)
    this.statsBar.render()
    this.renderAll()
  }

  private async handleAdBankruptcyRecovery(multiplier = 1): Promise<void> {
    if (!this.state.hasPendingBankruptcyRecovery()) {
      this.closeModalAndPump()
      return
    }
    const result = await this.ads.showRewarded('bankruptcy_recovery')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    const amount = this.state.claimBankruptcyRecovery(multiplier)
    this.closeModalAndPump()
    this.modals.showToast(this.root, `İflas kurtarma: +${formatMoney(amount)}`)
    this.renderAll()
  }

  private async handleAdComeback(multiplier = 1): Promise<void> {
    if (!this.state.hasPendingComeback()) {
      this.closeModalAndPump()
      return
    }
    const result = await this.ads.showRewarded('offline_bonus')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    const amount = this.state.claimComebackViaAd(multiplier)
    this.closeModalAndPump()
    this.modals.showToast(this.root, `Geri dönüş: +${formatMoney(amount)}`)
    this.renderAll()
  }

  private async handleRestoreEvent(): Promise<void> {
    const result = await this.ads.showRewarded('restore_event')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.restoreMissedEvent()
    this.modals.close()
  }

  private async handleAdWeekly(): Promise<void> {
    const result = await this.ads.showRewarded('weekly_double')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.doubleWeeklyWithAd()
    const reward = this.state.claimWeeklyReward(true)
    this.modals.showToast(this.root, reward > 0 ? `Etkinlik: +${formatMoney(reward)}` : 'Etkinlik bonusu aktif!')
    this.renderWeeklyBanner()
    this.eventsPanel.render(this.state)
    this.updateNavBadges()
  }

  private async handleAdStockHint(): Promise<void> {
    const result = await this.ads.showRewarded('stock_hint')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateStockHint(1)
    this.modals.showToast(this.root, 'Piyasa ipucu 1 saat aktif')
    this.refreshShop(true)
  }

  private async handleAdManagerDiscount(id?: string): Promise<void> {
    const result = await this.ads.showRewarded('manager_discount')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateManagerDiscount()
    if (id) this.state.hireManager(id, true)
    else this.modals.showToast(this.root, 'Sonraki yönetici %50 indirimli')
    this.refreshShop(true)
  }

  private async handleAdSeasonXp(): Promise<void> {
    const result = await this.ads.showRewarded('season_xp')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.doubleSeasonXpWithAd()
    this.modals.showToast(this.root, 'Sezon XP 2x aktif!')
    this.eventsPanel.render(this.state)
  }

  private async handleAdHeatShield(): Promise<void> {
    const result = await this.ads.showRewarded('heat_shield')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.activateHeatShield()
    this.modals.showToast(this.root, '🛡️ Heat kalkanı 15 dk aktif!')
    this.undergroundSheet.render(this.state)
    this.renderHeatMeter()
  }

  showDailyRewardIfAvailable(): void {
    if (!this.runWhenIntroReady('daily-reward', () => this.showDailyRewardIfAvailable())) return
    if (!this.state.canClaimDaily()) return
    const streakLost = this.state.peekDailyStreakReset()
    const nextStreak = this.state.dailyLastClaim && !streakLost
      ? this.state.dailyStreak + 1
      : 1
    const preview = this.state.dailyLoginRewardPreview(nextStreak)
    this.eventDirector.enqueue({
      id: 'daily-reward',
      priority: 4,
      run: () => {
        this.modals.showDailyReward(
          nextStreak,
          formatMoney(preview),
          () => {
            const amount = this.state.claimDailyReward()
            if (amount > 0) this.modals.showToast(this.root, `+${formatMoney(amount)}`)
            this.renderAll()
            this.eventDirector.release()
          },
          streakLost,
        )
      },
    })
  }

  showBankruptcyPopup(reason: string, loss: number, recoveryPool: number, seizedIds: string[]): void {
    if (!this.runWhenIntroReady('bankruptcy-popup', () => this.showBankruptcyPopup(reason, loss, recoveryPool, seizedIds))) return
    this.eventDirector.enqueue({
      id: 'bankruptcy-popup',
      priority: 1,
      run: () => this.renderBankruptcyPopup(reason, loss, recoveryPool, seizedIds),
    })
  }

  private renderBankruptcyPopup(reason: string, loss: number, recoveryPool: number, seizedIds: string[]): void {
    if (!this.state.hasPendingBankruptcyRecovery() && recoveryPool <= 0) {
      this.eventDirector.release()
      return
    }
    const seizedLines = this.state.bankruptcySeizedSnapshot.map(
      (item) => `${item.emoji} ${item.name} ×${item.units} (${formatMoney(item.value)})`,
    )
    if (seizedLines.length === 0) {
      for (const id of seizedIds) {
        const def = PRODUCERS.find((p) => p.id === id)
        if (def) seizedLines.push(`${def.emoji} ${def.name}`)
      }
    }
    const pool = recoveryPool || this.state.bankruptcyRecoveryPool
    const lossLabel = loss > 0 ? formatMoney(loss) : formatMoney(Math.max(pool, Math.floor(pool / 0.85)))
    const rec40 = formatMoney(Math.floor(pool * 0.4))
    const rec80 = formatMoney(Math.floor(pool * 0.8))
    const ad = document.createElement('button')
    ad.type = 'button'
    ad.className = 'btn-ad'
    ad.dataset.action = 'ad-bankruptcy-recovery'
    ad.textContent = `📺 Kurtar %40 — ${rec40}`
    const ad2 = document.createElement('button')
    ad2.type = 'button'
    ad2.className = 'btn-primary'
    ad2.dataset.action = 'ad-bankruptcy-recovery-x2'
    ad2.textContent = `📺 x2 Kurtar %80 — ${rec80}`
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'btn-secondary'
    skip.dataset.action = 'skip-bankruptcy-recovery'
    skip.textContent = 'Vazgeç'
    this.modals.showBankruptcyModal(
      reason,
      lossLabel,
      rec40,
      rec80,
      seizedLines,
      [ad2, ad, skip],
    )
  }

  showComebackPopup(): void {
    if (!this.runWhenIntroReady('comeback-popup', () => this.showComebackPopup())) return
    this.eventDirector.enqueue({
      id: 'comeback-popup',
      priority: 3,
      run: () => this.renderComebackPopup(),
    })
  }

  private renderComebackPopup(): void {
    if (!this.state.hasPendingComeback()) {
      this.eventDirector.release()
      return
    }
    const amount = this.state.comebackPending
    const ad = document.createElement('button')
    ad.type = 'button'
    ad.className = 'btn-ad'
    ad.dataset.action = 'ad-comeback'
    ad.textContent = `📺 Topla — ${formatMoney(amount)}`
    const ad2 = document.createElement('button')
    ad2.type = 'button'
    ad2.className = 'btn-primary'
    ad2.dataset.action = 'ad-comeback-x2'
    ad2.textContent = `📺 x2 — ${formatMoney(amount * 2)}`
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'btn-secondary'
    skip.dataset.action = 'skip-comeback'
    skip.textContent = 'Vazgeç'
    this.modals.show(
      'Seni özledik Baron!',
      `24 saat+ yoktun. ${formatMoney(amount)} geri dönüş bonusu birikti — reklam izleyerek al.`,
      [ad2, ad, skip],
    )
  }

  private syncAdBanner(): void {
    const removed = this.state.removeAdsOwned || iapManager.hasReceipt('remove_ads')
    if (removed && !this.state.removeAdsOwned) {
      this.state.removeAdsOwned = true
    }
    this.ads.setAdsRemoved(removed)
    const showBanner = this.ads.hasBannerPlacement()
    this.root.classList.toggle('has-ad-banner', showBanner)
    if (!showBanner) {
      this.adBannerSlot.hidden = true
      this.ads.hideBanner()
    } else {
      this.adBannerSlot.hidden = false
      this.ads.showBanner(this.adBannerSlot)
    }
  }

  renderAll(): void {
    this.syncAdBanner()
    applyDocumentTheme(this.state.activeTheme)
    this.bottomNav.relabel()
    this.relabelBaronNav()
    this.root.classList.toggle('owner-session-active', isOwnerSession())
    this.statsBar.render()
    this.renderProfileQuickBtn()
    this.renderSessionPanel()
    this.renderHeatMeter()
    if (this.bottomNav.getActive() === 'shop' || this.bottomNav.getActive() === 'market') {
      this.refreshShop(true)
    } else {
      this.patchShopAffordability()
    }
    this.refreshSkyline()
    this.renderCityStrip()
    this.goalsSheet.render(this.state)
    if (this.bottomNav.getActive() === 'profile') {
      this.syncBaronTab()
    } else if (this.baronShowsEvents()) {
      this.eventsPanel.render(this.state)
    }
    this.renderMarketNewsBanner()
    this.renderDayNightChip()
    this.renderProgressStrip()
    this.renderEarnModifiers()
    this.updateNavBadges()
    this.updateProgressiveUnlock()
  }

  destroy(): void {
    this.unsub?.()
    this.unsub = null
    this.clearGoldenEventTimer()
    if (this.uiSyncTimer !== null) window.clearTimeout(this.uiSyncTimer)
    this.ownerPanel.layer.remove()
    this.bottomNav.root.remove()
  }
}
