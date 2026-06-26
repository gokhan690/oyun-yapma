import { lifeGameTimeMs, MS_PER_GAME_DAY } from './GameClock'
import type { PendingDeath } from './Mortality'
import { requiredDomainText, fmt } from '../i18n'

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

/** Varis rolleri — 18 yaş sonrası şirkette pozisyon (Aşama 14) */
export type HeirRoleId =
  | 'operasyon'
  | 'finans'
  | 'teknoloji'
  | 'siyasi'
  | 'hukukcu'
  | 'golge'
  | 'aileci'

export interface HeirRoleDef {
  id: HeirRoleId
  name: string
  emoji: string
  description: string
  bonusLabel: string
  passiveBonus?: number
  stockBonus?: number
  ipoBonus?: number
  researchBonus?: number
  reputationBonus?: number
  lobbiCostDiscount?: number
  illegalBonus?: number
  raidPenaltyReduction?: number
  inheritanceLossReduction?: number
  inheritanceBonus?: number
  heatBonus?: number
}

export const HEIR_ROLES: HeirRoleDef[] = [
  {
    id: 'operasyon',
    name: 'Operasyon Varisi',
    emoji: '🏭',
    description: 'Şirket operasyonlarını yönetir.',
    bonusLabel: 'Legal gelir +%8',
    passiveBonus: 0.08,
  },
  {
    id: 'finans',
    name: 'Finans Varisi',
    emoji: '📊',
    description: 'Borsa ve yatırım uzmanı.',
    bonusLabel: 'Borsa +%8, IPO +%5',
    stockBonus: 0.08,
    ipoBonus: 0.05,
  },
  {
    id: 'teknoloji',
    name: 'Teknoloji Varisi',
    emoji: '💻',
    description: 'Ar-Ge ve teknoloji lideri.',
    bonusLabel: 'Tech +%10, Araştırma +%8',
    researchBonus: 0.08,
    passiveBonus: 0.05,
  },
  {
    id: 'siyasi',
    name: 'Siyasi Varis',
    emoji: '🏛️',
    description: 'İtibar ve lobi ağı kurar.',
    bonusLabel: 'İtibar +%10, Lobi -%10',
    reputationBonus: 0.10,
    lobbiCostDiscount: 0.10,
  },
  {
    id: 'hukukcu',
    name: 'Hukukçu Varis',
    emoji: '⚖️',
    description: 'Baskın cezalarını ve miras kayıplarını azaltır.',
    bonusLabel: 'Baskın cezası -%15, Miras kaybı -%8',
    raidPenaltyReduction: 0.15,
    inheritanceLossReduction: 0.08,
  },
  {
    id: 'golge',
    name: 'Gölge Varis',
    emoji: '🌑',
    description: 'Yeraltı bağlantıları var, yüksek risk.',
    bonusLabel: 'Illegal +%15, Heat +%10',
    illegalBonus: 0.15,
    heatBonus: 10,
  },
  {
    id: 'aileci',
    name: 'Aileci Varis',
    emoji: '👨‍👩‍👦',
    description: 'Miras aktarımını optimize eder.',
    bonusLabel: 'Miras aktarımı +%8',
    inheritanceBonus: 0.08,
  },
]

export function heirRoleDef(id: HeirRoleId | null | undefined): HeirRoleDef | null {
  if (!id) return null
  return HEIR_ROLES.find((r) => r.id === id) ?? null
}

/** Varis eğitim yolları — 10 yaş civarı seçilir (Aşama 13) */
export type ChildEducationPath =
  | 'isletme'
  | 'finans'
  | 'teknoloji'
  | 'siyaset'
  | 'hukuk'
  | 'medya'
  | 'golge_baglantilari'

export interface ChildEducationPathDef {
  id: ChildEducationPath
  name: string
  emoji: string
  description: string
  leadsToRole: HeirRoleId
}

export const CHILD_EDUCATION_PATHS: ChildEducationPathDef[] = [
  { id: 'isletme', name: 'İşletme', emoji: '💼', description: 'Legal gelir yönü', leadsToRole: 'operasyon' },
  { id: 'finans', name: 'Finans', emoji: '📊', description: 'Borsa/IPO uzmanı', leadsToRole: 'finans' },
  { id: 'teknoloji', name: 'Teknoloji', emoji: '💻', description: 'Tech/research', leadsToRole: 'teknoloji' },
  { id: 'siyaset', name: 'Siyaset', emoji: '🏛️', description: 'İtibar/lobi', leadsToRole: 'siyasi' },
  { id: 'hukuk', name: 'Hukuk', emoji: '⚖️', description: 'Baskın/miras koruması', leadsToRole: 'hukukcu' },
  { id: 'medya', name: 'Medya', emoji: '📺', description: 'İtibar/skandal azaltma', leadsToRole: 'siyasi' },
  { id: 'golge_baglantilari', name: 'Gölge Bağlantılar', emoji: '🌑', description: 'Illegal gelir + risk', leadsToRole: 'golge' },
]

/** Miras aktarım oranları (Aşama 16) */
export interface InheritanceResult {
  transferPct: number
  reason: string[]
}

