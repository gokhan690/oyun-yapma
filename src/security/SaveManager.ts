import type { GameState, SerializableState } from '../game/GameState'
import { migrateLegacyStock } from '../game/StockMarket'
import { createWeeklyState } from '../game/WeeklyEvent'
import { createSeasonState } from '../game/SeasonPass'
import { dailyGoalDayKey } from '../game/DailyGoal'
import { createDynastyState } from '../game/Dynasty'
import { PRODUCERS } from '../game/Economy'
import { RESEARCH_NODES } from '../game/Research'

const SAVE_KEY_V7 = 'is_imparatorlugu_save_v7'
const SAVE_KEY_V6 = 'is_imparatorlugu_save_v6'
const SAVE_KEY_V5 = 'is_imparatorlugu_save_v5'
const SAVE_KEY_V4 = 'is_imparatorlugu_save_v4'
const SAVE_KEY_V3 = 'is_imparatorlugu_save_v3'
const SAVE_KEY_V2 = 'is_imparatorlugu_save_v2'
const SAVE_KEY_V1 = 'para_tuzagi_save_v1'
const OBFUSCATION_KEY = 'PT2026x'
const CURRENT_VERSION = 7

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

export class SaveManager {
  private autoSaveInterval: number | null = null

  save(state: GameState): void {
    const data = state.toJSON()
    data.lastSaveTime = Date.now()
    this.writeSave(data, CURRENT_VERSION, SAVE_KEY_V7)
  }

  load(state: GameState): { ok: boolean; lastSaveTime: number } {
    const v7 = this.tryLoad(state, SAVE_KEY_V7, CURRENT_VERSION)
    if (v7.ok) return v7

    const v6 = this.tryLoad(state, SAVE_KEY_V6, 6)
    if (v6.ok) {
      this.save(state)
      return v6
    }

    const v5 = this.tryLoad(state, SAVE_KEY_V5, 5)
    if (v5.ok) {
      this.save(state)
      return v5
    }

    const v4 = this.tryLoadMigrateV5(state, SAVE_KEY_V4)
    if (v4.ok) {
      this.save(state)
      return v4
    }

    const v3 = this.tryLoadMigrateV3(state, SAVE_KEY_V3)
    if (v3.ok) {
      this.save(state)
      return v3
    }

    const v2 = this.tryLoadMigrate(state, SAVE_KEY_V2, 2)
    if (v2.ok) {
      this.save(state)
      return v2
    }

    const v1 = this.tryLoadLegacyV1(state)
    if (v1.ok) {
      this.save(state)
      return v1
    }

    return { ok: false, lastSaveTime: Date.now() }
  }

  clear(): void {
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

  private tryLoad(
    state: GameState,
    key: string,
    expectedVersion: number,
  ): { ok: boolean; lastSaveTime: number } {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ok: false, lastSaveTime: Date.now() }

      const envelope = JSON.parse(raw) as SaveEnvelope
      if (!envelope.payload || !envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const json = deobfuscate(envelope.payload)
      if (computeChecksum(json) !== envelope.checksum) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const data = applyV5Defaults(JSON.parse(json) as SerializableState)
      if (envelope.version !== expectedVersion || !validateState(data)) {
        return { ok: false, lastSaveTime: Date.now() }
      }

      const lastSaveTime = sanitizeTimestamp(data.lastSaveTime)
      state.loadFrom({ ...data, lastSaveTime })
      return { ok: true, lastSaveTime }
    } catch {
      return { ok: false, lastSaveTime: Date.now() }
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
      localStorage.setItem(key, JSON.stringify(envelope))
    } catch {
      // storage full
    }
  }
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
    stock,
    weekly: legacy.weekly ?? createWeeklyState(),
    milestonesReached: legacy.milestonesReached ?? [],
    managerDiscountActive: legacy.managerDiscountActive ?? false,
    dailyGoalEarned: legacy.dailyGoalEarned ?? 0,
    dailyGoalDay: legacy.dailyGoalDay ?? dailyGoalDayKey(),
    dailyGoalClaimed: legacy.dailyGoalClaimed ?? false,
    season: legacy.season ?? createSeasonState(),
    prestigeTree: legacy.prestigeTree ?? {},
    managerAutoBuy: legacy.managerAutoBuy ?? {},
    nightEarningsSession: legacy.nightEarningsSession ?? 0,
    hapticsEnabled: legacy.hapticsEnabled ?? true,
    reducedMotion: legacy.reducedMotion ?? false,
    playerName: legacy.playerName ?? 'Baron',
    birthYear: legacy.birthYear ?? 0,
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
    notificationPrefs: legacy.notificationPrefs ?? { dailyReward: true, passiveIncome: true, goalNear: true },
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
    notificationPrefs: base.notificationPrefs ?? { dailyReward: true, passiveIncome: true, goalNear: true },
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
