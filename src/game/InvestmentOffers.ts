export interface InvestmentOffer {
  id: string
  title: string
  description: string
  cost: number
  expiresAt: number
  resolveGameDay: number
  minReturn: number
  maxReturn: number
  emoji?: string
  sector?: string
}

let offerSeq = 0

interface OfferTemplate {
  title: string
  description: string
  emoji: string
  sector: string
  costMult: number
  minCost: number
  resolveDays: number
  minReturn: number
  maxReturn: number
  ttlMs: number
}

const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    title: 'TechVenture A.Ş.',
    description: 'Erken aşama yazılım startup — 7 gün bekle, riskli ama yüksek getiri',
    emoji: '💻',
    sector: 'Teknoloji',
    costMult: 8,
    minCost: 20_000,
    resolveDays: 7,
    minReturn: 0.4,
    maxReturn: 2.0,
    ttlMs: 90_000,
  },
  {
    title: 'GreenEnergy Labs',
    description: 'Yenilenebilir enerji AR-GE — orta risk, 10 gün vade',
    emoji: '🌱',
    sector: 'Enerji',
    costMult: 10,
    minCost: 35_000,
    resolveDays: 10,
    minReturn: 0.55,
    maxReturn: 1.6,
    ttlMs: 120_000,
  },
  {
    title: 'Anadolu Lojistik Hub',
    description: 'Bölgesel depo ağı genişlemesi — düşük risk, istikrarlı getiri',
    emoji: '🚚',
    sector: 'Lojistik',
    costMult: 6,
    minCost: 25_000,
    resolveDays: 5,
    minReturn: 0.7,
    maxReturn: 1.25,
    ttlMs: 75_000,
  },
  {
    title: 'MedyaStream Plus',
    description: 'Streaming platformu seed turu — hype dalgasına bağlı',
    emoji: '📺',
    sector: 'Medya',
    costMult: 9,
    minCost: 30_000,
    resolveDays: 8,
    minReturn: 0.35,
    maxReturn: 2.2,
    ttlMs: 100_000,
  },
  {
    title: 'CryptoMine DAO',
    description: 'Merkeziyetsiz madencilik havuzu — aşırı volatil',
    emoji: '🪙',
    sector: 'Kripto',
    costMult: 5,
    minCost: 15_000,
    resolveDays: 4,
    minReturn: 0.2,
    maxReturn: 3.0,
    ttlMs: 60_000,
  },
  {
    title: 'Luxury Resort Chain',
    description: 'Akdeniz otel zinciri franchise — uzun vade, güvenli',
    emoji: '🏨',
    sector: 'Turizm',
    costMult: 12,
    minCost: 50_000,
    resolveDays: 14,
    minReturn: 0.8,
    maxReturn: 1.4,
    ttlMs: 150_000,
  },
  {
    title: 'BioPharm Trials Co.',
    description: 'Faz-2 ilaç denemesi — FDA onayına bağlı jackpot',
    emoji: '💊',
    sector: 'Sağlık',
    costMult: 14,
    minCost: 60_000,
    resolveDays: 12,
    minReturn: 0.25,
    maxReturn: 2.5,
    ttlMs: 130_000,
  },
  {
    title: 'Urban E-Sports Arena',
    description: 'Turnuva salonu & takım yatırımı — sezonluk gelir',
    emoji: '🎮',
    sector: 'E-Spor',
    costMult: 7,
    minCost: 22_000,
    resolveDays: 6,
    minReturn: 0.5,
    maxReturn: 1.8,
    ttlMs: 85_000,
  },
]

export function createInvestmentOffer(incomePerDay: number, gameDay: number): InvestmentOffer {
  offerSeq++
  const t = OFFER_TEMPLATES[gameDay % OFFER_TEMPLATES.length]!
  const cost = Math.max(t.minCost, Math.floor(incomePerDay * t.costMult))
  return {
    id: `inv_${offerSeq}`,
    title: t.title,
    description: t.description,
    cost,
    expiresAt: Date.now() + t.ttlMs,
    resolveGameDay: gameDay + t.resolveDays,
    minReturn: t.minReturn,
    maxReturn: t.maxReturn,
    emoji: t.emoji,
    sector: t.sector,
  }
}

/** @deprecated use createInvestmentOffer */
export function createStartupOffer(incomePerDay: number, gameDay: number): InvestmentOffer {
  return createInvestmentOffer(incomePerDay, gameDay)
}

export interface PendingInvestment {
  offerId: string
  cost: number
  resolveGameDay: number
  minReturn: number
  maxReturn: number
}
