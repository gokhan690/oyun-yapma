import type { CommodityId } from './Commodities'

export interface AdvisorTip {
  headline: string
  action: 'buy_stock' | 'buy_commodity' | 'hold' | 'sell_stock'
  tickerId?: string
  commodityId?: CommodityId
  /** Tahmini doğruluk 0–1 */
  accuracy: number
}

const STOCK_IDS = ['tech', 'enerji', 'kripto', 'bank', 'saglik', 'lojistik', 'medya'] as const

export function rollAdvisorTip(stockFear: number, daySeed: number): AdvisorTip {
  const r = (Math.sin(daySeed * 0.7) + 1) / 2
  const accuracy = 0.35 + r * 0.45
  if (stockFear > 70) {
    return {
      headline: 'Borsa korkusu yüksek — ucuzdan alma fırsatı olabilir',
      action: 'buy_stock',
      tickerId: STOCK_IDS[Math.floor(r * STOCK_IDS.length)]!,
      accuracy,
    }
  }
  if (stockFear < 25 && r > 0.6) {
    return {
      headline: 'Piyasa aşırı iyimser — kâr realizasyonu düşün',
      action: 'sell_stock',
      tickerId: STOCK_IDS[Math.floor(r * STOCK_IDS.length)]!,
      accuracy,
    }
  }
  const commodities: CommodityId[] = ['gold', 'oil', 'wheat', 'coffee']
  if (r > 0.5) {
    return {
      headline: 'Emtia fiyatları hareketli — altın ve petrol izle',
      action: 'buy_commodity',
      commodityId: commodities[Math.floor(r * commodities.length)]!,
      accuracy,
    }
  }
  return {
    headline: 'Nakit tut, büyük haber bekleniyor',
    action: 'hold',
    accuracy,
  }
}

export const ADVISOR_FEE = 1000
