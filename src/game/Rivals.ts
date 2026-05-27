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

export type RivalPersonality = 'aggressive' | 'conservative' | 'shadow' | 'media'

export type RivalRelation = 'neutral' | 'hostile' | 'allied' | 'merged' | 'bankrupt'

export interface RivalFamilyState {
  id: string
  name: string
  emoji: string
  netWorth: number
  attitude: number
  relation: RivalRelation
  sectorFocus: BusinessSector[]
  personality: RivalPersonality
  copiedSector?: BusinessSector | null
}

export interface RivalFamilyDef {
  id: string
  name: string
  emoji: string
  sectorFocus: BusinessSector[]
  startNetWorth: number
  personality: RivalPersonality
  personalityLabel: string
}

export const RIVAL_FAMILY_DEFS: RivalFamilyDef[] = [
  {
    id: 'kocak',
    name: 'Koçak Holding',
    emoji: '🏗️',
    sectorFocus: ['industry', 'finance'],
    startNetWorth: 80_000,
    personality: 'aggressive',
    personalityLabel: 'Agresif — sektör kopyalar, fiyat savaşı açar',
  },
  {
    id: 'sabanolu',
    name: 'Sabanoğlu Grubu',
    emoji: '⚡',
    sectorFocus: ['tech', 'industry'],
    startNetWorth: 120_000,
    personality: 'conservative',
    personalityLabel: 'Muhafazakar — yavaş büyür, güvenli hamleler',
  },
  {
    id: 'demirhan',
    name: 'Demirhan Ailesi',
    emoji: '🏭',
    sectorFocus: ['illegal', 'industry'],
    startNetWorth: 60_000,
    personality: 'shadow',
    personalityLabel: 'Gölge — zayıf noktalarını avlar',
  },
  {
    id: 'yildiz',
    name: 'Yıldız Medya',
    emoji: '📺',
    sectorFocus: ['media', 'politics'],
    startNetWorth: 95_000,
    personality: 'media',
    personalityLabel: 'Medya gücü — itibar ve siyaset oynar',
  },
]

export interface RivalAllianceOffer {
  rivalId: string
  rivalName: string
  playerSector: BusinessSector
  rivalSector: BusinessSector
  message: string
  expiresAt: number
}

export function createRivalsState(): RivalFamilyState[] {
  return RIVAL_FAMILY_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    netWorth: d.startNetWorth,
    attitude: 0,
    relation: 'neutral' as RivalRelation,
    sectorFocus: [...d.sectorFocus],
    personality: d.personality,
    copiedSector: null,
  }))
}

