export interface ResearchNode {
  id: string
  name: string
  description: string
  maxLevel: number
  baseCost: number
  costScale: number
  currency: 'money' | 'prestige'
  effect: 'click' | 'passive' | 'offline' | 'synergy'
  valuePerLevel: number
}

export const RESEARCH_NODES: ResearchNode[] = [
  {
    id: 'marketing',
    name: 'Pazarlama',
    description: 'Tıklama geliri +10% / seviye',
    maxLevel: 5,
    baseCost: 200,
    costScale: 2.5,
    currency: 'money',
    effect: 'click',
    valuePerLevel: 0.1,
  },
  {
    id: 'automation',
    name: 'Otomasyon',
    description: 'Pasif gelir +5% / seviye',
    maxLevel: 5,
    baseCost: 500,
    costScale: 2.5,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.05,
  },
  {
    id: 'accounting',
    name: 'Muhasebe',
    description: 'Offline cap +1 saat / seviye',
    maxLevel: 4,
    baseCost: 1000,
    costScale: 3,
    currency: 'money',
    effect: 'offline',
    valuePerLevel: 3600_000,
  },
  {
    id: 'lobby',
    name: 'Lobi Faaliyetleri',
    description: 'Sinerji bonusları x1.5',
    maxLevel: 1,
    baseCost: 5,
    costScale: 1,
    currency: 'prestige',
    effect: 'synergy',
    valuePerLevel: 0.5,
  },
]

export function researchCost(node: ResearchNode, currentLevel: number): number {
  return Math.floor(node.baseCost * Math.pow(node.costScale, currentLevel))
}

export function researchClickBonus(levels: Record<string, number>): number {
  const lvl = levels.marketing ?? 0
  const node = RESEARCH_NODES.find((n) => n.id === 'marketing')
  return 1 + lvl * (node?.valuePerLevel ?? 0)
}

export function researchPassiveBonus(levels: Record<string, number>): number {
  const lvl = levels.automation ?? 0
  const node = RESEARCH_NODES.find((n) => n.id === 'automation')
  return 1 + lvl * (node?.valuePerLevel ?? 0)
}

export function researchOfflineBonusMs(levels: Record<string, number>): number {
  const lvl = levels.accounting ?? 0
  const node = RESEARCH_NODES.find((n) => n.id === 'accounting')
  return lvl * (node?.valuePerLevel ?? 0)
}

export function researchSynergyMultiplier(levels: Record<string, number>): number {
  const lvl = levels.lobby ?? 0
  if (lvl <= 0) return 1
  const node = RESEARCH_NODES.find((n) => n.id === 'lobby')
  return 1 + (node?.valuePerLevel ?? 0)
}
