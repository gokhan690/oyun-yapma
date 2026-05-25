import { PRESTIGE_THRESHOLD } from './Prestige'
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
}

export function progressPathSnapshot(totalEarned: number): ProgressPathSnapshot {
  const prog = rankProgress(totalEarned)
  const next = prog.next
  const remaining = next ? Math.max(0, next.minEarned - totalEarned) : 0
  const ipoPct = Math.min(100, (totalEarned / PRESTIGE_THRESHOLD) * 100)
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
    ipoThreshold: PRESTIGE_THRESHOLD,
  }
}

export function formatProgressLine(s: ProgressPathSnapshot): string {
  if (!s.nextRank) return `${s.currentEmoji} ${s.currentRank} — maksimum rütbe`
  return `Sonraki: ${s.nextEmoji} ${s.nextRank} → ${formatMoney(s.nextThreshold)}'de açılır (${formatMoney(s.remaining)} kaldı)`
}
