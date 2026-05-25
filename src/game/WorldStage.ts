export type WorldStageId = 'local' | 'national' | 'forbes' | 'endgame'

export interface WorldStageDef {
  id: WorldStageId
  name: string
  emoji: string
  minNetWorth: number
  headline: string
  threat: string
  unlockHint: string
}

export const WORLD_STAGES: WorldStageDef[] = [
  {
    id: 'local',
    name: 'Yerel',
    emoji: '🏘️',
    minNetWorth: 0,
    headline: 'Kimse seni tanımıyor — mahalle haberleri',
    threat: 'Vergi denetimi',
    unlockHint: 'İlk işletmeler ve yerel siyaset',
  },
  {
    id: 'national',
    name: 'Ulusal',
    emoji: '📰',
    minNetWorth: 5_000_000,
    headline: 'Ulusal basında çıkıyorsun',
    threat: 'Rakip aileler & medya',
    unlockHint: 'Borsa, imparatorluk sekmeleri güçlenir',
  },
  {
    id: 'forbes',
    name: 'Forbes',
    emoji: '🏆',
    minNetWorth: 100_000_000,
    headline: 'Forbes listesine girdin',
    threat: 'Regülasyon & rekabet kurulu',
    unlockHint: 'Merger, lobi, hanedan mirası',
  },
  {
    id: 'endgame',
    name: 'Küresel',
    emoji: '🌍',
    minNetWorth: 10_000_000_000,
    headline: 'Hükümetler senden borç istiyor',
    threat: 'Uluslararası denetim',
    unlockHint: 'Ekonomik zafer kapısı',
  },
]

export function currentWorldStage(netWorth: number): WorldStageDef {
  let stage = WORLD_STAGES[0]!
  for (const s of WORLD_STAGES) {
    if (netWorth >= s.minNetWorth) stage = s
  }
  return stage
}

export function nextWorldStage(netWorth: number): WorldStageDef | null {
  const cur = currentWorldStage(netWorth)
  const idx = WORLD_STAGES.findIndex((s) => s.id === cur.id)
  return WORLD_STAGES[idx + 1] ?? null
}

export function worldStageProgress(netWorth: number): number {
  const cur = currentWorldStage(netWorth)
  const next = nextWorldStage(netWorth)
  if (!next) return 100
  const span = next.minNetWorth - cur.minNetWorth
  if (span <= 0) return 100
  return Math.min(100, ((netWorth - cur.minNetWorth) / span) * 100)
}

export function stageThreatLevel(stageId: WorldStageId): 'low' | 'mid' | 'high' | 'extreme' {
  switch (stageId) {
    case 'local': return 'low'
    case 'national': return 'mid'
    case 'forbes': return 'high'
    default: return 'extreme'
  }
}
