import { tRaw } from '../i18n'

export type ResearchBranch = 'operasyon' | 'finans' | 'imparatorluk'

export interface ResearchNode {
  id: string
  name: string
  description: string
  maxLevel: number
  baseCost: number
  costScale: number
  currency: 'money' | 'prestige'
  effect: 'click' | 'passive' | 'offline' | 'synergy' | 'efficiency' | 'heat_reduce' | 'football'
  valuePerLevel: number
  branch: ResearchBranch
  /** Önkoşul: bu node ID'si max seviyeye ulaşmadan kilit */
  prerequisite?: string
}

export function researchIsUnlocked(nodeId: string, levels: Record<string, number>): boolean {
  const node = RESEARCH_NODES.find(n => n.id === nodeId)
  if (!node?.prerequisite) return true
  const prereqNode = RESEARCH_NODES.find(n => n.id === node.prerequisite)
  if (!prereqNode) return true
  return (levels[node.prerequisite] ?? 0) >= 1
}

export function researchPrereqName(nodeId: string): string | null {
  const node = RESEARCH_NODES.find(n => n.id === nodeId)
  if (!node?.prerequisite) return null
  const prereq = RESEARCH_NODES.find(n => n.id === node.prerequisite)
  return prereq?.name ?? null
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
    branch: 'operasyon',
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
    branch: 'operasyon',
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
    branch: 'operasyon',
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
    branch: 'imparatorluk',
  },
  {
    id: 'efficiency',
    name: 'Verimlilik Ar-Ge',
    description: 'Üretici maliyet çarpanı -%2 / seviye',
    maxLevel: 3,
    baseCost: 2000,
    costScale: 3.0,
    currency: 'money',
    effect: 'efficiency',
    valuePerLevel: 0.02,
    branch: 'operasyon',
  },
  // — Operasyon dalı —
  {
    id: 'logistics',
    name: 'Lojistik Optimizasyonu',
    description: 'Pasif gelir +4% / seviye',
    maxLevel: 5,
    baseCost: 1200,
    costScale: 2.4,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.04,
    branch: 'operasyon',
  },
  {
    id: 'automation2',
    name: 'Otomasyon II',
    description: 'Pasif gelir +6% / seviye',
    maxLevel: 4,
    baseCost: 3500,
    costScale: 2.8,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.06,
    branch: 'operasyon',
    prerequisite: 'automation',
  },
  {
    id: 'energy_eff',
    name: 'Enerji Verimliliği',
    description: 'Maliyet -%3 / seviye (enerji & sanayi)',
    maxLevel: 3,
    baseCost: 8000,
    costScale: 3.2,
    currency: 'money',
    effect: 'efficiency',
    valuePerLevel: 0.03,
    branch: 'operasyon',
  },
  // — Finans dalı —
  {
    id: 'finance_interest',
    name: 'Faiz Optimizasyonu',
    description: 'Mevduat faiz getirisi +8% / seviye',
    maxLevel: 4,
    baseCost: 2500,
    costScale: 2.6,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.08,
    branch: 'finans',
  },
  {
    id: 'credit_mgmt',
    name: 'Kredi Yönetimi',
    description: 'Kredi skoru iyileşmesi +2 / seviye (pasif bonus)',
    maxLevel: 5,
    baseCost: 4000,
    costScale: 2.5,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.03,
    branch: 'finans',
    prerequisite: 'finance_interest',
  },
  {
    id: 'stock_analysis',
    name: 'Borsa Analizi',
    description: 'Tıklama geliri +8% / seviye',
    maxLevel: 4,
    baseCost: 6000,
    costScale: 2.7,
    currency: 'money',
    effect: 'click',
    valuePerLevel: 0.08,
    branch: 'finans',
    prerequisite: 'credit_mgmt',
  },
  {
    id: 'tax_shield',
    name: 'Vergi Kalkanı',
    description: 'Maliyet -%2 / seviye',
    maxLevel: 3,
    baseCost: 12_000,
    costScale: 3.0,
    currency: 'money',
    effect: 'efficiency',
    valuePerLevel: 0.02,
    branch: 'finans',
  },
  // — İmparatorluk dalı —
  {
    id: 'football_fan',
    name: 'Taraftar Pazarlama',
    description: 'Futbol kulübü geliri +12% / seviye',
    maxLevel: 5,
    baseCost: 3000,
    costScale: 2.5,
    currency: 'money',
    effect: 'football',
    valuePerLevel: 0.12,
    branch: 'imparatorluk',
  },
  {
    id: 'stadium_ops',
    name: 'Stadyum Operasyonları',
    description: 'Futbol geliri +8% / seviye',
    maxLevel: 4,
    baseCost: 7500,
    costScale: 2.8,
    currency: 'money',
    effect: 'football',
    valuePerLevel: 0.08,
    branch: 'imparatorluk',
    prerequisite: 'football_fan',
  },
  {
    id: 'politics_lobby_r',
    name: 'Siyasi Lobi Ar-Ge',
    description: 'Sinerji bonusları +25% / seviye',
    maxLevel: 3,
    baseCost: 15_000,
    costScale: 3.0,
    currency: 'money',
    effect: 'synergy',
    valuePerLevel: 0.25,
    branch: 'imparatorluk',
  },
  {
    id: 'dark_stealth',
    name: 'Yeraltı Gizlilik',
    description: 'Illegal heat birikimi -%5 / seviye',
    maxLevel: 4,
    baseCost: 5000,
    costScale: 2.6,
    currency: 'money',
    effect: 'heat_reduce',
    valuePerLevel: 0.05,
    branch: 'imparatorluk',
  },
  {
    id: 'dark_production',
    name: 'Gizli Üretim Hattı',
    description: 'Pasif gelir +4% / seviye (yeraltı bonusu)',
    maxLevel: 4,
    baseCost: 9000,
    costScale: 2.7,
    currency: 'money',
    effect: 'passive',
    valuePerLevel: 0.04,
    branch: 'imparatorluk',
    prerequisite: 'dark_stealth',
  },
]

