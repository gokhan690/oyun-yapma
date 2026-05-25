import { PRODUCERS, producerCost, type ProducerDef } from './Economy'

export const BANKRUPTCY_COOLDOWN_MS = 120_000
export const BANKRUPTCY_CASH_GRACE_MS = 180_000
export const BANKRUPTCY_RECOVERY_BASE_RATE = 0.4

export interface SeizedBusiness {
  id: string
  name: string
  emoji: string
  units: number
  value: number
}

export function estimateProducerFireSaleValue(def: ProducerDef, units: number, ownedBefore: number): number {
  if (units <= 0) return 0
  let total = 0
  const start = Math.max(0, ownedBefore - units)
  for (let i = start; i < ownedBefore; i++) {
    total += producerCost(def, i, 1)
  }
  return Math.floor(total * 0.55)
}

export function seizeBusinesses(producers: Record<string, number>): {
  seized: SeizedBusiness[]
  updated: Record<string, number>
} {
  const ownedDefs = PRODUCERS.filter((p) => (producers[p.id] ?? 0) > 0)
  const totalUnits = ownedDefs.reduce((sum, p) => sum + (producers[p.id] ?? 0), 0)
  if (ownedDefs.length === 0 || totalUnits <= 1) {
    return { seized: [], updated: { ...producers } }
  }

  const updated = { ...producers }
  const seized: SeizedBusiness[] = []
  const seizeRatio = 0.12 + Math.random() * 0.08
  let unitsToSeize = Math.max(1, Math.ceil(totalUnits * seizeRatio))
  unitsToSeize = Math.min(unitsToSeize, totalUnits - 1)

  const weighted = ownedDefs
    .map((def) => ({
      def,
      owned: producers[def.id] ?? 0,
      weight: def.tier * (producers[def.id] ?? 0) + Math.random() * 0.5,
    }))
    .sort((a, b) => b.weight - a.weight)

  for (const entry of weighted) {
    if (unitsToSeize <= 0) break
    const current = updated[entry.def.id] ?? 0
    if (current <= 0) continue

    const remainingElsewhere = PRODUCERS.reduce((sum, p) => {
      if (p.id === entry.def.id) return sum
      return sum + (updated[p.id] ?? 0)
    }, 0)
    const maxTake = Math.min(current, unitsToSeize, current - (remainingElsewhere === 0 ? 1 : 0))
    if (maxTake <= 0) continue

    updated[entry.def.id] = current - maxTake
    const value = estimateProducerFireSaleValue(entry.def, maxTake, current)
    seized.push({
      id: entry.def.id,
      name: entry.def.name,
      emoji: entry.def.emoji,
      units: maxTake,
      value,
    })
    unitsToSeize -= maxTake
  }

  return { seized, updated }
}

export function restoreSeizedBusinesses(
  producers: Record<string, number>,
  seized: SeizedBusiness[],
  fraction = 0.5,
): Record<string, number> {
  const updated = { ...producers }
  for (const item of seized) {
    const restore = Math.max(1, Math.floor(item.units * fraction))
    updated[item.id] = (updated[item.id] ?? 0) + restore
  }
  return updated
}
