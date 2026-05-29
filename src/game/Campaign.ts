import type { GameState } from './GameState'
import { formatMoney } from './Economy'
import { currentTier } from './SeasonPass'

export interface CampaignStep {
  id: string
  title: string
  description: string
  type: 'clicks' | 'earn_run' | 'buy_business' | 'buy_upgrade' | 'total_earned' | 'ipo' | 'daily_claim' | 'season_tier' | 'reach_reputation' | 'unlock_city'
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
  // Chapter 5 — Borsa Oyunu
  {
    id: 5,
    title: 'Bölüm 5 — Borsa Oyunu',
    subtitle: 'Piyasaları öğren, riski yönet.',
    unlockAtTotalEarned: 2_000_000,
    steps: [
      { id: 'c5s1', title: 'Piyasaya Giriş', description: '500.000₺ toplam kazanç', type: 'total_earned', target: 500_000, rewardMoney: 15_000, rewardBoostMinutes: 0 },
      { id: 'c5s2', title: 'Borsa Yatırımcısı', description: 'Sezon tier 3\'e ulaş', type: 'season_tier', target: 3, rewardMoney: 20_000, rewardBoostMinutes: 5 },
      { id: 'c5s3', title: 'Büyüme Hızlanıyor', description: '20 işletme satın al', type: 'buy_business', target: 20, rewardMoney: 25_000, rewardBoostMinutes: 10 },
      { id: 'c5s4', title: 'Piyasa Lideri', description: '1.000.000₺ toplam kazanç', type: 'total_earned', target: 1_000_000, rewardMoney: 50_000, rewardBoostMinutes: 15 },
    ],
  },
  // Chapter 6 — Karanlık Teklif
  {
    id: 6,
    title: 'Bölüm 6 — Karanlık Teklif',
    subtitle: 'Risk ve ödül arasında karar ver.',
    unlockAtTotalEarned: 1_000_000,
    steps: [
      { id: 'c6s1', title: 'Büyük Oyuncu', description: '1M₺ toplam kazanç', type: 'total_earned', target: 1_000_000, rewardMoney: 40_000, rewardBoostMinutes: 0 },
      { id: 'c6s2', title: 'Güçlü Ağ', description: '30 işletme satın al', type: 'buy_business', target: 30, rewardMoney: 60_000, rewardBoostMinutes: 15 },
      { id: 'c6s3', title: 'Deneyimli Baron', description: '10 upgrade al', type: 'buy_upgrade', target: 10, rewardMoney: 80_000, rewardBoostMinutes: 20 },
      { id: 'c6s4', title: 'Şehrin Efendisi', description: 'İtibar 30\'a ulaş', type: 'reach_reputation', target: 30, rewardMoney: 100_000, rewardBoostMinutes: 0 },
    ],
  },
  // Chapter 7 — İlk IPO
  {
    id: 7,
    title: 'Bölüm 7 — İlk IPO',
    subtitle: 'Şirketini halka arz et, tarihe geç.',
    unlockAtTotalEarned: 5_000_000,
    steps: [
      { id: 'c7s1', title: 'Halka Açılmaya Hazır', description: '5M₺ toplam kazanç', type: 'total_earned', target: 5_000_000, rewardMoney: 200_000, rewardBoostMinutes: 0 },
      { id: 'c7s2', title: 'İtibar Kazandın', description: 'İtibar 50\'ye ulaş', type: 'reach_reputation', target: 50, rewardMoney: 150_000, rewardBoostMinutes: 0 },
      { id: 'c7s3', title: 'Halka Arz', description: 'İlk IPO\'nu yap', type: 'ipo', target: 1, rewardMoney: 500_000, rewardBoostMinutes: 30 },
      { id: 'c7s4', title: 'Sezon Ustası', description: 'Sezon tier 5\'e ulaş', type: 'season_tier', target: 5, rewardMoney: 250_000, rewardBoostMinutes: 20 },
    ],
  },
  // Chapter 8 — Global Açılım
  {
    id: 8,
    title: 'Bölüm 8 — Global Açılım',
    subtitle: 'Sınırları aş, dünyaya aç.',
    unlockAtTotalEarned: 10_000_000,
    steps: [
      { id: 'c8s1', title: 'Yurt İçi Lider', description: '10M₺ toplam kazanç', type: 'total_earned', target: 10_000_000, rewardMoney: 500_000, rewardBoostMinutes: 0 },
      { id: 'c8s2', title: 'İkinci IPO', description: '2 IPO yap', type: 'ipo', target: 2, rewardMoney: 1_000_000, rewardBoostMinutes: 30 },
      { id: 'c8s3', title: 'Dubai\'de Alan', description: 'İtibar 60\'a ulaş', type: 'reach_reputation', target: 60, rewardMoney: 750_000, rewardBoostMinutes: 0 },
      { id: 'c8s4', title: 'Global İmparatorluk', description: '50M₺ toplam kazanç', type: 'total_earned', target: 50_000_000, rewardMoney: 2_000_000, rewardBoostMinutes: 60 },
    ],
  },
  // Chapter 9 — Hanedan
  {
    id: 9,
    title: 'Bölüm 9 — Hanedan',
    subtitle: 'Mirası koru, nesilleri büyüt.',
    unlockAtTotalEarned: 100_000_000,
    steps: [
      { id: 'c9s1', title: 'İmparator', description: '100M₺ toplam kazanç', type: 'total_earned', target: 100_000_000, rewardMoney: 5_000_000, rewardBoostMinutes: 0 },
      { id: 'c9s2', title: 'Aile Şirketi', description: '50 işletme satın al', type: 'buy_business', target: 50, rewardMoney: 3_000_000, rewardBoostMinutes: 0 },
      { id: 'c9s3', title: 'Üçüncü Nesil', description: '3 IPO yap', type: 'ipo', target: 3, rewardMoney: 5_000_000, rewardBoostMinutes: 60 },
      { id: 'c9s4', title: 'Hanedan Lideri', description: 'İtibar 70\'e ulaş', type: 'reach_reputation', target: 70, rewardMoney: 8_000_000, rewardBoostMinutes: 0 },
    ],
  },
  // Chapter 10 — Final Zafer Yolu
  {
    id: 10,
    title: 'Bölüm 10 — Final Zafer Yolu',
    subtitle: 'İmparatorluğunu tarihe geçir.',
    unlockAtTotalEarned: 500_000_000,
    steps: [
      { id: 'c10s1', title: 'Yarı Trilyon', description: '500M₺ toplam kazanç', type: 'total_earned', target: 500_000_000, rewardMoney: 20_000_000, rewardBoostMinutes: 0 },
      { id: 'c10s2', title: 'Dördüncü Nesil', description: '4 IPO yap', type: 'ipo', target: 4, rewardMoney: 15_000_000, rewardBoostMinutes: 0 },
      { id: 'c10s3', title: 'Efsanevi İtibar', description: 'İtibar 80\'e ulaş', type: 'reach_reputation', target: 80, rewardMoney: 20_000_000, rewardBoostMinutes: 0 },
      { id: 'c10s4', title: 'İş İmparatorluğu', description: '1 milyar₺ toplam kazanç', type: 'total_earned', target: 1_000_000_000, rewardMoney: 100_000_000, rewardBoostMinutes: 120 },
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
    case 'reach_reputation':
      return game.reputation ?? 0
    case 'unlock_city':
      return step.storyBeatId && (game.cities?.unlocked?.includes(step.storyBeatId as import('./ExpansionMap').CityId)) ? step.target : 0
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
  if (step.type === 'reach_reputation') {
    return `İtibar: ${step.target}`
  }
  if (step.type === 'unlock_city') {
    return `Şehir aç: ${step.storyBeatId ?? step.target}`
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
