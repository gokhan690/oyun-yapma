import { tRaw } from '../i18n'

/** Seyahat & Tatil — 5 destinasyon, farklı bonuslar */

export type TravelDestinationId = 'kapadokya' | 'maldivler' | 'japonya' | 'new_york' | 'mars'

export interface TravelDestination {
  id: TravelDestinationId
  name: string
  emoji: string
  description: string
  cost: number
  durationDays: number
  stressReduction: number
  incomePenaltyDays: number
  unlockAt: number
  /** Seyahat sonrası bonusun tipi */
  bonusType: 'research' | 'reputation' | 'risk_tolerance' | 'networking' | 'prestige'
  bonusLabel: string
  /** Bonus gün süresi */
  bonusDurationDays: number
  /** Bonus değeri (çarpan veya flat) */
  bonusValue: number
}

export const TRAVEL_DESTINATIONS: TravelDestination[] = [
  {
    id: 'kapadokya',
    name: 'Kapadokya',
    emoji: '🎈',
    description: 'Mistik vadiler, tarihi mağaralar. Kültürel deneyim ve sanatsal ilham.',
    cost: 30_000,
    durationDays: 3,
    stressReduction: 40,
    incomePenaltyDays: 3,
    unlockAt: 50_000,
    bonusType: 'research',
    bonusLabel: 'Araştırma hızı +%15 (7 gün)',
    bonusDurationDays: 7,
    bonusValue: 0.15,
  },
  {
    id: 'maldivler',
    name: 'Maldivler',
    emoji: '🏝️',
    description: 'Turkuaz deniz, lüks villa. Tam stres sıfırlama ve sağlık toparlanması.',
    cost: 150_000,
    durationDays: 7,
    stressReduction: 100,
    incomePenaltyDays: 7,
    unlockAt: 500_000,
    bonusType: 'reputation',
    bonusLabel: 'İtibar +20 (Maldivler gibi bir hayat)',
    bonusDurationDays: 0,
    bonusValue: 20,
  },
  {
    id: 'japonya',
    name: 'Japonya',
    emoji: '⛩️',
    description: 'Zen kültürü, teknoloji ve disiplin. Verimlilik ve araştırma odağı.',
    cost: 200_000,
    durationDays: 10,
    stressReduction: 80,
    incomePenaltyDays: 10,
    unlockAt: 1_000_000,
    bonusType: 'research',
    bonusLabel: 'Araştırma hızı +%30 (14 gün)',
    bonusDurationDays: 14,
    bonusValue: 0.3,
  },
  {
    id: 'new_york',
    name: 'New York',
    emoji: '🗽',
    description: 'Finans merkezi, iş bağlantıları, büyük sermaye. Networking odaklı.',
    cost: 300_000,
    durationDays: 7,
    stressReduction: 50,
    incomePenaltyDays: 7,
    unlockAt: 5_000_000,
    bonusType: 'networking',
    bonusLabel: 'Pasif gelir +%10 (14 gün)',
    bonusDurationDays: 14,
    bonusValue: 0.1,
  },
  {
    id: 'mars',
    name: 'Mars',
    emoji: '🚀',
    description: 'Uzay turizmi — nihai prestij. Sadece endgame baronlar için.',
    cost: 10_000_000,
    durationDays: 30,
    stressReduction: 100,
    incomePenaltyDays: 30,
    unlockAt: 100_000_000,
    bonusType: 'prestige',
    bonusLabel: 'Prestij çarpanı +%25 (30 gün)',
    bonusDurationDays: 30,
    bonusValue: 0.25,
  },
]

export interface TravelState {
  lastDestinationId: TravelDestinationId | null
  travelBonusUntilDay: number
  travelBonusType: string | null
  travelBonusValue: number
  /** Toplam seyahat sayısı */
  totalTrips: number
}

export function createTravelState(): TravelState {
  return {
    lastDestinationId: null,
    travelBonusUntilDay: 0,
    travelBonusType: null,
    travelBonusValue: 0,
    totalTrips: 0,
  }
}

export function travelDestinationDef(id: TravelDestinationId): TravelDestination {
  return TRAVEL_DESTINATIONS.find((d) => d.id === id)!
}

export function availableDestinations(totalEarned: number): TravelDestination[] {
  return TRAVEL_DESTINATIONS.filter((d) => totalEarned >= d.unlockAt)
}

/** Aktif seyahat bonusu çarpanı */
export function travelResearchBonus(state: TravelState, currentDay: number): number {
  if (!state.travelBonusType || currentDay > state.travelBonusUntilDay) return 0
  if (state.travelBonusType === 'research') return state.travelBonusValue
  return 0
}

export function travelIncomeBonus(state: TravelState, currentDay: number): number {
  if (!state.travelBonusType || currentDay > state.travelBonusUntilDay) return 0
  if (state.travelBonusType === 'networking') return state.travelBonusValue
  return 0
}

export function travelPrestigeBonus(state: TravelState, currentDay: number): number {
  if (!state.travelBonusType || currentDay > state.travelBonusUntilDay) return 0
  if (state.travelBonusType === 'prestige') return state.travelBonusValue
  return 0
}

export function travelName(dest: TravelDestination): string {
  return tRaw(`travel_${dest.id}_name`) ?? dest.name
}
export function travelDesc(dest: TravelDestination): string {
  return tRaw(`travel_${dest.id}_desc`) ?? dest.description
}
export function travelBonus(dest: TravelDestination): string {
  return tRaw(`travel_${dest.id}_bonus`) ?? dest.bonusLabel
}
