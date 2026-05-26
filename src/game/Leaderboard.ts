const LEADERBOARD_KEY = 'is_imparatorlugu_leaderboard'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://ymvwvugeakyxmjpojluk.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltdnd2dWdlYWt5eG1qcG9qbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTA3MTAsImV4cCI6MjA5NDg4NjcxMH0.ZKzR-lDjiqtYfYuEAJZMEDyXlt8bejLWWhsGUXI9yJY'
const HEADERS = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
}

export interface LeaderboardEntry {
  lifetimeEarned: number
  comboBest: number
  ipoCount: number
  date: string
}

export interface LeaderboardData {
  bestLifetimeEarned: number
  bestCombo: number
  bestIpoCount: number
  history: LeaderboardEntry[]
  playerName: string
  playerId: string
  friendCode: string
  friends: string[]
}

export interface OnlineScore {
  player_name: string
  lifetime_earned: number
  combo_best: number
  ipo_count: number
  submitted_at: string
  player_id?: string
  friend_code?: string
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function makeFriendCode(playerId: string): string {
  let h = 0
  for (let i = 0; i < playerId.length; i++) h = (Math.imul(31, h) + playerId.charCodeAt(i)) | 0
  return Math.abs(h).toString(36).toUpperCase().slice(0, 6).padEnd(6, '0')
}

export class Leaderboard {
  private data: LeaderboardData

  constructor() {
    this.data = this.load()
  }

  getPlayerId(): string {
    return this.data.playerId
  }

  getFriendCode(): string {
    return this.data.friendCode
  }

  getFriends(): string[] {
    return [...this.data.friends]
  }

  getPlayerName(): string {
    return this.data.playerName
  }

  setPlayerName(name: string): void {
    this.data.playerName = name.slice(0, 20).trim() || 'Anonim'
    this.save()
  }

  addFriendByCode(code: string): { ok: boolean; message: string } {
    const normalized = code.trim().toUpperCase()
    if (normalized.length < 4) return { ok: false, message: 'Geçersiz kod' }
    if (normalized === this.data.friendCode) return { ok: false, message: 'Kendi kodun' }
    if (this.data.friends.includes(normalized)) return { ok: false, message: 'Zaten ekli' }
    if (this.data.friends.length >= 20) return { ok: false, message: 'Arkadaş limiti (20)' }
    this.data.friends.push(normalized)
    this.save()
    return { ok: true, message: 'Arkadaş kodu eklendi' }
  }

  removeFriend(code: string): void {
    this.data.friends = this.data.friends.filter((c) => c !== code.toUpperCase())
    this.save()
  }

  update(stats: { lifetimeEarned: number; comboBest: number; ipoCount: number }): boolean {
    let updated = false
    if (stats.lifetimeEarned > this.data.bestLifetimeEarned) {
      this.data.bestLifetimeEarned = stats.lifetimeEarned
      updated = true
    }
    if (stats.comboBest > this.data.bestCombo) {
      this.data.bestCombo = stats.comboBest
      updated = true
    }
    if (stats.ipoCount > this.data.bestIpoCount) {
      this.data.bestIpoCount = stats.ipoCount
      updated = true
    }
    if (updated) {
      this.data.history.unshift({
        lifetimeEarned: stats.lifetimeEarned,
        comboBest: stats.comboBest,
        ipoCount: stats.ipoCount,
        date: new Date().toISOString().slice(0, 10),
      })
      this.data.history = this.data.history.slice(0, 10)
      this.save()
    }
    return updated
  }

  getData(): LeaderboardData {
    return this.data
  }

  async submitScore(stats: { lifetimeEarned: number; comboBest: number; ipoCount: number }): Promise<boolean> {
    try {
      const body: Record<string, string | number> = {
        player_name: this.data.playerName || 'Anonim',
        lifetime_earned: Math.floor(stats.lifetimeEarned),
        combo_best: stats.comboBest,
        ipo_count: stats.ipoCount,
        player_id: this.data.playerId,
        friend_code: this.data.friendCode,
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/game_leaderboard`, {
        method: 'POST',
        headers: {
          ...HEADERS,
          Prefer: 'return=minimal,resolution=merge-duplicates',
          'on_conflict': 'player_id',
        },
        body: JSON.stringify(body),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async fetchOnlineScores(limit = 10): Promise<OnlineScore[]> {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/game_leaderboard?order=lifetime_earned.desc&limit=${limit}`,
        { headers: HEADERS },
      )
      if (!res.ok) return []
      return (await res.json()) as OnlineScore[]
    } catch {
      return []
    }
  }

  async fetchFriendScores(): Promise<OnlineScore[]> {
    if (this.data.friends.length === 0) return []
    try {
      const codes = this.data.friends.map((c) => encodeURIComponent(c)).join(',')
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/game_leaderboard?friend_code=in.(${codes})&order=lifetime_earned.desc&limit=20`,
        { headers: HEADERS },
      )
      if (!res.ok) return []
      return (await res.json()) as OnlineScore[]
    } catch {
      return []
    }
  }

  async lookupFriendCode(code: string): Promise<OnlineScore | null> {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/game_leaderboard?friend_code=eq.${encodeURIComponent(code.toUpperCase())}&limit=1`,
        { headers: HEADERS },
      )
      if (!res.ok) return null
      const rows = (await res.json()) as OnlineScore[]
      return rows[0] ?? null
    } catch {
      return null
    }
  }

  private load(): LeaderboardData {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY)
      if (!raw) {
        const playerId = randomId()
        return {
          bestLifetimeEarned: 0,
          bestCombo: 0,
          bestIpoCount: 0,
          history: [],
          playerName: 'Anonim',
          playerId,
          friendCode: makeFriendCode(playerId),
          friends: [],
        }
      }
      const parsed = JSON.parse(raw) as Partial<LeaderboardData>
      const playerId = parsed.playerId ?? randomId()
      if (!parsed.playerName) parsed.playerName = 'Anonim'
      return {
        bestLifetimeEarned: parsed.bestLifetimeEarned ?? 0,
        bestCombo: parsed.bestCombo ?? 0,
        bestIpoCount: parsed.bestIpoCount ?? 0,
        history: parsed.history ?? [],
        playerName: parsed.playerName,
        playerId,
        friendCode: parsed.friendCode ?? makeFriendCode(playerId),
        friends: Array.isArray(parsed.friends) ? parsed.friends : [],
      }
    } catch {
      const playerId = randomId()
      return {
        bestLifetimeEarned: 0,
        bestCombo: 0,
        bestIpoCount: 0,
        history: [],
        playerName: 'Anonim',
        playerId,
        friendCode: makeFriendCode(playerId),
        friends: [],
      }
    }
  }

  private save(): void {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.data))
    } catch {
      // ignore
    }
  }
}
