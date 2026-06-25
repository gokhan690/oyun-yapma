import { tRaw } from '../i18n'

export type DiseaseId = 'astim' | 'migren' | 'diyabet' | 'tansiyon' | 'kalp' | 'kanser'

export interface DiseaseDef {
  id: DiseaseId
  name: string
  emoji: string
  dailyHealthDamage: number
  treatCost: number
  minAge: number
  baseChance: number
}

export interface ActiveDisease {
  id: DiseaseId
  diagnosedDay: number
}

export const DISEASES: DiseaseDef[] = [
  { id: 'astim',    name: 'Astım',           emoji: '🫁', dailyHealthDamage: 0.3, treatCost: 50_000,    minAge: 0,  baseChance: 0.00030 },
  { id: 'migren',   name: 'Kronik Migren',   emoji: '🤕', dailyHealthDamage: 0.4, treatCost: 80_000,    minAge: 20, baseChance: 0.00040 },
  { id: 'diyabet',  name: 'Diyabet',          emoji: '🩸', dailyHealthDamage: 0.6, treatCost: 150_000,   minAge: 30, baseChance: 0.00030 },
  { id: 'tansiyon', name: 'Hipertansiyon',    emoji: '🫀', dailyHealthDamage: 0.7, treatCost: 120_000,   minAge: 35, baseChance: 0.00040 },
  { id: 'kalp',     name: 'Kalp Hastalığı',  emoji: '💔', dailyHealthDamage: 1.2, treatCost: 500_000,   minAge: 45, baseChance: 0.00020 },
  { id: 'kanser',   name: 'Kanser',           emoji: '🎗️', dailyHealthDamage: 2.0, treatCost: 1_500_000, minAge: 40, baseChance: 0.00010 },
]

export function diseaseDef(id: DiseaseId): DiseaseDef {
  return DISEASES.find((d) => d.id === id) ?? DISEASES[0]!
}

export function diseasesDailyDamage(active: ActiveDisease[]): number {
  return active.reduce((sum, d) => sum + diseaseDef(d.id).dailyHealthDamage, 0)
}

export function eligibleDiseases(age: number, active: ActiveDisease[]): DiseaseDef[] {
  const activeIds = new Set(active.map((d) => d.id))
  return DISEASES.filter((d) => d.minAge <= age && !activeIds.has(d.id))
}

export function dailyDiagnosisChance(age: number, health: number): number {
  const ageFactor = age < 30 ? 0.5 : age < 50 ? 1.0 : age < 65 ? 2.0 : 3.5
  const healthFactor = health < 30 ? 3.0 : health < 50 ? 1.5 : 1.0
  return ageFactor * healthFactor
}

export function pickRandomDisease(eligible: DiseaseDef[]): DiseaseDef | null {
  if (eligible.length === 0) return null
  const totalWeight = eligible.reduce((s, d) => s + d.baseChance, 0)
  let r = Math.random() * totalWeight
  for (const d of eligible) {
    r -= d.baseChance
    if (r <= 0) return d
  }
  return eligible[eligible.length - 1]!
}

export function diseaseName(d: DiseaseDef): string {
  return tRaw(`disease_${d.id}_name`) ?? d.name
}
