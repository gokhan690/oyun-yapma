import type { GameState } from '../game/GameState'
import type { AdManager } from '../ads/AdManager'
import type { SoundManager } from '../audio/SoundManager'
import type { SaveManager } from '../security/SaveManager'
import { formatMoney, formatIncomeRate, PRODUCERS, earlyUnlockCost, scaledUnlockAt, isProducerUnlocked, producerName } from '../game/Economy'
import { crisisDef } from '../game/CrisisEvents'
import { buildSkylineBuildings } from './Skyline'
import { cityDef, EXPANSION_CITIES, canUnlockCity } from '../game/ExpansionMap'
import { applyEraTheme, eraForBaron } from '../game/EraTheme'
import { formatProgressLine } from '../game/ProgressPath'
import type { BaronRecord } from '../game/BaronLegacy'
import { assetUrl } from '../utils/assetUrl'
import { currentRank, rankProgress } from '../game/PlayerRank'
import { prestigeMultiplier } from '../game/Prestige'
import { dayBonusExtra, nightBonusExtra } from '../game/PrestigeTree'
import { PERSONALITIES, type PersonalityId } from '../game/PlayerPersonality'
import { EDUCATIONS } from '../game/Education'
import { HOBBIES } from '../game/Hobby'
import { type ParentingStyle, type ChildCareer } from '../game/Dynasty'
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
import { CareerPanel } from './components/CareerPanel'
import {
  TIME_SKIP_OPTIONS,
  getTimeSkipWarnings,
  rollTimeSkipRisks,
  timeSkipEconMs,
  predictTimeSkip,
  type TimeSkipOption,
} from '../game/TimeSkip'
import { playerGameAge, childAgeYearsExact } from '../game/Dynasty'
import { lineChart, gauge, donutChart } from './components/Charts'
import { renderKpiStrip } from './components/PageHeader'
import { firmUpgradesForProducer } from '../game/FirmUpgrades'
import { firmLevelIncomeMult } from '../game/FirmLevels'
import { FRANCHISE_CITIES, franchiseOpenFailureReason } from '../game/Franchise'
import { iapManager } from '../monetization/IAPManager'
import { hapticLight, hapticHeavy, hapticPurchase, hapticCombo10, hapticDeath, hapticIpo, hapticDisaster } from '../utils/haptics'
import { navLockReason, isShopHubLocked, shopHubLockReason } from '../game/ProgressiveUnlock'
import { i18n, LANG_META, t, type LangCode } from '../i18n'
import { applyCountry, type CountryId } from '../game/Countries'
import { BaronAdvisor } from './components/BaronAdvisor'
import { VictoryCinematic } from './components/VictoryCinematic'
import { IpoCelebration } from './components/IpoCelebration'
import type { RivalEvent } from '../game/Rivals'

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
  private healthBarFill!: HTMLElement
  private healthBarLabel!: HTMLElement
  private dailyRoutineEl!: HTMLElement
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
  private careerPanel!: CareerPanel
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
  private postMetaTasks = new Map<string, () => void>()
  private metaFlowReleased = false
  private baronAdvisor = new BaronAdvisor()
  private victoryCinematic = new VictoryCinematic()
  private ipoCelebration = new IpoCelebration()

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
    this.careerPanel = new CareerPanel(
      state,
      (actionId) => {
        const res = state.doCareerAction(actionId)
        if (res.levelUp) this.toast('🎉 Kariyer seviyesi arttı!')
        else if (res.money > 0) this.toast(`+${res.money.toLocaleString('tr-TR')}₺ kazandın`)
        this.careerPanel.render()
      },
      () => {
        state.becomeEntrepreneur()
        this.toast('🚀 Artık tam zamanlı girişimcisin!')
        this.careerPanel.render()
      },
      () => this.showTimeSkipModal(),
      (jobId) => {
        state.setCareerJob(jobId)
        this.toast('💼 İşe girdin! İlk maaşın yakında.')
        this.careerPanel.render()
        this.renderAll()
      },
    )
    this.tutorial = new Tutorial(state)
    this.tutorial.setTabHandler((tab) => this.shop.setTab(tab, this.state))
    this.tutorial.setMandatoryCompleteHandler(() => this.handleIntroFlowReady())
    this.build()
    this.skyline = new Skyline(this.tapArea.parentElement!)
    this.skyline.setBuildingClickHandler((producerId) => {
      const p = PRODUCERS.find((x) => x.id === producerId)
      const income = this.state.producerIncome(p!)
      this.modals.showToast(this.root, `${p?.emoji ?? ''} ${p ? producerName(p) : producerId}: ${formatIncomeRate(income)}`)
    })
    this.particles = new ParticleSystem(this.tapArea.parentElement!)
    this.bindEvents()
    this.startIdleDetection()
    this.renderAll()
    this.updateNavBadges()
    this.setView('career')
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

  startTutorial(delayMs = 600): void {
    if (this.tutorial.shouldShow()) {
      window.setTimeout(() => this.tutorial.start(), delayMs)
    }
    if (!this.state.personality) {
      window.setTimeout(() => this.maybeShowPersonalityModal(), delayMs + 400)
    }
    if (!this.state.education) {
      window.setTimeout(() => this.maybeShowEducationModal(), delayMs + 800)
    }
    if (!this.state.difficultyChosen) {
      window.setTimeout(() => this.maybeShowDifficultyModal(), delayMs + 1200)
    }
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

    const healthRow = document.createElement('div')
    healthRow.className = 'health-bar-row'
    const healthTitle = document.createElement('span')
    healthTitle.className = 'health-bar-title'
    healthTitle.textContent = '❤️ Sağlık'
    this.healthBarLabel = document.createElement('span')
    this.healthBarLabel.className = 'health-bar-status'
    const healthBarOuter = document.createElement('div')
    healthBarOuter.className = 'progress-bar health-bar'
    this.healthBarFill = document.createElement('div')
    this.healthBarFill.className = 'progress-fill health-bar-fill'
    healthBarOuter.appendChild(this.healthBarFill)
    healthRow.append(healthTitle, this.healthBarLabel, healthBarOuter)
    sessionPanel.appendChild(healthRow)

    this.dailyRoutineEl = document.createElement('div')
    this.dailyRoutineEl.className = 'daily-routine-row'
    sessionPanel.appendChild(this.dailyRoutineEl)

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

    const abilityBar = document.createElement('div')
    abilityBar.className = 'ability-bar'
    abilityBar.id = 'ability-bar'
    this.earnView.append(this.weeklyBanner, this.eraStrip, this.cityStrip, this.earnModifiersEl, tapWrap, comboWrap, sessionPanel, progressStrip, this.baronAdvisor.root, adsPanel, abilityBar)
    main.append(this.earnView, this.shop.root, this.baronView, this.empirePanel.root, this.careerPanel.root)

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
    // Karar 14-15: Piyasa kilitliyse hangi yoldan gelinirse gelinsin girilemez
    if (view === 'market' && !this.state.isMarketUnlocked()) {
      this.showMarketLockScreen()
      return
    }
    const previousView = this.bottomNav.getActive()
    this.goalsSheet.close()
    this.closeModalAndPump()
    this.tutorial.onViewChange(view)
    this.bottomNav.setActive(view)
    if (previousView === 'events' && view !== 'events' && this.baronSubTab === 'events') {
      this.baronSubTab = 'profile'
    }
    this.earnView.hidden = view !== 'earn'
    this.careerPanel.root.hidden = view !== 'career'
    this.shop.root.hidden = view !== 'shop' && view !== 'market'
    this.baronView.hidden = view !== 'profile' && view !== 'events'
    this.empirePanel.root.hidden = true
    this.empirePanel.root.classList.remove('empire-overlay-open')
    this.gameMain.classList.toggle('earn-active', view === 'earn' || view === 'career')
    this.gameMain.classList.toggle('shop-scroll-lock', view === 'shop' || view === 'market' || view === 'events' || view === 'profile' || view === 'career')
    if (view === 'career') {
      this.careerPanel.render()
    }
    this.root.dataset.view = view
    document.body.dataset.view = view
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
      this.eventsPanel.root.hidden = true
      this.baronView.classList.remove('events-standalone')
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
    return this.state.isIntroFlowReady()
  }

  private runWhenIntroReady(id: string, task: () => void): boolean {
    if (this.isIntroFlowReady()) return true
    this.postIntroTasks.set(id, task)
    return false
  }

  private runWhenMetaReady(id: string, task: () => void): boolean {
    if (this.state.isMetaSystemsReady()) return true
    this.postMetaTasks.set(id, task)
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
    this.syncFlowClasses()
    this.renderAll()
  }

  private syncFlowClasses(): void {
    const earlyProtected = this.state.isEarlyGameProtected()
    this.root.classList.toggle('early-game-focus', earlyProtected)
    this.root.classList.toggle('meta-systems-ready', !earlyProtected)
    if (earlyProtected) this.metaFlowReleased = false
    if (this.state.isMetaSystemsReady() && !this.metaFlowReleased) {
      this.metaFlowReleased = true
      const tasks = [...this.postMetaTasks.values()]
      this.postMetaTasks.clear()
      for (const task of tasks) task()
      this.updateNavBadges()
    }
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
    const dailyRewardReady = this.state.canShowDailyRewardPrompt() && this.state.canClaimDaily()
    this.bottomNav.setBadges(
      false,
      this.shop.hasShopBadge(this.state),
      this.shop.hasMarketBadge(this.state),
      this.state.hasClaimableSeasonReward()
        || this.state.hasClaimableCampaignReward()
        || this.state.luckyChestReady
        || (this.state.weekly.progress >= this.state.weekly.target && !this.state.weekly.claimed)
        || dailyGoalReady
        || dailyRewardReady
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

  private checkFirstManagerHint(): void {
    if (this.state.seenStoryBeats.has('hint_first_manager')) return
    const anyManager = Object.values(this.state.managers).some(Boolean)
    if (!anyManager) return
    this.state.seenStoryBeats.add('hint_first_manager')
    window.setTimeout(() => {
      this.modals.showToast(
        this.root,
        '📊 İlk yönetici! Artık bu işletme otomatik çalışacak. Daha fazla yönetici al → pasif gelir artar.',
      )
    }, 1200)
  }

  private checkSynergyHint(): void {
    if (this.state.seenStoryBeats.has('hint_synergy')) return
    const s = this.state.producers
    const hasSynergy =
      ((s['stajyer'] ?? 0) > 0 && (s['gazete'] ?? 0) > 0) ||
      ((s['simit'] ?? 0) > 0 && (s['ekmek'] ?? 0) > 0) ||
      ((s['kafe'] ?? 0) > 0 && (s['restoran'] ?? 0) > 0)
    if (!hasSynergy) return
    this.state.seenStoryBeats.add('hint_synergy')
    window.setTimeout(() => {
      this.modals.showToast(
        this.root,
        '⚡ Sinerji! Bu işletmeler birlikte daha fazla kazandırıyor — Güçlendir → Sinerji sekmesini kontrol et.',
      )
    }, 800)
  }

  private checkPrestigeHint(): void {
    if (this.state.seenStoryBeats.has('hint_prestige')) return
    if (this.state.totalEarned < 1_000_000) return
    this.state.seenStoryBeats.add('hint_prestige')
    window.setTimeout(() => {
      this.modals.showToast(
        this.root,
        '👑 IPO zamanı! 1 milyon kazandın. Prestij yaparak daha güçlü başlayabilirsin — Güçlendir → Prestij.',
      )
    }, 1000)
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
        this.checkPrestigeHint()
        this.renderBaronAdvisor()
      }
      if (ev.type === 'click') {
        this.root.classList.add('money-pulse')
        window.setTimeout(() => this.root.classList.remove('money-pulse'), 220)
      }
      if (ev.type === 'illegal_raid') {
        const p = PRODUCERS.find((x) => x.id === ev.producerId)
        this.sound.playRaid()
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
          this.checkSynergyHint()
        }
        if (ev.type === 'manager_hired') {
          this.checkFirstManagerHint()
        }
        this.statsBar.updateMeta()
        this.syncFlowClasses()
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
        this.syncFlowClasses()
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
      if (ev.type === 'health_changed') {
        this.renderHealthBar()
      }
      if (ev.type === 'annual_summary') {
        this.showAnnualSummaryModal(ev.year, ev.playerAge, ev.totalEarned, ev.businessCount, ev.incomePerDay)
      }
      if (ev.type === 'skill_unlocked') {
        this.modals.showAchievementToast(ev.skill.emoji, `Yeni Beceri: ${ev.skill.name}`, ev.skill.description)
      }
      if (ev.type === 'marriage_crisis') {
        this.showMarriageCrisisModal()
      }
      if (ev.type === 'friend_unlocked') {
        this.toast(`🤝 Yeni arkadaş: ${ev.friendName} (${ev.typeLabel})`)
      }
      if (ev.type === 'enemy_appeared') {
        this.showEnemyAppearedModal(ev.enemyName, ev.title)
      }
      if (ev.type === 'mentor_quest_completed') {
        this.modals.showAchievementToast('🧓', `Mentor Görevi: ${ev.questLabel}`, ev.rewardLabel)
      }
      if (ev.type === 'baron_legacy_card') {
        this.showLegacyCardModal(ev)
      }
      if (ev.type === 'age_milestone') {
        this.showAgeMilestoneModal(ev.age, ev.question)
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
        this.eventDirector.enqueue({
          id: `rival-surpassed-${ev.rivalName}`,
          priority: 4,
          run: () => {
            this.modals.showToast(
              this.root,
              `⚠️ ${ev.rivalName} sizi geçti! Net servet: ${formatMoney(ev.rivalWorth)}`,
              'important',
            )
            window.setTimeout(() => this.eventDirector.release(), 2200)
          },
        })
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
      if (ev.type === 'victory_achieved') {
        this.sound.playVictory()
        this.victoryCinematic.show(ev)
      }
      if (ev.type === 'rival_event') {
        this.sound.playRivalAttack()
        this.showRivalEventModal(ev.event)
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
        if (ev.crash) this.triggerCrashFlash()
        this.refreshShop(true)
      }
      if (ev.type === 'macro_event') {
        if (ev.crash) this.triggerCrashFlash()
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
          // Karar 14: Piyasa için zengin kilit kontrolü
          if (view === 'market' && !this.state.isMarketUnlocked()) {
            this.showMarketLockScreen()
            return
          }
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
        if (!this.state.canShowDailyRewardPrompt()) {
          this.modals.showToast(this.root, 'Önce ilk işletmeyi kur; günlük ödül birazdan açılacak.')
          return
        }
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
        const qty = parseInt(count ?? '1') || 1
        const ok = id ? this.state.buyResidence(id as import('../game/Lifestyle').ResidenceId, qty) : false
        if (ok) { this.modals.showToast(this.root, qty > 1 ? `🏠 ${qty} mülk satın alındı!` : '🏠 Mülk satın alındı!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'move-to-residence': {
        if (id) { this.state.lifestyle.residence = id as import('../game/Lifestyle').ResidenceId; this.lifestylePanel.render(this.state) }
        break
      }
      case 'sell-residence': {
        const qty = parseInt(count ?? '1') || 1
        const ok = id ? this.state.sellResidence(id as import('../game/Lifestyle').ResidenceId, qty) : false
        if (ok) { this.modals.showToast(this.root, qty > 1 ? `💰 ${qty} mülk satıldı!` : '💰 Mülk satıldı!'); this.lifestylePanel.render(this.state); this.statsBar.render() }
        break
      }
      case 'rent-out-residence': {
        const qty = parseInt(count ?? '999') || 999
        if (id) { this.state.setRentResidence(id as import('../game/Lifestyle').ResidenceId, true, qty); this.lifestylePanel.render(this.state) }
        break
      }
      case 'stop-rent-residence': {
        const qty = parseInt(count ?? '999') || 999
        if (id) { this.state.setRentResidence(id as import('../game/Lifestyle').ResidenceId, false, qty); this.lifestylePanel.render(this.state) }
        break
      }
      case 'buy-vehicle': {
        const qty = parseInt(count ?? '1') || 1
        const ok = id ? this.state.buyVehicle(id as import('../game/Lifestyle').VehicleId, qty) : false
        if (ok) { this.modals.showToast(this.root, qty > 1 ? `🚗 ${qty} araç alındı!` : '🚗 Araç alındı!'); this.lifestylePanel.render(this.state) }
        else if (id) this.modals.showToast(this.root, '❌ Yeterli para yok')
        break
      }
      case 'use-vehicle': {
        if (id) { this.state.lifestyle.vehicle = id as import('../game/Lifestyle').VehicleId; this.lifestylePanel.render(this.state) }
        break
      }
      case 'sell-vehicle': {
        const qty = parseInt(count ?? '1') || 1
        const ok = id ? this.state.sellVehicle(id as import('../game/Lifestyle').VehicleId, qty) : false
        if (ok) { this.modals.showToast(this.root, qty > 1 ? `💰 ${qty} araç satıldı!` : '💰 Araç satıldı!'); this.lifestylePanel.render(this.state); this.statsBar.render() }
        break
      }
      case 'rent-out-vehicle': {
        const qty = parseInt(count ?? '999') || 999
        if (id) { this.state.setRentVehicle(id as import('../game/Lifestyle').VehicleId, true, qty); this.lifestylePanel.render(this.state) }
        break
      }
      case 'stop-rent-vehicle': {
        const qty = parseInt(count ?? '999') || 999
        if (id) { this.state.setRentVehicle(id as import('../game/Lifestyle').VehicleId, false, qty); this.lifestylePanel.render(this.state) }
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
      case 'prestige-shop-buy':
        if (id && this.state.buyPrestigeShopItem(id)) {
          this.modals.showToast(this.root, 'Satın alındı!')
          this.refreshShop(true)
        } else {
          this.modals.showToast(this.root, 'Satın alınamadı — yeterli puan yok veya zaten sahipsin.')
        }
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
      case 'rival-respond': {
        // id = eventId, count = responseId (reusing existing data attributes)
        if (id && count) this.state.resolveRivalEvent(id, count)
        this.modals.close()
        break
      }
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
      case 'annual-focus-work':
        this.state.applyAnnualFocus('work')
        this.closeModalAndPump()
        break
      case 'annual-focus-family':
        this.state.applyAnnualFocus('family')
        this.closeModalAndPump()
        break
      case 'annual-focus-health':
        this.state.applyAnnualFocus('health')
        this.closeModalAndPump()
        break
      case 'annual-focus-social':
        this.state.applyAnnualFocus('social')
        this.closeModalAndPump()
        break
      case 'choose-personality':
        if (id) {
          this.state.setPersonality(id as PersonalityId)
          this.modals.showToast(this.root, `🎭 Karakter seçildi! ${PERSONALITIES.find((p) => p.id === id)?.name}`)
          this.closeModalAndPump()
        }
        break
      case 'marriage-crisis-money':
        this.state.resolveMarriageCrisis(true)
        this.modals.showToast(this.root, '💍 Evlilik krizi atlatıldı')
        this.closeModalAndPump()
        break
      case 'marriage-crisis-time':
        this.state.resolveMarriageCrisis(false)
        this.modals.showToast(this.root, '🌹 Eşine zaman ayırdın — kriz çözüldü')
        this.closeModalAndPump()
        break
      case 'daily-routine':
        if (id) {
          const ok = this.state.doDailyRoutine(id as 'exercise' | 'read' | 'network' | 'family' | 'meditate')
          if (ok) {
            this.renderHealthBar()
            this.renderDailyRoutine()
            this.modals.showToast(this.root, '✅ Günlük aksiyon tamamlandı')
          } else {
            this.modals.showToast(this.root, 'Bugün hakkın kalmadı', 'important')
          }
        }
        break
      case 'spouse-gift':
        if (this.state.giveSpouseGift()) {
          this.modals.showToast(this.root, '🎁 Hediye verildi — memnuniyet arttı')
          this.refreshBaronPanel()
        } else {
          this.modals.showToast(this.root, 'Yeterli para yok', 'important')
        }
        break
      case 'child-time':
        if (id && this.state.spendTimeWithChild(id)) {
          this.modals.showToast(this.root, '👨‍👧 Çocuğunla vakit geçirdin')
          this.refreshBaronPanel()
        }
        break
      case 'child-parenting':
        if (id) {
          const [childId, style] = id.split(':')
          if (childId && style) {
            this.state.setChildParentingStyle(childId, style as ParentingStyle)
            this.refreshBaronPanel()
          }
        }
        break
      case 'child-career':
        if (id) {
          const [childId, career] = id.split(':')
          if (childId && career) {
            this.state.setChildCareer(childId, career as ChildCareer)
            this.refreshBaronPanel()
          }
        }
        break
      case 'child-education-path':
        if (id) {
          const [childId, path] = id.split(':')
          if (childId && path) {
            this.state.setChildEducationPath(childId, path as import('../game/Dynasty').ChildEducationPath)
            this.modals.showToast(this.root, '📚 Eğitim yolu seçildi')
            this.refreshBaronPanel()
          }
        }
        break
      case 'heir-role':
        if (id) {
          const [childId, role] = id.split(':')
          if (childId && role) {
            this.state.setHeirRole(childId, role as import('../game/Dynasty').HeirRoleId)
            this.modals.showToast(this.root, '👔 Varis şirkette rol aldı')
            this.refreshBaronPanel()
          }
        }
        break
      case 'prepare-will':
        if (this.state.prepareWill()) {
          this.modals.showToast(this.root, '📜 Vasiyet hazırlandı')
        } else {
          this.modals.showToast(this.root, 'Yeterli para yok', 'important')
        }
        this.refreshBaronPanel()
        break
      case 'create-trust':
        if (this.state.createFamilyTrust()) {
          this.modals.showToast(this.root, '🏛️ Aile vakfı kuruldu')
        } else {
          this.modals.showToast(this.root, 'Yeterli para yok', 'important')
        }
        this.refreshBaronPanel()
        break
      case 'write-constitution':
        if (this.state.writeFamilyConstitution()) {
          this.modals.showToast(this.root, '📋 Aile anayasası yazıldı')
        } else {
          this.modals.showToast(this.root, 'Yeterli para yok', 'important')
        }
        this.refreshBaronPanel()
        break
      case 'choose-education':
        if (id) {
          this.state.setEducation(id as import('../game/Education').EducationId)
          const eDef = EDUCATIONS.find((e) => e.id === id)
          this.modals.showToast(this.root, `🎓 Eğitim seçildi: ${eDef?.name ?? id}`)
          this.closeModalAndPump()
        }
        break
      case 'choose-difficulty':
        if (id) {
          this.state.setDifficulty(id as 'easy' | 'normal' | 'hard')
          const diffNames: Record<string, string> = { easy: '😌 Kolay', normal: '💼 Normal', hard: '🔥 Zor' }
          this.modals.showToast(this.root, `⚙️ Zorluk: ${diffNames[id] ?? id}`)
          this.closeModalAndPump()
        }
        break
      case 'set-hobby':
        if (id) {
          this.state.setHobby(id as import('../game/Hobby').HobbyId)
          const hDef = HOBBIES.find((h) => h.id === id)
          this.modals.showToast(this.root, `🎯 Hobi seçildi: ${hDef?.name ?? id}`)
          this.refreshBaronPanel()
        }
        break
      case 'toggle-legacy-item':
        if (id) {
          this.state.toggleDynastyLegacyItem(id as import('../game/Dynasty').DynastyLegacyItemId)
          this.refreshBaronPanel()
        }
        break
      case 'friend-time':
        if (id) {
          this.state.spendTimeWithFriend(id as import('../game/Friendships').FriendTypeId)
          this.modals.showToast(this.root, '🤝 Arkadaşınla vakit geçirdin')
          this.refreshBaronPanel()
        }
        break
      case 'friend-money':
        if (id) {
          if (this.state.sendMoneyToFriend(id as import('../game/Friendships').FriendTypeId)) {
            this.modals.showToast(this.root, '💸 Para gönderildi — ilişki güçlendi')
          } else {
            this.modals.showToast(this.root, 'Yeterli para yok', 'important')
          }
          this.refreshBaronPanel()
        }
        break
      case 'resolve-enemy':
        if (id) {
          if (this.state.resolveEnemy(id)) {
            this.modals.showToast(this.root, '✅ Düşman bertaraf edildi!')
          } else {
            this.modals.showToast(this.root, 'Yeterli para yok', 'important')
          }
          this.refreshBaronPanel()
        }
        break
      case 'go-travel':
        if (id) {
          if (this.state.goTravel(id as import('../game/Travel').TravelDestinationId)) {
            this.modals.showToast(this.root, '✈️ Tatile çıkıldı!')
          } else {
            this.modals.showToast(this.root, 'Yeterli para veya kilidin açık değil', 'important')
          }
          this.refreshBaronPanel()
        }
        break
      case 'buy-home-room':
        if (id) {
          if (this.state.buyHomeRoom(id as import('../game/Lifestyle').HomeRoomId)) {
            this.modals.showToast(this.root, '🏠 Oda eklendi!')
          } else {
            this.modals.showToast(this.root, 'Yeterli para yok veya zaten mevcut', 'important')
          }
          this.refreshBaronPanel()
        }
        break
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
        if (id) {
          const units = Math.max(1, Math.floor(Number(count ?? 1)))
          this.state.buyCommodity(id as import('../game/Commodities').CommodityId, Number.isFinite(units) ? units : 1)
        }
        this.refreshShop(true)
        break
      case 'commodity-sell':
        if (id) {
          const units = Math.max(1, Math.floor(Number(count ?? 1)))
          this.state.sellCommodity(id as import('../game/Commodities').CommodityId, Number.isFinite(units) ? units : 1)
        }
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
          const unlockedCityDef = EXPANSION_CITIES.find((c) => c.id === id)
          this.sound.playCityUnlock()
          if (unlockedCityDef) this.triggerCityUnlockCelebration(unlockedCityDef.label)
          else this.modals.showToast(this.root, '🗺️ Yeni şehir açıldı!')
          this.refreshSkyline()
          this.renderCityStrip()
          this.refreshBaronPanel()
          this.refreshShop(true)
        } else if (id) {
          const check = canUnlockCity(id as import('../game/ExpansionMap').CityId, this.state.cities, this.state.money, this.state.reputation, this.state.ipoCount)
          if (check.reason) this.modals.showToast(this.root, check.reason)
        }
        break
      case 'set-active-city':
        if (id && this.state.setActiveCity(id as import('../game/ExpansionMap').CityId)) {
          this.refreshSkyline()
          this.renderCityStrip()
          this.refreshBaronPanel()
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
      case 'levelup-firm':
        if (id && this.state.levelUpFirm(id)) {
          this.modals.showToast(this.root, '⬆️ Firma geliştirildi — gelir arttı')
          this.refreshShop(true)
        } else {
          this.modals.showToast(this.root, 'Yeterli para yok', 'important')
        }
        break
      case 'buy-firm-upgrade':
        if (id) {
          const [pid, uid] = id.split(':')
          if (pid && uid && this.state.buyFirmUpgrade(pid, uid)) {
            this.modals.showToast(this.root, '🛠️ Geliştirme yapıldı — gelir arttı')
            this.refreshShop(true)
          } else {
            this.modals.showToast(this.root, 'Yeterli para yok', 'important')
          }
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
      case 'ability-click-burst':
        if (this.state.useAbility('click_burst', 300_000)) {
          this.state.grantPendingBoost('income_2x', 30_000, 'Tıklama Patlaması', '💥')
          this.modals.showToast(this.root, '💥 Tıklama Patlaması! 30 saniyelik 2x boost aktif')
          this.renderAbilityBar()
        } else {
          this.modals.showToast(this.root, '⏳ Tıklama Patlaması bekleme süresinde')
        }
        break
      case 'ability-tax-break':
        if (this.state.useAbility('tax_break', 480_000)) {
          this.state.grantPendingBoost('income_2x', 60_000, 'Vergi Tatili', '🧾')
          this.modals.showToast(this.root, '🧾 Vergi Tatili! 60 saniyelik +20% gelir aktif')
          this.renderAbilityBar()
        } else {
          this.modals.showToast(this.root, '⏳ Vergi Tatili bekleme süresinde')
        }
        break
      case 'ability-market-signal':
        if (this.state.useAbility('market_signal', 600_000)) {
          const dir = this.state.stock.trendDirection
          const hint = dir === 'up' ? '📈 Borsa yükseliyor — al fırsatı!' : dir === 'down' ? '📉 Borsa düşüyor — dikkatli ol!' : '📊 Borsa yatay — değişim bekleniyor'
          this.modals.showToast(this.root, hint)
          this.renderAbilityBar()
        } else {
          this.modals.showToast(this.root, '⏳ Borsa Sinyali bekleme süresinde')
        }
        break
      case 'ability-worker-boost':
        if (this.state.useAbility('worker_boost', 360_000)) {
          this.state.grantPendingBoost('income_2x', 120_000, 'Çalışan Motivasyonu', '⚡')
          this.modals.showToast(this.root, '⚡ Çalışan Motivasyonu! 2 dakika +15% pasif gelir')
          this.renderAbilityBar()
        } else {
          this.modals.showToast(this.root, '⏳ Çalışan Motivasyonu bekleme süresinde')
        }
        break
      case 'ability-press-release':
        if (this.state.reputation <= 20) {
          this.modals.showToast(this.root, '⚠️ Basın Açıklaması için min. 20 itibar gerekli')
          break
        }
        if (this.state.useAbility('press_release', 1_200_000)) {
          this.state.reputation = Math.min(100, this.state.reputation + 5)
          this.modals.showToast(this.root, '📰 Basın Açıklaması! +5 itibar kazandın')
          this.renderAbilityBar()
          this.statsBar.render()
        } else {
          this.modals.showToast(this.root, '⏳ Basın Açıklaması bekleme süresinde')
        }
        break
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
      this.unlockProgressLabel.textContent = t('hud_unlock_to_biz').replace('{name}', `${nextBiz.emoji} ${producerName(nextBiz)}`)
      this.unlockProgressFill.style.width = `${pct}%`
      this.nextBizPreview.innerHTML = `<span class="next-biz-emoji">${nextBiz.emoji}</span><span class="next-biz-name">${producerName(nextBiz)}</span><span class="next-biz-pct">${Math.floor(pct)}%</span>`
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
    const cityId = this.state.activeCityId()
    const unlockable = EXPANSION_CITIES.some((c) =>
      !this.state.cities.unlocked.includes(c.id)
      && canUnlockCity(c.id, this.state.cities, this.state.money, this.state.reputation, this.state.ipoCount).ok,
    )
    // Yatay şehir ilerleme yolu (Aşama 14)
    const nodes = EXPANSION_CITIES.map((c, i) => {
      const unlocked = this.state.cities.unlocked.includes(c.id)
      const active = c.id === cityId
      const canUnlock = !unlocked && canUnlockCity(c.id, this.state.cities, this.state.money, this.state.reputation, this.state.ipoCount).ok
      const cls = active ? 'city-node-active' : unlocked ? 'city-node-unlocked' : canUnlock ? 'city-node-ready' : 'city-node-locked'
      const connector = i > 0 ? `<span class="city-connector${unlocked ? ' city-connector-on' : ''}"></span>` : ''
      return `${connector}<span class="city-node ${cls}" title="${c.label}">${unlocked ? c.emoji : '🔒'}<small>${c.label}</small></span>`
    }).join('')
    const hasDisasterRisk = DISASTERS.some((d) => d.affectedCities.includes(cityId))
    const insured = this.state.insurance.business
    const riskLabel = hasDisasterRisk ? (insured ? '🛡️ Sigortalı' : '⚠️ Afet riski') : ''
    this.cityStrip.innerHTML = `
      <button type="button" class="city-strip-path" data-action="open-expansion">
        <div class="city-path-row">${nodes}</div>
        ${unlockable ? '<span class="city-path-hint">🗺️ Yeni şehir açılabilir!</span>' : riskLabel ? `<span class="city-path-hint">${riskLabel}</span>` : ''}
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
      if (choice.healthDelta && choice.healthDelta > 0) delta.push(`Sağlık +${choice.healthDelta}`)
      else if (choice.healthDelta && choice.healthDelta < 0) delta.push(`Sağlık ${choice.healthDelta}`)
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

  private renderHealthBar(): void {
    const health = Math.round(this.state.health.health)
    this.healthBarFill.style.width = `${health}%`
    this.healthBarFill.style.background = health >= 60 ? '#5ee0a0' : health >= 40 ? '#f8b84e' : '#f87171'
    let label = 'Mükemmel'
    if (health < 20) label = 'Kritik'
    else if (health < 40) label = 'Zayıf'
    else if (health < 60) label = 'Orta'
    else if (health < 80) label = 'İyi'
    this.healthBarLabel.textContent = `${label} · %${health}`
  }

  private renderDailyRoutine(): void {
    if (!this.dailyRoutineEl) return
    const status = this.state.getDailyRoutineActions()
    const actions: { id: string; emoji: string; label: string }[] = [
      { id: 'exercise', emoji: '🏃', label: 'Egzersiz' },
      { id: 'read', emoji: '📚', label: 'Kitap Oku' },
      { id: 'network', emoji: '🤝', label: 'Ağ Kur' },
      { id: 'family', emoji: '👨‍👩‍👧', label: 'Aile Vakti' },
      { id: 'meditate', emoji: '🧘', label: 'Meditasyon' },
    ]
    this.dailyRoutineEl.replaceChildren()
    const title = document.createElement('div')
    title.className = 'daily-routine-title'
    title.textContent = `🌅 Günlük Aksiyonlar (${status.remaining}/${status.max})`
    this.dailyRoutineEl.appendChild(title)
    const grid = document.createElement('div')
    grid.className = 'daily-routine-grid'
    for (const a of actions) {
      const used = status.used.includes(a.id)
      const disabled = used || status.remaining <= 0
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `daily-routine-btn${used ? ' routine-used' : ''}`
      b.dataset.action = 'daily-routine'
      b.dataset.id = a.id
      if (disabled) b.disabled = true
      b.innerHTML = `<span class="routine-emoji">${a.emoji}</span><span class="routine-label">${a.label}</span>`
      grid.appendChild(b)
    }
    this.dailyRoutineEl.appendChild(grid)
  }

  private showAnnualSummaryModal(
    year: number,
    playerAge: number,
    totalEarned: number,
    businessCount: number,
    incomePerDay: number,
  ): void {
    const choices: { label: string; emoji: string; bonus: string; action: string }[] = [
      { label: 'İşe odaklan', emoji: '💼', bonus: 'Gelir +%10 (30 gün)', action: 'annual-focus-work' },
      { label: 'Aileye vakit ayır', emoji: '👨‍👩‍👧', bonus: 'Stres -15, Sağlık +5', action: 'annual-focus-family' },
      { label: 'Sağlığa yatırım yap', emoji: '🏃', bonus: 'Sağlık +20', action: 'annual-focus-health' },
      { label: 'Sosyal ağ kur', emoji: '🤝', bonus: 'İtibar +15', action: 'annual-focus-social' },
    ]
    const body = document.createElement('div')
    body.className = 'annual-summary-body'
    const stats = document.createElement('div')
    stats.className = 'annual-summary-stats'
    stats.innerHTML = `
      <div class="annual-stat"><span class="annual-stat-label">Yaş</span><strong>${playerAge}</strong></div>
      <div class="annual-stat"><span class="annual-stat-label">Toplam Kazanç</span><strong>${formatMoney(totalEarned)}</strong></div>
      <div class="annual-stat"><span class="annual-stat-label">Aktif İşletme</span><strong>${businessCount}</strong></div>
      <div class="annual-stat"><span class="annual-stat-label">Günlük Gelir</span><strong>${formatMoney(incomePerDay)}/gün</strong></div>
    `
    const question = document.createElement('p')
    question.className = 'annual-summary-question'
    question.textContent = `${year}. oyun yılı bitti. Bu yıl neye odaklanmak istersin?`
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    const btns = choices.map((c) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn-secondary annual-choice-btn'
      b.dataset.action = c.action
      b.innerHTML = `<strong>${c.emoji} ${c.label}</strong><small>${c.bonus}</small>`
      return b
    })
    btnRow.append(...btns)
    body.append(stats, question, btnRow)
    this.eventDirector.enqueue({
      id: `annual-summary-${year}`,
      priority: 1,
      run: () => this.modals.showContent(`🗓️ ${year}. Yıl Özeti`, body, [], true),
    })
  }

  private showMarriageCrisisModal(): void {
    const body = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = `${this.state.dynasty.spouseName ?? 'Eşin'} son zamanlarda ihmal edildiğini düşünüyor. İlişkiniz kritik noktada. Ne yapacaksın?`
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    const moneyBtn = document.createElement('button')
    moneyBtn.type = 'button'
    moneyBtn.className = 'btn-secondary annual-choice-btn'
    moneyBtn.dataset.action = 'marriage-crisis-money'
    moneyBtn.innerHTML = `<strong>💍 Lüks hediye + tatil (₺100K)</strong><small>Memnuniyet +40</small>`
    const timeBtn = document.createElement('button')
    timeBtn.type = 'button'
    timeBtn.className = 'btn-secondary annual-choice-btn'
    timeBtn.dataset.action = 'marriage-crisis-time'
    timeBtn.innerHTML = `<strong>🌹 Zaman ayır, işi azalt</strong><small>Memnuniyet +25, Stres −10</small>`
    btnRow.append(moneyBtn, timeBtn)
    body.append(p, btnRow)
    this.eventDirector.enqueue({
      id: 'marriage-crisis',
      priority: 2,
      run: () => this.modals.showContent('💔 Evlilik Krizi', body, [], true),
    })
  }

  private showAgeMilestoneModal(age: number, question: string): void {
    const body = document.createElement('div')
    body.className = 'annual-summary-body'
    const p = document.createElement('p')
    p.className = 'annual-summary-question'
    p.textContent = question
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    const choices = [
      { label: 'Kariyer', emoji: '💼', focus: 'work' },
      { label: 'Aile', emoji: '👨‍👩‍👧', focus: 'family' },
      { label: 'Sağlık', emoji: '💪', focus: 'health' },
      { label: 'Sosyal', emoji: '🤝', focus: 'social' },
    ]
    for (const c of choices) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-secondary annual-choice-btn'
      btn.dataset.action = `annual-focus-${c.focus}`
      btn.innerHTML = `<strong>${c.emoji} ${c.label}</strong>`
      btnRow.appendChild(btn)
    }
    body.append(p, btnRow)
    this.eventDirector.enqueue({
      id: `age-milestone-${age}`,
      priority: 2,
      run: () => this.modals.showContent(`🎂 ${age} Yaşında!`, body, []),
    })
  }

  private showEnemyAppearedModal(enemyName: string, title: string): void {
    const body = document.createElement('div')
    body.className = 'annual-summary-body'
    const info = document.createElement('p')
    info.className = 'annual-summary-question'
    info.innerHTML = `<strong>😈 ${enemyName}</strong> — ${title}<br><br>Bu kişi seni her gün baltalıyor. Gelirini azaltıyor. Profil → Düşman bölümünden çözebilirsin.`
    body.appendChild(info)
    this.eventDirector.enqueue({
      id: 'enemy-appeared',
      priority: 2,
      run: () => this.modals.showContent('⚠️ Yeni Düşman!', body, []),
    })
  }

  private showLegacyCardModal(ev: { peakNetWorth: number; generation: number; ipoCount: number; reputation: number; legacyScore: number; publicTitle: string; publicEmoji: string }): void {
    const { formatMoney } = (window as any).__gameUtils ?? {}
    const fmtMoney = typeof formatMoney === 'function' ? formatMoney : (n: number) => `₺${n.toLocaleString('tr-TR')}`
    const body = document.createElement('div')
    body.className = 'legacy-card-body'
    body.innerHTML = `
      <div class="legacy-card-header">
        <div class="legacy-card-title">Miras Kartın</div>
        <div class="legacy-card-public">${ev.publicEmoji} "${ev.publicTitle}"</div>
      </div>
      <div class="legacy-card-stats">
        <div class="legacy-stat"><span class="legacy-stat-emoji">💰</span><span class="legacy-stat-label">Peak Servet</span><span class="legacy-stat-value">${fmtMoney(ev.peakNetWorth)}</span></div>
        <div class="legacy-stat"><span class="legacy-stat-emoji">🏛️</span><span class="legacy-stat-label">Nesil</span><span class="legacy-stat-value">${ev.generation}. nesil</span></div>
        <div class="legacy-stat"><span class="legacy-stat-emoji">🚀</span><span class="legacy-stat-label">IPO Sayısı</span><span class="legacy-stat-value">${ev.ipoCount}</span></div>
        <div class="legacy-stat"><span class="legacy-stat-emoji">⭐</span><span class="legacy-stat-label">İtibar</span><span class="legacy-stat-value">${ev.reputation}</span></div>
        <div class="legacy-stat"><span class="legacy-stat-emoji">👑</span><span class="legacy-stat-label">Toplam Miras Puanı</span><span class="legacy-stat-value">${ev.legacyScore}</span></div>
      </div>
      <div class="legacy-card-note">Miras puanın bir sonraki nesilde başlangıç avantajı olarak döner.</div>
    `
    this.eventDirector.enqueue({
      id: 'legacy-card',
      priority: 4,
      run: () => this.modals.showContent('🏆 Hayat Sona Erdi', body, []),
    })
  }

  private maybeShowPersonalityModal(): void {
    if (this.state.personality) return
    const body = document.createElement('div')
    const p = document.createElement('p')
    p.className = 'annual-summary-question'
    p.textContent = 'Sen nasıl bir baronsun? Karakterini seç — bu tüm oyunu şekillendirecek.'
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    const btns = PERSONALITIES.map((pers) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn-secondary annual-choice-btn'
      b.dataset.action = 'choose-personality'
      b.dataset.id = pers.id
      b.innerHTML = `<strong>${pers.emoji} ${pers.name}</strong><small>${pers.description}</small>`
      return b
    })
    btnRow.append(...btns)
    body.append(p, btnRow)
    this.eventDirector.enqueue({
      id: 'personality-choice',
      priority: 3,
      run: () => this.modals.showContent('🎭 Karakterini Seç', body, [], true),
    })
  }

  private maybeShowEducationModal(): void {
    if (this.state.education) return
    const body = document.createElement('div')
    const p = document.createElement('p')
    p.className = 'annual-summary-question'
    p.textContent = 'Eğitim geçmişin başlangıç koşullarını belirliyor. Hangi eğitim seviyesinden başlamak istersin?'
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    for (const edu of EDUCATIONS) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn-secondary annual-choice-btn'
      b.dataset.action = 'choose-education'
      b.dataset.id = edu.id
      b.innerHTML = `<strong>${edu.emoji} ${edu.name}</strong><small>${edu.description}</small>`
      btnRow.appendChild(b)
    }
    body.append(p, btnRow)
    this.eventDirector.enqueue({
      id: 'education-choice',
      priority: 3,
      run: () => this.modals.showContent('🎓 Eğitim Geçmişi', body, [], true),
    })
  }

  private maybeShowDifficultyModal(): void {
    if (this.state.difficultyChosen) return
    const body = document.createElement('div')
    const p = document.createElement('p')
    p.className = 'annual-summary-question'
    p.textContent = 'Oyun zorluğunu seç. Bu seçim ölüm riskini ve başlangıç koşullarını etkiler.'
    const diffs: { id: 'easy' | 'normal' | 'hard'; emoji: string; name: string; desc: string }[] = [
      { id: 'easy', emoji: '😌', name: 'Kolay', desc: 'Başlangıç parası ×2, düşük ölüm riski. Rahat bir oyun.' },
      { id: 'normal', emoji: '💼', name: 'Normal', desc: 'Dengeli deneyim. Önerilen başlangıç modu.' },
      { id: 'hard', emoji: '🔥', name: 'Zor', desc: 'Yüksek ölüm riski, zorlu rakipler. Deneyimli oyuncular için.' },
    ]
    const btnRow = document.createElement('div')
    btnRow.className = 'annual-summary-choices'
    for (const d of diffs) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `btn-secondary annual-choice-btn${this.state.difficulty === d.id ? ' selected' : ''}`
      b.dataset.action = 'choose-difficulty'
      b.dataset.id = d.id
      b.innerHTML = `<strong>${d.emoji} ${d.name}</strong><small>${d.desc}</small>`
      btnRow.appendChild(b)
    }
    body.append(p, btnRow)
    this.eventDirector.enqueue({
      id: 'difficulty-choice',
      priority: 2,
      run: () => this.modals.showContent('⚙️ Zorluk Seviyesi', body, [], true),
    })
  }

  private renderSessionPanel(): void {
    const clickIncome = this.state.clickIncomePerTap()
    const comboMult = this.state.comboMultiplier
    const passive = this.state.incomePerDay()
    this.sessionClickIncome.textContent = formatMoney(clickIncome)
    this.sessionComboMult.textContent = `${comboMult.toFixed(1)}x`
    this.sessionPassiveIncome.textContent = formatIncomeRate(passive)
    this.renderHealthBar()
    this.renderDailyRoutine()
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

  /** Piyasa kilit ekranı (Karar 14-15) */
  private showMarketLockScreen(): void {
    const body = document.createElement('div')
    body.className = 'market-lock-screen'
    const nw = this.state.financeNetWorth()
    const pct = Math.min(100, Math.round((nw / 50_000) * 100))
    body.innerHTML = `
      <div class="market-lock-emoji">📈🔒</div>
      <h3 class="market-lock-title">Piyasa Kilitli</h3>
      <p class="market-lock-reason">${this.state.marketLockReason()}</p>
      <div class="market-lock-progress">
        <div class="market-lock-bar"><div class="market-lock-fill" style="width:${pct}%"></div></div>
        <small>Net değer: ${formatMoney(nw)} / ${formatMoney(50_000)} (%${pct})</small>
      </div>
    `
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'btn-secondary'
    closeBtn.textContent = 'Anladım'
    closeBtn.addEventListener('click', () => this.modals.close())
    this.modals.showContent('📈 Piyasa', body, [closeBtn])
  }

  showTimeSkipModal(): void {
    const s = this.state
    const ctx = {
      heat: s.illegalHeat,
      loan: s.bank.loan,
      totalIncome: s.incomePerDay() * 365,
      playerAge: playerGameAge(s.gameTimeMs, s.dynasty),
      stress: s.career.stress,
      hasHeir: !!s.dynasty.activeHeirId,
      hasWill: false,
      stockPortfolioValue: 0,
      reputation: s.reputation,
    }

    const body = document.createElement('div')
    body.className = 'timeskip-modal'

    const intro = document.createElement('p')
    intro.className = 'timeskip-intro'
    intro.textContent = 'Hayat zamanını ileri sar. Para düşük gelir, riskler çalışır.'
    body.appendChild(intro)

    const grid = document.createElement('div')
    grid.className = 'timeskip-grid'

    for (const opt of TIME_SKIP_OPTIONS) {
      const warnings = getTimeSkipWarnings(opt.id, ctx)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `timeskip-option-btn${warnings.length > 0 ? ' has-warning' : ''}`
      const incomePct = Math.round(opt.incomeRatio * 100)
      btn.innerHTML =
        `<span class="ts-emoji">${opt.emoji}</span>` +
        `<span class="ts-label">${opt.label}</span>` +
        `<span class="ts-income">Gelir: %${incomePct}</span>` +
        `<span class="ts-desc">${opt.description}</span>` +
        (warnings.length > 0 ? `<span class="ts-warn">⚠️ ${warnings.length} risk</span>` : '')
      btn.addEventListener('click', () => {
        this.modals.close()
        this.executeTimeSkip(opt.id, ctx)
      })
      grid.appendChild(btn)
    }

    body.appendChild(grid)

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.textContent = 'Vazgeç'
    cancelBtn.addEventListener('click', () => this.modals.close())

    this.modals.showContent('⏳ Zamanı İleri Sar', body, [cancelBtn])
  }

  /** Time skip seçeneğinin gerçek hayat-ayı uzunluğunu çöz */
  private resolveTimeSkipMonths(skipId: TimeSkipOption): number {
    const s = this.state
    const opt = TIME_SKIP_OPTIONS.find((o) => o.id === skipId)
    if (!opt) return 12
    return opt.lifeMonths > 0
      ? opt.lifeMonths
      : opt.id === 'retirement' ? Math.max(1, 55 - playerGameAge(s.gameTimeMs, s.dynasty)) * 12
      : opt.id === 'heir18' ? (() => {
          const child = s.dynasty.children.find((c) => !c.heirRole)
          if (!child) return 12
          const childAge = childAgeYearsExact(s.gameTimeMs, child.bornGameDay)
          return Math.max(1, Math.round((18 - childAge) * 12))
        })() : 12
  }

  /** Detaylı tahmin ekranı göster (Aşama 12 — para hilesi olmadığını kanıtlar) */
  private executeTimeSkip(skipId: TimeSkipOption, ctx: Parameters<typeof getTimeSkipWarnings>[1]): void {
    const s = this.state
    const opt = TIME_SKIP_OPTIONS.find((o) => o.id === skipId)
    if (!opt) return

    const lifeMonths = this.resolveTimeSkipMonths(skipId)
    const children = s.dynasty.children.map((c) => ({
      name: c.name,
      ageYears: childAgeYearsExact(s.gameTimeMs, c.bornGameDay),
    }))
    const pred = predictTimeSkip(lifeMonths, opt, ctx, s.incomePerDay(), 12 * 1000, children)

    const body = document.createElement('div')
    body.className = 'timeskip-predict'

    // Olacaklar bölümü
    const changes = document.createElement('div')
    changes.className = 'ts-predict-section'
    changes.innerHTML = `<h4 class="ts-predict-h">📅 Olacaklar</h4>`
    const changeList = document.createElement('ul')
    changeList.className = 'ts-predict-list'
    changeList.innerHTML = `<li>Karakter <strong>${ctx.playerAge} → ${pred.newPlayerAge} yaş</strong></li>`
    for (const c of pred.childAges) {
      changeList.innerHTML += `<li>${c.name} <strong>${c.from} → ${c.to} yaş</strong></li>`
    }
    if (pred.childAges.length > 0) {
      changeList.innerHTML += `<li>Çocukların eğitimi ilerleyecek</li>`
    }
    changes.appendChild(changeList)
    body.appendChild(changes)

    // Para tahmini bölümü
    const money = document.createElement('div')
    money.className = 'ts-predict-section'
    money.innerHTML = `<h4 class="ts-predict-h">💰 Tahmini Para</h4>`
    const fmt = (n: number) => `${n >= 0 ? '' : '-'}${formatMoney(Math.abs(n))}`
    money.innerHTML += `
      <div class="ts-money-row"><span>Brüt gelir</span><span>${formatMoney(pred.grossIncome)}</span></div>
      <div class="ts-money-row"><span>Skip verimi (%${Math.round(opt.incomeRatio * 100)})</span><span class="ts-pos">${formatMoney(pred.netIncome)}</span></div>
      <div class="ts-money-row"><span>Giderler</span><span class="ts-neg">-${formatMoney(pred.expenses)}</span></div>
      <div class="ts-money-row"><span>Risk düzeltmesi</span><span class="ts-neg">-${formatMoney(pred.riskAdjustment)}</span></div>
      <div class="ts-money-row ts-money-final"><span>Tahmini net</span><span class="${pred.finalEstimate >= 0 ? 'ts-pos' : 'ts-neg'}">${fmt(pred.finalEstimate)}</span></div>
    `
    body.appendChild(money)

    // Riskler bölümü
    if (pred.warnings.length > 0) {
      const risks = document.createElement('div')
      risks.className = 'ts-predict-section'
      risks.innerHTML = `<h4 class="ts-predict-h ts-predict-h-warn">⚠️ Riskler</h4>`
      const rl = document.createElement('ul')
      rl.className = 'ts-predict-list ts-predict-risks'
      for (const w of pred.warnings) {
        rl.innerHTML += `<li>${w}</li>`
      }
      risks.appendChild(rl)
      body.appendChild(risks)
    }

    const continueBtn = document.createElement('button')
    continueBtn.type = 'button'
    continueBtn.className = 'btn-primary'
    continueBtn.textContent = '⏩ Devam Et'
    continueBtn.addEventListener('click', () => {
      this.modals.close()
      this.applyTimeSkip(skipId)
    })
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.textContent = 'Vazgeç'
    cancelBtn.addEventListener('click', () => this.modals.close())

    this.modals.showContent(`${opt.emoji} ${opt.label}`, body, [continueBtn, cancelBtn])
  }

  private applyTimeSkip(skipId: TimeSkipOption): void {
    const s = this.state
    const opt = TIME_SKIP_OPTIONS.find((o) => o.id === skipId)
    if (!opt) return

    const lifeMonths = this.resolveTimeSkipMonths(skipId)

    const econMs = timeSkipEconMs(lifeMonths)
    const grossIncome = s.incomePerDay() * (econMs / (12 * 1000))
    const netIncome = Math.floor(grossIncome * opt.incomeRatio)
    const expenses = Math.floor(grossIncome * opt.expenseRatio * 0.15)

    s.gameTimeMs += econMs
    const finalMoney = Math.max(0, netIncome - expenses)
    if (finalMoney > 0) s.addMoney(finalMoney, true)

    const ctx = {
      heat: s.illegalHeat,
      loan: s.bank.loan,
      totalIncome: s.incomePerDay() * 365,
      playerAge: playerGameAge(s.gameTimeMs, s.dynasty),
      stress: s.career.stress,
      hasHeir: !!s.dynasty.activeHeirId,
      hasWill: false,
      stockPortfolioValue: 0,
      reputation: s.reputation,
    }
    const risks = rollTimeSkipRisks(skipId, ctx)

    let summary = `${opt.emoji} ${opt.label} tamamlandı\n+${finalMoney.toLocaleString('tr-TR')}₺ net kazanç`
    if (risks.length > 0) {
      for (const r of risks) {
        summary += `\n${r.emoji} ${r.message}`
        if (r.id === 'raid') {
          const fine = Math.floor(s.money * 0.15)
          s.money = Math.max(0, s.money - fine)
        }
      }
    }

    this.toast(summary.split('\n')[0])
    this.renderAll()
    this.careerPanel.render()
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
    const adBtn = document.createElement('button')
    adBtn.type = 'button'
    adBtn.className = 'btn-primary offline-btn-hero'
    adBtn.dataset.action = 'ad-offline'
    adBtn.textContent = `📺 İzle & Topla — ${formatMoney(amount)}`
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'btn-secondary offline-btn-hero'
    skip.dataset.action = 'skip-offline'
    skip.textContent = 'Vazgeç'
    const body = document.createElement('div')
    body.className = 'offline-popup-body'
    body.append(hero, adBtn, skip)
    this.modals.show(
      'Tekrar hoş geldin!',
      'Birikmiş kazancını toplamak için kısa bir reklam izle.',
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
    event: { emoji: string; title: string; description: string; acceptLabel?: string },
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
    // Add accept/reject extra buttons
    const goldenModal = this.modals.getGoldenModal()
    if (goldenModal && event.acceptLabel) {
      const acceptBtn = document.createElement('button')
      acceptBtn.type = 'button'
      acceptBtn.className = 'btn-secondary golden-accept-btn'
      acceptBtn.textContent = `✅ ${event.acceptLabel}`
      acceptBtn.addEventListener('click', () => {
        if (this.state.acceptGoldenEventSmall()) {
          this.clearGoldenEventTimer()
          this.closeModalAndPump()
          this.modals.showToast(this.root, '🎁 Küçük ödül alındı — Etkinlikler\'den aktifleştir')
          this.eventsPanel.render(this.state)
          this.updateNavBadges()
        }
      })
      const rejectBtn = document.createElement('button')
      rejectBtn.type = 'button'
      rejectBtn.className = 'btn-ghost golden-reject-btn'
      rejectBtn.textContent = '❌ Reddet'
      rejectBtn.addEventListener('click', () => {
        this.state.dismissGoldenEvent()
        this.clearGoldenEventTimer()
        this.closeModalAndPump()
      })
      goldenModal.appendChild(acceptBtn)
      goldenModal.appendChild(rejectBtn)
    }
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
    const s = this.state
    const p = PRODUCERS.find((x) => x.id === id)
    if (!p) return
    const owned = s.producers[id] ?? 0
    const level = s.producerLevel(id)
    const dailyIncome = s.producerIncome(p)
    const monthlyProfit = Math.round(dailyIncome * 30)
    const city = cityDef(s.activeCityId())
    const purchased = s.firmUpgradesPurchased(id)
    const upgrades = firmUpgradesForProducer(p)
    const branches = s.franchises.filter((f) => f.producerId === id)

    const body = document.createElement('div')
    body.className = 'firm-detail'

    // ——— Hero kart ———
    const statusLabel = level >= 4 ? 'Büyüyor' : owned >= 5 ? 'Kârlı' : 'Aktif'
    const statusTone = level >= 4 ? 'growing' : 'profit'
    const hero = document.createElement('div')
    hero.className = 'firm-detail-hero'
    hero.innerHTML = `
      <div class="fd-hero-logo">${p.emoji}</div>
      <div class="fd-hero-info">
        <div class="fd-hero-name">${producerName(p)}</div>
        <div class="fd-hero-slogan">${p.description}</div>
        <div class="fd-hero-tags">
          <span class="fd-tag">⭐ Lv.${level}</span>
          <span class="fd-tag">${city.emoji} ${city.label}</span>
          <span class="status-badge ${statusTone}">${statusLabel}</span>
        </div>
      </div>
    `
    body.appendChild(hero)

    // ——— KPI ———
    const kpi = renderKpiStrip([
      { icon: '📦', label: 'Adet', value: `${owned}`, tone: 'nw' },
      { icon: '🪙', label: 'Günlük Gelir', value: formatIncomeRate(dailyIncome), tone: 'income' },
      { icon: '📅', label: 'Aylık Kâr', value: formatMoney(monthlyProfit), tone: 'cash' },
      { icon: '🏬', label: 'Şube', value: `${branches.length}`, tone: 'neutral' },
    ])
    body.appendChild(kpi)

    // ——— Gelir trendi grafiği ———
    const trendCard = document.createElement('div')
    trendCard.className = 'game-card'
    const base = Math.max(1, dailyIncome)
    const trend = Array.from({ length: 12 }, (_, i) => Math.round(base * (0.6 + 0.4 * (i / 11)) * (0.95 + 0.1 * Math.sin(i))))
    trendCard.innerHTML = `<div class="dash-card-title">📈 Gelir Trendi</div><div class="dash-chart-wrap">${lineChart(trend, { height: 90 })}</div>`
    body.appendChild(trendCard)

    // ——— Memnuniyet gauge + gider donut (2 kolon) ———
    const twoCol = document.createElement('div')
    twoCol.className = 'firm-detail-2col'
    const satisfaction = Math.min(100, 45 + level * 9 + Math.min(20, owned))
    const satCard = document.createElement('div')
    satCard.className = 'game-card'
    satCard.innerHTML = `<div class="dash-card-title">😊 Müşteri Memnuniyeti</div>${gauge(satisfaction, { size: 110, thresholds: [{ at: 40, color: 'red' }, { at: 70, color: 'gold' }, { at: 100, color: 'green' }] })}`
    const expCard = document.createElement('div')
    expCard.className = 'game-card'
    expCard.innerHTML = `<div class="dash-card-title">💸 Gider Dağılımı</div>${donutChart([
      { label: 'Personel', value: 40, color: 'blue' },
      { label: 'Kira', value: 25, color: 'orange' },
      { label: 'Tedarik', value: 22, color: 'gold' },
      { label: 'Vergi', value: 13, color: 'red' },
    ], { size: 100 })}<div class="fd-exp-legend"><span>👷 Personel %40</span><span>🏠 Kira %25</span><span>📦 Tedarik %22</span><span>🧾 Vergi %13</span></div>`
    twoCol.append(satCard, expCard)
    body.appendChild(twoCol)

    // ——— Geliştirmeler listesi ———
    const upCard = document.createElement('div')
    upCard.className = 'game-card'
    upCard.innerHTML = `<div class="dash-card-title">🛠️ Geliştirmeler</div>`
    for (const up of upgrades) {
      const isP = purchased.includes(up.id)
      const cost = s.firmUpgradeCostFor(p, up.id)
      const row = document.createElement('div')
      row.className = `fd-up-row${isP ? ' fd-up-owned' : ''}`
      row.innerHTML = `
        <span class="fd-up-icon">${up.emoji}</span>
        <div class="fd-up-body"><strong>${up.name}</strong><small>${up.description}</small></div>
        <button type="button" class="btn-primary fd-up-btn" data-action="buy-firm-upgrade" data-id="${id}:${up.id}" ${isP || !s.canAfford(cost) ? 'disabled' : ''}>${isP ? `✅ +%${Math.round(up.incomeBonus * 100)}` : `+%${Math.round(up.incomeBonus * 100)} · ${formatMoney(cost)}`}</button>
      `
      upCard.appendChild(row)
    }
    body.appendChild(upCard)

    // ——— Özet şeridi ———
    const totalInvest = Math.round(p.baseCost * owned * (1 + (level - 1) * 0.5))
    const roiDays = dailyIncome > 0 ? Math.round(totalInvest / dailyIncome) : 0
    const summary = document.createElement('div')
    summary.className = 'firm-detail-summary'
    summary.innerHTML = `
      <div class="fd-sum"><span>Toplam Yatırım</span><strong>${formatMoney(totalInvest)}</strong></div>
      <div class="fd-sum"><span>Geri Dönüş</span><strong>${roiDays} gün</strong></div>
      <div class="fd-sum"><span>Seviye Çarpanı</span><strong>x${firmLevelIncomeMult(level).toFixed(2)}</strong></div>
      <div class="fd-sum"><span>Şube</span><strong>${branches.length}</strong></div>
    `
    body.appendChild(summary)

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'btn-secondary'
    closeBtn.textContent = 'Kapat'
    closeBtn.addEventListener('click', () => this.closeModalAndPump())
    this.modals.showContent(`${p.emoji} ${producerName(p)}`, body, [closeBtn])
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
      const oldMult = prestigeMultiplier(this.state.prestigePoints)
      const citiesBefore = this.state.cities.unlocked.length
      const points = this.state.doPrestige()
      if (points > 0) {
        await this.ads.showInterstitial()
        const newMult = prestigeMultiplier(this.state.prestigePoints)
        const newCity = this.state.cities.unlocked.length > citiesBefore
          ? cityDef(this.state.cities.unlocked[this.state.cities.unlocked.length - 1]!).label
          : null
        void hapticIpo()
        // IPO kutlama sineması (Section 13)
        this.ipoCelebration.show({
          playerName: this.state.playerName,
          ipoNumber: this.state.ipoCount,
          pointsEarned: points,
          oldMultiplier: oldMult,
          newMultiplier: newMult,
          startingCash: preview.startingCash,
          unlockedCity: newCity,
          reputation: this.state.reputation,
        }, () => {
          this.shop.setIpoSubTab('stock')
          this.refreshShop(true)
          this.renderAll()
        })
      }
    }, { ipoCount: this.state.ipoCount, reputation: this.state.reputation, illegalHeat: this.state.illegalHeat })
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
    if (!this.runWhenMetaReady('daily-reward', () => this.showDailyRewardIfAvailable())) return
    if (!this.state.canShowDailyRewardPrompt()) return
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
    this.syncFlowClasses()
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
    this.renderBaronAdvisor()
    this.renderAbilityBar()
  }

  private renderBaronAdvisor(): void {
    this.baronAdvisor.render(this.state)
  }

  private renderAbilityBar(): void {
    const bar = document.getElementById('ability-bar')
    if (!bar) return
    bar.replaceChildren()

    const abilities = [
      { id: 'click_burst', icon: '💥', label: 'Tıklama Patlaması', cooldownMs: 300_000, action: 'ability-click-burst' },
      { id: 'tax_break', icon: '🧾', label: 'Vergi Tatili', cooldownMs: 480_000, action: 'ability-tax-break' },
      { id: 'market_signal', icon: '📈', label: 'Borsa Sinyali', cooldownMs: 600_000, action: 'ability-market-signal' },
      { id: 'worker_boost', icon: '⚡', label: 'Çalışan Mot.', cooldownMs: 360_000, action: 'ability-worker-boost' },
      { id: 'press_release', icon: '📰', label: 'Basın Açıklaması', cooldownMs: 1_200_000, action: 'ability-press-release' },
    ]

    for (const ability of abilities) {
      const remaining = this.state.abilityRemainingMs(ability.id)
      const onCooldown = remaining > 0
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ability-btn${onCooldown ? ' on-cooldown' : ''}`
      btn.dataset.action = ability.action
      if (onCooldown) btn.disabled = true

      const iconEl = document.createElement('span')
      iconEl.className = 'ability-btn-icon'
      iconEl.textContent = ability.icon

      const labelEl = document.createElement('span')
      labelEl.className = 'ability-btn-label'
      labelEl.textContent = ability.label

      const cdEl = document.createElement('span')
      cdEl.className = 'ability-btn-cd'
      if (onCooldown) {
        const mins = Math.ceil(remaining / 60_000)
        cdEl.textContent = `${mins}d`
      } else {
        cdEl.textContent = 'Hazır'
      }

      btn.append(iconEl, labelEl, cdEl)
      bar.appendChild(btn)
    }
  }

  private triggerCrashFlash(): void {
    const flash = document.createElement('div')
    flash.className = 'crash-flash-overlay'
    document.body.appendChild(flash)
    window.setTimeout(() => flash.remove(), 800)
  }

  private triggerCityUnlockCelebration(cityName: string): void {
    const banner = document.createElement('div')
    banner.className = 'city-unlock-banner'
    banner.innerHTML = `<span class="city-unlock-emoji">🗺️</span><span class="city-unlock-text">${cityName} açıldı!</span><span class="city-unlock-sub">Yeni işletmeler ve bonuslar seni bekliyor</span>`
    document.body.appendChild(banner)
    window.setTimeout(() => banner.remove(), 3000)
  }

  private showRivalEventModal(event: RivalEvent): void {
    const fmtShort = (n: number) => {
      if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
      if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
      return `${Math.round(n)}`
    }

    const dmg = [
      event.reputationDamage > 0 ? `İtibar: -${event.reputationDamage}` : '',
      event.moneyDamage > 0 ? `Para: -₺${fmtShort(event.moneyDamage)}` : '',
    ].filter(Boolean).join(' · ')

    const body = `${event.description}${dmg ? `\n\n⚠️ ${dmg}` : ''}`

    const buttons = event.responses.map((r) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-secondary rival-response-btn'
      btn.dataset.action = 'rival-respond'
      btn.dataset.id = event.id
      btn.dataset.count = r.id
      const cost = r.cost > 0 ? ` · ₺${fmtShort(r.cost)}` : ''
      const rep = r.reputationDelta !== 0 ? ` · İtibar ${r.reputationDelta > 0 ? '+' : ''}${r.reputationDelta}` : ''
      btn.textContent = `${r.emoji} ${r.label}${cost}${rep}`
      return btn
    })

    this.eventDirector.enqueue({
      id: `rival-event-${event.id}`,
      priority: 3,
      run: () => this.modals.show(`⚔️ ${event.headline}`, body, buttons),
    })
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
