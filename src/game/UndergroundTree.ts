export type UndergroundBranch = 'income' | 'risk' | 'stealth'

export interface UndergroundTreeNode {
  id: string
  branch: UndergroundBranch
  name: string
  emoji: string
  description: string
  maxLevel: number
  costBase: number
  /** Gelir / risk / heat etkisi seviye başına */
  effectPerLevel: number
}

export const UNDERGROUND_TREE_NODES: UndergroundTreeNode[] = [
  { id: 'ug_income_1', branch: 'income', name: 'Kara Para Ağı', emoji: '💰', description: 'Illegal gelir +%8/seviye', maxLevel: 5, costBase: 25_000, effectPerLevel: 0.08 },
  { id: 'ug_income_2', branch: 'income', name: 'Gölge Broker', emoji: '📊', description: 'Yasadışı sinerji +%5/seviye', maxLevel: 3, costBase: 80_000, effectPerLevel: 0.05 },
  { id: 'ug_risk_1', branch: 'risk', name: 'Sahte Kimlik', emoji: '🪪', description: 'Baskın cezası −%6/seviye', maxLevel: 5, costBase: 15_000, effectPerLevel: 0.06 },
  { id: 'ug_risk_2', branch: 'risk', name: 'İçeriden Bilgi', emoji: '📡', description: 'Baskın şansı −%4/seviye', maxLevel: 4, costBase: 50_000, effectPerLevel: 0.04 },
  { id: 'ug_stealth_1', branch: 'stealth', name: 'Temiz Cep', emoji: '🧼', description: 'Heat düşüş hızı +%10/seviye', maxLevel: 5, costBase: 20_000, effectPerLevel: 0.1 },
  { id: 'ug_stealth_2', branch: 'stealth', name: 'Hayalet Ağ', emoji: '👻', description: 'Heat birikimi −%5/seviye', maxLevel: 4, costBase: 60_000, effectPerLevel: 0.05 },
]

export type UndergroundTreeState = Record<string, number>

export function createUndergroundTreeState(): UndergroundTreeState {
  return {}
}

export function treeNodeDef(id: string): UndergroundTreeNode | undefined {
  return UNDERGROUND_TREE_NODES.find((n) => n.id === id)
}

export function treeNodeCost(node: UndergroundTreeNode, level: number): number {
  return Math.floor(node.costBase * Math.pow(1.55, level))
}

export function illegalIncomeBonus(tree: UndergroundTreeState): number {
  const n1 = tree['ug_income_1'] ?? 0
  const n2 = tree['ug_income_2'] ?? 0
  return 1 + n1 * 0.08 + n2 * 0.05
}

export function raidFineReduction(tree: UndergroundTreeState): number {
  return Math.min(0.5, (tree['ug_risk_1'] ?? 0) * 0.06)
}

export function raidChanceReduction(tree: UndergroundTreeState): number {
  return Math.min(0.35, (tree['ug_risk_2'] ?? 0) * 0.04)
}

export function heatDecayBonus(tree: UndergroundTreeState): number {
  return 1 + (tree['ug_stealth_1'] ?? 0) * 0.1
}

export function heatGainReduction(tree: UndergroundTreeState): number {
  return Math.max(0.5, 1 - (tree['ug_stealth_2'] ?? 0) * 0.05)
}
