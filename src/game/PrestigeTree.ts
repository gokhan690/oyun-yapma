export interface PrestigeTreeNode {
  id: string
  name: string
  description: string
  cost: number
  branch: 'income' | 'economy' | 'meta'
  requires?: string
}

export const PRESTIGE_TREE_NODES: PrestigeTreeNode[] = [
  { id: 'passive_5', name: 'Pasif Gelir', description: 'Pasif gelir +%5', cost: 1, branch: 'income' },
  { id: 'click_10', name: 'Tıklama Gücü', description: 'Tıklama +%10', cost: 2, branch: 'income', requires: 'passive_5' },
  { id: 'offline_2h', name: 'Offline Cap', description: 'Offline limit +2 saat', cost: 3, branch: 'income', requires: 'click_10' },
  { id: 'cost_5', name: 'Toptan Alım', description: 'İşletme maliyeti -%5', cost: 1, branch: 'economy' },
  { id: 'upgrade_10', name: 'İndirim Ağı', description: 'Yükseltme maliyeti -%10', cost: 2, branch: 'economy', requires: 'cost_5' },
  { id: 'manager_25', name: 'İK Departmanı', description: 'Yönetici maliyeti -%25', cost: 3, branch: 'economy', requires: 'upgrade_10' },
  { id: 'season_20', name: 'Sezon Ustası', description: 'Sezon XP +%20', cost: 2, branch: 'meta' },
  { id: 'stock_free', name: 'Piyasa İçgörüsü', description: 'Borsa ipucu ücretsiz', cost: 3, branch: 'meta', requires: 'season_20' },
  { id: 'night_10', name: 'Gece Kuşu', description: 'Gece bonusu +%10', cost: 2, branch: 'meta' },
  { id: 'day_10', name: 'Sabah Enerjisi', description: 'Gündüz bonusu +%10', cost: 2, branch: 'meta' },
  { id: 'autobuy', name: 'Otomasyon', description: 'Auto-buy cooldown -2 sn', cost: 4, branch: 'meta', requires: 'manager_25' },
  { id: 'prestige_5', name: 'Hisse Değeri', description: 'Prestij çarpanı +%5 ek', cost: 5, branch: 'income', requires: 'offline_2h' },
  { id: 'dynasty_1', name: 'Hanedan Mirası', description: 'Hanedan trait bonusları +%5 ek', cost: 4, branch: 'meta', requires: 'prestige_5' },
  { id: 'heat_decay', name: 'Temiz İmaj', description: 'Illegal heat %20 daha hızlı düşer', cost: 3, branch: 'meta', requires: 'night_10' },
  { id: 'raid_insurance', name: 'Baskın Sigortası', description: 'Günde ilk baskın cezası yarı', cost: 4, branch: 'meta', requires: 'heat_decay' },
]

export function hasNode(tree: Record<string, boolean>, id: string): boolean {
  return tree[id] === true
}

export function canBuyNode(tree: Record<string, boolean>, node: PrestigeTreeNode, points: number): boolean {
  if (hasNode(tree, node.id)) return false
  if (node.requires && !hasNode(tree, node.requires)) return false
  return points >= node.cost
}

export function passiveBonus(tree: Record<string, boolean>): number {
  return hasNode(tree, 'passive_5') ? 0.05 : 0
}

export function clickBonus(tree: Record<string, boolean>): number {
  return hasNode(tree, 'click_10') ? 0.1 : 0
}

export function offlineBonusMs(tree: Record<string, boolean>): number {
  return hasNode(tree, 'offline_2h') ? 2 * 60 * 60 * 1000 : 0
}

export function producerCostDiscount(tree: Record<string, boolean>): number {
  return hasNode(tree, 'cost_5') ? 0.05 : 0
}

export function upgradeCostDiscount(tree: Record<string, boolean>): number {
  return hasNode(tree, 'upgrade_10') ? 0.1 : 0
}

export function managerCostDiscount(tree: Record<string, boolean>): number {
  return hasNode(tree, 'manager_25') ? 0.25 : 0
}

export function seasonXpBonus(tree: Record<string, boolean>): number {
  return hasNode(tree, 'season_20') ? 0.2 : 0
}

export function freeStockHint(tree: Record<string, boolean>): boolean {
  return hasNode(tree, 'stock_free')
}

export function nightBonusExtra(tree: Record<string, boolean>): number {
  return hasNode(tree, 'night_10') ? 0.1 : 0
}

export function dayBonusExtra(tree: Record<string, boolean>): number {
  return hasNode(tree, 'day_10') ? 0.1 : 0
}

export function autoBuyCooldownMs(tree: Record<string, boolean>): number {
  return hasNode(tree, 'autobuy') ? 3000 : 5000
}

export function prestigeMultBonus(tree: Record<string, boolean>): number {
  return hasNode(tree, 'prestige_5') ? 0.05 : 0
}

export function ownedNodeCount(tree: Record<string, boolean>): number {
  return PRESTIGE_TREE_NODES.filter((n) => hasNode(tree, n.id)).length
}

export function heatDecayBonus(tree: Record<string, boolean>): number {
  return hasNode(tree, 'heat_decay') ? 0.2 : 0
}

export function hasRaidInsurance(tree: Record<string, boolean>): boolean {
  return hasNode(tree, 'raid_insurance')
}
