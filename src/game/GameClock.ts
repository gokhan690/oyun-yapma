import { t } from '../i18n'

export const GAME_START_YEAR = 2026
/** 12 gerçek saniye = 1 ekonomi günü (para/işletme zamanı) */
export const REAL_SECONDS_PER_GAME_DAY = 12
export const MS_PER_GAME_DAY = REAL_SECONDS_PER_GAME_DAY * 1000

/**
 * Hayat zamanı çarpanı: ekonomi zamanından 6x hızlı akar.
 * 1 gerçek dakika = 1 oyun ayı (2 sn/gün × 30 gün = 60 sn)
 * Yani 1 gerçek saat ≈ 5 oyun yılı
 */
export const LIFE_TIME_SCALE = 6

/** Hayat zamanı ms cinsinden — yaş/varis/çocuk hesapları için */
export function lifeGameTimeMs(econTimeMs: number): number {
  return econTimeMs * LIFE_TIME_SCALE
}

/** Hayat takviminde geçen gün sayısı */
export function lifeGameDay(econTimeMs: number): number {
  return Math.floor(lifeGameTimeMs(econTimeMs) / MS_PER_GAME_DAY) + 1
}

/** Hayat takviminde geçen yıl */
export function lifeGameYear(econTimeMs: number): number {
  const d = new Date(Date.UTC(GAME_START_YEAR, 0, 1))
  d.setUTCDate(d.getUTCDate() + lifeGameDay(econTimeMs) - 1)
  return d.getUTCFullYear()
}

const MONTH_KEYS = [
  'month_jan', 'month_feb', 'month_mar', 'month_apr', 'month_may', 'month_jun',
  'month_jul', 'month_aug', 'month_sep', 'month_oct', 'month_nov', 'month_dec',
] as const

function localizedMonth(monthIndex: number): string {
  const key = MONTH_KEYS[monthIndex]
  return key ? t(key) : '?'
}

/** Gerçek saniyeyi oyun zamanına çevir */
export function realSecondsToGameMs(dtSec: number): number {
  return dtSec * 1000
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
  const month = localizedMonth(cal.getUTCMonth())
  return `${cal.getUTCDate()} ${month} ${cal.getUTCFullYear()} · ${t('clock_day')} ${day}`
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
