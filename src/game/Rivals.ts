import { requiredDomainText, fmt } from '../i18n'
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
  minPlayerEarned: number
  stageLabel: string
  personality: RivalPersonality
  personalityLabel: string
}

export const RIVAL_FAMILY_DEFS: RivalFamilyDef[] = [
  {
    id: 'kocak',
    name: 'Koçak Holding',
    emoji: '🏗️',
    sectorFocus: ['industry', 'finance'],
    startNetWorth: 18_000,
    minPlayerEarned: 10_000,
    stageLabel: 'Yerel holding',
    personality: 'aggressive',
    personalityLabel: 'Agresif — sektör kopyalar, fiyat savaşı açar',
  },
  {
    id: 'sabanolu',
    name: 'Sabanoğlu Grubu',
    emoji: '⚡',
    sectorFocus: ['tech', 'industry'],
    startNetWorth: 1_200_000,
    minPlayerEarned: 1_000_000,
    stageLabel: 'Ulusal dev',
    personality: 'conservative',
    personalityLabel: 'Muhafazakar — yavaş büyür, güvenli hamleler',
  },
  {
    id: 'demirhan',
    name: 'Demirhan Ailesi',
    emoji: '🏭',
    sectorFocus: ['retail', 'illegal'],
    startNetWorth: 1_500,
    minPlayerEarned: 2_500,
    stageLabel: 'Mahalle rakibi',
    personality: 'shadow',
    personalityLabel: 'Gölge — zayıf noktalarını avlar',
  },
  {
    id: 'yildiz',
    name: 'Yıldız Medya',
    emoji: '📺',
    sectorFocus: ['media', 'politics'],
    startNetWorth: 120_000,
    minPlayerEarned: 100_000,
    stageLabel: 'Medya gücü',
    personality: 'media',
    personalityLabel: 'Medya gücü — itibar ve siyaset oynar',
  },
  {
    id: 'aksoy',
    name: 'Aksoy Perakende',
    emoji: '🛒',
    sectorFocus: ['retail', 'luxury'],
    startNetWorth: 45_000,
    minPlayerEarned: 35_000,
    stageLabel: 'Perakende zinciri',
    personality: 'aggressive',
    personalityLabel: 'Agresif — perakende savaşı açar, fiyat kırar',
  },
  {
    id: 'tek',
    name: 'Tek Bilişim',
    emoji: '💻',
    sectorFocus: ['tech', 'science'],
    startNetWorth: 3_500_000,
    minPlayerEarned: 3_000_000,
    stageLabel: 'Teknoloji devi',
    personality: 'conservative',
    personalityLabel: 'Muhafazakar — Ar-Ge ağırlıklı, uzun vade oynar',
  },
  {
    id: 'karaca',
    name: 'Karaca Kartel',
    emoji: '🕶️',
    sectorFocus: ['illegal', 'finance'],
    startNetWorth: 8_000_000,
    minPlayerEarned: 8_000_000,
    stageLabel: 'Yeraltı kartel',
    personality: 'shadow',
    personalityLabel: 'Gölge — kara para ve baskınlarla zarar verir',
  },
  {
    id: 'ozdemir',
    name: 'Özdemir Holding',
    emoji: '🏦',
    sectorFocus: ['finance', 'industry'],
    startNetWorth: 30_000_000,
    minPlayerEarned: 25_000_000,
    stageLabel: 'Küresel holding',
    personality: 'conservative',
    personalityLabel: 'Muhafazakar — devasa sermaye, borsa hamleleri',
  },
  {
    id: 'altin',
    name: 'Altın Hanedanı',
    emoji: '👑',
    sectorFocus: ['luxury', 'politics'],
    startNetWorth: 150_000_000,
    minPlayerEarned: 120_000_000,
    stageLabel: 'İmparatorluk rakibi',
    personality: 'media',
    personalityLabel: 'Medya gücü — lüks ve siyasette hükmeder',
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

export function isRivalUnlocked(id: string, totalEarned: number): boolean {
  const def = rivalDef(id)
  return !def || totalEarned >= def.minPlayerEarned
}

export function nextLockedRivalDef(totalEarned: number): RivalFamilyDef | null {
  return RIVAL_FAMILY_DEFS
    .filter((d) => totalEarned < d.minPlayerEarned)
    .sort((a, b) => a.minPlayerEarned - b.minPlayerEarned)[0] ?? null
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
  playerProgressEarned = playerNetWorth,
): { events: RivalTickResult[]; allianceOffer: RivalAllianceOffer | null } {
  const events: RivalTickResult[] = []
  let allianceOffer: RivalAllianceOffer | null = null
  const dominant = dominantPlayerSector(producers)
  const who = playerName.trim() || 'Baron'

  for (const rival of rivals) {
    if (!isRivalUnlocked(rival.id, playerProgressEarned)) continue
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
        headline: fmt('rival_tick_bankruptcy', { rivalName: rival.name }),
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
          headline: fmt('rival_tick_copy', { rivalName: rival.name, playerName: who, sector: dominant }),
          attitudeDelta: -6,
          kind: 'copy',
        })
      }
    }

    if (rival.personality === 'shadow' && playerReputation < 35 && Math.random() < 0.1) {
      rival.attitude = Math.max(-100, rival.attitude - 10)
      events.push({
        rivalId: rival.id,
        headline: fmt('rival_tick_shadow_weakpoint', { rivalName: rival.name, playerName: who }),
        attitudeDelta: -10,
        kind: 'weakpoint',
      })
    }

    if (rival.personality === 'media' && playerReputation < 50 && Math.random() < 0.08) {
      rival.attitude = Math.max(-100, rival.attitude - 5)
      events.push({
        rivalId: rival.id,
        headline: fmt('rival_tick_media_attack', { rivalName: rival.name, playerName: who }),
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
          headline: fmt('rival_tick_war', { rivalName: rival.name, playerName: who, sector }),
          attitudeDelta: -8,
          kind: 'conflict',
        })
      } else if (conflict === 'rivalry' && Math.random() < rivalryChance) {
        rival.attitude = Math.max(-100, rival.attitude - 4)
        events.push({
          rivalId: rival.id,
          headline: fmt('rival_tick_rivalry', { rivalName: rival.name, playerName: who }),
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
        message: `${rival.name}: "${fmt('rival_alliance_message', { playerSec, rivalSec })}"`,
        expiresAt: Date.now() + 120_000,
      }
      events.push({
        rivalId: rival.id,
        headline: fmt('rival_tick_alliance_offer', { rivalName: rival.name, playerName: who }),
        attitudeDelta: 0,
        kind: 'alliance',
      })
    }

    if (playerNetWorth > rival.netWorth * 3 && rival.attitude > -50 && Math.random() < 0.05) {
      rival.attitude = Math.max(-100, rival.attitude - 6)
      events.push({
        rivalId: rival.id,
        headline: fmt('rival_tick_threat', { rivalName: rival.name, playerName: who }),
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

export function rivalFamilyName(def: RivalFamilyDef): string {
  return requiredDomainText(`rival_${def.id}_name`)
}
export function rivalStageLabel(def: RivalFamilyDef): string {
  return requiredDomainText(`rival_${def.id}_stage`)
}
export function rivalPersonalityLabel(def: RivalFamilyDef): string {
  return requiredDomainText(`rival_${def.id}_personality`)
}

export function attitudeLabel(attitude: number): string {
  if (attitude >= 60) return requiredDomainText('rival_attitude_ally')
  if (attitude >= 20) return requiredDomainText('rival_attitude_friendly')
  if (attitude >= -20) return requiredDomainText('rival_attitude_neutral')
  if (attitude >= -50) return requiredDomainText('rival_attitude_hostile')
  return requiredDomainText('rival_attitude_war')
}

export function personalityLabel(id: RivalPersonality): string {
  const def = RIVAL_FAMILY_DEFS.find((d) => d.personality === id)
  return def ? rivalPersonalityLabel(def) : id
}

// ─── Rival Event System ────────────────────────────────────────────────

export type RivalEventKind = 'media_scandal' | 'market_manipulation' | 'business_competition' | 'political_lobbying'

export interface RivalEventResponse {
  id: string
  label: string
  emoji: string
  cost: number
  reputationDelta: number
}

export interface RivalEvent {
  id: string
  rivalId: string
  rivalName: string
  kind: RivalEventKind
  headline: string
  description: string
  reputationDamage: number
  moneyDamage: number
  responses: RivalEventResponse[]
  expiresAtDay: number
}

export function generateRivalEvent(rival: RivalFamilyState, playerNetWorth: number, gameDay: number): RivalEvent | null {
  if (rival.relation === 'bankrupt' || rival.relation === 'merged') return null
  if (rival.attitude > 20) return null  // friendly rivals don't attack
  if (Math.random() > 0.25) return null

  const isStrong = rival.netWorth > playerNetWorth
  const kinds: RivalEventKind[] = isStrong
    ? ['media_scandal', 'market_manipulation', 'business_competition', 'political_lobbying']
    : ['media_scandal', 'business_competition']
  const kind = kinds[Math.floor(Math.random() * kinds.length)]!

  const halfNW = Math.max(10_000, Math.round(playerNetWorth * 0.04))

  const configs: Record<RivalEventKind, { headline: string; desc: string; repDmg: number; moneyDmg: number; responses: RivalEventResponse[] }> = {
    media_scandal: {
      headline: fmt('rival_evt_media_scandal_headline', { rivalName: rival.name }),
      desc: fmt('rival_evt_media_scandal_desc', { rivalName: rival.name }),
      repDmg: 8, moneyDmg: 0,
      responses: [
        { id: 'counter_pr', label: requiredDomainText('rival_resp_counter_pr'), emoji: '📰', cost: 50_000, reputationDelta: 12 },
        { id: 'legal', label: requiredDomainText('rival_resp_legal'), emoji: '⚖️', cost: 100_000, reputationDelta: 5 },
        { id: 'ignore', label: requiredDomainText('rival_resp_ignore'), emoji: '🤷', cost: 0, reputationDelta: -4 },
      ],
    },
    market_manipulation: {
      headline: fmt('rival_evt_market_manip_headline', { rivalName: rival.name }),
      desc: fmt('rival_evt_market_manip_desc', { rivalName: rival.name }),
      repDmg: 0, moneyDmg: halfNW,
      responses: [
        { id: 'buy_dip', label: requiredDomainText('rival_resp_buy_dip'), emoji: '📈', cost: Math.round(halfNW * 0.8), reputationDelta: 5 },
        { id: 'report', label: requiredDomainText('rival_resp_report'), emoji: '🏛️', cost: 25_000, reputationDelta: 8 },
        { id: 'wait', label: requiredDomainText('rival_resp_wait'), emoji: '⏳', cost: 0, reputationDelta: 0 },
      ],
    },
    business_competition: {
      headline: fmt('rival_evt_biz_competition_headline', { rivalName: rival.name }),
      desc: fmt('rival_evt_biz_competition_desc', { rivalName: rival.name }),
      repDmg: 0, moneyDmg: Math.round(halfNW * 0.6),
      responses: [
        { id: 'price_war', label: requiredDomainText('rival_resp_price_war'), emoji: '⚔️', cost: Math.round(halfNW * 0.9), reputationDelta: -3 },
        { id: 'differentiate', label: requiredDomainText('rival_resp_differentiate'), emoji: '💡', cost: 30_000, reputationDelta: 3 },
        { id: 'buy_out', label: requiredDomainText('rival_resp_buy_out'), emoji: '🤝', cost: rival.netWorth, reputationDelta: 5 },
      ],
    },
    political_lobbying: {
      headline: fmt('rival_evt_political_lobby_headline', { rivalName: rival.name }),
      desc: fmt('rival_evt_political_lobby_desc', { rivalName: rival.name }),
      repDmg: 6, moneyDmg: 0,
      responses: [
        { id: 'counter_lobby', label: requiredDomainText('rival_resp_counter_lobby'), emoji: '🏛️', cost: 80_000, reputationDelta: 8 },
        { id: 'alliance', label: requiredDomainText('rival_resp_alliance'), emoji: '🤝', cost: 50_000, reputationDelta: 4 },
        { id: 'ignore', label: requiredDomainText('rival_resp_ignore'), emoji: '🤷', cost: 0, reputationDelta: -3 },
      ],
    },
  }

  const cfg = configs[kind]!
  return {
    id: `rev_${rival.id}_${gameDay}_${kind}`,
    rivalId: rival.id,
    rivalName: rival.name,
    kind,
    headline: cfg.headline,
    description: cfg.desc,
    reputationDamage: cfg.repDmg,
    moneyDamage: cfg.moneyDmg,
    responses: cfg.responses,
    expiresAtDay: gameDay + 3,
  }
}
