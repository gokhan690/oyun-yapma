export type CityId = 'istanbul' | 'ankara' | 'izmir' | 'dubai' | 'london'

export interface CityDef {
  id: CityId
  label: string
  emoji: string
  unlockCost: number
  repReq: number
  ipoReq: number
  skylineClass: string
  rivalFamily?: string
  categoryBonuses?: Record<string, number>  // category -> income multiplier bonus (additive, e.g. 0.2 = +20%)
}

export const EXPANSION_CITIES: CityDef[] = [
  { id: 'istanbul', label: 'İstanbul', emoji: '🌉', unlockCost: 0, repReq: 0, ipoReq: 0, skylineClass: 'city-istanbul' },
  { id: 'ankara', label: 'Ankara', emoji: '🏛️', unlockCost: 80_000, repReq: 25, ipoReq: 0, skylineClass: 'city-ankara', rivalFamily: 'Sabanoğlu', categoryBonuses: { politics: 0.20 } },
  { id: 'izmir', label: 'İzmir', emoji: '🌊', unlockCost: 300_000, repReq: 35, ipoReq: 0, skylineClass: 'city-izmir', rivalFamily: 'Koçak', categoryBonuses: { hospitality: 0.20, luxury: 0.10 } },
  { id: 'dubai', label: 'Dubai', emoji: '🏜️', unlockCost: 25_000_000, repReq: 60, ipoReq: 1, skylineClass: 'city-dubai', categoryBonuses: { luxury: 0.25, finance: 0.15 } },
  { id: 'london', label: 'Londra', emoji: '🇬🇧', unlockCost: 100_000_000, repReq: 70, ipoReq: 3, skylineClass: 'city-london', categoryBonuses: { finance: 0.25, science: 0.15 } },
]

export interface CityState {
  unlocked: CityId[]
  activeCity: CityId
  cityReputation: Record<CityId, number>
}

export function createCityState(): CityState {
  const rep = {} as Record<CityId, number>
  for (const c of EXPANSION_CITIES) rep[c.id] = c.id === 'istanbul' ? 50 : 0
  return { unlocked: ['istanbul'], activeCity: 'istanbul', cityReputation: rep }
}

export function cityDef(id: CityId): CityDef {
  return EXPANSION_CITIES.find((c) => c.id === id) ?? EXPANSION_CITIES[0]!
}

export function canUnlockCity(
  id: CityId,
  state: CityState,
  money: number,
  reputation: number,
  ipoCount: number,
): { ok: boolean; reason?: string } {
  if (state.unlocked.includes(id)) return { ok: false, reason: 'Zaten açık' }
  const def = cityDef(id)
  if (ipoCount < def.ipoReq) return { ok: false, reason: `IPO #${def.ipoReq} gerekli` }
  if (reputation < def.repReq) return { ok: false, reason: `İtibar min ${def.repReq}` }
  if (money < def.unlockCost) return { ok: false, reason: 'Yetersiz para' }
  return { ok: true }
}

export function cityProducerBonus(cities: CityState, producerCategory: string | undefined): number {
  if (!producerCategory) return 0
  let bonus = 0
  for (const cityId of (cities.unlocked ?? [])) {
    const def = EXPANSION_CITIES.find(c => c.id === cityId)
    bonus += def?.categoryBonuses?.[producerCategory] ?? 0
  }
  return bonus
}
