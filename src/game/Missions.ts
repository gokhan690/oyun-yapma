export type MissionType = 'clicks' | 'buy_business' | 'buy_upgrade' | 'earn_money' | 'season_xp' | 'autobuy_enable' | 'use_underground' | 'claim_daily' | 'season_tier' | 'stock_trade' | 'reach_heat'

export type MissionTier = 'easy' | 'strategic' | 'risky'

export interface MissionDef {
  id: string
  type: MissionType
  label: string
  target: number
  tier: MissionTier
  rewardMoney?: number
  rewardBoostMinutes?: number
}

export interface MissionProgress {
  id: string
  type: MissionType
  label: string
  target: number
  tier: MissionTier
  progress: number
  claimed: boolean
  rewardMoney: number
  rewardBoostMinutes: number
}

const EASY_POOL: Omit<MissionDef, 'id'>[] = [
  // Karar 23: tıklama görevleri kaldırıldı — kazanç/işletme görevleri
  { type: 'earn_money', label: '₺ kazan', target: 800, tier: 'easy', rewardMoney: 100 },
  { type: 'earn_money', label: '₺ kazan', target: 1_500, tier: 'easy', rewardMoney: 120 },
  { type: 'claim_daily', label: 'günlük ödül topla', target: 1, tier: 'easy', rewardMoney: 200 },
  { type: 'buy_business', label: 'işletme satın al', target: 1, tier: 'easy', rewardMoney: 150 },
  { type: 'season_tier', label: 'sezon tier ödülü topla', target: 1, tier: 'easy', rewardMoney: 300 },
]

const STRATEGIC_POOL: Omit<MissionDef, 'id'>[] = [
  { type: 'buy_business', label: 'işletme satın al', target: 3, tier: 'strategic', rewardBoostMinutes: 4 },
  { type: 'buy_business', label: 'işletme satın al', target: 5, tier: 'strategic', rewardMoney: 350 },
  { type: 'buy_upgrade', label: 'yükseltme al', target: 1, tier: 'strategic', rewardMoney: 250 },
  { type: 'earn_money', label: '₺ kazan', target: 8_000, tier: 'strategic', rewardMoney: 700 },
  { type: 'season_xp', label: 'sezon XP kazan', target: 200, tier: 'strategic', rewardMoney: 500 },
  { type: 'autobuy_enable', label: 'işletmede auto-buy aç', target: 1, tier: 'strategic', rewardBoostMinutes: 5 },
  { type: 'stock_trade', label: 'borsa işlemi yap', target: 1, tier: 'strategic', rewardMoney: 400 },
]

const RISKY_POOL: Omit<MissionDef, 'id'>[] = [
  { type: 'use_underground', label: 'underground aksiyon kullan', target: 1, tier: 'risky', rewardMoney: 600 },
  { type: 'reach_heat', label: '% heat seviyesine ulaş', target: 20, tier: 'risky', rewardMoney: 500 },
  { type: 'stock_trade', label: 'borsa işlemi yap', target: 3, tier: 'risky', rewardMoney: 800 },
  { type: 'use_underground', label: 'underground aksiyon kullan', target: 2, tier: 'risky', rewardBoostMinutes: 8 },
]

export function generateDailyMissions(seed: string): MissionProgress[] {
  const rng = seededRandom(seed)
  const missions: MissionProgress[] = []

  const pickFrom = (pool: Omit<MissionDef, 'id'>[], prefix: string): MissionProgress => {
    const idx = Math.floor(rng() * pool.length)
    const def = pool[idx]!
    return {
      id: `${prefix}_${idx}_${seed}`,
      type: def.type,
      label: `${def.target} ${def.label}`,
      target: def.target,
      tier: def.tier,
      progress: 0,
      claimed: false,
      rewardMoney: def.rewardMoney ?? 0,
      rewardBoostMinutes: def.rewardBoostMinutes ?? 0,
    }
  }

  missions.push(pickFrom(EASY_POOL, 'e'))
  missions.push(pickFrom(STRATEGIC_POOL, 's'))
  missions.push(pickFrom(RISKY_POOL, 'r'))
  return missions
}

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
