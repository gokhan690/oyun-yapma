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
} from './PrestigeTree'
import { localDayKey, yesterdayLocalKey, isNightHour } from './dateUtils'
import {
  createWeeklyState,
  getWeeklyDef,
  weekKey,
  type WeeklyEventState,
} from './WeeklyEvent'
import { DAILY_GOAL_TARGET, dailyGoalDayKey } from './DailyGoal'

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
}

export interface ProducerBreakdown {
  name: string
  owned: number
  basePerUnit: number
  lines: { label: string; value: string }[]
  totalPerSec: number
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
  | { type: 'season_updated'; xp: number; tier: number }
  | { type: 'season_claimed'; tier: number; reward: string }
  | { type: 'prestige_tree'; nodeId: string }
  | { type: 'market_event'; crash: boolean }
  | { type: 'auto_buy'; producerId: string }
  | { type: 'nav_changed'; view: string }
  | { type: 'illegal_raid'; fine: number; producerId: string }
  | { type: 'producer_unlocked'; producerId: string }
  | { type: 'illegal_heat'; heat: number }

const MILESTONE_THRESHOLDS = [100_000, 1_000_000, 10_000_000]
const CRIT_CHANCE = 0.1
const CRIT_MULT = 10
const BASE_CLICK = 1
const BASE_OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
const AD_BOOST_DURATION_MS = 5 * 60 * 1000
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
  isNight = isNightHour(new Date().getHours())
  playerName = 'Baron'
  birthYear = 0
  forcedUnlocks = new Set<string>()
  illegalHeat = 0
  private lastIllegalRiskCheck = 0
  private lastHeatTick = 0

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

  private listeners = new Set<(event: GameEvent) => void>()
  private tickHandle: number | null = null

  constructor() {
    for (const p of PRODUCERS) this.producers[p.id] = 0
    for (const r of RESEARCH_NODES) this.research[r.id] = 0
    for (const p of PRODUCERS) this.managers[p.id] = false
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.ensureMissions()
    this.ensureWeekly()
  }

  ensureSeason(): void {
    const key = seasonWeekKey()
    if (this.season.weekKey !== key) {
      this.season = createSeasonState()
    }
  }

