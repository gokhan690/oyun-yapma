import type { CareerJobId, CharacterBackgroundId } from './Career'

export interface CharacterCreationResult {
  name: string
  gender: 'male' | 'female'
  backgroundId: CharacterBackgroundId
  startingJobId: CareerJobId
  difficulty: 'easy' | 'normal' | 'hard'
}

export const DIFFICULTY_OPTIONS = [
  {
    id: 'easy' as const,
    name: 'Kolay',
    emoji: '😊',
    description: 'Para daha hızlı akar, riskler daha düşük.',
  },
  {
    id: 'normal' as const,
    name: 'Normal',
    emoji: '⚖️',
    description: 'Dengeli deneyim.',
  },
  {
    id: 'hard' as const,
    name: 'Zor',
    emoji: '💀',
    description: 'Düşük başlangıç parası, yüksek riskler.',
  },
]

export const DEFAULT_CHARACTER: CharacterCreationResult = {
  name: 'Baron',
  gender: 'male',
  backgroundId: 'sifirdan_gelen',
  startingJobId: 'satis_temsilcisi',
  difficulty: 'normal',
}

/** Geçmişe göre başlangıç parası */
export function startingMoneyForBackground(backgroundId: CharacterBackgroundId, difficulty: 'easy' | 'normal' | 'hard'): number {
  const base: Record<CharacterBackgroundId, number> = {
    sifirdan_gelen: 500,
    universiteli: 1000,
    satisci: 800,
    finansci: 1500,
    aile_sirketi: 2000,
    karanlik_cevre: 300,
  }
  const diffMult: Record<string, number> = { easy: 1.5, normal: 1.0, hard: 0.5 }
  return Math.floor((base[backgroundId] ?? 500) * diffMult[difficulty])
}
