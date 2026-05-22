export type MarketNewsEffect = 'global_up' | 'global_down' | 'click_up' | 'producer_up' | 'synergy_up'

export interface MarketNewsDef {
  id: string
  headline: string
  effect: MarketNewsEffect
  value: number
  durationGameDays: number
  producerId?: string
}

export interface ActiveMarketNews {
  defId: string
  expiresGameTimeMs: number
}

export const MARKET_NEWS: MarketNewsDef[] = [
  { id: 'bull', headline: '📈 Boğa piyasası — yatırımcılar iyimser', effect: 'global_up', value: 0.25, durationGameDays: 2 },
  { id: 'bear', headline: '📉 Ayı piyasası — satış baskısı', effect: 'global_down', value: 0.12, durationGameDays: 1 },
  { id: 'viral', headline: '🔥 Viral kampanya — tıklama patladı', effect: 'click_up', value: 0.35, durationGameDays: 1 },
  { id: 'logistics', headline: '🚚 Lojistik grevi sona erdi — fabrikalar hızlandı', effect: 'producer_up', value: 0.4, producerId: 'fabrika', durationGameDays: 2 },
  { id: 'ecom', headline: '🛒 E-ticaret rekoru kırdı', effect: 'producer_up', value: 0.35, producerId: 'robot', durationGameDays: 2 },
  { id: 'summit', headline: '🤝 CEO zirvesi — sinerjiler güçlendi', effect: 'synergy_up', value: 0.5, durationGameDays: 3 },
  { id: 'crypto', headline: '₿ Kripto dalgası — spekülasyon arttı', effect: 'global_up', value: 0.18, durationGameDays: 1 },
  { id: 'tax', headline: '🏛 Vergi denetimi — piyasalar temkinli', effect: 'global_down', value: 0.08, durationGameDays: 2 },
  { id: 'football', headline: '⚽ Transfer rekoru — kulüpler coştu', effect: 'producer_up', value: 0.45, producerId: 'futbol_superlig', durationGameDays: 3 },
  { id: 'election', headline: '🗳️ Seçim yaklaşıyor — siyaset hareketlendi', effect: 'producer_up', value: 0.3, producerId: 'siyaset_belediye', durationGameDays: 4 },
  { id: 'dark_raid', headline: '🏭 Yeraltı operasyonu — siyah fabrikalar risk altında', effect: 'global_down', value: 0.06, durationGameDays: 1 },
]

import { MS_PER_GAME_DAY } from './GameClock'

export function newsDurationMs(def: MarketNewsDef): number {
  return def.durationGameDays * MS_PER_GAME_DAY
}

export function pickMarketNews(gameDay: number, _hour?: number): MarketNewsDef {
  const seed = gameDay
  let h = seed
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return MARKET_NEWS[Math.abs(h) % MARKET_NEWS.length]!
}

export function newsDef(id: string): MarketNewsDef | undefined {
  return MARKET_NEWS.find((n) => n.id === id)
}
