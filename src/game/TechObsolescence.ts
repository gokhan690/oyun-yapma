import { producerEconomyMult, producerCostExtraMult, type ProducerDef } from './Economy'

/** IPO sonrası düşük tier işletmelerin gelir çarpanı */
export function obsolescenceMult(producerTier: number, ipoCount: number): number {
  if (ipoCount <= 0) return 1
  const maxTier = 11
  const tiersBehind = Math.max(0, maxTier - producerTier - ipoCount)
  if (tiersBehind <= 0) return 1
  const penalty = ipoCount * 0.1 * (tiersBehind / maxTier)
  return Math.max(0.25, 1 - penalty)
}

export const MODERNIZE_COST_BASE = 25_000

export function modernizeCost(def: ProducerDef, owned: number): number {
  return Math.floor(
    def.baseCost *
    producerEconomyMult(def) *
    producerCostExtraMult(def) *
    0.40 *
    Math.max(1, owned * 0.5)
  )
}
