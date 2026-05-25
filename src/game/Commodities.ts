export type CommodityId = 'gold' | 'oil' | 'wheat' | 'coffee'

export interface CommodityDef {
  id: CommodityId
  name: string
  emoji: string
  basePrice: number
  unit: string
}

export const COMMODITIES: CommodityDef[] = [
  { id: 'gold', name: 'Altın', emoji: '🥇', basePrice: 3240, unit: 'gr' },
  { id: 'oil', name: 'Ham Petrol', emoji: '🛢️', basePrice: 1820, unit: 'varil' },
  { id: 'wheat', name: 'Buğday', emoji: '🌾', basePrice: 890, unit: 'ton' },
  { id: 'coffee', name: 'Kahve', emoji: '☕', basePrice: 2100, unit: 'kg' },
]

export interface CommodityMarketState {
  prices: Record<CommodityId, number>
  holdings: Record<CommodityId, number>
  avgBuy: Record<CommodityId, number>
  lastTick: number
}

export function createCommodityMarket(): CommodityMarketState {
  const prices = {} as Record<CommodityId, number>
  const holdings = {} as Record<CommodityId, number>
  const avgBuy = {} as Record<CommodityId, number>
  for (const c of COMMODITIES) {
    prices[c.id] = c.basePrice
    holdings[c.id] = 0
    avgBuy[c.id] = 0
  }
  return { prices, holdings, avgBuy, lastTick: Date.now() }
}

export function tickCommodityPrices(state: CommodityMarketState): void {
  for (const c of COMMODITIES) {
    const drift = (Math.random() - 0.48) * 0.06
    state.prices[c.id] = Math.max(1, Math.floor(state.prices[c.id]! * (1 + drift)))
  }
  state.lastTick = Date.now()
}

export function commodityChangePct(state: CommodityMarketState, id: CommodityId): number {
  const def = COMMODITIES.find((c) => c.id === id)!
  const cur = state.prices[id] ?? def.basePrice
  return ((cur - def.basePrice) / def.basePrice) * 100
}
