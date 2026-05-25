import { PRODUCERS, type ProducerDef } from './Economy'

export type BusinessSector =
  | 'retail'
  | 'industry'
  | 'tech'
  | 'finance'
  | 'media'
  | 'politics'
  | 'illegal'
  | 'luxury'
  | 'science'
  | 'sport'

export type RivalRelation = 'neutral' | 'hostile' | 'allied' | 'merged'

export interface RivalFamilyState {
  id: string
  name: string
  emoji: string
  netWorth: number
  attitude: number
  relation: RivalRelation
  sectorFocus: BusinessSector[]
}

export interface RivalFamilyDef {
  id: string
  name: string
  emoji: string
  sectorFocus: BusinessSector[]
  startNetWorth: number
}

export const RIVAL_FAMILY_DEFS: RivalFamilyDef[] = [
  { id: 'kocak', name: 'Koçak Holding', emoji: '🏗️', sectorFocus: ['industry', 'finance'], startNetWorth: 80_000 },
  { id: 'sabanolu', name: 'Sabanoğlu Grubu', emoji: '⚡', sectorFocus: ['tech', 'industry'], startNetWorth: 120_000 },
  { id: 'demirhan', name: 'Demirhan Ailesi', emoji: '🏭', sectorFocus: ['illegal', 'industry'], startNetWorth: 60_000 },
  { id: 'yildiz', name: 'Yıldız Medya', emoji: '📺', sectorFocus: ['media', 'politics'], startNetWorth: 95_000 },
]

export function createRivalsState(): RivalFamilyState[] {
  return RIVAL_FAMILY_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    netWorth: d.startNetWorth,
    attitude: 0,
    relation: 'neutral' as RivalRelation,
    sectorFocus: [...d.sectorFocus],
  }))
}

export function producerSector(p: ProducerDef): BusinessSector {
  if (p.illegal || p.category === 'dark') return 'illegal'
  if (p.category === 'politics') return 'politics'
  if (p.category === 'sport') return 'sport'
  if (p.category === 'finance') return 'finance'
  if (p.category === 'luxury') return 'luxury'
  if (p.category === 'science') return 'science'
  if (p.id === 'medya' || p.id === 'streaming') return 'media'
  if (p.tier <= 2) return 'retail'
  if (p.tier <= 5) return 'industry'
  return 'tech'
}

export function playerSectorShare(
  producers: Record<string, number>,
  sector: BusinessSector,
): number {
  let player = 0
  let total = 0
  for (const p of PRODUCERS) {
    const sec = producerSector(p)
    if (sec !== sector) continue
    const owned = producers[p.id] ?? 0
    if (owned <= 0) continue
    player += owned * p.tier
    total += owned * p.tier
  }
  if (total <= 0) return 0
  return Math.min(1, player / (player + 12))
}

export function rivalSectorPressure(
  rival: RivalFamilyState,
  sector: BusinessSector,
): number {
  if (rival.relation === 'merged') return 0
  if (!rival.sectorFocus.includes(sector)) return 0.15
  return Math.min(0.85, 0.25 + rival.netWorth / 50_000_000)
}

export type ConflictLevel = 'none' | 'rivalry' | 'war'

export function sectorConflict(
  playerShare: number,
  rivalPressure: number,
): ConflictLevel {
  if (rivalPressure < 0.2) return 'none'
  if (playerShare > 0.55 && rivalPressure > 0.35) return 'war'
  if (playerShare > 0.35 && rivalPressure > 0.25) return 'rivalry'
  return 'none'
}

export interface RivalTickResult {
  rivalId: string
  headline: string
  attitudeDelta: number
}

export function tickRivals(
  rivals: RivalFamilyState[],
  playerNetWorth: number,
  producers: Record<string, number>,
): RivalTickResult[] {
  const events: RivalTickResult[] = []
  for (const rival of rivals) {
    if (rival.relation === 'merged') continue
    const growth = 1.002 + Math.random() * 0.008
    rival.netWorth = Math.floor(rival.netWorth * growth + playerNetWorth * 0.00002)

    for (const sector of rival.sectorFocus) {
      const share = playerSectorShare(producers, sector)
      const pressure = rivalSectorPressure(rival, sector)
      const conflict = sectorConflict(share, pressure)
      if (conflict === 'war' && Math.random() < 0.15) {
        rival.attitude = Math.max(-100, rival.attitude - 8)
        events.push({
          rivalId: rival.id,
          headline: `${rival.name} ${sector} sektöründe seninle savaş ilan etti!`,
          attitudeDelta: -8,
        })
      } else if (conflict === 'rivalry' && Math.random() < 0.08) {
        rival.attitude = Math.max(-100, rival.attitude - 4)
        events.push({
          rivalId: rival.id,
          headline: `${rival.name} pazar payını kısmaya çalışıyor.`,
          attitudeDelta: -4,
        })
      }
    }
    if (playerNetWorth > rival.netWorth * 3 && rival.attitude > -50 && Math.random() < 0.05) {
      rival.attitude = Math.max(-100, rival.attitude - 6)
      events.push({
        rivalId: rival.id,
        headline: `${rival.name} seni tehdit olarak görüyor.`,
        attitudeDelta: -6,
      })
    }
  }
  return events
}

export function rivalById(rivals: RivalFamilyState[], id: string): RivalFamilyState | undefined {
  return rivals.find((r) => r.id === id)
}

export function lobbyAgainstRival(rival: RivalFamilyState, cost: number): boolean {
  if (rival.relation === 'merged') return false
  rival.attitude = Math.max(-100, rival.attitude - 12)
  rival.netWorth = Math.floor(rival.netWorth * 0.92)
  void cost
  return true
}

export function cooperateWithRival(rival: RivalFamilyState): void {
  if (rival.relation === 'merged') return
  rival.attitude = Math.min(100, rival.attitude + 15)
  if (rival.attitude > 40) rival.relation = 'allied'
}

export function mergeRival(rival: RivalFamilyState): boolean {
  if (rival.relation === 'merged') return false
  rival.relation = 'merged'
  rival.attitude = 100
  return true
}

export function mergeRivalCost(rival: RivalFamilyState): number {
  return Math.floor(rival.netWorth * 2.5)
}

export function attitudeLabel(attitude: number): string {
  if (attitude >= 60) return 'Müttefik'
  if (attitude >= 20) return 'Dostane'
  if (attitude >= -20) return 'Nötr'
  if (attitude >= -50) return 'Düşmanca'
  return 'Savaş'
}
