import { tRaw } from '../i18n'

export type CareerJobId =
  | 'kurye'
  | 'garson'
  | 'satis_temsilcisi'
  | 'yazilim_stajyeri'
  | 'banka_calisani'
  | 'belediye_asistani'

export type CharacterBackgroundId =
  | 'sifirdan_gelen'
  | 'universiteli'
  | 'satisci'
  | 'finansci'
  | 'aile_sirketi'
  | 'karanlik_cevre'

export type CareerActionId =
  | 'mesai'
  | 'ek_mesai'
  | 'musteri_bul'
  | 'satis_kapat'
  | 'egitim_al'
  | 'networking'
  | 'isten_ayril'

export interface CareerJobDef {
  id: CareerJobId
  name: string
  emoji: string
  description: string
  baseDailyWage: number
  bonusChance: number
  bonusMultiplier: number
  stressDelta: number
  unlockHint: string
  careerPath?: string
  requirements?: CareerJobRequirement[]
}

export type CareerRequirementKind =
  | 'career_level'
  | 'career_total_wage'
  | 'total_earned'
  | 'background'

export type CareerJobRequirement =
  | { kind: 'career_level'; min: number }
  | { kind: 'career_total_wage'; min: number }
  | { kind: 'total_earned'; min: number }
  | { kind: 'background'; ids: CharacterBackgroundId[] }

export interface CareerEligibilityContext {
  totalEarned?: number
  characterBackgroundId?: CharacterBackgroundId | null
}

export interface MissingCareerRequirement {
  kind: CareerRequirementKind
  required: number | CharacterBackgroundId[]
  actual: number | CharacterBackgroundId | null
  messageKey: string
}

export interface CareerJobEligibility {
  jobId: CareerJobId
  job: CareerJobDef
  eligible: boolean
  missingRequirements: MissingCareerRequirement[]
}

export type CareerJobChangeCode =
  | 'ok'
  | 'job_not_found'
  | 'same_job'
  | 'requirements_not_met'
  | 'already_unemployed'

export interface CareerJobChangeResult {
  ok: boolean
  code: CareerJobChangeCode
  previousJobId: CareerJobId | null
  currentJobId: CareerJobId | null
  jobId: CareerJobId | null
  missingRequirements: MissingCareerRequirement[]
  messageKey: string
}

export interface CharacterBackgroundDef {
  id: CharacterBackgroundId
  name: string
  emoji: string
  description: string
  bonusLabel: string
  passiveBonus?: number
  clickBonus?: number
  illegalBonus?: number
  heatBonus?: number
  costDiscount?: number
  researchBonus?: number
  unlockFinanceEarly?: boolean
  startingReputationBonus?: number
}

export interface CareerState {
  jobId: CareerJobId | null
  backgroundId: CharacterBackgroundId | null
  /** Kariyer seviyesi (0-10) */
  level: number
  /** Kariyer deneyim puanı */
  xp: number
  /** Kariyer XP eşiği (bir sonraki seviye) */
  xpToNext: number
  /** Bugünkü mesai/aksiyon geliri (günlük maaş deposit değil) */
  wageEarnedToday: number
  /** Bugün yatırılan normal günlük maaş (opsiyonel — eski save default 0) */
  dailyWagePaidToday?: number
  /** Toplam kariyer geliri */
  totalWageEarned: number
  /** Stres seviyesi (0-100) */
  stress: number
  /** Girişimci mi oldu? */
  isEntrepreneur: boolean
  /** Kariyer boyunca tamamlanan toplam aksiyon sayısı (firma kilidi için). */
  actionsTotal?: number
  /** Kariyer boyunca kullanılan aksiyonlar */
  actionsUsedToday: string[]
  /** Son aksiyonun oyun günü */
  lastActionDay: number
  /** İlk hedef tamamlandı mı? (10.000₺ biriktir) */
  firstGoalComplete: boolean
  /** Kariyer son aktif tarih */
  lastWageDay: number
}

