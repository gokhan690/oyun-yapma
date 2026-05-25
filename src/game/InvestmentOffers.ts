export interface InvestmentOffer {
  id: string
  title: string
  description: string
  cost: number
  expiresAt: number
  resolveGameDay: number
  minReturn: number
  maxReturn: number
}

let offerSeq = 0

export function createStartupOffer(incomePerDay: number, gameDay: number): InvestmentOffer {
  offerSeq++
  const cost = Math.max(20_000, Math.floor(incomePerDay * 8))
  return {
    id: `inv_${offerSeq}`,
    title: 'TechVenture A.Ş.',
    description: 'Kurulma aşamasında startup — 7 gün bekle, %40–200 arası geri dön (riskli)',
    cost,
    expiresAt: Date.now() + 90_000,
    resolveGameDay: gameDay + 7,
    minReturn: 0.4,
    maxReturn: 2.0,
  }
}

export interface PendingInvestment {
  offerId: string
  cost: number
  resolveGameDay: number
  minReturn: number
  maxReturn: number
}
