export type DiseaseId = 'astim' | 'migren' | 'diyabet' | 'tansiyon' | 'kalp' | 'kanser'

export interface DiseaseDef {
  id: DiseaseId
  name: string
  emoji: string
  /** Minimum player age for this disease to be diagnosed */
  minAge: number
  /** Daily health damage while active */
  dailyDamage: number
  /** Treatment cost (₺) */
  treatCost: number
  /** Probability of cure per treatment (0–1) */
  cureChance: number
  /** Requires surgery (higher cost, single attempt) */
  surgery: boolean
}

export interface ActiveDisease {
  id: DiseaseId
  diagnosedDay: number
}

export const DISEASES: DiseaseDef[] = [
  { id: 'astim',    name: 'Astım',               emoji: '💨', minAge: 20, dailyDamage: 0.06, treatCost: 15_000,  cureChance: 0.7,  surgery: false },
  { id: 'migren',   name: 'Migren',               emoji: '🤯', minAge: 22, dailyDamage: 0.04, treatCost: 10_000,  cureChance: 0.75, surgery: false },
  { id: 'diyabet',  name: 'Diyabet',              emoji: '🩸', minAge: 30, dailyDamage: 0.08, treatCost: 30_000,  cureChance: 0.6,  surgery: false },
  { id: 'tansiyon', name: 'Yüksek Tansiyon',      emoji: '❤️', minAge: 40, dailyDamage: 0.08, treatCost: 25_000,  cureChance: 0.65, surgery: false },
  { id: 'kalp',     name: 'Kalp Hastalığı',       emoji: '💔', minAge: 45, dailyDamage: 0.16, treatCost: 400_000, cureChance: 0.55, surgery: true  },
  { id: 'kanser',   name: 'Kanser',               emoji: '☢️', minAge: 35, dailyDamage: 0.24, treatCost: 600_000, cureChance: 0.45, surgery: true  },
]

export function diseaseDef(id: DiseaseId): DiseaseDef {
  return DISEASES.find((d) => d.id === id)!
}

/** Total daily health damage from all active diseases */
export function diseasesDailyDamage(active: ActiveDisease[]): number {
  return active.reduce((sum, a) => sum + diseaseDef(a.id).dailyDamage, 0)
}

/** Daily chance that a new disease is diagnosed (per disease) */
export function dailyDiagnosisChance(playerAge: number): number {
  if (playerAge >= 70) return 0.0025
  if (playerAge >= 60) return 0.0018
  if (playerAge >= 50) return 0.0012
  if (playerAge >= 40) return 0.0007
  if (playerAge >= 30) return 0.0004
  return 0.0002
}

/** Diseases eligible to be diagnosed for this player (age gate, not already active) */
export function eligibleDiseases(active: ActiveDisease[], playerAge: number): DiseaseId[] {
  const activeIds = new Set(active.map((a) => a.id))
  return DISEASES
    .filter((d) => d.minAge <= playerAge && !activeIds.has(d.id))
    .map((d) => d.id)
}

/** Pick a random disease weighted by type (non-surgery 3× more likely) */
export function pickRandomDisease(candidates: DiseaseId[]): DiseaseId | null {
  if (!candidates.length) return null
  const weighted = candidates.flatMap((id) => {
    const d = diseaseDef(id)
    return d.surgery ? [id] : [id, id, id]
  })
  return weighted[Math.floor(Math.random() * weighted.length)] ?? null
}
