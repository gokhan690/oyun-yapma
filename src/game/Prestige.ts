export const PRESTIGE_THRESHOLD = 2_000_000

export function calcPrestigePoints(totalEarned: number): number {
  if (totalEarned < PRESTIGE_THRESHOLD) return 0
  return Math.floor(Math.sqrt(totalEarned / PRESTIGE_THRESHOLD))
}

export function prestigeMultiplier(prestigePoints: number): number {
  return 1 + prestigePoints * 0.01
}

export function canPrestige(totalEarned: number): boolean {
  return calcPrestigePoints(totalEarned) > 0
}
