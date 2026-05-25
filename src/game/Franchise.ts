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
