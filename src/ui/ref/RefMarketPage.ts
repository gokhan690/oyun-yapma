import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { sectionTitle, fmtMoney, gaugeSvg, demoBanner, refToast } from './refShared'
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

  private state?: GameState
  private kpiStrip?: RefKpiStrip
  private sentCard?: HTMLElement
  private stockList?: HTMLElement
  private bankGrid?: HTMLElement
  private ipoCard?: HTMLElement
  private lastSentSig = ''
  private lastStockSig = ''
  private lastBankSig = ''
  private lastIpoSig = ''

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-market-page'
    if (state) this.buildReal(state)
    else this.buildMock()
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  // ── Gerçek veri (GameState borsa/banka/IPO sistemleri) ───────────────
  private buildReal(s: GameState): void {
    this.kpiStrip = new RefKpiStrip(this.buildKpis(s))
    this.el.appendChild(this.kpiStrip.el)

    // Piyasa duyarlılığı (marketFear → iyimserlik)
    this.sentCard = document.createElement('div')
    this.sentCard.className = 'ref-card-soft ref-detail-gauge'
    this.sentCard.style.margin = '8px 14px 0'
    this.sentCard.innerHTML = this.sentHtml(s)
    this.el.appendChild(this.sentCard)

    // Borsa — gerçek tickerlar
    this.el.appendChild(sectionTitle('Borsa', `${Object.keys(s.stock.tickers).length} enstrüman`))
    this.stockList = document.createElement('div')
    this.stockList.className = 'ref-stock-list'
    this.stockList.innerHTML = this.stockHtml(s)
    this.el.appendChild(this.stockList)

    const stockNote = document.createElement('div')
    stockNote.className = 'ref-preview-note'
    stockNote.textContent = '🔒 Önizleme · Al/Sat işlemleri ana oyun ekranından yapılır'
    this.el.appendChild(stockNote)

    // Banka — canlı değerler + hızlı işlemler
    this.el.appendChild(sectionTitle('Banka & Kredi'))
    this.bankGrid = document.createElement('div')
    this.bankGrid.innerHTML = this.bankHtml(s)
    this.el.appendChild(this.bankGrid)

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
    this.el.appendChild(sectionTitle('IPO / Prestij', `${s.ipoCount} IPO`))
    this.ipoCard = document.createElement('div')
    this.ipoCard.className = 'ref-ipo-card'
    this.ipoCard.innerHTML = this.ipoHtml(s)
    this.el.appendChild(this.ipoCard)

    // Açılış imzaları (ilk refresh'te gereksiz rebuild olmasın)
    this.lastSentSig  = this.sentSig(s)
    this.lastStockSig = this.stockSig(s)
    this.lastBankSig  = this.bankSig(s)
    this.lastIpoSig   = this.ipoSig(s)
  }

  /* ── Parça üreticiler + imzalar ── */

  private buildKpis(s: GameState): KpiItem[] {
    const portfolio = Math.round(portfolioValue(s.stock))
    const cash      = Math.round(s.money)
    const netWorth  = Math.round(s.financeNetWorth())
    const loan      = Math.round(s.bank.loan)
    return [
      { icon: '💎', label: 'Net Servet', value: fmtMoney(netWorth), sub: 'Toplam', subDir: 'muted' },
      { icon: '💵', label: 'Nakit', value: fmtMoney(cash), sub: 'Likit', subDir: 'muted' },
      { icon: '💼', label: 'Portföy', value: fmtMoney(portfolio), sub: 'Hisse', subDir: portfolio > 0 ? 'up' : 'muted' },
      { icon: '🏦', label: 'Borç', value: loan > 0 ? fmtMoney(loan) : 'Yok', sub: 'Kredi', subDir: loan > 0 ? 'down' : 'muted' },
    ]
  }

  private sentSig(s: GameState): string {
    return `${Math.round(s.stock.marketFear)}|${(s.stock.centralBankRate * 100).toFixed(1)}`
  }

  private sentHtml(s: GameState): string {
    const fear = Math.round(s.stock.marketFear)
    const optimism = Math.max(0, Math.min(100, 100 - fear))
    const sentColor = optimism >= 60 ? '#28C76F' : optimism >= 40 ? '#FFB02E' : '#EA5455'
    const sentLbl = optimism >= 60 ? 'İyimser' : optimism >= 40 ? 'Nötr' : 'Tedirgin'
    return `
      <div class="ref-card-soft__title-row">
        <span class="ref-card-soft__title">Piyasa Duyarlılığı</span>
        <span class="ref-sentiment-lbl" style="color:${sentColor}">${sentLbl}</span>
      </div>
      ${gaugeSvg(optimism, sentColor)}
      <div class="ref-market-rate">Merkez Bankası faizi: <b>%${(s.stock.centralBankRate * 100).toFixed(1)}</b></div>`
  }

  private stockSig(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => `${Math.round(t.price)}:${t.shares}`).join('|')
  }

  private stockHtml(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => {
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
  }

  private bankSig(s: GameState): string {
    return `${Math.round(s.bank.deposit)}|${Math.round(s.bank.bonds)}|${Math.round(s.bank.loan)}|${Math.round(s.bank.creditScore)}|${Math.round(s.maxAvailableLoan())}`
  }

  private bankHtml(s: GameState): string {
    const loan = Math.round(s.bank.loan)
    const deposit = Math.round(s.bank.deposit)
    const maxLoanAvail = Math.round(s.maxAvailableLoan())
    return `
      <div class="ref-fin-grid">
        ${this.finCell('💰', 'Mevduat', fmtMoney(deposit))}
        ${this.finCell('📜', 'Tahvil', fmtMoney(Math.round(s.bank.bonds)))}
        ${this.finCell('🏦', 'Kredi Borcu', loan > 0 ? fmtMoney(loan) : '—')}
        ${this.finCell('⭐', 'Kredi Notu', String(Math.round(s.bank.creditScore)))}
      </div>
      <div class="ref-bank-actions">
        <button class="ref-bank-btn deposit" type="button" data-bank="deposit">💰 Yatır (¼ nakit)</button>
        <button class="ref-bank-btn withdraw" type="button" data-bank="withdraw" ${deposit <= 0 ? 'disabled' : ''}>↩️ Çek (tümü)</button>
        <button class="ref-bank-btn loan" type="button" data-bank="loan_take" ${maxLoanAvail < 1_000 ? 'disabled' : ''}>🏦 Kredi Çek (${fmtMoney(Math.floor(maxLoanAvail / 2))})</button>
        <button class="ref-bank-btn repay" type="button" data-bank="loan_repay" ${loan <= 0 ? 'disabled' : ''}>✅ Borç Öde</button>
      </div>`
  }

  private ipoSig(s: GameState): string {
    const ipo = s.ipoProgress()
    return `${s.prestigePoints}|${s.ipoCount}|${Math.round(ipo.pct)}|${ipo.ready}`
  }

  private ipoHtml(s: GameState): string {
    const ipo = s.ipoProgress()
    return `
      <div class="ref-ipo-card__row">
        <span>📈 Prestij Puanı</span><b>${s.prestigePoints}</b>
      </div>
      <div class="ref-ipo-card__row">
        <span>Sonraki IPO eşiği</span>
        <b class="${ipo.ready ? 'ready' : ''}">${ipo.ready ? 'HAZIR' : `%${Math.round(ipo.pct)}`}</b>
      </div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${ipo.ready ? 'high' : 'medium'}" style="width:${Math.round(ipo.pct)}%"></div></div>
      <div class="ref-ipo-card__meta">${fmtMoney(Math.round(ipo.current))} / ${fmtMoney(Math.round(ipo.target))} toplam kazanç</div>`
  }

  /* ── Canlı tazeleme: yalnız imzası değişen blok yeniden kurulur ── */
  refresh(state: GameState): void {
    this.state = state
    if (!this.kpiStrip) return  // mock modda canlı veri yok

    this.kpiStrip.update(this.buildKpis(state))

    const sSig = this.sentSig(state)
    if (sSig !== this.lastSentSig && this.sentCard) {
      this.lastSentSig = sSig
      this.sentCard.innerHTML = this.sentHtml(state)
    }
    const stSig = this.stockSig(state)
    if (stSig !== this.lastStockSig && this.stockList) {
      this.lastStockSig = stSig
      this.stockList.innerHTML = this.stockHtml(state)
    }
    const bSig = this.bankSig(state)
    if (bSig !== this.lastBankSig && this.bankGrid) {
      this.lastBankSig = bSig
      this.bankGrid.innerHTML = this.bankHtml(state)
    }
    const iSig = this.ipoSig(state)
    if (iSig !== this.lastIpoSig && this.ipoCard) {
      this.lastIpoSig = iSig
      this.ipoCard.innerHTML = this.ipoHtml(state)
    }
  }

  /* ── Banka hızlı işlemleri (GameState public API — ekonomi mantığına dokunmaz) ── */
  private handleClick(e: MouseEvent): void {
    const s = this.state
    if (!s) return
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-bank]')
    if (!btn || btn.disabled) return

    switch (btn.dataset.bank) {
      case 'deposit': {
        const amount = Math.floor(s.money * 0.25)
        if (amount < 100) { refToast('💸 Yatıracak yeterli nakit yok', 'err'); return }
        const ok = s.bankDeposit(amount)
        refToast(ok ? `💰 ${fmtMoney(amount)} mevduata yatırıldı` : '💸 İşlem başarısız', ok ? 'ok' : 'err')
        break
      }
      case 'withdraw': {
        const amount = Math.floor(s.bank.deposit)
        if (amount <= 0) return
        const ok = s.bankWithdraw(amount)
        refToast(ok ? `↩️ ${fmtMoney(amount)} çekildi` : 'İşlem başarısız', ok ? 'ok' : 'err')
        break
      }
      case 'loan_take': {
        const amount = Math.floor(s.maxAvailableLoan() / 2)
        if (amount < 1_000) { refToast('Kredi limitin yetersiz', 'err'); return }
        const ok = s.bankTakeLoan(amount)
        refToast(ok ? `🏦 ${fmtMoney(amount)} kredi çekildi` : '⛔ Banka krediyi reddetti (itibar düşük olabilir)', ok ? 'ok' : 'err')
        break
      }
      case 'loan_repay': {
        const amount = Math.min(Math.floor(s.bank.loan), Math.floor(s.money))
        if (amount <= 0) { refToast('💸 Ödeyecek nakit yok', 'err'); return }
        const ok = s.bankRepayLoan(amount)
        refToast(ok ? `✅ ${fmtMoney(amount)} borç ödendi` : 'İşlem başarısız', ok ? 'ok' : 'err')
        break
      }
    }
    // İşlem sonrası anında tazele (throttle bekletme)
    this.refresh(s)
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
