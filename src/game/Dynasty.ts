import { gameDay } from './GameClock'
import type { PendingDeath } from './Mortality'

export type SpouseTrait = 'merchant' | 'diplomat' | 'innovator' | 'risk_taker'
export type SpouseGender = 'female' | 'male'
export type PlayerGender = 'female' | 'male'
export type ChildTrait = SpouseTrait

export interface SpouseOption {
  id: string
  name: string
  emoji: string
  gender: SpouseGender
  trait: SpouseTrait
  bonusLabel: string
  cost: number
  /** Belirli işletme türlerine ek bonus */
  producerBonusIds?: string[]
  producerBonusPct?: number
}

export type ChildRiskProfile = 'low' | 'gambler' | 'illegal' | 'scandal'

export interface ChildRecord {
  id: string
  name: string
  trait: ChildTrait
  bornGameDay: number
  educationXp: number
  riskProfile: ChildRiskProfile
  riskLabel: string
}

export const PLAYER_START_AGE = 18
/** İstatistiksel üst yaş referansı — zorunlu ölüm sınırı değil */
export const PLAYER_LIFESPAN = 100
export const SUCCESSION_START_AGE = 25

export interface DynastyState {
  spouseId: string | null
  spouseName: string | null
  spouseTrait: SpouseTrait | null
  marriedGameDay: number | null
  children: ChildRecord[]
  activeHeirId: string | null
  generation: number
  dynastyBonusId: string | null
  /** Oyun takviminde doğum günü */
  playerBornGameDay: number
  /** Nesil devrinde sıfırlanan başlangıç yaşı */
  playerStartAge: number
  /** @deprecated — pendingDeath kullan */
  lifespanNotified: boolean
  /** Vefat sonrası miras devri bekleniyor */
  pendingDeath: PendingDeath | null
}

export const SPOUSE_OPTIONS: SpouseOption[] = [
  {
    id: 'aylin', name: 'Aylin', emoji: '💎', gender: 'female', trait: 'diplomat', bonusLabel: 'Maliyet −8% · Lojistik +15%', cost: 50_000,
    producerBonusIds: ['fabrika', 'mobil_app'], producerBonusPct: 0.15,
  },
  {
    id: 'kerem', name: 'Kerem', emoji: '📊', gender: 'male', trait: 'merchant', bonusLabel: 'Pasif +12% · E-ticaret +18%', cost: 75_000,
    producerBonusIds: ['robot', 'kafe'], producerBonusPct: 0.18,
  },
  {
    id: 'zeynep', name: 'Zeynep', emoji: '💡', gender: 'female', trait: 'innovator', bonusLabel: 'Tıklama +15% · Yazılım +20%', cost: 60_000,
    producerBonusIds: ['holding', 'ai'], producerBonusPct: 0.2,
  },
  {
    id: 'onur', name: 'Onur', emoji: '🎲', gender: 'male', trait: 'risk_taker', bonusLabel: 'Illegal +20% · Bahis +25%', cost: 90_000,
    producerBonusIds: ['bahis', 'piramit', 'offshore'], producerBonusPct: 0.25,
  },
  {
    id: 'selin', name: 'Selin', emoji: '🌹', gender: 'female', trait: 'merchant', bonusLabel: 'Pasif +10% · Otel +16%', cost: 55_000,
    producerBonusIds: ['otel', 'kafe'], producerBonusPct: 0.16,
  },
  {
    id: 'defne', name: 'Defne', emoji: '🎭', gender: 'female', trait: 'risk_taker', bonusLabel: 'Illegal +15% · Kaçak +22%', cost: 85_000,
    producerBonusIds: ['kacak_imalat', 'siyah_fabrika'], producerBonusPct: 0.22,
  },
  {
    id: 'burak', name: 'Burak', emoji: '⚡', gender: 'male', trait: 'innovator', bonusLabel: 'Tıklama +12% · Yazılım +18%', cost: 65_000,
    producerBonusIds: ['holding', 'data_center'], producerBonusPct: 0.18,
  },
  {
    id: 'emre', name: 'Emre', emoji: '🛡️', gender: 'male', trait: 'diplomat', bonusLabel: 'Maliyet −10% · Lojistik +12%', cost: 48_000,
    producerBonusIds: ['fabrika', 'drone'], producerBonusPct: 0.12,
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
    playerBornGameDay: 1,
    playerStartAge: PLAYER_START_AGE,
    lifespanNotified: false,
    pendingDeath: null,
  }
}

