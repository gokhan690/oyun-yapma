import { localDayKey } from './dateUtils'

export const DAILY_GOAL_MIN = 100_000
/** Günlük hedef = en az bu kadar oyun günü geliri */
export const DAILY_GOAL_IPD_DAYS = 3

export function dailyGoalDayKey(): string {
  return localDayKey()
}

export function scaledDailyGoalTarget(incomePerDay: number): number {
  return Math.max(DAILY_GOAL_MIN, Math.floor(incomePerDay * DAILY_GOAL_IPD_DAYS))
}

/** @deprecated use incomePerDay */
export function scaledDailyGoalTargetFromIps(incomePerSecond: number): number {
  return scaledDailyGoalTarget(incomePerSecond)
}

export function dailyGoalProgress(earned: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, (earned / target) * 100)
}

export function dailyGoalComplete(earned: number, target: number): boolean {
  return earned >= target
}

export const DAILY_GOAL_TARGET = DAILY_GOAL_MIN
