import type { GameState, SerializableState } from '../game/GameState'
import { migrateLegacyStock, migrateStockState, trimStockHistoryInPlace } from '../game/StockMarket'
import { createBankState } from '../game/FinanceBank'
import { createWeeklyState, scaledWeeklyTarget, WEEKLY_EARN_MIN } from '../game/WeeklyEvent'
import { createSeasonState, isLegacyGameSeasonKey } from '../game/SeasonPass'
import { createCampaignState } from '../game/Campaign'
import { dailyGoalDayKey } from '../game/DailyGoal'
import { createDynastyState } from '../game/Dynasty'
import { createEmpireState } from '../game/Empire'
import { createRivalsState } from '../game/Rivals'
import { REPUTATION_START } from '../game/Reputation'
import { PRODUCERS } from '../game/Economy'
import { RESEARCH_NODES } from '../game/Research'

const SAVE_KEY_V10 = 'is_imparatorlugu_save_v10'
const SAVE_KEY_V10_BACKUP = 'is_imparatorlugu_save_v10_backup'
const SAVE_KEY_V9 = 'is_imparatorlugu_save_v9'
const SAVE_KEY_V9_BACKUP = 'is_imparatorlugu_save_v9_backup'
const SAVE_KEY_V8 = 'is_imparatorlugu_save_v8'
const SAVE_KEY_V7 = 'is_imparatorlugu_save_v7'
const SAVE_KEY_V6 = 'is_imparatorlugu_save_v6'
const SAVE_KEY_V5 = 'is_imparatorlugu_save_v5'
const SAVE_KEY_V4 = 'is_imparatorlugu_save_v4'
const SAVE_KEY_V3 = 'is_imparatorlugu_save_v3'
const SAVE_KEY_V2 = 'is_imparatorlugu_save_v2'
const SAVE_KEY_V1 = 'para_tuzagi_save_v1'
const OBFUSCATION_KEY = 'PT2026x'
const CURRENT_VERSION = 10
const MAX_SAVE_BYTES = 4_000_000

interface SaveEnvelope {
  payload: string
  checksum: string
  version: number
}

type LegacyState = Partial<SerializableState> & {
  money: number
  totalEarned: number
  totalClicks: number
  producers: Record<string, number>
  purchasedUpgrades: string[]
  prestigePoints: number
  lifetimePrestige: number
  lastSaveTime: number
  stock?: SerializableState['stock'] | { price?: number; shares?: number; avgBuyPrice?: number }
}

export type LoadResult = { ok: boolean; lastSaveTime: number; source?: string; reason?: string }

export class SaveManager {
  private autoSaveInterval: number | null = null
  private saveEnabled = true

  save(state: GameState): void {
    if (!this.saveEnabled) return
    const data = state.toJSON()
    data.lastSaveTime = Date.now()
    this.writeSave(data, CURRENT_VERSION, SAVE_KEY_V10)
  }

  /** Yükleme başarısızken boş kaydın üzerine yazmayı engelle */
  setSaveEnabled(enabled: boolean): void {
    this.saveEnabled = enabled
  }

  hasBackup(): boolean {
    return !!localStorage.getItem(SAVE_KEY_V10_BACKUP)
  }

  hasAnySaveSlot(): boolean {
    return !!(
      localStorage.getItem(SAVE_KEY_V10)
      || localStorage.getItem(SAVE_KEY_V10_BACKUP)
      || localStorage.getItem(SAVE_KEY_V9)
      || localStorage.getItem(SAVE_KEY_V9_BACKUP)
      || localStorage.getItem(SAVE_KEY_V8)
      || localStorage.getItem(SAVE_KEY_V7)
      || localStorage.getItem(SAVE_KEY_V6)
      || localStorage.getItem(SAVE_KEY_V5)
    )
  }

  tryRestoreBackup(state: GameState): boolean {
    const r = this.tryLoadEnvelope(state, SAVE_KEY_V10_BACKUP, CURRENT_VERSION, false)
    if (r.ok) {
      this.save(state)
      return true
    }
    return false
  }

