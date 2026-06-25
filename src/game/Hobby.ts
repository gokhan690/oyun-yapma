import { tRaw } from '../i18n'

/** Hobi sistemi — 1 hobi seçimi, özel bonuslar */

export type HobbyId = 'golfer' | 'football_fan' | 'art_collector' | 'sailor' | 'tech_enthusiast'

export interface HobbyDef {
  id: HobbyId
  name: string
  emoji: string
  description: string
  monthlyCost: number
  /** Kazanılan bonus etiketi */
  bonusLabel: string
  /** Belirli işletme grubuna özel çarpan */
  producerBonus?: { ids: string[]; pct: number }
  /** Araştırma hızı bonusu */
  researchBonus?: number
}

export const HOBBIES: HobbyDef[] = [
  {
    id: 'golfer',
    name: 'Golfçü',
    emoji: '⛳',
    description: 'Golf kulübü geliri +%20, itibar artışı',
    monthlyCost: 5_000,
    bonusLabel: 'Golf kulübü geliri +%20',
    producerBonus: { ids: ['golf_kulub', 'spor_salonu'], pct: 0.2 },
  },
  {
    id: 'football_fan',
    name: 'Futbol Severi',
    emoji: '⚽',
    description: 'Futbol kulüplerinde özel bonuslar',
    monthlyCost: 3_000,
    bonusLabel: 'Spor tesisi geliri +%15',
    producerBonus: { ids: ['futbol_amatör', 'stadyum'], pct: 0.15 },
  },
  {
    id: 'art_collector',
    name: 'Sanat Koleksiyoncusu',
    emoji: '🖼️',
    description: 'Sanat galerisi geliri +%30, itibar +5/ay',
    monthlyCost: 8_000,
    bonusLabel: 'Sanat galerisi geliri +%30',
    producerBonus: { ids: ['sanat_galerisi', 'muzeum'], pct: 0.3 },
  },
  {
    id: 'sailor',
    name: 'Yatçı',
    emoji: '⛵',
    description: 'Yat ve lüks işletme bonusu',
    monthlyCost: 12_000,
    bonusLabel: 'Lüks işletmeler +%10, itibar +8/ay',
    producerBonus: { ids: ['yacht_filo', 'otel', 'kuyumcu'], pct: 0.1 },
  },
  {
    id: 'tech_enthusiast',
    name: 'Teknoloji Meraklısı',
    emoji: '💻',
    description: 'Araştırma hızı +%20',
    monthlyCost: 4_000,
    bonusLabel: 'Araştırma hızı +%20',
    researchBonus: 0.2,
  },
]

export interface HobbyState {
  hobbyId: HobbyId | null
  monthsActive: number
  /** Bonus artık aktif mi (3 ay sonra tam bonusa ulaşır) */
  bonusActive: boolean
}

export function createHobbyState(): HobbyState {
  return { hobbyId: null, monthsActive: 0, bonusActive: false }
}

export function hobbyDef(id: HobbyId | null): HobbyDef | null {
  if (!id) return null
  return HOBBIES.find((h) => h.id === id) ?? null
}

export function hobbyProducerBonus(state: HobbyState, producerId: string): number {
  if (!state.hobbyId || !state.bonusActive) return 0
  const def = hobbyDef(state.hobbyId)
  if (!def?.producerBonus) return 0
  if (def.producerBonus.ids.includes(producerId)) return def.producerBonus.pct
  return 0
}

export function hobbyResearchBonus(state: HobbyState): number {
  if (!state.hobbyId || !state.bonusActive) return 0
  const def = hobbyDef(state.hobbyId)
  return def?.researchBonus ?? 0
}

export function hobbyMonthlyCost(state: HobbyState): number {
  if (!state.hobbyId) return 0
  const def = hobbyDef(state.hobbyId)
  return def?.monthlyCost ?? 0
}

/** Hobi aylık tick — 3 ay sonra bonus aktif */
export function tickHobbyMonth(state: HobbyState): void {
  if (!state.hobbyId) return
  state.monthsActive++
  if (state.monthsActive >= 3) state.bonusActive = true
}

export function hobbyName(h: HobbyDef): string {
  return tRaw(`hobby_${h.id}_name`) ?? h.name
}
export function hobbyDesc(h: HobbyDef): string {
  return tRaw(`hobby_${h.id}_desc`) ?? h.description
}
export function hobbyBonus(h: HobbyDef): string {
  return tRaw(`hobby_${h.id}_bonus`) ?? h.bonusLabel
}
