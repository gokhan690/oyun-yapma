export const GAME_START_YEAR = 2026
/** 5 gerçek saniye = 1 oyun günü (BitLife tarzı yavaş tempo) */
export const REAL_SECONDS_PER_GAME_DAY = 5

export const MS_PER_GAME_DAY = REAL_SECONDS_PER_GAME_DAY * 1000

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** Gerçek saniyeyi oyun zamanına çevir */
export function realSecondsToGameMs(dtSec: number): number {
  return dtSec * MS_PER_GAME_DAY
}

export function gameDay(gameTimeMs: number): number {
  return Math.floor(gameTimeMs / MS_PER_GAME_DAY) + 1
}

export function gameCalendarDate(gameTimeMs: number): Date {
  const d = new Date(Date.UTC(GAME_START_YEAR, 0, 1))
  d.setUTCDate(d.getUTCDate() + gameDay(gameTimeMs) - 1)
  return d
}

export function gameYear(gameTimeMs: number): number {
  return gameCalendarDate(gameTimeMs).getUTCFullYear()
}

export function gameMonth(gameTimeMs: number): number {
  return gameCalendarDate(gameTimeMs).getUTCMonth() + 1
}

/** Cumartesi veya Pazar */
export function isGameWeekend(gameTimeMs: number): boolean {
  const dow = gameCalendarDate(gameTimeMs).getUTCDay()
  return dow === 0 || dow === 6
}

/** @deprecated use isGameWeekend — hafta sonu pasif bonusu için */
export function isGameNight(gameTimeMs: number): boolean {
  return isGameWeekend(gameTimeMs)
}

export function gameHour(_gameTimeMs: number): number {
  return 12
}

/** Örn. "15 Oca 2026 · Gün 15" */
export function formatGameClock(gameTimeMs: number): string {
  const day = gameDay(gameTimeMs)
  const cal = gameCalendarDate(gameTimeMs)
  const month = MONTH_NAMES[cal.getUTCMonth()] ?? '?'
  return `${cal.getUTCDate()} ${month} ${cal.getUTCFullYear()} · Gün ${day}`
}

/** Oyun takviminde hafta (7 oyun günü) */
export function gameWeekKey(gameTimeMs: number): string {
  return `gw${Math.floor((gameDay(gameTimeMs) - 1) / 7)}`
}

/** Oyun takviminde sezon (30 oyun günü) */
export function gameSeasonKey(gameTimeMs: number): string {
  return `gs${Math.floor((gameDay(gameTimeMs) - 1) / 30)}`
}

export const MS_PER_GAME_HOUR = MS_PER_GAME_DAY / 24