  load(state: GameState): LoadResult {
    const v10 = this.tryLoadEnvelope(state, SAVE_KEY_V10, CURRENT_VERSION, true)
    if (v10.ok) return { ...v10, source: 'v10' }

    const v10backup = this.tryLoadEnvelope(state, SAVE_KEY_V10_BACKUP, CURRENT_VERSION, false)
    if (v10backup.ok) {
      this.save(state)
      return { ...v10backup, source: 'backup' }
    }

    const v9 = this.tryLoadEnvelope(state, SAVE_KEY_V9, 9, true)
    if (v9.ok) {
      this.save(state)
      return { ...v9, source: 'v9_migrated' }
    }

    const v9backup = this.tryLoadEnvelope(state, SAVE_KEY_V9_BACKUP, 9, false)
    if (v9backup.ok) {
      this.save(state)
      return { ...v9backup, source: 'backup' }
    }

    const v8 = this.tryLoadEnvelope(state, SAVE_KEY_V8, 8, true)
    if (v8.ok) {
      this.save(state)
      return { ...v8, source: 'v8' }
    }

    const v7 = this.tryLoadEnvelope(state, SAVE_KEY_V7, 7, true)
    if (v7.ok) return { ...v7, source: 'v7' }

    const v6 = this.tryLoadEnvelope(state, SAVE_KEY_V6, 6, true)
    if (v6.ok) {
      this.save(state)
      return { ...v6, source: 'v6' }
    }

    const v5 = this.tryLoadEnvelope(state, SAVE_KEY_V5, 5, true)
    if (v5.ok) {
      this.save(state)
      return { ...v5, source: 'v5' }
    }

    const v4 = this.tryLoadMigrateV5(state, SAVE_KEY_V4)
    if (v4.ok) {
      this.save(state)
      return { ...v4, source: 'v4' }
    }

    const v3 = this.tryLoadMigrateV3(state, SAVE_KEY_V3)
    if (v3.ok) {
      this.save(state)
      return { ...v3, source: 'v3' }
    }

    const v2 = this.tryLoadMigrate(state, SAVE_KEY_V2, 2)
    if (v2.ok) {
      this.save(state)
      return { ...v2, source: 'v2' }
    }

    const v1 = this.tryLoadLegacyV1(state)
    if (v1.ok) {
      this.save(state)
      return { ...v1, source: 'v1' }
    }

    return { ok: false, lastSaveTime: Date.now(), reason: 'no_valid_save' }
  }

  clear(): void {
    localStorage.removeItem(SAVE_KEY_V10)
    localStorage.removeItem(SAVE_KEY_V10_BACKUP)
    localStorage.removeItem(SAVE_KEY_V9)
    localStorage.removeItem(SAVE_KEY_V9_BACKUP)
    localStorage.removeItem(SAVE_KEY_V8)
    localStorage.removeItem(SAVE_KEY_V7)
    localStorage.removeItem(SAVE_KEY_V6)
    localStorage.removeItem(SAVE_KEY_V5)
    localStorage.removeItem(SAVE_KEY_V4)
    localStorage.removeItem(SAVE_KEY_V3)
    localStorage.removeItem(SAVE_KEY_V2)
    localStorage.removeItem(SAVE_KEY_V1)
  }

