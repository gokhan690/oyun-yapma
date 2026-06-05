import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, fmtMoney, gaugeSvg, demoBanner } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { portfolioValue, type StockTicker } from '../../game/StockMarket'

/* ── Mock (state yokken saf önizleme) ──────────────────────────────────── */
const MOCK_KPI = [
  { icon: '💼', label: 'Portföy', value: '₺58,4M', sub: '3,2%', subDir: 'up' as const },
  { icon: '📊', label: 'Günlük K/Z', value: '+₺1,2M', sub: 'Bugün', subDir: 'up' as const },
  { icon: '🏦', label: 'Nakit', value: '₺42,6M', sub: 'Likit', subDir: 'muted' as const },
  { icon: '⚖️', label: 'Risk', value: 'Orta', sub: 'Dengeli', subDir: 'muted' as const },
]
interface MockStock { name: string; ticker: string; price: number; change: number }
const MOCK_STOCKS: MockStock[] = [
  { name: 'Teknoloji', ticker: 'TECH', price: 128, change: 4.2 },
  { name: 'Enerji', ticker: 'ENRJ', price: 64, change: 1.8 },
  { name: 'Gayrimenkul', ticker: 'GYO', price: 118, change: -2.3 },
  { name: 'Bankacılık', ticker: 'BANK', price: 96, change: 0.7 },
]

function tickerChangePct(t: StockTicker): number {
  const h = t.history
  if (!h || h.length < 2) return 0
  const prev = h[h.length - 2]!
  if (prev === 0) return 0
  return ((t.price - prev) / prev) * 100
}

