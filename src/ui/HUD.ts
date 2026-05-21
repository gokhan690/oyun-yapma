import type { GameState } from '../game/GameState'
import type { AdManager } from '../ads/AdManager'
import type { SoundManager } from '../audio/SoundManager'
import type { SaveManager } from '../security/SaveManager'
import { formatMoney, PRODUCERS } from '../game/Economy'
import { assetUrl, playerAge } from '../utils/assetUrl'
import { currentRank, rankProgress } from '../game/PlayerRank'
import { dayBonusExtra, nightBonusExtra } from '../game/PrestigeTree'
import { calcPrestigePoints, prestigeMultiplier } from '../game/Prestige'
import { StatsBar } from './components/StatsBar'
import { ShopPanel } from './components/ShopPanel'
import { ModalManager } from './components/ModalManager'
import { SettingsPanel } from './components/SettingsPanel'
import { StatsScreen } from './components/StatsScreen'
import { Tutorial } from './Tutorial'
import { Skyline } from './Skyline'
import { ParticleSystem } from '../effects/ParticleSystem'
import { Leaderboard } from '../game/Leaderboard'
import { BottomNav, type NavView } from './components/BottomNav'
import { GoalsSheet } from './components/GoalsSheet'
import { EventsPanel } from './components/EventsPanel'
import { UndergroundSheet } from './components/UndergroundSheet'
import { OwnerPanel } from './components/OwnerPanel'
import { applyDocumentTheme } from '../utils/themeApply'
import type { ThemeId } from '../game/Themes'
import { isOwnerSession } from '../owner/OwnerAuth'
import { OwnerAccessGate } from '../owner/OwnerAccessGate'
import { formatGameClock } from '../game/GameClock'
import { activeTicker } from '../game/StockMarket'
import { hapticLight, hapticHeavy } from '../utils/haptics'

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
  private profileChip!: HTMLButtonElement
  private heatMeterFill!: HTMLElement
  private heatMeterLabel!: HTMLElement
  private heatMeterRow!: HTMLElement
  private weeklyBanner!: HTMLElement
  private goalsChip!: HTMLButtonElement
  private dayNightChip!: HTMLElement
  private earnView!: HTMLElement
  private gameMain!: HTMLElement
  private bottomNav: BottomNav
  private goalsSheet: GoalsSheet
  private eventsPanel: EventsPanel
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
    this.undergroundSheet = new UndergroundSheet()
    this.ownerPanel = new OwnerPanel(state, saveManager, () => this.renderAll())
    this.leaderboard = new Leaderboard()
    this.settings = new SettingsPanel(state, sound, saveManager, () => {
      this.tutorial.restart()
    }, () => this.renderAll(), (themeId) => {
      applyDocumentTheme(themeId)
    })
    this.statsScreen = new StatsScreen(state, this.leaderboard)
    this.tutorial = new Tutorial(state)
    this.tutorial.setTabHandler((tab) => this.shop.setTab(tab))
    this.build()
    this.skyline = new Skyline(this.tapArea.parentElement!)
    this.particles = new ParticleSystem(this.tapArea.parentElement!)
    this.bindEvents()
    this.renderAll()
    this.updateNavBadges()
    this.setView('earn')
    if (this.tutorial.shouldShow()) {
      window.setTimeout(() => this.tutorial.start(), 600)
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
    this.profileChip.addEventListener('pointerdown', startProfileHold)
    this.profileChip.addEventListener('pointerup', cancelProfileHold)
    this.profileChip.addEventListener('pointerleave', cancelProfileHold)
    this.profileChip.addEventListener('pointercancel', cancelProfileHold)

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
    title.textContent = 'İş İmparatorluğu'
    this.titleEl = title
    const actions = document.createElement('div')
    actions.className = 'header-actions'

    this.goalsChip = document.createElement('button')
    this.goalsChip.type = 'button'
    this.goalsChip.className = 'goals-chip'
    this.goalsChip.dataset.action = 'open-goals'
    this.goalsChip.textContent = '🎯 Hedefler'

    this.dayNightChip = document.createElement('span')
    this.dayNightChip.className = 'day-night-chip'

    const dailyBtn = document.createElement('button')
    dailyBtn.type = 'button'
    dailyBtn.className = 'btn-daily'
    dailyBtn.dataset.action = 'daily'
    dailyBtn.textContent = '🎁'
    actions.append(this.goalsChip, this.dayNightChip, dailyBtn)
    titleRow.append(title, actions)
    this.profileChip = document.createElement('button')
    this.profileChip.type = 'button'
    this.profileChip.className = 'profile-chip'
    this.profileChip.dataset.action = 'nav-view'
    this.profileChip.dataset.id = 'profile'
    header.append(titleRow, this.profileChip, this.statsBar.root)

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
    tapLabel.textContent = 'KAZAN'
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

    tapWrap.append(this.tapArea, this.floatLayer, comboWrap)

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
    clickLabel.textContent = 'Tıklama'
    this.sessionClickIncome = document.createElement('strong')
    this.sessionClickIncome.className = 'session-value'
    clickBlock.append(clickLabel, this.sessionClickIncome)
    const comboBlock = document.createElement('div')
    comboBlock.className = 'session-stat'
    const comboLabel = document.createElement('span')
    comboLabel.className = 'session-label'
    comboLabel.textContent = 'Combo'
    this.sessionComboMult = document.createElement('strong')
    this.sessionComboMult.className = 'session-value session-combo'
    comboBlock.append(comboLabel, this.sessionComboMult)
    const passiveBlock = document.createElement('div')
    passiveBlock.className = 'session-stat session-stat-wide'
    const passiveLabel = document.createElement('span')
    passiveLabel.className = 'session-label'
    passiveLabel.textContent = 'Pasif gelir'
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
    heatLabel.textContent = '🕶️ Radar'
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
    heatCleanBtn.textContent = 'Temizle'
    heatRow.appendChild(heatCleanBtn)
    sessionPanel.appendChild(heatRow)

    const adsPanel = document.createElement('div')
    adsPanel.className = 'quick-ads collapsible-boosts'
    const adDouble = document.createElement('button')
    adDouble.type = 'button'
    adDouble.className = 'quick-ad-card'
    adDouble.dataset.action = 'ad-double'
    adDouble.innerHTML = '<span class="quick-ad-icon">📺</span><span class="quick-ad-text"><strong>2x Gelir</strong><small>30 sn reklam izle</small></span>'
    const adChest = document.createElement('button')
    adChest.type = 'button'
    adChest.className = 'quick-ad-card'
    adChest.dataset.action = 'ad-chest'
    adChest.innerHTML = '<span class="quick-ad-icon">🎁</span><span class="quick-ad-text"><strong>Sandık</strong><small>Rastgele ödül kazan</small></span>'
    adsPanel.append(adDouble, adChest)

    this.earnView.append(this.weeklyBanner, progressStrip, sessionPanel, tapWrap, adsPanel)
    main.append(this.earnView, this.shop.root, this.eventsPanel.root)

    this.adBannerSlot = document.createElement('div')
    this.adBannerSlot.className = 'ad-banner-slot'
    this.adBannerSlot.id = 'ad-banner'

    this.goalsSheet.mount(this.root)
    this.undergroundSheet.mount(this.root)
    this.root.append(header, main, this.adBannerSlot, this.settings.layer, this.statsScreen.layer, this.modals.layer)
    document.body.appendChild(this.bottomNav.root)
    this.ads.showBanner(this.adBannerSlot)
    this.renderDayNightChip()
    this.renderProgressStrip()
    this.lastRankId = currentRank(this.state.totalEarned).id
  }

  private setView(view: NavView): void {
    this.goalsSheet.close()
    this.modals.close()
    this.bottomNav.setActive(view)
    this.earnView.hidden = view === 'shop' || view === 'events'
    this.shop.root.hidden = view !== 'shop'
    this.eventsPanel.root.hidden = view !== 'events'
    this.gameMain.classList.toggle('shop-scroll-lock', view === 'shop')
    if (view === 'shop') this.refreshShop(true)
    if (view === 'events') this.eventsPanel.render(this.state)
    if (view === 'profile') {
      this.statsScreen.show()
      this.settings.hide()
    } else {
      this.statsScreen.hide()
      this.settings.hide()
    }
  }

  private updateNavBadges(): void {
    const target = this.state.dailyGoalTarget()
    const dailyGoalReady = this.state.dailyGoalEarned >= target && !this.state.dailyGoalClaimed
    this.bottomNav.setBadges(
      this.state.hasClaimableSeasonReward()
        || (this.state.weekly.progress >= this.state.weekly.target && !this.state.weekly.claimed)
        || dailyGoalReady
        || this.state.canClaimDaily(),
      this.shop.hasShopBadge(this.state),
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
    if (this.state.isNight) {
      this.dayNightChip.textContent = `🌙 ${clock} · Pasif +${Math.round((0.15 + nightBonusExtra(this.state.prestigeTree)) * 100)}%`
    } else {
      this.dayNightChip.textContent = `☀️ ${clock} · Tık +${Math.round((0.1 + dayBonusExtra(this.state.prestigeTree)) * 100)}%`
    }
  }

  private bindEvents(): void {
    this.tapArea.addEventListener('click', (e) => {
      this.sound.resume()
      void hapticLight()
      this.tapArea.classList.remove('tap-ripple')
      void this.tapArea.offsetWidth
      this.tapArea.classList.add('tap-ripple')
      window.setTimeout(() => this.tapArea.classList.remove('tap-ripple'), 450)
      const rect = this.tapArea.getBoundingClientRect()
      this.state.click(e.clientX - rect.left, e.clientY - rect.top)
    })

    const onActionClick = (e: Event): void => {
      const target = e.target as HTMLElement
      if (target.closest('.owner-pin-input, .owner-login-card, .owner-panel-body input, .owner-panel-body textarea, .owner-panel-body form')) return
      const el = target.closest('[data-action]') as HTMLElement | null
      if (!el?.dataset.action) return
      if (el instanceof HTMLButtonElement && el.disabled) return
      e.preventDefault()
      void this.handleAction(el.dataset.action, el.dataset.id, el.dataset.count)
    }
    this.root.addEventListener('click', onActionClick)
    this.bottomNav.root.addEventListener('click', onActionClick)
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
        this.statsBar.render(true)
        if (this.bottomNav.getActive() === 'shop' && this.shop.getActiveTab() === 'growth') {
          this.shop.patchAffordability(this.state)
        } else if (this.bottomNav.getActive() === 'shop') {
          this.refreshShop(false)
        }
        this.scheduleUiSync()
        this.renderProgressStrip()
        this.checkRankUp()
        this.root.classList.add('money-pulse')
        window.setTimeout(() => this.root.classList.remove('money-pulse'), 280)
      }
      if (ev.type === 'illegal_raid') {
        const p = PRODUCERS.find((x) => x.id === ev.producerId)
        this.modals.showToast(this.root, `🚨 Baskın! ${p?.name ?? 'Illegal iş'} — ${formatMoney(ev.fine)} ceza`)
        this.renderHeatMeter()
        this.renderAll()
      }
      if (ev.type === 'illegal_heat') {
        this.renderHeatMeter()
        if (this.bottomNav.getActive() === 'shop') {
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
      if (ev.type === 'stock_tick' && this.shop.getActiveTab() === 'ipo') {
        this.shop.render(this.state, true)
      }
      if (ev.type === 'click') {
        this.sound.playClick(ev.critical)
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
        this.spawnFloat(ev.amount, ev.x, ev.y, ev.critical)
      }
      if (ev.type === 'combo_changed') this.renderCombo(ev.combo, ev.multiplier)
      if (ev.type === 'purchase' || ev.type === 'manager_hired' || ev.type === 'auto_buy') {
        this.sound.playPurchase()
        this.particles.spawnPurchasePulse()
        if (ev.type === 'purchase') {
          this.particles.spawnMoneyToHeader()
        }
        this.refreshShop(true)
        this.skyline.update(this.state.ownedBusinessTiers(), this.state.gameTimeMs)
      }
      if (ev.type === 'prestige') {
        this.sound.playPrestige()
        void hapticHeavy()
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
      if (ev.type === 'golden_event') {
        this.sound.playEvent()
        this.showGoldenEventModal(ev.event, ev.expiresAt)
      }
      if (ev.type === 'event_missed') {
        this.clearGoldenEventTimer()
        this.showMissedEventOffer(ev.event)
      }
      if (ev.type === 'event_claimed') {
        this.clearGoldenEventTimer()
        this.modals.close()
        this.modals.showToast(this.root, `${ev.event.title} — +${formatMoney(ev.reward)}`)
      }
      if (ev.type === 'daily_goal_updated') {
        this.goalsSheet.render(this.state)
      }
      if (ev.type === 'day_night' || ev.type === 'game_time') {
        this.renderDayNightChip()
        this.renderMarketNewsBanner()
      }
      if (ev.type === 'market_news') {
        this.renderMarketNewsBanner()
      }
      if (ev.type === 'dynasty_update') {
        if (this.bottomNav.getActive() === 'profile') this.statsScreen.render()
        this.renderProfileChip()
      }
      if (ev.type === 'season_updated' || ev.type === 'season_claimed') {
        this.eventsPanel.render(this.state)
        this.updateNavBadges()
      }
      if (ev.type === 'prestige_tree') {
        this.refreshShop(true)
        this.renderDayNightChip()
      }
      if (ev.type === 'market_event') {
        this.modals.showToast(this.root, ev.crash ? '📉 Piyasa çöküşü!' : '📈 Piyasa rallisi!')
        this.refreshShop(true)
      }
      if (ev.type === 'mission_complete') {
        this.modals.showToast(this.root, `Görev: ${ev.mission.label}`)
        this.refreshShop(true)
      }
      if (ev.type === 'weekly_updated') {
        this.goalsSheet.render(this.state)
        this.renderWeeklyBanner()
        this.updateNavBadges()
      }
      if (ev.type === 'story_beat') {
        this.modals.showToast(this.root, ev.text)
      }
      if (ev.type === 'near_miss') {
        this.modals.showToast(this.root, ev.message)
      }
      if (ev.type === 'surprise_investor') {
        this.modals.showToast(this.root, '💎 Sürpriz yatırımcı — 30 sn x2 gelir!')
        this.eventsPanel.render(this.state)
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
        if (this.bottomNav.getActive() === 'profile') this.statsScreen.render()
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
      if (ev.type === 'ad_boost') this.statsBar.render()
      if (ev.type === 'research_purchased') {
        this.sound.playPurchase()
        this.refreshShop(true)
      }
    })
  }

  private refreshShop(force: boolean): void {
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
    const pct = Math.min(100, (w.progress / w.target) * 100)
    this.weeklyBanner.replaceChildren()
    this.weeklyBanner.hidden = false
    const text = document.createElement('span')
    text.textContent = `🗓️ ${def.name}: ${Math.floor(w.progress)}/${w.target}`
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
      btn.textContent = 'Topla'
      this.weeklyBanner.appendChild(btn)
    }
  }

  private showMilestone(amount: number): void {
    this.particles.spawnConfetti()
    const overlay = document.createElement('div')
    overlay.className = 'milestone-overlay'
    overlay.textContent = `Kilometre Taşı: ${formatMoney(amount)}! 🎉`
    this.root.appendChild(overlay)
    window.setTimeout(() => overlay.remove(), 2200)
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
      case 'nav-view':
        if (id === 'profile' && this.suppressProfileNav) break
        if (id) this.setView(id as NavView)
        break
      case 'open-stats':
        this.setView('profile')
        break
      case 'open-settings':
        this.settings.show()
        this.statsScreen.hide()
        break
      case 'close-settings':
        this.settings.hide()
        if (this.bottomNav.getActive() === 'profile') {
          this.statsScreen.show()
        } else {
          this.setView('earn')
        }
        break
      case 'close-stats':
        this.setView('earn')
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
        const preview = Math.max(100 * nextStreak, this.state.incomePerSecond() * 60 * nextStreak)
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
      case 'skip-comeback':
        this.state.discardComeback()
        this.modals.close()
        break
      case 'early-unlock':
        if (id && this.state.earlyUnlockProducer(id)) {
          this.refreshShop(true)
        } else if (id) {
          this.modals.showToast(this.root, 'Erken açmak için yeterli para yok')
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
        if (nameInput?.value.trim()) this.state.playerName = nameInput.value.trim().slice(0, 24)
        if (yearInput?.value) {
          const y = Number(yearInput.value)
          if (y >= 1920 && y <= new Date().getFullYear()) this.state.birthYear = y
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
          const mode = this.shop.getBuyMode()
          if (mode === 'max') {
            this.state.buyMaxProducer(id)
          } else {
            this.state.buyProducer(id, Number(count ?? 1))
          }
          this.shop.flashCard(id)
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
        }
        break
      }
      case 'close-modal':
        this.modals.close()
        break
      case 'shop-tab':
        if (id) {
          this.shop.setTab(id)
          this.refreshShop(true)
        }
        break
      case 'shop-sub-tab':
        if (id === 'businesses' || id === 'management') this.shop.setGrowthSub(id)
        else if (id === 'upgrades' || id === 'research') this.shop.setPowerupSub(id)
        this.refreshShop(true)
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
        if (kind === 'business') ok = this.state.buyProducer(recId, 1)
        else if (kind === 'upgrade') ok = this.state.buyUpgrade(recId)
        else if (kind === 'manager') ok = this.state.hireManager(recId)
        if (ok) {
          this.state.incrementAdvisorBuy()
          this.renderAll()
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
        this.bottomNav.setActive('shop')
        this.setView('shop')
        this.shop.goToFinanceStock(ticker ?? undefined)
        this.refreshShop(true)
        break
      }
      case 'ipo-sub-tab':
        if (id) {
          this.shop.setIpoSubTab(id as 'stock' | 'prestige' | 'ipo')
          this.refreshShop(true)
        }
        break
      case 'upgrade-filter':
        if (id) {
          this.shop.setUpgradeFilter(id as 'all' | 'click' | 'global' | 'producer')
          this.refreshShop(true)
        }
        break
      case 'buy-mode':
        if (count === 'max') this.shop.setBuyMode('max')
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
      case 'buy-tree-node':
        if (id) this.state.buyPrestigeTreeNode(id)
        break
      case 'toggle-autobuy':
        if (id) {
          this.state.toggleManagerAutoBuy(id)
          this.refreshShop(true)
        }
        break
      case 'claim-season':
        if (id) {
          this.state.claimSeasonTier(Number(id))
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
      case 'claim-weekly':
        this.state.claimWeeklyReward()
        this.goalsSheet.render(this.state)
        this.eventsPanel.render(this.state)
        this.updateNavBadges()
        break
      case 'ad-weekly':
        await this.handleAdWeekly()
        break
      case 'claim-mission':
        if (id) {
          this.state.claimMission(id)
          this.renderAll()
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
        this.state.claimMission(id, true)
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
        this.modals.close()
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
          this.renderProfileChip()
          this.renderAll()
        } else {
          this.modals.showToast(this.root, 'Evlenilemedi — yeterli para yok veya zaten evlisin.')
        }
        break
      case 'dynasty-succession':
        if (id && this.state.successionToChild(id)) {
          this.modals.showToast(this.root, `👑 ${this.state.playerName} imparatorluğu devraldı!`)
          this.statsScreen.render()
          this.renderProfileChip()
          this.renderAll()
        }
        break
      case 'dynasty-succession-open':
        this.modals.showToast(this.root, 'Bir çocuğun altındaki Devral\'a bas.')
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
      this.rankProgressLabel.textContent = `Rütbe → ${prog.next.emoji} ${prog.next.name}`
      this.rankProgressFill.style.width = `${prog.pct}%`
    } else {
      this.rankProgressLabel.textContent = 'Maksimum rütbe!'
      this.rankProgressFill.style.width = '100%'
    }

    const nextBiz = PRODUCERS.find((p) => this.state.totalEarned < p.unlockAt)
    if (nextBiz) {
      const pct = nextBiz.unlockAt > 0
        ? Math.min(100, (this.state.totalEarned / nextBiz.unlockAt) * 100)
        : 0
      this.unlockProgressLabel.textContent = `İşletme → ${nextBiz.emoji} ${nextBiz.name}`
      this.unlockProgressFill.style.width = `${pct}%`
      this.nextBizPreview.innerHTML = `<span class="next-biz-emoji">${nextBiz.emoji}</span><span class="next-biz-name">${nextBiz.name}</span><span class="next-biz-pct">${Math.floor(pct)}%</span>`
      this.nextBizPreview.hidden = false
    } else {
      this.unlockProgressLabel.textContent = 'Tüm işletmeler açık'
      this.unlockProgressFill.style.width = '100%'
      this.nextBizPreview.hidden = true
    }

    this.renderSessionPanel()
    this.renderProfileChip()
    this.renderHeatMeter()
  }

  private renderProfileChip(): void {
    const name = this.state.playerName.trim() || 'Baron'
    const age = playerAge(this.state.birthYear)
    const ageText = age !== null ? `${age} yaş` : 'Profil'
    this.profileChip.innerHTML = `<span class="profile-chip-name">${name}</span><span class="profile-chip-age">${ageText}</span>`
    this.profileChip.title = 'Profil ve istatistikler'
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
    const clickIncome = this.state.clickMultiplier()
    const comboMult = this.state.comboMultiplier
    const passive = this.state.incomePerSecond()
    this.sessionClickIncome.textContent = formatMoney(clickIncome)
    this.sessionComboMult.textContent = `${comboMult.toFixed(1)}x`
    this.sessionPassiveIncome.textContent = `${formatMoney(passive)}/sn`
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

  private spawnFloat(amount: number, x: number, y: number, critical: boolean): void {
    const el = document.createElement('span')
    el.className = `float-text${critical ? ' critical' : ''}`
    el.textContent = `+${formatMoney(amount)}`
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    this.floatLayer.appendChild(el)
    window.setTimeout(() => el.remove(), 900)
  }

  showCorruptedSaveNotice(): void {
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-primary'
    close.dataset.action = 'close-modal'
    close.textContent = 'Tamam'
    this.modals.show('Kayıt Hatası', 'Kayıt dosyası bozulmuş, yeni oyun başlatıldı.', [close])
  }

  showOfflinePopup(amount: number): void {
    this.pendingOffline = amount
    const hero = document.createElement('div')
    hero.className = 'offline-popup-hero'
    hero.innerHTML = `<span class="offline-popup-label">Birikmiş kazanç</span><strong class="offline-popup-amount">${formatMoney(amount)}</strong>`
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
  }

  private showGoldenEventModal(
    event: { emoji: string; title: string; description: string },
    expiresAt: number,
  ): void {
    this.clearGoldenEventTimer()
    this.goldenEventExpiresAt = expiresAt
    this.modals.openGoldenEvent(event.emoji, event.title, event.description, () => {
      if (this.state.claimGoldenEvent()) {
        this.clearGoldenEventTimer()
      }
    })
    const tick = (): void => {
      if (!this.modals.hasGoldenEventOpen()) {
        this.clearGoldenEventTimer()
        return
      }
      const left = Math.ceil((this.goldenEventExpiresAt - Date.now()) / 1000)
      if (left <= 0) {
        this.clearGoldenEventTimer()
        this.modals.close()
        return
      }
      this.modals.updateGoldenEventTimer(left)
    }
    tick()
    this.eventTimerInterval = window.setInterval(tick, 500)
  }

  private showBusinessDetail(id: string): void {
    const detail = this.state.getProducerBreakdown(id)
    if (!detail) return
    const rows = [
      { label: 'Adet', value: String(detail.owned) },
      { label: 'Birim gelir', value: `${formatMoney(detail.basePerUnit)}/sn` },
      ...detail.lines,
      { label: 'Toplam', value: `${formatMoney(detail.totalPerSec)}/sn` },
    ]
    this.modals.showDetail(`${detail.name} — Gelir Dökümü`, rows, 'Kapat butonuna bas.')
  }

  private showMissedEventOffer(event: { title: string }): void {
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
    this.modals.show('Fırsat Kaçtı!', `${event.title} kaçırıldı.`, [ad, close])
  }

  private showIpoAnimation(points: number): void {
    const overlay = document.createElement('div')
    overlay.className = 'ipo-overlay'
    overlay.textContent = `IPO! +${points} Hisse 📈`
    this.root.appendChild(overlay)
    window.setTimeout(() => overlay.remove(), 2500)
  }

  private async handleIpo(): Promise<void> {
    if (!this.state.prestigeEligible()) return
    const pending = calcPrestigePoints(this.state.totalEarned)
    const newTotal = this.state.prestigePoints + pending
    const newMult = prestigeMultiplier(newTotal)
    this.modals.showIpoPreview(pending, newTotal, newMult, async () => {
      this.modals.close()
      const points = this.state.doPrestige()
      if (points > 0) {
        await this.ads.showInterstitial()
        this.modals.showToast(this.root, `IPO! +${points} hisse`)
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
    let amount = this.state.openLuckyChest()
    if (amount <= 0) {
      amount = Math.max(500, this.state.incomePerSecond() * 120)
      this.state.addMoney(amount)
    }
    this.sound.playReward()
    this.modals.showToast(this.root, `Sandık: +${formatMoney(amount)}`)
    this.renderAll()
  }

  private async handleAdOffline(multiplier = 1): Promise<void> {
    if (this.pendingOffline <= 0 && this.state.pendingOfflineEarnings <= 0) {
      this.modals.close()
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
    this.modals.close()
    this.modals.showToast(this.root, `Offline: +${formatMoney(amount)}`)
    this.statsBar.render()
    this.renderAll()
  }

  private async handleAdComeback(multiplier = 1): Promise<void> {
    if (!this.state.hasPendingComeback()) {
      this.modals.close()
      return
    }
    const result = await this.ads.showRewarded('offline_bonus')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    const amount = this.state.claimComebackViaAd(multiplier)
    this.modals.close()
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
    if (!this.state.canClaimDaily()) return
    const streakLost = this.state.peekDailyStreakReset()
    const nextStreak = this.state.dailyLastClaim && !streakLost
      ? this.state.dailyStreak + 1
      : 1
    const preview = Math.max(100 * nextStreak, this.state.incomePerSecond() * 60 * nextStreak)
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
  }

  showComebackPopup(): void {
    if (!this.state.hasPendingComeback()) return
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

  renderAll(): void {
    applyDocumentTheme(this.state.activeTheme)
    this.root.classList.toggle('owner-session-active', isOwnerSession())
    this.statsBar.render()
    this.refreshShop(true)
    this.skyline.update(this.state.ownedBusinessTiers())
    this.goalsSheet.render(this.state)
    this.eventsPanel.render(this.state)
    this.renderMarketNewsBanner()
    this.renderDayNightChip()
    this.renderProgressStrip()
    this.updateNavBadges()
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