  startAutoSave(state: GameState, intervalMs = 15_000): void {
    this.stopAutoSave()
    this.autoSaveInterval = window.setInterval(() => this.save(state), intervalMs)
    window.addEventListener('beforeunload', () => this.save(state))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save(state)
    })
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  /** Çocuğa / başka cihaza aktarmak için miras kodu */
  exportLegacyCode(state: GameState): string {
    const data = state.toJSON()
    data.lastSaveTime = Date.now()
    const json = JSON.stringify(data)
    const envelope: SaveEnvelope = {
      payload: obfuscate(json),
      checksum: computeChecksum(json),
      version: CURRENT_VERSION,
    }
    return btoa(JSON.stringify(envelope))
  }

  importLegacyCode(state: GameState, code: string): { ok: boolean; reason?: string } {
    try {
      const trimmed = code.trim()
      if (!trimmed) return { ok: false, reason: 'Kod boş' }
      const envelope = JSON.parse(atob(trimmed)) as SaveEnvelope
      if (!envelope.payload || !envelope.checksum) return { ok: false, reason: 'Geçersiz kod' }
      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) return { ok: false, reason: 'Kod bozuk' }
      const data = JSON.parse(json) as SerializableState
      if (!validateState(data)) return { ok: false, reason: 'Kayıt doğrulanamadı' }
      state.loadFrom({ ...data, lastSaveTime: Date.now() })
      this.save(state)
      return { ok: true }
    } catch {
      return { ok: false, reason: 'Kod okunamadı' }
    }
  }

  private tryLoadEnvelope(
    state: GameState,
    key: string,
    expectedVersion: number,
    strictVersion: boolean,
  ): LoadResult {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }
      if (raw.length > MAX_SAVE_BYTES) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'too_large' }
      }

      const envelope = JSON.parse(raw) as SaveEnvelope
      if (!envelope.payload || !envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'missing_payload' }
      }

      const json = deobfuscate(envelope.payload)
      if (json.length > MAX_SAVE_BYTES) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'too_large' }
      }
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'checksum' }
      }

      const parsed = JSON.parse(json) as SerializableState
      trimStockHistoryInPlace(parsed.stock)
      const data = repairState(applyV9Defaults(applyV5Defaults(parsed)))
      if (strictVersion && envelope.version !== expectedVersion) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'version' }
      }
      if (!validateState(data)) {
        return { ok: false, lastSaveTime: Date.now(), reason: 'validate' }
      }

      const lastSaveTime = sanitizeTimestamp(data.lastSaveTime)
      try {
        state.loadFrom({ ...data, lastSaveTime })
      } catch (loadErr) {
        console.warn('Kayıt uygulama hatası:', key, loadErr)
        return { ok: false, lastSaveTime: Date.now(), reason: 'load_apply' }
      }
      return { ok: true, lastSaveTime }
    } catch (err) {
      console.warn('Kayıt okuma hatası:', key, err)
      return { ok: false, lastSaveTime: Date.now(), reason: 'parse' }
    }
  }

  private tryLoadMigrateV5(state: GameState, key: string): { ok: boolean; lastSaveTime: number } {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }

      const envelope = JSON.parse(raw) as SaveEnvelope
      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const legacy = JSON.parse(json) as SerializableState
      const migrated = applyV5Defaults(legacy)
      migrated.lastSaveTime = sanitizeTimestamp(legacy.lastSaveTime)
      state.loadFrom(migrated)
      return { ok: true, lastSaveTime: migrated.lastSaveTime }
    } catch {
      return { ok: false, lastSaveTime: Date.now() }
    }
  }

  private tryLoadMigrateV3(state: GameState, key: string): { ok: boolean; lastSaveTime: number } {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }

      const envelope = JSON.parse(raw) as SaveEnvelope
      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const legacy = JSON.parse(json) as LegacyState
      const migrated = applyV5Defaults(applyV4Defaults(applyV3Defaults(legacy)))
      migrated.lastSaveTime = sanitizeTimestamp(legacy.lastSaveTime)
      state.loadFrom(migrated)
      return { ok: true, lastSaveTime: migrated.lastSaveTime }
    } catch {
      return { ok: false, lastSaveTime: Date.now() }
    }
  }

  private tryLoadMigrate(
    state: GameState,
    key: string,
    version: number,
  ): { ok: boolean; lastSaveTime: number } {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }

      const envelope = JSON.parse(raw) as SaveEnvelope
      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const legacy = JSON.parse(json) as LegacyState
      const migrated = applyV5Defaults(applyV4Defaults(applyV3Defaults(legacy)))
      migrated.lastSaveTime = sanitizeTimestamp(legacy.lastSaveTime)
      state.loadFrom(migrated)
      void version
      return { ok: true, lastSaveTime: migrated.lastSaveTime }
    } catch {
      return { ok: false, lastSaveTime: Date.now() }
    }
  }

  private tryLoadLegacyV1(state: GameState): { ok: boolean; lastSaveTime: number } {
    try {
      const raw = localStorage.getItem(SAVE_KEY_V1)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }

      const envelope = JSON.parse(raw) as SaveEnvelope
      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const legacy = JSON.parse(json) as LegacyState
      const migrated = applyV5Defaults(applyV4Defaults(applyV3Defaults(legacy)))
      migrated.lastSaveTime = sanitizeTimestamp(legacy.lastSaveTime)
      state.loadFrom(migrated)
      return { ok: true, lastSaveTime: migrated.lastSaveTime }
    } catch {
      return { ok: false, lastSaveTime: Date.now() }
    }
  }

  private writeSave(data: SerializableState, version: number, key: string): void {
    const json = JSON.stringify(data)
    const envelope: SaveEnvelope = {
      payload: obfuscate(json),
      checksum: computeChecksum(json),
      version,
    }
    try {
      const prev = localStorage.getItem(key)
      if (prev && key === SAVE_KEY_V10) {
        localStorage.setItem(SAVE_KEY_V10_BACKUP, prev)
      }
      localStorage.setItem(key, JSON.stringify(envelope))
    } catch {
      // storage full
    }
  }
}

