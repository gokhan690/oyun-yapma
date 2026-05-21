/** 1 gerçek saniye = kaç oyun dakikası (2 → tam oyun günü ~12 dk) */
export const GAME_MINUTES_PER_REAL_SECOND = 2

const MS_PER_GAME_MINUTE = 60_000
const MS_PER_GAME_HOUR = 60 * MS_PER_GAME_MINUTE
const MS_PER_GAME_DAY = 24 * MS_PER_GAME_HOUR

/** Gerçek saniyeyi oyun zamanına çevir */
export function realSecondsToGameMs(dtSec: number): number {
  return dtSec * GAME_MINUTES_PER_REAL_SECOND * MS_PER_GAME_MINUTE
}

export function gameHour(gameTimeMs: number): number {
  return Math.floor((gameTimeMs % MS_PER_GAME_DAY) / MS_PER_GAME_HOUR)
}

export function gameDay(gameTimeMs: number): number {
  return Math.floor(gameTimeMs / MS_PER_GAME_DAY) + 1
}

export function isGameNight(gameTimeMs: number): boolean {
  const h = gameHour(gameTimeMs)
  return h >= 20 || h < 6
}

/** Örn. "Gün 3 · 14:07" */
export function formatGameClock(gameTimeMs: number): string {
  const day = gameDay(gameTimeMs)
  const h = gameHour(gameTimeMs)
  const m = Math.floor((gameTimeMs % MS_PER_GAME_HOUR) / MS_PER_GAME_MINUTE)
  return `Gün ${day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
