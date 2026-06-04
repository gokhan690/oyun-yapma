import './ref-ui.css'
import { RefHeader }    from './RefHeader'
import { RefBottomNav } from './RefBottomNav'
import { RefKpiStrip }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'

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

const KPI_ITEMS = [
  { icon: '🏢', label: 'Aktif Firma',  value: '12', sub: 'Toplam', subDir: 'muted' as const },
  { icon: '📈', label: 'Yasal Gelir',  value: '₺18,7M', sub: '▲ 6,2%', subDir: 'up' as const },
  { icon: '💰', label: 'Yasadışı Gelir', value: '₺7,6M', sub: 'Günlük', subDir: 'muted' as const },
  { icon: '⚙️', label: 'Operasyonel Verimlilik', value: '78%', sub: '▲ 4,6%', subDir: 'up' as const },
  { icon: '📊', label: 'Verimlilik Puanı', value: '▲ 6,2%', sub: 'Bu ay', subDir: 'up' as const },
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

export class RefFirmsPage {
  readonly el: HTMLElement

  private activeCategory: CategoryKey = 'tumu'
  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()
  private header: RefHeader
  private kpi: RefKpiStrip
  private nav: RefBottomNav

  constructor() {
    // ── Shell ──
    this.el = document.createElement('div')
    this.el.className = 'ref-shell'

    // ── Header ──
    this.header = new RefHeader({
      name: 'Mert Karahan',
      title: 'Holding YK Başkanı',
      age: 34,
      city: 'İstanbul',
      avatarEmoji: '👤',
      avatarAsset: '/assets/ref-v2/avatars/avatar_main_businessman.png',
      notifCount: 1,
    })
    this.header.setTitle('FİRMALAR', '⭐')
    this.el.appendChild(this.header.el)

    // ── Scroll body ──
    const body = document.createElement('div')
    body.className = 'ref-body'
    this.el.appendChild(body)

    // ── KPI strip ──
    this.kpi = new RefKpiStrip(KPI_ITEMS)
    body.appendChild(this.kpi.el)

    // ── Category tabs ──
    body.appendChild(this.buildCatTabs())

    // ── Summary strip ──
    const summary = document.createElement('div')
    summary.className = 'ref-summary-strip'
    summary.innerHTML = `
      <span class="ref-summary-count">12 firma gösteriliyor</span>
      <span class="ref-summary-total">Toplam: ₺26,3M / Gün</span>
    `
    body.appendChild(summary)

    // ── Cards list ──
    this.cardsContainer = document.createElement('div')
    this.cardsContainer.className = 'ref-cards-list'
    body.appendChild(this.cardsContainer)

    // Build initial cards
    for (const firm of MOCK_FIRMS) {
      const card = new RefCard(firm)
      this.cardEls.set(firm.id, card)
      this.cardsContainer.appendChild(card.el)
    }

    // ── Bottom nav ──
    this.nav = new RefBottomNav('firms')
    this.el.appendChild(this.nav.el)
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
    this.catBtns.forEach((btn, key) => {
      btn.classList.toggle('active', key === id)
    })
    this.filterCards()
  }

  private filterCards(): void {
    for (const [, card] of this.cardEls) {
      const match = this.activeCategory === 'tumu' ||
                    card.data.sector === this.activeCategory
      card.el.style.display = match ? '' : 'none'
    }
  }

  mount(target: HTMLElement): void {
    target.appendChild(this.el)
  }
}
