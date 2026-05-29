/** Eğitim geçmişi — oyun başında seçim */

export type EducationId = 'highschool' | 'university' | 'mba'

export interface EducationDef {
  id: EducationId
  name: string
  emoji: string
  description: string
  /** Başlangıç parası çarpanı */
  startingMoneyMult: number
  /** Araştırma hızı bonusu (0.0 = yok) */
  researchBonus: number
  /** Gelir bonusu (global) */
  incomeBonus: number
  /** Başlangıç prestij puanı */
  startPrestige: number
}

export const EDUCATIONS: EducationDef[] = [
  {
    id: 'highschool',
    name: 'Lise',
    emoji: '🏫',
    description: 'Erken başla, düşük maliyetli — hız avantajı',
    startingMoneyMult: 1.5,
    researchBonus: 0,
    incomeBonus: 0,
    startPrestige: 0,
  },
  {
    id: 'university',
    name: 'Üniversite',
    emoji: '🎓',
    description: 'Orta başlangıç, araştırma hızı +%15',
    startingMoneyMult: 1.0,
    researchBonus: 0.15,
    incomeBonus: 0,
    startPrestige: 5,
  },
  {
    id: 'mba',
    name: 'MBA',
    emoji: '📊',
    description: 'Geç başla ama küresel gelir +%25',
    startingMoneyMult: 0.7,
    researchBonus: 0,
    incomeBonus: 0.25,
    startPrestige: 15,
  },
]

export function educationDef(id: EducationId | null): EducationDef | null {
  if (!id) return null
  return EDUCATIONS.find((e) => e.id === id) ?? null
}

export function educationIncomeMult(id: EducationId | null): number {
  const def = educationDef(id)
  if (!def) return 1
  return 1 + def.incomeBonus
}

export function educationResearchBonus(id: EducationId | null): number {
  const def = educationDef(id)
  return def?.researchBonus ?? 0
}
