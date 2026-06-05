import { RefKpiStrip }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import { fmtMoney } from './refShared'
import type { RefPage } from './RefApp'

/* ── Mock data ──
 * KURAL: Firma adı (name) yalnızca veriden gelir; görsele gömülü DEĞİL.
 * Görsel SADECE category (iş türü) üzerinden gelir. İki farklı isimli firma
 * aynı kategoriyse (ör. iki fırın) aynı asset'i paylaşır.
 */
const MOCK_FIRMS: FirmData[] = [
  {
    id: 'firin_1', name: 'Karahan Fırınları', slogan: 'Taze her gün',
    category: 'bakery', sector: 'gida', emoji: '🥖',
    level: 7, stars: 4, status: 'Büyüyor',
    income: 580_000, expense: 210_000, growth: 12.1, city: 'Ankara', performance: 76,
  },
  {
    id: 'firin_2', name: 'Altın Ekmek',
    category: 'bakery', sector: 'gida', emoji: '🥖',
    level: 5, stars: 3, status: 'Karlı',
    income: 410_000, expense: 160_000, growth: 9.4, city: 'Konya', performance: 71,
  },
  {
    id: 'kahve_1', name: 'Mavi Çekirdek',
    category: 'coffee', sector: 'gida', emoji: '☕',
    level: 8, stars: 5, status: 'Karlı',
    income: 1_120_000, expense: 340_000, growth: 9.7, city: 'İzmir', performance: 84,
  },
  {
    id: 'berber_1', name: 'Beyoğlu Berber',
    category: 'barber', sector: 'hizmet', emoji: '💈',
    level: 6, stars: 4, status: 'Karlı',
    income: 320_000, expense: 120_000, growth: 8.3, city: 'İstanbul', performance: 82,
  },
  {
    id: 'eticaret_1', name: 'TrendAl',
    category: 'ecommerce', sector: 'teknoloji', emoji: '🛒',
    level: 6, stars: 4, status: 'Büyüyor',
    income: 890_000, expense: 260_000, growth: 15.2, city: 'İstanbul', performance: 88,
  },
  {
    id: 'yazilim_1', name: 'Piksel Stüdyo',
    category: 'software', sector: 'teknoloji', emoji: '💻',
    level: 5, stars: 3, status: 'Karlı',
    income: 760_000, expense: 190_000, growth: 11.4, city: 'Bursa', performance: 63,
  },
  {
    id: 'lojistik_1', name: 'Hızlı Kargo',
    category: 'logistics', sector: 'hizmet', emoji: '🚚',
    level: 4, stars: 2, status: 'Riskli',
    income: 1_050_000, expense: 180_000, growth: 7.6, city: 'Mersin', performance: 48, riskLevel: 65,
  },
]

// Aktif Firma + Günlük Gelir runtime'da listeden türetilir; bunlar sabit ek KPI.
const KPI_EXTRA = [
  { icon: '💰', label: 'Yasadışı Gelir', value: '₺7,6M', sub: 'Günlük', subDir: 'muted' as const },
  { icon: '⚙️', label: 'Verimlilik', value: '78%', sub: '4,6%', subDir: 'up' as const },
]

type CategoryKey = 'tumu' | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya' | 'illegal'

const CATEGORIES: { id: CategoryKey; label: string; icon: string }[] = [
  { id: 'tumu',      label: 'Tümü',       icon: '' },
  { id: 'gida',      label: 'Gıda',       icon: '🍔' },
  { id: 'hizmet',    label: 'Hizmet',     icon: '🤝' },
  { id: 'teknoloji', label: 'Teknoloji',  icon: '🚀' },
  { id: 'finans',    label: 'Finans',     icon: '💰' },
  { id: 'turizm',    label: 'Turizm',     icon: '✈️' },
  { id: 'medya',     label: 'Medya',      icon: '🎬' },
  { id: 'illegal',   label: 'Illegal',    icon: '🚫' },
]

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'FİRMALAR'

  /** RefApp tarafından bağlanır: bir firmaya tıklanınca detay aç. */
  onOpenFirm?: (firm: FirmData) => void

  private activeCategory: CategoryKey = 'tumu'
  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()

  constructor(firms?: FirmData[]) {
    const data = (firms && firms.length) ? firms : MOCK_FIRMS
    const totalIncome = data.reduce((s, f) => s + f.income, 0)
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-firms-page'

    // KPI strip (firma listesinden türetilmiş)
    const kpi = new RefKpiStrip([
      { icon: '🏢', label: 'Aktif Firma',  value: String(data.length), sub: 'Toplam', subDir: 'muted' },
      { icon: '📈', label: 'Günlük Gelir',  value: fmtMoney(totalIncome), sub: '/gün', subDir: 'up' },
      ...KPI_EXTRA,
    ])
    this.el.appendChild(kpi.el)

    // Category tabs
    this.el.appendChild(this.buildCatTabs())

    // Summary strip
    const summary = document.createElement('div')
    summary.className = 'ref-summary-strip'
    summary.innerHTML = `
      <span class="ref-summary-count">${data.length} firma gösteriliyor</span>
      <span class="ref-summary-total">Toplam: ${fmtMoney(totalIncome)} / Gün</span>
    `
    this.el.appendChild(summary)

    // Cards list
    this.cardsContainer = document.createElement('div')
    this.cardsContainer.className = 'ref-cards-list'
    this.el.appendChild(this.cardsContainer)

    for (const firm of data) {
      const card = new RefCard(firm)
      this.cardEls.set(firm.id, card)
      card.el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.ref-btn, .ref-firm-menu')) return
        this.onOpenFirm?.(firm)
      })
      this.cardsContainer.appendChild(card.el)
    }
  }

  private buildCatTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-cat-tabs'
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button')
      btn.className = 'ref-cat-tab' + (cat.id === 'tumu' ? ' active' : '')
      btn.innerHTML = cat.icon
        ? `<span class="tab-ico">${cat.icon}</span>${cat.label}`
        : cat.label
      btn.addEventListener('click', () => this.setCategory(cat.id))
      this.catBtns.set(cat.id, btn)
      wrap.appendChild(btn)
    }
    return wrap
  }

  private setCategory(id: CategoryKey): void {
    this.activeCategory = id
    this.catBtns.forEach((btn, key) => btn.classList.toggle('active', key === id))
    this.filterCards()
  }

  private filterCards(): void {
    for (const [, card] of this.cardEls) {
      const match = this.activeCategory === 'tumu' ||
                    card.data.sector === this.activeCategory
      card.el.style.display = match ? '' : 'none'
    }
  }
}