export const CAREER_JOBS: CareerJobDef[] = [
  {
    id: 'kurye',
    name: 'Kurye',
    emoji: '🚴',
    description: 'Hızlı para ama düşük gelir. İyi bir başlangıç noktası.',
    baseDailyWage: 180,
    bonusChance: 0.1,
    bonusMultiplier: 1.2,
    stressDelta: 3,
    unlockHint: 'Başlangıç işi',
    careerPath: 'lojistik',
  },
  {
    id: 'garson',
    name: 'Garson',
    emoji: '🍽️',
    description: 'Bahşiş geliri ekleyebilir. Streslidir.',
    baseDailyWage: 200,
    bonusChance: 0.25,
    bonusMultiplier: 1.3,
    stressDelta: 5,
    unlockHint: 'Başlangıç işi',
    careerPath: 'gida',
  },
  {
    id: 'satis_temsilcisi',
    name: 'Satış Temsilcisi',
    emoji: '📞',
    description: 'Prim şansı yüksek, stres de yüksek.',
    baseDailyWage: 280,
    bonusChance: 0.35,
    bonusMultiplier: 1.5,
    stressDelta: 8,
    unlockHint: 'Başlangıç işi',
    careerPath: 'satis',
  },
  {
    id: 'yazilim_stajyeri',
    name: 'Yazılım Stajyeri',
    emoji: '💻',
    description: 'Orta gelir, teknoloji bonusu verir.',
    baseDailyWage: 320,
    bonusChance: 0.15,
    bonusMultiplier: 1.25,
    stressDelta: 4,
    unlockHint: 'Kariyer seviye 2',
    careerPath: 'teknoloji',
    requirements: [{ kind: 'career_level', min: 2 }],
  },
  {
    id: 'banka_calisani',
    name: 'Banka Çalışanı',
    emoji: '🏦',
    description: 'Finans yolunu açar. Borsa erken erişim.',
    baseDailyWage: 350,
    bonusChance: 0.2,
    bonusMultiplier: 1.35,
    stressDelta: 5,
    unlockHint: 'Kariyer seviye 2',
    careerPath: 'finans',
    requirements: [{ kind: 'career_level', min: 2 }],
  },
  {
    id: 'belediye_asistani',
    name: 'Belediye Asistanı',
    emoji: '🏛️',
    description: 'Düşük gelir ama siyaset ağı açar.',
    baseDailyWage: 220,
    bonusChance: 0.1,
    bonusMultiplier: 1.15,
    stressDelta: 2,
    unlockHint: 'Kariyer seviye 2',
    careerPath: 'siyaset',
    requirements: [{ kind: 'career_level', min: 2 }],
  },
]

export const CHARACTER_BACKGROUNDS: CharacterBackgroundDef[] = [
  {
    id: 'sifirdan_gelen',
    name: 'Sıfırdan Gelen',
    emoji: '💪',
    description: 'Hiçbir servetin yok ama kararlısın. İtibar kazanımı daha hızlı.',
    bonusLabel: 'İtibar kazanımı +%10',
    startingReputationBonus: 10,
  },
  {
    id: 'universiteli',
    name: 'Üniversiteli',
    emoji: '🎓',
    description: 'Eğitimli geçmişin tech ve araştırma bonusu sağlar.',
    bonusLabel: 'Teknoloji/Araştırma +%8',
    researchBonus: 0.08,
  },
  {
    id: 'satisci',
    name: 'Satışçı',
    emoji: '🤝',
    description: 'Doğal satış yeteneğin var. Aktif gelir daha yüksek ama stres de.',
    bonusLabel: 'Aktif gelir +%12, Stres +%5',
    clickBonus: 0.12,
    heatBonus: 5,
  },
  {
    id: 'finansci',
    name: 'Finansçı',
    emoji: '📊',
    description: 'Piyasaları iyi tanırsın. Borsa erken açılır ama kriz etkisi fazla.',
    bonusLabel: 'Borsa erken açılır, Kriz etkisi +%5',
    unlockFinanceEarly: true,
  },
  {
    id: 'aile_sirketi',
    name: 'Aile Şirketi',
    emoji: '👨‍👩‍👦',
    description: 'Ailenin küçük bir işletmesi var. İlk işletme daha ucuz.',
    bonusLabel: 'İlk işletme maliyeti -%8',
    costDiscount: 0.08,
  },
  {
    id: 'karanlik_cevre',
    name: 'Karanlık Çevre',
    emoji: '🌑',
    description: 'Yeraltı bağlantıların işe yarar. Illegal gelir yüksek ama heat riski de.',
    bonusLabel: 'Illegal gelir +%12, Heat +%12',
    illegalBonus: 0.12,
    heatBonus: 12,
  },
]

