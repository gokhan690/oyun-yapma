const LEADERBOARD_KEY = 'is_imparatorlugu_leaderboard'
const SUPABASE_URL = 'https://ymvwvugeakyxmjpojluk.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltdnd2dWdlYWt5eG1qcG9qbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTA3MTAsImV4cCI6MjA5NDg4NjcxMH0.ZKzR-lDjiqtYfYuEAJZMEDyXlt8bejLWWhsGUXI9yJY'
const HEADERS = {
  'apikey': SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
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
}

export interface OnlineScore {
  player_name: string
  lifetime_earned: number
  combo_best: number
  ipo_count: number
  submitted_at: string
}

export class Leaderboard {
  private data: LeaderboardData

  constructor() {
    this.data = this.load()
  }

  getPlayerName(): string {
    return this.data.playerName
  }

  setPlayerName(name: string): void {
    this.data.playerName = name.slice(0, 20).trim() || 'Anonim'
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/game_leaderboard`, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          player_name: this.data.playerName || 'Anonim',
          lifetime_earned: Math.floor(stats.lifetimeEarned),
          combo_best: stats.comboBest,
          ipo_count: stats.ipoCount,
        }),
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

  private load(): LeaderboardData {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY)
      if (!raw) return { bestLifetimeEarned: 0, bestCombo: 0, bestIpoCount: 0, history: [], playerName: 'Anonim' }
      const parsed = JSON.parse(raw) as LeaderboardData
      if (!parsed.playerName) parsed.playerName = 'Anonim'
      return parsed
    } catch {
      return { bestLifetimeEarned: 0, bestCombo: 0, bestIpoCount: 0, history: [], playerName: 'Anonim' }
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
