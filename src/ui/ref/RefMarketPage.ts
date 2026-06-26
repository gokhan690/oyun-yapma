import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { RefSubTabs } from './RefSubTabs'
import { sectionTitle, fmtMoney, gaugeSvg, demoBanner, refToast } from './refShared'
import { i18n, fmt } from '../../i18n'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { portfolioValue, type StockTicker, stockTickerName } from '../../game/StockMarket'

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
  private stockList?: HTMLElement
  private bankGrid?: HTMLElement
  private insGrid?: HTMLElement
  private ipoCard?: HTMLElement
  private lastSentSig = ''
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

    // ── 📈 Borsa: duyarlılık + tickerlar ──
    this.sentCard = document.createElement('div')
    this.sentCard.className = 'ref-card-soft ref-detail-gauge'
    this.sentCard.style.margin = '8px 14px 0'
    this.sentCard.innerHTML = this.sentHtml(s)
    secStocks.appendChild(this.sentCard)

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
    return `${Math.round(s.stock.marketFear)}|${(s.stock.centralBankRate * 100).toFixed(1)}`
  }

  private sentHtml(s: GameState): string {
    const fear = Math.round(s.stock.marketFear)
    const optimism = Math.max(0, Math.min(100, 100 - fear))
    const sentColor = optimism >= 60 ? '#28C76F' : optimism >= 40 ? '#FFB02E' : '#EA5455'
    const sentLbl = optimism >= 60 ? i18n.t('ref_market_sentiment_optimistic') : optimism >= 40 ? i18n.t('ref_market_sentiment_neutral') : i18n.t('ref_market_sentiment_fearful')
    return `
      <div class="ref-card-soft__title-row">
        <span class="ref-card-soft__title">${i18n.t('ref_market_sentiment_title')}</span>
        <span class="ref-sentiment-lbl" style="color:${sentColor}">${sentLbl}</span>
      </div>
      ${gaugeSvg(optimism, sentColor)}
      <div class="ref-market-rate">${fmt('ref_market_central_bank_rate_fmt', { rate: (s.stock.centralBankRate * 100).toFixed(1) })}</div>`
  }

  private stockSig(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => `${Math.round(t.price)}:${t.shares}`).join('|')
  }

  private stockHtml(s: GameState): string {
    return Object.values(s.stock.tickers).map((t) => {
      const chg = tickerChangePct(t)
      const up = chg >= 0
      const ownedTxt = t.shares > 0 ? `<span class="ref-stock-owned">${fmt('ref_market_shares_owned_fmt', { count: String(t.shares) })}</span>` : ''
      const canBuy = s.money >= t.price
      const canSell = t.shares > 0
      return `
        <div class="ref-stock-row">
          <div class="ref-stock-id">
            <span class="ref-stock-ticker">${t.emoji} ${stockTickerName(t.id)}</span>
            <span class="ref-stock-name">${ownedTxt || t.sector}</span>
          </div>
          ${spark(up)}
          <div class="ref-stock-num">
            <span class="ref-stock-price">${fmtMoney(Math.round(t.price))}</span>
            <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span>
          </div>
          <div class="ref-stock-actions">
            <button class="ref-stock-buy-btn" type="button" data-stock-buy="${t.id}" ${canBuy ? '' : 'disabled'}>${i18n.t('ref_market_stock_buy_btn')}</button>
            <button class="ref-stock-sell-btn" type="button" data-stock-sell="${t.id}" ${canSell ? '' : 'disabled'}>${i18n.t('ref_market_stock_sell_btn')}</button>
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

    // ── Borsa Al/Sat ──
    const buyBtn = el.closest<HTMLButtonElement>('[data-stock-buy]')
    if (buyBtn && !buyBtn.disabled) {
      const tickerId = buyBtn.dataset.stockBuy!
      const ok = s.stockBuy(tickerId, 1)
      refToast(ok ? i18n.t('ref_market_stock_buy_success') : i18n.t('ref_market_insufficient_cash'), ok ? 'ok' : 'err')
      this.refresh(s)
      return
    }
    const sellBtn = el.closest<HTMLButtonElement>('[data-stock-sell]')
    if (sellBtn && !sellBtn.disabled) {
      const tickerId = sellBtn.dataset.stockSell!
      const ok = s.stockSell(tickerId, 1)
      refToast(ok ? i18n.t('ref_market_stock_sell_success') : i18n.t('ref_market_stock_not_found'), ok ? 'ok' : 'err')
      this.refresh(s)
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
