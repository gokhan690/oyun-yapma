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

export type ParentingStyle = 'strict' | 'free'
export type ChildCareer = 'businessperson' | 'politician' | 'artist' | 'scientist' | 'athlete'

export interface ChildRecord {
  id: string
  name: string
  trait: ChildTrait
  bornGameDay: number
  educationXp: number
  riskProfile: ChildRiskProfile
  riskLabel: string
  /** Yetiştirme tarzı — eğitim hızı vs mutluluk dengesi */
  parentingStyle?: ParentingStyle
  /** Çocuk mutluluğu (0-100) */
  happiness?: number
  /** 18 yaşında seçilen kariyer */
  career?: ChildCareer
}

export const PLAYER_START_AGE = 18
/** İstatistiksel üst yaş referansı — zorunlu ölüm sınırı değil */
export const PLAYER_LIFESPAN = 100
export const SUCCESSION_START_AGE = 25

export type DynastyLegacyItemId = 'family_business' | 'family_wealth' | 'family_name'

export interface DynastyLegacyItem {
  id: DynastyLegacyItemId
  label: string
  emoji: string
  description: string
  /** IPO sonrasında verilen bonus etiketi */
  bonusLabel: string
}

export const DYNASTY_LEGACY_ITEMS: DynastyLegacyItem[] = [
  {
    id: 'family_business',
    label: 'Aile İşletmesi',
    emoji: '🏪',
    description: 'Bir işletme sonraki nesle devredilir',
    bonusLabel: 'Başlangıçta 1 işletme mevcut',
  },
  {
    id: 'family_wealth',
    label: 'Aile Serveti',
    emoji: '💰',
    description: 'Küçük bir servet birikimi aktarılır',
    bonusLabel: 'Başlangıç parasına +₺50.000',
  },
  {
    id: 'family_name',
    label: 'Aile Adı',
    emoji: '👑',
    description: 'Birikmiş itibar bir sonraki nesle kalır',
    bonusLabel: 'İtibar 20 ile başlar',
  },
]

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
  /** Eş memnuniyeti (0-100) */
  spouseSatisfaction?: number
  /** Son evlilik krizi tetiklenmesinden bu yana */
  lastMarriageCrisisDay?: number
  /** IPO sırasında seçilen miras kalemleri (kuşaklar arası taşınan) */
  legacyItems?: DynastyLegacyItemId[]
  /** Geçmiş nesillerde biriken toplam miras puanı */
  accumulatedLegacyScore?: number
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
    spouseSatisfaction: 70,
    lastMarriageCrisisDay: 0,
  }
}

export const CHILD_CAREERS: { id: ChildCareer; name: string; emoji: string; bonusLabel: string }[] = [
  { id: 'businessperson', name: 'İş İnsanı', emoji: '💼', bonusLabel: 'Pasif gelir +%8' },
  { id: 'politician', name: 'Siyasetçi', emoji: '🏛️', bonusLabel: 'İtibar kazancı +%15' },
  { id: 'artist', name: 'Sanatçı', emoji: '🎨', bonusLabel: 'İtibar +%20' },
  { id: 'scientist', name: 'Bilim İnsanı', emoji: '🔬', bonusLabel: 'Araştırma hızı +%15' },
  { id: 'athlete', name: 'Sporcu', emoji: '🏅', bonusLabel: 'Spor kulübü geliri +%20' },
]

export function childCareerDef(id: ChildCareer | undefined) {
  if (!id) return null
  return CHILD_CAREERS.find((c) => c.id === id) ?? null
}

/** Aktif varisin kariyerine göre pasif gelir bonusu */
export function heirCareerPassiveBonus(d: DynastyState): number {
  const heir = d.dynastyBonusId ? d.children.find((c) => c.id === d.dynastyBonusId) : null
  if (heir?.career === 'businessperson') return 0.08
  return 0
}

/** Eş memnuniyetine göre trait bonus çarpanı — yüksek memnuniyet bonusu güçlendirir */
export function spouseSatisfactionMult(d: DynastyState): number {
  const sat = d.spouseSatisfaction ?? 70
  if (sat >= 80) return 1.5
  if (sat >= 50) return 1.0
  if (sat >= 30) return 0.8
  return 0.5
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

/** Miras kalemi seç veya kaldır (maksimum 3) */
export function toggleLegacyItem(d: DynastyState, itemId: DynastyLegacyItemId): void {
  const items = d.legacyItems ?? []
  const idx = items.indexOf(itemId)
  if (idx >= 0) {
    d.legacyItems = items.filter((i) => i !== itemId)
  } else if (items.length < 3) {
    d.legacyItems = [...items, itemId]
  }
}

/** IPO sonrası miras bonusları — başlangıç parasına eklenir */
export function legacyWealthBonus(d: DynastyState): number {
  const items = d.legacyItems ?? []
  return items.includes('family_wealth') ? 50_000 : 0
}

/** IPO sonrası miras itibarı */
export function legacyReputationBonus(d: DynastyState): number {
  const items = d.legacyItems ?? []
  return items.includes('family_name') ? 20 : 0
}

/** Başlangıçta işletme mirası var mı */
export function legacyHasFamilyBusiness(d: DynastyState): boolean {
  return (d.legacyItems ?? []).includes('family_business')
}

/** Miras puanını hesapla — kuşak başına birikir */
export function calculateLegacyScore(peakNetWorth: number, generation: number, ipoCount: number, victories: number): number {
  let score = 0
  score += Math.floor(Math.log10(Math.max(1, peakNetWorth)) * 10)
  score += generation * 5
  score += ipoCount * 15
  score += victories * 30
  return score
}

/** "Halk ne hatırlıyor?" — itibar puanına göre unvan */
export function publicMemoryTitle(reputation: number): { title: string; emoji: string } {
  if (reputation >= 200) return { title: 'Hayırsever Baron', emoji: '🌟' }
  if (reputation >= 100) return { title: 'Vizyon Sahibi', emoji: '💡' }
  if (reputation >= 50) return { title: 'Saygın İş İnsanı', emoji: '🤝' }
  if (reputation >= 0) return { title: 'Sıradan Girişimci', emoji: '💼' }
  if (reputation >= -50) return { title: 'Tartışmalı Figür', emoji: '⚠️' }
  return { title: 'Zalim Baron', emoji: '😈' }
}
