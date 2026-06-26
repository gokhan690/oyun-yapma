import type { PoliticsLevel } from './Empire'
import type { ChildTrait, SpouseTrait } from './Dynasty'
import { requiredDomainText } from '../i18n'

export function deathLabel(id: DeathCauseId): string {
  return requiredDomainText(`death_${id}_label`)
}

export function deathMessage(id: DeathCauseId, age: number, name: string): string {
  let key = `death_${id}_msg`
  if (id === 'traffic_accident') key = age < 30 ? 'death_traffic_accident_msg_young' : 'death_traffic_accident_msg_old'
  return requiredDomainText(key)
    .replace('{name}', name)
    .replace('{age}', String(age))
}

export type DeathCauseId =
  | 'traffic_accident'
  | 'sudden_illness'
  | 'heart_attack'
  | 'stroke'
  | 'natural_causes'
  | 'fatal_raid'
  | 'assassination'
  | 'organized_crime'
  | 'plane_crash'
  | 'burnout'
  | 'stadium_disaster'
  | 'coup'
  | 'lab_accident'
  | 'yacht_accident'

export interface PendingDeath {
  causeId: DeathCauseId
  age: number
  message: string
}

export interface MortalityContext {
  age: number
  playerName: string
  illegalHeat: number
  politicsLevel: PoliticsLevel
  illegalIncomeShare: number
  ownedBusinessCount: number
  hasFootballClub: boolean
  hasLab: boolean
  hasLuxury: boolean
  trait: SpouseTrait | ChildTrait | null
  totalEarned: number
  difficulty?: 'easy' | 'normal' | 'hard'
}

export interface DeathOutcome {
  causeId: DeathCauseId
  emoji: string
  label: string
  age: number
  message: string
}

export interface MortalityRiskDisplay {
  id: DeathCauseId
  emoji: string
  label: string
  level: 'low' | 'medium' | 'high'
  dailyPct: number
}

interface DeathCauseDef {
  id: DeathCauseId
  emoji: string
  label: string
  minAge?: number
  risk(ctx: MortalityContext): number
}

function traitMult(ctx: MortalityContext): number {
  if (ctx.trait === 'risk_taker') return 1.28
  if (ctx.trait === 'diplomat') return 0.88
  return 1
}

const PLAYER_LIFESPAN = 100

export function playerLifespan(): number { return PLAYER_LIFESPAN }

function ageBaseRisk(age: number): number {
  // 0.35x multiplier — BitLife gibi uzun yaşam
  if (age < 22) return 0.0000048 * 0.35
  if (age < 30) return 0.0000072 * 0.35
  if (age < 40) return 0.0000112 * 0.35
  if (age < 50) return 0.000018 * 0.35
  if (age < 60) return 0.00003 * 0.35
  if (age < 70) return 0.000048 * 0.35
  if (age < 80) return 0.000088 * 0.35
  if (age < 90) return 0.000168 * 0.35
  return 0.0003 * 0.35
}

const DEATH_CAUSES: DeathCauseDef[] = [
  {
    id: 'traffic_accident',
    emoji: '🚗',
    label: 'Trafik Kazası',
    minAge: 18,
    risk: (ctx) => ageBaseRisk(ctx.age) * 0.35 * traitMult(ctx),
  },
  {
    id: 'sudden_illness',
    emoji: '🤒',
    label: 'Ani Hastalık',
    risk: (ctx) => ageBaseRisk(ctx.age) * 0.5 * traitMult(ctx),
  },
  {
    id: 'heart_attack',
    emoji: '💔',
    label: 'Kalp Krizi',
    minAge: 32,
    risk: (ctx) => {
      let r = ageBaseRisk(ctx.age) * (ctx.age >= 50 ? 1.4 : 0.6)
      if (ctx.illegalIncomeShare > 0.25) r *= 1.35
      if (ctx.ownedBusinessCount >= 6) r *= 1.2
      return r * traitMult(ctx)
    },
  },
  {
    id: 'stroke',
    emoji: '🧠',
    label: 'Felç',
    minAge: 48,
    risk: (ctx) => ageBaseRisk(ctx.age) * (ctx.age >= 60 ? 1.5 : 0.4) * traitMult(ctx),
  },
  {
    id: 'natural_causes',
    emoji: '🕊️',
    label: 'Doğal Nedenler',
    minAge: 68,
    risk: (ctx) => {
      if (ctx.age < 68) return 0
      const extra = (ctx.age - 68) * 0.00004
      return (ageBaseRisk(ctx.age) * 1.2 + extra) * traitMult(ctx)
    },
  },
  {
    id: 'fatal_raid',
    emoji: '🚨',
    label: 'Ölümcül Baskın',
    risk: (ctx) => {
      if (ctx.illegalHeat < 55) return 0
      if (ctx.illegalHeat >= 85) return 0.0018 * traitMult(ctx)
      if (ctx.illegalHeat >= 70) return 0.00055 * traitMult(ctx)
      return 0.00012 * traitMult(ctx)
    },
  },
  {
    id: 'assassination',
    emoji: '🎯',
    label: 'Suikast',
    minAge: 25,
    risk: (ctx) => {
      const mult = ctx.trait === 'diplomat' ? 0.7 : 1
      switch (ctx.politicsLevel) {
        case 'cumhurbaskan': return 0.00055 * mult
        case 'bakan': return 0.00028 * mult
        case 'milletvekili': return 0.0001 * mult
        case 'belediye': return 0.000035 * mult
        default: return ctx.totalEarned > 50_000_000 ? 0.00004 * mult : 0
      }
    },
  },
  {
    id: 'organized_crime',
    emoji: '🔫',
    label: 'Organize Suç',
    minAge: 20,
    risk: (ctx) => {
      if (ctx.illegalIncomeShare < 0.15) return 0
      let r = 0.00006 * ctx.illegalIncomeShare * 4
      if (ctx.illegalHeat >= 45) r *= 1.6
      return r * traitMult(ctx)
    },
  },
  {
    id: 'plane_crash',
    emoji: '✈️',
    label: 'Uçak Kazası',
    minAge: 25,
    risk: (ctx) => (ctx.totalEarned > 500_000_000 ? 0.00008 : ctx.totalEarned > 50_000_000 ? 0.000035 : 0) * traitMult(ctx),
  },
  {
    id: 'burnout',
    emoji: '😵',
    label: 'Tükenmişlik',
    minAge: 28,
    risk: (ctx) => (ctx.ownedBusinessCount >= 10 ? 0.00014 : ctx.ownedBusinessCount >= 7 ? 0.00006 : 0) * traitMult(ctx),
  },
  {
    id: 'stadium_disaster',
    emoji: '⚽',
    label: 'Stadyum Kazası',
    minAge: 22,
    risk: (ctx) => (ctx.hasFootballClub ? 0.000045 : 0) * traitMult(ctx),
  },
  {
    id: 'coup',
    emoji: '⚔️',
    label: 'Darbe Girişimi',
    minAge: 35,
    risk: (ctx) => (ctx.politicsLevel === 'cumhurbaskan' ? 0.00022 : 0) * (ctx.trait === 'diplomat' ? 0.75 : 1),
  },
  {
    id: 'lab_accident',
    emoji: '🧪',
    label: 'Laboratuvar Kazası',
    minAge: 24,
    risk: (ctx) => (ctx.hasLab ? 0.000038 : 0) * traitMult(ctx),
  },
  {
    id: 'yacht_accident',
    emoji: '🛥️',
    label: 'Deniz Kazası',
    minAge: 26,
    risk: (ctx) => (ctx.hasLuxury ? 0.000032 : 0) * traitMult(ctx),
  },
]

