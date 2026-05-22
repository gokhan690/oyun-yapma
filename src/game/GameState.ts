import { PRODUCERS, UPGRADES, producerCost, maxAffordable, isProducerUnlocked, earlyUnlockCost, formatMoney, type ProducerDef, type UpgradeDef } from './Economy'
import { PRESTIGE_THRESHOLD, calcPrestigePoints, canPrestige, prestigeMultiplier } from './Prestige'
import { globalSynergyBonus, producerSynergyBonus } from './Synergies'
import {
  RESEARCH_NODES,
  researchCost,
  researchClickBonus,
  researchPassiveBonus,
  researchOfflineBonusMs,
  researchSynergyMultiplier,
  researchEfficiencyBonus,
} from './Research'
import { pickRandomEvent, nextEventDelayMs, type GameEventDef } from './Events'
import { checkNewAchievements, type AchievementDef } from './Achievements'
import { generateDailyMissions, type MissionProgress } from './Missions'
import { managerCost, managerMultiplier, hasManager } from './Managers'
import {
  createStockState,
  tickStockPrice,
  buyShares,
  sellShares,
  startMarketEvent,
  totalShares,
  ownedTickerCount,
  migrateLegacyStock,
  STOCK_TICK_MS,
  type StockState,
} from './StockMarket'
import {
  createSeasonState,
  currentTier,
  rewardForTier,
  hasClaimableTier,
  seasonWeekKey,
  tierProgress,
  SEASON_MAX_TIER,
  xpForTier,
  type SeasonState,
} from './SeasonPass'
import {
  PRESTIGE_TREE_NODES,
  canBuyNode,
  passiveBonus,
  clickBonus,
  offlineBonusMs,
  producerCostDiscount,
  upgradeCostDiscount,
  managerCostDiscount,
  seasonXpBonus,
  freeStockHint,
  nightBonusExtra,
  dayBonusExtra,
  autoBuyCooldownMs,
  prestigeMultBonus,
  ownedNodeCount,
  heatDecayBonus,
  hasRaidInsurance,
  hasNode,
} from './PrestigeTree'
import { localDayKey, yesterdayLocalKey } from './dateUtils'
import { gameDay, gameWeekKey, gameYear, isGameNight, isGameWeekend, MS_PER_GAME_DAY, realSecondsToGameMs } from './GameClock'
import {
  createEmpireState,
  syncEmpireFromProducers,
  tickEmpireDaily,
  empireFootballIncomeMult,
  empirePoliticsCostDiscount,
  empirePoliticsHeatReduction,
  empireDarkProductionMult,
  boostDarkProduction,
  reduceDarkHeat,
  stadiumUpgradeCost,
  leagueUpgradeCost,
  lobbyCost,
  donateCampaign,
  type EmpireState,
} from './Empire'
import {
  createDynastyState,
  activeDynastyTrait,
  pickChildName,
  randomChildTrait,
  spouseOption,
  spouseProducerBonus,
  traitClickMult,
  traitCostMult,
  traitIllegalMult,
  traitPassiveMult,
  educationXpPerGameHour,
  CHILD_EDUCATION_MAX,
  type DynastyState,
} from './Dynasty'
import {
  createUndergroundTreeState,
  treeNodeDef,
  treeNodeCost,
  illegalIncomeBonus,
  raidFineReduction,
  raidChanceReduction,
  heatDecayBonus as ugHeatDecayBonus,
  heatGainReduction,
} from './UndergroundTree'
import {
  type ActiveMarketNews,
  newsDef,
  newsDurationMs,
  pickMarketNews,
  type MarketNewsDef,
} from './MarketNews'
import {
  createWeeklyState,
  getWeeklyDef,
  type WeeklyEventState,
} from './WeeklyEvent'
import { dailyGoalDayKey, scaledDailyGoalTarget } from './DailyGoal'
import {
  LAWYER_PROTECTION_MS,
  LAUNDER_DURATION_MS,
  HEAT_SHIELD_DURATION_MS,
  type UndergroundActionId,
} from './Underground'
import { themeForTier, type ThemeId } from './Themes'
import { storyBeat } from './StoryBeats'
import { loadOwnerFlags, type OwnerFlags } from '../owner/FeatureFlags'

export interface SerializableState {
  money: number
  totalEarned: number
  totalClicks: number
  producers: Record<string, number>
  purchasedUpgrades: string[]
  prestigePoints: number
  lifetimePrestige: number
  lastSaveTime: number
  dailyLastClaim: string | null
  dailyStreak: number
  adIncomeBoostUntil: number
  rewardedAdsToday: number
  rewardedAdsDay: string
  luckyChestReady: boolean
  research: Record<string, number>
  achievements: string[]
  missions: MissionProgress[]
  missionsDay: string
  comboBest: number
  eventsSeen: number
  sessionEarned: number
  businessesBoughtSession: number
  upgradesBoughtSession: number
  eventBoostUntil: number
  playTimeMs: number
  gameTimeMs: number
  tutorialDone: boolean
  ipoCount: number
  lifetimeTotalEarned: number
  managers: Record<string, boolean>
  stock: StockState
  weekly: WeeklyEventState
  milestonesReached: number[]
  managerDiscountActive: boolean
  dailyGoalEarned: number
  dailyGoalDay: string
  dailyGoalClaimed: boolean
  season: SeasonState
  prestigeTree: Record<string, boolean>
  managerAutoBuy: Record<string, boolean>
  nightEarningsSession: number
  hapticsEnabled: boolean
  reducedMotion: boolean
  playerName: string
  birthYear: number
  forcedUnlocks: string[]
  illegalHeat: number
  unlockedThemes: string[]
  activeTheme: ThemeId
  codexUnlockDates: Record<string, string>
  undergroundCooldowns: Record<string, number>
  heatShieldUntil: number
  heatProtectionUntil: number
  launderingUntil: number
  lastActiveAt: number
  comebackClaimedDay: string | null
  comebackPending: number
  notificationPrefs: { dailyReward: boolean; passiveIncome: boolean; goalNear: boolean }
  surpriseInvestorUntil: number
  surpriseInvestorDay: string
  seenStoryBeats: string[]
  earnedBadges: string[]
  raidsToday: number
  raidsDay: string
  heatWasCritical: boolean
  heatSurvived: boolean
  undergroundLawyerUsed: boolean
  comebackClaimed: boolean
  streakMilestonesClaimed: number[]
  dynasty: DynastyState
  activeMarketNews: ActiveMarketNews | null
  shopBoostUntil: number
  upgradeDiscountActive: boolean
  undergroundTree: Record<string, number>
  advisorBuys: number
  empire: EmpireState
  gameStartYear: number
}

export interface ProducerBreakdown {
  name: string
  owned: number
  basePerUnit: number
  lines: { label: string; value: string }[]
  totalPerDay: number
}

export type GameEvent =
  | { type: 'money_changed' }
  | { type: 'passive_income' }
  | { type: 'stock_tick' }
  | { type: 'click'; amount: number; critical: boolean; x: number; y: number; combo: number }
  | { type: 'purchase' }
  | { type: 'prestige'; points: number }
  | { type: 'offline_earnings'; amount: number }
  | { type: 'daily_reward'; amount: number; streak: number }
  | { type: 'ad_boost'; until: number }
  | { type: 'chest_opened'; amount: number }
  | { type: 'combo_changed'; combo: number; multiplier: number }
  | { type: 'golden_event'; event: GameEventDef; expiresAt: number }
  | { type: 'event_claimed'; event: GameEventDef; reward: number }
  | { type: 'event_missed'; event: GameEventDef }
  | { type: 'achievement'; def: AchievementDef }
  | { type: 'mission_complete'; mission: MissionProgress }
  | { type: 'research_purchased'; nodeId: string; level: number }
  | { type: 'milestone_reached'; amount: number }
  | { type: 'manager_hired'; producerId: string }
  | { type: 'stock_trade'; action: 'buy' | 'sell'; amount: number }
  | { type: 'weekly_updated'; progress: number; target: number }
  | { type: 'daily_goal_updated'; earned: number; target: number }
  | { type: 'day_night'; isNight: boolean }
  | { type: 'game_time' }
  | { type: 'season_updated'; xp: number; tier: number }
  | { type: 'season_claimed'; tier: number; reward: string }
  | { type: 'prestige_tree'; nodeId: string }
  | { type: 'market_event'; crash: boolean }
  | { type: 'auto_buy'; producerId: string }
  | { type: 'nav_changed'; view: string }
  | { type: 'illegal_raid'; fine: number; producerId: string }
  | { type: 'producer_unlocked'; producerId: string }
  | { type: 'illegal_heat'; heat: number }
  | { type: 'underground_action'; actionId: string }
  | { type: 'story_beat'; beatId: string; text: string }
  | { type: 'comeback_ready'; amount: number }
  | { type: 'surprise_investor'; until: number }
  | { type: 'near_miss'; kind: string; message: string }
  | { type: 'theme_unlocked'; themeId: ThemeId }
  | { type: 'badge_earned'; badgeId: string }
  | { type: 'market_news'; headline: string; active: boolean }
  | { type: 'dynasty_update'; kind: string; name?: string }

const MILESTONE_THRESHOLDS = [100_000, 1_000_000, 10_000_000]
const CRIT_CHANCE = 0.1
const CRIT_MULT = 10
const BASE_CLICK = 720
const BASE_OFFLINE_CAP_GAME_DAYS = 365
const BASE_OFFLINE_CAP_MS = BASE_OFFLINE_CAP_GAME_DAYS * MS_PER_GAME_DAY
const AD_BOOST_DURATION_MS = 5 * 60 * 1000
const COMEBACK_MIN_AWAY_MS = 24 * 60 * 60 * 1000
const STREAK_MILESTONES = [7, 14, 30]
const COMBO_WINDOW_MS = 1500

