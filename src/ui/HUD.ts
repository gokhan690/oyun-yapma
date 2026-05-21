import type { GameState } from '../game/GameState'
import type { AdManager } from '../ads/AdManager'
import type { SoundManager } from '../audio/SoundManager'
import type { SaveManager } from '../security/SaveManager'
import { formatMoney } from '../game/Economy'
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
import { activeTicker } from '../game/StockMarket'
import { hapticLight, hapticHeavy } from '../utils/haptics'

export class HUD {
  private root: HTMLElement
  private tapArea!: HTMLButtonElement
  private floatLayer!: HTMLElement
  private comboFill!: HTMLElement
  private comboLabel!: HTMLElement
  private weeklyBanner!: HTMLElement
  private goalsChip!: HTMLButtonElement
  private dayNightChip!: HTMLElement
  private earnView!: HTMLElement
  private bottomNav: BottomNav
  private goalsSheet: GoalsSheet
  private eventsPanel: EventsPanel
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
  private state: GameState
  private ads: AdManager
  private sound: SoundManager
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
    this.root = app
    this.modals = new ModalManager()
    this.statsBar = new StatsBar(state)
    this.shop = new ShopPanel()
    this.bottomNav = new BottomNav()
    this.goalsSheet = new GoalsSheet()
    this.eventsPanel = new EventsPanel()
    this.leaderboard = new Leaderboard()
    this.settings = new SettingsPanel(state, sound, saveManager, () => {
      this.tutorial.restart()
    }, () => this.renderAll())
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
    header.append(titleRow, this.statsBar.root)

    const main = document.createElement('main')
    main.className = 'game-main'

    this.earnView = document.createElement('div')
    this.earnView.className = 'earn-view'

    const tapWrap = document.createElement('div')
    tapWrap.className = 'tap-wrap'

    this.tapArea = document.createElement('button')
    this.tapArea.type = 'button'
    this.tapArea.className = 'tap-area'
    this.tapArea.setAttribute('aria-label', 'Kazanç için tıkla')
    const tapInner = document.createElement('div')
    tapInner.className = 'tap-inner'
    const mascot = document.createElement('img')
    mascot.className = 'tap-mascot'
    mascot.src = '/assets/mascot.svg'
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
    this.comboLabel = document.createElement('span')
    this.comboLabel.className = 'combo-label'
    this.comboLabel.textContent = 'Combo x1'
    const comboTrack = document.createElement('div')
    comboTrack.className = 'combo-track'
    this.comboFill = document.createElement('div')
    this.comboFill.className = 'combo-fill'
    comboTrack.appendChild(this.comboFill)
    comboWrap.append(this.comboLabel, comboTrack)

    tapWrap.append(this.tapArea, this.floatLayer, comboWrap)

    const adsPanel = document.createElement('div')
    adsPanel.className = 'quick-ads collapsible-boosts'
    const adDouble = document.createElement('button')
    adDouble.type = 'button'
    adDouble.className = 'btn-ad-sm'
    adDouble.dataset.action = 'ad-double'
    adDouble.textContent = '📺 2x'
    const adChest = document.createElement('button')
    adChest.type = 'button'
    adChest.className = 'btn-ad-sm'
    adChest.dataset.action = 'ad-chest'
    adChest.textContent = '🎁 Sandık'
    adsPanel.append(adDouble, adChest)

    this.earnView.append(tapWrap, adsPanel)
    main.append(this.earnView, this.shop.root, this.eventsPanel.root)

    this.adBannerSlot = document.createElement('div')
    this.adBannerSlot.className = 'ad-banner-slot'
    this.adBannerSlot.id = 'ad-banner'

