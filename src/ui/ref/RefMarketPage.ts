import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, fmtMoney, gaugeSvg, refToast } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { portfolioValue, type StockTicker } from '../../game/StockMarket'
import type { InsuranceState } from '../../game/Insurance'
import { SaveManager } from '../../security/SaveManager'

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

const SECTOR_TR: Record<string, string> = {
  tech: 'Teknoloji', energy: 'Enerji', realestate: 'Gayrimenkul',
  finance: 'Finans', industrial: 'Sanayi',
}

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

/** IPO confirm flag — 3sn içinde ikinci tıklama onaylar */
let ipoPendingConfirm = false
let ipoPendingTimer: number | null = null

export class RefMarketPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'PİYASA'
  private state?: GameState

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-market-page'
    this.el.addEventListener('click', (e) => this.handleClick(e))
    if (state) this.buildReal(state)
    else this.buildMock()
  }

  /** money_changed / purchase → tam sayfa yeniden oluştur (event listener korunur). */
  refresh(state: GameState): void {
    this.state = state
    this.el.innerHTML = ''
    this.buildReal(state)
  }

  // ── Event delegation (tüm actionlar) ─────────────────────────────────
  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const t = e.target as HTMLElement

    // Borsa — Al
    const stockBuy = t.closest<HTMLButtonElement>('[data-stock-buy]')
    if (stockBuy && !stockBuy.disabled) {
      const id = stockBuy.dataset.stockBuy!
      const shares = parseInt(stockBuy.dataset.shares ?? '1')
      const ok = s.stockBuy(id, shares)
      if (ok) { new SaveManager().save(s); refToast(`${shares} hisse alındı`, 'ok') }
      else refToast('Alınamadı — para yetersiz', 'err')
      return
    }

    // Borsa — Sat
    const stockSell = t.closest<HTMLButtonElement>('[data-stock-sell]')
    if (stockSell && !stockSell.disabled) {
      const id = stockSell.dataset.stockSell!
      const shares = parseInt(stockSell.dataset.shares ?? '1')
      const ok = s.stockSell(id, shares)
      if (ok) { new SaveManager().save(s); refToast(`${shares} hisse satıldı`, 'ok') }
      else refToast('Satılamadı', 'err')
      return
    }

    // Banka işlemi
    const bankBtn = t.closest<HTMLButtonElement>('[data-bank-action]')
    if (bankBtn && !bankBtn.disabled) {
      const action = bankBtn.dataset.bankAction!
      const amount = parseInt(bankBtn.dataset.amount ?? '0')
      let ok = false
      let msg = ''
      switch (action) {
        case 'deposit':     ok = s.bankDeposit(amount);    msg = ok ? `${fmtMoney(amount)} mevduata yatırıldı`    : 'Para yetersiz'; break
        case 'withdraw':    ok = s.bankWithdraw(amount);   msg = ok ? `${fmtMoney(amount)} çekildi`                : 'Mevduat yetersiz'; break
        case 'take_loan':   ok = s.bankTakeLoan(amount);   msg = ok ? `${fmtMoney(amount)} kredi alındı`           : 'Kredi limiti aşıldı ya da itibar yetersiz'; break
        case 'repay_loan':  ok = s.bankRepayLoan(amount);  msg = ok ? `${fmtMoney(amount)} kredi ödendi`           : 'Borç veya para yetersiz'; break
        case 'buy_bonds':   ok = s.bankBuyBonds(amount);   msg = ok ? `${fmtMoney(amount)} tahvil alındı`          : 'Para yetersiz'; break
        case 'sell_bonds':  ok = s.bankSellBonds(amount);  msg = ok ? `${fmtMoney(amount)} tahvil satıldı`         : 'Tahvil yetersiz'; break
      }
      if (ok) new SaveManager().save(s)
      refToast(msg, ok ? 'ok' : 'err')
      return
    }

    // Sigorta toggle
    const insBtn = t.closest<HTMLButtonElement>('[data-ins-toggle]')
    if (insBtn && !insBtn.disabled) {
      const kind = insBtn.dataset.insToggle as keyof InsuranceState
      s.toggleInsurance(kind)
      new SaveManager().save(s)
      const now = s.insurance[kind]
      const labels: Record<string, string> = { business: 'İşletme', illegal: 'Yasadışı', dynasty: 'Hanedan' }
      refToast(`${labels[kind] ?? kind} sigortası ${now ? 'aktif' : 'kapatıldı'}`, now ? 'ok' : 'err')
      return
    }

    // IPO — çift tıklama onayı
    const ipoBtn = t.closest<HTMLButtonElement>('[data-ipo-trigger]')
    if (ipoBtn && !ipoBtn.disabled) {
      if (!ipoPendingConfirm) {
        ipoPendingConfirm = true
        refToast('⚠️ Emin misin? Tekrar tıkla → IPO yap!', 'err')
        if (ipoPendingTimer !== null) clearTimeout(ipoPendingTimer)
        ipoPendingTimer = window.setTimeout(() => { ipoPendingConfirm = false }, 3000)
      } else {
        ipoPendingConfirm = false
        if (ipoPendingTimer !== null) { clearTimeout(ipoPendingTimer); ipoPendingTimer = null }
        const points = s.doPrestige()
        if (points > 0) {
          new SaveManager().save(s)
          refToast(`IPO tamamlandı! +${points} prestij ⭐`, 'ok')
        }
      }
    }
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

    // Piyasa duyarlılığı
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

    // ── Borsa ────────────────────────────────────────────────────────
    const tickers = Object.values(s.stock.tickers)
    this.el.appendChild(sectionTitle('Borsa', `${tickers.length} enstrüman`))
    const list = document.createElement('div')
    list.className = 'ref-stock-list'
    list.innerHTML = tickers.map((t) => this.stockRowHtml(t, s)).join('')
    this.el.appendChild(list)

    // ── Banka & Kredi ────────────────────────────────────────────────
    this.el.appendChild(sectionTitle('Banka & Kredi'))
    this.el.appendChild(this.buildBankSection(s))

    // ── Sigorta ─────────────────────────────────────────────────────
    this.el.appendChild(sectionTitle('Sigorta'))
    this.el.appendChild(this.buildInsSection(s))

    // ── IPO / Prestij ────────────────────────────────────────────────
    const ipo = s.ipoProgress()
    this.el.appendChild(sectionTitle('IPO / Prestij', `${s.ipoCount} IPO`))
    this.el.appendChild(this.buildIpoSection(s, ipo))
  }

  // ── Borsa satırı ─────────────────────────────────────────────────────
  private stockRowHtml(t: StockTicker, s: GameState): string {
    const chg = tickerChangePct(t)
    const up = chg >= 0
    const price = Math.round(t.price)
    const owned = t.shares ?? 0
    const canBuy = s.canAfford(price)
    const ownedTxt = owned > 0 ? `<span class="ref-stock-owned">${owned} hisse</span>` : ''
    return `
      <div class="ref-stock-row ref-stock-row--interactive">
        <div class="ref-stock-id">
          <span class="ref-stock-ticker">${t.emoji} ${t.name}</span>
          <span class="ref-stock-name">${ownedTxt || (SECTOR_TR[t.sector] ?? t.sector)}</span>
        </div>
        ${spark(up)}
        <div class="ref-stock-num">
          <span class="ref-stock-price">${fmtMoney(price)}</span>
          <span class="ref-stock-chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span>
        </div>
        <div class="ref-stock-btns">
          <button type="button" class="ref-stock-btn buy"
            data-stock-buy="${t.id}" data-shares="1"
            ${canBuy ? '' : 'disabled'}
            title="${fmtMoney(price)} gerekli">Al 1</button>
          <button type="button" class="ref-stock-btn sell"
            data-stock-sell="${t.id}" data-shares="1"
            ${owned > 0 ? '' : 'disabled'}
            title="${owned} hisse">Sat 1</button>
        </div>
      </div>`
  }

  // ── Banka işlemleri bölümü ────────────────────────────────────────────
  private buildBankSection(s: GameState): HTMLElement {
    const el = document.createElement('div')
    el.className = 'ref-bank-panel'

    const dep = Math.round(s.bank.deposit)
    const bonds = Math.round(s.bank.bonds)
    const loan = Math.round(s.bank.loan)
    const maxLoan = Math.round(s.maxAvailableLoan())
    const cash = Math.round(s.money)

    const depAmounts = [1_000, 10_000, 100_000]
    const wdAmounts  = [1_000, 10_000]
    const loanAmounts = [10_000, 100_000]
    const repayAmounts = [10_000, 100_000]
    const bondAmounts = [5_000, 50_000]

    const btnRow = (label: string, action: string, amounts: number[], checker: (n: number) => boolean) => `
      <div class="ref-bank-row">
        <span class="ref-bank-row__lbl">${label}</span>
        <div class="ref-bank-row__btns">
          ${amounts.map((a) => {
            const ok = checker(a)
            return `<button type="button" class="ref-bank-btn" data-bank-action="${action}" data-amount="${a}" ${ok ? '' : 'disabled'}>${fmtMoney(a)}</button>`
          }).join('')}
        </div>
      </div>`

    el.innerHTML = `
      <div class="ref-bank-stats">
        <div class="ref-bank-stat"><span>💰 Mevduat</span><b>${fmtMoney(dep)}</b></div>
        <div class="ref-bank-stat"><span>📜 Tahvil</span><b>${fmtMoney(bonds)}</b></div>
        <div class="ref-bank-stat"><span>🏦 Kredi</span><b class="${loan > 0 ? 'debt' : ''}">${loan > 0 ? fmtMoney(loan) : '—'}</b></div>
        <div class="ref-bank-stat"><span>⭐ Kredi Notu</span><b>${Math.round(s.bank.creditScore)}</b></div>
      </div>
      ${btnRow('💰 Mevduat Yatır', 'deposit', depAmounts, (a) => cash >= a)}
      ${dep > 0 ? btnRow('💸 Mevduat Çek', 'withdraw', wdAmounts, (a) => dep >= a) : ''}
      ${btnRow('📜 Tahvil Al', 'buy_bonds', bondAmounts, (a) => cash >= a)}
      ${bonds > 0 ? btnRow('📜 Tahvil Sat', 'sell_bonds', bondAmounts, (a) => bonds >= a) : ''}
      ${maxLoan > 0 ? btnRow('💳 Kredi Al', 'take_loan', loanAmounts, (a) => maxLoan >= a) : ''}
      ${loan > 0 ? btnRow('🔄 Kredi Öde', 'repay_loan', repayAmounts, (a) => loan >= a && cash >= a) : ''}`
    return el
  }

  // ── Sigorta toggle bölümü ─────────────────────────────────────────────
  private buildInsSection(s: GameState): HTMLElement {
    const el = document.createElement('div')
    el.className = 'ref-ins-grid'
    const items: { kind: keyof InsuranceState; ico: string; label: string }[] = [
      { kind: 'business', ico: '🏢', label: 'İşletme' },
      { kind: 'illegal',  ico: '🕶️', label: 'Yasadışı' },
      { kind: 'dynasty',  ico: '👨‍👩‍👧', label: 'Hanedan' },
    ]
    el.innerHTML = items.map(({ kind, ico, label }) => {
      const active = s.insurance[kind]
      return `
        <div class="ref-ins-cell ${active ? 'on' : 'off'}">
          <span class="ref-ins-cell__ico">${ico}</span>
          <span class="ref-ins-cell__lbl">${label}</span>
          <b class="ref-ins-cell__val">${active ? '✓ Aktif' : 'Pasif'}</b>
          <button type="button" class="ref-ins-toggle-btn" data-ins-toggle="${kind}">${active ? 'Kapat' : 'Aç'}</button>
        </div>`
    }).join('')
    return el
  }

  // ── IPO bölümü ───────────────────────────────────────────────────────
  private buildIpoSection(s: GameState, ipo: ReturnType<GameState['ipoProgress']>): HTMLElement {
    const el = document.createElement('div')
    el.className = 'ref-ipo-card'
    const preview = ipo.ready ? s.ipoPreview() : null
    el.innerHTML = `
      <div class="ref-ipo-card__row">
        <span>📈 Prestij Puanı</span><b>${s.prestigePoints}</b>
      </div>
      <div class="ref-ipo-card__row">
        <span>Sonraki IPO eşiği</span>
        <b class="${ipo.ready ? 'ready' : ''}">${ipo.ready ? 'HAZIR' : `%${Math.round(ipo.pct)}`}</b>
      </div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${ipo.ready ? 'high' : 'medium'}" style="width:${Math.round(ipo.pct)}%"></div></div>
      <div class="ref-ipo-card__meta">${fmtMoney(Math.round(ipo.current))} / ${fmtMoney(Math.round(ipo.target))} toplam kazanç</div>
      ${ipo.ready && preview ? `
        <div class="ref-ipo-preview">
          <span>+${preview.pointsToEarn} prestij</span>
          <span>Başlangıç: ${fmtMoney(preview.startingCash)}</span>
        </div>
        <button type="button" class="ref-ipo-btn" data-ipo-trigger>🚀 IPO YAP!</button>
      ` : ''}
    `
    return el
  }

  // ── Mock (state yok) ─────────────────────────────────────────────────
  private buildMock(): void {
    const banner = document.createElement('div')
    banner.className = 'ref-demo-banner'
    banner.innerHTML = '<span>🧪</span><span><b>Demo veri</b> — borsa/portföy önizleme — gerçek oyun verisi yok</span>'
    this.el.appendChild(banner)
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
