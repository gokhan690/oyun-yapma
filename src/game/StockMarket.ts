export interface StockTicker {
  id: string
  name: string
  emoji: string
  price: number
  shares: number
  avgBuyPrice: number
  volatility: number
  history: number[]
  sector: 'tech' | 'energy' | 'realestate' | 'finance' | 'industrial'
}

export interface StockState {
  tickers: Record<string, StockTicker>
  activeTickerId: string
  lastTick: number
  trendHintUntil: number
  trendDirection: 'up' | 'down' | 'flat'
  marketEventUntil: number
  marketEventMult: number
  centralBankRate: number
  marketFear: number
  macroHeadline: string
  bankruptTickerId: string | null
  bankruptUntil: number
  lastMacroTick: number
}

export const STOCK_TICK_MS = 30_000
export const MACRO_TICK_MS = 120_000
export const HISTORY_LEN = 20

/** Bozuk kayıtlarda dev history dizilerini budar — structuredClone takılmasını önler */
export function trimStockHistoryInPlace(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || !('tickers' in raw)) return
  const tickers = (raw as StockState).tickers
  if (!tickers || typeof tickers !== 'object') return
  for (const t of Object.values(tickers)) {
    if (t && Array.isArray(t.history) && t.history.length > HISTORY_LEN) {
      t.history = t.history.slice(-HISTORY_LEN)
    }
  }
}

export const STOCK_DEFS = [
  { id: 'tech', name: 'Teknoloji', emoji: '💻', basePrice: 100, volatility: 0.1, sector: 'tech' as const },
  { id: 'energy', name: 'Enerji', emoji: '⚡', basePrice: 80, volatility: 0.14, sector: 'energy' as const },
  { id: 'realestate', name: 'Gayrimenkul', emoji: '🏢', basePrice: 120, volatility: 0.08, sector: 'realestate' as const },
  { id: 'finance', name: 'Bankacılık', emoji: '🏦', basePrice: 95, volatility: 0.11, sector: 'finance' as const },
  { id: 'industrial', name: 'Sanayi', emoji: '🏭', basePrice: 72, volatility: 0.13, sector: 'industrial' as const },
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
    sector: def.sector,
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
    centralBankRate: 0.055,
    marketFear: 28,
    macroHeadline: 'Merkez bankası faiz oranı %5.5',
    bankruptTickerId: null,
    bankruptUntil: 0,
    lastMacroTick: Date.now(),
  }
}

