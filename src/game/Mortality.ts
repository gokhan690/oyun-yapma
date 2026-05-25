import type { PoliticsLevel } from './Empire'
import type { ChildTrait, SpouseTrait } from './Dynasty'

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
  message(age: number, name: string): string
}

function traitMult(ctx: MortalityContext): number {
  if (ctx.trait === 'risk_taker') return 1.28
  if (ctx.trait === 'diplomat') return 0.88
  return 1
}

function ageBaseRisk(age: number): number {
  if (age < 22) return 0.000012
  if (age < 30) return 0.000018
  if (age < 40) return 0.000028
  if (age < 50) return 0.000045
  if (age < 60) return 0.000075
  if (age < 70) return 0.00012
  if (age < 80) return 0.00022
  if (age < 90) return 0.00042
  return 0.00075
}

const DEATH_CAUSES: DeathCauseDef[] = [
  {
    id: 'traffic_accident',
    emoji: '🚗',
    label: 'Trafik Kazası',
    minAge: 18,
    risk: (ctx) => ageBaseRisk(ctx.age) * 0.35 * traitMult(ctx),
    message: (age, name) =>
      age < 30
        ? `${name}, gece yarısı lüks aracıyla dönüşte kaza geçirdi. (${age} yaş)`
        : `${name}, şehirler arası yolda ani bir kaza sonucu hayatını kaybetti. (${age} yaş)`,
  },
  {
    id: 'sudden_illness',
    emoji: '🤒',
    label: 'Ani Hastalık',
    risk: (ctx) => ageBaseRisk(ctx.age) * 0.5 * traitMult(ctx),
    message: (age, name) =>
      `${name}, tedavi edilemeyen ani bir hastalık sonucu vefat etti. (${age} yaş)`,
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
    message: (age, name) =>
      `${name}, yoğun stres ve tempo sonucu kalp krizi geçirdi. (${age} yaş)`,
  },
  {
    id: 'stroke',
    emoji: '🧠',
    label: 'Felç',
    minAge: 48,
    risk: (ctx) => ageBaseRisk(ctx.age) * (ctx.age >= 60 ? 1.5 : 0.4) * traitMult(ctx),
    message: (age, name) =>
      `${name}, ani bir felç sonrası kaldırılamadı. (${age} yaş)`,
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
    message: (age, name) =>
      `${name}, uzun ve verimli bir yaşamın ardından huzur içinde vefat etti. (${age} yaş)`,
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
    message: (_age, name) =>
      `${name}, radar zirvedeyken düzenlenen baskında hayatını kaybetti. Illegal işler bedelini istedi.`,
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
    message: (age, name) =>
      `${name}, siyasi rakiplerinin düzenlediği suikast sonucu öldürüldü. (${age} yaş)`,
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
    message: (age, name) =>
      `${name}, yeraltı dünyasındaki hesaplaşmada hedef alındı. (${age} yaş)`,
  },
  {
    id: 'plane_crash',
    emoji: '✈️',
    label: 'Uçak Kazası',
    minAge: 25,
    risk: (ctx) => (ctx.totalEarned > 500_000_000 ? 0.00008 : ctx.totalEarned > 50_000_000 ? 0.000035 : 0) * traitMult(ctx),
    message: (age, name) =>
      `${name}, özel jetinde meydana gelen kaza sonucu vefat etti. (${age} yaş)`,
  },
  {
    id: 'burnout',
    emoji: '😵',
    label: 'Tükenmişlik',
    minAge: 28,
    risk: (ctx) => (ctx.ownedBusinessCount >= 10 ? 0.00014 : ctx.ownedBusinessCount >= 7 ? 0.00006 : 0) * traitMult(ctx),
    message: (age, name) =>
      `${name}, imparatorluğu tek başına taşıyamayıp aşırı yorgunluk sonucu yıkıldı. (${age} yaş)`,
  },
  {
    id: 'stadium_disaster',
    emoji: '⚽',
    label: 'Stadyum Kazası',
    minAge: 22,
    risk: (ctx) => (ctx.hasFootballClub ? 0.000045 : 0) * traitMult(ctx),
    message: (age, name) =>
      `${name}, kulüp etkinliğinde meydana gelen kaza sonucu hayatını kaybetti. (${age} yaş)`,
  },
  {
    id: 'coup',
    emoji: '⚔️',
    label: 'Darbe Girişimi',
    minAge: 35,
    risk: (ctx) => (ctx.politicsLevel === 'cumhurbaskan' ? 0.00022 : 0) * (ctx.trait === 'diplomat' ? 0.75 : 1),
    message: (age, name) =>
      `${name}, başarısız darbe girişiminde hedef alındı. (${age} yaş)`,
  },
  {
    id: 'lab_accident',
    emoji: '🧪',
    label: 'Laboratuvar Kazası',
    minAge: 24,
    risk: (ctx) => (ctx.hasLab ? 0.000038 : 0) * traitMult(ctx),
    message: (age, name) =>
      `${name}, Ar-Ge laboratuvarındaki patlamada hayatını kaybetti. (${age} yaş)`,
  },
  {
    id: 'yacht_accident',
    emoji: '🛥️',
    label: 'Deniz Kazası',
    minAge: 26,
    risk: (ctx) => (ctx.hasLuxury ? 0.000032 : 0) * traitMult(ctx),
    message: (age, name) =>
      `${name}, Akdeniz'deki yat gezisinde meydana gelen kaza sonucu vefat etti. (${age} yaş)`,
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
  return Math.min(0.06, combined)
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
        label: def.label,
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
  return def ? { emoji: def.emoji, label: def.label } : { emoji: '💀', label: 'Bilinmeyen' }
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
      return {
        causeId: def.id,
        emoji: def.emoji,
        label: def.label,
        age: ctx.age,
        message: def.message(ctx.age, ctx.playerName.trim() || 'Baron'),
      }
    }
  }

  const last = entries[entries.length - 1]!
  const def = last.def
  return {
    causeId: def.id,
    emoji: def.emoji,
    label: def.label,
    age: ctx.age,
    message: def.message(ctx.age, ctx.playerName.trim() || 'Baron'),
  }
}
