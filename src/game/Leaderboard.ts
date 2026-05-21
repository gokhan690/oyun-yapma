const LEADERBOARD_KEY = 'is_imparatorlugu_leaderboard'

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
}

export class Leaderboard {
  private data: LeaderboardData

  constructor() {
    this.data = this.load()
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

  private load(): LeaderboardData {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY)
      if (!raw) return { bestLifetimeEarned: 0, bestCombo: 0, bestIpoCount: 0, history: [] }
      return JSON.parse(raw) as LeaderboardData
    } catch {
      return { bestLifetimeEarned: 0, bestCombo: 0, bestIpoCount: 0, history: [] }
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
