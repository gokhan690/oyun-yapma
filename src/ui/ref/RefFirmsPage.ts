import { RefKpiStrip }  from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import { fmtMoney } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS, isProducerUnlocked, type ProducerDef } from '../../game/Economy'

/* ── Mock data (gerçek veri yoksa) ─────────────────────────────────────── */
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

/* ── İmparatorluk kategorileri ───────────────────────────────────────── */
const EMPIRE_PRODUCER_IDS = new Set(
  PRODUCERS
    .filter(p => p.category === 'sport' || p.category === 'politics' || p.category === 'dark' || p.category === 'luxury' || p.illegal)
    .map(p => p.id)
)

const NORMAL_PRODUCERS = PRODUCERS.filter(p => !EMPIRE_PRODUCER_IDS.has(p.id))

/* ── Kategori filtreleri ─────────────────────────────────────────────── */
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

/* ── İmparatorluk alt sekmeleri ──────────────────────────────────────── */
type EmpireTab = 'spor' | 'siyaset' | 'yeralti' | 'luks' | 'finans'
const EMPIRE_TABS: { id: EmpireTab; label: string; icon: string }[] = [
  { id: 'spor',     label: 'Spor',    icon: '⚽' },
  { id: 'siyaset',  label: 'Siyaset', icon: '🏛️' },
  { id: 'yeralti',  label: 'Yeraltı', icon: '🔥' },
  { id: 'luks',     label: 'Lüks',    icon: '💎' },
  { id: 'finans',   label: 'Finans',  icon: '📊' },
]

