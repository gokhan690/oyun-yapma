import type { PoliticsLevel } from './Empire'

export type VictoryId = 'economic' | 'political' | 'dynasty' | 'shadow'

export interface VictoryDef {
  id: VictoryId
  name: string
  emoji: string
  description: string
}

export const VICTORY_DEFS: VictoryDef[] = [
  {
    id: 'economic',
    name: 'Ekonomik Zafer',
    emoji: '💰',
    description: '1 trilyon₺ net değere ulaş',
  },
  {
    id: 'political',
    name: 'Siyasi Zafer',
    emoji: '🎖️',
    description: 'Cumhurbaşkanı ol ve 2 sezon görevde kal',
  },
  {
    id: 'dynasty',
    name: 'Hanedan Zaferi',
    emoji: '👑',
    description: '7 nesil boyunca imparatorluğu ayakta tut',
  },
  {
    id: 'shadow',
    name: 'Gölge Zafer',
    emoji: '🕶️',
    description: "3'ten az baskın yiyerek 5+ illegal işletme kur",
  },
]

export const ECONOMIC_VICTORY_NET_WORTH = 1_000_000_000_000
export const DYNASTY_VICTORY_GENERATIONS = 7
export const SHADOW_MIN_ILLEGAL_TYPES = 5
export const SHADOW_MAX_RAIDS = 3
export const POLITICAL_VICTORY_SEASONS = 2

export interface VictoryContext {
  netWorth: number
  politicsLevel: PoliticsLevel
  presidentSeasons: number
  dynastyGeneration: number
  illegalTypesOwned: number
  totalRaidsCaught: number
  alreadyUnlocked: VictoryId[]
}

export function checkNewVictories(ctx: VictoryContext): VictoryId[] {
  const found: VictoryId[] = []
  const has = (id: VictoryId) => ctx.alreadyUnlocked.includes(id)

  if (!has('economic') && ctx.netWorth >= ECONOMIC_VICTORY_NET_WORTH) {
    found.push('economic')
  }
  if (!has('political') && ctx.politicsLevel === 'cumhurbaskan' && ctx.presidentSeasons >= POLITICAL_VICTORY_SEASONS) {
    found.push('political')
  }
  if (!has('dynasty') && ctx.dynastyGeneration >= DYNASTY_VICTORY_GENERATIONS) {
    found.push('dynasty')
  }
  if (
    !has('shadow')
    && ctx.illegalTypesOwned >= SHADOW_MIN_ILLEGAL_TYPES
    && ctx.totalRaidsCaught < SHADOW_MAX_RAIDS
  ) {
    found.push('shadow')
  }
  return found
}

export function victoryDef(id: VictoryId): VictoryDef {
  return VICTORY_DEFS.find((v) => v.id === id) ?? VICTORY_DEFS[0]!
}

export function victoryProgress(ctx: VictoryContext, id: VictoryId): number {
  switch (id) {
    case 'economic':
      return Math.min(100, (ctx.netWorth / ECONOMIC_VICTORY_NET_WORTH) * 100)
    case 'political':
      if (ctx.politicsLevel !== 'cumhurbaskan') return ctx.politicsLevel === 'none' ? 0 : 40
      return Math.min(100, (ctx.presidentSeasons / POLITICAL_VICTORY_SEASONS) * 100)
    case 'dynasty':
      return Math.min(100, (ctx.dynastyGeneration / DYNASTY_VICTORY_GENERATIONS) * 100)
    case 'shadow':
      return Math.min(100, Math.min(
        (ctx.illegalTypesOwned / SHADOW_MIN_ILLEGAL_TYPES) * 50,
        ctx.totalRaidsCaught >= SHADOW_MAX_RAIDS ? 0 : 50 + (1 - ctx.totalRaidsCaught / SHADOW_MAX_RAIDS) * 50,
      ))
    default:
      return 0
  }
}
