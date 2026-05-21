export type SpouseTrait = 'merchant' | 'diplomat' | 'innovator' | 'risk_taker'
export type ChildTrait = SpouseTrait

export interface SpouseOption {
  id: string
  name: string
  emoji: string
  trait: SpouseTrait
  bonusLabel: string
  cost: number
  /** Belirli işletme türlerine ek bonus */
  producerBonusIds?: string[]
  producerBonusPct?: number
}

export interface ChildRecord {
  id: string
  name: string
  trait: ChildTrait
  bornGameDay: number
  educationXp: number
}

export interface DynastyState {
  spouseId: string | null
  spouseName: string | null
  spouseTrait: SpouseTrait | null
  marriedGameDay: number | null
  children: ChildRecord[]
  activeHeirId: string | null
  generation: number
  dynastyBonusId: string | null
}

export const SPOUSE_OPTIONS: SpouseOption[] = [
  {
    id: 'aylin', name: 'Aylin', emoji: '💎', trait: 'diplomat', bonusLabel: 'Maliyet −8% · Lojistik +15%', cost: 50_000,
    producerBonusIds: ['fabrika', 'mobil_app'], producerBonusPct: 0.15,
  },
  {
    id: 'kerem', name: 'Kerem', emoji: '📊', trait: 'merchant', bonusLabel: 'Pasif +12% · E-ticaret +18%', cost: 75_000,
    producerBonusIds: ['robot', 'kafe'], producerBonusPct: 0.18,
  },
  {
    id: 'zeynep', name: 'Zeynep', emoji: '💡', trait: 'innovator', bonusLabel: 'Tıklama +15% · Yazılım +20%', cost: 60_000,
    producerBonusIds: ['holding', 'ai'], producerBonusPct: 0.2,
  },
  {
    id: 'onur', name: 'Onur', emoji: '🎲', trait: 'risk_taker', bonusLabel: 'Illegal +20% · Bahis +25%', cost: 90_000,
    producerBonusIds: ['bahis', 'piramit', 'offshore'], producerBonusPct: 0.25,
  },
]

const CHILD_NAMES = [
  'Elif', 'Deniz', 'Aras', 'Mira', 'Kaan', 'Lina', 'Emir', 'Sude', 'Atlas', 'Nisa',
]

const CHILD_TRAITS: ChildTrait[] = ['merchant', 'diplomat', 'innovator', 'risk_taker']

/** Eğitim tamamlanınca miras bonusu güçlenir */
export const CHILD_EDUCATION_MAX = 100

export function createDynastyState(): DynastyState {
  return {
    spouseId: null,
    spouseName: null,
    spouseTrait: null,
    marriedGameDay: null,
    children: [],
    activeHeirId: null,
    generation: 1,
    dynastyBonusId: null,
  }
}

export function spouseOption(id: string): SpouseOption | undefined {
  return SPOUSE_OPTIONS.find((s) => s.id === id)
}

export function traitPassiveMult(trait: SpouseTrait | ChildTrait | null): number {
  if (trait === 'merchant') return 1.12
  return 1
}

export function traitClickMult(trait: SpouseTrait | ChildTrait | null): number {
  if (trait === 'innovator') return 1.15
  return 1
}

export function traitCostMult(trait: SpouseTrait | ChildTrait | null): number {
  if (trait === 'diplomat') return 0.92
  return 1
}

export function traitIllegalMult(trait: SpouseTrait | ChildTrait | null): number {
  if (trait === 'risk_taker') return 1.2
  return 1
}

export function spouseProducerBonus(
  dynasty: DynastyState,
  producerId: string,
  dynastyPrestigeBonus: boolean,
): number {
  let mult = 1
  const spouse = dynasty.spouseId ? spouseOption(dynasty.spouseId) : null
  if (spouse?.producerBonusIds?.includes(producerId)) {
    mult *= 1 + (spouse.producerBonusPct ?? 0)
  }
  const heir = dynasty.dynastyBonusId
    ? dynasty.children.find((c) => c.id === dynasty.dynastyBonusId)
    : null
  if (heir) {
    const eduMult = 1 + (heir.educationXp / CHILD_EDUCATION_MAX) * 0.15
    mult *= eduMult
    if (dynastyPrestigeBonus) mult *= 1.05
  }
  return mult
}

export function pickChildName(existing: ChildRecord[]): string {
  const used = new Set(existing.map((c) => c.name))
  const pool = CHILD_NAMES.filter((n) => !used.has(n))
  if (pool.length === 0) return `Varis ${existing.length + 1}`
  return pool[Math.floor(Math.random() * pool.length)]!
}

export function randomChildTrait(): ChildTrait {
  return CHILD_TRAITS[Math.floor(Math.random() * CHILD_TRAITS.length)]!
}

export function activeDynastyTrait(d: DynastyState): SpouseTrait | ChildTrait | null {
  if (d.dynastyBonusId) {
    const child = d.children.find((c) => c.id === d.dynastyBonusId)
    if (child) return child.trait
  }
  return d.spouseTrait
}

/** Oyun saatiyle pasif eğitim XP (saat başına) */
export function educationXpPerGameHour(): number {
  return 2.5
}
