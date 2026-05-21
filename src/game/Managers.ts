export const MANAGER_BONUS = 0.25
export const MANAGER_COST_MULT = 500

export function managerCost(baseIncomePerUnit: number, owned: number): number {
  if (owned <= 0) return Infinity
  return Math.max(1000, baseIncomePerUnit * owned * MANAGER_COST_MULT)
}

export function hasManager(managers: Record<string, boolean>, producerId: string): boolean {
  return managers[producerId] === true
}

export function managerMultiplier(managers: Record<string, boolean>, producerId: string): number {
  return hasManager(managers, producerId) ? 1 + MANAGER_BONUS : 1
}