/** Eksik ticker ve makro alanları tamamla */
export function migrateStockState(raw: StockState): StockState {
  const state = createStockState()
  if (!raw || typeof raw !== 'object') return state

  for (const def of STOCK_DEFS) {
    const existing = raw.tickers?.[def.id]
    if (existing) {
      state.tickers[def.id] = {
        ...createTicker(def),
        ...existing,
        sector: def.sector,
        history: Array.isArray(existing.history) && existing.history.length > 0
          ? existing.history.slice(-HISTORY_LEN)
          : [existing.price ?? def.basePrice],
      }
    }
  }

  state.activeTickerId = raw.activeTickerId && state.tickers[raw.activeTickerId]
    ? raw.activeTickerId
    : 'tech'
  state.lastTick = raw.lastTick ?? Date.now()
  state.trendHintUntil = raw.trendHintUntil ?? 0
  state.trendDirection = raw.trendDirection ?? 'flat'
  state.marketEventUntil = raw.marketEventUntil ?? 0
  state.marketEventMult = raw.marketEventMult ?? 1
  state.centralBankRate = typeof raw.centralBankRate === 'number' ? raw.centralBankRate : 0.055
  state.marketFear = typeof raw.marketFear === 'number' ? raw.marketFear : 28
  state.macroHeadline = raw.macroHeadline ?? `Merkez bankası faiz oranı %${(state.centralBankRate * 100).toFixed(1)}`
  state.bankruptTickerId = raw.bankruptTickerId ?? null
  state.bankruptUntil = raw.bankruptUntil ?? 0
  state.lastMacroTick = raw.lastMacroTick ?? Date.now()
  return state
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

function sectorRateEffect(sector: StockTicker['sector'], rateDelta: number): number {
  if (sector === 'finance') return rateDelta * 1.8
  if (sector === 'realestate') return rateDelta * -1.2
  if (sector === 'tech') return rateDelta * -0.4
  return rateDelta * 0.2
}

export function tickStockPrice(state: StockState): void {
  let totalChange = 0
  const eventActive = Date.now() < state.marketEventUntil
  const fearMult = 1 + (state.marketFear - 50) * 0.004
  const tickerList = Object.values(state.tickers)
  for (const ticker of tickerList) {
    if (!Number.isFinite(ticker.price) || ticker.price <= 0) ticker.price = 10
    let change = (Math.random() - 0.5) * ticker.volatility * fearMult
    if (eventActive) change *= state.marketEventMult
    if (state.bankruptTickerId === ticker.id && Date.now() < state.bankruptUntil) {
      change -= 0.08 + Math.random() * 0.06
    }
    if (ticker.sector === 'finance') {
      change += (state.centralBankRate - 0.05) * 0.15
    }
    const newPrice = ticker.price * (1 + change)
    ticker.price = Number.isFinite(newPrice) ? Math.max(8, newPrice) : ticker.price
    pushHistory(ticker)
    totalChange += change
  }
  state.lastTick = Date.now()
  const count = tickerList.length
  const avg = count > 0 ? totalChange / count : 0
  state.trendDirection = avg > 0.02 ? 'up' : avg < -0.02 ? 'down' : 'flat'
}

export type MacroEventKind = 'rate_hike' | 'rate_cut' | 'bankruptcy' | 'panic' | 'recovery'

export interface MacroTickResult {
  headline: string
  kind?: MacroEventKind
  crash?: boolean
}

export function tickMacro(state: StockState, now: number): MacroTickResult | null {
  if (now - state.lastMacroTick < MACRO_TICK_MS) return null
  state.lastMacroTick = now

  state.marketFear = Math.max(5, Math.min(95, state.marketFear + (Math.random() - 0.48) * 8))

  if (Math.random() < 0.12) {
    const hike = Math.random() < 0.55
    const delta = hike ? 0.005 + Math.random() * 0.01 : -(0.005 + Math.random() * 0.008)
    state.centralBankRate = Math.max(0.02, Math.min(0.14, state.centralBankRate + delta))
    state.macroHeadline = hike
      ? `📈 Merkez bankası faizi yükseltti → %${(state.centralBankRate * 100).toFixed(1)}`
      : `📉 Merkez bankası faizi indirdi → %${(state.centralBankRate * 100).toFixed(1)}`
    for (const t of Object.values(state.tickers)) {
      t.price *= 1 + sectorRateEffect(t.sector, delta) * 0.5
      t.price = Math.max(8, t.price)
      pushHistory(t)
    }
    state.marketFear += hike ? 6 : -5
    return { headline: state.macroHeadline, kind: hike ? 'rate_hike' : 'rate_cut' }
  }

  if (state.marketFear > 62 && Math.random() < 0.18) {
    const ids = STOCK_DEFS.map((d) => d.id)
    const victimId = ids[Math.floor(Math.random() * ids.length)]!
    const victim = state.tickers[victimId]!
    const drop = 0.42 + Math.random() * 0.28
    victim.price = Math.max(8, victim.price * (1 - drop))
    pushHistory(victim)
    state.bankruptTickerId = victimId
    state.bankruptUntil = now + 180_000
    state.marketFear = Math.min(95, state.marketFear + 12)
    state.macroHeadline = `💀 ${victim.name} iflas riski — fiyat %${Math.round(drop * 100)} düştü!`
    return { headline: state.macroHeadline, kind: 'bankruptcy', crash: true }
  }

  if (state.marketFear < 35 && Math.random() < 0.1) {
    state.marketFear = Math.max(10, state.marketFear - 8)
    state.macroHeadline = '🌤️ Piyasalar toparlanıyor — korku endeksi düşüyor'
    return { headline: state.macroHeadline, kind: 'recovery' }
  }

  if (state.marketFear > 70 && Math.random() < 0.15) {
    state.macroHeadline = '😱 Piyasa paniği — volatilite yükseldi'
    return { headline: state.macroHeadline, kind: 'panic', crash: true }
  }

  return null
}

export function startMarketEvent(state: StockState, crash: boolean): void {
  state.marketEventUntil = Date.now() + 120_000
  state.marketEventMult = crash ? -0.45 : 0.32
  state.marketFear = crash
    ? Math.min(95, state.marketFear + 15)
    : Math.max(8, state.marketFear - 10)
  state.macroHeadline = crash ? '📉 Genel piyasa çöküşü başladı!' : '📈 Piyasa rallisi — alıcılar agresif'
}

export function liquidatePortfolio(state: StockState, discount = 1): number {
  let total = 0
  for (const t of Object.values(state.tickers)) {
    if (t.shares <= 0) continue
    total += t.shares * t.price * discount
    t.shares = 0
    t.avgBuyPrice = 0
  }
  return Math.floor(total)
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

export function totalProfitLoss(state: StockState): number {
  return Object.values(state.tickers).reduce((s, t) => s + profitLoss(t), 0)
}

export function priceChangePct(ticker: StockTicker): number {
  if (ticker.history.length < 2) return 0
  const prev = ticker.history[ticker.history.length - 2]!
  if (prev <= 0) return 0
  return ((ticker.price - prev) / prev) * 100
}

export function portfolioSummary(state: StockState): {
  totalValue: number
  totalCost: number
  totalPl: number
  holdings: number
} {
  let totalValue = 0
  let totalCost = 0
  let holdings = 0
  for (const t of Object.values(state.tickers)) {
    if (t.shares <= 0) continue
    holdings++
    totalValue += t.shares * t.price
    totalCost += t.shares * t.avgBuyPrice
  }
  return { totalValue, totalCost, totalPl: totalValue - totalCost, holdings }
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

export function fearLabel(fear: number): string {
  if (fear >= 75) return 'Aşırı korku'
  if (fear >= 55) return 'Temkinli'
  if (fear >= 35) return 'Nötr'
  return 'İyimser'
}

export function isBankruptTicker(state: StockState, tickerId: string): boolean {
  return state.bankruptTickerId === tickerId && Date.now() < state.bankruptUntil
}
