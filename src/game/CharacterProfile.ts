import type { GameState } from './GameState'

export type JobId = 'calisan' | 'serbest' | 'girisimci' | 'sanatci' | 'akademisyen' | 'sporcu'
export type EducationLevel = 'ilkokul' | 'lise' | 'universite' | 'yukseklisans' | 'doktora'
export type LifestyleType = 'mutevazi' | 'orta' | 'luks'

export interface CharacterProfile {
  jobId: JobId
  educationLevel: EducationLevel
  lifestyleType: LifestyleType
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

export function applyProfileToState(profile: CharacterProfile, state: GameState): void {
  const job  = JOB_DEFS[profile.jobId]
  const edu  = EDUCATION_DEFS[profile.educationLevel]
  const life = LIFESTYLE_DEFS[profile.lifestyleType]

  state.money = Math.round(state.money * edu.moneyMult * job.startingMoneyMult)
  state.characterIncomeDailyBonus = job.incomeDailyBonus

  // Health/stress başlangıcı lifestyle'a göre
  state.health.health = life.startHealth
  state.lifestyle.stress = life.startStress
}
