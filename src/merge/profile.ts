/**
 * Kalıcı oyuncu profili — para, başarımlar, albüm, günlük deneme ve
 * seçili yardımcılar tek bir kayıtta tutulur.
 */

import { storageGet, storageSet } from './storage'
import { todayKey } from './rng'

const KEY = 'fm_profile_v1'

export interface ProfileStats {
  games: number
  merges: number
  watermelons: number
  bestCombo: number
  drops: number
}

export interface DailyRecord {
  date: string
  score: number
  done: boolean
}

export interface Profile {
  coins: number
  stars: number
  /** Albümde açılmış meyve tier'ları */
  album: number[]
  /** Kazanılmış başarım id'leri */
  achievements: string[]
  stats: ProfileStats
  daily: DailyRecord
  /** Seçili yardımcılar (en fazla 3) */
  loadout: string[]
}

const DEFAULT_PROFILE: Profile = {
  coins: 0,
  stars: 0,
  album: [],
  achievements: [],
  stats: { games: 0, merges: 0, watermelons: 0, bestCombo: 0, drops: 0 },
  daily: { date: '', score: 0, done: false },
  loadout: ['bomb', 'swap', 'undo'],
}

let cache: Profile | null = null

export function loadProfile(): Profile {
  if (cache) return cache
  const raw = storageGet(KEY)
  if (!raw) {
    cache = clone(DEFAULT_PROFILE)
    return cache
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>
    cache = {
      coins: num(parsed.coins),
      stars: num(parsed.stars),
      album: Array.isArray(parsed.album) ? parsed.album.filter((t) => typeof t === 'number') : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((a) => typeof a === 'string') : [],
      stats: {
        games: num(parsed.stats?.games),
        merges: num(parsed.stats?.merges),
        watermelons: num(parsed.stats?.watermelons),
        bestCombo: num(parsed.stats?.bestCombo),
        drops: num(parsed.stats?.drops),
      },
      daily: {
        date: typeof parsed.daily?.date === 'string' ? parsed.daily.date : '',
        score: num(parsed.daily?.score),
        done: parsed.daily?.done === true,
      },
      loadout:
        Array.isArray(parsed.loadout) && parsed.loadout.length > 0
          ? parsed.loadout.filter((p) => typeof p === 'string').slice(0, 3)
          : clone(DEFAULT_PROFILE.loadout),
    }
  } catch {
    cache = clone(DEFAULT_PROFILE)
  }
  return cache
}

export function saveProfile(profile: Profile): void {
  cache = profile
  storageSet(KEY, JSON.stringify(profile))
}

export function updateProfile(fn: (p: Profile) => void): Profile {
  const p = loadProfile()
  fn(p)
  saveProfile(p)
  return p
}

/** Bugünün günlük kaydı; tarih değiştiyse sıfırlanır. */
export function dailyRecord(): DailyRecord {
  const p = loadProfile()
  const today = todayKey()
  if (p.daily.date !== today) {
    p.daily = { date: today, score: 0, done: false }
    saveProfile(p)
  }
  return p.daily
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
