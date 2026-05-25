import { formatMoney } from './Economy'
import { PRESTIGE_THRESHOLD } from './Prestige'
import type { DeathCauseId } from './Mortality'
import type { PoliticsLevel } from './Empire'

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
    achievements.push(`İlk Süper Lig kulübü kuruldu${s.footballLeague ? ` (${s.footballLeague})` : ''}`)
  }
  if (s.nearPresidency) {
    achievements.push('Cumhurbaşkanlığına 1 oy fark kaldı')
  } else if (s.politicsLevel === 'cumhurbaskan') {
    achievements.push('Cumhurbaşkanı oldun')
  } else if (s.politicsLevel === 'bakan') {
    achievements.push('Bakanlık seviyesine ulaşıldı')
  }
  if (s.peakNetWorth >= 1_000_000) {
    achievements.push(`${formatMoney(s.peakNetWorth)} peak servet`)
  }
  if (s.reachedForbes) achievements.push('Forbes listesine girdi')
  if (s.victoriesCount > 0) achievements.push(`${s.victoriesCount} zafer yolu tamamlandı`)
  if (s.totalEarnedLife >= PRESTIGE_THRESHOLD) achievements.push('IPO eşiğine ulaşıldı')

  if (s.childCrisisCount > 0) {
    weaknesses.push(`Varis ${s.childCrisisCount} kez krize girdi, itibar zedelendi`)
  }
  if (s.raidsWithoutInsurance > 0 && !s.hadInsurance) {
    weaknesses.push(`Sigorta yoktu — ${s.raidsWithoutInsurance} baskın ciddi hasar verdi`)
  }
  if (s.factoriesLostToRaid > 0) {
    weaknesses.push(`Baskında ${s.factoriesLostToRaid} işletme ağır zarar gördü`)
  }
  if (achievements.length === 0) achievements.push('İmparatorluğun temellerini attı')

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
  if (nearPres) return 'Neredeyse zirveye ulaştı.'
  if (victories >= 2) return 'Tarihe geçen bir baron.'
  if (peak >= 100_000_000) return 'Forbes\'u titreten bir hayat.'
  if (peak >= 10_000_000) return 'Zirveye yaklaştı, durmadı.'
  if (weakCount >= 2) return 'Gölgesi servetinden uzun sürdü.'
  if (peak >= 1_000_000) return 'Milyoner hayalleri gerçek oldu.'
  return 'Her imparatorluk bir tezgahla başlar.'
}

export function dynastyHistorySummary(records: BaronRecord[]): { generations: number; totalEarned: number; baronCount: number } {
  const baronCount = records.length
  const generations = records.length > 0 ? Math.max(...records.map((r) => r.generation)) : 1
  const totalEarned = records.reduce((s, r) => s + r.totalEarnedLife, 0)
  return { generations, totalEarned, baronCount }
}