const PASSIVE_NODE_IDS = ['automation', 'logistics', 'automation2', 'finance_interest', 'credit_mgmt', 'dark_production'] as const
const CLICK_NODE_IDS = ['marketing', 'stock_analysis'] as const
const EFFICIENCY_NODE_IDS = ['efficiency', 'energy_eff', 'tax_shield'] as const
const SYNERGY_NODE_IDS = ['lobby', 'politics_lobby_r'] as const
const FOOTBALL_NODE_IDS = ['football_fan', 'stadium_ops'] as const

export function researchName(node: ResearchNode): string {
  return tRaw('res_' + node.id) ?? node.name
}

export function researchDesc(node: ResearchNode): string {
  return tRaw('res_' + node.id + '_desc') ?? node.description
}

export function researchCost(node: ResearchNode, currentLevel: number): number {
  return Math.floor(node.baseCost * Math.pow(node.costScale, currentLevel))
}

function aggregateBonus(levels: Record<string, number>, ids: readonly string[]): number {
  let bonus = 0
  for (const id of ids) {
    const node = RESEARCH_NODES.find((n) => n.id === id)
    if (!node) continue
    bonus += (levels[id] ?? 0) * node.valuePerLevel
  }
  return bonus
}

export function researchClickBonus(levels: Record<string, number>): number {
  return 1 + aggregateBonus(levels, CLICK_NODE_IDS)
}

export function researchPassiveBonus(levels: Record<string, number>): number {
  return 1 + aggregateBonus(levels, PASSIVE_NODE_IDS)
}

export function researchOfflineBonusMs(levels: Record<string, number>): number {
  const lvl = levels.accounting ?? 0
  const node = RESEARCH_NODES.find((n) => n.id === 'accounting')
  return lvl * (node?.valuePerLevel ?? 0)
}

export function researchSynergyMultiplier(levels: Record<string, number>): number {
  let mult = 1
  for (const id of SYNERGY_NODE_IDS) {
    const lvl = levels[id] ?? 0
    if (lvl <= 0) continue
    const node = RESEARCH_NODES.find((n) => n.id === id)
    if (id === 'lobby') mult += node?.valuePerLevel ?? 0
    else mult += lvl * (node?.valuePerLevel ?? 0)
  }
  return mult
}

export function researchEfficiencyBonus(levels: Record<string, number>): number {
  return Math.min(0.35, aggregateBonus(levels, EFFICIENCY_NODE_IDS))
}

export function researchFootballBonus(levels: Record<string, number>): number {
  return 1 + aggregateBonus(levels, FOOTBALL_NODE_IDS)
}

export function researchHeatGainReduction(levels: Record<string, number>): number {
  const node = RESEARCH_NODES.find((n) => n.id === 'dark_stealth')
  const lvl = levels.dark_stealth ?? 0
  return Math.min(0.4, lvl * (node?.valuePerLevel ?? 0))
}

export function researchNodesByBranch(branch: ResearchBranch): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.branch === branch)
}

export function researchNodeName(n: ResearchNode): string {
  return tRaw('res_' + n.id) ?? n.name
}

export function researchNodeDesc(n: ResearchNode): string {
  return tRaw('res_' + n.id + '_desc') ?? n.description
}