function repairState(state: SerializableState): SerializableState {
  const s = { ...state }
  s.money = sanitizeNum(s.money, 0)
  s.totalEarned = sanitizeNum(s.totalEarned, 0)
  s.totalClicks = sanitizeNum(s.totalClicks, 0)
  s.prestigePoints = sanitizeNum(s.prestigePoints, 0)
  s.lifetimePrestige = sanitizeNum(s.lifetimePrestige, 0)
  s.lifetimeTotalEarned = sanitizeNum(s.lifetimeTotalEarned, s.totalEarned)
  s.playTimeMs = sanitizeNum(s.playTimeMs, 0)
  s.gameTimeMs = sanitizeNum(s.gameTimeMs, 0)
  s.dailyGoalEarned = sanitizeNum(s.dailyGoalEarned, 0)
  s.lastSaveTime = sanitizeNum(s.lastSaveTime, Date.now())

  const producers: Record<string, number> = {}
  for (const [id, v] of Object.entries(s.producers ?? {})) {
    producers[id] = sanitizeNum(v, 0)
  }
  s.producers = producers

  if (s.weekly) {
    const ipdGuess = Math.max(1, s.totalEarned > 0 ? s.totalEarned / 1000 : WEEKLY_EARN_MIN)
    s.weekly = {
      ...s.weekly,
      progress: sanitizeNum(s.weekly.progress, 0),
      target: Math.max(WEEKLY_EARN_MIN, sanitizeNum(s.weekly.target, scaledWeeklyTarget(ipdGuess))),
      claimed: !!s.weekly.claimed,
      adDoubled: !!s.weekly.adDoubled,
    }
  } else {
    s.weekly = createWeeklyState(Math.max(1, s.totalEarned > 0 ? s.totalEarned / 1000 : 0))
  }

  if (s.season) {
    s.season = {
      weekKey: s.season.weekKey ?? createSeasonState().weekKey,
      xp: sanitizeNum(s.season.xp, 0),
      claimedTiers: Array.isArray(s.season.claimedTiers) ? s.season.claimedTiers.filter((n) => typeof n === 'number') : [],
      claimedPremiumTiers: Array.isArray(s.season.claimedPremiumTiers) ? s.season.claimedPremiumTiers.filter((n) => typeof n === 'number') : [],
      premiumUnlocked: !!s.season.premiumUnlocked,
      adXpDoubled: !!s.season.adXpDoubled,
    }
    if (isLegacyGameSeasonKey(s.season.weekKey)) {
      s.season.weekKey = createSeasonState().weekKey
    }
  } else {
    s.season = createSeasonState()
  }

  if (!Array.isArray(s.purchasedUpgrades)) s.purchasedUpgrades = []
  if (!s.research || typeof s.research !== 'object') s.research = {}
  s.playerGender = s.playerGender === 'female' ? 'female' : 'male'
  if (!s.stock || typeof s.stock !== 'object') {
    s.stock = migrateLegacyStock({})
  } else if ('tickers' in s.stock) {
    trimStockHistoryInPlace(s.stock)
    s.stock = migrateStockState(s.stock)
  }
  if (!s.bank || typeof s.bank !== 'object') {
    s.bank = createBankState()
  }
  if (typeof s.dailyGoalTargetSnapshot !== 'number') s.dailyGoalTargetSnapshot = 0
  if (typeof s.dailyGoalRewardSnapshot !== 'number') s.dailyGoalRewardSnapshot = 0
  if (s.weekly && typeof s.weekly === 'object' && typeof s.weekly.rewardCash !== 'number') {
    s.weekly.rewardCash = 0
  }

  s.chestPityCounter = sanitizeNum(s.chestPityCounter, 0)
  s.chestTickets = sanitizeNum(s.chestTickets, 0)
  if (!s.campaign || typeof s.campaign !== 'object') {
    s.campaign = createCampaignState()
  } else {
    s.campaign = {
      chapterId: sanitizeNum(s.campaign.chapterId, 1),
      stepIndex: sanitizeNum(s.campaign.stepIndex, 0),
      stepProgress: sanitizeNum(s.campaign.stepProgress, 0),
      completedChapters: Array.isArray(s.campaign.completedChapters)
        ? s.campaign.completedChapters.filter((n) => typeof n === 'number')
        : [],
    }
  }
  if (s.notificationPrefs && typeof s.notificationPrefs === 'object') {
    s.notificationPrefs = {
      dailyReward: s.notificationPrefs.dailyReward !== false,
      passiveIncome: s.notificationPrefs.passiveIncome !== false,
      goalNear: s.notificationPrefs.goalNear !== false,
      webPush: !!s.notificationPrefs.webPush,
    }
  }

  return s
}

function sanitizeNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

function applyV3Defaults(legacy: LegacyState): SerializableState {
  const managers: Record<string, boolean> = {}
  for (const p of PRODUCERS) managers[p.id] = legacy.managers?.[p.id] ?? false

  const research: Record<string, number> = {}
  for (const r of RESEARCH_NODES) research[r.id] = legacy.research?.[r.id] ?? 0

  const stockLegacy = legacy.stock
  const stock = stockLegacy && 'tickers' in stockLegacy
    ? stockLegacy
    : migrateLegacyStock((stockLegacy ?? {}) as { price?: number; shares?: number; avgBuyPrice?: number })

  return {
    money: legacy.money,
    totalEarned: legacy.totalEarned,
    totalClicks: legacy.totalClicks,
    producers: legacy.producers ?? {},
    purchasedUpgrades: legacy.purchasedUpgrades ?? [],
    prestigePoints: legacy.prestigePoints ?? 0,
    lifetimePrestige: legacy.lifetimePrestige ?? 0,
    lastSaveTime: legacy.lastSaveTime ?? Date.now(),
    dailyLastClaim: legacy.dailyLastClaim ?? null,
    dailyStreak: legacy.dailyStreak ?? 0,
    adIncomeBoostUntil: legacy.adIncomeBoostUntil ?? 0,
    rewardedAdsToday: legacy.rewardedAdsToday ?? 0,
    rewardedAdsDay: legacy.rewardedAdsDay ?? new Date().toISOString().slice(0, 10),
    luckyChestReady: legacy.luckyChestReady ?? false,
    research,
    achievements: legacy.achievements ?? [],
    missions: legacy.missions ?? [],
    missionsDay: legacy.missionsDay ?? '',
    comboBest: legacy.comboBest ?? 0,
    eventsSeen: legacy.eventsSeen ?? 0,
    sessionEarned: legacy.sessionEarned ?? 0,
    businessesBoughtSession: legacy.businessesBoughtSession ?? 0,
    upgradesBoughtSession: legacy.upgradesBoughtSession ?? 0,
    eventBoostUntil: legacy.eventBoostUntil ?? 0,
    playTimeMs: legacy.playTimeMs ?? 0,
    gameTimeMs: legacy.gameTimeMs ?? 0,
    tutorialDone: legacy.tutorialDone ?? false,
    ipoCount: legacy.ipoCount ?? legacy.lifetimePrestige ?? 0,
    lifetimeTotalEarned: legacy.lifetimeTotalEarned ?? legacy.totalEarned ?? 0,
    managers,
    stock: migrateStockState(stock && 'tickers' in stock ? stock : migrateLegacyStock({})),
    bank: createBankState(),
    weekly: legacy.weekly ?? createWeeklyState(),
    milestonesReached: legacy.milestonesReached ?? [],
    managerDiscountActive: legacy.managerDiscountActive ?? false,
    dailyGoalEarned: legacy.dailyGoalEarned ?? 0,
    dailyGoalDay: legacy.dailyGoalDay ?? dailyGoalDayKey(),
    dailyGoalClaimed: legacy.dailyGoalClaimed ?? false,
    dailyGoalTargetSnapshot: 0,
    dailyGoalRewardSnapshot: 0,
    season: legacy.season ?? createSeasonState(),
    prestigeTree: legacy.prestigeTree ?? {},
    managerAutoBuy: legacy.managerAutoBuy ?? {},
    nightEarningsSession: legacy.nightEarningsSession ?? 0,
    hapticsEnabled: legacy.hapticsEnabled ?? true,
    reducedMotion: legacy.reducedMotion ?? false,
    playerName: legacy.playerName ?? 'Baron',
    birthYear: legacy.birthYear ?? 0,
    playerGender: 'male',
    forcedUnlocks: legacy.forcedUnlocks ?? [],
    illegalHeat: legacy.illegalHeat ?? 0,
    unlockedThemes: legacy.unlockedThemes ?? ['default'],
    activeTheme: legacy.activeTheme ?? 'default',
    codexUnlockDates: legacy.codexUnlockDates ?? {},
    undergroundCooldowns: legacy.undergroundCooldowns ?? {},
    heatShieldUntil: legacy.heatShieldUntil ?? 0,
    heatProtectionUntil: legacy.heatProtectionUntil ?? 0,
    launderingUntil: legacy.launderingUntil ?? 0,
    lastActiveAt: legacy.lastActiveAt ?? Date.now(),
    comebackClaimedDay: legacy.comebackClaimedDay ?? null,
    comebackPending: legacy.comebackPending ?? 0,
    notificationPrefs: legacy.notificationPrefs ?? { dailyReward: true, passiveIncome: true, goalNear: true, webPush: false },
    surpriseInvestorUntil: legacy.surpriseInvestorUntil ?? 0,
    surpriseInvestorDay: legacy.surpriseInvestorDay ?? '',
    seenStoryBeats: legacy.seenStoryBeats ?? [],
    earnedBadges: legacy.earnedBadges ?? [],
    raidsToday: legacy.raidsToday ?? 0,
    raidsDay: legacy.raidsDay ?? new Date().toISOString().slice(0, 10),
    heatWasCritical: legacy.heatWasCritical ?? false,
    heatSurvived: legacy.heatSurvived ?? false,
    undergroundLawyerUsed: legacy.undergroundLawyerUsed ?? false,
    comebackClaimed: legacy.comebackClaimed ?? false,
    streakMilestonesClaimed: legacy.streakMilestonesClaimed ?? [],
    dynasty: legacy.dynasty ?? createDynastyState(),
    activeMarketNews: legacy.activeMarketNews ?? null,
    shopBoostUntil: legacy.shopBoostUntil ?? 0,
    upgradeDiscountActive: legacy.upgradeDiscountActive ?? false,
    undergroundTree: legacy.undergroundTree ?? {},
    advisorBuys: legacy.advisorBuys ?? 0,
    empire: legacy.empire ?? createEmpireState(),
    gameStartYear: legacy.gameStartYear ?? 2026,
    pendingBoosts: [],
    chestPityCounter: legacy.chestPityCounter ?? 0,
    chestTickets: legacy.chestTickets ?? 0,
    campaign: legacy.campaign ?? createCampaignState(),
  }
}