  ensureWeekly(): void {
    if (this.weekly.weekKey !== weekKey()) {
      this.weekly = createWeeklyState()
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
      this.updateComboDecay(now)
      this.tickStock(now)
      this.tickDayNight(now)
      this.tickAutoBuy(now)
      this.tickIllegalRisk(now)
      this.tickIllegalHeat(now)
      if (dt > 0 && dt < 1) {
        const income = this.incomePerSecond() * dt
        if (income > 0) {
          this.money += income
          if (this.isNight) this.nightEarningsSession += income
          if (now - lastPassiveEmit > 120) {
            lastPassiveEmit = now
            this.emit({ type: 'passive_income' })
          }
        }
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
      reward = Math.max(500, this.incomePerSecond() * 60 * event.rewardValue)
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
    if (now - this.lastDayNightCheck < 30_000) return
    this.lastDayNightCheck = now
    const night = isNightHour(new Date().getHours())
    if (night !== this.isNight) {
      this.isNight = night
      this.emit({ type: 'day_night', isNight: night })
    }
  }

  private tickIllegalHeat(now: number): void {
    if (now - this.lastHeatTick < 15_000) return
    this.lastHeatTick = now
    const target = this.targetIllegalHeat()
    const prev = this.illegalHeat
    if (Math.abs(target - this.illegalHeat) < 0.5) {
      this.illegalHeat = target
    } else {
      this.illegalHeat += (target - this.illegalHeat) * 0.15
    }
    if (target <= 0) this.illegalHeat = Math.max(0, this.illegalHeat - 2)
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
    return Math.min(100, types * 12 + owned * 4)
  }

  illegalRiskLabel(): string {
    if (this.illegalHeat < 25) return 'Düşük'
    if (this.illegalHeat < 55) return 'Orta'
    if (this.illegalHeat < 80) return 'Yüksek'
    return 'Kritik'
  }

  illegalIncomePerSecond(): number {
    return PRODUCERS.filter((p) => p.illegal).reduce((s, p) => s + this.producerIncome(p), 0)
  }

  legalIncomePerSecond(): number {
    return this.incomePerSecond() - this.illegalIncomePerSecond()
  }

  private tickIllegalRisk(now: number): void {
    if (now - this.lastIllegalRiskCheck < 60_000) return
    this.lastIllegalRiskCheck = now
    const heatMult = 1 + this.illegalHeat / 100
    for (const p of PRODUCERS) {
      if (!p.illegal || !p.riskChance) continue
      const owned = this.producers[p.id] ?? 0
      if (owned <= 0) continue
      const chance = Math.min(0.35, p.riskChance * heatMult)
      if (Math.random() > chance) continue
      const finePct = (p.riskFinePct ?? 0.15) * (0.8 + this.illegalHeat / 200)
      const fine = Math.floor(this.money * finePct)
      if (fine <= 0) continue
      this.money = Math.max(0, this.money - fine)
      this.illegalHeat = Math.min(100, this.illegalHeat + 20)
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

  globalMultiplier(): number {
    let mult = prestigeMultiplier(this.prestigePoints) * (1 + prestigeMultBonus(this.prestigeTree))
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'global_mult') mult *= u.value
    }
    if (Date.now() < this.adIncomeBoostUntil) mult *= 2
    if (this.getEventBoostActive()) mult *= 3
    mult *= 1 + globalSynergyBonus(this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= 1 + passiveBonus(this.prestigeTree)
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
    return def.baseIncome * owned * mult * this.passiveMultiplier()
  }

  incomePerSecond(): number {
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
    const bucketBefore = Math.floor(this.dailyGoalEarned / 100)
    this.dailyGoalEarned += amount
    const bucketAfter = Math.floor(this.dailyGoalEarned / 100)
    if (bucketBefore !== bucketAfter || this.dailyGoalEarned >= DAILY_GOAL_TARGET) {
      this.emit({ type: 'daily_goal_updated', earned: this.dailyGoalEarned, target: DAILY_GOAL_TARGET })
    }
  }

  claimDailyGoalReward(): number {
    this.ensureDailyGoal()
    if (this.dailyGoalClaimed || this.dailyGoalEarned < DAILY_GOAL_TARGET) return 0
    this.dailyGoalClaimed = true
    const reward = Math.max(500, this.incomePerSecond() * 60)
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
    lines.push({ label: 'Temel gelir', value: `${formatMoney(base)}/sn` })

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
      totalPerSec: this.producerIncome(def),
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
    return Math.floor(raw * (1 - producerCostDiscount(this.prestigeTree)) * (1 - efficiencyDiscount))
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
    const cost = Math.floor(def.cost * (1 - upgradeCostDiscount(this.prestigeTree)))
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.purchasedUpgrades.add(id)
    this.upgradesBoughtSession++
    this.updateMissionProgress('buy_upgrade', 1)
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
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
    }
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

  applyOfflineEarnings(lastSaveTime: number): number {
    const elapsed = Math.min(Date.now() - lastSaveTime, this.offlineCapMs())
    if (elapsed < 60_000) return 0
    const elapsedSec = elapsed / 1000
    let amount = 0
    for (const p of PRODUCERS) {
      let inc = this.producerIncome(p)
      if (hasManager(this.managers, p.id)) inc *= 1.5
      amount += inc * elapsedSec
    }
    if (amount <= 0) return 0
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

  claimDailyReward(): number {
    const today = todayKey()
    if (this.dailyLastClaim === today) return 0
    const yesterday = yesterdayKey()
    if (this.dailyLastClaim === yesterday) {
      this.dailyStreak = Math.min(this.dailyStreak + 1, 7)
    } else {
      this.dailyStreak = 1
    }
    this.dailyLastClaim = today
    const amount = Math.max(100 * this.dailyStreak, this.incomePerSecond() * 60 * this.dailyStreak)
    this.addMoney(amount)
    this.emit({ type: 'daily_reward', amount, streak: this.dailyStreak })
    return amount
  }

  canClaimDaily(): boolean {
    return this.dailyLastClaim !== todayKey()
  }

  openLuckyChest(): number {
    if (!this.luckyChestReady) return 0
    this.luckyChestReady = false
    const amount = Math.max(500, this.incomePerSecond() * 120)
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
    const reward = Math.max(1000, this.incomePerSecond() * 120) * (doubleWithAd ? 2 : 1)
    this.addMoney(reward)
    return reward
  }

  doubleWeeklyWithAd(): void {
    this.weekly.adDoubled = true
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
    this.lastSaveTime = data.lastSaveTime
    this.isNight = isNightHour(new Date().getHours())
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
