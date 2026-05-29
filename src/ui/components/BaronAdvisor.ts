import type { GameState } from '../../game/GameState'
import { currentTier, xpForTier } from '../../game/SeasonPass'

export interface BaronHint {
  emoji: string
  text: string
  action: string  // data-action value
  actionId?: string  // data-id value
  priority: number  // lower = more urgent
}

export class BaronAdvisor {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('div')
    this.root.className = 'baron-advisor-card'
    this.root.setAttribute('aria-label', 'Baron Danışmanı')
  }

  render(state: GameState): void {
    const hints = this.buildHints(state).slice(0, 3)
    this.root.innerHTML = ''
    if (hints.length === 0) return

    const title = document.createElement('div')
    title.className = 'baron-advisor-title'
    title.textContent = '🧭 Danışman'
    this.root.appendChild(title)

    for (const h of hints) {
      const row = document.createElement('div')
      row.className = 'baron-advisor-hint'
      row.dataset.action = h.action
      if (h.actionId) row.dataset.id = h.actionId
      row.innerHTML = `<span class="baron-hint-emoji">${h.emoji}</span><span class="baron-hint-text">${h.text}</span><span class="baron-hint-arrow">›</span>`
      this.root.appendChild(row)
    }
  }

  private buildHints(state: GameState): BaronHint[] {
    const hints: BaronHint[] = []

    // Heat warning (priority 1)
    if (state.illegalHeat >= 70) {
      hints.push({ emoji: '🚨', text: `Heat ${state.illegalHeat}% — avukat tut veya aklama yap`, action: 'nav-view', actionId: 'shop', priority: 1 })
    } else if (state.illegalHeat >= 50) {
      hints.push({ emoji: '⚠️', text: `Heat ${state.illegalHeat}% — yükseliyor, dikkat et`, action: 'nav-view', actionId: 'shop', priority: 2 })
    }

    // IPO progress (priority 3) — use real exponential threshold: 10M * 2^ipoCount
    const ipoCount = state.ipoCount ?? 0
    const ipoThresholdVal = 10_000_000 * Math.pow(2, Math.max(0, ipoCount))
    const earnedForIpo = state.totalEarned ?? 0
    if (earnedForIpo > 0) {
      const pct = Math.min(99, Math.floor((earnedForIpo / ipoThresholdVal) * 100))
      if (pct >= 70) {
        hints.push({ emoji: '📈', text: `IPO'ya %${pct} ulaştın — pasif gelirini artır`, action: 'nav-view', actionId: 'shop', priority: 3 })
      }
    }

    // City unlock proximity (priority 4)
    const CITY_THRESHOLDS: { id: string; label: string; cost: number; rep: number }[] = [
      { id: 'ankara', label: 'Ankara', cost: 80_000, rep: 25 },
      { id: 'izmir', label: 'İzmir', cost: 300_000, rep: 35 },
      { id: 'dubai', label: 'Dubai', cost: 25_000_000, rep: 60 },
      { id: 'london', label: 'Londra', cost: 100_000_000, rep: 70 },
    ]
    for (const city of CITY_THRESHOLDS) {
      if (state.cities?.unlocked?.includes(city.id as any)) continue
      const moneyPct = (state.money ?? 0) / city.cost
      if (moneyPct >= 0.6 && moneyPct < 1) {
        hints.push({ emoji: '🗺️', text: `${city.label} açılabilir yakında — ${city.rep} itibar ve ${formatMoneySimple(city.cost)} gerekiyor`, action: 'nav-view', actionId: 'market', priority: 4 })
        break
      }
    }

    // Rival threat (priority 5)
    const playerNetWorth = (state.money ?? 0) + (state.bank?.deposit ?? 0)
    const topRival = state.rivals?.find(r => r.netWorth > playerNetWorth && r.relation !== 'bankrupt' && r.relation !== 'merged')
    if (topRival) {
      hints.push({ emoji: '⚔️', text: `${topRival.name} seni geçti — savaş ya da anlaş`, action: 'nav-view', actionId: 'profile', priority: 5 })
    }

    // Season tier near next level (priority 6)
    if (state.season) {
      const xp = state.season.xp ?? 0
      const current = currentTier(xp)
      const nextTierXp = xpForTier(current + 1)
      const prevTierXp = current > 0 ? xpForTier(current) : 0
      const tierRange = nextTierXp - prevTierXp
      const xpInTier = xp - prevTierXp
      const xpPct = tierRange > 0 ? xpInTier / tierRange : 0
      if (xpPct >= 0.7 && xpPct < 1) {
        hints.push({ emoji: '🎯', text: `Sezon tier ${current + 1}'e yakın — günlük görevleri tamamla`, action: 'nav-view', actionId: 'market', priority: 6 })
      }
    }

    // Stock market fear (priority 7)
    const fear = state.stock?.marketFear ?? 0
    if (fear >= 65) {
      hints.push({ emoji: '📊', text: `Borsada korku yüksek (%${Math.round(fear)}) — alım fırsatı olabilir`, action: 'nav-view', actionId: 'market', priority: 7 })
    }

    // Victory path (priority 8) — show best progress
    const victoryHint = this.bestVictoryHint(state)
    if (victoryHint) hints.push(victoryHint)

    return hints.sort((a, b) => a.priority - b.priority)
  }

  private bestVictoryHint(state: GameState): BaronHint | null {
    const netWorth = (state.money ?? 0) + (state.bank?.deposit ?? 0)
    const economic = Math.min(100, (netWorth / 1_000_000_000_000) * 100)
    const political = Math.min(100, ((state.presidentSeasons ?? 0) / 2) * 100 + (state.empire?.politics?.level === 'cumhurbaskan' ? 40 : 0))
    const dynasty = Math.min(100, ((state.dynasty?.generation ?? 1) / 7) * 100)
    const ILLEGAL_IDS = ['kacak_imalat', 'uyusturucu', 'karapara', 'fidye', 'silah_kacakciligi', 'insan_kacakciligi']
    const illegalCount = Object.entries(state.producers ?? {}).filter(([id, count]) => {
      return ILLEGAL_IDS.includes(id) && (count as number) > 0
    }).length
    const shadow = Math.min(100, (illegalCount / 5) * 100)

    const paths = [
      { pct: economic, emoji: '💰', name: 'Ekonomik Zafer', priority: 8 },
      { pct: political, emoji: '🎖️', name: 'Siyasi Zafer', priority: 8 },
      { pct: dynasty, emoji: '👑', name: 'Hanedan Zaferi', priority: 8 },
      { pct: shadow, emoji: '🕶️', name: 'Gölge Zafer', priority: 8 },
    ].filter(p => p.pct >= 5)

    if (paths.length === 0) return null
    const best = paths.reduce((a, b) => (a.pct > b.pct ? a : b))

    return { emoji: best.emoji, text: `${best.name} %${Math.round(best.pct)} — yaklaşıyorsun`, action: 'nav-view', actionId: 'profile', priority: 8 }
  }
}

function formatMoneySimple(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M₺`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K₺`
  return `${n}₺`
}
