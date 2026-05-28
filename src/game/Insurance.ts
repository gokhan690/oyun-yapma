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

// Sigorta ücreti günlük kazanca oranlanır: gelir arttıkça prim de artar.
export function insuranceDailyCost(ins: InsuranceState, totalBusinesses = 0, ipoCount = 0, incomePerDay = 0): number {
  let c = 0
  if (ins.business) {
    const base = INSURANCE_BASE_COST.business + totalBusinesses * 40
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.05) : base
  }
  if (ins.illegal) {
    const base = INSURANCE_BASE_COST.illegal + totalBusinesses * 150
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.10) : base
  }
  if (ins.dynasty) {
    const base = INSURANCE_BASE_COST.dynasty + totalBusinesses * 300 + ipoCount * 2_000
    c += incomePerDay > 0 ? Math.max(base, incomePerDay * 0.15) : base
  }
  return Math.floor(c)
}

export function raidFineMult(ins: InsuranceState, isFirstRaidToday: boolean): number {
  if (ins.illegal && isFirstRaidToday) return 0
  if (ins.business) return 0.5
  return 1
}
