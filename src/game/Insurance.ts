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

export function insuranceDailyCost(ins: InsuranceState, totalBusinesses = 0, ipoCount = 0): number {
  let c = 0
  if (ins.business) c += INSURANCE_BASE_COST.business + totalBusinesses * 60
  if (ins.illegal) c += INSURANCE_BASE_COST.illegal + totalBusinesses * 250
  if (ins.dynasty) c += INSURANCE_BASE_COST.dynasty + totalBusinesses * 800 + ipoCount * 3000
  return c
}

export function raidFineMult(ins: InsuranceState, isFirstRaidToday: boolean): number {
  if (ins.illegal && isFirstRaidToday) return 0
  if (ins.business) return 0.5
  return 1
}
