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
    unlockHint: 'Başlangıç işi',
    careerPath: 'teknoloji',
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
    unlockHint: 'Başlangıç işi',
    careerPath: 'finans',
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
    unlockHint: 'Başlangıç işi',
    careerPath: 'siyaset',
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

/** RefApp C4-lite: bağlanan günlük aksiyonlar. */
export const BINDABLE_CAREER_ACTION_IDS: CareerActionId[] = [
  'mesai',
  'ek_mesai',
  'egitim_al',
  'networking',
]

export function applyCareerAction(
  career: CareerState,
  actionId: CareerActionId,
  currentDay: number,
): { money: number; xp: number; stressDelta: number; levelUp: boolean } {
  if (career.isEntrepreneur) return { money: 0, xp: 0, stressDelta: 0, levelUp: false }
  // Önce gün sıfırlaması, sonra kontrol (sıralama düzeltmesi)
  if (career.lastActionDay !== currentDay) {
    career.actionsUsedToday = []
    career.lastActionDay = currentDay
    // Otomatik maaş tick'i kaldırıldı; "bugünkü mesai geliri" sayacı burada sıfırlanır.
    career.wageEarnedToday = 0
  }
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