export function rivalDef(id: string): RivalFamilyDef | undefined {
  return RIVAL_FAMILY_DEFS.find((d) => d.id === id)
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

export function dominantPlayerSector(producers: Record<string, number>): BusinessSector | null {
  const counts: Partial<Record<BusinessSector, number>> = {}
  for (const p of PRODUCERS) {
    const owned = producers[p.id] ?? 0
    if (owned <= 0) continue
    const sec = producerSector(p)
    counts[sec] = (counts[sec] ?? 0) + owned * p.tier
  }
  let best: BusinessSector | null = null
  let bestScore = 0
  for (const [sec, score] of Object.entries(counts)) {
    if ((score ?? 0) > bestScore) {
      bestScore = score ?? 0
      best = sec as BusinessSector
    }
  }
  return best
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
  if (rival.copiedSector === sector) return Math.min(0.9, 0.45 + rival.netWorth / 40_000_000)
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
  kind: 'conflict' | 'copy' | 'weakpoint' | 'threat' | 'alliance'
}

export function tickRivals(
  rivals: RivalFamilyState[],
  playerNetWorth: number,
  producers: Record<string, number>,
  playerReputation: number,
  playerName: string,
): { events: RivalTickResult[]; allianceOffer: RivalAllianceOffer | null } {
  const events: RivalTickResult[] = []
  let allianceOffer: RivalAllianceOffer | null = null
  const dominant = dominantPlayerSector(producers)
  const who = playerName.trim() || 'Baron'

  for (const rival of rivals) {
    if (rival.relation === 'merged') continue

    // Rival net worth decay when hostile attitude is very negative
    const growthBase = rival.personality === 'conservative' ? 1.001 : rival.personality === 'aggressive' ? 1.004 : 1.002
    const attitudeDecay = rival.attitude < -70 ? 0.995 : 1.0
    const growth = (growthBase + Math.random() * 0.008) * attitudeDecay
    rival.netWorth = Math.floor(rival.netWorth * growth + playerNetWorth * 0.00002)

    // Rival bankruptcy when net worth falls very low relative to player
    if (rival.relation !== 'bankrupt' && rival.netWorth < playerNetWorth * 0.05 && rival.netWorth < 100_000) {
      rival.relation = 'bankrupt'
      events.push({
        rivalId: rival.id,
        headline: `💀 ${rival.name} çöktü — varlıkları piyasaya sürüldü! Hızlı davran.`,
        attitudeDelta: 0,
        kind: 'conflict',
      })
    }

    if (rival.personality === 'aggressive' && dominant && !rival.sectorFocus.includes(dominant)) {
      if (playerSectorShare(producers, dominant) > 0.4 && Math.random() < 0.12) {
        rival.copiedSector = dominant
        if (!rival.sectorFocus.includes(dominant)) rival.sectorFocus.push(dominant)
        rival.attitude = Math.max(-100, rival.attitude - 6)
        events.push({
          rivalId: rival.id,
          headline: `${rival.name}, ${who}'un ${dominant} yatırımlarını kopyalamaya başladı`,
          attitudeDelta: -6,
          kind: 'copy',
        })
      }
    }

    if (rival.personality === 'shadow' && playerReputation < 35 && Math.random() < 0.1) {
      rival.attitude = Math.max(-100, rival.attitude - 10)
      events.push({
        rivalId: rival.id,
        headline: `${rival.name}, ${who}'un düşük itibarını fırsat bildi — siyasete giriyor`,
        attitudeDelta: -10,
        kind: 'weakpoint',
      })
    }

    if (rival.personality === 'media' && playerReputation < 50 && Math.random() < 0.08) {
      rival.attitude = Math.max(-100, rival.attitude - 5)
      events.push({
        rivalId: rival.id,
        headline: `${rival.name} medyada ${who}'a karşı kampanya başlattı`,
        attitudeDelta: -5,
        kind: 'weakpoint',
      })
    }

    for (const sector of rival.sectorFocus) {
      const share = playerSectorShare(producers, sector)
      const pressure = rivalSectorPressure(rival, sector)
      const conflict = sectorConflict(share, pressure)
      const warChance = rival.personality === 'aggressive' ? 0.2 : 0.15
      const rivalryChance = rival.personality === 'conservative' ? 0.05 : 0.08
      if (conflict === 'war' && Math.random() < warChance) {
        rival.attitude = Math.max(-100, rival.attitude - 8)
        events.push({
          rivalId: rival.id,
          headline: `${rival.name} ${sector} sektöründe ${who} ile savaş ilan etti!`,
          attitudeDelta: -8,
          kind: 'conflict',
        })
      } else if (conflict === 'rivalry' && Math.random() < rivalryChance) {
        rival.attitude = Math.max(-100, rival.attitude - 4)
        events.push({
          rivalId: rival.id,
          headline: `${rival.name}, ${who}'un pazar payını kısmaya çalışıyor`,
          attitudeDelta: -4,
          kind: 'conflict',
        })
      }
    }

    if (
      !allianceOffer
      && rival.attitude > -20
      && rival.attitude < 30
      && rival.relation === 'neutral'
      && Math.random() < 0.04
    ) {
      const playerSec = dominant ?? rival.sectorFocus[0]!
      const rivalSec = rival.sectorFocus.find((s) => s !== playerSec) ?? rival.sectorFocus[0]!
      allianceOffer = {
        rivalId: rival.id,
        rivalName: rival.name,
        playerSector: playerSec,
        rivalSector: rivalSec,
        message: `${rival.name}: "${playerSec} sana kalsın, ${rivalSec} bana — anlaşalım mı?"`,
        expiresAt: Date.now() + 120_000,
      }
      events.push({
        rivalId: rival.id,
        headline: `${rival.name}, ${who}'a sektör paylaşım teklifi gönderdi`,
        attitudeDelta: 0,
        kind: 'alliance',
      })
    }

    if (playerNetWorth > rival.netWorth * 3 && rival.attitude > -50 && Math.random() < 0.05) {
      rival.attitude = Math.max(-100, rival.attitude - 6)
      events.push({
        rivalId: rival.id,
        headline: `${rival.name} ${who}'u tehdit olarak görüyor`,
        attitudeDelta: -6,
        kind: 'threat',
      })
    }
  }
  return { events, allianceOffer }
}

export function rivalById(rivals: RivalFamilyState[], id: string): RivalFamilyState | undefined {
  return rivals.find((r) => r.id === id)
}

export function lobbyAgainstRival(rival: RivalFamilyState, cost: number, globalLobby = false): boolean {
  if (rival.relation === 'merged') return false
  const delta = globalLobby ? -16 : -12
  rival.attitude = Math.max(-100, rival.attitude + delta)
  rival.netWorth = Math.floor(rival.netWorth * (globalLobby ? 0.9 : 0.92))
  void cost
  return true
}

export function cooperateWithRival(rival: RivalFamilyState): void {
  if (rival.relation === 'merged') return
  rival.attitude = Math.min(100, rival.attitude + 15)
  if (rival.attitude > 40) rival.relation = 'allied'
}

export function acceptRivalAlliance(rival: RivalFamilyState): void {
  rival.attitude = Math.min(100, rival.attitude + 25)
  rival.relation = 'allied'
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

export function personalityLabel(id: RivalPersonality): string {
  return RIVAL_FAMILY_DEFS.find((d) => d.personality === id)?.personalityLabel ?? id
}
