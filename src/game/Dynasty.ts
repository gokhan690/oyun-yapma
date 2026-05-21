export type SpouseTrait = 'merchant' | 'diplomat' | 'innovator' | 'risk_taker'
export type ChildTrait = SpouseTrait

export interface SpouseOption {
  id: string
  name: string
  emoji: string
  trait: SpouseTrait
  bonusLabel: string
  cost: number
}

export interface ChildRecord {
  id: string
  name: string
  trait: ChildTrait
  bornGameDay: number
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
  { id: 'aylin', name: 'Aylin', emoji: '💎', trait: 'diplomat', bonusLabel: 'Maliyetler −8%', cost: 50_000 },
  { id: 'kerem', name: 'Kerem', emoji: '📊', trait: 'merchant', bonusLabel: 'Pasif +12%', cost: 75_000 },
  { id: 'zeynep', name: 'Zeynep', emoji: '💡', trait: 'innovator', bonusLabel: 'Tıklama +15%', cost: 60_000 },
  { id: 'onur', name: 'Onur', emoji: '🎲', trait: 'risk_taker', bonusLabel: 'Illegal +20%', cost: 90_000 },
]

const CHILD_NAMES = [
  'Elif', 'Deniz', 'Aras', 'Mira', 'Kaan', 'Lina', 'Emir', 'Sude', 'Atlas', 'Nisa',
]

const CHILD_TRAITS: ChildTrait[] = ['merchant', 'diplomat', 'innovator', 'risk_taker']

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
  if (trait === 'diplomat') return 1
  if (trait === 'innovator') return 1
  if (trait === 'risk_taker') return 1
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
