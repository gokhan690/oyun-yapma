export type EventKind = 'investor' | 'tax_refund' | 'viral_ad'

export interface GameEventDef {
  id: EventKind
  title: string
  description: string
  emoji: string
  durationMs: number
  rewardType: 'instant_cash' | 'income_boost'
  rewardValue: number
  boostDurationMs?: number
}

export const EVENT_DEFS: GameEventDef[] = [
  {
    id: 'investor',
    title: 'Yatırımcı Teklifi',
    description: 'Hızlıca kabul et — büyük yatırım!',
    emoji: '💼',
    durationMs: 10_000,
    rewardType: 'instant_cash',
    rewardValue: 3,
  },
  {
    id: 'tax_refund',
    title: 'Vergi İadesi',
    description: 'Devletten sürpriz iade geldi!',
    emoji: '🧾',
    durationMs: 10_000,
    rewardType: 'instant_cash',
    rewardValue: 2,
  },
  {
    id: 'viral_ad',
    title: 'Viral Reklam',
    description: 'Markan trend oldu — gelir patladı!',
    emoji: '📱',
    durationMs: 10_000,
    rewardType: 'income_boost',
    rewardValue: 3,
    boostDurationMs: 30_000,
  },
]

export function pickRandomEvent(): GameEventDef {
  const idx = Math.floor(Math.random() * EVENT_DEFS.length)
  return EVENT_DEFS[idx]!
}

export function nextEventDelayMs(): number {
  return 60_000 + Math.random() * 60_000
}