function applyV9Defaults(state: SerializableState): SerializableState {
  let stock = state.stock
  if (!stock || !('tickers' in stock)) {
    stock = migrateLegacyStock((stock ?? {}) as { price?: number; shares?: number; avgBuyPrice?: number })
  } else {
    stock = migrateStockState(stock)
  }
  return {
    ...state,
    stock,
    bank: state.bank ? { ...createBankState(), ...state.bank } : createBankState(),
    empire: state.empire ?? createEmpireState(),
    gameStartYear: state.gameStartYear ?? 2026,
    pendingBoosts: state.pendingBoosts ?? [],
    chestPityCounter: state.chestPityCounter ?? 0,
    chestTickets: state.chestTickets ?? 0,
    campaign: state.campaign ?? createCampaignState(),
    reputation: state.reputation ?? REPUTATION_START,
    rivals: state.rivals?.length ? state.rivals : createRivalsState(),
    chronicle: state.chronicle ?? [],
    legacyMonuments: state.legacyMonuments ?? [],
    victoriesUnlocked: state.victoriesUnlocked ?? [],
    totalRaidsCaught: state.totalRaidsCaught ?? 0,
    presidentSeasons: state.presidentSeasons ?? 0,
    presidentSinceSeasonKey: state.presidentSinceSeasonKey ?? null,
    lastWorldStageId: state.lastWorldStageId ?? 'local',
    childCrises: state.childCrises ?? [],
  }
}

