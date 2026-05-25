import { localDayKey } from './dateUtils'

export const DAILY_GOAL_MIN = 8_000
/** Günlük hedef = en az bu kadar oyun günü geliri */
export const DAILY_GOAL_IPD_DAYS = 12

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

/** Giriş ödülü — streak arttıkça yavaş büyür, erken günlerde milyon vermez */
export function calcDailyLoginReward(streak: number, incomePerDay: number): number {
  const s = Math.max(1, Math.min(30, streak))
  const flat = 15 * s
  const fromPassive = Math.floor(incomePerDay * 0.018 * s)
  const softCap = 150 + s * 180
  return Math.min(softCap, Math.max(flat, fromPassive))
}

export function streakMilestoneBonus(milestone: number): number {
  if (milestone === 7) return 1_200
  if (milestone === 14) return 2_800
  if (milestone === 30) return 8_000
  return 0
}

export const STREAK_MILESTONES = [7, 14, 30] as const

export function nextStreakMilestone(streak: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return m
  }
  return null
}

export const DAILY_GOAL_TARGET = DAILY_GOAL_MIN
