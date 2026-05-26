export interface InsuranceState {
  business: boolean
  illegal: boolean
  dynasty: boolean
}

export const INSURANCE_BASE_COST = {
  business: 200,
  illegal: 800,
  dynasty: 2000,
} as const

export function createInsuranceState(): InsuranceState {
  return { business: false, illegal: false, dynasty: false }
}

export function insuranceDailyCost(ins: InsuranceState, totalBusinesses = 0, ipoCount = 0, incomePerDay = 0): number {
  let c = 0
  if (ins.business) {
    const base = INSURANCE_BASE_COST.business + totalBusinesses * 120
    const incomeScale = incomePerDay > 0 ? Math.max(base, incomePerDay * 0.08) : base
    c += incomeScale
  }
  if (ins.illegal) {
    const base = INSURANCE_BASE_COST.illegal + totalBusinesses * 500
    const incomeScale = incomePerDay > 0 ? Math.max(base, incomePerDay * 0.18) : base
    c += incomeScale
  }
  if (ins.dynasty) {
    const base = INSURANCE_BASE_COST.dynasty + totalBusinesses * 1_200 + ipoCount * 5_000
    const incomeScale = incomePerDay > 0 ? Math.max(base, incomePerDay * 0.28) : base
    c += incomeScale
  }
  return Math.floor(c)
}

export function raidFineMult(ins: InsuranceState, isFirstRaidToday: boolean): number {
  if (ins.illegal && isFirstRaidToday) return 0
  if (ins.business) return 0.5
  return 1
}
