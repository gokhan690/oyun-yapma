import type { GameState } from './GameState'
import { formatMoney } from './Economy'
import { currentTier } from './SeasonPass'

export interface CampaignStep {
  id: string
  title: string
  description: string
  type: 'clicks' | 'earn_run' | 'buy_business' | 'buy_upgrade' | 'total_earned' | 'ipo' | 'daily_claim' | 'season_tier'
  target: number
  rewardMoney: number
  rewardBoostMinutes: number
  storyBeatId?: string
}

export interface CampaignChapter {
  id: number
  title: string
  subtitle: string
  unlockAtTotalEarned: number
  steps: CampaignStep[]
}

export interface CampaignState {
  chapterId: number
  stepIndex: number
  stepProgress: number
  completedChapters: number[]
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 1,
    title: 'Bölüm 1 — İlk Adım',
    subtitle: 'Limonata tezgahından dijital dünyaya',
    unlockAtTotalEarned: 0,
    steps: [
      { id: 'c1_s1', title: '50 tıklama', description: 'İlk müşterilerini kazan.', type: 'clicks', target: 50, rewardMoney: 200, rewardBoostMinutes: 2, storyBeatId: 'chapter_1_start' },
      { id: 'c1_s2', title: '3 işletme', description: 'Portföyünü genişlet.', type: 'buy_business', target: 3, rewardMoney: 450, rewardBoostMinutes: 0 },
      { id: 'c1_s3', title: '5.000₺ kazan', description: 'Bu run\'da kazanç hedefi.', type: 'earn_run', target: 5_000, rewardMoney: 800, rewardBoostMinutes: 5, storyBeatId: 'chapter_1_done' },
    ],
  },
  {
    id: 2,
    title: 'Bölüm 2 — Büyüme',
    subtitle: 'Zincirleme genişleme ve yükseltmeler',
    unlockAtTotalEarned: 5_000,
    steps: [
      { id: 'c2_s1', title: '1 yükseltme', description: 'Verimliliğini artır.', type: 'buy_upgrade', target: 1, rewardMoney: 600, rewardBoostMinutes: 0 },
      { id: 'c2_s2', title: '50.000₺ toplam', description: 'Yaşam boyu kazanç eşiği.', type: 'total_earned', target: 50_000, rewardMoney: 2_500, rewardBoostMinutes: 8, storyBeatId: 'chapter_2_mid' },
      { id: 'c2_s3', title: 'Günlük ödül', description: 'Sadık baron rutini.', type: 'daily_claim', target: 1, rewardMoney: 400, rewardBoostMinutes: 3, storyBeatId: 'chapter_2_done' },
    ],
  },
  {
    id: 3,
    title: 'Bölüm 3 — Pazar Lideri',
    subtitle: 'Sezon ve borsa yolunda',
    unlockAtTotalEarned: 100_000,
    steps: [
      { id: 'c3_s1', title: '10 işletme', description: 'Çeşitlendirilmiş portföy.', type: 'buy_business', target: 10, rewardMoney: 5_000, rewardBoostMinutes: 0 },
      { id: 'c3_s2', title: 'Sezon tier 5', description: 'İmparatorluk Yolu\'nda ilerle.', type: 'season_tier', target: 5, rewardMoney: 3_000, rewardBoostMinutes: 10, storyBeatId: 'chapter_3_mid' },
      { id: 'c3_s3', title: '500.000₺ toplam', description: 'IPO\'ya yaklaş.', type: 'total_earned', target: 500_000, rewardMoney: 12_000, rewardBoostMinutes: 15, storyBeatId: 'chapter_3_done' },
    ],
  },
  {
    id: 4,
    title: 'Bölüm 4 — İmparatorluk',
    subtitle: 'Halka arz ve miras',
    unlockAtTotalEarned: 1_000_000,
    steps: [
      { id: 'c4_s1', title: '200 tıklama', description: 'Son sprint.', type: 'clicks', target: 200, rewardMoney: 8_000, rewardBoostMinutes: 0 },
      { id: 'c4_s2', title: '1 IPO', description: 'Borsaya çık.', type: 'ipo', target: 1, rewardMoney: 25_000, rewardBoostMinutes: 20, storyBeatId: 'chapter_4_ipo' },
      { id: 'c4_s3', title: '5M₺ toplam', description: 'Efsane statüsü.', type: 'total_earned', target: 5_000_000, rewardMoney: 50_000, rewardBoostMinutes: 30, storyBeatId: 'chapter_4_done' },
    ],
  },
]

export function createCampaignState(): CampaignState {
  return { chapterId: 1, stepIndex: 0, stepProgress: 0, completedChapters: [] }
}

export function chapterById(id: number): CampaignChapter | undefined {
  return CAMPAIGN_CHAPTERS.find((c) => c.id === id)
}

export function currentCampaignStep(state: CampaignState): CampaignStep | null {
  const chapter = chapterById(state.chapterId)
  if (!chapter) return null
  return chapter.steps[state.stepIndex] ?? null
}

export function isChapterUnlocked(chapter: CampaignChapter, lifetimeEarned: number, completedChapters: number[]): boolean {
  if (chapter.id === 1) return true
  if (completedChapters.includes(chapter.id - 1)) return true
  return lifetimeEarned >= chapter.unlockAtTotalEarned
}

export function campaignStepSnapshot(game: GameState, step: CampaignStep): number {
  switch (step.type) {
    case 'clicks':
      return game.totalClicks
    case 'earn_run':
      return game.totalEarned
    case 'buy_business':
      return Object.values(game.producers).reduce((a, b) => a + b, 0)
    case 'buy_upgrade':
      return game.purchasedUpgrades.size
    case 'total_earned':
      return game.lifetimeTotalEarned
    case 'ipo':
      return game.ipoCount
    case 'daily_claim':
      return game.dailyLastClaim === new Date().toISOString().slice(0, 10) ? 1 : 0
    case 'season_tier':
      return currentTier(game.season.xp)
    default:
      return 0
  }
}

export function campaignProgressPct(game: GameState, state: CampaignState): number {
  const step = currentCampaignStep(state)
  if (!step) return 100
  const cur = Math.max(state.stepProgress, campaignStepSnapshot(game, step))
  return Math.min(100, (cur / step.target) * 100)
}

export function campaignStepLabel(step: CampaignStep): string {
  if (step.type === 'earn_run' || step.type === 'total_earned') {
    return `${formatMoney(step.target)} hedef`
  }
  return `${step.target} ${step.title.toLowerCase()}`
}

export function hasClaimableCampaignStep(game: GameState, state: CampaignState): boolean {
  const step = currentCampaignStep(state)
  if (!step) return false
  const chapter = chapterById(state.chapterId)
  if (!chapter || !isChapterUnlocked(chapter, game.lifetimeTotalEarned, state.completedChapters)) return false
  const cur = Math.max(state.stepProgress, campaignStepSnapshot(game, step))
  return cur >= step.target
}

export function hasActiveCampaign(_game: GameState, state: CampaignState): boolean {
  return currentCampaignStep(state) !== null && state.chapterId <= CAMPAIGN_CHAPTERS.length
}