const EMPIRE_PRODUCER_FILTER: Record<EmpireTab, (p: ProducerDef) => boolean> = {
  spor:    p => p.category === 'sport',
  siyaset: p => p.category === 'politics',
  yeralti: p => p.category === 'dark' || (!!p.illegal && p.category !== 'sport' && p.category !== 'politics' && p.category !== 'luxury'),
  luks:    p => p.category === 'luxury',
  finans:  p => p.category === 'finance' || p.category === 'science',
}

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'FİRMALAR'

  onOpenFirm?: (firm: FirmData) => void

  private activeCategory: CategoryKey = 'tumu'
  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()

  // Sub-tab state
  private activeEmpireTab: EmpireTab = 'spor'

  // Normal işletme kartları (live state)
  private producerCardsContainer!: HTMLElement
  private producerCards = new Map<string, HTMLElement>()
  private unsub?: () => void

  private firms?: FirmData[]
  private hasRealData = false
  private state?: GameState

  constructor(firms?: FirmData[], hasRealData = false, state?: GameState) {
    this.firms = firms
    this.hasRealData = hasRealData
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-firms-page'
    this.buildPage()

    if (state) {
      this.unsub = state.subscribe((ev) => {
        if (ev.type === 'purchase' || ev.type === 'money_changed') {
          this.refreshProducerCards()
        }
      })
    }
  }

  private buildPage(): void {
    const data: FirmData[] = (this.firms && this.firms.length) ? this.firms : (this.hasRealData ? [] : MOCK_FIRMS)
    const realEmpty = this.hasRealData && data.length === 0
    const totalIncome = data.reduce((s, f) => s + f.income, 0)
    const illegalIncome = data.filter((f) => f.sector === 'illegal').reduce((s, f) => s + f.income, 0)
    const legalIncome = totalIncome - illegalIncome
    const avgPerf = data.length ? Math.round(data.reduce((s, f) => s + f.performance, 0) / data.length) : 0

    // KPI strip
    const kpi = new RefKpiStrip([
      { icon: '🏢', label: 'Aktif Firma',       value: String(data.length), sub: 'Toplam', subDir: 'muted' },
      { icon: '📈', label: 'Firmalardan Gelir',  value: fmtMoney(legalIncome), sub: 'İşletme gelirleri', subDir: 'up' },
      { icon: '💰', label: 'Yasadışı Gelir',     value: illegalIncome > 0 ? fmtMoney(illegalIncome) : 'Yok', sub: 'Günlük', subDir: 'muted' },
      { icon: '⚙️', label: 'Verimlilik',         value: `${avgPerf}%`, sub: 'Ortalama', subDir: 'muted' },
    ])
    this.el.appendChild(kpi.el)

    // Ana sekme çifti
    this.el.appendChild(this.buildMainTabs())

    // Normal İşletmeler içeriği
    const normalSection = document.createElement('div')
    normalSection.className = 'ref-firms-tab-content'
    normalSection.dataset.tab = 'normal'

    if (realEmpty) {
      const empty = document.createElement('div')
      empty.className = 'ref-firms-empty'
      empty.innerHTML = `
        <div class="ref-firms-empty__ico">🏢</div>
        <div class="ref-firms-empty__title">Henüz firma yok</div>
        <div class="ref-firms-empty__desc">İlk işletmeni kurduğunda firmaların burada listelenecek.</div>`
      normalSection.appendChild(empty)
    } else if (this.state) {
      // Canlı veri modu — alım/satım destekli
      normalSection.appendChild(this.buildLiveProducerSection())
    } else {
      // Önizleme modu — mock FirmData kartları
      const note = document.createElement('div')
      note.className = 'ref-preview-note ref-firms-note'
      note.textContent = '🔒 Önizleme modu · kart işlemleri (Geliştir/Modernize/Manager) işlem yapmaz'
      normalSection.appendChild(note)
      normalSection.appendChild(this.buildCatTabs())

      const summary = document.createElement('div')
      summary.className = 'ref-summary-strip'
      summary.innerHTML = `
        <span class="ref-summary-count">${data.length} firma gösteriliyor</span>
        <span class="ref-summary-total">Toplam: ${fmtMoney(totalIncome)} / Gün</span>
      `
      normalSection.appendChild(summary)

      this.cardsContainer = document.createElement('div')
      this.cardsContainer.className = 'ref-cards-list'
      normalSection.appendChild(this.cardsContainer)

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

    this.el.appendChild(normalSection)

    // İmparatorluk Yatırımları içeriği
    const empireSection = document.createElement('div')
    empireSection.className = 'ref-firms-tab-content'
    empireSection.dataset.tab = 'empire'
    empireSection.style.display = 'none'
    empireSection.appendChild(this.buildEmpireSection())
    this.el.appendChild(empireSection)
  }

  // ── Ana sekmeler ─────────────────────────────────────────────────────
  private buildMainTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-main-tabs'
    const tabs: { id: 'normal' | 'empire'; label: string; icon: string }[] = [
      { id: 'normal', label: 'Normal İşletmeler', icon: '🏪' },
      { id: 'empire', label: 'İmparatorluk Yatırımları', icon: '👑' },
    ]
    for (const tab of tabs) {
      const btn = document.createElement('button')
      btn.className = 'ref-main-tab' + (tab.id === 'normal' ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchMainTab(tab.id))
      wrap.appendChild(btn)
    }
    return wrap
  }

  private switchMainTab(id: 'normal' | 'empire'): void {
    this.el.querySelectorAll<HTMLButtonElement>('.ref-main-tab').forEach(b => {
      b.classList.toggle('active', b.textContent?.includes(id === 'normal' ? 'Normal' : 'İmparatorluk') ?? false)
    })
    this.el.querySelectorAll<HTMLElement>('.ref-firms-tab-content').forEach(sec => {
      sec.style.display = (sec.dataset.tab === id) ? '' : 'none'
    })
  }

  // ── Kategori sekmeleri (önizleme modu) ───────────────────────────────
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
      const match = this.activeCategory === 'tumu' || card.data.sector === this.activeCategory
      card.el.style.display = match ? '' : 'none'
    }
  }

  // ── Canlı producer bölümü (state varsa) ─────────────────────────────
  private buildLiveProducerSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-live-biz'

    const note = document.createElement('div')
    note.className = 'ref-preview-note ref-firms-note live-mode'
    note.textContent = '✅ Gerçek veri · Satın Al butonları aktif'
    wrap.appendChild(note)

    this.producerCardsContainer = document.createElement('div')
    this.producerCardsContainer.className = 'ref-prod-list'
    wrap.appendChild(this.producerCardsContainer)

    this.buildProducerCards()
    return wrap
  }

  private buildProducerCards(): void {
    this.producerCards.clear()
    this.producerCardsContainer.innerHTML = ''

    const s = this.state!
    const sorted = [...NORMAL_PRODUCERS].sort((a, b) => a.tier - b.tier || a.unlockAt - b.unlockAt)

    for (const def of sorted) {
      const card = this.buildOneProducerCard(def, s)
      this.producerCards.set(def.id, card)
      this.producerCardsContainer.appendChild(card)
    }
  }

  private buildOneProducerCard(def: ProducerDef, s: GameState): HTMLElement {
    const owned  = s.producers[def.id] ?? 0
    const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
    const cost   = unlocked ? s.producerCostFor(def, owned, 1) : 0
    const canBuy = unlocked && s.money >= cost

    let stateClass = 'locked'
    let stateLabel = `🔒 ${fmtMoney(def.unlockAt)} kazanınca açılır`
    if (def.ipoRequirement && (s.ipoCount < def.ipoRequirement)) {
      stateClass = 'locked-ipo'
      stateLabel = `🔒 ${def.ipoRequirement} IPO gerekli`
    } else if (unlocked && owned > 0 && canBuy) {
      stateClass = 'owned-can-buy'
      stateLabel = ''
    } else if (unlocked && owned > 0) {
      stateClass = 'owned'
      stateLabel = ''
    } else if (unlocked && canBuy) {
      stateClass = 'available'
      stateLabel = ''
    } else if (unlocked) {
      stateClass = 'no-cash'
      stateLabel = `Para yetersiz — ${fmtMoney(cost)}`
    }

    const card = document.createElement('div')
    card.className = `ref-prod-card ${stateClass}`
    card.dataset.id = def.id

    const btnHtml = unlocked
      ? `<button class="ref-prod-btn ${canBuy ? 'buyable' : 'disabled'}" type="button" ${canBuy ? '' : 'disabled'}
           data-id="${def.id}">
           ${owned > 0 ? '+1 AL' : 'SATIN AL'} ${fmtMoney(cost)}
         </button>`
      : `<div class="ref-prod-locked-lbl">${stateLabel}</div>`

    card.innerHTML = `
      <div class="ref-prod-card__head">
        <span class="ref-prod-emoji">${def.emoji}</span>
        <div class="ref-prod-info">
          <div class="ref-prod-name">${def.name}</div>
          <div class="ref-prod-meta">T${def.tier} · ${owned > 0 ? `<b>${owned}</b> adet` : 'Sahip değilsin'}</div>
        </div>
        ${owned > 0 ? `<span class="ref-prod-owned-badge">${owned}</span>` : ''}
      </div>
      <div class="ref-prod-card__foot">
        ${unlocked && stateLabel ? `<span class="ref-prod-state-lbl">${stateLabel}</span>` : ''}
        ${btnHtml}
      </div>
    `

    card.querySelector<HTMLButtonElement>('.ref-prod-btn.buyable')?.addEventListener('click', () => {
      this.state?.buyProducer(def.id, 1)
    })

    return card
  }

  /** Satın alma sonrası kartları güncelle — sadece değişen kartları yeniden çiz */
  private refreshProducerCards(): void {
    if (!this.state || !this.producerCardsContainer) return
    const s = this.state
    for (const def of NORMAL_PRODUCERS) {
      const existing = this.producerCards.get(def.id)
      if (!existing) continue
      const newCard = this.buildOneProducerCard(def, s)
      existing.replaceWith(newCard)
      this.producerCards.set(def.id, newCard)
    }
  }

  // ── İmparatorluk Yatırımları bölümü ─────────────────────────────────
  private buildEmpireSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-empire-inv'

    // İmparatorluk not
    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = '🔒 Önizleme modu · İmparatorluk satın alma işlemleri henüz aktif değil'
    wrap.appendChild(note)

    // Alt sekme çubuğu
    const tabBar = document.createElement('div')
    tabBar.className = 'ref-empire-tabs'
    for (const tab of EMPIRE_TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-empire-tab' + (tab.id === this.activeEmpireTab ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchEmpireTab(tab.id, content))
      tabBar.appendChild(btn)
    }
    wrap.appendChild(tabBar)

    // İçerik alanı
    const content = document.createElement('div')
    content.className = 'ref-empire-inv-content'
    wrap.appendChild(content)

    this.renderEmpireTab(this.activeEmpireTab, content)
    return wrap
  }

  private switchEmpireTab(id: EmpireTab, content: HTMLElement): void {
    this.activeEmpireTab = id
    const tabBar = content.closest('.ref-empire-inv')?.querySelector('.ref-empire-tabs')
    tabBar?.querySelectorAll<HTMLButtonElement>('.ref-empire-tab').forEach((btn, i) => {
      btn.classList.toggle('active', EMPIRE_TABS[i]?.id === id)
    })
    this.renderEmpireTab(id, content)
  }

  private renderEmpireTab(id: EmpireTab, content: HTMLElement): void {
    const filter = EMPIRE_PRODUCER_FILTER[id]
    const list = PRODUCERS.filter(filter).sort((a, b) => a.tier - b.tier)

    content.innerHTML = ''
    if (!list.length) {
      content.innerHTML = '<div class="ref-empire-empty">Bu kategoride henüz içerik yok.</div>'
      return
    }

    const grid = document.createElement('div')
    grid.className = 'ref-empire-cards'
    for (const def of list) {
      const owned = this.state ? (this.state.producers[def.id] ?? 0) : 0
      const card = document.createElement('div')
      card.className = 'ref-empire-card' + (owned > 0 ? ' owned' : '')
      card.innerHTML = `
        <div class="ref-empire-card__head">
          <span class="ref-empire-card__emoji">${def.emoji}</span>
          <div class="ref-empire-card__info">
            <div class="ref-empire-card__name">${def.name}</div>
            <div class="ref-empire-card__tier">Tier ${def.tier} · ${owned > 0 ? `<b>${owned} adet</b>` : 'Sahip değilsin'}</div>
          </div>
          ${owned > 0 ? '<span class="ref-empire-card__badge">✓</span>' : ''}
        </div>
        <div class="ref-empire-card__foot">
          <button class="ref-prod-btn disabled" type="button" disabled>
            ${fmtMoney(def.baseCost)} · yakında
          </button>
        </div>
      `
      grid.appendChild(card)
    }
    content.appendChild(grid)
  }

  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
  }
}
