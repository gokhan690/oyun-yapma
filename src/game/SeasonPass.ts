export interface SeasonState {
  weekKey: string
  xp: number
  claimedTiers: number[]
  adXpDoubled: boolean
}

export const SEASON_MAX_TIER = 30

export function seasonWeekKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
}

export function createSeasonState(): SeasonState {
  return {
    weekKey: seasonWeekKey(),
    xp: 0,
    claimedTiers: [],
    adXpDoubled: false,
  }
}

export function xpForTier(tier: number): number {
  return tier * tier * 80
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
  type: 'money' | 'boost' | 'theme'
  label: string
  value: number
}

export const SEASON_REWARDS: SeasonReward[] = Array.from({ length: SEASON_MAX_TIER }, (_, i) => {
  const tier = i + 1
  if (tier % 10 === 0) return { tier, type: 'theme', label: 'Kozmetik Tema', value: tier }
  if (tier % 5 === 0) return { tier, type: 'boost', label: '5 dk x2 Gelir', value: 5 }
  return { tier, type: 'money', label: 'Para Ödülü', value: tier * 500 }
})

export function rewardForTier(tier: number): SeasonReward {
  return SEASON_REWARDS[tier - 1] ?? { tier, type: 'money', label: 'Para', value: tier * 500 }
}

export function hasClaimableTier(state: SeasonState): boolean {
  const tier = currentTier(state.xp)
  for (let i = 1; i <= tier; i++) {
    if (!state.claimedTiers.includes(i)) return true
  }
  return false
}
