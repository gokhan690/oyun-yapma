import { tRaw } from '../i18n'

export interface PlayerRankDef {
  id: string
  name: string
  emoji: string
  minEarned: number
}

export const PLAYER_RANKS: PlayerRankDef[] = [
  { id: 'cirak', name: 'Çırak', emoji: '🌱', minEarned: 0 },
  { id: 'stajyer', name: 'Stajyer', emoji: '📚', minEarned: 100 },
  { id: 'girisimci', name: 'Girişimci', emoji: '💼', minEarned: 1_000 },
  { id: 'isletmeci', name: 'İşletmeci', emoji: '🏪', minEarned: 10_000 },
  { id: 'patron', name: 'Patron', emoji: '👔', minEarned: 100_000 },
  { id: 'milyoner', name: 'Milyoner', emoji: '💰', minEarned: 1_000_000 },
  { id: 'holding', name: 'Holding Sahibi', emoji: '🏢', minEarned: 10_000_000 },
  { id: 'imparator', name: 'İmparator', emoji: '👑', minEarned: 100_000_000 },
  { id: 'trilyoner', name: 'Trilyoner', emoji: '🌍', minEarned: 1_000_000_000 },
  { id: 'galaktik', name: 'Galaktik Baron', emoji: '🌌', minEarned: 100_000_000_000 },
]

export function currentRank(totalEarned: number): PlayerRankDef {
  let rank = PLAYER_RANKS[0]!
  for (const r of PLAYER_RANKS) {
    if (totalEarned >= r.minEarned) rank = r
  }
  return rank
}

export function nextRank(totalEarned: number): PlayerRankDef | null {
  for (const r of PLAYER_RANKS) {
    if (totalEarned < r.minEarned) return r
  }
  return null
}

export function rankProgress(totalEarned: number): { pct: number; next: PlayerRankDef | null; current: PlayerRankDef } {
  const current = currentRank(totalEarned)
  const next = nextRank(totalEarned)
  if (!next) return { pct: 100, next: null, current }
  const prev = current.minEarned
  const span = next.minEarned - prev
  const pct = span > 0 ? Math.min(100, ((totalEarned - prev) / span) * 100) : 100
  return { pct, next, current }
}

export function rankName(r: PlayerRankDef): string {
  return tRaw(`rank_${r.id}_name`) ?? r.name
}
