import type { GameState } from './GameState'
import { backgroundDef, type CharacterBackgroundId } from './Career'
import { startingMoneyForBackground } from './CharacterCreation'
import { REPUTATION_START } from './Reputation'
import { tRaw } from '../i18n'

export type JobId = 'calisan' | 'serbest' | 'girisimci' | 'sanatci' | 'akademisyen' | 'sporcu'
export type EducationLevel = 'ilkokul' | 'lise' | 'universite' | 'yukseklisans' | 'doktora'
export type LifestyleType = 'mutevazi' | 'orta' | 'luks'

export interface CharacterProfile {
  // Integration (lifestyle/career-tipi) alanları
  jobId: JobId
  educationLevel: EducationLevel
  lifestyleType: LifestyleType
  // Master'dan birleştirilen kimlik alanları (kayıpsızlık kararı)
  name: string
  gender: 'male' | 'female'
  backgroundId: CharacterBackgroundId
  difficulty: 'easy' | 'normal' | 'hard'
}

/** Eski/eksik profillerde kullanılacak güvenli varsayılanlar (migration + savunma). */
export const DEFAULT_PROFILE_IDENTITY = {
  name: 'Baron',
  gender: 'male' as const,
  backgroundId: 'sifirdan_gelen' as CharacterBackgroundId,
  difficulty: 'normal' as const,
}

export const JOB_DEFS: Record<JobId, { label: string; emoji: string; startingMoneyMult: number; incomeDailyBonus: number; desc: string }> = {
  calisan:     { label: 'Çalışan',      emoji: '👔', startingMoneyMult: 1.0, incomeDailyBonus: 50,    desc: 'Düzenli maaş, güvenli başlangıç' },
  serbest:     { label: 'Serbest',      emoji: '💼', startingMoneyMult: 1.2, incomeDailyBonus: 120,   desc: 'Esnek çalışma, değişken gelir' },
  girisimci:   { label: 'Girişimci',    emoji: '🚀', startingMoneyMult: 1.5, incomeDailyBonus: 0,     desc: 'Yüksek risk, yüksek ödül' },
  sanatci:     { label: 'Sanatçı',      emoji: '🎨', startingMoneyMult: 0.8, incomeDailyBonus: 200,   desc: 'Fame bonusu, düşük başlangıç' },
  akademisyen: { label: 'Akademisyen',  emoji: '🎓', startingMoneyMult: 1.1, incomeDailyBonus: 80,    desc: 'Araştırma bonusu, sabit gelir' },
  sporcu:      { label: 'Sporcu',       emoji: '⚽', startingMoneyMult: 2.0, incomeDailyBonus: 300,   desc: 'Şöhret ve sponsor geliri' },
}

export const EDUCATION_DEFS: Record<EducationLevel, { label: string; emoji: string; moneyMult: number; researchBonus: number; desc: string }> = {
  ilkokul:      { label: 'İlkokul',       emoji: '📚', moneyMult: 0.5,  researchBonus: 0,    desc: '₺ az ama işe girişebilirsin' },
  lise:         { label: 'Lise',          emoji: '🏫', moneyMult: 1.0,  researchBonus: 0,    desc: 'Standart başlangıç' },
  universite:   { label: 'Üniversite',    emoji: '🎓', moneyMult: 1.5,  researchBonus: 1,    desc: 'İyi başlangıç, araştırma bonusu' },
  yukseklisans: { label: 'Yüksek Lisans', emoji: '📖', moneyMult: 2.0,  researchBonus: 2,    desc: 'Güçlü ağ, araştırma avantajı' },
  doktora:      { label: 'Doktora',       emoji: '🔬', moneyMult: 3.0,  researchBonus: 3,    desc: 'Maksimum araştırma ve başlangıç' },
}