function spark(up: boolean): string {
  const pts = up ? '0,18 8,12 16,14 24,6 32,8 40,2' : '0,4 8,8 16,6 24,12 32,10 40,16'
  const col = up ? 'var(--r-success)' : 'var(--r-danger)'
  return `<svg viewBox="0 0 40 20" class="ref-spark"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export class RefMarketPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'PİYASA'

  constructor(state?: GameState) {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-market-page'
    if (state) this.buildReal(state)
    else this.buildMock()
  }

  // ── Gerçek veri (GameState borsa/banka/IPO sistemleri) ───────────────
  private buildReal(s: GameState): void {
    const portfolio = Math.round(portfolioValue(s.stock))
    const cash      = Math.round(s.money)
    const netWorth  = Math.round(s.financeNetWorth())
    const loan      = Math.round(s.bank.loan)

    this.el.appendChild(new RefKpiStrip([
      { icon: '💎', label: 'Net Servet', value: fmtMoney(netWorth), sub: 'Toplam', subDir: 'muted' },
      { icon: '💵', label: 'Nakit', value: fmtMoney(cash), sub: 'Likit', subDir: 'muted' },
      { icon: '💼', label: 'Portföy', value: fmtMoney(portfolio), sub: 'Hisse', subDir: portfolio > 0 ? 'up' : 'muted' },
      { icon: '🏦', label: 'Borç', value: loan > 0 ? fmtMoney(loan) : 'Yok', sub: 'Kredi', subDir: loan > 0 ? 'down' : 'muted' },
    ]).el)

    // Piyasa duyarlılığı (marketFear → iyimserlik)
    const fear = Math.round(s.stock.marketFear)
    const optimism = Math.max(0, Math.min(100, 100 - fear))
    const sentColor = optimism >= 60 ? '#28C76F' : optimism >= 40 ? '#FFB02E' : '#EA5455'
    const sentLbl = optimism >= 60 ? 'İyimser' : optimism >= 40 ? 'Nötr' : 'Tedirgin'
    const sent = document.createElement('div')
    sent.className = 'ref-card-soft ref-detail-gauge'
    sent.style.margin = '8px 14px 0'
    sent.innerHTML = `
      <div class="ref-card-soft__title-row">
        <span class="ref-card-soft__title">Piyasa Duyarlılığı</span>
        <span class="ref-sentiment-lbl" style="color:${sentColor}">${sentLbl}</span>
      </div>
      ${gaugeSvg(optimism, sentColor)}
      <div class="ref-market-rate">Merkez Bankası faizi: <b>%${(s.stock.centralBankRate * 100).toFixed(1)}</b></div>`
    this.el.appendChild(sent)

    // Borsa — gerçek tickerlar
    this.el.appendChild(sectionTitle('Borsa', `${Object.keys(s.stock.tickers).length} enstrüman`))
    const tickers = Object.values(s.stock.tickers)
    const list = document.createElement('div')
    list.className = 'ref-stock-list'
    list.innerHTML = tickers.map((t) => {
      const chg = tickerChangePct(t)
      const up = chg >= 0
      const ownedTxt = t.shares > 0 ? `<span class="ref-stock-owned">${t.shares} hisse</span>` : ''
      return `
        <div class="ref-stock-row">
          <div class="ref-stock-id">
            <span class="ref-stock-ticker">${t.emoji} ${t.name}</span>
            <span class="ref-stock-name">${ownedTxt || t.sector}</span>
          </div>
          ${spark(up)}
          <div class="ref-stock-num">
            <span class="ref-stock-price">${fmtMoney(Math.round(t.price))}</span>
            <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span>
          </div>
        </div>`
    }).join('')
    this.el.appendChild(list)

    const stockNote = document.createElement('div')
    stockNote.className = 'ref-preview-note'
    stockNote.textContent = '🔒 Önizleme · Al/Sat işlemleri ana oyun ekranından yapılır'
    this.el.appendChild(stockNote)

    // Banka
    this.el.appendChild(sectionTitle('Banka & Kredi'))
    const bank = document.createElement('div')
    bank.className = 'ref-fin-grid'
    bank.innerHTML = `
      ${this.finCell('💰', 'Mevduat', fmtMoney(Math.round(s.bank.deposit)))}
      ${this.finCell('📜', 'Tahvil', fmtMoney(Math.round(s.bank.bonds)))}
      ${this.finCell('🏦', 'Kredi Borcu', loan > 0 ? fmtMoney(loan) : '—')}
      ${this.finCell('⭐', 'Kredi Notu', String(Math.round(s.bank.creditScore)))}`
    this.el.appendChild(bank)

    // Sigorta
    this.el.appendChild(sectionTitle('Sigorta'))
    const ins = document.createElement('div')
    ins.className = 'ref-fin-grid ins'
    ins.innerHTML = `
      ${this.insCell('🏢', 'İşletme', s.insurance.business)}
      ${this.insCell('🕶️', 'Yasadışı', s.insurance.illegal)}
      ${this.insCell('👨‍👩‍👧', 'Hanedan', s.insurance.dynasty)}`
    this.el.appendChild(ins)

    // IPO / Prestij
    const ipo = s.ipoProgress()
    this.el.appendChild(sectionTitle('IPO / Prestij', `${s.ipoCount} IPO`))
    const ipoCard = document.createElement('div')
    ipoCard.className = 'ref-ipo-card'
    ipoCard.innerHTML = `
      <div class="ref-ipo-card__row">
        <span>📈 Prestij Puanı</span><b>${s.prestigePoints}</b>
      </div>
      <div class="ref-ipo-card__row">
        <span>Sonraki IPO eşiği</span>
        <b class="${ipo.ready ? 'ready' : ''}">${ipo.ready ? 'HAZIR' : `%${Math.round(ipo.pct)}`}</b>
      </div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${ipo.ready ? 'high' : 'medium'}" style="width:${Math.round(ipo.pct)}%"></div></div>
      <div class="ref-ipo-card__meta">${fmtMoney(Math.round(ipo.current))} / ${fmtMoney(Math.round(ipo.target))} toplam kazanç</div>`
    this.el.appendChild(ipoCard)
  }

  private finCell(ico: string, label: string, value: string): string {
    return `<div class="ref-fin-cell"><span class="ref-fin-cell__ico">${ico}</span><span class="ref-fin-cell__lbl">${label}</span><b class="ref-fin-cell__val">${value}</b></div>`
  }
  private insCell(ico: string, label: string, active: boolean): string {
    return `<div class="ref-fin-cell ins ${active ? 'on' : 'off'}"><span class="ref-fin-cell__ico">${ico}</span><span class="ref-fin-cell__lbl">${label}</span><b class="ref-fin-cell__val">${active ? '✓ Aktif' : 'Pasif'}</b></div>`
  }

  // ── Mock (state yok) ─────────────────────────────────────────────────
  private buildMock(): void {
    this.el.appendChild(demoBanner('borsa/portföy önizleme — gerçek oyun verisi yok'))
    this.el.appendChild(new RefKpiStrip(MOCK_KPI).el)

    const sent = document.createElement('div')
    sent.className = 'ref-card-soft ref-detail-gauge'
    sent.style.margin = '8px 14px 0'
    sent.innerHTML = `
      <div class="ref-card-soft__title">Piyasa Duyarlılığı</div>
      ${gaugeSvg(68, '#28C76F')}
      <div class="ref-sentiment-lbl">İyimser</div>`
    this.el.appendChild(sent)

    this.el.appendChild(sectionTitle('Borsa', 'Demo'))
    const list = document.createElement('div')
    list.className = 'ref-stock-list'
    list.innerHTML = MOCK_STOCKS.map(s => {
      const up = s.change >= 0
      return `
        <div class="ref-stock-row">
          <div class="ref-stock-id">
            <span class="ref-stock-ticker">${s.ticker}</span>
            <span class="ref-stock-name">${s.name}</span>
          </div>
          ${spark(up)}
          <div class="ref-stock-num">
            <span class="ref-stock-price">${fmtMoney(s.price)}</span>
            <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(s.change).toFixed(1)}%</span>
          </div>
        </div>`
    }).join('')
    this.el.appendChild(list)

    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = '🔒 Önizleme modu · Al/Sat işlem yapmaz'
    this.el.appendChild(note)
  }
}
