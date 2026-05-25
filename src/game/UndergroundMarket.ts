export type UndergroundMarketAction =
  | 'stolen_goods'
  | 'fake_docs'
  | 'intel_leak'
  | 'tax_evasion'

export interface UndergroundMarketDef {
  id: UndergroundMarketAction
  name: string
  emoji: string
  description: string
  dailyCost: number
  heatGain: number
  incomeMult?: number
  repDelta?: number
}

export const UNDERGROUND_MARKET: UndergroundMarketDef[] = [
  {
    id: 'stolen_goods',
    name: 'Çalıntı Mal Deposu',
    emoji: '📦',
    description: 'Ucuza stok al, hızlı sat — gelir +%12',
    dailyCost: 1500,
    heatGain: 8,
    incomeMult: 0.12,
  },
  {
    id: 'fake_docs',
    name: 'Sahte Belge',
    emoji: '📄',
    description: 'İtibar manipülasyonu — +3 itibar, riskli',
    dailyCost: 3000,
    heatGain: 12,
    repDelta: 3,
  },
  {
    id: 'intel_leak',
    name: 'Bilgi Kaçakçılığı',
    emoji: '🕵️',
    description: 'Rakip baron hareketlerini önceden gör',
    dailyCost: 5000,
    heatGain: 10,
  },
  {
    id: 'tax_evasion',
    name: 'Vergi Kaçakçılığı',
    emoji: '💸',
    description: 'Gelirin %10\'u gizli kalır',
    dailyCost: 4000,
    heatGain: 15,
    incomeMult: 0.1,
  },
]

export function undergroundActionDef(id: UndergroundMarketAction): UndergroundMarketDef {
  return UNDERGROUND_MARKET.find((a) => a.id === id) ?? UNDERGROUND_MARKET[0]!
}