export class GameState {
  money = 0
  totalEarned = 0
  totalClicks = 0
  producers: Record<string, number> = {}
  purchasedUpgrades = new Set<string>()
  prestigePoints = 0
  lifetimePrestige = 0
  lastSaveTime = Date.now()
  dailyLastClaim: string | null = null
  dailyStreak = 0
  adIncomeBoostUntil = 0
  rewardedAdsToday = 0
  rewardedAdsDay = todayKey()
  luckyChestReady = false
  research: Record<string, number> = {}
  achievements = new Set<string>()
  missions: MissionProgress[] = []
  missionsDay = ''
  comboBest = 0
  eventsSeen = 0
  sessionEarned = 0
  businessesBoughtSession = 0
  upgradesBoughtSession = 0
  eventBoostUntil = 0
  playTimeMs = 0
  gameTimeMs = 0
  tutorialDone = false
  ipoCount = 0
  lifetimeTotalEarned = 0
  managers: Record<string, boolean> = {}
  stock = createStockState()
  weekly = createWeeklyState()
  milestonesReached: number[] = []
  managerDiscountActive = false
  dailyGoalEarned = 0
  dailyGoalDay = dailyGoalDayKey()
  dailyGoalClaimed = false
  season = createSeasonState()
  prestigeTree: Record<string, boolean> = {}
  managerAutoBuy: Record<string, boolean> = {}
  nightEarningsSession = 0
  hapticsEnabled = true
  reducedMotion = false
  isNight = isGameNight(0)
  playerName = 'Baron'
  birthYear = 0
  forcedUnlocks = new Set<string>()
  illegalHeat = 0
  unlockedThemes = new Set<string>(['default'])
  activeTheme: ThemeId = 'default'
  codexUnlockDates: Record<string, string> = {}
  undergroundCooldowns: Record<string, number> = {}
  heatShieldUntil = 0
  heatProtectionUntil = 0
  launderingUntil = 0
  lastActiveAt = Date.now()
  comebackClaimedDay: string | null = null
  comebackPending = 0
  notificationPrefs = { dailyReward: true, passiveIncome: true, goalNear: true }
  surpriseInvestorUntil = 0
  surpriseInvestorDay = ''
  seenStoryBeats = new Set<string>()
  earnedBadges = new Set<string>()
  raidsToday = 0
  raidsDay = todayKey()
  heatWasCritical = false
  heatSurvived = false
  undergroundLawyerUsed = false
  advisorBuys = 0
  comebackClaimed = false
  streakMilestonesClaimed: number[] = []
  dynasty = createDynastyState()
  activeMarketNews: ActiveMarketNews | null = null
  shopBoostUntil = 0
  upgradeDiscountActive = false
  undergroundTree = createUndergroundTreeState()
  empire = createEmpireState()
  gameStartYear = 2026
  private lastIllegalRiskCheck = 0
  private lastHeatTick = 0
  private lastSurpriseCheck = 0
  private nudgeFlags = new Set<string>()
  /** Yokken biriken — sadece reklamla toplanır */
  pendingOfflineEarnings = 0

  comboCount = 0
  comboMultiplier = 1
  private lastClickTime = 0
  private activeEvent: GameEventDef | null = null
  private activeEventExpires = 0
  private missedEvent: GameEventDef | null = null
  private eventTimer: number | null = null
  private eventExpireTimer: number | null = null
  private lastStockTick = Date.now()
  private lastAutoBuyTick = 0
  private lastDayNightCheck = 0
  private lastMarketEventCheck = 0
  private passiveAccrued = 0
  private lastGameClockEmit = 0
  private lastDynastyGameDay = 0
  private lastMarketNewsGameDay = 0

  private listeners = new Set<(event: GameEvent) => void>()
  private tickHandle: number | null = null
  private ownerFlags: OwnerFlags = {}

  constructor() {
    for (const p of PRODUCERS) this.producers[p.id] = 0
    for (const r of RESEARCH_NODES) this.research[r.id] = 0
    for (const p of PRODUCERS) this.managers[p.id] = false
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.ensureMissions()
    this.ensureWeekly()
    this.applyOwnerFlags(loadOwnerFlags())
  }

  applyOwnerFlags(flags: OwnerFlags): void {
    this.ownerFlags = { ...flags }
    if (this.ownerFlags.free_boost) {
      this.adIncomeBoostUntil = Date.now() + 365 * 24 * 60 * 60_000
    }
  }

  private ownerFlag(id: string): boolean {
    return this.ownerFlags[id] === true
  }

  ensureSeason(): void {
    const key = seasonWeekKey(this.gameTimeMs)
    if (this.season.weekKey !== key) {
      this.season = createSeasonState(this.gameTimeMs)
    }
  }

  ensureWeekly(): void {
    const key = gameWeekKey(this.gameTimeMs)
    if (this.weekly.weekKey !== key) {
      this.weekly = createWeeklyState(this.gameTimeMs)
    }
  }

  subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  startTick(): void {
    if (this.tickHandle !== null) return
    let last = performance.now()
    let lastPassiveEmit = 0
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      this.playTimeMs += dt * 1000
      if (dt > 0 && dt < 2) {
        this.gameTimeMs += realSecondsToGameMs(dt)
        this.tickChildEducation(realSecondsToGameMs(dt))
      }
      this.updateComboDecay(now)
      this.tickStock(now)
      this.tickDayNight(now)
      this.tickAutoBuy(now)
      this.tickIllegalRisk(now)
      this.tickIllegalHeat(now)
      this.tickSurpriseInvestor(now)
      this.tickNearMiss(now)
      if (dt > 0 && dt < 1) {
        const income = this.incomePerDay() * dt
        if (income > 0) this.passiveAccrued += income
      }
      if (now - lastPassiveEmit > 250 && this.passiveAccrued >= 0.01) {
        lastPassiveEmit = now
        const batch = this.passiveAccrued
        this.passiveAccrued = 0
        this.addMoney(batch, true)
      }
      if (now - this.lastGameClockEmit > 1000) {
        this.lastGameClockEmit = now
        this.tickMarketNews()
        this.tickDynasty()
        this.emit({ type: 'game_time' })
      }
      this.tickHandle = requestAnimationFrame(loop)
    }
    this.tickHandle = requestAnimationFrame(loop)
    this.scheduleNextEvent()
  }

  stopTick(): void {
    if (this.tickHandle !== null) {
      cancelAnimationFrame(this.tickHandle)
      this.tickHandle = null
    }
    if (this.eventTimer !== null) clearTimeout(this.eventTimer)
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
  }

  startEventLoop(): void {
    this.scheduleNextEvent()
  }

  private scheduleNextEvent(): void {
    if (this.eventTimer !== null) clearTimeout(this.eventTimer)
    this.eventTimer = window.setTimeout(() => this.spawnGoldenEvent(), nextEventDelayMs())
  }

  private spawnGoldenEvent(): void {
    if (this.activeEvent) {
      this.scheduleNextEvent()
      return
    }
    const event = pickRandomEvent()
    this.activeEvent = event
    this.activeEventExpires = Date.now() + event.durationMs
    this.eventsSeen++
    this.emit({ type: 'golden_event', event, expiresAt: this.activeEventExpires })

    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    this.eventExpireTimer = window.setTimeout(() => {
      if (this.activeEvent?.id === event.id) {
        this.missedEvent = event
        this.activeEvent = null
        this.emit({ type: 'event_missed', event })
      }
      this.scheduleNextEvent()
    }, event.durationMs)
  }

  claimGoldenEvent(): boolean {
    if (!this.activeEvent) return false
    const event = this.activeEvent
    this.activeEvent = null
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)

    let reward = 0
    if (event.rewardType === 'instant_cash') {
      reward = Math.max(500, this.incomePerDay() * event.rewardValue)
      this.addMoney(reward)
    } else {
      this.eventBoostUntil = Date.now() + (event.boostDurationMs ?? 30_000)
      reward = event.rewardValue
    }
    this.emit({ type: 'event_claimed', event, reward })
    this.scheduleNextEvent()
    return true
  }

  restoreMissedEvent(): GameEventDef | null {
    const e = this.missedEvent
    this.missedEvent = null
    if (!e) return null
    this.activeEvent = e
    this.activeEventExpires = Date.now() + e.durationMs
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    this.eventExpireTimer = window.setTimeout(() => {
      if (this.activeEvent?.id === e.id) {
        this.missedEvent = e
        this.activeEvent = null
        this.emit({ type: 'event_missed', event: e })
      }
      this.scheduleNextEvent()
    }, e.durationMs)
    this.emit({ type: 'golden_event', event: e, expiresAt: this.activeEventExpires })
    return e
  }

  hasMissedEvent(): boolean {
    return this.missedEvent !== null
  }

  getActiveGoldenEvent(): GameEventDef | null {
    return this.activeEvent
  }

  getEventBoostActive(): boolean {
    return Date.now() < this.eventBoostUntil
  }

  private updateComboDecay(now: number): void {
    if (this.comboCount > 0 && now - this.lastClickTime > COMBO_WINDOW_MS) {
      this.comboCount = 0
      this.comboMultiplier = 1
      this.emit({ type: 'combo_changed', combo: 0, multiplier: 1 })
    }
  }

  private tickStock(now: number): void {
    if (now - this.lastStockTick >= STOCK_TICK_MS) {
      tickStockPrice(this.stock)
      this.lastStockTick = now
      this.emit({ type: 'stock_tick' })
    }
    if (now - this.lastMarketEventCheck > 300_000 && Math.random() < 0.05) {
      this.lastMarketEventCheck = now
      const crash = Math.random() < 0.5
      startMarketEvent(this.stock, crash)
      this.emit({ type: 'market_event', crash })
    }
  }

  private tickDayNight(now: number): void {
    if (now - this.lastDayNightCheck < 1000) return
    this.lastDayNightCheck = now
    const weekend = isGameWeekend(this.gameTimeMs)
    if (weekend !== this.isNight) {
      this.isNight = weekend
      this.emit({ type: 'day_night', isNight: weekend })
    }
  }

  private tickIllegalHeat(now: number): void {
    if (this.ownerFlag('no_heat')) return
    if (now - this.lastHeatTick < 15_000) return
    this.lastHeatTick = now
    if (Date.now() < this.heatShieldUntil) return

    const prev = this.illegalHeat
    if (this.illegalHeat >= 80) this.heatWasCritical = true

    if (Date.now() < this.launderingUntil) {
      this.illegalHeat = Math.max(0, this.illegalHeat - 15)
    }

    const target = this.targetIllegalHeat()
    const decayMult = (1 + heatDecayBonus(this.prestigeTree)) * ugHeatDecayBonus(this.undergroundTree)
    if (Math.abs(target - this.illegalHeat) < 0.5) {
      this.illegalHeat = target
    } else if (target > this.illegalHeat) {
      this.illegalHeat += (target - this.illegalHeat) * 0.15
    } else {
      this.illegalHeat += (target - this.illegalHeat) * 0.15 * decayMult
    }
    if (target <= 0) this.illegalHeat = Math.max(0, this.illegalHeat - 2 * decayMult)

    if (this.heatWasCritical && this.illegalHeat < 55) {
      this.heatSurvived = true
      this.heatWasCritical = false
      this.checkAchievements()
    }

    if (this.illegalHeat >= 80 && !this.seenStoryBeats.has('heat_critical')) {
      this.triggerStoryBeat('heat_critical')
    } else if (this.illegalHeat >= 55 && !this.seenStoryBeats.has('heat_high')) {
      this.triggerStoryBeat('heat_high')
    }

    if (Math.round(prev) !== Math.round(this.illegalHeat)) {
      this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    }
  }

  private targetIllegalHeat(): number {
    let owned = 0
    let types = 0
    for (const p of PRODUCERS) {
      if (!p.illegal) continue
      const n = this.producers[p.id] ?? 0
      if (n > 0) {
        types++
        owned += n
      }
    }
    if (types === 0) return 0
    let heat = Math.min(100, types * 12 + owned * 4)
    if (this.purchasedUpgrades.has('offshore_laundry')) heat *= 0.8
    if (this.hasCodexLegalComplete()) heat = Math.min(100, heat * 0.9)
    heat *= heatGainReduction(this.undergroundTree)
    heat *= 1 - empirePoliticsHeatReduction(this.empire.politics)
    heat += this.empire.darkIndustry.heatBonus
    return Math.max(0, heat)
  }

  illegalRiskLabel(): string {
    if (this.illegalHeat < 25) return 'Düşük'
    if (this.illegalHeat < 55) return 'Orta'
    if (this.illegalHeat < 80) return 'Yüksek'
    return 'Kritik'
  }

  illegalIncomePerDay(): number {
    return PRODUCERS.filter((p) => p.illegal).reduce((s, p) => s + this.producerIncome(p), 0)
  }

  legalIncomePerDay(): number {
    return this.incomePerDay() - this.illegalIncomePerDay()
  }

  /** @deprecated use incomePerDay */
  incomePerSecond(): number {
    return this.incomePerDay()
  }

  /** @deprecated use illegalIncomePerDay */
  illegalIncomePerSecond(): number {
    return this.illegalIncomePerDay()
  }

  /** @deprecated use legalIncomePerDay */
  legalIncomePerSecond(): number {
    return this.legalIncomePerDay()
  }

  private tickIllegalRisk(now: number): void {
    if (this.ownerFlag('no_heat')) return
    if (now - this.lastIllegalRiskCheck < 60_000) return
    this.lastIllegalRiskCheck = now
    if (Date.now() < this.heatProtectionUntil) return

    const today = todayKey()
    if (this.raidsDay !== today) {
      this.raidsDay = today
      this.raidsToday = 0
    }

    const heatMult = 1 + this.illegalHeat / 100
    for (const p of PRODUCERS) {
      if (!p.illegal || !p.riskChance) continue
      const owned = this.producers[p.id] ?? 0
      if (owned <= 0) continue
      const chance = Math.min(0.35, p.riskChance * heatMult * (1 - raidChanceReduction(this.undergroundTree)))
      if (Math.random() > chance) continue
      let finePct = (p.riskFinePct ?? 0.15) * (0.8 + this.illegalHeat / 200)
      finePct *= 1 - raidFineReduction(this.undergroundTree)
      if (hasRaidInsurance(this.prestigeTree) && this.raidsToday === 0) finePct *= 0.5
      const fine = Math.floor(this.money * finePct)
      if (fine <= 0) continue
      this.money = Math.max(0, this.money - fine)
      this.illegalHeat = Math.min(100, this.illegalHeat + 20)
      this.raidsToday++
      this.emit({ type: 'illegal_raid', fine, producerId: p.id })
      this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
      this.emit({ type: 'money_changed' })
      break
    }
  }

  private tickAutoBuy(now: number): void {
    const cooldown = autoBuyCooldownMs(this.prestigeTree)
    if (now - this.lastAutoBuyTick < cooldown) return
    this.lastAutoBuyTick = now
    for (const p of PRODUCERS) {
      if (!this.managerAutoBuy[p.id] || !hasManager(this.managers, p.id)) continue
      if (!isProducerUnlocked(p, this.totalEarned, this.forcedUnlocks)) continue
      if (this.buyProducer(p.id, 1)) {
        this.emit({ type: 'auto_buy', producerId: p.id })
        break
      }
    }
  }

  dayNightClickBonus(): number {
    if (this.isNight) return 0
    return 0.1 + dayBonusExtra(this.prestigeTree)
  }

  dayNightPassiveBonus(): number {
    if (!this.isNight) return 0
    return 0.15 + nightBonusExtra(this.prestigeTree)
  }

  weeklyProducerBonus(producerId: string): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.producerId === producerId && def.bonus) {
      return 1 + def.bonus * (this.weekly.adDoubled ? 2 : 1)
    }
    return 1
  }

  weeklySynergyMult(): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.id === 'synergy_week') return 2 * (this.weekly.adDoubled ? 2 : 1)
    return 1
  }

  weeklyComboCapMult(): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.comboCapMult) return def.comboCapMult * (this.weekly.adDoubled ? 1.5 : 1)
    return 1
  }

  researchCostWithWeekly(baseCost: number): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.id === 'research_sale') return Math.floor(baseCost * (1 - 0.3))
    return baseCost
  }

  comboMultFromCount(count: number): number {
    const cap = this.weeklyComboCapMult()
    let mult = 1
    if (count >= 30 * cap) mult = 3
    else if (count >= 15 * cap) mult = 2
    else if (count >= 5 * cap) mult = 1.5
    return mult
  }

  offlineCapMs(): number {
    return BASE_OFFLINE_CAP_MS + researchOfflineBonusMs(this.research) + offlineBonusMs(this.prestigeTree)
  }

  offlineCapGameDays(): number {
    return Math.floor(this.offlineCapMs() / MS_PER_GAME_DAY)
  }

  globalMultiplier(): number {
    let mult = prestigeMultiplier(this.prestigePoints) * (1 + prestigeMultBonus(this.prestigeTree))
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'global_mult') mult *= u.value
    }
    if (Date.now() < this.adIncomeBoostUntil) mult *= 2
    if (Date.now() < this.shopBoostUntil) mult *= 1.5
    if (this.getEventBoostActive()) mult *= 3
    mult *= 1 + globalSynergyBonus(this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= 1 + passiveBonus(this.prestigeTree)
    if (this.hasCodexLegalComplete()) mult *= 1.05
    if (Date.now() < this.surpriseInvestorUntil) mult *= 2
    if (this.ownerFlag('income_x2')) mult *= 2
    mult *= this.marketNewsGlobalMult()
    const trait = activeDynastyTrait(this.dynasty)
    mult *= traitPassiveMult(trait)
    if (hasNode(this.prestigeTree, 'dynasty_1')) {
      const t = activeDynastyTrait(this.dynasty)
      if (t === 'merchant' || t === 'diplomat') mult *= 1.05
    }
    return mult
  }

  passiveMultiplier(): number {
    return this.globalMultiplier() * researchPassiveBonus(this.research) * (1 + this.dayNightPassiveBonus())
  }

  clickMultiplier(): number {
    let mult = 1
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'click_mult') mult *= u.value
    }
    mult *= this.globalMultiplier()
    mult *= researchClickBonus(this.research)
    mult *= this.comboMultiplier
    mult *= 1 + clickBonus(this.prestigeTree)
    mult *= 1 + this.dayNightClickBonus()
    mult *= traitClickMult(activeDynastyTrait(this.dynasty))
    mult *= this.marketNewsClickMult()
    return mult
  }

  producerIncome(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    if (owned === 0) return 0
    let mult = 1
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'producer_mult' && u.producerId === def.id) mult *= u.value
    }
    mult *= 1 + producerSynergyBonus(def.id, this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= managerMultiplier(this.managers, def.id)
    mult *= this.weeklyProducerBonus(def.id)
    if (def.illegal) mult *= traitIllegalMult(activeDynastyTrait(this.dynasty))
    mult *= this.marketNewsProducerMult(def.id)
    mult *= spouseProducerBonus(this.dynasty, def.id, hasNode(this.prestigeTree, 'dynasty_1'))
    if (def.illegal) mult *= illegalIncomeBonus(this.undergroundTree)
    if (def.category === 'dark') {
      mult *= empireDarkProductionMult(this.empire.darkIndustry, this.gameTimeMs)
    }
    if (def.category === 'sport') {
      const club = this.empire.football.find((c) => c.clubId === def.id)
      if (club) mult *= empireFootballIncomeMult(club)
    }
    return def.baseIncome * owned * mult * this.passiveMultiplier()
  }

  activeMarketNewsDef(): MarketNewsDef | null {
    if (!this.activeMarketNews) return null
    if (this.gameTimeMs >= this.activeMarketNews.expiresGameTimeMs) {
      this.activeMarketNews = null
      return null
    }
    return newsDef(this.activeMarketNews.defId) ?? null
  }

  currentMarketHeadline(): string | null {
    return this.activeMarketNewsDef()?.headline ?? null
  }

  private marketNewsGlobalMult(): number {
    const n = this.activeMarketNewsDef()
    if (!n) return 1
    if (n.effect === 'global_up') return 1 + n.value
    if (n.effect === 'global_down') return 1 - n.value
    if (n.effect === 'synergy_up') return 1 + n.value * 0.5
    return 1
  }

  private marketNewsClickMult(): number {
    const n = this.activeMarketNewsDef()
    if (n?.effect === 'click_up') return 1 + n.value
    return 1
  }

  private marketNewsProducerMult(producerId: string): number {
    const n = this.activeMarketNewsDef()
    if (n?.effect === 'producer_up' && n.producerId === producerId) return 1 + n.value
    return 1
  }

  private tickMarketNews(): void {
    if (this.activeMarketNews && this.gameTimeMs >= this.activeMarketNews.expiresGameTimeMs) {
      this.activeMarketNews = null
      this.emit({ type: 'market_news', headline: '', active: false })
    }
    const day = gameDay(this.gameTimeMs)
    if (day === this.lastMarketNewsGameDay || this.activeMarketNews) return
    if (day % 4 !== 0) return
    this.lastMarketNewsGameDay = day
    const def = pickMarketNews(day)
    this.activeMarketNews = {
      defId: def.id,
      expiresGameTimeMs: this.gameTimeMs + newsDurationMs(def),
    }
    this.emit({ type: 'market_news', headline: def.headline, active: true })
  }

  private tickDynasty(): void {
    const day = gameDay(this.gameTimeMs)
    if (day === this.lastDynastyGameDay) return
    this.lastDynastyGameDay = day
    syncEmpireFromProducers(this.empire, this.producers)
    const { matchBonus, election } = tickEmpireDaily(this.empire, this.producers, this.gameTimeMs, gameYear(this.gameTimeMs))
    if (matchBonus > 0) this.addMoney(matchBonus)
    if (election) this.triggerStoryBeat('election_year')
    if (gameYear(this.gameTimeMs) === 2027 && !this.seenStoryBeats.has('year_2027')) {
      this.triggerStoryBeat('year_2027')
    }
    if (!this.dynasty.spouseName || this.dynasty.children.length >= 3) return
    const married = this.dynasty.marriedGameDay ?? day
    if (day - married < 5) return
    if (Math.random() > 0.4) return
    const child = {
      id: `c${day}_${this.dynasty.children.length}`,
      name: pickChildName(this.dynasty.children),
      trait: randomChildTrait(),
      bornGameDay: day,
      educationXp: 0,
    }
    this.dynasty.children.push(child)
    this.emit({ type: 'dynasty_update', kind: 'child_born', name: child.name })
  }

  private tickChildEducation(gameMsDelta: number): void {
    if (this.dynasty.children.length === 0) return
    const days = gameMsDelta / MS_PER_GAME_DAY
    const gain = educationXpPerGameHour() * 24 * days
    if (gain <= 0) return
    for (const child of this.dynasty.children) {
      if (child.educationXp >= CHILD_EDUCATION_MAX) continue
      child.educationXp = Math.min(CHILD_EDUCATION_MAX, child.educationXp + gain)
    }
  }

  marrySpouse(spouseId: string): boolean {
    if (this.dynasty.spouseName) return false
    const s = spouseOption(spouseId)
    if (!s || !this.canAfford(s.cost)) return false
    this.money -= s.cost
    this.dynasty.spouseId = s.id
    this.dynasty.spouseName = s.name
    this.dynasty.spouseTrait = s.trait
    this.dynasty.marriedGameDay = gameDay(this.gameTimeMs)
    this.emit({ type: 'dynasty_update', kind: 'married', name: s.name })
    this.emit({ type: 'money_changed' })
    return true
  }

  successionToChild(childId: string): boolean {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return false
    this.playerName = child.name
    this.dynasty.activeHeirId = child.id
    this.dynasty.dynastyBonusId = child.id
    this.dynasty.generation++
    this.emit({ type: 'dynasty_update', kind: 'succession', name: child.name })
    return true
  }

  dynastyCostMult(): number {
    return traitCostMult(activeDynastyTrait(this.dynasty)) * (1 - empirePoliticsCostDiscount(this.empire.politics))
  }

  incomePerDay(): number {
    return PRODUCERS.reduce((sum, p) => sum + this.producerIncome(p), 0)
  }

  unlockedProducers(): ProducerDef[] {
    return PRODUCERS.filter((p) => isProducerUnlocked(p, this.totalEarned, this.forcedUnlocks))
  }

  earlyUnlockProducer(id: string): boolean {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def || isProducerUnlocked(def, this.totalEarned, this.forcedUnlocks)) return false
    const cost = earlyUnlockCost(def)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.forcedUnlocks.add(id)
    this.emit({ type: 'producer_unlocked', producerId: id })
    this.emit({ type: 'money_changed' })
    return true
  }

  ownedBusinessTiers(): number {
    return PRODUCERS.filter((p) => (this.producers[p.id] ?? 0) > 0).length
  }

  addMoney(amount: number, countTotal = true): void {
    if (amount <= 0) return
    const prevLifetime = this.lifetimeTotalEarned
    this.money += amount
    this.trackDailyGoal(amount)
    if (this.isNight) this.nightEarningsSession += amount
    if (countTotal) {
      this.totalEarned += amount
      this.lifetimeTotalEarned += amount
      this.sessionEarned += amount
      this.updateMissionProgress('earn_money', amount)
      this.updateWeeklyProgress(amount)
      this.addSeasonXp(Math.floor(amount / 3500))
      this.emit({ type: 'money_changed' })
      this.checkMilestones(prevLifetime)
      this.checkAchievements()
    } else {
      this.emit({ type: 'passive_income' })
    }
  }

  ensureDailyGoal(): void {
    const day = dailyGoalDayKey()
    if (this.dailyGoalDay !== day) {
      this.dailyGoalDay = day
      this.dailyGoalEarned = 0
      this.dailyGoalClaimed = false
    }
  }

  private trackDailyGoal(amount: number): void {
    this.ensureDailyGoal()
    const target = this.dailyGoalTarget()
    const bucketBefore = Math.floor(this.dailyGoalEarned / Math.max(1, target / 10))
    this.dailyGoalEarned += amount
    const bucketAfter = Math.floor(this.dailyGoalEarned / Math.max(1, target / 10))
    if (bucketBefore !== bucketAfter || this.dailyGoalEarned >= target) {
      this.emit({ type: 'daily_goal_updated', earned: this.dailyGoalEarned, target })
    }
  }

  claimDailyGoalReward(): number {
    this.ensureDailyGoal()
    const target = this.dailyGoalTarget()
    if (this.dailyGoalClaimed || this.dailyGoalEarned < target) return 0
    this.dailyGoalClaimed = true
    const reward = Math.max(500, this.incomePerDay())
    this.addMoney(reward)
    return reward
  }

  ipoProgress(): { current: number; target: number; pct: number; ready: boolean } {
    const target = PRESTIGE_THRESHOLD
    const current = this.totalEarned
    return {
      current,
      target,
      pct: Math.min(100, (current / target) * 100),
      ready: canPrestige(current),
    }
  }

  getProducerBreakdown(id: string): ProducerBreakdown | null {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return null
    const owned = this.producers[id] ?? 0
    const lines: { label: string; value: string }[] = []
    const base = def.baseIncome * owned
    lines.push({ label: 'Temel gelir', value: `${formatMoney(base)}/gün` })

    let prodMult = 1
    for (const uid of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === uid)
      if (u?.effect === 'producer_mult' && u.producerId === id) prodMult *= u.value
    }
    if (prodMult > 1) lines.push({ label: 'Yükseltme', value: `x${prodMult}` })

    const syn = producerSynergyBonus(id, this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    if (syn > 0) lines.push({ label: 'Sinerji', value: `+${Math.round(syn * 100)}%` })

    if (hasManager(this.managers, id)) lines.push({ label: 'Yönetici', value: '+25%' })

    const weekly = this.weeklyProducerBonus(id)
    if (weekly > 1) lines.push({ label: 'Haftalık etkinlik', value: `x${weekly.toFixed(1)}` })

    const global = this.passiveMultiplier()
    if (global > 1) lines.push({ label: 'Global çarpan', value: `x${global.toFixed(2)}` })

    return {
      name: def.name,
      owned,
      basePerUnit: def.baseIncome,
      lines,
      totalPerDay: this.producerIncome(def),
    }
  }

  private checkMilestones(prevLifetime: number): void {
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (prevLifetime < threshold && this.lifetimeTotalEarned >= threshold) {
        if (!this.milestonesReached.includes(threshold)) {
          this.milestonesReached.push(threshold)
          this.emit({ type: 'milestone_reached', amount: threshold })
        }
      }
    }
  }

  private updateWeeklyProgress(amount: number): void {
    this.ensureWeekly()
    if (this.weekly.claimed) return
    this.weekly.progress = Math.min(this.weekly.target, this.weekly.progress + amount / 100)
    this.emit({ type: 'weekly_updated', progress: this.weekly.progress, target: this.weekly.target })
  }

  click(x: number, y: number): void {
    const now = performance.now()
    if (now - this.lastClickTime < COMBO_WINDOW_MS) {
      this.comboCount++
    } else {
      this.comboCount = 1
    }
    this.lastClickTime = now
    this.comboMultiplier = this.comboMultFromCount(this.comboCount)
    if (this.comboCount > this.comboBest) this.comboBest = this.comboCount

    this.totalClicks++
    this.updateMissionProgress('clicks', 1)

    const critical = Math.random() < CRIT_CHANCE
    const amount = BASE_CLICK * this.clickMultiplier() * (critical ? CRIT_MULT : 1)
    this.addMoney(amount)
    this.emit({ type: 'click', amount, critical, x, y, combo: this.comboCount })
    this.emit({ type: 'combo_changed', combo: this.comboCount, multiplier: this.comboMultiplier })

    if (Math.random() < 0.002) this.luckyChestReady = true
    this.checkAchievements()
  }

  canAfford(cost: number): boolean {
    return this.money >= cost
  }

  producerCostFor(def: ProducerDef, owned: number, count = 1): number {
    const raw = producerCost(def, owned, count)
    const efficiencyDiscount = researchEfficiencyBonus(this.research)
    return Math.floor(raw * (1 - producerCostDiscount(this.prestigeTree)) * (1 - efficiencyDiscount) * this.dynastyCostMult())
  }

  countMaxAffordable(id: string): number {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return 0
    return maxAffordable(def, this.producers[id] ?? 0, this.money, 1 - producerCostDiscount(this.prestigeTree))
  }

  buyProducer(id: string, count = 1): boolean {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def || !isProducerUnlocked(def, this.totalEarned, this.forcedUnlocks)) return false
    const owned = this.producers[id] ?? 0
    const cost = this.producerCostFor(def, owned, count)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.producers[id] = owned + count
    this.businessesBoughtSession += count
    this.updateMissionProgress('buy_business', count)
    if (!this.codexUnlockDates[id]) {
      this.codexUnlockDates[id] = todayKey()
    }
    if (def.illegal && !this.seenStoryBeats.has('illegal_first')) {
      this.triggerStoryBeat('illegal_first')
    }
    if (this.hasCodexLegalComplete()) {
      this.awardBadge('codex_legal')
      this.triggerStoryBeat('codex_legal')
    }
    if (this.hasCodexAllComplete()) {
      this.awardBadge('codex_all')
    }
    syncEmpireFromProducers(this.empire, this.producers)
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  buyMaxProducer(id: string): number {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return 0
    const count = maxAffordable(def, this.producers[id] ?? 0, this.money, 1 - producerCostDiscount(this.prestigeTree))
    if (count <= 0) return 0
    return this.buyProducer(id, count) ? count : 0
  }

  buyUpgrade(id: string): boolean {
    if (this.purchasedUpgrades.has(id)) return false
    const def = UPGRADES.find((u) => u.id === id)
    if (!def) return false
    const cost = this.upgradeCostFor(def)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.purchasedUpgrades.add(id)
    this.upgradeDiscountActive = false
    this.upgradesBoughtSession++
    this.updateMissionProgress('buy_upgrade', 1)
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  upgradeCostFor(def: UpgradeDef): number {
    let cost = Math.floor(def.cost * (1 - upgradeCostDiscount(this.prestigeTree)))
    if (this.upgradeDiscountActive) cost = Math.floor(cost * 0.7)
    return cost
  }

  managerCostFor(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    let cost = managerCost(def.baseIncome, owned)
    cost = Math.floor(cost * (1 - managerCostDiscount(this.prestigeTree)))
    return cost
  }

  buyResearch(nodeId: string): boolean {
    const node = RESEARCH_NODES.find((n) => n.id === nodeId)
    if (!node) return false
    const level = this.research[nodeId] ?? 0
    if (level >= node.maxLevel) return false
    const cost = this.researchCostWithWeekly(researchCost(node, level))
    if (node.currency === 'money') {
      if (!this.canAfford(cost)) return false
      this.money -= cost
    } else {
      if (this.prestigePoints < cost) return false
      this.prestigePoints -= cost
    }
    this.research[nodeId] = level + 1
    this.emit({ type: 'research_purchased', nodeId, level: level + 1 })
    this.emit({ type: 'money_changed' })
    return true
  }

  availableUpgrades(): UpgradeDef[] {
    return UPGRADES.filter((u) => !this.purchasedUpgrades.has(u.id))
  }

  prestigeEligible(): boolean {
    return canPrestige(this.totalEarned)
  }

  pendingPrestigePoints(): number {
    return calcPrestigePoints(this.totalEarned)
  }

  doPrestige(): number {
    const points = this.pendingPrestigePoints()
    if (points <= 0) return 0

    this.prestigePoints += points
    this.lifetimePrestige += points
    this.ipoCount++
    this.money = 0
    this.totalEarned = 0
    this.totalClicks = 0
    this.sessionEarned = 0
    this.producers = {}
    for (const p of PRODUCERS) this.producers[p.id] = 0
    this.purchasedUpgrades.clear()
    this.luckyChestReady = false
    this.comboCount = 0
    this.comboMultiplier = 1
    for (const p of PRODUCERS) this.managers[p.id] = false
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.stock = createStockState()
    this.nightEarningsSession = 0

    this.addSeasonXp(points * 50)
    this.emit({ type: 'prestige', points })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return points
  }

  addSeasonXp(amount: number): void {
    if (amount <= 0) return
    this.ensureSeason()
    const mult = 1 + seasonXpBonus(this.prestigeTree) + (this.season.adXpDoubled ? 1 : 0)
    this.season.xp += Math.floor(amount * mult)
    this.updateMissionProgress('season_xp', Math.floor(amount * mult))
    this.emit({ type: 'season_updated', xp: this.season.xp, tier: currentTier(this.season.xp) })
  }

  claimSeasonTier(tier: number): boolean {
    this.ensureSeason()
    if (tier < 1 || tier > currentTier(this.season.xp)) return false
    if (this.season.claimedTiers.includes(tier)) return false
    const reward = rewardForTier(tier)
    this.season.claimedTiers.push(tier)
    if (reward.type === 'money') {
      this.addMoney(reward.value * tier)
    } else if (reward.type === 'boost') {
      this.adIncomeBoostUntil = Date.now() + reward.value * 60_000
      this.emit({ type: 'ad_boost', until: this.adIncomeBoostUntil })
    } else if (reward.type === 'theme') {
      const themeId = themeForTier(tier)
      if (themeId) this.unlockTheme(themeId)
    }
    if (tier >= 10) this.awardBadge('season_10')
    if (tier >= 20) this.awardBadge('season_20')
    if (tier >= 30) this.awardBadge('season_30')
    this.updateMissionProgress('season_tier', 1)
    this.emit({ type: 'season_claimed', tier, reward: reward.label })
    this.checkAchievements()
    return true
  }

  hasClaimableSeasonReward(): boolean {
    this.ensureSeason()
    return hasClaimableTier(this.season)
  }

  doubleSeasonXpWithAd(): void {
    this.season.adXpDoubled = true
  }

  buyPrestigeTreeNode(nodeId: string): boolean {
    const node = PRESTIGE_TREE_NODES.find((n) => n.id === nodeId)
    if (!node || !canBuyNode(this.prestigeTree, node, this.prestigePoints)) return false
    this.prestigePoints -= node.cost
    this.prestigeTree[nodeId] = true
    this.emit({ type: 'prestige_tree', nodeId })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  toggleManagerAutoBuy(producerId: string): void {
    if (!hasManager(this.managers, producerId)) return
    this.managerAutoBuy[producerId] = !this.managerAutoBuy[producerId]
    if (this.managerAutoBuy[producerId]) {
      this.updateMissionProgress('autobuy_enable', 1)
    }
  }

  managerAutoBuyCount(): number {
    return Object.values(this.managerAutoBuy).filter(Boolean).length
  }

  setActiveStockTicker(id: string): void {
    if (this.stock.tickers[id]) this.stock.activeTickerId = id
  }

  dailyGoalTarget(): number {
    return scaledDailyGoalTarget(this.incomePerDay())
  }

  hasCodexLegalComplete(): boolean {
    return PRODUCERS.filter((p) => !p.illegal && !p.category).every((p) => (this.producers[p.id] ?? 0) >= 1)
  }

  hasCodexAllComplete(): boolean {
    return PRODUCERS.every((p) => (this.producers[p.id] ?? 0) >= 1)
  }

  codexCompletionBonus(): { legal: boolean; all: boolean } {
    return { legal: this.hasCodexLegalComplete(), all: this.hasCodexAllComplete() }
  }

  unlockTheme(themeId: ThemeId): void {
    if (!this.unlockedThemes.has(themeId)) {
      this.unlockedThemes.add(themeId)
      this.emit({ type: 'theme_unlocked', themeId })
      this.awardBadge(`theme_${themeId}`)
      if (themeId !== 'default') this.triggerStoryBeat(`theme_${themeId}`)
    }
  }

  setActiveTheme(themeId: ThemeId): void {
    if (!this.unlockedThemes.has(themeId)) return
    this.activeTheme = themeId
  }

  triggerStoryBeat(beatId: string): void {
    if (this.seenStoryBeats.has(beatId)) return
    this.seenStoryBeats.add(beatId)
    const beat = storyBeat(beatId)
    if (beat) this.emit({ type: 'story_beat', beatId, text: beat.text })
  }

  awardBadge(badgeId: string): void {
    if (this.earnedBadges.has(badgeId)) return
    this.earnedBadges.add(badgeId)
    this.emit({ type: 'badge_earned', badgeId })
  }

  undergroundCooldownRemaining(actionId: UndergroundActionId): number {
    const until = this.undergroundCooldowns[actionId] ?? 0
    return Math.max(0, until - Date.now())
  }

  canUseUnderground(actionId: UndergroundActionId): { ok: boolean; reason?: string } {
    if (this.undergroundCooldownRemaining(actionId) > 0) {
      return { ok: false, reason: 'Bekleme süresi' }
    }
    const ipd = this.incomePerDay()
    if (actionId === 'lawyer') {
      const cost = ipd * 0.5
      if (!this.canAfford(cost)) return { ok: false, reason: 'Yetersiz para' }
    }
    if (actionId === 'bribe') {
      const cost = Math.floor(this.money * 0.05)
      if (cost <= 0 || !this.canAfford(cost)) return { ok: false, reason: 'Yetersiz para' }
    }
    if (actionId === 'launder') {
      const cost = this.illegalIncomePerDay() * 0.2
      if (this.illegalIncomePerDay() <= 0) return { ok: false, reason: 'Illegal gelir yok' }
      if (!this.canAfford(Math.max(1, cost))) return { ok: false, reason: 'Yetersiz para' }
    }
    return { ok: true }
  }

  useUndergroundAction(actionId: UndergroundActionId): boolean {
    const check = this.canUseUnderground(actionId)
    if (!check.ok) return false
    const ipd = this.incomePerDay()
    const cooldowns: Record<UndergroundActionId, number> = {
      lawyer: 10 * 60_000,
      bribe: 5 * 60_000,
      launder: 15 * 60_000,
    }

    if (actionId === 'lawyer') {
      this.money -= ipd * 0.5
      this.illegalHeat = Math.max(0, this.illegalHeat - 25)
      this.heatProtectionUntil = Date.now() + LAWYER_PROTECTION_MS
      this.undergroundLawyerUsed = true
      this.awardBadge('underground_lawyer')
    } else if (actionId === 'bribe') {
      const cost = Math.floor(this.money * 0.05)
      this.money -= cost
      this.illegalHeat = Math.max(0, this.illegalHeat - 40)
    } else if (actionId === 'launder') {
      const cost = Math.max(1, this.illegalIncomePerDay() * 0.2)
      this.money -= cost
      this.launderingUntil = Date.now() + LAUNDER_DURATION_MS
    }

    this.undergroundCooldowns[actionId] = Date.now() + cooldowns[actionId]
    this.updateMissionProgress('use_underground', 1)
    this.emit({ type: 'underground_action', actionId })
    this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  upgradeFootballStadium(clubId: string): boolean {
    const club = this.empire.football.find((c) => c.clubId === clubId)
    if (!club) return false
    const cost = stadiumUpgradeCost(club.stadiumLevel)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    club.stadiumLevel++
    this.emit({ type: 'money_changed' })
    return true
  }

  upgradeFootballLeague(clubId: string): boolean {
    const club = this.empire.football.find((c) => c.clubId === clubId)
    if (!club || club.leagueLevel >= 4) return false
    const cost = leagueUpgradeCost(club.leagueLevel)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    club.leagueLevel++
    this.emit({ type: 'money_changed' })
    if (club.leagueLevel === 3) this.triggerStoryBeat('football_superlig')
    if (club.leagueLevel === 4) this.triggerStoryBeat('football_europe')
    return true
  }

  empireLobby(): boolean {
    const cost = lobbyCost(this.empire.politics.influence)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    donateCampaign(cost, this.empire.politics)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireDonate(amount: number): boolean {
    if (amount <= 0 || !this.canAfford(amount)) return false
    this.money -= amount
    donateCampaign(amount, this.empire.politics)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireBoostDarkProduction(): boolean {
    const cost = Math.max(5000, this.incomePerDay() * 0.25)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    boostDarkProduction(this.empire.darkIndustry, this.gameTimeMs)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireReduceDarkHeat(): boolean {
    const cost = Math.max(3000, this.incomePerDay() * 0.15)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    reduceDarkHeat(this.empire.darkIndustry)
    this.illegalHeat = Math.max(0, this.illegalHeat - 15)
    this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    this.emit({ type: 'money_changed' })
    return true
  }

  activateHeatShield(): void {
    this.heatShieldUntil = Date.now() + HEAT_SHIELD_DURATION_MS
  }

  isHeatShieldActive(): boolean {
    return Date.now() < this.heatShieldUntil
  }

  isSurpriseInvestorActive(): boolean {
    return Date.now() < this.surpriseInvestorUntil
  }

  private tickSurpriseInvestor(now: number): void {
    if (now - this.lastSurpriseCheck < 60_000) return
    this.lastSurpriseCheck = now
    const today = todayKey()
    if (this.surpriseInvestorDay === today && !this.ownerFlag('surprise_often')) return
    const chance = this.ownerFlag('surprise_often') ? 0.25 : 0.05
    if (Math.random() > chance) return
    this.surpriseInvestorDay = today
    this.surpriseInvestorUntil = Date.now() + 30_000
    this.triggerStoryBeat('surprise_investor')
    this.awardBadge('investor')
    this.emit({ type: 'surprise_investor', until: this.surpriseInvestorUntil })
  }

  private tickNearMiss(now: number): void {
    void now
    const ipo = this.ipoProgress()
    if (ipo.pct >= 90 && ipo.pct < 100 && !this.nudgeFlags.has('ipo')) {
      this.nudgeFlags.add('ipo')
      this.emit({ type: 'near_miss', kind: 'ipo', message: 'Birleşmeye az kaldı!' })
    }
    this.ensureSeason()
    const prog = tierProgress(this.season.xp)
    if (prog.pct >= 95 && prog.pct < 100 && !this.nudgeFlags.has('season')) {
      this.nudgeFlags.add('season')
      this.emit({ type: 'near_miss', kind: 'season', message: 'Sezon tier\'ına az kaldı!' })
    }
    if (this.comboCount >= this.comboBest - 2 && this.comboBest >= 10 && !this.nudgeFlags.has('combo')) {
      this.nudgeFlags.add('combo')
      this.emit({ type: 'near_miss', kind: 'combo', message: 'Combo rekoruna yakınsın!' })
    }
  }

  peekDailyStreakReset(): boolean {
    if (!this.dailyLastClaim) return false
    const yesterday = yesterdayKey()
    return this.dailyLastClaim !== yesterday && this.dailyLastClaim !== todayKey()
  }

  claimComebackBonus(): number {
    if (this.comebackPending <= 0) return 0
    const amount = this.comebackPending
    this.comebackPending = 0
    this.comebackClaimed = true
    this.comebackClaimedDay = todayKey()
    this.addMoney(amount)
    this.awardBadge('comeback')
    return amount
  }

  /** Geri dönüş bonusu — yalnızca reklam sonrası */
  claimComebackViaAd(multiplier = 1): number {
    if (this.comebackPending <= 0) return 0
    const amount = Math.floor(this.comebackPending * multiplier)
    this.comebackPending = 0
    this.comebackClaimed = true
    this.comebackClaimedDay = todayKey()
    this.addMoney(amount)
    this.awardBadge('comeback')
    this.emit({ type: 'offline_earnings', amount })
    return amount
  }

  hasPendingComeback(): boolean {
    return this.comebackPending > 0
  }

  /** Offline kazancı hesapla — otomatik verilmez */
  applyOfflineEarnings(lastSaveTime: number): number {
    const awayMs = Date.now() - lastSaveTime
    this.lastActiveAt = Date.now()
    this.pendingOfflineEarnings = 0

    if (awayMs >= COMEBACK_MIN_AWAY_MS && this.comebackClaimedDay !== todayKey()) {
      const elapsed = Math.min(awayMs, this.offlineCapMs())
      const gameDaysAway = elapsed / MS_PER_GAME_DAY
      let base = 0
      for (const p of PRODUCERS) {
        let inc = this.producerIncome(p)
        if (hasManager(this.managers, p.id)) inc *= 1.5
        base += inc * gameDaysAway
      }
      const mult = awayMs >= 72 * 60 * 60 * 1000 ? 3 : awayMs >= 48 * 60 * 60 * 1000 ? 2 : 1.5
      this.comebackPending = Math.floor(base * mult)
      this.triggerStoryBeat('comeback')
      this.emit({ type: 'comeback_ready', amount: this.comebackPending })
    }

    const elapsed = Math.min(awayMs, this.offlineCapMs())
    if (elapsed < MS_PER_GAME_DAY) return 0
    const gameDaysAway = elapsed / MS_PER_GAME_DAY
    let amount = 0
    for (const p of PRODUCERS) {
      let inc = this.producerIncome(p)
      if (hasManager(this.managers, p.id)) inc *= 1.5
      amount += inc * gameDaysAway
    }
    if (amount <= 0) return 0
    this.pendingOfflineEarnings = Math.floor(amount)
    return this.pendingOfflineEarnings
  }

  discardPendingOffline(): void {
    this.pendingOfflineEarnings = 0
  }

  discardComeback(): void {
    this.comebackPending = 0
    this.comebackClaimedDay = todayKey()
  }

  /** Reklam izlendikten sonra offline kazancı topla */
  claimOfflineViaAd(multiplier = 1): number {
    if (this.pendingOfflineEarnings <= 0) return 0
    const amount = Math.floor(this.pendingOfflineEarnings * multiplier)
    this.pendingOfflineEarnings = 0
    this.addMoney(amount)
    this.emit({ type: 'offline_earnings', amount })
    return amount
  }

  activateAdBoost(): void {
    this.adIncomeBoostUntil = Date.now() + AD_BOOST_DURATION_MS
    this.emit({ type: 'ad_boost', until: this.adIncomeBoostUntil })
  }

  isAdBoostActive(): boolean {
    return Date.now() < this.adIncomeBoostUntil
  }

  adBoostRemainingMs(): number {
    return Math.max(0, this.adIncomeBoostUntil - Date.now())
  }

  activateShopBoost(): void {
    this.shopBoostUntil = Date.now() + 15 * 60_000
    this.emit({ type: 'ad_boost', until: this.shopBoostUntil })
  }

  isShopBoostActive(): boolean {
    return Date.now() < this.shopBoostUntil
  }

  shopBoostRemainingMs(): number {
    return Math.max(0, this.shopBoostUntil - Date.now())
  }

  activateUpgradeDiscount(): void {
    this.upgradeDiscountActive = true
  }

  incrementAdvisorBuy(): void {
    this.advisorBuys++
    this.checkAchievements()
  }

  buyUndergroundTreeNode(nodeId: string): boolean {
    const node = treeNodeDef(nodeId)
    if (!node) return false
    const level = this.undergroundTree[nodeId] ?? 0
    if (level >= node.maxLevel) return false
    const cost = treeNodeCost(node, level)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.undergroundTree[nodeId] = level + 1
    this.emit({ type: 'underground_action', actionId: nodeId })
    this.emit({ type: 'money_changed' })
    return true
  }

  marketNewsStockTickerId(): string | null {
    const n = this.activeMarketNewsDef()
    if (!n) return null
    if (n.id === 'bull' || n.id === 'bear' || n.id === 'crypto') return 'tech'
    if (n.id === 'logistics') return 'industrial'
    if (n.id === 'ecom') return 'tech'
    return null
  }

  claimDailyReward(): number {
    const today = todayKey()
    if (this.dailyLastClaim === today) return 0
    const yesterday = yesterdayKey()
    const streakBroken = this.dailyLastClaim !== null && this.dailyLastClaim !== yesterday
    if (this.dailyLastClaim === yesterday) {
      this.dailyStreak = Math.min(this.dailyStreak + 1, 30)
    } else {
      this.dailyStreak = 1
    }
    this.dailyLastClaim = today
    let amount = Math.max(100 * this.dailyStreak, this.incomePerDay() * this.dailyStreak)
    for (const ms of STREAK_MILESTONES) {
      if (this.dailyStreak >= ms && !this.streakMilestonesClaimed.includes(ms)) {
        this.streakMilestonesClaimed.push(ms)
        amount += ms * 1000
        this.awardBadge(`streak_${ms}`)
        this.triggerStoryBeat(`streak_${ms}`)
      }
    }
    this.addMoney(amount)
    this.updateMissionProgress('claim_daily', 1)
    this.emit({ type: 'daily_reward', amount, streak: this.dailyStreak })
    if (streakBroken && this.dailyStreak === 1) {
      // streak was reset — UI shows warning via peekDailyStreakReset before claim
    }
    this.checkAchievements()
    return amount
  }

  canClaimDaily(): boolean {
    return this.dailyLastClaim !== todayKey()
  }

  openLuckyChest(): number {
    if (!this.luckyChestReady) return 0
    this.luckyChestReady = false
    const amount = Math.max(500, this.incomePerDay() * 2)
    this.addMoney(amount)
    this.emit({ type: 'chest_opened', amount })
    return amount
  }

  incrementRewardedAdCount(): void {
    const today = todayKey()
    if (this.rewardedAdsDay !== today) {
      this.rewardedAdsDay = today
      this.rewardedAdsToday = 0
    }
    this.rewardedAdsToday++
  }

  ensureMissions(): void {
    const today = todayKey()
    if (this.missionsDay === today && this.missions.length > 0) return
    this.missionsDay = today
    this.missions = generateDailyMissions(today)
    this.sessionEarned = 0
    this.businessesBoughtSession = 0
    this.upgradesBoughtSession = 0
  }

  private updateMissionProgress(type: MissionProgress['type'], amount: number): void {
    this.ensureMissions()
    for (const m of this.missions) {
      if (m.claimed || m.type !== type) continue
      m.progress = Math.min(m.target, m.progress + amount)
      if (this.ownerFlag('instant_missions')) m.progress = m.target
      if (m.progress >= m.target) {
        this.emit({ type: 'mission_complete', mission: m })
      }
    }
  }

  claimMission(missionId: string, doubleWithAd = false): number {
    const m = this.missions.find((x) => x.id === missionId)
    if (!m || m.claimed || m.progress < m.target) return 0
    m.claimed = true
    let reward = 0
    if (m.rewardMoney > 0) {
      reward = m.rewardMoney * (doubleWithAd ? 2 : 1)
      this.addMoney(reward)
    }
    if (m.rewardBoostMinutes > 0) {
      this.adIncomeBoostUntil = Date.now() + m.rewardBoostMinutes * 60_000 * (doubleWithAd ? 2 : 1)
      this.emit({ type: 'ad_boost', until: this.adIncomeBoostUntil })
    }
    this.addSeasonXp(50)
    return reward
  }

  hireManager(producerId: string, withDiscount = false): boolean {
    if (hasManager(this.managers, producerId)) return false
    const def = PRODUCERS.find((p) => p.id === producerId)
    if (!def) return false
    const owned = this.producers[producerId] ?? 0
    if (owned <= 0) return false
    let cost = managerCost(def.baseIncome, owned)
    const treeDisc = managerCostDiscount(this.prestigeTree)
    if (withDiscount || this.managerDiscountActive) cost = Math.floor(cost * 0.5)
    else if (treeDisc > 0) cost = Math.floor(cost * (1 - treeDisc))
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.managers[producerId] = true
    this.managerDiscountActive = false
    this.emit({ type: 'manager_hired', producerId })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  activateManagerDiscount(): void {
    this.managerDiscountActive = true
  }

  stockBuy(tickerId: string, shares: number): boolean {
    const { cost, bought } = buyShares(this.stock, tickerId, shares, this.money)
    if (bought <= 0) return false
    this.money -= cost
    this.emit({ type: 'stock_trade', action: 'buy', amount: bought })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  stockSell(tickerId: string, shares: number): boolean {
    const { revenue, sold } = sellShares(this.stock, tickerId, shares)
    if (sold <= 0) return false
    this.addMoney(revenue)
    this.emit({ type: 'stock_trade', action: 'sell', amount: sold })
    return true
  }

  activateStockHint(hours = 1): void {
    if (freeStockHint(this.prestigeTree)) {
      this.stock.trendHintUntil = Date.now() + hours * 3600_000
      return
    }
    this.stock.trendHintUntil = Date.now() + hours * 3600_000
  }

  isStockHintFree(): boolean {
    return freeStockHint(this.prestigeTree)
  }

  claimWeeklyReward(doubleWithAd = false): number {
    this.ensureWeekly()
    if (this.weekly.claimed || this.weekly.progress < this.weekly.target) return 0
    this.weekly.claimed = true
    if (doubleWithAd) this.weekly.adDoubled = true
    const reward = Math.max(1000, this.incomePerDay() * 2) * (doubleWithAd ? 2 : 1)
    this.addMoney(reward)
    return reward
  }

  doubleWeeklyWithAd(): void {
    this.weekly.adDoubled = true
  }

  ownerGrantMoney(amount: number): void {
    this.addMoney(amount)
  }

  ownerClearHeat(): void {
    this.illegalHeat = 0
    this.heatWasCritical = false
    this.emit({ type: 'illegal_heat', heat: 0 })
  }

  ownerUnlockAllBusinesses(): void {
    for (const p of PRODUCERS) {
      if ((this.producers[p.id] ?? 0) < 1) {
        this.producers[p.id] = 1
        if (!this.codexUnlockDates[p.id]) this.codexUnlockDates[p.id] = todayKey()
      }
    }
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
  }

  ownerUnlockAllUpgrades(): void {
    for (const u of UPGRADES) this.purchasedUpgrades.add(u.id)
    this.emit({ type: 'money_changed' })
  }

  ownerMaxSeason(): void {
    this.ensureSeason()
    this.season.xp = xpForTier(SEASON_MAX_TIER)
    this.emit({ type: 'season_updated', xp: this.season.xp, tier: SEASON_MAX_TIER })
  }

  ownerCompleteWeekly(): void {
    this.ensureWeekly()
    this.weekly.progress = this.weekly.target
    this.emit({ type: 'weekly_updated', progress: this.weekly.progress, target: this.weekly.target })
  }

  ownerResetDailyClaim(): void {
    this.dailyLastClaim = null
  }

  ownerTriggerSurpriseInvestor(): void {
    this.surpriseInvestorUntil = Date.now() + 30_000
    this.emit({ type: 'surprise_investor', until: this.surpriseInvestorUntil })
  }

  getWeeklyEventDef() {
    this.ensureWeekly()
    return getWeeklyDef(this.weekly)
  }

  resetProgress(): void {
    this.money = 0
    this.totalEarned = 0
    this.totalClicks = 0
    this.producers = {}
    for (const p of PRODUCERS) {
      this.producers[p.id] = 0
      this.managers[p.id] = false
    }
    this.purchasedUpgrades.clear()
    this.prestigePoints = 0
    this.lifetimePrestige = 0
    this.ipoCount = 0
    this.lifetimeTotalEarned = 0
    this.research = {}
    for (const r of RESEARCH_NODES) this.research[r.id] = 0
    this.achievements.clear()
    this.missions = []
    this.missionsDay = ''
    this.comboBest = 0
    this.stock = createStockState()
    this.weekly = createWeeklyState()
    this.milestonesReached = []
    this.playTimeMs = 0
    this.tutorialDone = false
    this.dailyGoalEarned = 0
    this.dailyGoalDay = dailyGoalDayKey()
    this.dailyGoalClaimed = false
    this.season = createSeasonState()
    this.prestigeTree = {}
    this.managerAutoBuy = {}
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.nightEarningsSession = 0
    this.forcedUnlocks.clear()
    this.illegalHeat = 0
    this.unlockedThemes = new Set(['default'])
    this.activeTheme = 'default'
    this.codexUnlockDates = {}
    this.undergroundCooldowns = {}
    this.heatShieldUntil = 0
    this.heatProtectionUntil = 0
    this.launderingUntil = 0
    this.comebackPending = 0
    this.comebackClaimedDay = null
    this.comebackClaimed = false
    this.surpriseInvestorUntil = 0
    this.surpriseInvestorDay = ''
    this.seenStoryBeats.clear()
    this.earnedBadges.clear()
    this.streakMilestonesClaimed = []
    this.emit({ type: 'money_changed' })
  }

  private checkAchievements(): void {
    const ctx = {
      totalEarned: this.totalEarned,
      totalClicks: this.totalClicks,
      comboBest: this.comboBest,
      prestigePoints: this.prestigePoints,
      producers: this.producers,
      achievements: this.achievements,
      lifetimePrestige: this.lifetimePrestige,
      lifetimeTotalEarned: this.lifetimeTotalEarned,
      ipoCount: this.ipoCount,
      managers: this.managers,
      stockShares: totalShares(this.stock),
      weeklyClaimed: this.weekly.claimed,
      seasonTier: currentTier(this.season.xp),
      prestigeTreeCount: ownedNodeCount(this.prestigeTree),
      stockTickerCount: ownedTickerCount(this.stock),
      nightEarnings: this.nightEarningsSession,
      managerAutoBuyCount: this.managerAutoBuyCount(),
      dailyStreak: this.dailyStreak,
      comebackClaimed: this.comebackClaimed,
      heatSurvived: this.heatSurvived,
      unlockedThemes: [...this.unlockedThemes],
      undergroundLawyerUsed: this.undergroundLawyerUsed,
      dynastyMarried: !!this.dynasty.spouseName,
      advisorBuys: this.advisorBuys,
    }
    const newOnes = checkNewAchievements(ctx)
    for (const a of newOnes) {
      this.achievements.add(a.id)
      this.addMoney(a.reward)
      this.emit({ type: 'achievement', def: a })
    }
  }

  toJSON(): SerializableState {
    return {
      money: this.money,
      totalEarned: this.totalEarned,
      totalClicks: this.totalClicks,
      producers: { ...this.producers },
      purchasedUpgrades: [...this.purchasedUpgrades],
      prestigePoints: this.prestigePoints,
      lifetimePrestige: this.lifetimePrestige,
      lastSaveTime: Date.now(),
      dailyLastClaim: this.dailyLastClaim,
      dailyStreak: this.dailyStreak,
      adIncomeBoostUntil: this.adIncomeBoostUntil,
      rewardedAdsToday: this.rewardedAdsToday,
      rewardedAdsDay: this.rewardedAdsDay,
      luckyChestReady: this.luckyChestReady,
      research: { ...this.research },
      achievements: [...this.achievements],
      missions: this.missions.map((m) => ({ ...m })),
      missionsDay: this.missionsDay,
      comboBest: this.comboBest,
      eventsSeen: this.eventsSeen,
      sessionEarned: this.sessionEarned,
      businessesBoughtSession: this.businessesBoughtSession,
      upgradesBoughtSession: this.upgradesBoughtSession,
      eventBoostUntil: this.eventBoostUntil,
      playTimeMs: this.playTimeMs,
      gameTimeMs: this.gameTimeMs,
      tutorialDone: this.tutorialDone,
      ipoCount: this.ipoCount,
      lifetimeTotalEarned: this.lifetimeTotalEarned,
      managers: { ...this.managers },
      stock: { ...this.stock },
      weekly: { ...this.weekly },
      milestonesReached: [...this.milestonesReached],
      managerDiscountActive: this.managerDiscountActive,
      dailyGoalEarned: this.dailyGoalEarned,
      dailyGoalDay: this.dailyGoalDay,
      dailyGoalClaimed: this.dailyGoalClaimed,
      season: { ...this.season, claimedTiers: [...this.season.claimedTiers] },
      prestigeTree: { ...this.prestigeTree },
      managerAutoBuy: { ...this.managerAutoBuy },
      nightEarningsSession: this.nightEarningsSession,
      hapticsEnabled: this.hapticsEnabled,
      reducedMotion: this.reducedMotion,
      playerName: this.playerName,
      birthYear: this.birthYear,
      forcedUnlocks: [...this.forcedUnlocks],
      illegalHeat: this.illegalHeat,
      unlockedThemes: [...this.unlockedThemes],
      activeTheme: this.activeTheme,
      codexUnlockDates: { ...this.codexUnlockDates },
      undergroundCooldowns: { ...this.undergroundCooldowns },
      heatShieldUntil: this.heatShieldUntil,
      heatProtectionUntil: this.heatProtectionUntil,
      launderingUntil: this.launderingUntil,
      lastActiveAt: Date.now(),
      comebackClaimedDay: this.comebackClaimedDay,
      comebackPending: this.comebackPending,
      notificationPrefs: { ...this.notificationPrefs },
      surpriseInvestorUntil: this.surpriseInvestorUntil,
      surpriseInvestorDay: this.surpriseInvestorDay,
      seenStoryBeats: [...this.seenStoryBeats],
      earnedBadges: [...this.earnedBadges],
      raidsToday: this.raidsToday,
      raidsDay: this.raidsDay,
      heatWasCritical: this.heatWasCritical,
      heatSurvived: this.heatSurvived,
      undergroundLawyerUsed: this.undergroundLawyerUsed,
      comebackClaimed: this.comebackClaimed,
      streakMilestonesClaimed: [...this.streakMilestonesClaimed],
      dynasty: {
        ...this.dynasty,
        children: this.dynasty.children.map((c) => ({ ...c })),
      },
      activeMarketNews: this.activeMarketNews ? { ...this.activeMarketNews } : null,
      shopBoostUntil: this.shopBoostUntil,
      upgradeDiscountActive: this.upgradeDiscountActive,
      undergroundTree: { ...this.undergroundTree },
      advisorBuys: this.advisorBuys,
      empire: {
        football: this.empire.football.map((c) => ({ ...c })),
        politics: { ...this.empire.politics },
        darkIndustry: { ...this.empire.darkIndustry },
      },
      gameStartYear: this.gameStartYear,
    }
  }

  loadFrom(data: SerializableState): void {
    this.money = data.money
    this.totalEarned = data.totalEarned
    this.totalClicks = data.totalClicks
    this.producers = { ...data.producers }
    for (const p of PRODUCERS) {
      if (this.producers[p.id] === undefined) this.producers[p.id] = 0
    }
    this.purchasedUpgrades = new Set(data.purchasedUpgrades)
    this.prestigePoints = data.prestigePoints
    this.lifetimePrestige = data.lifetimePrestige
    this.dailyLastClaim = data.dailyLastClaim
    this.dailyStreak = data.dailyStreak
    this.adIncomeBoostUntil = data.adIncomeBoostUntil
    this.rewardedAdsToday = data.rewardedAdsToday
    this.rewardedAdsDay = data.rewardedAdsDay
    this.luckyChestReady = data.luckyChestReady
    this.research = { ...data.research }
    for (const r of RESEARCH_NODES) {
      if (this.research[r.id] === undefined) this.research[r.id] = 0
    }
    this.achievements = new Set(data.achievements ?? [])
    this.missions = data.missions ?? []
    this.missionsDay = data.missionsDay ?? ''
    this.comboBest = data.comboBest ?? 0
    this.eventsSeen = data.eventsSeen ?? 0
    this.sessionEarned = data.sessionEarned ?? 0
    this.businessesBoughtSession = data.businessesBoughtSession ?? 0
    this.upgradesBoughtSession = data.upgradesBoughtSession ?? 0
    this.eventBoostUntil = data.eventBoostUntil ?? 0
    this.playTimeMs = data.playTimeMs ?? 0
    this.gameTimeMs = data.gameTimeMs ?? 0
    this.tutorialDone = data.tutorialDone ?? false
    this.ipoCount = data.ipoCount ?? 0
    this.lifetimeTotalEarned = data.lifetimeTotalEarned ?? data.totalEarned ?? 0
    this.managers = { ...(data.managers ?? {}) }
    for (const p of PRODUCERS) {
      if (this.managers[p.id] === undefined) this.managers[p.id] = false
    }
    this.stock = data.stock && 'tickers' in data.stock
      ? structuredClone(data.stock)
      : migrateLegacyStock((data.stock ?? {}) as { price?: number; shares?: number; avgBuyPrice?: number })
    this.weekly = data.weekly ? { ...data.weekly } : createWeeklyState()
    this.milestonesReached = data.milestonesReached ?? []
    this.managerDiscountActive = data.managerDiscountActive ?? false
    this.dailyGoalEarned = data.dailyGoalEarned ?? 0
    this.dailyGoalDay = data.dailyGoalDay ?? dailyGoalDayKey()
    this.dailyGoalClaimed = data.dailyGoalClaimed ?? false
    this.season = data.season ? { ...data.season, claimedTiers: [...(data.season.claimedTiers ?? [])] } : createSeasonState()
    this.prestigeTree = { ...(data.prestigeTree ?? {}) }
    this.managerAutoBuy = { ...(data.managerAutoBuy ?? {}) }
    for (const p of PRODUCERS) {
      if (this.managerAutoBuy[p.id] === undefined) this.managerAutoBuy[p.id] = false
    }
    this.nightEarningsSession = data.nightEarningsSession ?? 0
    this.hapticsEnabled = data.hapticsEnabled ?? true
    this.reducedMotion = data.reducedMotion ?? false
    this.playerName = data.playerName ?? 'Baron'
    this.birthYear = data.birthYear ?? 0
    this.forcedUnlocks = new Set(data.forcedUnlocks ?? [])
    this.illegalHeat = data.illegalHeat ?? 0
    this.unlockedThemes = new Set(data.unlockedThemes ?? ['default'])
    this.activeTheme = (data.activeTheme ?? 'default') as ThemeId
    this.codexUnlockDates = { ...(data.codexUnlockDates ?? {}) }
    this.undergroundCooldowns = { ...(data.undergroundCooldowns ?? {}) }
    this.heatShieldUntil = data.heatShieldUntil ?? 0
    this.heatProtectionUntil = data.heatProtectionUntil ?? 0
    this.launderingUntil = data.launderingUntil ?? 0
    this.lastActiveAt = data.lastActiveAt ?? Date.now()
    this.comebackClaimedDay = data.comebackClaimedDay ?? null
    this.comebackPending = data.comebackPending ?? 0
    this.notificationPrefs = data.notificationPrefs ?? { dailyReward: true, passiveIncome: true, goalNear: true }
    this.surpriseInvestorUntil = data.surpriseInvestorUntil ?? 0
    this.surpriseInvestorDay = data.surpriseInvestorDay ?? ''
    this.seenStoryBeats = new Set(data.seenStoryBeats ?? [])
    this.earnedBadges = new Set(data.earnedBadges ?? [])
    this.raidsToday = data.raidsToday ?? 0
    this.raidsDay = data.raidsDay ?? todayKey()
    this.heatWasCritical = data.heatWasCritical ?? false
    this.heatSurvived = data.heatSurvived ?? false
    this.undergroundLawyerUsed = data.undergroundLawyerUsed ?? false
    this.comebackClaimed = data.comebackClaimed ?? false
    this.streakMilestonesClaimed = data.streakMilestonesClaimed ?? []
    this.dynasty = data.dynasty
      ? { ...data.dynasty, children: [...(data.dynasty.children ?? [])] }
      : createDynastyState()
    this.activeMarketNews = data.activeMarketNews ?? null
    this.shopBoostUntil = data.shopBoostUntil ?? 0
    this.upgradeDiscountActive = data.upgradeDiscountActive ?? false
    this.undergroundTree = data.undergroundTree ?? createUndergroundTreeState()
    this.advisorBuys = data.advisorBuys ?? 0
    this.empire = data.empire
      ? {
          football: [...(data.empire.football ?? [])],
          politics: { ...(data.empire.politics ?? createEmpireState().politics) },
          darkIndustry: { ...(data.empire.darkIndustry ?? createEmpireState().darkIndustry) },
        }
      : createEmpireState()
    this.gameStartYear = data.gameStartYear ?? 2026
    syncEmpireFromProducers(this.empire, this.producers)
    if (this.dynasty.children.length > 0) {
      for (const c of this.dynasty.children) {
        if (c.educationXp === undefined) c.educationXp = 0
      }
    }
    this.lastSaveTime = data.lastSaveTime
    this.isNight = isGameNight(this.gameTimeMs)
    this.ensureDailyGoal()
    this.ensureMissions()
    this.ensureWeekly()
    this.ensureSeason()
  }
}

export { PRESTIGE_THRESHOLD }

function todayKey(): string {
  return localDayKey()
}

function yesterdayKey(): string {
  return yesterdayLocalKey()
}
