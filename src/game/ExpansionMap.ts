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
}

export const EXPANSION_CITIES: CityDef[] = [
  { id: 'istanbul', label: 'İstanbul', emoji: '🌉', unlockCost: 0, repReq: 0, ipoReq: 0, skylineClass: 'city-istanbul' },
  { id: 'ankara', label: 'Ankara', emoji: '🏛️', unlockCost: 80_000, repReq: 25, ipoReq: 0, skylineClass: 'city-ankara', rivalFamily: 'Sabanoğlu' },
  { id: 'izmir', label: 'İzmir', emoji: '🌊', unlockCost: 300_000, repReq: 35, ipoReq: 0, skylineClass: 'city-izmir', rivalFamily: 'Koçak' },
  { id: 'dubai', label: 'Dubai', emoji: '🏜️', unlockCost: 25_000_000, repReq: 60, ipoReq: 1, skylineClass: 'city-dubai' },
  { id: 'london', label: 'Londra', emoji: '🇬🇧', unlockCost: 100_000_000, repReq: 70, ipoReq: 3, skylineClass: 'city-london' },
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
