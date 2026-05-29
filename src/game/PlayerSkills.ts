export type PlayerSkillId =
  | 'businessman'
  | 'entrepreneur_spirit'
  | 'veteran_baron'
  | 'life_experience'
  | 'master_clicker'
  | 'wealth_magnet'

export interface PlayerSkillDef {
  id: PlayerSkillId
  name: string
  emoji: string
  description: string
  /** İlerleme istatistiği — hangi sayaç takip edilir */
  metric: 'businessesOwned' | 'totalClicks' | 'ipoCount' | 'lifeEventsResolved' | 'totalEarned'
  /** Beceriyi kazanmak için gereken eşik */
  threshold: number
}

export interface PlayerSkillsState {
  unlocked: PlayerSkillId[]
  lifeEventsResolved: number
}

export const PLAYER_SKILLS: PlayerSkillDef[] = [
  {
    id: 'businessman',
    name: 'İşletmeci',
    emoji: '🏢',
    description: '50 işletme sahibi oldun. Tüm işletme maliyetleri −%5.',
    metric: 'businessesOwned',
    threshold: 50,
  },
  {
    id: 'entrepreneur_spirit',
    name: 'Girişimci Ruhu',
    emoji: '👆',
    description: '500 tıklama yaptın. Tıklama geliri +%10.',
    metric: 'totalClicks',
    threshold: 500,
  },
  {
    id: 'master_clicker',
    name: 'Tıklama Ustası',
    emoji: '⚡',
    description: '5000 tıklama yaptın. Tıklama geliri +%20.',
    metric: 'totalClicks',
    threshold: 5000,
  },
  {
    id: 'veteran_baron',
    name: 'Deneyimli Baron',
    emoji: '👑',
    description: '3 kez IPO yaptın. Prestij çarpanı +%20.',
    metric: 'ipoCount',
    threshold: 3,
  },
  {
    id: 'life_experience',
    name: 'Hayat Tecrübesi',
    emoji: '🧠',
    description: '10 hayat olayı atlattın. Olaylardan gelen stres −%30.',
    metric: 'lifeEventsResolved',
    threshold: 10,
  },
  {
    id: 'wealth_magnet',
    name: 'Servet Mıknatısı',
    emoji: '💰',
    description: '₺1B toplam kazandın. Pasif gelir +%10.',
    metric: 'totalEarned',
    threshold: 1_000_000_000,
  },
]

export function createPlayerSkillsState(): PlayerSkillsState {
  return { unlocked: [], lifeEventsResolved: 0 }
}

export function skillDef(id: PlayerSkillId): PlayerSkillDef | undefined {
  return PLAYER_SKILLS.find((s) => s.id === id)
}

export function hasSkill(state: PlayerSkillsState, id: PlayerSkillId): boolean {
  return state.unlocked.includes(id)
}

export interface SkillMetrics {
  businessesOwned: number
  totalClicks: number
  ipoCount: number
  lifeEventsResolved: number
  totalEarned: number
}

/** Mevcut metriklere göre yeni kazanılan becerileri döndür (state'e eklenmemiş olanlar) */
export function newlyUnlockedSkills(
  state: PlayerSkillsState,
  metrics: SkillMetrics,
): PlayerSkillDef[] {
  const result: PlayerSkillDef[] = []
  for (const def of PLAYER_SKILLS) {
    if (state.unlocked.includes(def.id)) continue
    if (metrics[def.metric] >= def.threshold) {
      result.push(def)
    }
  }
  return result
}

export function skillCostMult(state: PlayerSkillsState): number {
  return hasSkill(state, 'businessman') ? 0.95 : 1
}

export function skillClickMult(state: PlayerSkillsState): number {
  let mult = 1
  if (hasSkill(state, 'entrepreneur_spirit')) mult *= 1.1
  if (hasSkill(state, 'master_clicker')) mult *= 1.2
  return mult
}

export function skillPrestigeMult(state: PlayerSkillsState): number {
  return hasSkill(state, 'veteran_baron') ? 1.2 : 1
}

export function skillPassiveMult(state: PlayerSkillsState): number {
  return hasSkill(state, 'wealth_magnet') ? 1.1 : 1
}

export function skillEventStressMult(state: PlayerSkillsState): number {
  return hasSkill(state, 'life_experience') ? 0.7 : 1
}
