import { localDayKey } from './dateUtils'

export const DAILY_GOAL_MIN = 100_000
export const DAILY_GOAL_IPS_SECONDS = 300

export function dailyGoalDayKey(): string {
  return localDayKey()
}

export function scaledDailyGoalTarget(incomePerSecond: number): number {
  return Math.max(DAILY_GOAL_MIN, Math.floor(incomePerSecond * DAILY_GOAL_IPS_SECONDS))
}

export function dailyGoalProgress(earned: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, (earned / target) * 100)
}

export function dailyGoalComplete(earned: number, target: number): boolean {
  return earned >= target
}

/** @deprecated use scaledDailyGoalTarget */
export const DAILY_GOAL_TARGET = DAILY_GOAL_MIN
