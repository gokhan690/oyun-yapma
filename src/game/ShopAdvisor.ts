import type { GameState } from './GameState'
import { PRODUCERS, formatMoney, type ProducerDef, type UpgradeDef } from './Economy'
import { hasNode } from './PrestigeTree'
import { isProducerUnlocked } from './Economy'
import { getActiveSynergies } from './Synergies'

export type ShopRecommendationKind = 'business' | 'upgrade' | 'research' | 'manager'

export interface ShopRecommendation {
  kind: ShopRecommendationKind
  id: string
  label: string
  emoji: string
  cost: number
  roiDays: number
  ipdGain: number
  affordable: boolean
  reason: string
}

/** @deprecated use roiDays */
export type ShopRecommendationLegacy = ShopRecommendation & { roiSeconds: number; ipsGain: number }

export type BizSortOrder = 'profit' | 'cheap' | 'name' | 'unlockable'

export function producerRoiDays(state: GameState, p: ProducerDef, count = 1): number {
  const owned = state.producers[p.id] ?? 0
  const cost = state.producerCostFor(p, owned, count)
  const ipdGain = state.marginalProducerIncome(p, count)
  if (ipdGain <= 0) return Infinity
  return cost / ipdGain
}

/** @deprecated use producerRoiDays */
export function producerRoiSeconds(state: GameState, p: ProducerDef, count = 1): number {
  return producerRoiDays(state, p, count)
}

export function upgradeIpdGain(state: GameState, u: UpgradeDef): number {
  if (u.effect === 'global_mult') {
    const cur = state.incomePerDay()
    return cur * (u.value - 1)
  }
  if (u.effect === 'click_mult') return 0
  if (u.effect === 'producer_mult' && u.producerId) {
    const p = PRODUCERS.find((x) => x.id === u.producerId)
    if (!p) return 0
    const owned = state.producers[p.id] ?? 0
    if (owned === 0) return 0
    return state.producerIncome(p) * (u.value - 1)
  }
  return 0
}

/** @deprecated use upgradeIpdGain */
export function upgradeIpsGain(state: GameState, u: UpgradeDef): number {
  return upgradeIpdGain(state, u)
}

export function getBestRecommendation(state: GameState): ShopRecommendation | null {
  const candidates: ShopRecommendation[] = []

  for (const p of state.unlockedProducers()) {
    const owned = state.producers[p.id] ?? 0
    const count = state.countMaxAffordable(p.id) >= 1 ? 1 : 1
    const cost = state.producerCostFor(p, owned, count)
    const roi = producerRoiDays(state, p, count)
    const ipdGain = state.marginalProducerIncome(p, count)
    const synergies = getActiveSynergies(state.producers)
    const synBonus = synergies.some((s) => s.def.requires.includes(p.id) || s.def.targetProducer === p.id)
    candidates.push({
      kind: 'business',
      id: p.id,
      label: p.name,
      emoji: p.emoji,
      cost,
      roiDays: roi,
      ipdGain,
      affordable: state.canAfford(cost),
      reason: synBonus ? 'Sinerji bonusu yakın' : 'En iyi ROI',
    })
  }

  for (const u of state.availableUpgrades()) {
    const discount = hasNode(state.prestigeTree, 'upgrade_10') ? 0.1 : 0
    const upgradeDiscount = state.upgradeDiscountActive ? 0.3 : 0
    const cost = Math.floor(u.cost * (1 - discount) * (1 - upgradeDiscount))
    const ipdGain = upgradeIpdGain(state, u)
    const roi = ipdGain > 0 ? cost / ipdGain : Infinity
    candidates.push({
      kind: 'upgrade',
      id: u.id,
      label: u.name,
      emoji: u.effect === 'click_mult' ? '👆' : u.effect === 'global_mult' ? '🌍' : '🏢',
      cost,
      roiDays: roi,
      ipdGain,
      affordable: state.canAfford(cost),
      reason: u.effect === 'click_mult' ? 'Tıklama gücü' : 'Gelir artışı',
    })
  }

  for (const p of PRODUCERS) {
    if ((state.producers[p.id] ?? 0) > 0 && !state.managers[p.id]) {
      const cost = state.managerDiscountActive
        ? Math.floor(state.managerCostFor(p) * 0.5)
        : state.managerCostFor(p)
      const ipdGain = state.producerIncome(p) * 0.25
      candidates.push({
        kind: 'manager',
        id: p.id,
        label: `${p.name} yöneticisi`,
        emoji: '👔',
        cost,
        roiDays: ipdGain > 0 ? cost / ipdGain : Infinity,
        ipdGain,
        affordable: state.canAfford(cost),
        reason: 'Yönetici +25% gelir',
      })
    }
  }

  const affordable = candidates.filter((c) => c.affordable && Number.isFinite(c.roiDays))
  const pool = affordable.length > 0 ? affordable : candidates.filter((c) => Number.isFinite(c.roiDays))
  if (pool.length === 0) return null
  pool.sort((a, b) => a.roiDays - b.roiDays)
  return pool[0] ?? null
}

export function sortProducers(list: ProducerDef[], order: BizSortOrder, state: GameState): ProducerDef[] {
  const copy = [...list]
  switch (order) {
    case 'profit':
      return copy.sort((a, b) => producerRoiDays(state, a) - producerRoiDays(state, b))
    case 'cheap':
      return copy.sort((a, b) => {
        const ca = state.producerCostFor(a, state.producers[a.id] ?? 0, 1)
        const cb = state.producerCostFor(b, state.producers[b.id] ?? 0, 1)
        return ca - cb
      })
    case 'unlockable':
      return copy.sort((a, b) => {
        const ua = isProducerUnlocked(a, state.totalEarned, state.forcedUnlocks) ? 0 : 1
        const ub = isProducerUnlocked(b, state.totalEarned, state.forcedUnlocks) ? 0 : 1
        return ua - ub || a.unlockAt - b.unlockAt
      })
    case 'name':
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }
}

export function formatRoi(days: number): string {
  if (!Number.isFinite(days)) return '—'
  if (days < 1) return `${Math.ceil(days * 24)}sa`
  if (days < 30) return `${Math.ceil(days)}g`
  if (days < 365) return `${Math.ceil(days / 30)}ay`
  return `${Math.ceil(days / 365)}y`
}

/** @deprecated use formatRoi */
export function formatRoiSeconds(seconds: number): string {
  return formatRoi(seconds)
}

export function formatRecommendationSummary(rec: ShopRecommendation): string {
  return `${rec.emoji} ${rec.label} · ${formatMoney(rec.cost)} · ROI ~${formatRoi(rec.roiDays)}`
}
