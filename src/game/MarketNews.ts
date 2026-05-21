export type MarketNewsEffect = 'global_up' | 'global_down' | 'click_up' | 'producer_up' | 'synergy_up'

export interface MarketNewsDef {
  id: string
  headline: string
  effect: MarketNewsEffect
  value: number
  durationGameHours: number
  producerId?: string
}

export interface ActiveMarketNews {
  defId: string
  expiresGameTimeMs: number
}

export const MARKET_NEWS: MarketNewsDef[] = [
  { id: 'bull', headline: '📈 Boğa piyasası — yatırımcılar iyimser', effect: 'global_up', value: 0.25, durationGameHours: 4 },
  { id: 'bear', headline: '📉 Ayı piyasası — satış baskısı', effect: 'global_down', value: 0.12, durationGameHours: 3 },
  { id: 'viral', headline: '🔥 Viral kampanya — tıklama patladı', effect: 'click_up', value: 0.35, durationGameHours: 2 },
  { id: 'logistics', headline: '🚚 Lojistik grevi sona erdi — fabrikalar hızlandı', effect: 'producer_up', value: 0.4, producerId: 'fabrika', durationGameHours: 5 },
  { id: 'ecom', headline: '🛒 E-ticaret rekoru kırdı', effect: 'producer_up', value: 0.35, producerId: 'robot', durationGameHours: 4 },
  { id: 'summit', headline: '🤝 CEO zirvesi — sinerjiler güçlendi', effect: 'synergy_up', value: 0.5, durationGameHours: 6 },
  { id: 'crypto', headline: '₿ Kripto dalgası — spekülasyon arttı', effect: 'global_up', value: 0.18, durationGameHours: 3 },
  { id: 'tax', headline: '🏛 Vergi denetimi — piyasalar temkinli', effect: 'global_down', value: 0.08, durationGameHours: 4 },
]

const MS_PER_GAME_HOUR = 60 * 60_000

export function newsDurationMs(def: MarketNewsDef): number {
  return def.durationGameHours * MS_PER_GAME_HOUR
}

export function pickMarketNews(gameDay: number, hour: number): MarketNewsDef {
  const seed = gameDay * 24 + hour
  let h = seed
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return MARKET_NEWS[Math.abs(h) % MARKET_NEWS.length]!
}

export function newsDef(id: string): MarketNewsDef | undefined {
  return MARKET_NEWS.find((n) => n.id === id)
}
