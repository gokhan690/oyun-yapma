export type MissionType = 'clicks' | 'buy_business' | 'buy_upgrade' | 'earn_money' | 'season_xp' | 'autobuy_enable'

export interface MissionDef {
  id: string
  type: MissionType
  label: string
  target: number
  rewardMoney?: number
  rewardBoostMinutes?: number
}

export interface MissionProgress {
  id: string
  type: MissionType
  label: string
  target: number
  progress: number
  claimed: boolean
  rewardMoney: number
  rewardBoostMinutes: number
}

const POOL: Omit<MissionDef, 'id'>[] = [
  { type: 'clicks', label: 'kez tıkla', target: 50, rewardMoney: 500 },
  { type: 'clicks', label: 'kez tıkla', target: 100, rewardMoney: 1500 },
  { type: 'buy_business', label: 'işletme satın al', target: 3, rewardBoostMinutes: 5 },
  { type: 'buy_business', label: 'işletme satın al', target: 5, rewardMoney: 2000 },
  { type: 'buy_upgrade', label: 'yükseltme al', target: 1, rewardMoney: 1000 },
  { type: 'earn_money', label: '₺ kazan', target: 5000, rewardMoney: 800 },
  { type: 'earn_money', label: '₺ kazan', target: 25000, rewardMoney: 5000 },
  { type: 'season_xp', label: 'sezon XP kazan', target: 200, rewardMoney: 3000 },
  { type: 'autobuy_enable', label: 'işletmede auto-buy aç', target: 1, rewardBoostMinutes: 3 },
]

export function generateDailyMissions(seed: string): MissionProgress[] {
  const rng = seededRandom(seed)
  const picked: MissionProgress[] = []
  const used = new Set<number>()

  while (picked.length < 3 && used.size < POOL.length) {
    const idx = Math.floor(rng() * POOL.length)
    if (used.has(idx)) continue
    used.add(idx)
    const def = POOL[idx]!
    picked.push({
      id: `m_${idx}_${seed}`,
      type: def.type,
      label: `${def.target} ${def.label}`,
      target: def.target,
      progress: 0,
      claimed: false,
      rewardMoney: def.rewardMoney ?? 0,
      rewardBoostMinutes: def.rewardBoostMinutes ?? 0,
    })
  }
  return picked
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