export const LIFESTYLE_DEFS: Record<LifestyleType, { label: string; emoji: string; monthlyExpenseMult: number; startHealth: number; startStress: number; desc: string }> = {
  mutevazi: { label: 'Mütevazı', emoji: '🌿', monthlyExpenseMult: 0.5, startHealth: 95, startStress: 10, desc: 'Az harcama, sağlıklı başlangıç' },
  orta:     { label: 'Orta',     emoji: '🏠', monthlyExpenseMult: 1.0, startHealth: 85, startStress: 25, desc: 'Dengeli yaşam tarzı' },
  luks:     { label: 'Lüks',     emoji: '💎', monthlyExpenseMult: 2.5, startHealth: 75, startStress: 45, desc: 'Yüksek harcama, yüksek statü' },
}

/**
 * Karakteri state'e uygulayan TEK nokta. Master'ın applyCharacterCreation
 * davranışı (kimlik + background bazlı başlangıç parası + itibar) ile
 * integration'ın profil davranışı (eğitim/iş/yaşam çarpanları) burada birleşir.
 * Her faktör YALNIZ BİR KEZ uygulanır; main.ts bunu onboarding sonrası bir kez çağırır.
 */
export function applyProfileToState(profile: CharacterProfile, state: GameState): void {
  const job  = JOB_DEFS[profile.jobId]
  const edu  = EDUCATION_DEFS[profile.educationLevel]
  const life = LIFESTYLE_DEFS[profile.lifestyleType]

  // ── Kimlik (master) ──
  const identity = { ...DEFAULT_PROFILE_IDENTITY, ...profile }
  state.playerName = identity.name || DEFAULT_PROFILE_IDENTITY.name
  state.playerGender = identity.gender
  state.difficulty = identity.difficulty
  state.difficultyChosen = true
  state.characterBackground = identity.backgroundId
  state.career.backgroundId = identity.backgroundId

  // ── Başlangıç parası: background+difficulty TABANI (difficulty yalnız burada) ──
  // sonra eğitim/iş çarpanı (her biri bir kez). integration ekonomisi difficulty'yi
  // başlangıç parasına ayrıca uygulamaz → çift uygulama yok.
  const base = startingMoneyForBackground(identity.backgroundId, identity.difficulty)
  state.money = Math.round(base * edu.moneyMult * job.startingMoneyMult)
  state.totalEarned = state.money

  // ── Background itibar bonusu (master) ──
  // Idempotent: taban REPUTATION_START üzerinden mutlak set (state.reputation +=
  // değil) — applyProfileToState ikinci kez çağrılırsa bonus üst üste binmez.
  const bg = backgroundDef(identity.backgroundId)
  state.reputation = Math.min(100, REPUTATION_START + (bg?.startingReputationBonus ?? 0))

  // ── Profil (integration) ──
  state.characterIncomeDailyBonus = job.incomeDailyBonus
  state.health.health = life.startHealth
  state.lifestyle.stress = life.startStress

  // Kimlik kuruldu. tutorial/pause/tick akışı main.ts'e bırakılır (integration
  // startTutorial + master isTicking guard) — burada tutorialDone'a dokunma.
  state.onboardingComplete = true
}

export function profileJobLabel(id: JobId): string {
  return tRaw(`profile_job_${id}_label`) ?? JOB_DEFS[id].label
}
export function profileJobDesc(id: JobId): string {
  return tRaw(`profile_job_${id}_desc`) ?? JOB_DEFS[id].desc
}
export function educationLabel(id: EducationLevel): string {
  return tRaw(`profile_edu_${id}_label`) ?? EDUCATION_DEFS[id].label
}
export function educationDesc(id: EducationLevel): string {
  return tRaw(`profile_edu_${id}_desc`) ?? EDUCATION_DEFS[id].desc
}
export function lifestyleLabel(id: LifestyleType): string {
  return tRaw(`profile_life_${id}_label`) ?? LIFESTYLE_DEFS[id].label
}
export function lifestyleDesc(id: LifestyleType): string {
  return tRaw(`profile_life_${id}_desc`) ?? LIFESTYLE_DEFS[id].desc
}
