import { formatGameClock } from './GameClock'

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
  return formatGameClock(gameTimeMs).split(' · ')[0] ?? 'Bugün'
}

export function headlinePurchase(playerName: string, businessName: string, count: number): string {
  const who = playerName.trim() || 'Baron'
  if (count > 1) {
    return `${who}, ${businessName} portföyünü ${count} birimle genişletti`
  }
  return `${who}, yeni ${businessName} yatırımını duyurdu`
}

export function headlineRivalBehind(_playerName: string, rivalName: string, _amount: string): string {
  const who = _playerName.trim() || 'Baron'
  return `${rivalName} bu çeyrek geride kaldı — ${who} liderliği sürdürüyor`
}

export function headlineMonthlyIncome(playerName: string, amount: string, rivalName?: string): string {
  const who = playerName.trim() || 'Baron'
  if (rivalName) {
    return `${who}'un işletmeleri bu ay ${amount} gelir üretti — ${rivalName} geride kaldı`
  }
  return `${who}'un imparatorluğu bu ay ${amount} gelir kaydetti`
}

export function headlineLoanDenied(playerName: string): string {
  const who = playerName.trim() || 'Baron'
  return `Bankalar ${who}'un kredi başvurusunu reddetti — itibar endişesi`
}

export function headlineCrisis(playerName: string, crisisLabel: string): string {
  const who = playerName.trim() || 'Baron'
  return `⚠️ ${crisisLabel} — ${who} karar vermek zorunda`
}