function activeCauses(ctx: MortalityContext): { def: DeathCauseDef; risk: number }[] {
  return DEATH_CAUSES
    .filter((d) => ctx.age >= (d.minAge ?? 0))
    .map((d) => ({ def: d, risk: d.risk(ctx) }))
    .filter((e) => e.risk > 0)
}

/** Günlük toplam vefat olasılığı (0–1) */
export function totalDailyMortalityRisk(ctx: MortalityContext): number {
  const entries = activeCauses(ctx)
  if (entries.length === 0) return 0
  let combined = 0
  for (const { risk } of entries) {
    combined = combined + risk - combined * risk
  }
  const cap = ctx.difficulty === 'easy' ? 0.005 : ctx.difficulty === 'hard' ? 0.015 : 0.008
  return Math.min(cap, combined)
}

export function estimatedYearsRemaining(ctx: MortalityContext): number {
  const daily = totalDailyMortalityRisk(ctx)
  if (daily <= 0.000001) return 99
  const days = 1 / daily
  return Math.min(99, Math.max(1, Math.floor(days / 365.25)))
}

export function mortalityRiskDisplay(ctx: MortalityContext): MortalityRiskDisplay[] {
  const total = totalDailyMortalityRisk(ctx)
  if (total <= 0) return []

  return activeCauses(ctx)
    .map(({ def, risk }) => {
      const share = risk / total
      const dailyPct = risk * 100
      let level: MortalityRiskDisplay['level'] = 'low'
      if (dailyPct >= 0.08 || share >= 0.45) level = 'high'
      else if (dailyPct >= 0.025 || share >= 0.25) level = 'medium'
      return {
        id: def.id,
        emoji: def.emoji,
        label: deathLabel(def.id),
        level,
        dailyPct,
      }
    })
    .filter((r) => r.dailyPct >= 0.001)
    .sort((a, b) => b.dailyPct - a.dailyPct)
    .slice(0, 5)
}

export function deathCauseLabel(id: DeathCauseId): { emoji: string; label: string } {
  const def = DEATH_CAUSES.find((d) => d.id === id)
  return def ? { emoji: def.emoji, label: deathLabel(def.id) } : { emoji: '💀', label: requiredDomainText('death_unknown_label') }
}

export function rollDailyMortality(ctx: MortalityContext): DeathOutcome | null {
  const entries = activeCauses(ctx)
  if (entries.length === 0) return null

  const total = totalDailyMortalityRisk(ctx)
  if (total <= 0 || Math.random() >= total) return null

  let roll = Math.random() * total
  for (const { def, risk } of entries) {
    roll -= risk
    if (roll <= 0) {
      const playerName = ctx.playerName.trim() || 'Baron'
      return {
        causeId: def.id,
        emoji: def.emoji,
        label: deathLabel(def.id),
        age: ctx.age,
        message: deathMessage(def.id, ctx.age, playerName),
      }
    }
  }

  const last = entries[entries.length - 1]!
  const def = last.def
  const playerName = ctx.playerName.trim() || 'Baron'
  return {
    causeId: def.id,
    emoji: def.emoji,
    label: deathLabel(def.id),
    age: ctx.age,
    message: deathMessage(def.id, ctx.age, playerName),
  }
}
