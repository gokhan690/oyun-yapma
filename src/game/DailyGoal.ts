import { localDayKey } from './dateUtils'

export const DAILY_GOAL_TARGET = 10_000

export function dailyGoalDayKey(): string {
  return localDayKey()
}

export function dailyGoalProgress(earned: number): number {
  return Math.min(100, (earned / DAILY_GOAL_TARGET) * 100)
}

export function dailyGoalComplete(earned: number): boolean {
  return earned >= DAILY_GOAL_TARGET
}
