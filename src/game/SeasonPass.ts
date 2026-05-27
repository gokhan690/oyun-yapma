import { calendarMonthKey } from './dateUtils'

export type SeasonTrack = 'free' | 'premium'

export interface SeasonState {
  weekKey: string
  xp: number
  claimedTiers: number[]
  claimedPremiumTiers: number[]
  premiumUnlocked: boolean
  adXpDoubled: boolean
}

export const SEASON_MAX_TIER = 30

export function seasonWeekKey(_gameTimeMs = 0): string {
  return calendarMonthKey()
}

export function isLegacyGameSeasonKey(key: string): boolean {
  return key.startsWith('gs')
}

export function createSeasonState(gameTimeMs = 0): SeasonState {
  return {
    weekKey: seasonWeekKey(gameTimeMs),
    xp: 0,
    claimedTiers: [],
    claimedPremiumTiers: [],
    premiumUnlocked: false,
    adXpDoubled: false,
  }
}

export function xpForTier(tier: number): number {
  return tier * tier * 150
}

export function currentTier(xp: number): number {
  let tier = 0
  for (let i = 1; i <= SEASON_MAX_TIER; i++) {
    if (xp >= xpForTier(i)) tier = i
  }
  return tier
}

export function tierProgress(xp: number): { tier: number; current: number; needed: number; pct: number } {
  const tier = currentTier(xp)
  const prev = tier > 0 ? xpForTier(tier) : 0
  const next = tier >= SEASON_MAX_TIER ? xpForTier(SEASON_MAX_TIER) : xpForTier(tier + 1)
  const current = xp - prev
  const needed = next - prev
  return {
    tier,
    current,
    needed: needed || 1,
    pct: tier >= SEASON_MAX_TIER ? 100 : Math.min(100, (current / needed) * 100),
  }
}

export interface SeasonReward {
  tier: number
  type: 'money' | 'boost' | 'theme' | 'chest_ticket'
  label: string
  value: number
}

export const SEASON_REWARDS: SeasonReward[] = Array.from({ length: SEASON_MAX_TIER }, (_, i) => {
  const tier = i + 1
  if (tier === 30) return { tier, type: 'theme', label: '🌌 Galaktik Tema', value: tier }
  if (tier === 20) return { tier, type: 'theme', label: '💜 Neon Tema', value: tier }
  if (tier === 15) return { tier, type: 'chest_ticket', label: '🎁 3× Sandık Bileti', value: 3 }
  if (tier === 10) return { tier, type: 'theme', label: '✨ Altın Tema', value: tier }
  if (tier === 5) return { tier, type: 'chest_ticket', label: '🎁 Sandık Bileti', value: 1 }
  if (tier === 25) return { tier, type: 'boost', label: '🚀 30 dk x2 Gelir', value: 30 }
  if (tier % 5 === 0) return { tier, type: 'boost', label: '⚡ 10 dk x2 Gelir', value: 10 }
  return { tier, type: 'money', label: '💰 Para Ödülü', value: tier * 200 }
})

export const SEASON_PREMIUM_REWARDS: SeasonReward[] = Array.from({ length: SEASON_MAX_TIER }, (_, i) => {
  const tier = i + 1
  if (tier === 30) return { tier, type: 'theme', label: '🌌 Premium Galaktik', value: tier + 100 }
  if (tier === 20) return { tier, type: 'theme', label: '💜 Premium Neon', value: tier + 100 }
  if (tier === 15) return { tier, type: 'chest_ticket', label: '🎁 5× Sandık Bileti', value: 5 }
  if (tier === 10) return { tier, type: 'theme', label: '✨ Premium Altın', value: tier + 100 }
  if (tier === 5) return { tier, type: 'chest_ticket', label: '🎁 2× Sandık Bileti', value: 2 }
  if (tier === 25) return { tier, type: 'boost', label: '🚀 60 dk x2 Gelir', value: 60 }
  if (tier % 5 === 0) return { tier, type: 'boost', label: '⚡ 20 dk x2 Gelir', value: 20 }
  if (tier % 3 === 0) return { tier, type: 'chest_ticket', label: '🎁 Sandık Bileti', value: 1 }
  return { tier, type: 'money', label: '💰 Premium Para', value: tier * 450 }
})

export function rewardForTier(tier: number, track: SeasonTrack = 'free'): SeasonReward {
  const list = track === 'premium' ? SEASON_PREMIUM_REWARDS : SEASON_REWARDS
  return list[tier - 1] ?? { tier, type: 'money', label: 'Para', value: tier * (track === 'premium' ? 280 : 120) }
}

export function hasClaimableTier(state: SeasonState, track: SeasonTrack = 'free'): boolean {
  const tier = currentTier(state.xp)
  const claimed = track === 'premium' ? state.claimedPremiumTiers : state.claimedTiers
  if (track === 'premium' && !state.premiumUnlocked) return false
  for (let i = 1; i <= tier; i++) {
    if (!claimed.includes(i)) return true
  }
  return false
}

export function hasClaimableSeasonReward(state: SeasonState): boolean {
  return hasClaimableTier(state, 'free') || hasClaimableTier(state, 'premium')
}
