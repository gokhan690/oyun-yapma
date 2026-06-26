import { formatGameClock } from './GameClock'
import { requiredDomainText, fmt } from '../i18n'

export type GazetteCategory = 'player' | 'rival' | 'market' | 'politics' | 'crisis' | 'calendar'

export interface GazetteEntry {
  id: string
  headline: string
  gameDay: number
  category: GazetteCategory
  at: number
}

let seq = 0

export function pushGazette(
  entries: GazetteEntry[],
  headline: string,
  gameDay: number,
  category: GazetteCategory,
  max = 40,
): GazetteEntry[] {
  seq++
  const entry: GazetteEntry = {
    id: `gz_${Date.now()}_${seq}`,
    headline,
    gameDay,
    category,
    at: Date.now(),
  }
  return [entry, ...entries.filter((e) => e.headline !== headline)].slice(0, max)
}

export function formatGazetteDate(gameTimeMs: number): string {
  return formatGameClock(gameTimeMs).split(' · ')[0] ?? requiredDomainText('gazette_today')
}

export function headlinePurchase(playerName: string, businessName: string, count: number): string {
  const who = playerName.trim() || 'Baron'
  if (count > 1) {
    return fmt('gazette_purchase_multi', { who, business: businessName, count })
  }
  return fmt('gazette_purchase_single', { who, business: businessName })
}

export function headlineRivalBehind(_playerName: string, rivalName: string, _amount: string): string {
  const who = _playerName.trim() || 'Baron'
  return fmt('gazette_rival_behind', { who, rival: rivalName })
}

export function headlineMonthlyIncome(playerName: string, amount: string, rivalName?: string): string {
  const who = playerName.trim() || 'Baron'
  if (rivalName) {
    return fmt('gazette_monthly_income_rival', { who, amount, rival: rivalName })
  }
  return fmt('gazette_monthly_income', { who, amount })
}

export function headlineLoanDenied(playerName: string): string {
  const who = playerName.trim() || 'Baron'
  return fmt('gazette_loan_denied', { who })
}

export function headlineCrisis(playerName: string, crisisLabel: string): string {
  const who = playerName.trim() || 'Baron'
  return fmt('gazette_crisis', { who, crisis: crisisLabel })
}

export function headlineMarketRandom(playerName: string, netWorth: number): string {
  const who = playerName.trim() || 'Baron'
  const idx = Math.floor(Date.now() / 86_400_000) % 8
  if (idx === 3) {
    const trend = netWorth > 1_000_000
      ? requiredDomainText('gazette_market_3_rising')
      : requiredDomainText('gazette_market_3_pressure')
    return fmt('gazette_market_3', { who, trend })
  }
  return fmt(`gazette_market_${idx}` as Parameters<typeof fmt>[0], { who })
}

export function headlinePoliticsRandom(playerName: string): string {
  const who = playerName.trim() || 'Baron'
  const idx = Math.floor(Date.now() / 86_400_000 + 3) % 6
  return fmt(`gazette_politics_${idx}` as Parameters<typeof fmt>[0], { who })
}