function applyV5Defaults(state: SerializableState): SerializableState {
  const base = applyV4Defaults(state)
  return {
    ...base,
    unlockedThemes: base.unlockedThemes ?? ['default'],
    activeTheme: (base.activeTheme ?? 'default') as SerializableState['activeTheme'],
    codexUnlockDates: base.codexUnlockDates ?? {},
    undergroundCooldowns: base.undergroundCooldowns ?? {},
    heatShieldUntil: base.heatShieldUntil ?? 0,
    heatProtectionUntil: base.heatProtectionUntil ?? 0,
    launderingUntil: base.launderingUntil ?? 0,
    lastActiveAt: base.lastActiveAt ?? Date.now(),
    comebackClaimedDay: base.comebackClaimedDay ?? null,
    comebackPending: base.comebackPending ?? 0,
    notificationPrefs: base.notificationPrefs ?? { dailyReward: true, passiveIncome: true, goalNear: true, webPush: false },
    surpriseInvestorUntil: base.surpriseInvestorUntil ?? 0,
    surpriseInvestorDay: base.surpriseInvestorDay ?? '',
    seenStoryBeats: base.seenStoryBeats ?? [],
    earnedBadges: base.earnedBadges ?? [],
    raidsToday: base.raidsToday ?? 0,
    raidsDay: base.raidsDay ?? new Date().toISOString().slice(0, 10),
    heatWasCritical: base.heatWasCritical ?? false,
    heatSurvived: base.heatSurvived ?? false,
    undergroundLawyerUsed: base.undergroundLawyerUsed ?? false,
    comebackClaimed: base.comebackClaimed ?? false,
    streakMilestonesClaimed: base.streakMilestonesClaimed ?? [],
  }
}

function applyV4Defaults(state: SerializableState): SerializableState {
  const managerAutoBuy: Record<string, boolean> = {}
  for (const p of PRODUCERS) managerAutoBuy[p.id] = state.managerAutoBuy?.[p.id] ?? false

  let stock = state.stock
  if (!stock || !('tickers' in stock)) {
    stock = migrateLegacyStock((stock ?? {}) as { price?: number; shares?: number; avgBuyPrice?: number })
  } else {
    stock = migrateStockState(stock)
  }

  return {
    ...state,
    season: state.season ?? createSeasonState(),
    prestigeTree: state.prestigeTree ?? {},
    managerAutoBuy,
    nightEarningsSession: state.nightEarningsSession ?? 0,
    hapticsEnabled: state.hapticsEnabled ?? true,
    reducedMotion: state.reducedMotion ?? false,
    playerName: state.playerName ?? 'Baron',
    birthYear: state.birthYear ?? 0,
    forcedUnlocks: state.forcedUnlocks ?? [],
    illegalHeat: state.illegalHeat ?? 0,
    stock,
    bank: state.bank ? { ...createBankState(), ...state.bank } : createBankState(),
  }
}

function validateState(data: SerializableState): boolean {
  if (typeof data.money !== 'number' || data.money < 0 || !Number.isFinite(data.money)) return false
  if (typeof data.totalEarned !== 'number' || data.totalEarned < 0 || !Number.isFinite(data.totalEarned)) return false
  if (typeof data.prestigePoints !== 'number' || data.prestigePoints < 0 || !Number.isFinite(data.prestigePoints)) return false
  if (!data.producers || typeof data.producers !== 'object' || Array.isArray(data.producers)) return false
  for (const v of Object.values(data.producers)) {
    if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) return false
  }
  if (!Array.isArray(data.purchasedUpgrades)) return false
  if (typeof data.lastSaveTime !== 'number' || !Number.isFinite(data.lastSaveTime)) return false
  if (!data.research || typeof data.research !== 'object' || Array.isArray(data.research)) return false
  if (typeof data.lifetimeTotalEarned !== 'number' || !Number.isFinite(data.lifetimeTotalEarned)) return false
  if (!data.stock || typeof data.stock !== 'object') return false
  return true
}

function sanitizeTimestamp(ts: number): number {
  const now = Date.now()
  const maxPast = 30 * 24 * 60 * 60 * 1000
  if (!Number.isFinite(ts) || ts > now + 60_000) return now
  if (ts < now - maxPast) return now - maxPast
  return ts
}

function obfuscate(text: string): string {
  const key = OBFUSCATION_KEY
  const data = new TextEncoder().encode(text)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i]! ^ key.charCodeAt(i % key.length)
  }
  let binary = ''
  for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]!)
  return btoa(binary)
}

function deobfuscate(encoded: string): string {
  const key = OBFUSCATION_KEY
  const binary = atob(encoded)
  try {
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    }
    return new TextDecoder().decode(out)
  } catch {
    let result = ''
    for (let i = 0; i < binary.length; i++) {
      result += String.fromCharCode(binary.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  }
}

function computeChecksum(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}
