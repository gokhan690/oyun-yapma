export const PRESTIGE_THRESHOLD = 10_000_000

/** Her IPO sonrası eşik katlanarak artar: 10M → 20M → 40M … */
export function ipoThreshold(ipoCount = 0): number {
  return PRESTIGE_THRESHOLD * Math.pow(2, Math.max(0, ipoCount))
}

export function calcPrestigePoints(totalEarned: number, ipoCount = 0): number {
  const threshold = ipoThreshold(ipoCount)
  if (totalEarned < threshold) return 0
  return Math.floor(Math.sqrt(totalEarned / threshold))
}

export function prestigeMultiplier(prestigePoints: number): number {
  return 1 + prestigePoints * 0.01
}

export function canPrestige(totalEarned: number, ipoCount = 0): boolean {
  return calcPrestigePoints(totalEarned, ipoCount) > 0
}
