export interface InsuranceState {
  business: boolean
  illegal: boolean
  dynasty: boolean
}

export const INSURANCE_BASE_COST = {
  business: 150,
  illegal: 400,
  dynasty: 500,
} as const

export function createInsuranceState(): InsuranceState {
  return { business: false, illegal: false, dynasty: false }
}

// Toplam oran %10: işletme %4 + illegal %4.5 + hanedan %1.5
// İllegal ve işletme daha yüksek pay; hanedan azaltıldı.
export function insuranceDailyCost(ins: InsuranceState, totalBusinesses = 0, ipoCount = 0, incomePerDay = 0): number {
  let c = 0
  if (ins.business) {
    const base = INSURANCE_BASE_COST.business + totalBusinesses * 25
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.04) : base
  }
  if (ins.illegal) {
    const base = INSURANCE_BASE_COST.illegal + totalBusinesses * 80
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.045) : base
  }
  if (ins.dynasty) {
    const base = INSURANCE_BASE_COST.dynasty + totalBusinesses * 100 + ipoCount * 500
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.015) : base
  }
  return Math.floor(c)
}

export function raidFineMult(ins: InsuranceState, isFirstRaidToday: boolean): number {
  if (ins.illegal && isFirstRaidToday) return 0
  if (ins.business) return 0.5
  return 1
}
