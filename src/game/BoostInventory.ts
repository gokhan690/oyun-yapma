export type BoostKind = 'income_2x' | 'income_3x' | 'shop_1_5x'

export interface PendingBoostItem {
  id: string
  kind: BoostKind
  durationMs: number
  label: string
  emoji: string
}

let boostSeq = 0

export function createPendingBoost(
  kind: BoostKind,
  durationMs: number,
  label: string,
  emoji: string,
): PendingBoostItem {
  boostSeq += 1
  return {
    id: `boost_${Date.now()}_${boostSeq}`,
    kind,
    durationMs: Math.max(1000, durationMs),
    label,
    emoji,
  }
}

export function boostDurationLabel(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} sn`
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min} dk`
  return `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)} sa`
}