export function calculateInheritance(
  hasWill: boolean,
  hasTrust: boolean,
  hasHeirSelected: boolean,
  heat: number,
  hasLawyerHeir: boolean,
  siblingCount: number,
): InheritanceResult {
  const reasons: string[] = []
  let pct = 0.75

  if (hasWill && hasHeirSelected) {
    pct = 0.92
    reasons.push(requiredDomainText('dynasty_inherit_will_heir'))
  } else if (hasWill) {
    pct = 0.85
    reasons.push(requiredDomainText('dynasty_inherit_will'))
  } else {
    reasons.push(requiredDomainText('dynasty_inherit_no_will'))
  }

  if (hasTrust) {
    pct += 0.05
    reasons.push(requiredDomainText('dynasty_inherit_trust'))
  }

  if (heat >= 70) {
    const heatPenalty = heat >= 90 ? 0.35 : heat >= 70 ? 0.20 : 0.10
    pct -= heatPenalty
    reasons.push(fmt('dynasty_inherit_heat', { pct: Math.round(heatPenalty * 100) }))
  }

  if (siblingCount > 1 && !hasWill) {
    const dispute = Math.min(0.25, siblingCount * 0.08)
    pct -= dispute
    reasons.push(fmt('dynasty_inherit_sibling', { pct: Math.round(dispute * 100) }))
  }

  if (hasLawyerHeir) {
    pct += 0.08
    reasons.push(requiredDomainText('dynasty_inherit_lawyer'))
  }

  return { transferPct: Math.max(0.4, Math.min(0.95, pct)), reason: reasons }
}

export interface ChildRecord {
  id: string
  name: string
  trait: ChildTrait
  bornGameDay: number
  educationXp: number
  riskProfile: ChildRiskProfile
  riskLabel: string
  parentingStyle?: ParentingStyle
  happiness?: number
  career?: ChildCareer
  /** Eğitim yolu (10 yaş) */
  educationPath?: ChildEducationPath
  /** Varis rolü (18 yaş sonrası) */
  heirRole?: HeirRoleId
  /** Varis olarak seçildi mi? */
  isHeirCandidate?: boolean
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
  /** Evlilik hayat-günü (çocuk doğum aralığı için — Düzeltme 4) */
  marriedLifeDay?: number | null
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
  legacyItems?: DynastyLegacyItemId[]
  accumulatedLegacyScore?: number
  /** Vasiyet hazırlandı mı? (Aşama 15) */
  hasWill?: boolean
  /** Aile vakfı / trust kuruldu mu? (Aşama 15) */
  hasTrust?: boolean
  /** Aile anayasası yazıldı mı? (Aşama 15) */
  hasFamilyConstitution?: boolean
  /** Nesil bonusu (Aşama 19 — hanedan puanı) */
  dynastyGenerationBonus?: number
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
  if (!heir) return 0
  // Varis rolüne göre bonus (Aşama 14)
  const role = heirRoleDef(heir.heirRole)
  if (role?.passiveBonus) return role.passiveBonus
  // Geriye dönük uyumluluk
  if (heir.career === 'businessperson') return 0.08
  return 0
}

/** Nesil bonusu (Aşama 19 — hanedan) */
export function dynastyGenerationBonus(generation: number): number {
  if (generation <= 1) return 0
  if (generation === 2) return 0.02
  if (generation === 3) return 0.04
  if (generation <= 5) return 0.06
  if (generation <= 7) return 0.08
  return 0.10
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
  const lifeMs = lifeGameTimeMs(gameTimeMs)
  const days = Math.floor(lifeMs / MS_PER_GAME_DAY) + 1 - bornGameDay
  return Math.max(0, days / 365.25)
}

export function playerGameAge(gameTimeMs: number, dynasty: DynastyState): number {
  const born = dynasty.playerBornGameDay ?? 1
  const start = dynasty.playerStartAge ?? PLAYER_START_AGE
  return Math.floor(start + gameYearsElapsed(gameTimeMs, born))
}

/**
 * Çocuk yaşı (yıl) — HAYAT zamanıyla, oyuncu yaşıyla aynı ölçek (Düzeltme 4-5).
 * bornGameDay artık hayat-günü olarak saklanır (lifeGameDay).
 */
export function childAgeYears(gameTimeMs: number, bornGameDay: number): number {
  return Math.floor(gameYearsElapsed(gameTimeMs, bornGameDay))
}

/** Çocuk yaşı kesirli (ondalık) — heir18 hesabı gibi yerler için */
export function childAgeYearsExact(gameTimeMs: number, bornGameDay: number): number {
  return gameYearsElapsed(gameTimeMs, bornGameDay)
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

export function heirRoleName(r: HeirRoleDef): string {
  return requiredDomainText(`heir_${r.id}_name`)
}
export function heirRoleDesc(r: HeirRoleDef): string {
  return requiredDomainText(`heir_${r.id}_desc`)
}
export function heirRoleBonusLabel(r: HeirRoleDef): string {
  return requiredDomainText(`heir_${r.id}_bonus`)
}
export function legacyItemLabel(item: DynastyLegacyItem): string {
  return requiredDomainText(`dynasty_legacy_${item.id}_label`)
}
export function legacyItemDesc(item: DynastyLegacyItem): string {
  return requiredDomainText(`dynasty_legacy_${item.id}_desc`)
}
export function legacyItemBonusLabel(item: DynastyLegacyItem): string {
  return requiredDomainText(`dynasty_legacy_${item.id}_bonus`)
}
export function spouseBonusLabel(s: SpouseOption): string {
  return requiredDomainText(`spouse_${s.id}_bonus`)
}
export function childCareerName(c: { id: ChildCareer; name: string; emoji: string; bonusLabel: string }): string {
  return requiredDomainText(`child_career_${c.id}_name`)
}
export function childCareerBonusLabel(c: { id: ChildCareer; name: string; emoji: string; bonusLabel: string }): string {
  return requiredDomainText(`child_career_${c.id}_bonus`)
}
export function eduPathName(e: ChildEducationPathDef): string {
  return requiredDomainText(`edu_path_${e.id}_name`)
}
export function eduPathDesc(e: ChildEducationPathDef): string {
  return requiredDomainText(`edu_path_${e.id}_desc`)
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