export function createCareerState(): CareerState {
  return {
    jobId: null,
    backgroundId: null,
    level: 1,
    xp: 0,
    xpToNext: 100,
    wageEarnedToday: 0,
    dailyWagePaidToday: 0,
    totalWageEarned: 0,
    stress: 20,
    isEntrepreneur: false,
    actionsTotal: 0,
    actionsUsedToday: [],
    lastActionDay: 0,
    firstGoalComplete: false,
    lastWageDay: 0,
  }
}

export function careerJobDef(id: CareerJobId | null): CareerJobDef | null {
  if (!id) return null
  return CAREER_JOBS.find((j) => j.id === id) ?? null
}

export function isCareerJobId(value: unknown): value is CareerJobId {
  return typeof value === 'string' && CAREER_JOBS.some((job) => job.id === value)
}

function missingRequirement(
  requirement: CareerJobRequirement,
  career: CareerState,
  context: CareerEligibilityContext,
): MissingCareerRequirement | null {
  switch (requirement.kind) {
    case 'career_level': {
      const actual = Math.max(0, Number(career.level) || 0)
      return actual >= requirement.min
        ? null
        : { kind: requirement.kind, required: requirement.min, actual, messageKey: 'career_req_career_level' }
    }
    case 'career_total_wage': {
      const actual = Math.max(0, Math.floor(Number(career.totalWageEarned) || 0))
      return actual >= requirement.min
        ? null
        : { kind: requirement.kind, required: requirement.min, actual, messageKey: 'career_req_total_wage' }
    }
    case 'total_earned': {
      const actual = Math.max(0, Math.floor(Number(context.totalEarned) || 0))
      return actual >= requirement.min
        ? null
        : { kind: requirement.kind, required: requirement.min, actual, messageKey: 'career_req_total_earned' }
    }
    case 'background': {
      const actual = context.characterBackgroundId ?? career.backgroundId ?? null
      return actual && requirement.ids.includes(actual)
        ? null
        : { kind: requirement.kind, required: requirement.ids, actual, messageKey: 'career_req_background' }
    }
  }
}

export function careerJobEligibility(
  career: CareerState,
  jobId: CareerJobId,
  context: CareerEligibilityContext = {},
): CareerJobEligibility {
  const job = careerJobDef(jobId)
  if (!job) {
    throw new Error(`Unknown career job: ${jobId}`)
  }
  const missingRequirements = (job.requirements ?? [])
    .map((requirement) => missingRequirement(requirement, career, context))
    .filter((missing): missing is MissingCareerRequirement => missing !== null)
  return {
    jobId,
    job,
    eligible: missingRequirements.length === 0,
    missingRequirements,
  }
}

export function backgroundDef(id: CharacterBackgroundId | null): CharacterBackgroundDef | null {
  if (!id) return null
  return CHARACTER_BACKGROUNDS.find((b) => b.id === id) ?? null
}

export function careerJobName(job: CareerJobDef): string {
  return tRaw(`career_job_${job.id}_name`) ?? job.name
}
export function careerJobDesc(job: CareerJobDef): string {
  return tRaw(`career_job_${job.id}_desc`) ?? job.description
}
export function careerJobHint(job: CareerJobDef): string {
  return tRaw(`career_job_${job.id}_hint`) ?? job.unlockHint
}
export function careerBgName(bg: CharacterBackgroundDef): string {
  return tRaw(`career_bg_${bg.id}_name`) ?? bg.name
}
export function careerBgDesc(bg: CharacterBackgroundDef): string {
  return tRaw(`career_bg_${bg.id}_desc`) ?? bg.description
}
export function careerBgBonus(bg: CharacterBackgroundDef): string {
  return tRaw(`career_bg_${bg.id}_bonus`) ?? bg.bonusLabel
}

/** Kariyer seviyesi × maaş çarpanı */
export function careerWageMultiplier(level: number): number {
  return 1 + (level - 1) * 0.15
}

/** Günlük kariyer maaşı */
export function dailyCareerWage(career: CareerState): number {
  const job = careerJobDef(career.jobId)
  if (!job) return 0
  if (career.isEntrepreneur) return 0
  return Math.floor(job.baseDailyWage * careerWageMultiplier(career.level))
}

/** Prim bonusu var mı? */
export function rollCareerBonus(career: CareerState): number {
  const job = careerJobDef(career.jobId)
  if (!job) return 0
  if (Math.random() < job.bonusChance) {
    return Math.floor(dailyCareerWage(career) * (job.bonusMultiplier - 1))
  }
  return 0
}

