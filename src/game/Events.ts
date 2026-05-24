import type { BoostKind } from './BoostInventory'
import { GOLDEN_EVENT_CLAIM_MS, GOLDEN_EVENT_INTERVAL_MS } from './EventDirector'

export type EventKind = 'investor' | 'tax_refund' | 'viral_ad'

export interface GameEventDef {
  id: EventKind
  title: string
  description: string
  emoji: string
  durationMs: number
  rewardType: 'income_boost'
  rewardValue: number
  boostKind: BoostKind
  boostDurationMs: number
  pendingLabel: string
}

export const EVENT_DEFS: GameEventDef[] = [
  {
    id: 'investor',
    title: 'Yatırımcı Teklifi',
    description: 'Reklam izle — bonus envanterine gelir x2 eklenir (2 dk).',
    emoji: '💼',
    durationMs: GOLDEN_EVENT_CLAIM_MS,
    rewardType: 'income_boost',
    rewardValue: 0,
    boostKind: 'income_2x',
    boostDurationMs: 120_000,
    pendingLabel: 'Yatırımcı teklifi',
  },
  {
    id: 'tax_refund',
    title: 'Vergi İadesi',
    description: 'Reklam izle — kısa süreli gelir x2 bonusu envantere gider.',
    emoji: '🧾',
    durationMs: GOLDEN_EVENT_CLAIM_MS,
    rewardType: 'income_boost',
    rewardValue: 0,
    boostKind: 'income_2x',
    boostDurationMs: 90_000,
    pendingLabel: 'Vergi iadesi',
  },
  {
    id: 'viral_ad',
    title: 'Viral Reklam',
    description: 'Reklam izle — gelir x3 bonusu envantere eklenir (3 dk).',
    emoji: '📱',
    durationMs: GOLDEN_EVENT_CLAIM_MS,
    rewardType: 'income_boost',
    rewardValue: 0,
    boostKind: 'income_3x',
    boostDurationMs: 180_000,
    pendingLabel: 'Viral reklam',
  },
]

export function pickRandomEvent(): GameEventDef {
  const idx = Math.floor(Math.random() * EVENT_DEFS.length)
  return EVENT_DEFS[idx]!
}

export function nextEventDelayMs(): number {
  return GOLDEN_EVENT_INTERVAL_MS
}
