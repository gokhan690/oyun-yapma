export interface InsuranceState {
  business: boolean
  illegal: boolean
  dynasty: boolean
}

export const INSURANCE_DAILY_COST = {
  business: 500,
  illegal: 2000,
  dynasty: 5000,
} as const

export function createInsuranceState(): InsuranceState {
  return { business: false, illegal: false, dynasty: false }
}

export function insuranceDailyCost(ins: InsuranceState): number {
  let c = 0
  if (ins.business) c += INSURANCE_DAILY_COST.business
  if (ins.illegal) c += INSURANCE_DAILY_COST.illegal
  if (ins.dynasty) c += INSURANCE_DAILY_COST.dynasty
  return c
}

export function raidFineMult(ins: InsuranceState, isFirstRaidToday: boolean): number {
  if (ins.illegal && isFirstRaidToday) return 0
  if (ins.business) return 0.5
  return 1
}