/** Kariyer XP eşiği her seviyede artar */
export function careerXpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

/** Aksiyonun stresi */
const ACTION_STRESS: Record<CareerActionId, number> = {
  mesai: 5,
  ek_mesai: 10,
  musteri_bul: 3,
  satis_kapat: 8,
  egitim_al: -2,
  networking: 2,
  isten_ayril: 0,
}

/** Aksiyon XP kazancı */
const ACTION_XP: Record<CareerActionId, number> = {
  mesai: 10,
  ek_mesai: 20,
  musteri_bul: 15,
  satis_kapat: 25,
  egitim_al: 30,
  networking: 12,
  isten_ayril: 0,
}

/** Aksiyonun para çarpanı (günlük maaşın katı) */
const ACTION_WAGE_MULT: Record<CareerActionId, number> = {
  mesai: 0.3,
  ek_mesai: 0.5,
  musteri_bul: 0.2,
  satis_kapat: 0.6,
  egitim_al: 0,
  networking: 0.1,
  isten_ayril: 0,
}

/** UI tahmini — mesai/ek mesai gelir önizlemesi (prim hariç). */
export function estimatedCareerActionPay(career: CareerState, actionId: CareerActionId): number {
  if (!career.jobId || career.isEntrepreneur) return 0
  return Math.floor(dailyCareerWage(career) * ACTION_WAGE_MULT[actionId])
}

/**
 * TUR15-C5 — Eski meslek → firma tipi küçük gelir bonusu. Yalnız Economy.ts
 * PRODUCERS içinde GERÇEKTEN var olan id'lerle net eşleşen firma tiplerinde
 * uygulanır (eşleşme yoksa 0/null — generic bonus YOK). Yalnız girişimci
 * modunda kullanılmalıdır (çağıran taraf isEntrepreneur kontrol eder — bu
 * dosya state'e dokunmaz, salt-okunur pure helper'dır). Illegal/dark
 * firmalara kasıtlı olarak HİÇ bonus verilmez; bu turun kapsamı yalnız legal
 * iş geçmişidir — mafya/kaçakçılık/torpil ayrı sistemlere aittir.
 * Economy.ts'e tip düzeyinde bile bağlanmaz (döngüsel import/coupling riski
 * olmasın diye producer parametresi `{ id, category? }` şeklinde alınır).
 */
const FORMER_JOB_BONUS_PCT = 3

const FORMER_JOB_FIRM_IDS: Record<string, string[]> = {
  lojistik:  ['fabrika', 'kargo', 'drone', 'liman', 'fulfillment'],
  gida:      ['kafe', 'ofis', 'firin', 'cikolata', 'catering'],
  satis:     ['robot', 'giyim', 'pet_shop', 'market_zincir'],
  teknoloji: ['holding', 'mobil_app', 'data_center', 'oyun_studio', 'yazilim_outsource'],
}

const FORMER_JOB_TARGET_LABEL: Record<string, string> = {
  lojistik: 'Lojistik/nakliye',
  gida: 'Kafe/restoran',
  satis: 'Perakende/e-ticaret',
  teknoloji: 'Teknoloji/yazılım',
  finans: 'Finansal verimlilik',
}

export interface FormerJobFirmBonusInfo {
  bonusPct: number
  targetLabel: string
}

/** UI önizlemesi — eski mesleğin genel bonus profili (hangi firma tipine, kaç %). */
export function formerJobFirmBonus(jobId: CareerJobId | null): FormerJobFirmBonusInfo | null {
  const path = jobId ? careerJobDef(jobId)?.careerPath : undefined
  if (!path) return null
  const targetLabel = FORMER_JOB_TARGET_LABEL[path]
  return targetLabel ? { bonusPct: FORMER_JOB_BONUS_PCT, targetLabel } : null
}

/** Ekonomi pipeline'ı — belirli bir firmaya uygulanacak gerçek çarpan (0 = bonus yok). */
export function formerJobFirmBonusMult(jobId: CareerJobId | null, def: { id: string; category?: string }): number {
  const path = jobId ? careerJobDef(jobId)?.careerPath : undefined
  if (!path) return 0
  if (path === 'finans') return def.category === 'finance' ? FORMER_JOB_BONUS_PCT / 100 : 0
  const ids = FORMER_JOB_FIRM_IDS[path]
  if (!ids) return 0
  return ids.includes(def.id) ? FORMER_JOB_BONUS_PCT / 100 : 0
}

