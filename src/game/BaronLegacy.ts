import { formatMoney } from './Economy'
import { PRESTIGE_THRESHOLD } from './Prestige'
import type { DeathCauseId } from './Mortality'
import type { PoliticsLevel } from './Empire'
import { requiredDomainText, fmt } from '../i18n'

export interface BaronRecord {
  baronNumber: number
  name: string
  birthYear: number
  deathYear: number
  ageAtDeath: number
  yearsRuled: number
  causeId: DeathCauseId
  causeLabel: string
  causeEmoji: string
  achievements: string[]
  weaknesses: string[]
  epitaph: string
  peakNetWorth: number
  totalEarnedLife: number
  generation: number
}

export interface BaronLifeSnapshot {
  playerName: string
  birthYear: number
  deathYear: number
  age: number
  startedGameDay: number
  deathGameDay: number
  causeId: DeathCauseId
  causeLabel: string
  causeEmoji: string
  peakNetWorth: number
  totalEarnedLife: number
  generation: number
  politicsLevel: PoliticsLevel
  hasFootballClub: boolean
  footballLeague: string
  childCrisisCount: number
  raidsWithoutInsurance: number
  hadInsurance: boolean
  factoriesLostToRaid: number
  nearPresidency: boolean
  victoriesCount: number
  reachedForbes: boolean
  baronNumber: number
}

export function buildBaronRecord(s: BaronLifeSnapshot): BaronRecord {
  const achievements: string[] = []
  const weaknesses: string[] = []

  if (s.hasFootballClub) {
    const base = requiredDomainText('legacy_ach_football_club')
    achievements.push(s.footballLeague ? `${base} (${s.footballLeague})` : base)
  }
  if (s.nearPresidency) {
    achievements.push(requiredDomainText('legacy_ach_near_president'))
  } else if (s.politicsLevel === 'cumhurbaskan') {
    achievements.push(requiredDomainText('legacy_ach_president'))
  } else if (s.politicsLevel === 'bakan') {
    achievements.push(requiredDomainText('legacy_ach_minister'))
  }
  if (s.peakNetWorth >= 1_000_000) {
    achievements.push(fmt('legacy_ach_peak_wealth', { amount: formatMoney(s.peakNetWorth) }))
  }
  if (s.reachedForbes) achievements.push(requiredDomainText('legacy_ach_forbes'))
  if (s.victoriesCount > 0) achievements.push(fmt('legacy_ach_victories', { count: s.victoriesCount }))
  if (s.totalEarnedLife >= PRESTIGE_THRESHOLD) achievements.push(requiredDomainText('legacy_ach_ipo'))

  if (s.childCrisisCount > 0) {
    weaknesses.push(fmt('legacy_weak_child_crisis', { count: s.childCrisisCount }))
  }
  if (s.raidsWithoutInsurance > 0 && !s.hadInsurance) {
    weaknesses.push(fmt('legacy_weak_raid_no_insurance', { count: s.raidsWithoutInsurance }))
  }
  if (s.factoriesLostToRaid > 0) {
    weaknesses.push(fmt('legacy_weak_factories_lost', { count: s.factoriesLostToRaid }))
  }
  if (achievements.length === 0) achievements.push(requiredDomainText('legacy_ach_foundation'))

  const epitaph = pickEpitaph(s.peakNetWorth, s.victoriesCount, weaknesses.length, s.nearPresidency)
  const yearsRuled = Math.max(1, Math.floor((s.deathGameDay - s.startedGameDay) / 365.25))

  return {
    baronNumber: s.baronNumber,
    name: s.playerName,
    birthYear: s.birthYear,
    deathYear: s.deathYear,
    ageAtDeath: s.age,
    yearsRuled,
    causeId: s.causeId,
    causeLabel: s.causeLabel,
    causeEmoji: s.causeEmoji,
    achievements,
    weaknesses,
    epitaph,
    peakNetWorth: s.peakNetWorth,
    totalEarnedLife: s.totalEarnedLife,
    generation: s.generation,
  }
}

function pickEpitaph(peak: number, victories: number, weakCount: number, nearPres: boolean): string {
  if (nearPres) return requiredDomainText('legacy_epitaph_near_pres')
  if (victories >= 2) return requiredDomainText('legacy_epitaph_victories')
  if (peak >= 100_000_000) return requiredDomainText('legacy_epitaph_forbes')
  if (peak >= 10_000_000) return requiredDomainText('legacy_epitaph_near_top')
  if (weakCount >= 2) return requiredDomainText('legacy_epitaph_shadow')
  if (peak >= 1_000_000) return requiredDomainText('legacy_epitaph_millionaire')
  return requiredDomainText('legacy_epitaph_default')
}

export function dynastyHistorySummary(records: BaronRecord[]): { generations: number; totalEarned: number; baronCount: number } {
  const baronCount = records.length
  const generations = records.length > 0 ? Math.max(...records.map((r) => r.generation)) : 1
  const totalEarned = records.reduce((s, r) => s + r.totalEarnedLife, 0)
  return { generations, totalEarned, baronCount }
}
