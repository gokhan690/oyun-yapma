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
  roiSeconds: number
  ipsGain: number
  affordable: boolean
  reason: string
}

export type BizSortOrder = 'profit' | 'cheap' | 'name' | 'unlockable'

export function producerRoiSeconds(state: GameState, p: ProducerDef, count = 1): number {
  const owned = state.producers[p.id] ?? 0
  const cost = state.producerCostFor(p, owned, count)
  const ipsGain = p.baseIncome * count * state.passiveMultiplier()
  if (ipsGain <= 0) return Infinity
  return cost / ipsGain
}

export function upgradeIpsGain(state: GameState, u: UpgradeDef): number {
  if (u.effect === 'global_mult') {
    const cur = state.incomePerSecond()
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

export function getBestRecommendation(state: GameState): ShopRecommendation | null {
  const candidates: ShopRecommendation[] = []

  for (const p of state.unlockedProducers()) {
    const owned = state.producers[p.id] ?? 0
    const count = state.countMaxAffordable(p.id) >= 1 ? 1 : 1
    const cost = state.producerCostFor(p, owned, count)
    const roi = producerRoiSeconds(state, p, count)
    const ipsGain = p.baseIncome * count * state.passiveMultiplier()
    const synergies = getActiveSynergies(state.producers)
    const synBonus = synergies.some((s) => s.def.requires.includes(p.id) || s.def.targetProducer === p.id)
    candidates.push({
      kind: 'business',
      id: p.id,
      label: p.name,
      emoji: p.emoji,
      cost,
      roiSeconds: roi,
      ipsGain,
      affordable: state.canAfford(cost),
      reason: synBonus ? 'Sinerji bonusu yakın' : 'En iyi ROI',
    })
  }

  for (const u of state.availableUpgrades()) {
    const discount = hasNode(state.prestigeTree, 'upgrade_10') ? 0.1 : 0
    const upgradeDiscount = state.upgradeDiscountActive ? 0.3 : 0
    const cost = Math.floor(u.cost * (1 - discount) * (1 - upgradeDiscount))
    const ipsGain = upgradeIpsGain(state, u)
    const roi = ipsGain > 0 ? cost / ipsGain : Infinity
    candidates.push({
      kind: 'upgrade',
      id: u.id,
      label: u.name,
      emoji: u.effect === 'click_mult' ? '👆' : u.effect === 'global_mult' ? '🌍' : '🏢',
      cost,
      roiSeconds: roi,
      ipsGain,
      affordable: state.canAfford(cost),
      reason: u.effect === 'click_mult' ? 'Tıklama gücü' : 'Gelir artışı',
    })
  }

  for (const p of PRODUCERS) {
    if ((state.producers[p.id] ?? 0) > 0 && !state.managers[p.id]) {
      const cost = state.managerDiscountActive
        ? Math.floor(state.managerCostFor(p) * 0.5)
        : state.managerCostFor(p)
      const ipsGain = state.producerIncome(p) * 0.25
      candidates.push({
        kind: 'manager',
        id: p.id,
        label: `${p.name} yöneticisi`,
        emoji: '👔',
        cost,
        roiSeconds: ipsGain > 0 ? cost / ipsGain : Infinity,
        ipsGain,
        affordable: state.canAfford(cost),
        reason: 'Yönetici +25% gelir',
      })
    }
  }

  const affordable = candidates.filter((c) => c.affordable && Number.isFinite(c.roiSeconds))
  const pool = affordable.length > 0 ? affordable : candidates.filter((c) => Number.isFinite(c.roiSeconds))
  if (pool.length === 0) return null
  pool.sort((a, b) => a.roiSeconds - b.roiSeconds)
  return pool[0] ?? null
}

export function sortProducers(list: ProducerDef[], order: BizSortOrder, state: GameState): ProducerDef[] {
  const copy = [...list]
  switch (order) {
    case 'profit':
      return copy.sort((a, b) => producerRoiSeconds(state, a) - producerRoiSeconds(state, b))
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

export function formatRoi(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.ceil(seconds)}sn`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}dk`
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)}sa`
  return `${Math.ceil(seconds / 86400)}g`
}

export function formatRecommendationSummary(rec: ShopRecommendation): string {
  return `${rec.emoji} ${rec.label} · ${formatMoney(rec.cost)} · ROI ~${formatRoi(rec.roiSeconds)}`
}