/**
 * TUR15-C3 — UI önizlemesi: aksiyonun tahmini para/XP/stres etkisi (prim hariç).
 * Salt-okunur, state değiştirmez; ACTION_XP/ACTION_STRESS tablolarını TEKRARLAMAZ.
 */
export function careerActionPreview(
  career: CareerState,
  actionId: CareerActionId,
): { pay: number; xp: number; stress: number } {
  return {
    pay: estimatedCareerActionPay(career, actionId),
    xp: ACTION_XP[actionId],
    stress: ACTION_STRESS[actionId],
  }
}

/** RefApp C4-lite: bağlanan günlük aksiyonlar. */
export const BINDABLE_CAREER_ACTION_IDS: CareerActionId[] = [
  'mesai',
  'ek_mesai',
  'egitim_al',
  'networking',
]

/**
 * TUR14 — TEK KAYNAK kariyer gün sıfırlaması. Gün değişince günlük aksiyon/maaş
 * durumunu sıfırlar; aynı gün ikinci çağrıda hiçbir şey yapmaz (idempotent).
 * Dönüş: bu çağrıda sıfırlama yapıldıysa true (çağıran event üretebilir).
 */
export function ensureCareerDay(career: CareerState, currentDay: number): boolean {
  if (career.lastActionDay === currentDay) return false
  career.actionsUsedToday = []
  career.lastActionDay = currentDay
  career.wageEarnedToday = 0
  career.dailyWagePaidToday = 0
  return true
}

export function applyCareerAction(
  career: CareerState,
  actionId: CareerActionId,
  currentDay: number,
): { money: number; xp: number; stressDelta: number; levelUp: boolean } {
  if (career.isEntrepreneur) return { money: 0, xp: 0, stressDelta: 0, levelUp: false }
  // Savunma amaçlı gün sıfırlaması (tek kaynak ensureCareerDay)
  ensureCareerDay(career, currentDay)
  // Karar 18: Her aksiyon (eğitim dahil) günde 1 kez
  if (career.actionsUsedToday.includes(actionId)) {
    return { money: 0, xp: 0, stressDelta: 0, levelUp: false }
  }

  const job = careerJobDef(career.jobId)
  const basePay = job ? Math.floor(dailyCareerWage(career) * ACTION_WAGE_MULT[actionId]) : 0
  const bonus = basePay > 0 ? rollCareerBonus(career) : 0
  const money = basePay + bonus

  const xpGain = ACTION_XP[actionId]
  career.xp += xpGain
  career.totalWageEarned += money
  career.wageEarnedToday += money
  career.stress = Math.max(0, Math.min(100, career.stress + ACTION_STRESS[actionId]))
  career.actionsUsedToday.push(actionId)

  let levelUp = false
  while (career.xp >= career.xpToNext && career.level < 10) {
    career.xp -= career.xpToNext
    career.level++
    career.xpToNext = careerXpToNextLevel(career.level)
    levelUp = true
  }

  return { money, xp: xpGain, stressDelta: ACTION_STRESS[actionId], levelUp }
}

/** Kariyer sayfasının adı oyun dönemine göre değişir */
export function careerPageLabel(isEntrepreneur: boolean, totalEarned: number): string {
  if (isEntrepreneur) {
    if (totalEarned >= 10_000_000) return 'Yönetim Kurulu'
    if (totalEarned >= 100_000) return 'Yönetim'
  }
  return 'Kariyer'
}

/** İlk hedef: 10.000₺ biriktir */
export const FIRST_GOAL_TARGET = 10_000

/** Kariyer günlük maaşını uygula (her oyun günü bir kere) */
export function applyDailyWage(career: CareerState, currentDay: number): number {
  if (career.isEntrepreneur) return 0
  if (career.lastWageDay >= currentDay) return 0
  const job = careerJobDef(career.jobId)
  if (!job) return 0
  career.lastWageDay = currentDay
  const wage = dailyCareerWage(career)
  if (wage <= 0) return 0
  career.dailyWagePaidToday = wage
  career.totalWageEarned += wage
  career.stress = Math.max(0, Math.min(100, career.stress + job.stressDelta))
  career.stress = Math.max(0, career.stress - 2)
  return wage
}

/** Stres pasif geliri düşürür */
export function careerStressPenalty(stress: number): number {
  if (stress < 40) return 0
  if (stress < 70) return 0.05
  if (stress < 90) return 0.12
  return 0.2
}