    this.goalsSheet.mount(this.root)
    this.root.append(header, main, this.bottomNav.root, this.adBannerSlot, this.settings.layer, this.statsScreen.layer, this.modals.layer)
    this.ads.showBanner(this.adBannerSlot)
    this.renderDayNightChip()
  }

  private setView(view: NavView): void {
    this.goalsSheet.close()
    this.modals.close()
    this.bottomNav.setActive(view)
    this.earnView.hidden = view !== 'earn'
    this.shop.root.hidden = view !== 'shop'
    this.eventsPanel.root.hidden = view !== 'events'
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
    this.bottomNav.setBadges(
      this.state.hasClaimableSeasonReward() || (this.state.weekly.progress >= this.state.weekly.target && !this.state.weekly.claimed),
      this.shop.hasShopBadge(this.state),
    )
  }

  private renderDayNightChip(): void {
    if (this.state.isNight) {
      this.dayNightChip.textContent = `🌙 Pasif +${Math.round((0.15 + nightBonusExtra(this.state.prestigeTree)) * 100)}%`
    } else {
      this.dayNightChip.textContent = `☀️ Tıklama +${Math.round((0.1 + dayBonusExtra(this.state.prestigeTree)) * 100)}%`
    }
  }

  private bindEvents(): void {
    this.tapArea.addEventListener('click', (e) => {
      this.sound.resume()
      void hapticLight()
      const rect = this.tapArea.getBoundingClientRect()
      this.state.click(e.clientX - rect.left, e.clientY - rect.top)
    })

    const onActionClick = (e: Event): void => {
      const target = e.target as HTMLElement
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

    this.settings.layer.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null
      if (el?.dataset.action === 'close-settings') this.settings.hide()
    })
    this.statsScreen.layer.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null
      if (el?.dataset.action === 'close-stats') this.statsScreen.hide()
    })

    this.unsub = this.state.subscribe((ev) => {
      if (ev.type === 'money_changed') {
        this.statsBar.render(true)
        if (this.bottomNav.getActive() === 'shop' && this.shop.getActiveTab() === 'businesses') {
          this.shop.patchAffordability(this.state)
        } else if (this.bottomNav.getActive() === 'shop') {
          this.refreshShop(false)
        }
        this.shop.updateTabBadges(this.state)
        this.goalsSheet.render(this.state)
        this.updateNavBadges()
        this.leaderboard.update({
          lifetimeEarned: this.state.lifetimeTotalEarned,
          comboBest: this.state.comboBest,
          ipoCount: this.state.ipoCount,
        })
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
          this.root.classList.add('shake')
          window.setTimeout(() => this.root.classList.remove('shake'), 300)
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
        this.skyline.update(this.state.ownedBusinessTiers())
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
      if (ev.type === 'day_night') {
        this.renderDayNightChip()
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
    switch (action) {
      case 'open-goals':
        this.goalsSheet.toggle()
        this.goalsSheet.render(this.state)
        break
      case 'close-goals':
        this.goalsSheet.close()
        break
      case 'nav-view':
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
        break
      case 'close-stats':
        this.setView('earn')
        break
      case 'daily':
        if (!this.state.canClaimDaily()) {
          this.modals.showToast(this.root, 'Bugünkü ödül alındı')
          return
        }
        this.modals.showDailyReward(
          this.state.dailyStreak + 1,
          formatMoney(Math.max(100, this.state.incomePerSecond() * 60)),
          () => {
            this.state.claimDailyReward()
            this.renderAll()
          },
        )
        break
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
      case 'ad-restore-event':
        await this.handleRestoreEvent()
        break
      case 'claim-offline':
        this.modals.close()
        break
      case 'ad-offline':
        await this.handleAdOffline()
        break
      case 'refresh':
        this.refreshShop(true)
        break
      default:
        break
    }
  }

  private renderCombo(combo: number, mult: number): void {
    this.comboLabel.textContent = combo > 0 ? `Combo x${combo} (${mult}x)` : 'Combo x1'
    this.comboFill.style.width = `${Math.min(100, (combo / 30) * 100)}%`
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
    const claim = document.createElement('button')
    claim.type = 'button'
    claim.className = 'btn-primary'
    claim.dataset.action = 'claim-offline'
    claim.textContent = 'Topla'
    const ad = document.createElement('button')
    ad.type = 'button'
    ad.className = 'btn-ad'
    ad.dataset.action = 'ad-offline'
    ad.textContent = '📺 x2'
    this.modals.show('Offline Kazanç', `Yokken ${formatMoney(amount)} kazandın.`, [claim, ad])
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
    close.dataset.action = 'claim-offline'
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

  private async handleAdOffline(): Promise<void> {
    if (this.pendingOffline <= 0) {
      this.modals.close()
      return
    }
    const result = await this.ads.showRewarded('offline_bonus')
    if (!result.success) {
      this.modals.showToast(this.root, result.reason ?? 'Reklam yok')
      return
    }
    this.state.incrementRewardedAdCount()
    this.state.addMoney(this.pendingOffline)
    this.pendingOffline = 0
    this.modals.close()
    this.statsBar.render()
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

  renderAll(): void {
    this.statsBar.render()
    this.refreshShop(true)
    this.skyline.update(this.state.ownedBusinessTiers())
    this.goalsSheet.render(this.state)
    this.eventsPanel.render(this.state)
    this.renderDayNightChip()
    this.updateNavBadges()
  }

  destroy(): void {
    this.unsub?.()
    this.unsub = null
    this.clearGoldenEventTimer()
  }
}