export function gameYearsElapsed(gameTimeMs: number, bornGameDay: number): number {
  const days = gameDay(gameTimeMs) - bornGameDay
  return Math.max(0, days / 365.25)
}

export function playerGameAge(gameTimeMs: number, dynasty: DynastyState): number {
  const born = dynasty.playerBornGameDay ?? 1
  const start = dynasty.playerStartAge ?? PLAYER_START_AGE
  return Math.floor(start + gameYearsElapsed(gameTimeMs, born))
}

export function yearsUntilLifespan(gameTimeMs: number, dynasty: DynastyState): number {
  return Math.max(0, PLAYER_LIFESPAN - playerGameAge(gameTimeMs, dynasty))
}

/** @deprecated — 80 yaş zorunlu sınır kaldırıldı */
export function isLifespanReached(_gameTimeMs: number, _dynasty: DynastyState): boolean {
  return false
}

export function lifespanProgress(gameTimeMs: number, dynasty: DynastyState): number {
  const age = playerGameAge(gameTimeMs, dynasty)
  const span = PLAYER_LIFESPAN - (dynasty.playerStartAge ?? PLAYER_START_AGE)
  if (span <= 0) return 100
  return Math.min(100, ((age - (dynasty.playerStartAge ?? PLAYER_START_AGE)) / span) * 100)
}

export function spouseOption(id: string): SpouseOption | undefined {
  return SPOUSE_OPTIONS.find((s) => s.id === id)
}

/** Erkek baron → kadın adaylar, kadın baron → erkek adaylar */
export function spouseOptionsForPlayer(playerGender: PlayerGender): SpouseOption[] {
  const want: SpouseGender = playerGender === 'male' ? 'female' : 'male'
  return SPOUSE_OPTIONS.filter((s) => s.gender === want)
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

const RISK_PROFILES: { profile: ChildRiskProfile; label: string; weight: number }[] = [
  { profile: 'low', label: 'Düşük risk — sakin ve hesaplı', weight: 55 },
  { profile: 'gambler', label: '⚠️ Risk alma eğilimi yüksek — kumar borçlarına dikkat', weight: 20 },
  { profile: 'illegal', label: '⚠️ Illegal işlere meyilli — heat artabilir', weight: 15 },
  { profile: 'scandal', label: '⚠️ Skandal riski — medya ve itibar tehdidi', weight: 10 },
]

export function pickChildRiskProfile(): { riskProfile: ChildRiskProfile; riskLabel: string } {
  const total = RISK_PROFILES.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * total
  for (const r of RISK_PROFILES) {
    roll -= r.weight
    if (roll <= 0) return { riskProfile: r.profile, riskLabel: r.label }
  }
  const last = RISK_PROFILES[0]!
  return { riskProfile: last.profile, riskLabel: last.label }
}

export function migrateChildRecord(c: Partial<ChildRecord> & Pick<ChildRecord, 'id' | 'name' | 'trait' | 'bornGameDay' | 'educationXp'>): ChildRecord {
  if (c.riskProfile && c.riskLabel) {
    return c as ChildRecord
  }
  const picked = pickChildRiskProfile()
  return { ...c, riskProfile: picked.riskProfile, riskLabel: picked.riskLabel }
}

export function activeDynastyTrait(d: DynastyState): SpouseTrait | ChildTrait | null {
  if (d.dynastyBonusId) {
    const child = d.children.find((c) => c.id === d.dynastyBonusId)
    if (child) return child.trait
  }
  return d.spouseTrait
}

/** Oyun günü başına eğitim XP */
export function educationXpPerGameDay(): number {
  return 0.35
}

/** @deprecated */
export function educationXpPerGameHour(): number {
  return educationXpPerGameDay() / 24
}
