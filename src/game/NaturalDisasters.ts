import type { CityId } from './ExpansionMap'

export type DisasterId = 'earthquake' | 'flood' | 'storm'

export interface DisasterDef {
  id: DisasterId
  title: string
  emoji: string
  affectedCities: CityId[]
  baseDamage: number
}

export const DISASTERS: DisasterDef[] = [
  { id: 'earthquake', title: 'Deprem', emoji: '⚡', affectedCities: ['izmir', 'istanbul'], baseDamage: 180_000 },
  { id: 'flood', title: 'Sel', emoji: '🌊', affectedCities: ['ankara', 'izmir'], baseDamage: 120_000 },
  { id: 'storm', title: 'Fırtına', emoji: '🌪️', affectedCities: ['istanbul', 'london'], baseDamage: 95_000 },
]

export function pickDisaster(activeCity: CityId): DisasterDef | null {
  const candidates = DISASTERS.filter((d) => d.affectedCities.includes(activeCity))
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function disasterDamage(base: number, incomePerDay: number, insured: boolean): number {
  if (insured) return 0
  return Math.floor(Math.max(base * 0.5, Math.min(base * 2, incomePerDay * 3)))
}
