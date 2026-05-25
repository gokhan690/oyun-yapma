import { ipoThreshold } from './Prestige'
import { rankProgress } from './PlayerRank'
import { formatMoney } from './Economy'

export interface ProgressPathSnapshot {
  currentRank: string
  currentEmoji: string
  nextRank: string | null
  nextEmoji: string | null
  nextThreshold: number
  totalEarned: number
  remaining: number
  rankPct: number
  ipoPct: number
  ipoThreshold: number
  ipoCount: number
}

export function progressPathSnapshot(totalEarned: number, ipoCount = 0): ProgressPathSnapshot {
  const prog = rankProgress(totalEarned)
  const next = prog.next
  const remaining = next ? Math.max(0, next.minEarned - totalEarned) : 0
  const threshold = ipoThreshold(ipoCount)
  const ipoPct = Math.min(100, (totalEarned / threshold) * 100)
  return {
    currentRank: prog.current.name,
    currentEmoji: prog.current.emoji,
    nextRank: next?.name ?? null,
    nextEmoji: next?.emoji ?? null,
    nextThreshold: next?.minEarned ?? 0,
    totalEarned,
    remaining,
    rankPct: prog.pct,
    ipoPct,
    ipoThreshold: threshold,
    ipoCount,
  }
}

export function formatProgressLine(s: ProgressPathSnapshot): string {
  if (!s.nextRank) {
    return `${s.currentEmoji} ${s.currentRank} · IPO ${formatMoney(s.ipoThreshold)} (${s.ipoPct.toFixed(1)}%)`
  }
  return `Sonraki: ${s.nextEmoji} ${s.nextRank} → ${formatMoney(s.nextThreshold)} (${formatMoney(s.remaining)} kaldı) · IPO %${s.ipoPct.toFixed(1)}`
}
