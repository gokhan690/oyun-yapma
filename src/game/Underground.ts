export type UndergroundActionId = 'lawyer' | 'bribe' | 'launder'

export interface UndergroundActionDef {
  id: UndergroundActionId
  name: string
  emoji: string
  description: string
  cooldownMs: number
}

export const UNDERGROUND_ACTIONS: UndergroundActionDef[] = [
  {
    id: 'lawyer',
    name: 'Avukat Tut',
    emoji: '⚖️',
    description: 'Heat −25, 30 dk koruma',
    cooldownMs: 10 * 60_000,
  },
  {
    id: 'bribe',
    name: 'Rüşvet Ver',
    emoji: '💸',
    description: 'Heat −40 (cüzdanın %5)',
    cooldownMs: 5 * 60_000,
  },
  {
    id: 'launder',
    name: 'Para Aklama',
    emoji: '🧼',
    description: '5 dk heat −15/gün (illegal gelirin %20)',
    cooldownMs: 15 * 60_000,
  },
]

export const HEAT_SHIELD_DURATION_MS = 15 * 60_000
export const LAWYER_PROTECTION_MS = 30 * 60_000
export const LAUNDER_DURATION_MS = 5 * 60_000

export function undergroundActionDef(id: UndergroundActionId): UndergroundActionDef | undefined {
  return UNDERGROUND_ACTIONS.find((a) => a.id === id)
}
