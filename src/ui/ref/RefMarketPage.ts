import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, fmtMoney } from './refShared'
import type { RefPage } from './RefApp'

const KPI = [
  { icon: '💼', label: 'Portföy',     value: '₺58,4M', sub: '3,2%', subDir: 'up' as const },
  { icon: '📊', label: 'Günlük K/Z',  value: '+₺1,2M', sub: 'Bugün', subDir: 'up' as const },
  { icon: '🏦', label: 'Nakit',       value: '₺42,6M', sub: 'Likit', subDir: 'muted' as const },
]

interface Stock { name: string; ticker: string; price: number; change: number }
const STOCKS: Stock[] = [
  { name: 'Karahan Holding',  ticker: 'KRHN', price: 1_284, change: 4.2 },
  { name: 'Anadolu Enerji',   ticker: 'ANEN', price: 642,   change: 1.8 },
  { name: 'Mavi Teknoloji',   ticker: 'MAVT', price: 318,   change: -2.3 },
  { name: 'Boğaziçi Lojistik', ticker: 'BOGL', price: 96,   change: 0.7 },
  { name: 'Ege Turizm',       ticker: 'EGTR', price: 254,   change: -1.1 },
  { name: 'Star Medya',       ticker: 'STMD', price: 472,   change: 3.6 },
]

function spark(up: boolean): string {
  const pts = up ? '0,18 8,12 16,14 24,6 32,8 40,2' : '0,4 8,8 16,6 24,12 32,10 40,16'
  const col = up ? 'var(--r-success)' : 'var(--r-danger)'
  return `<svg viewBox="0 0 40 20" class="ref-spark"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export class RefMarketPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'PİYASA'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-market-page'

    this.el.appendChild(new RefKpiStrip(KPI).el)

    this.el.appendChild(sectionTitle('Borsa', 'Canlı'))
    const list = document.createElement('div')
    list.className = 'ref-stock-list'
    list.innerHTML = STOCKS.map(s => {
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
        </div>
      `
    }).join('')
    this.el.appendChild(list)

    // İşlem butonları
    const actions = document.createElement('div')
    actions.className = 'ref-market-actions'
    actions.innerHTML = `
      <button class="ref-btn develop">📈 AL</button>
      <button class="ref-btn manager">📉 SAT</button>
    `
    this.el.appendChild(actions)
  }
}
