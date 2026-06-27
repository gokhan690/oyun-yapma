import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { RefSubTabs } from './RefSubTabs'
import { sectionTitle, fmtMoney, fmtMoneyTrim, gaugeSvg, demoBanner, refToast, registerSheetDismiss } from './refShared'
import { i18n, fmt } from '../../i18n'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import {
  portfolioValue, type StockTicker, stockTickerName,
  portfolioSummary, fearLabel,
  previewStockBuy, previewStockSell, profitLoss,
} from '../../game/StockMarket'

/* ── Mock (state yokken saf önizleme) ──────────────────────────────────── */
function buildMockKpi(): KpiItem[] {
  return [
    { icon: '💼', label: i18n.t('ref_market_mock_portfolio'), value: '₺58,4M', sub: '3,2%', subDir: 'up' as const },
    { icon: '📊', label: i18n.t('ref_market_mock_daily_pnl'), value: '+₺1,2M', sub: i18n.t('ref_market_mock_today'), subDir: 'up' as const },
    { icon: '🏦', label: i18n.t('ref_market_mock_cash'),      value: '₺42,6M', sub: i18n.t('ref_market_kpi_liquid_sub'), subDir: 'muted' as const },
    { icon: '⚖️', label: i18n.t('ref_market_mock_risk'),      value: i18n.t('ref_market_mock_medium'), sub: i18n.t('ref_market_mock_balanced'), subDir: 'muted' as const },
  ]
}
interface MockStock { nameKey: 'ref_market_mock_tech' | 'ref_market_mock_energy' | 'ref_market_mock_real_estate' | 'ref_market_mock_banking'; ticker: string; price: number; change: number }
const MOCK_STOCKS: MockStock[] = [
  { nameKey: 'ref_market_mock_tech',        ticker: 'TECH', price: 128, change: 4.2 },
  { nameKey: 'ref_market_mock_energy',      ticker: 'ENRJ', price: 64,  change: 1.8 },
  { nameKey: 'ref_market_mock_real_estate', ticker: 'GYO',  price: 118, change: -2.3 },
  { nameKey: 'ref_market_mock_banking',     ticker: 'BANK', price: 96,  change: 0.7 },
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
  get title() { return i18n.t('ref_market_title') }

  private state?: GameState
  private kpiStrip?: RefKpiStrip
  private tabs?: RefSubTabs
  private sentCard?: HTMLElement
  private portfolioCard?: HTMLElement
  private stockList?: HTMLElement
  private bankGrid?: HTMLElement
  private insGrid?: HTMLElement
  private ipoCard?: HTMLElement
  private lastSentSig = ''
  private lastPortfolioSig = ''
  private lastStockSig = ''
  private lastBankSig = ''
  private lastInsSig = ''
  private lastIpoSig = ''
  private ipoConfirming = false
  private ipoConfirmTimer: number | null = null

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-market-page'
    if (state) this.buildReal(state)
    else this.buildMock()
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  // ── Gerçek veri (GameState borsa/banka/IPO sistemleri) ───────────────
  // Alt sekmeler: 📈 Borsa | 🏦 Banka | 🛡️ Sigorta & IPO — KPI üstte sabit.
  private buildReal(s: GameState): void {
    this.kpiStrip = new RefKpiStrip(this.buildKpis(s))
    this.el.appendChild(this.kpiStrip.el)

    this.tabs = new RefSubTabs([
      { id: 'stocks', label: i18n.t('ref_market_tab_stocks'),    icon: '📈' },
      { id: 'bank',   label: i18n.t('ref_market_tab_bank'),      icon: '🏦' },
      { id: 'ins',    label: i18n.t('ref_market_tab_insurance'), icon: '🛡️' },
    ])
    this.el.appendChild(this.tabs.tabsEl)
    const secStocks = this.tabs.section('stocks')
    const secBank = this.tabs.section('bank')
    const secIns = this.tabs.section('ins')
    this.el.appendChild(secStocks)
    this.el.appendChild(secBank)
    this.el.appendChild(secIns)

    // ── 📈 Borsa: kompakt piyasa nabzı + portföy özeti + tickerlar ──
    // Sıra: nabız → portföy → hisse listesi (TUR14 P6).
    this.sentCard = document.createElement('div')
    this.sentCard.className = 'ref-pulse-strip'
    this.sentCard.innerHTML = this.pulseHtml(s)
    secStocks.appendChild(this.sentCard)

    this.portfolioCard = document.createElement('div')
    this.portfolioCard.className = 'ref-portfolio-card'
    this.portfolioCard.innerHTML = this.portfolioHtml(s)
    secStocks.appendChild(this.portfolioCard)

    secStocks.appendChild(sectionTitle(i18n.t('ref_market_stock_exchange_title'), fmt('ref_market_instruments_fmt', { count: String(Object.keys(s.stock.tickers).length) })))
    this.stockList = document.createElement('div')
    this.stockList.className = 'ref-stock-list'
    this.stockList.innerHTML = this.stockHtml(s)
    secStocks.appendChild(this.stockList)

    // ── 🏦 Banka: canlı değerler + hızlı işlemler ──
    secBank.appendChild(sectionTitle(i18n.t('ref_market_bank_title')))
    this.bankGrid = document.createElement('div')
    this.bankGrid.innerHTML = this.bankHtml(s)
    secBank.appendChild(this.bankGrid)

    // ── 🛡️ Sigorta & IPO ──
    secIns.appendChild(sectionTitle(i18n.t('ref_market_insurance_title')))
    this.insGrid = document.createElement('div')
    this.insGrid.className = 'ref-fin-grid ins'
    this.insGrid.innerHTML = this.insGridHtml(s)
    secIns.appendChild(this.insGrid)

    secIns.appendChild(sectionTitle(i18n.t('ref_market_ipo_title'), `${s.ipoCount} IPO`))
    this.ipoCard = document.createElement('div')
    this.ipoCard.className = 'ref-ipo-card'
    this.ipoCard.innerHTML = this.ipoHtml(s)
    secIns.appendChild(this.ipoCard)

    // Açılış imzaları (ilk refresh'te gereksiz rebuild olmasın)
    this.lastSentSig  = this.sentSig(s)
    this.lastPortfolioSig = this.portfolioSig(s)
    this.lastStockSig = this.stockSig(s)
    this.lastBankSig  = this.bankSig(s)
    this.lastInsSig   = this.insSig(s)
    this.lastIpoSig   = this.ipoSig(s)
  }

  /* ── Parça üreticiler + imzalar ── */

  private buildKpis(s: GameState): KpiItem[] {
    const portfolio = Math.round(portfolioValue(s.stock))
    const cash      = Math.round(s.money)
    const netWorth  = Math.round(s.financeNetWorth())
    const loan      = Math.round(s.bank.loan)
    return [
      { icon: '💎', label: i18n.t('ref_market_kpi_net_worth'), value: fmtMoney(netWorth), sub: i18n.t('ref_market_kpi_total_sub'), subDir: 'muted' },
      { icon: '💵', label: i18n.t('ref_market_kpi_cash'),      value: fmtMoney(cash),     sub: i18n.t('ref_market_kpi_liquid_sub'), subDir: 'muted' },
      { icon: '💼', label: i18n.t('ref_market_kpi_portfolio'), value: fmtMoney(portfolio), sub: i18n.t('ref_market_kpi_shares_sub'), subDir: portfolio > 0 ? 'up' : 'muted' },
      { icon: '🏦', label: i18n.t('ref_market_kpi_loan'),      value: loan > 0 ? fmtMoney(loan) : i18n.t('ref_market_kpi_no_loan'), sub: i18n.t('ref_market_kpi_credit_sub'), subDir: loan > 0 ? 'down' : 'muted' },
    ]
  }

  private sentSig(s: GameState): string {
    return `${Math.round(s.stock.marketFear)}|${(s.stock.centralBankRate * 100).toFixed(1)}|${s.stock.macroHeadline}`
  }

  /** Kompakt "Piyasa Nabzı" şeridi: nabız (iyimserlik/korku) + merkez bankası + son haber. */
  private pulseHtml(s: GameState): string {
    const fear = Math.round(s.stock.marketFear)
    const optimism = Math.max(0, Math.min(100, 100 - fear))
    const dir = s.stock.trendDirection
    const pulseColor = optimism >= 60 ? '#28C76F' : optimism >= 40 ? '#FFB02E' : '#EA5455'
    const pulseLbl = optimism >= 60 ? i18n.t('ref_market_sentiment_optimistic') : optimism >= 40 ? i18n.t('ref_market_sentiment_neutral') : i18n.t('ref_market_sentiment_fearful')
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '◆'
    return `
      <div class="ref-pulse-item">
        <span class="ref-pulse-lbl">${i18n.t('ref_market_pulse_title')}</span>
        <span class="ref-pulse-val" style="color:${pulseColor}">
          <span class="ref-pulse-dot" style="background:${pulseColor}"></span>${arrow} ${pulseLbl}
        </span>
        <span class="ref-pulse-sub">${fmt('ref_market_pulse_fear_fmt', { label: fearLabel(s.stock.marketFear), value: String(fear) })}</span>
      </div>
      <div class="ref-pulse-item">
        <span class="ref-pulse-lbl">${i18n.t('ref_market_pulse_central_bank')}</span>
        <span class="ref-pulse-val">${(s.stock.centralBankRate * 100).toFixed(1)}%</span>
      </div>
      <div class="ref-pulse-news">📰 ${s.stock.macroHeadline}</div>`
  }

  private portfolioSig(s: GameState): string {
    const sum = portfolioSummary(s.stock)
    return `${Math.round(sum.totalValue)}|${Math.round(sum.totalCost)}|${Math.round(sum.totalPl)}|${sum.holdings}|${Math.round(s.money)}`
  }

  /** Portföy özeti: değer / maliyet / gerçekleşmemiş K/Z / nakit / varlık sayısı. */
  private portfolioHtml(s: GameState): string {
    const sum = portfolioSummary(s.stock)
    const plDir = sum.totalPl > 0 ? 'up' : sum.totalPl < 0 ? 'down' : 'muted'
    const plSign = sum.totalPl > 0 ? '+' : ''
    const plPct = sum.totalCost > 0 ? (sum.totalPl / sum.totalCost) * 100 : 0
    return `
      <div class="ref-portfolio-card__head">
        <span class="ref-portfolio-card__title">${i18n.t('ref_market_portfolio_title')}</span>
        <span class="ref-portfolio-card__assets">${fmt('ref_market_portfolio_assets_fmt', { count: String(sum.holdings) })}</span>
      </div>
      <div class="ref-portfolio-grid">
        <div class="ref-portfolio-cell"><span>${i18n.t('ref_market_portfolio_value')}</span><b>${fmtMoney(Math.round(sum.totalValue))}</b></div>
        <div class="ref-portfolio-cell"><span>${i18n.t('ref_market_portfolio_cost')}</span><b>${fmtMoney(Math.round(sum.totalCost))}</b></div>
        <div class="ref-portfolio-cell"><span>${i18n.t('ref_market_portfolio_unrealized')}</span><b class="ref-pl-${plDir}">${plSign}${fmtMoney(Math.round(sum.totalPl))} (${plSign}${plPct.toFixed(1)}%)</b></div>
        <div class="ref-portfolio-cell"><span>${i18n.t('ref_market_portfolio_cash')}</span><b>${fmtMoney(Math.round(s.money))}</b></div>
      </div>`
  }

  private stockSig(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => `${Math.round(t.price)}:${t.shares}`).join('|')
  }

  private stockHtml(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => {
      const chg = tickerChangePct(t)
      const up = chg >= 0
      const pl = profitLoss(t)
      const ownedTxt = t.shares > 0
        ? `<span class="ref-stock-owned">${fmt('ref_market_shares_owned_fmt', { count: String(t.shares) })} · <span class="ref-pl-${pl > 0 ? 'up' : pl < 0 ? 'down' : 'muted'}">${pl >= 0 ? '+' : ''}${fmtMoney(Math.round(pl))}</span></span>`
        : ''
      // Tüm satır dokunmatik: alım/satım paneli (bottom sheet) açar — basit 1-hisse butonu yerine.
      return `
        <button class="ref-stock-row" type="button" data-stock-trade="${t.id}">
          <div class="ref-stock-id">
            <span class="ref-stock-ticker">${t.emoji} ${stockTickerName(t.id)}</span>
            <span class="ref-stock-name">${ownedTxt || t.sector}</span>
          </div>
          ${spark(up)}
          <div class="ref-stock-num">
            <span class="ref-stock-price">${fmtMoney(Math.round(t.price))}</span>
            <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span>
          </div>
          <span class="ref-stock-chevron">›</span>
        </button>`
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
        ${this.finCell('💰', i18n.t('ref_market_deposit_label'), fmtMoney(deposit))}
        ${this.finCell('📜', i18n.t('ref_market_bonds_label'), fmtMoney(Math.round(s.bank.bonds)))}
        ${this.finCell('🏦', i18n.t('ref_market_loan_debt_label'), loan > 0 ? fmtMoney(loan) : '—')}
        ${this.finCell('⭐', i18n.t('ref_market_credit_score_label'), String(Math.round(s.bank.creditScore)))}
      </div>
      <div class="ref-bank-actions">
        <button class="ref-bank-btn deposit" type="button" data-bank="deposit">${i18n.t('ref_market_deposit_action_btn')}</button>
        <button class="ref-bank-btn withdraw" type="button" data-bank="withdraw" ${deposit <= 0 ? 'disabled' : ''}>${i18n.t('ref_market_withdraw_action_btn')}</button>
        <button class="ref-bank-btn loan" type="button" data-bank="loan_take" ${maxLoanAvail < 1_000 ? 'disabled' : ''}>${fmt('ref_market_loan_take_action_fmt', { cost: fmtMoney(Math.floor(maxLoanAvail / 2)) })}</button>
        <button class="ref-bank-btn repay" type="button" data-bank="loan_repay" ${loan <= 0 ? 'disabled' : ''}>${i18n.t('ref_market_loan_repay_action_btn')}</button>
      </div>`
  }

  private insSig(s: GameState): string {
    return `${s.insurance.business}|${s.insurance.illegal}|${s.insurance.dynasty}`
  }

  private insGridHtml(s: GameState): string {
    return `
      ${this.insCell('🏢', i18n.t('ref_market_insurance_business'), 'business', s.insurance.business)}
      ${this.insCell('🕶️', i18n.t('ref_market_insurance_illegal'), 'illegal', s.insurance.illegal)}
      ${this.insCell('👨‍👩‍👧', i18n.t('ref_market_insurance_dynasty'), 'dynasty', s.insurance.dynasty)}`
  }

  private ipoSig(s: GameState): string {
    const ipo = s.ipoProgress()
    return `${s.prestigePoints}|${s.ipoCount}|${Math.round(ipo.pct)}|${ipo.ready}|${this.ipoConfirming}`
  }

  private ipoHtml(s: GameState): string {
    const ipo = s.ipoProgress()
    const pending = s.pendingPrestigePoints()
    const btnLabel = this.ipoConfirming ? i18n.t('ref_market_ipo_confirm_btn') : i18n.t('ref_market_ipo_start_btn')
    const btnAction = this.ipoConfirming ? 'confirm2' : 'confirm1'
    const btnClass = `ref-ipo-confirm-btn${this.ipoConfirming ? ' confirming' : ''}`
    return `
      <div class="ref-ipo-card__row">
        <span>${i18n.t('ref_market_prestige_points_label')}</span><b>${s.prestigePoints}</b>
      </div>
      <div class="ref-ipo-card__row">
        <span>${i18n.t('ref_market_ipo_gain_label')}</span><b>${fmt('ref_market_ipo_pending_pts_fmt', { count: String(pending) })}</b>
      </div>
      <div class="ref-ipo-card__row">
        <span>${i18n.t('ref_market_ipo_next_threshold')}</span>
        <b class="${ipo.ready ? 'ready' : ''}">${ipo.ready ? i18n.t('ref_market_ipo_ready_badge') : `${Math.round(ipo.pct)}%`}</b>
      </div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${ipo.ready ? 'high' : 'medium'}" style="width:${Math.round(ipo.pct)}%"></div></div>
      <div class="ref-ipo-card__meta">${fmt('ref_market_ipo_total_earnings_fmt', { current: fmtMoney(Math.round(ipo.current)), target: fmtMoney(Math.round(ipo.target)) })}</div>
      <button class="${btnClass}" type="button" data-ipo-action="${btnAction}" ${ipo.ready ? '' : 'disabled'}>${btnLabel}</button>`
  }

  /* ── Canlı tazeleme: yalnız imzası değişen blok yeniden kurulur ── */
  refresh(state: GameState): void {
    this.state = state
    if (!this.kpiStrip) return  // mock modda canlı veri yok

    this.kpiStrip.update(this.buildKpis(state))

    const sSig = this.sentSig(state)
    if (sSig !== this.lastSentSig && this.sentCard) {
      this.lastSentSig = sSig
      this.sentCard.innerHTML = this.pulseHtml(state)
    }
    const pSig = this.portfolioSig(state)
    if (pSig !== this.lastPortfolioSig && this.portfolioCard) {
      this.lastPortfolioSig = pSig
      this.portfolioCard.innerHTML = this.portfolioHtml(state)
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
    const insSig = this.insSig(state)
    if (insSig !== this.lastInsSig && this.insGrid) {
      this.lastInsSig = insSig
      this.insGrid.innerHTML = this.insGridHtml(state)
    }
    const iSig = this.ipoSig(state)
    if (iSig !== this.lastIpoSig && this.ipoCard) {
      this.lastIpoSig = iSig
      this.ipoCard.innerHTML = this.ipoHtml(state)
    }
  }

  /* ── Hızlı işlemler (GameState public API — ekonomi mantığına dokunmaz) ── */
  private handleClick(e: MouseEvent): void {
    const s = this.state
    if (!s) return
    const el = e.target as HTMLElement

    // ── Borsa: hisse satırı → alım/satım paneli (bottom sheet) ──
    const tradeBtn = el.closest<HTMLButtonElement>('[data-stock-trade]')
    if (tradeBtn) {
      this.openTradePanel(s, tradeBtn.dataset.stockTrade!)
      return
    }

    // ── Sigorta toggle ──
    const insBtn = el.closest<HTMLButtonElement>('[data-ins-toggle]')
    if (insBtn && !insBtn.disabled) {
      const kind = insBtn.dataset.insToggle as 'business' | 'illegal' | 'dynasty'
      s.toggleInsurance(kind)
      const nowActive = s.insurance[kind]
      refToast(nowActive ? i18n.t('ref_market_insurance_activated') : i18n.t('ref_market_insurance_deactivated'), 'ok')
      this.refresh(s)
      return
    }

    // ── IPO çift onay ──
    const ipoBtn = el.closest<HTMLButtonElement>('[data-ipo-action]')
    if (ipoBtn && !ipoBtn.disabled) {
      if (ipoBtn.dataset.ipoAction === 'confirm1') {
        this.ipoConfirming = true
        if (this.ipoConfirmTimer !== null) window.clearTimeout(this.ipoConfirmTimer)
        this.ipoConfirmTimer = window.setTimeout(() => {
          this.ipoConfirming = false
          this.ipoConfirmTimer = null
          if (this.ipoCard && this.state) this.ipoCard.innerHTML = this.ipoHtml(this.state)
        }, 5000)
        if (this.ipoCard) this.ipoCard.innerHTML = this.ipoHtml(s)
        return
      }
      if (ipoBtn.dataset.ipoAction === 'confirm2') {
        if (this.ipoConfirmTimer !== null) { window.clearTimeout(this.ipoConfirmTimer); this.ipoConfirmTimer = null }
        this.ipoConfirming = false
        const pts = s.doPrestige()
        refToast(pts > 0 ? fmt('ref_market_toast_ipo_done_fmt', { pts: String(pts) }) : i18n.t('ref_market_toast_ipo_failed'), pts > 0 ? 'ok' : 'err')
        this.refresh(s)
        return
      }
    }

    // ── Banka işlemleri ──
    const bankBtn = el.closest<HTMLButtonElement>('[data-bank]')
    if (!bankBtn || bankBtn.disabled) return

    switch (bankBtn.dataset.bank) {
      case 'deposit': {
        const amount = Math.floor(s.money * 0.25)
        if (amount < 100) { refToast(i18n.t('ref_market_toast_no_deposit_cash'), 'err'); return }
        const ok = s.bankDeposit(amount)
        refToast(ok ? fmt('ref_market_toast_deposited_fmt', { amount: fmtMoney(amount) }) : i18n.t('ref_market_toast_action_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'withdraw': {
        const amount = Math.floor(s.bank.deposit)
        if (amount <= 0) return
        const ok = s.bankWithdraw(amount)
        refToast(ok ? fmt('ref_market_toast_withdrew_fmt', { amount: fmtMoney(amount) }) : i18n.t('ref_market_toast_action_failed'), ok ? 'ok' : 'err')
        break
      }
      case 'loan_take': {
        const amount = Math.floor(s.maxAvailableLoan() / 2)
        if (amount < 1_000) { refToast(i18n.t('ref_market_toast_no_credit'), 'err'); return }
        const ok = s.bankTakeLoan(amount)
        refToast(ok ? fmt('ref_market_toast_loan_taken_fmt', { amount: fmtMoney(amount) }) : i18n.t('ref_market_toast_bank_rejected'), ok ? 'ok' : 'err')
        break
      }
      case 'loan_repay': {
        const amount = Math.min(Math.floor(s.bank.loan), Math.floor(s.money))
        if (amount <= 0) { refToast(i18n.t('ref_market_toast_no_repay_cash'), 'err'); return }
        const ok = s.bankRepayLoan(amount)
        refToast(ok ? fmt('ref_market_toast_repaid_fmt', { amount: fmtMoney(amount) }) : i18n.t('ref_market_toast_action_failed'), ok ? 'ok' : 'err')
        break
      }
    }
    // İşlem sonrası anında tazele (throttle bekletme)
    this.refresh(s)
  }

  private finCell(ico: string, label: string, value: string): string {
    return `<div class="ref-fin-cell"><span class="ref-fin-cell__ico">${ico}</span><span class="ref-fin-cell__lbl">${label}</span><b class="ref-fin-cell__val">${value}</b></div>`
  }
  private insCell(ico: string, label: string, kind: string, active: boolean): string {
    const toggleLbl = active ? i18n.t('ref_market_ins_toggle_off') : i18n.t('ref_market_ins_toggle_on')
    return `<div class="ref-fin-cell ins ${active ? 'on' : 'off'}">
      <span class="ref-fin-cell__ico">${ico}</span>
      <span class="ref-fin-cell__lbl">${label}</span>
      <b class="ref-fin-cell__val">${active ? i18n.t('ref_market_ins_active_label') : i18n.t('ref_market_ins_inactive_label')}</b>
      <button class="ref-ins-toggle-btn" type="button" data-ins-toggle="${kind}">${toggleLbl}</button>
    </div>`
  }

  /* ── TUR14 P7: Alım/satım paneli (bottom sheet) ── */
  private tradeOverlay: HTMLElement | null = null
  private tradeDismiss: (() => void) | null = null
  private tradeBusy = false

  private closeTradePanel(): void {
    if (this.tradeOverlay) {
      this.tradeOverlay.remove()
      this.tradeOverlay = null
    }
    this.tradeDismiss?.(); this.tradeDismiss = null
    this.tradeBusy = false
  }

  private resolveTradeQty(s: GameState, tickerId: string, mode: 'buy' | 'sell', key: string): number {
    const t = s.stock.tickers[tickerId]
    if (!t) return 0
    if (mode === 'buy') {
      const maxAff = Math.floor(s.money / (t.price * 1.01))
      if (key === '1') return Math.min(1, maxAff)
      if (key === '10') return Math.min(10, maxAff)
      if (key === '25') return Math.floor(maxAff * 0.25)
      if (key === '50') return Math.floor(maxAff * 0.5)
      if (key === 'max') return maxAff
    } else {
      const owned = t.shares
      if (key === '1') return Math.min(1, owned)
      if (key === '10') return Math.min(10, owned)
      if (key === '25') return Math.floor(owned * 0.25)
      if (key === '50') return Math.floor(owned * 0.5)
      if (key === 'max') return owned
    }
    return 0
  }

  private openTradePanel(s: GameState, tickerId: string): void {
    this.closeTradePanel()
    const ticker = s.stock.tickers[tickerId]
    if (!ticker) return
    let mode: 'buy' | 'sell' = 'buy'
    let qty = Math.min(1, Math.floor(s.money / (ticker.price * 1.01))) || 1

    const overlay = document.createElement('div')
    overlay.className = 'ref-trade-overlay'
    const sheet = document.createElement('div')
    sheet.className = 'ref-trade-sheet'
    overlay.appendChild(sheet)
    this.tradeOverlay = overlay
    this.tradeDismiss = registerSheetDismiss(() => this.closeTradePanel())

    // Panelin render edildiği fiyat — onay anında fiyat değiştiyse sessiz işlem
    // yapmadan yeni tutarı gösteririz (Part 5).
    let renderedPrice = ticker.price
    const render = () => { renderedPrice = s.stock.tickers[tickerId]?.price ?? renderedPrice; sheet.innerHTML = this.tradePanelHtml(s, tickerId, mode, qty) }

    overlay.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement
      if (target === overlay || target.closest('[data-trade-close]')) { this.closeTradePanel(); return }
      const modeBtn = target.closest<HTMLElement>('[data-trade-mode]')
      if (modeBtn) {
        const next = modeBtn.dataset.tradeMode as 'buy' | 'sell'
        if (next !== mode) { mode = next; qty = this.resolveTradeQty(s, tickerId, mode, '1') }
        render(); return
      }
      const qBtn = target.closest<HTMLElement>('[data-trade-qty]')
      if (qBtn) { qty = this.resolveTradeQty(s, tickerId, mode, qBtn.dataset.tradeQty!); render(); return }
      const confirmBtn = target.closest<HTMLButtonElement>('[data-trade-confirm]')
      if (confirmBtn && !confirmBtn.disabled) {
        if (this.tradeBusy) return                 // çift tıklama/çift işlem koruması
        // Fiyat değiştiyse: yeniden doğrula + yeni tutarı göster, sessiz işlem YOK.
        const livePrice = s.stock.tickers[tickerId]?.price ?? renderedPrice
        if (livePrice !== renderedPrice) {
          refToast(i18n.t('ref_trade_price_changed'), 'err')
          render(); return
        }
        this.tradeBusy = true
        const ok = mode === 'buy' ? s.stockBuy(tickerId, qty) : s.stockSell(tickerId, qty)
        if (ok) {
          refToast(mode === 'buy' ? i18n.t('ref_market_stock_buy_success') : i18n.t('ref_market_stock_sell_success'), 'ok')
        } else {
          refToast(mode === 'buy' ? i18n.t('ref_market_insufficient_cash') : i18n.t('ref_market_stock_not_found'), 'err')
        }
        this.closeTradePanel()
        this.refresh(s)
      }
    })
    document.body.appendChild(overlay)
    render()
  }

  /** Panel içeriği — previewStockBuy/Sell TEK KAYNAK; önizleme == gerçek işlem. */
  private tradePanelHtml(s: GameState, tickerId: string, mode: 'buy' | 'sell', qty: number): string {
    const t = s.stock.tickers[tickerId]!
    const chg = tickerChangePct(t)
    const up = chg >= 0
    const buyMode = mode === 'buy'
    const pos = profitLoss(t)
    const posDir = pos > 0 ? 'up' : pos < 0 ? 'down' : 'muted'
    const presets: { key: string; label: string }[] = [
      { key: '1', label: '1' }, { key: '10', label: '10' },
      { key: '25', label: '%25' }, { key: '50', label: '%50' },
      { key: 'max', label: i18n.t('ref_trade_max') },
    ]
    const qtyBtns = presets.map((p) => `<button class="ref-trade-qty-btn" type="button" data-trade-qty="${p.key}">${p.label}</button>`).join('')

    let previewRows = ''
    let confirmLabel = ''
    let confirmDisabled = true
    if (buyMode) {
      const pv = previewStockBuy(s.stock, tickerId, qty, s.money)
      confirmDisabled = pv.qty <= 0 || !pv.affordable
      confirmLabel = fmt('ref_trade_confirm_buy', { qty: String(pv.qty) })
      previewRows = `
        ${this.tradeRow(i18n.t('ref_trade_qty'), String(pv.qty))}
        ${this.tradeRow(i18n.t('ref_trade_unit_price'), fmtMoneyTrim(Math.round(pv.unitPrice)))}
        ${this.tradeRow(i18n.t('ref_trade_gross'), fmtMoneyTrim(Math.round(pv.gross)))}
        ${this.tradeRow(i18n.t('ref_trade_commission'), fmtMoneyTrim(Math.round(pv.commission)))}
        ${this.tradeRow(i18n.t('ref_trade_total'), fmtMoneyTrim(Math.round(pv.total)), 'strong')}
        ${this.tradeRow(i18n.t('ref_trade_after_cash'), fmtMoneyTrim(Math.round(pv.afterCash)))}
        ${this.tradeRow(i18n.t('ref_trade_after_shares'), String(pv.afterShares))}`
    } else {
      const pv = previewStockSell(s.stock, tickerId, qty, s.money)
      confirmDisabled = pv.qty <= 0
      confirmLabel = fmt('ref_trade_confirm_sell', { qty: String(pv.qty) })
      const rDir = pv.realizedPl > 0 ? 'up' : pv.realizedPl < 0 ? 'down' : 'muted'
      const rSign = pv.realizedPl > 0 ? '+' : ''
      previewRows = `
        ${this.tradeRow(i18n.t('ref_trade_qty'), String(pv.qty))}
        ${this.tradeRow(i18n.t('ref_trade_unit_price'), fmtMoneyTrim(Math.round(pv.unitPrice)))}
        ${this.tradeRow(i18n.t('ref_trade_avg_cost'), fmtMoneyTrim(Math.round(pv.avgBuyPrice)))}
        ${this.tradeRow(i18n.t('ref_trade_gross'), fmtMoneyTrim(Math.round(pv.gross)))}
        ${this.tradeRow(i18n.t('ref_trade_commission'), fmtMoneyTrim(Math.round(pv.commission)))}
        ${this.tradeRow(i18n.t('ref_trade_net'), fmtMoneyTrim(Math.round(pv.net)), 'strong')}
        ${this.tradeRow(i18n.t('ref_trade_cost_basis'), fmtMoneyTrim(Math.round(pv.costBasis)))}
        ${this.tradeRow(i18n.t('ref_trade_realized'), `<span class="ref-pl-${rDir}">${rSign}${fmtMoneyTrim(Math.round(pv.realizedPl))}</span>`)}
        ${this.tradeRow(i18n.t('ref_trade_after_cash'), fmtMoneyTrim(Math.round(pv.afterCash)))}
        ${this.tradeRow(i18n.t('ref_trade_after_shares'), String(pv.afterShares))}`
    }

    return `
      <div class="ref-trade-handle"></div>
      <div class="ref-trade-head">
        <div class="ref-trade-title">${t.emoji} ${stockTickerName(t.id)}</div>
        <button class="ref-trade-close" type="button" data-trade-close>✕</button>
      </div>
      <div class="ref-trade-pricerow">
        <span class="ref-trade-price">${fmtMoneyTrim(Math.round(t.price))}</span>
        <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span>
      </div>
      <div class="ref-trade-position">
        ${this.tradeRow(i18n.t('ref_trade_shares'), String(t.shares))}
        ${this.tradeRow(i18n.t('ref_trade_position_value'), fmtMoneyTrim(Math.round(t.shares * t.price)))}
        ${this.tradeRow(i18n.t('ref_trade_unrealized'), `<span class="ref-pl-${posDir}">${pos >= 0 ? '+' : ''}${fmtMoneyTrim(Math.round(pos))}</span>`)}
      </div>
      <div class="ref-trade-modes">
        <button class="ref-trade-mode-btn buy ${buyMode ? 'active' : ''}" type="button" data-trade-mode="buy">${i18n.t('ref_trade_buy')}</button>
        <button class="ref-trade-mode-btn sell ${!buyMode ? 'active' : ''}" type="button" data-trade-mode="sell" ${t.shares <= 0 ? 'disabled' : ''}>${i18n.t('ref_trade_sell')}</button>
      </div>
      <div class="ref-trade-qtyrow">${qtyBtns}</div>
      <div class="ref-trade-preview">${previewRows}</div>
      <button class="ref-trade-confirm ${buyMode ? 'buy' : 'sell'}" type="button" data-trade-confirm ${confirmDisabled ? 'disabled' : ''}>${confirmLabel}</button>`
  }

  private tradeRow(label: string, value: string, mod = ''): string {
    return `<div class="ref-trade-row ${mod}"><span>${label}</span><b>${value}</b></div>`
  }

  // ── Mock (state yok) ─────────────────────────────────────────────────
  private buildMock(): void {
    this.el.appendChild(demoBanner(i18n.t('ref_market_demo_banner')))
    this.el.appendChild(new RefKpiStrip(buildMockKpi()).el)

    const sent = document.createElement('div')
    sent.className = 'ref-card-soft ref-detail-gauge'
    sent.style.margin = '8px 14px 0'
    sent.innerHTML = `
      <div class="ref-card-soft__title">${i18n.t('ref_market_sentiment_title')}</div>
      ${gaugeSvg(68, '#28C76F')}
      <div class="ref-sentiment-lbl">${i18n.t('ref_market_demo_sent_subtitle')}</div>`
    this.el.appendChild(sent)

    this.el.appendChild(sectionTitle(i18n.t('ref_market_stock_exchange_title'), i18n.t('ref_market_demo_stocks_subtitle')))
    const list = document.createElement('div')
    list.className = 'ref-stock-list'
    list.innerHTML = MOCK_STOCKS.map(s => {
      const up = s.change >= 0
      return `
        <div class="ref-stock-row">
          <div class="ref-stock-id">
            <span class="ref-stock-ticker">${s.ticker}</span>
            <span class="ref-stock-name">${i18n.t(s.nameKey)}</span>
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
    note.textContent = i18n.t('ref_detail_preview_note')
    this.el.appendChild(note)
  }
}
