import { EXPANSION_CITIES } from './ExpansionMap'
import { FRANCHISE_CITIES } from './Franchise'

export type CountryId = 'tr' | 'us' | 'gb' | 'de' | 'fr' | 'es' | 'jp' | 'br'

interface CountryCitySlot {
  label: string
  emoji: string
}

export interface CountryDef {
  id: CountryId
  name: string
  flag: string
  /** [capital, 2nd city, 3rd city] — domestic cities for the start + franchise. */
  cities: [CountryCitySlot, CountryCitySlot, CountryCitySlot]
}

export const COUNTRIES: CountryDef[] = [
  {
    id: 'tr',
    name: 'Türkiye',
    flag: '🇹🇷',
    cities: [
      { label: 'İstanbul', emoji: '🌉' },
      { label: 'Ankara', emoji: '🏛️' },
      { label: 'İzmir', emoji: '🌊' },
    ],
  },
  {
    id: 'us',
    name: 'USA',
    flag: '🇺🇸',
    cities: [
      { label: 'New York', emoji: '🗽' },
      { label: 'Los Angeles', emoji: '🌴' },
      { label: 'Chicago', emoji: '🌆' },
    ],
  },
  {
    id: 'gb',
    name: 'United Kingdom',
    flag: '🇬🇧',
    cities: [
      { label: 'London', emoji: '🎡' },
      { label: 'Manchester', emoji: '⚽' },
      { label: 'Birmingham', emoji: '🏭' },
    ],
  },
  {
    id: 'de',
    name: 'Deutschland',
    flag: '🇩🇪',
    cities: [
      { label: 'Berlin', emoji: '🐻' },
      { label: 'München', emoji: '🍺' },
      { label: 'Hamburg', emoji: '⚓' },
    ],
  },
  {
    id: 'fr',
    name: 'France',
    flag: '🇫🇷',
    cities: [
      { label: 'Paris', emoji: '🗼' },
      { label: 'Marseille', emoji: '⛵' },
      { label: 'Lyon', emoji: '🦁' },
    ],
  },
  {
    id: 'es',
    name: 'España',
    flag: '🇪🇸',
    cities: [
      { label: 'Madrid', emoji: '🐂' },
      { label: 'Barcelona', emoji: '🏖️' },
      { label: 'Valencia', emoji: '🍊' },
    ],
  },
  {
    id: 'jp',
    name: '日本',
    flag: '🇯🇵',
    cities: [
      { label: 'Tokyo', emoji: '🗼' },
      { label: 'Osaka', emoji: '🏯' },
      { label: 'Yokohama', emoji: '🌃' },
    ],
  },
  {
    id: 'br',
    name: 'Brasil',
    flag: '🇧🇷',
    cities: [
      { label: 'Brasília', emoji: '🏛️' },
      { label: 'São Paulo', emoji: '🌆' },
      { label: 'Rio de Janeiro', emoji: '🏖️' },
    ],
  },
]

export function countryDef(id: CountryId): CountryDef {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0]!
}

/**
 * Rewrites the labels/emoji of the 3 domestic city slots (istanbul/ankara/izmir
 * internally) to the chosen country's cities. Internal CityIds and skyline
 * visuals stay the same; only the displayed names change. World capitals
 * (Dubai/London) are untouched. Runs once at boot and on country change.
 */
export function applyCountry(id: CountryId): void {
  const def = countryDef(id)
  const slotOrder = ['istanbul', 'ankara', 'izmir'] as const
  slotOrder.forEach((cityId, i) => {
    const slot = def.cities[i]
    if (!slot) return
    const exp = EXPANSION_CITIES.find((c) => c.id === cityId)
    if (exp) {
      exp.label = slot.label
      exp.emoji = slot.emoji
    }
    const fr = FRANCHISE_CITIES.find((c) => c.id === cityId)
    if (fr) {
      fr.label = slot.label
    }
  })
}
