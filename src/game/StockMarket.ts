export interface StockTicker {
  id: string
  name: string
  emoji: string
  price: number
  shares: number
  avgBuyPrice: number
  volatility: number
  history: number[]
}

export interface StockState {
  tickers: Record<string, StockTicker>
  activeTickerId: string
  lastTick: number
  trendHintUntil: number
  trendDirection: 'up' | 'down' | 'flat'
  marketEventUntil: number
  marketEventMult: number
}

export const STOCK_TICK_MS = 30_000
export const HISTORY_LEN = 20

export const STOCK_DEFS = [
  { id: 'tech', name: 'Teknoloji', emoji: '💻', basePrice: 100, volatility: 0.1 },
  { id: 'energy', name: 'Enerji', emoji: '⚡', basePrice: 80, volatility: 0.14 },
  { id: 'realestate', name: 'Gayrimenkul', emoji: '🏢', basePrice: 120, volatility: 0.08 },
] as const

function createTicker(def: (typeof STOCK_DEFS)[number]): StockTicker {
  return {
    id: def.id,
    name: def.name,
    emoji: def.emoji,
    price: def.basePrice,
    shares: 0,
    avgBuyPrice: 0,
    volatility: def.volatility,
    history: [def.basePrice],
  }
}

export function createStockState(): StockState {
  const tickers: Record<string, StockTicker> = {}
  for (const def of STOCK_DEFS) tickers[def.id] = createTicker(def)
  return {
    tickers,
    activeTickerId: 'tech',
    lastTick: Date.now(),
    trendHintUntil: 0,
    trendDirection: 'flat',
    marketEventUntil: 0,
    marketEventMult: 1,
  }
}

/** v3 tek-hisse kaydından migrasyon */
export function migrateLegacyStock(legacy: {
  price?: number
  shares?: number
  avgBuyPrice?: number
  lastTick?: number
  trendHintUntil?: number
  trendDirection?: 'up' | 'down' | 'flat'
}): StockState {
  const state = createStockState()
  if (legacy.shares && legacy.shares > 0) {
    const tech = state.tickers.tech!
    tech.price = legacy.price ?? tech.price
    tech.shares = legacy.shares
    tech.avgBuyPrice = legacy.avgBuyPrice ?? 0
    tech.history = Array(HISTORY_LEN).fill(tech.price)
  }
  state.lastTick = legacy.lastTick ?? Date.now()
  state.trendHintUntil = legacy.trendHintUntil ?? 0
  state.trendDirection = legacy.trendDirection ?? 'flat'
  return state
}

export function activeTicker(state: StockState): StockTicker {
  return state.tickers[state.activeTickerId] ?? state.tickers.tech!
}

export function pushHistory(ticker: StockTicker): void {
  ticker.history.push(ticker.price)
  if (ticker.history.length > HISTORY_LEN) ticker.history.shift()
}

export function tickStockPrice(state: StockState): void {
  let totalChange = 0
  const eventActive = Date.now() < state.marketEventUntil
  const tickerList = Object.values(state.tickers)
  for (const ticker of tickerList) {
    if (!Number.isFinite(ticker.price) || ticker.price <= 0) ticker.price = 10
    let change = (Math.random() - 0.5) * ticker.volatility
    if (eventActive) change *= state.marketEventMult
    const newPrice = ticker.price * (1 + change)
    ticker.price = Number.isFinite(newPrice) ? Math.max(10, newPrice) : ticker.price
    pushHistory(ticker)
    totalChange += change
  }
  state.lastTick = Date.now()
  const count = tickerList.length
  const avg = count > 0 ? totalChange / count : 0
  state.trendDirection = avg > 0.02 ? 'up' : avg < -0.02 ? 'down' : 'flat'
}

export function startMarketEvent(state: StockState, crash: boolean): void {
  state.marketEventUntil = Date.now() + 120_000
  state.marketEventMult = crash ? -0.4 : 0.3
}

export function portfolioValue(state: StockState): number {
  return Object.values(state.tickers).reduce((s, t) => s + t.shares * t.price, 0)
}

export function buyShares(state: StockState, tickerId: string, amount: number, money: number): { cost: number; bought: number } {
  const ticker = state.tickers[tickerId]
  if (!ticker) return { cost: 0, bought: 0 }
  const maxShares = Math.floor(money / ticker.price)
  const bought = Math.min(amount, maxShares)
  if (bought <= 0) return { cost: 0, bought: 0 }
  const cost = bought * ticker.price
  const totalShares = ticker.shares + bought
  const prevAvg = Number.isFinite(ticker.avgBuyPrice) ? ticker.avgBuyPrice : 0
  ticker.avgBuyPrice = totalShares > 0
    ? (prevAvg * ticker.shares + ticker.price * bought) / totalShares
    : 0
  ticker.shares = totalShares
  return { cost, bought }
}

export function sellShares(state: StockState, tickerId: string, amount: number): { revenue: number; sold: number } {
  const ticker = state.tickers[tickerId]
  if (!ticker) return { revenue: 0, sold: 0 }
  const sold = Math.min(amount, ticker.shares)
  if (sold <= 0) return { revenue: 0, sold: 0 }
  const revenue = sold * ticker.price
  ticker.shares -= sold
  if (ticker.shares === 0) ticker.avgBuyPrice = 0
  return { revenue, sold }
}

export function profitLoss(ticker: StockTicker): number {
  if (ticker.shares <= 0) return 0
  return (ticker.price - ticker.avgBuyPrice) * ticker.shares
}

export function totalShares(state: StockState): number {
  return Object.values(state.tickers).reduce((s, t) => s + t.shares, 0)
}

export function ownedTickerCount(state: StockState): number {
  return Object.values(state.tickers).filter((t) => t.shares > 0).length
}

export function sparklinePath(history: number[], width: number, height: number): string {
  if (history.length < 2) return ''
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const step = width / (history.length - 1)
  return history
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
