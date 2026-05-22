import { PRODUCERS, type ProducerDef } from './Economy'
import { MS_PER_GAME_DAY } from './GameClock'

export type PoliticsLevel = 'none' | 'belediye' | 'milletvekili' | 'bakan' | 'cumhurbaskan'

export interface FootballClubState {
  clubId: string
  leagueLevel: number
  fanBase: number
  wins: number
  stadiumLevel: number
}

export interface PoliticsState {
  level: PoliticsLevel
  influence: number
  campaignFund: number
  lastElectionYear: number
}

export interface DarkIndustryState {
  productionMult: number
  heatBonus: number
  boostUntilGameMs: number
}

export interface EmpireState {
  football: FootballClubState[]
  politics: PoliticsState
  darkIndustry: DarkIndustryState
}

export const FOOTBALL_CLUB_IDS = ['futbol_amateur', 'futbol_superlig', 'futbol_avrupa'] as const
export const POLITICS_PRODUCER_IDS = ['siyaset_belediye', 'siyaset_milletvekili', 'siyaset_bakan', 'siyaset_cumhurbaskanligi'] as const
export const DARK_PRODUCER_IDS = ['kacak_imalat', 'siyah_fabrika', 'silah_ticareti'] as const

const LEAGUE_NAMES = ['3. Lig', '2. Lig', '1. Lig', 'Süper Lig', 'Avrupa']

export function createEmpireState(): EmpireState {
  return {
    football: [],
    politics: { level: 'none', influence: 0, campaignFund: 0, lastElectionYear: 2026 },
    darkIndustry: { productionMult: 1, heatBonus: 0, boostUntilGameMs: 0 },
  }
}

export function politicsLevelFromProducers(producers: Record<string, number>): PoliticsLevel {
  if ((producers.siyaset_cumhurbaskanligi ?? 0) > 0) return 'cumhurbaskan'
  if ((producers.siyaset_bakan ?? 0) > 0) return 'bakan'
  if ((producers.siyaset_milletvekili ?? 0) > 0) return 'milletvekili'
  if ((producers.siyaset_belediye ?? 0) > 0) return 'belediye'
  return 'none'
}

export function politicsLevelLabel(level: PoliticsLevel): string {
  switch (level) {
    case 'belediye': return 'Belediye Meclisi'
    case 'milletvekili': return 'Milletvekili'
    case 'bakan': return 'Bakan'
    case 'cumhurbaskan': return 'Cumhurbaşkanı'
    default: return 'Sivil'
  }
}

export function syncEmpireFromProducers(empire: EmpireState, producers: Record<string, number>): void {
  empire.politics.level = politicsLevelFromProducers(producers)
  for (const id of FOOTBALL_CLUB_IDS) {
    const owned = producers[id] ?? 0
    if (owned <= 0) continue
    let club = empire.football.find((c) => c.clubId === id)
    if (!club) {
      club = { clubId: id, leagueLevel: id === 'futbol_amateur' ? 0 : id === 'futbol_superlig' ? 3 : 4, fanBase: 1000, wins: 0, stadiumLevel: 1 }
      empire.football.push(club)
    }
  }
  empire.football = empire.football.filter((c) => (producers[c.clubId] ?? 0) > 0)
}

export function leagueName(level: number): string {
  return LEAGUE_NAMES[Math.min(level, LEAGUE_NAMES.length - 1)] ?? LEAGUE_NAMES[0]!
}

export function footballClubDef(clubId: string): ProducerDef | undefined {
  return PRODUCERS.find((p) => p.id === clubId)
}

export function stadiumUpgradeCost(stadiumLevel: number): number {
  return Math.floor(50_000 * Math.pow(1.8, stadiumLevel - 1))
}

export function leagueUpgradeCost(leagueLevel: number): number {
  return Math.floor(200_000 * Math.pow(2.2, leagueLevel))
}

export function simulateMatch(club: FootballClubState): { won: boolean; fanGain: number; bonus: number } {
  const winChance = 0.35 + club.leagueLevel * 0.08 + club.stadiumLevel * 0.03
  const won = Math.random() < Math.min(0.85, winChance)
  const fanGain = won ? Math.floor(500 + club.leagueLevel * 300) : Math.floor(100 + club.leagueLevel * 50)
  const bonus = won ? Math.floor(1000 * (1 + club.leagueLevel * 0.5) * club.stadiumLevel) : 0
  return { won, fanGain, bonus }
}

export function empireFootballIncomeMult(club: FootballClubState): number {
  return 1 + club.leagueLevel * 0.1 + club.fanBase / 50_000 + club.wins * 0.02
}

export function empirePoliticsCostDiscount(politics: PoliticsState): number {
  switch (politics.level) {
    case 'belediye': return 0.02
    case 'milletvekili': return 0.05
    case 'bakan': return 0.08
    case 'cumhurbaskan': return 0.12
    default: return 0
  }
}

export function empirePoliticsHeatReduction(politics: PoliticsState): number {
  switch (politics.level) {
    case 'milletvekili': return 0.05
    case 'bakan': return 0.10
    case 'cumhurbaskan': return 0.15
    default: return 0
  }
}

export function empireDarkProductionMult(dark: DarkIndustryState, gameTimeMs: number): number {
  let mult = dark.productionMult
  if (gameTimeMs < dark.boostUntilGameMs) mult *= 1.5
  return mult
}

export function boostDarkProduction(dark: DarkIndustryState, gameTimeMs: number): void {
  dark.productionMult = Math.min(3, dark.productionMult + 0.1)
  dark.boostUntilGameMs = gameTimeMs + 7 * MS_PER_GAME_DAY
}

export function reduceDarkHeat(dark: DarkIndustryState): void {
  dark.heatBonus = Math.max(-30, dark.heatBonus - 10)
}

export function lobbyCost(influence: number): number {
  return Math.floor(10_000 * (1 + influence / 100))
}

export function donateCampaign(amount: number, politics: PoliticsState): void {
  politics.campaignFund += amount
  politics.influence += Math.floor(amount / 5000)
}

export function tickEmpireDaily(empire: EmpireState, producers: Record<string, number>, _gameTimeMs: number, gameYear: number): { matchBonus: number; election: boolean } {
  syncEmpireFromProducers(empire, producers)
  let matchBonus = 0
  for (const club of empire.football) {
    const result = simulateMatch(club)
    if (result.won) club.wins++
    club.fanBase += result.fanGain
    matchBonus += result.bonus
  }
  const election = gameYear >= empire.politics.lastElectionYear + 4 && empire.politics.level !== 'none'
  if (election) {
    empire.politics.lastElectionYear = gameYear
    empire.politics.influence += 10
  }
  return { matchBonus, election }
}

export function producerEmpireCategory(id: string): 'sport' | 'politics' | 'dark' | null {
  if ((FOOTBALL_CLUB_IDS as readonly string[]).includes(id)) return 'sport'
  if ((POLITICS_PRODUCER_IDS as readonly string[]).includes(id)) return 'politics'
  if ((DARK_PRODUCER_IDS as readonly string[]).includes(id)) return 'dark'
  return null
}
