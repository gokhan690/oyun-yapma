export type FranchiseCity = 'istanbul' | 'ankara' | 'izmir'

export interface FranchiseBranch {
  producerId: string
  city: FranchiseCity
  openedGameDay: number
  incomeMult: number
}

export const FRANCHISE_UNLOCK_COUNT = 10
export const FRANCHISE_COST = 50_000
export const FRANCHISE_REPUTATION_MIN = 45

export const FRANCHISE_CITIES: { id: FranchiseCity; label: string; repReq: number }[] = [
  { id: 'istanbul', label: 'İstanbul', repReq: 45 },
  { id: 'ankara', label: 'Ankara', repReq: 55 },
  { id: 'izmir', label: 'İzmir', repReq: 50 },
]

export function franchiseIncomeBonus(branches: FranchiseBranch[]): number {
  return branches.reduce((s, b) => s + b.incomeMult, 0)
}

export interface FranchiseOpenContext {
  producers: Record<string, number>
  reputation: number
  franchises: FranchiseBranch[]
  canAfford: (amount: number) => boolean
}

export function franchiseOpenFailureReason(
  ctx: FranchiseOpenContext,
  producerId: string,
  city: FranchiseCity,
): string | null {
  const owned = ctx.producers[producerId] ?? 0
  if (owned < FRANCHISE_UNLOCK_COUNT) {
    return `Franchise için en az ${FRANCHISE_UNLOCK_COUNT} adet gerekli (şu an ${owned})`
  }
  const cityDef = FRANCHISE_CITIES.find((c) => c.id === city)
  if (!cityDef) return 'Geçersiz şehir'
  if (ctx.reputation < cityDef.repReq) {
    return `${cityDef.label} için min itibar ${cityDef.repReq} (sen: ${Math.floor(ctx.reputation)})`
  }
  if (!ctx.canAfford(FRANCHISE_COST)) {
    return `Yetersiz para — franchise açılışı ${FRANCHISE_COST.toLocaleString('tr-TR')}₺`
  }
  if (ctx.franchises.some((f) => f.producerId === producerId && f.city === city)) {
    return 'Bu şehirde zaten franchise var'
  }
  return null
}
