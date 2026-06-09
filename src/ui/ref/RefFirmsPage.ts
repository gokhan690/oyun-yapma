import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { RefCard, type FirmData } from './RefCard'
import {
  fmtMoney,
  refToast,
  ua,
  PRODUCER_CHIP_TABS,
  REF_NORMAL_PRODUCERS,
  REF_EMPIRE_PRODUCERS,
  REF_BUY_MODES,
  producerCardSnap,
  producerChipCategory,
  producerChipLabel,
  type RefBuyMode,
  producerDetailTrend,
  producerDetailSatisfaction,
  starsHtml,
  areaChartSvg,
  gaugeSvg,
  donutSvg,
  type ProducerChipKey,
} from './refShared'
import { getBusinessHero } from './refAssetsV2Generic'
import { producerVisual, renderProducerIconHtml } from './producerVisual'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { type ProducerDef } from '../../game/Economy'
import { FIRM_MAX_LEVEL, isFirmMaxLevel } from '../../game/FirmLevels'
import { firmUpgradesForProducer } from '../../game/FirmUpgrades'
import { modernizeCost } from '../../game/TechObsolescence'
import { hasManager } from '../../game/Managers'
import { SaveManager } from '../../security/SaveManager'

/* ── Mock data (state yoksa saf önizleme) ─────────────────────────────── */
const MOCK_FIRMS: FirmData[] = [
  { id: 'firin_1', name: 'Karahan Fırınları', slogan: 'Taze her gün', category: 'bakery', sector: 'gida', emoji: '🥖', level: 7, stars: 4, status: 'Büyüyor', income: 580_000, expense: 210_000, growth: 12.1, city: 'Ankara', performance: 76 },
  { id: 'berber_1', name: 'Beyoğlu Berber', category: 'barber', sector: 'hizmet', emoji: '💈', level: 6, stars: 4, status: 'Karlı', income: 320_000, expense: 120_000, growth: 8.3, city: 'İstanbul', performance: 82 },
  { id: 'kahve_1', name: 'Mavi Çekirdek', category: 'coffee', sector: 'gida', emoji: '☕', level: 8, stars: 5, status: 'Karlı', income: 1_120_000, expense: 340_000, growth: 9.7, city: 'İzmir', performance: 84 },
  { id: 'lojistik_1', name: 'Hızlı Kargo', category: 'logistics', sector: 'hizmet', emoji: '🚚', level: 4, stars: 2, status: 'Riskli', income: 1_050_000, expense: 180_000, growth: 7.6, city: 'Mersin', performance: 48, riskLevel: 65 },
]

/** ShopPanel ile aynı ayrım: büyüme (!category) vs imparatorluk (category). */
const NORMAL_PRODUCERS = REF_NORMAL_PRODUCERS
const EMPIRE_PRODUCERS = REF_EMPIRE_PRODUCERS

type CategoryKey = 'tumu' | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya' | 'illegal'
const MOCK_CATEGORIES: { id: CategoryKey; label: string; icon: string }[] = [
  { id: 'tumu', label: 'Tümü', icon: '' },
  { id: 'gida', label: 'Gıda', icon: '🍔' },
  { id: 'hizmet', label: 'Hizmet', icon: '🤝' },
  { id: 'teknoloji', label: 'Teknoloji', icon: '🚀' },
  { id: 'finans', label: 'Finans', icon: '💰' },
  { id: 'turizm', label: 'Turizm', icon: '✈️' },
  { id: 'medya', label: 'Medya', icon: '🎬' },
  { id: 'illegal', label: 'Illegal', icon: '🚫' },
]

type EmpireTab = 'sport' | 'politics' | 'dark' | 'luxury' | 'finance' | 'science'
const EMPIRE_TABS: { id: EmpireTab; label: string; icon: string }[] = [
  { id: 'sport', label: 'Spor', icon: '⚽' },
  { id: 'politics', label: 'Siyaset', icon: '🏛️' },
  { id: 'dark', label: 'Yeraltı', icon: '🔥' },
  { id: 'luxury', label: 'Lüks', icon: '💎' },
  { id: 'finance', label: 'Finans', icon: '📊' },
  { id: 'science', label: 'Bilim', icon: '🔬' },
]
const EMPIRE_PRODUCER_FILTER: Record<EmpireTab, (p: ProducerDef) => boolean> = {
  sport: (p) => p.category === 'sport',
  politics: (p) => p.category === 'politics',
  dark: (p) => p.category === 'dark',
  luxury: (p) => p.category === 'luxury',
  finance: (p) => p.category === 'finance',
  science: (p) => p.category === 'science',
}

type MainTab = 'normal' | 'empire'

const DETAIL_EXPENSE_SPLIT = [
  { label: 'Personel', value: 42, color: '#2563EB' },
  { label: 'Tedarik', value: 31, color: '#F6A609' },
  { label: 'Kira', value: 18, color: '#13B8A6' },
  { label: 'Diğer', value: 9, color: '#94B4C2' },
]

export class RefFirmsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'FİRMALAR'

  onOpenFirm?: (firm: FirmData) => void

  private activeCategory: CategoryKey = 'tumu'
  private activeLiveCategory: ProducerChipKey = 'tumu'
  private liveCatBtns = new Map<ProducerChipKey, HTMLButtonElement>()

  private cardEls = new Map<string, RefCard>()
  private cardsContainer!: HTMLElement
  private catBtns = new Map<CategoryKey, HTMLButtonElement>()

  private activeEmpireTab: EmpireTab = 'sport'
  private empireContentEl?: HTMLElement

  private producerCardsContainer!: HTMLElement
  private producerCards = new Map<string, HTMLElement>()
  private summaryEl?: HTMLElement
  private kpiStrip?: RefKpiStrip
  private detailOverlay?: HTMLElement
  private openDetailId: string | null = null
  private buyMode: RefBuyMode = 1
  private buyModeBtns = new Map<RefBuyMode, HTMLButtonElement>()

  private firms?: FirmData[]
  private state?: GameState

  constructor(firms?: FirmData[], _hasRealData = false, state?: GameState) {
    this.firms = firms
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-firms-page'
    this.buildPage()
  }

  private buildPage(): void {
    this.el.appendChild(this.buildKpi())
    this.el.appendChild(this.buildMainTabs())

    const normal = document.createElement('div')
    normal.className = 'ref-firms-tab-content'
    normal.dataset.tab = 'normal'
    if (this.state) {
      normal.appendChild(this.buildLiveProducerSection())
    } else {
      normal.appendChild(this.buildMockSection())
    }
    this.el.appendChild(normal)

    const empire = document.createElement('div')
    empire.className = 'ref-firms-tab-content'
    empire.dataset.tab = 'empire'
    empire.style.display = 'none'
    empire.appendChild(this.buildEmpireSection())
    this.el.appendChild(empire)

    if (this.state) {
      this.detailOverlay = document.createElement('div')
      this.detailOverlay.className = 'ref-producer-detail'
      this.detailOverlay.hidden = true
      this.detailOverlay.addEventListener('click', (e) => this.onDetailClick(e))
      this.el.appendChild(this.detailOverlay)
    }
  }

  private buildKpi(): HTMLElement {
    const s = this.state
    if (s) {
      this.kpiStrip = new RefKpiStrip(this.liveKpiItems(s))
      return this.kpiStrip.el
    }
    const data = this.firms?.length ? this.firms : MOCK_FIRMS
    const totalIncome = data.reduce((a, f) => a + f.income, 0)
    const avgPerf = data.length ? Math.round(data.reduce((a, f) => a + f.performance, 0) / data.length) : 0
    return new RefKpiStrip([
      { icon: '🏢', label: 'Aktif Firma', value: String(data.length), sub: 'Toplam', subDir: 'muted' },
      { icon: '📈', label: 'Firmalardan Gelir', value: fmtMoney(totalIncome), sub: 'İşletme gelirleri', subDir: 'up' },
      { icon: '💰', label: 'Yasadışı Gelir', value: 'Yok', sub: 'Günlük', subDir: 'muted' },
      { icon: '⚙️', label: 'Verimlilik', value: `${avgPerf}%`, sub: 'Ortalama', subDir: 'muted' },
    ]).el
  }

  private buildMainTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-main-tabs ref-main-tabs--two'
    const tabs: { id: MainTab; label: string; icon: string }[] = [
      { id: 'normal', label: 'Normal İşletmeler', icon: '🏪' },
      { id: 'empire', label: 'İmparatorluk Yatırımları', icon: '👑' },
    ]
    for (const tab of tabs) {
      const btn = document.createElement('button')
      btn.className = 'ref-main-tab' + (tab.id === 'normal' ? ' active' : '')
      btn.dataset.tab = tab.id
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchMainTab(tab.id))
      wrap.appendChild(btn)
    }
    return wrap
  }

  private switchMainTab(id: MainTab): void {
    this.el.querySelectorAll<HTMLButtonElement>('.ref-main-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === id)
    })
    this.el.querySelectorAll<HTMLElement>('.ref-firms-tab-content').forEach((sec) => {
      sec.style.display = sec.dataset.tab === id ? '' : 'none'
    })
  }

  /* ── Canlı Normal İşletmeler ───────────────────────────────────────── */
  private buildLiveProducerSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-live-biz'

    wrap.appendChild(this.buildLiveCatTabs())
    wrap.appendChild(this.buildBuyModeSelector())

    this.summaryEl = document.createElement('div')
    this.summaryEl.className = 'ref-summary-strip'
    wrap.appendChild(this.summaryEl)

    this.producerCardsContainer = document.createElement('div')
    this.producerCardsContainer.className = 'ref-cards-list ref-live-cards'
    this.producerCardsContainer.addEventListener('click', (e) => this.onLiveCardClick(e))
    wrap.appendChild(this.producerCardsContainer)

    this.buildProducerCards()
    this.updateSummary()
    this.applyLiveCategoryFilter()
    return wrap
  }

  private buildLiveCatTabs(): HTMLElement {
    const outer = document.createElement('div')
    outer.className = 'ref-cat-tabs-wrap'
    const wrap = document.createElement('div')
    wrap.className = 'ref-cat-tabs'
    for (const cat of PRODUCER_CHIP_TABS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-cat-tab' + (cat.id === 'tumu' ? ' active' : '')
      btn.dataset.chip = cat.id
      btn.innerHTML = cat.icon ? `<span class="tab-ico">${cat.icon}</span>${cat.label}` : cat.label
      btn.addEventListener('click', () => this.setLiveCategory(cat.id))
      this.liveCatBtns.set(cat.id, btn)
      wrap.appendChild(btn)
    }
    outer.appendChild(wrap)
    return outer
  }

  private setLiveCategory(id: ProducerChipKey): void {
    this.activeLiveCategory = id
    this.liveCatBtns.forEach((btn, key) => btn.classList.toggle('active', key === id))
    this.applyLiveCategoryFilter()
  }

  private buildBuyModeSelector(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-buy-modes-wrap'
    const label = document.createElement('span')
    label.className = 'ref-buy-modes-lbl'
    label.textContent = 'Satın alma'
    const row = document.createElement('div')
    row.className = 'ref-buy-modes'
    for (const { mode, label: lbl } of REF_BUY_MODES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-buy-mode-btn' + (mode === this.buyMode ? ' active' : '')
      btn.dataset.mode = String(mode)
      btn.textContent = lbl
      btn.addEventListener('click', () => this.setBuyMode(mode))
      this.buyModeBtns.set(mode, btn)
      row.appendChild(btn)
    }
    wrap.append(label, row)
    return wrap
  }

  private setBuyMode(mode: RefBuyMode): void {
    if (this.buyMode === mode) return
    this.buyMode = mode
    this.buyModeBtns.forEach((btn, key) => btn.classList.toggle('active', key === mode))
    this.refreshProducerCards()
    if (this.openDetailId && this.state) {
      const def = NORMAL_PRODUCERS.find((p) => p.id === this.openDetailId)
      if (def) this.paintProducerDetail(def, this.state)
    }
  }

  private executeProducerBuy(def: ProducerDef): boolean {
    if (!this.state || def.category) return false
    const snap = producerCardSnap(def, this.state, this.buyMode)
    if (!snap.canBuy || snap.purchaseCount <= 0) return false
    if (this.buyMode === 'max') return this.state.buyMaxProducer(def.id) > 0
    return this.state.buyProducer(def.id, snap.purchaseCount)
  }

  private buyModeLabel(): string {
    return REF_BUY_MODES.find((m) => m.mode === this.buyMode)?.label ?? '1x'
  }

  private applyLiveCategoryFilter(): void {
    for (const [, card] of this.producerCards) {
      const chip = card.dataset.chip ?? ''
      const match = this.activeLiveCategory === 'tumu' || chip === this.activeLiveCategory
      card.style.display = match ? '' : 'none'
    }
    this.updateSummary()
  }

  private buildProducerCards(): void {
    this.producerCards.clear()
    this.producerCardsContainer.innerHTML = ''
    const s = this.state!
    const sorted = [...NORMAL_PRODUCERS].sort((a, b) => a.tier - b.tier || a.unlockAt - b.unlockAt)
    for (const def of sorted) {
      const card = document.createElement('div')
      card.className = 'ref-live-firm-card ref-firm-card'
      card.dataset.id = def.id
      card.dataset.producerId = def.id
      this.producerCardsContainer.appendChild(card)
      this.producerCards.set(def.id, card)
      this.paintProducerCard(card, def, s)
    }
  }

  private paintProducerCard(card: HTMLElement, def: ProducerDef, s: GameState): void {
    const snap = producerCardSnap(def, s, this.buyMode)
    const visual = producerVisual(def)
    const chipLabel = producerChipLabel(snap.chip)
    const buyLabel = snap.buyCount > 1 ? `×${snap.buyCount} AL` : snap.owned > 0 ? '+1 AL' : 'SATIN AL'
    const firmLv = s.producerLevel(def.id)
    const lvCost = s.firmLevelUpCostFor(def)
    const canLevelUp = snap.owned > 0 && !isFirmMaxLevel(firmLv) && s.canAfford(lvCost)
    const owned = snap.owned
    const isModernized = s.producerModernized?.[def.id] ?? false
    const mrzCost = modernizeCost(def.tier, owned)
    const canModernize = owned > 0 && !isModernized && s.canAfford(mrzCost)
    const managerHired = hasManager(s.managers, def.id)
    const mgrCost = s.managerCostFor(def)
    const canHireManager = owned > 0 && !managerHired && s.canAfford(mgrCost)
    const cityLabel = s.cities?.activeCity ?? 'TR'
    const growthPct = firmLv > 0 ? `+${firmLv * 10}%` : '—'

    card.className = `ref-live-firm-card ref-firm-card ref-firm-card--premium state-${snap.stateClass}`
    card.dataset.chip = snap.chip
    card.dataset.state = snap.state
    card.dataset.tone = visual.tone

    const riskHtml = def.illegal
      ? `<div class="ref-risk-bar ref-risk-bar--sm"><span>⚠️</span> Riskli${owned > 0 ? ' · Isı takibi' : ''}</div>`
      : ''

    const ownedHtml = owned > 0
      ? `<span class="ref-live-owned-pill">×${owned}</span>`
      : `<span class="ref-live-owned-empty">Sahip değil</span>`

    const lockHtml = !snap.unlocked
      ? `<div class="ref-live-lock-foot"><span class="ref-live-lock-ico">🔒</span><span>${snap.lockReason ?? 'Kilitli'}</span></div>`
      : ''

    const buyHtml = snap.unlocked
      ? snap.canBuy
        ? `<button type="button" class="ref-firm-quick-buy" data-action="buy-producer">${buyLabel} <small>${snap.costText}</small></button>`
        : `<button type="button" class="ref-firm-quick-buy ref-firm-quick-buy--disabled" disabled>Para Yetersiz <small>${snap.costText}</small></button>`
      : ''

    card.innerHTML = `
      <div class="ref-firm-card__tone-accent ref-tone-accent-${visual.tone}"></div>
      <div class="ref-firm-card__body ref-firm-card__body--actions">
        <div class="ref-firm-card__main">
          <div class="ref-firm-top ref-firm-top--premium">
            <div class="ref-firm-icon-slot">${renderProducerIconHtml(visual)}</div>
            <div class="ref-firm-head">
              <div class="ref-firm-namebar">
                <span class="ref-firm-name">${def.name}</span>
                <span class="ref-firm-badge ${snap.badgeCls}">${snap.badge}</span>
              </div>
              <div class="ref-firm-meta">
                <span class="ref-live-cat-chip">${chipLabel}</span>
                <span class="ref-level-txt">T${def.tier}</span>
                ${owned > 0 ? `<span class="ref-firm-lvl-badge">Lv.${firmLv}</span>` : ''}
                ${ownedHtml}
              </div>
            </div>
          </div>
          ${riskHtml}
          ${lockHtml}
          <div class="ref-firm-ministats">
            <div class="ref-ministat">
              <span class="ref-ministat__lbl">Günlük Gelir</span>
              <span class="ref-ministat__val ref-ministat__val--income">${snap.totalIncomeText ?? snap.marginalIncomeText}</span>
            </div>
            <div class="ref-ministat">
              <span class="ref-ministat__lbl">Büyüme</span>
              <span class="ref-ministat__val ref-ministat__val--up">${growthPct}</span>
            </div>
            <div class="ref-ministat">
              <span class="ref-ministat__lbl">Maliyet</span>
              <span class="ref-ministat__val ref-ministat__val--expense">${snap.costText}</span>
            </div>
            <div class="ref-ministat">
              <span class="ref-ministat__lbl">Şehir</span>
              <span class="ref-ministat__val">${cityLabel}</span>
            </div>
          </div>
          <div class="ref-perf ref-perf--slim">
            <div class="ref-perf-track"><div class="ref-perf-fill ${snap.perfCls}" style="width:${snap.perfPct}%"></div></div>
          </div>
          ${buyHtml}
        </div>
        <div class="ref-firm-actions">
          <button type="button" class="ref-firm-action-btn ref-firm-action-btn--develop${canLevelUp ? '' : ' ref-firm-action-btn--off'}"
            data-action="levelup-firm" ${canLevelUp ? '' : 'disabled'}>
            ⬆️ GELİŞTİR
            <small>${isFirmMaxLevel(firmLv) ? 'Maks Lv' : `Lv.${firmLv + 1} · ${fmtMoney(lvCost)}`}</small>
          </button>
          <button type="button" class="ref-firm-action-btn ref-firm-action-btn--modernize${canModernize ? '' : ' ref-firm-action-btn--off'}"
            data-action="modernize-producer" ${canModernize ? '' : 'disabled'}>
            🔧 MODERNİZE
            <small>${isModernized ? '✓ Modernize' : owned > 0 ? fmtMoney(mrzCost) : 'Önce al'}</small>
          </button>
          <button type="button" class="ref-firm-action-btn ref-firm-action-btn--manager${canHireManager ? '' : ' ref-firm-action-btn--off'}"
            data-action="hire-manager" ${canHireManager ? '' : 'disabled'}>
            👤 MANAGER
            <small>${managerHired ? '✓ Atandı' : owned > 0 ? fmtMoney(mgrCost) : 'Önce al'}</small>
          </button>
        </div>
      </div>
    `
  }

  private onLiveCardClick(e: Event): void {
    if (!this.state) return
    const lvBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="levelup-firm"]')
    if (lvBtn) {
      e.stopPropagation()
      const card = lvBtn.closest<HTMLElement>('.ref-live-firm-card')
      const id = card?.dataset.id
      if (!id) return
      const def = NORMAL_PRODUCERS.find((p) => p.id === id)
      if (!def) return
      const ok = this.state.levelUpFirm(id)
      if (ok) {
        new SaveManager().save(this.state)
        refToast(`⬆️ ${def.name} Lv.${this.state.producerLevel(id)}`, 'ok')
        this.refreshProducerCards()
        this.updateKpi()
        if (this.openDetailId === id) this.paintProducerDetail(def, this.state)
      } else refToast('Seviye atlatılamadı', 'err')
      return
    }
    const mrzBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="modernize-producer"]')
    if (mrzBtn) {
      e.stopPropagation()
      const card = mrzBtn.closest<HTMLElement>('.ref-live-firm-card')
      const id = card?.dataset.id
      if (!id) return
      const def = NORMAL_PRODUCERS.find((p) => p.id === id)
      if (!def) return
      const ok = this.state.modernizeProducer(id)
      if (ok) {
        new SaveManager().save(this.state)
        refToast(`🔧 ${def.name} modernize edildi`, 'ok')
        this.refreshProducerCards()
        this.updateKpi()
        if (this.openDetailId === id) this.paintProducerDetail(def, this.state)
      } else refToast('Modernize edilemedi', 'err')
      return
    }

    const mgrBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="hire-manager"]')
    if (mgrBtn) {
      e.stopPropagation()
      const card = mgrBtn.closest<HTMLElement>('.ref-live-firm-card')
      const id = card?.dataset.id
      if (!id) return
      const def = NORMAL_PRODUCERS.find((p) => p.id === id)
      if (!def) return
      const ok = this.state.hireManager(id)
      if (ok) {
        new SaveManager().save(this.state)
        refToast(`👤 ${def.name} yöneticisi atandı`, 'ok')
        this.refreshProducerCards()
        this.updateKpi()
        if (this.openDetailId === id) this.paintProducerDetail(def, this.state)
      } else refToast('Yönetici atanamadı', 'err')
      return
    }

    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="buy-producer"]')
    if (btn) {
      e.stopPropagation()
      const card = btn.closest<HTMLElement>('.ref-live-firm-card')
      const id = card?.dataset.id
      if (!id) return
      const def = NORMAL_PRODUCERS.find((p) => p.id === id)
      if (!def) return
      const snap = producerCardSnap(def, this.state, this.buyMode)
      const ok = this.executeProducerBuy(def)
      if (ok) {
        new SaveManager().save(this.state)
        const qty = snap.purchaseCount > 1 ? ` ×${snap.purchaseCount}` : ''
        refToast(`${def.emoji} ${def.name}${qty} alındı`, 'ok')
        this.refreshProducerCards()
        this.updateKpi()
        if (this.openDetailId === id) this.paintProducerDetail(def, this.state)
      } else {
        refToast('Satın alınamadı', 'err')
      }
      return
    }
    const card = (e.target as HTMLElement).closest<HTMLElement>('.ref-live-firm-card, .ref-empire-card')
    if (!card) return
    const id = card.dataset.id
    if (!id) return
    const def = NORMAL_PRODUCERS.find((p) => p.id === id) ?? EMPIRE_PRODUCERS.find((p) => p.id === id)
    if (def) this.openProducerDetail(def)
  }

  private openProducerDetail(def: ProducerDef): void {
    if (!this.state || !this.detailOverlay) return
    this.openDetailId = def.id
    this.paintProducerDetail(def, this.state)
    this.detailOverlay.hidden = false
    this.detailOverlay.scrollTop = 0
  }

  private closeProducerDetail(): void {
    this.openDetailId = null
    if (this.detailOverlay) this.detailOverlay.hidden = true
  }

  private paintProducerDetail(def: ProducerDef, s: GameState): void {
    if (!this.detailOverlay) return
    const snap = producerCardSnap(def, s, this.buyMode)
    const visual = producerVisual(def)
    const chipLabel = producerChipLabel(snap.chip)
    const modeLbl = this.buyModeLabel()
    const heroSrc = ua(getBusinessHero(visual.assetKey))
    const trend = producerDetailTrend(def, snap.perfPct)
    const satisfaction = producerDetailSatisfaction(snap.perfPct)
    const isEmpire = !!def.category
    const firmLv = s.producerLevel(def.id)
    const purchased = s.firmUpgradesPurchased(def.id)
    const upgrades = firmUpgradesForProducer(def)
    const lvCost = s.firmLevelUpCostFor(def)
    const canLevelUp = snap.owned > 0 && !isFirmMaxLevel(firmLv) && s.canAfford(lvCost)

    this.detailOverlay.innerHTML = `
      <div class="ref-producer-detail__scroll">
        <div class="ref-detail-hero ref-producer-detail-hero ref-tone-hero-${visual.tone}">
          <img src="${heroSrc}" alt="" class="ref-detail-hero__img" loading="lazy" decoding="async"
            onerror="this.style.opacity='0'">
          <div class="ref-detail-hero__scrim"></div>
          <button type="button" class="ref-detail-back" aria-label="Geri">‹</button>
          <span class="ref-firm-badge ${snap.badgeCls} ref-detail-hero__badge">${snap.badge}</span>
          <div class="ref-producer-detail-hero__icon">${renderProducerIconHtml(visual)}</div>
          <div class="ref-detail-hero__title">
            <div class="ref-detail-name">${def.name}</div>
            <div class="ref-detail-slogan">${chipLabel} · Kademe T${def.tier}${snap.owned > 0 ? ` · Lv.${firmLv}` : ''}${def.description ? ` · ${def.description}` : ''}</div>
          </div>
        </div>
        <div class="ref-body ref-detail-body ref-producer-detail-body">
          <div class="ref-detail-id">
            <div class="ref-detail-id__left">
              <span class="ref-detail-lvl">${snap.owned > 0 ? `Lv.${firmLv} · ${snap.owned} adet` : 'Sahip değil'}</span>
              <div class="ref-stars ref-detail-stars">${starsHtml(snap.stars)}</div>
            </div>
            <div class="ref-detail-id__city"><span>📊</span> ${chipLabel}</div>
          </div>
          ${def.illegal ? `<div class="ref-risk-bar ref-detail-risk"><span>⚠️</span> Riskli işletme</div>` : ''}
          ${!snap.unlocked ? `<div class="ref-live-lock-foot ref-detail-lock"><span class="ref-live-lock-ico">🔒</span><span>${snap.lockReason ?? 'Kilitli'}</span></div>` : ''}
          <div class="ref-buy-mode-pill ref-detail-buy-mode">${modeLbl} modu</div>
          <div class="ref-detail-net ref-producer-detail-net">
            <span class="ref-detail-net__lbl">Günlük +${snap.buyCount} Gelir</span>
            <span class="ref-detail-net__val income">${snap.marginalIncomeText}</span>
          </div>
          <div class="ref-detail-stats ref-producer-detail-stats">
            <div class="ref-detail-stat">
              <span class="ref-stat-lbl">Toplam Pasif</span>
              <span class="ref-stat-val income">${snap.totalIncomeText ?? '—'}</span>
            </div>
            <div class="ref-detail-stat">
              <span class="ref-stat-lbl">${snap.buyCount > 1 ? 'Toplu Maliyet' : 'Sonraki Maliyet'}</span>
              <span class="ref-stat-val expense">${snap.costText}</span>
            </div>
            <div class="ref-detail-stat">
              <span class="ref-stat-lbl">Sahip Olunan</span>
              <span class="ref-stat-val">${snap.owned > 0 ? snap.owned : '—'}</span>
            </div>
            <div class="ref-detail-stat">
              <span class="ref-stat-lbl">Durum</span>
              <span class="ref-stat-val">${snap.badge}</span>
            </div>
          </div>
          <div class="ref-perf ref-detail-perf">
            <div class="ref-perf-row">
              <span class="ref-perf-lbl">${snap.state === 'locked' ? 'Kilidi Açma' : 'Operasyonel Performans'}</span>
              <span class="ref-perf-pct">${snap.perfPct}%</span>
            </div>
            <div class="ref-perf-track"><div class="ref-perf-fill ${snap.perfCls}" style="width:${snap.perfPct}%"></div></div>
          </div>
          <div class="ref-card-soft ref-detail-chart">
            <div class="ref-card-soft__title-row">
              <span class="ref-card-soft__title">Gelir Trendi · 14 gün <span class="ref-est-tag">tahmini</span></span>
            </div>
            ${areaChartSvg(trend, '#13B8A6', 320, 80)}
          </div>
          <div class="ref-detail-2col">
            <div class="ref-card-soft ref-detail-gauge">
              <div class="ref-card-soft__title">Memnuniyet <span class="ref-est-tag">tahmini</span></div>
              ${gaugeSvg(satisfaction, '#28C76F')}
            </div>
            <div class="ref-card-soft ref-detail-expense">
              <div class="ref-card-soft__title">Gider Dağılımı <span class="ref-est-tag">tahmini</span></div>
              <div class="ref-mini-donut">
                ${donutSvg(DETAIL_EXPENSE_SPLIT, 72, 13)}
                <div class="ref-donut-legend sm">
                  ${DETAIL_EXPENSE_SPLIT.map((seg) => `
                    <div class="ref-legend-row">
                      <span class="ref-legend-dot" style="background:${seg.color}"></span>
                      <span class="ref-legend-lbl">${seg.label}</span>
                      <span class="ref-legend-val">%${seg.value}</span>
                    </div>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="ref-detail-id-card">
            <div class="ref-detail-id-card__row">
              <div class="ref-detail-id-card__cell">
                <span class="ref-detail-id-card__lbl">Seviye</span>
                <span class="ref-detail-id-card__val">${snap.owned > 0 ? `Lv.${firmLv}` : '—'}</span>
              </div>
              <div class="ref-detail-id-card__cell">
                <span class="ref-detail-id-card__lbl">Şehir</span>
                <span class="ref-detail-id-card__val">${s.cities?.activeCity ?? 'TR'}</span>
              </div>
              <div class="ref-detail-id-card__cell">
                <span class="ref-detail-id-card__lbl">Günlük Gelir</span>
                <span class="ref-detail-id-card__val ref-detail-id-card__val--income">${snap.totalIncomeText ?? '—'}</span>
              </div>
              <div class="ref-detail-id-card__cell">
                <span class="ref-detail-id-card__lbl">Aylık Kâr</span>
                <span class="ref-detail-id-card__val ref-detail-id-card__val--income">${snap.totalIncomeText ? fmtMoney(Math.round(parseFloat(snap.totalIncomeText.replace(/[^0-9.]/g, '')) * 30)) : '—'}</span>
              </div>
            </div>
          </div>
          <div class="ref-detail-section-title">Geliştirmeler <span class="ref-est-tag">sektöre özel</span></div>
          <div class="ref-detail-upg-list">
            ${upgrades.length === 0
              ? '<div class="ref-detail-upg-row ref-detail-upg-row--empty">Bu işletme için geliştirme yok</div>'
              : upgrades.map((up, i) => {
                const isPurchased = purchased.includes(up.id)
                const cost = s.firmUpgradeCostFor(def, up.id)
                const canBuy = !isPurchased && snap.owned > 0 && s.canAfford(cost)
                return `
              <div class="ref-detail-upg-row${isPurchased ? ' ref-detail-upg-row--owned' : ''}">
                <span class="ref-detail-upg-row__icon">${up.emoji}</span>
                <div class="ref-detail-upg-row__info">
                  <span class="ref-detail-upg-row__name">${up.name}</span>
                  <span class="ref-detail-upg-row__desc">${up.description}</span>
                </div>
                <div class="ref-detail-upg-row__lvl">Lv.${i + 1}</div>
                <button type="button" class="ref-detail-upg-row__btn${isPurchased ? ' ref-detail-upg-row__btn--owned' : canBuy ? '' : ' ref-detail-upg-row__btn--off'}"
                  data-action="buy-firm-upgrade" data-upgrade-id="${up.id}"
                  ${isPurchased || !canBuy ? 'disabled' : ''}>
                  ${isPurchased ? '✓' : fmtMoney(cost)}
                </button>
              </div>`
              }).join('')}
          </div>
          <div class="ref-detail-section-title">Şubeler</div>
          <div class="ref-detail-branches">
            ${snap.owned > 0
              ? `<div class="ref-detail-branch-row">
                  <span class="ref-detail-branch-ico">🏪</span>
                  <span class="ref-detail-branch-name">${def.name}</span>
                  <span class="ref-detail-branch-count">${snap.owned} şube</span>
                </div>`
              : `<div class="ref-detail-upg-row--empty ref-detail-branch-empty">Henüz şube yok</div>`}
            <div class="ref-detail-branch-row ref-detail-branch-row--locked">
              <span class="ref-detail-branch-ico">🔒</span>
              <span class="ref-detail-branch-name">Franchise</span>
              <span class="ref-detail-branch-count">Kilitli</span>
            </div>
          </div>
          <div class="ref-detail-actions">
            ${isEmpire
              ? `<button class="ref-btn develop disabled" type="button" disabled>👑 İmparatorluk · önizleme</button>`
              : snap.canBuy
                ? `<button class="ref-btn develop" type="button" data-action="detail-buy">${snap.buyCount > 1 ? `×${snap.buyCount} AL` : 'SATIN AL'} · ${snap.costText}</button>`
                : `<button class="ref-btn develop disabled" type="button" disabled>${snap.unlocked ? (this.buyMode === 'max' && snap.purchaseCount <= 0 ? 'Max 0' : 'Para Yetersiz') : 'Kilitli'}</button>`}
            ${snap.owned > 0 && !isFirmMaxLevel(firmLv)
              ? `<button class="ref-btn modernize${canLevelUp ? '' : ' disabled'}" type="button" data-action="detail-levelup"${canLevelUp ? '' : ' disabled'}>⬆️ Lv.${firmLv + 1} · ${fmtMoney(lvCost)}</button>`
              : snap.owned > 0
                ? `<button class="ref-btn modernize disabled" type="button" disabled>Lv.${FIRM_MAX_LEVEL} Maks</button>`
                : `<button class="ref-btn modernize disabled" type="button" disabled>⚙️ Seviye için sahip ol</button>`}
            <button class="ref-btn manager disabled" type="button" disabled>👤 MANAGER</button>
          </div>
          <div class="ref-preview-note">Gelir/maliyet eski oyun sisteminden · seviye ve geliştirmeler kalıcı</div>
        </div>
      </div>
    `

    const heroImg = this.detailOverlay.querySelector<HTMLImageElement>('.ref-detail-hero__img')
    if (heroImg) {
      if (heroImg.complete && heroImg.naturalWidth > 0) heroImg.classList.add('loaded')
      else heroImg.addEventListener('load', () => heroImg.classList.add('loaded'), { once: true })
    }

  }

  private onDetailClick(e: Event): void {
    if (!this.state || !this.openDetailId) return
    const target = e.target as HTMLElement
    if (target.closest('.ref-detail-back')) {
      this.closeProducerDetail()
      return
    }
    const def = NORMAL_PRODUCERS.find((p) => p.id === this.openDetailId)
      ?? EMPIRE_PRODUCERS.find((p) => p.id === this.openDetailId)
    if (!def) return

    const buyBtn = target.closest<HTMLButtonElement>('[data-action="detail-buy"]')
    if (buyBtn) {
      e.stopPropagation()
      const snapNow = producerCardSnap(def, this.state, this.buyMode)
      const ok = this.executeProducerBuy(def)
      if (ok) {
        new SaveManager().save(this.state)
        const qty = snapNow.purchaseCount > 1 ? ` ×${snapNow.purchaseCount}` : ''
        refToast(`${def.emoji} ${def.name}${qty} alındı`, 'ok')
        this.refreshProducerCards()
        this.paintProducerDetail(def, this.state)
        this.updateKpi()
      } else refToast('Satın alınamadı', 'err')
      return
    }

    const lvBtn = target.closest<HTMLButtonElement>('[data-action="detail-levelup"]')
    if (lvBtn) {
      e.stopPropagation()
      const ok = this.state.levelUpFirm(def.id)
      if (ok) {
        new SaveManager().save(this.state)
        refToast(`⬆️ ${def.name} Lv.${this.state.producerLevel(def.id)}`, 'ok')
        this.refreshProducerCards()
        this.paintProducerDetail(def, this.state)
        this.updateKpi()
      } else refToast('Seviye atlatılamadı', 'err')
      return
    }

    const upBtn = target.closest<HTMLButtonElement>('[data-action="buy-firm-upgrade"]')
    if (upBtn) {
      e.stopPropagation()
      const upgradeId = upBtn.dataset.upgradeId
      if (!upgradeId) return
      const ok = this.state.buyFirmUpgrade(def.id, upgradeId)
      if (ok) {
        new SaveManager().save(this.state)
        refToast(`${def.emoji} geliştirme alındı`, 'ok')
        this.refreshProducerCards()
        this.paintProducerDetail(def, this.state)
        this.updateKpi()
      } else refToast('Geliştirme alınamadı', 'err')
    }
  }

  private refreshProducerCards(): void {
    if (!this.state || !this.producerCardsContainer) return
    const s = this.state
    for (const def of NORMAL_PRODUCERS) {
      const card = this.producerCards.get(def.id)
      if (card) this.paintProducerCard(card, def, s)
    }
    this.applyLiveCategoryFilter()
  }

  private updateSummary(): void {
    if (!this.summaryEl || !this.state) return
    const s = this.state
    const visible = [...this.producerCards.values()].filter((c) => c.style.display !== 'none')
    const ownedVisible = visible.filter((c) => (c.dataset.state === 'owned' || c.dataset.state === 'no-cash')).length
    this.summaryEl.innerHTML = `
      <span class="ref-summary-count">${visible.length} işletme · ${ownedVisible} sahip</span>
      <span class="ref-summary-total">Nakit ${fmtMoney(Math.round(s.money))}</span>
    `
  }

  /* ── Mock önizleme ─────────────────────────────────────────────────── */
  private buildMockSection(): HTMLElement {
    const wrap = document.createElement('div')
    const data = this.firms?.length ? this.firms : MOCK_FIRMS

    const note = document.createElement('div')
    note.className = 'ref-preview-note ref-firms-note'
    note.textContent = '🔒 Önizleme modu · gerçek oyun verisi yok (mock)'
    wrap.appendChild(note)
    wrap.appendChild(this.buildCatTabs())

    const summary = document.createElement('div')
    summary.className = 'ref-summary-strip'
    const totalIncome = data.reduce((a, f) => a + f.income, 0)
    summary.innerHTML = `
      <span class="ref-summary-count">${data.length} firma gösteriliyor</span>
      <span class="ref-summary-total">Toplam: ${fmtMoney(totalIncome)} / Gün</span>`
    wrap.appendChild(summary)

    this.cardsContainer = document.createElement('div')
    this.cardsContainer.className = 'ref-cards-list'
    wrap.appendChild(this.cardsContainer)

    for (const firm of data) {
      const card = new RefCard(firm)
      this.cardEls.set(firm.id, card)
      card.el.addEventListener('click', (ev) => {
        if ((ev.target as HTMLElement).closest('.ref-btn, .ref-firm-menu')) return
        this.onOpenFirm?.(firm)
      })
      this.cardsContainer.appendChild(card.el)
    }
    return wrap
  }

  private buildCatTabs(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-cat-tabs'
    for (const cat of MOCK_CATEGORIES) {
      const btn = document.createElement('button')
      btn.className = 'ref-cat-tab' + (cat.id === 'tumu' ? ' active' : '')
      btn.innerHTML = cat.icon ? `<span class="tab-ico">${cat.icon}</span>${cat.label}` : cat.label
      btn.addEventListener('click', () => this.setCategory(cat.id))
      this.catBtns.set(cat.id, btn)
      wrap.appendChild(btn)
    }
    return wrap
  }

  private setCategory(id: CategoryKey): void {
    this.activeCategory = id
    this.catBtns.forEach((btn, key) => btn.classList.toggle('active', key === id))
    for (const [, card] of this.cardEls) {
      const match = this.activeCategory === 'tumu' || card.data.sector === this.activeCategory
      card.el.style.display = match ? '' : 'none'
    }
  }

  /* ── İmparatorluk Yatırımları (view-only) ─────────────────────────── */
  private buildEmpireSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-empire-inv'

    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = '👑 İmparatorluk yatırımları · önizleme (satın alma bu aşamada kapalı)'
    wrap.appendChild(note)

    const tabBar = document.createElement('div')
    tabBar.className = 'ref-empire-tabs'
    const content = document.createElement('div')
    content.className = 'ref-empire-inv-content'
    this.empireContentEl = content
    content.addEventListener('click', (e) => this.onLiveCardClick(e))
    for (const tab of EMPIRE_TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-empire-tab' + (tab.id === this.activeEmpireTab ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.switchEmpireTab(tab.id, tabBar, content))
      tabBar.appendChild(btn)
    }
    wrap.appendChild(tabBar)
    wrap.appendChild(content)
    this.renderEmpireTab(this.activeEmpireTab, content)
    return wrap
  }

  private switchEmpireTab(id: EmpireTab, tabBar: HTMLElement, content: HTMLElement): void {
    this.activeEmpireTab = id
    tabBar.querySelectorAll<HTMLButtonElement>('.ref-empire-tab').forEach((btn, i) => {
      btn.classList.toggle('active', EMPIRE_TABS[i]?.id === id)
    })
    this.renderEmpireTab(id, content)
  }

  private renderEmpireTab(id: EmpireTab, content: HTMLElement): void {
    const s = this.state
    const list = EMPIRE_PRODUCERS.filter(EMPIRE_PRODUCER_FILTER[id]).sort((a, b) => a.tier - b.tier)
    content.innerHTML = ''
    if (!list.length) {
      content.innerHTML = '<div class="ref-empire-empty">Bu kategoride içerik yok.</div>'
      return
    }
    const grid = document.createElement('div')
    grid.className = 'ref-empire-cards ref-live-cards'
    for (const def of list) {
      grid.appendChild(s ? this.buildEmpireCard(def, s) : this.buildEmpireCardPreview(def))
    }
    content.appendChild(grid)
  }

  /** İmparatorluk kartı — gerçek maliyet/gelir, satın alma view-only. */
  private buildEmpireCard(def: ProducerDef, s: GameState): HTMLElement {
    const snap = producerCardSnap(def, s)
    const visual = producerVisual(def)
    const chipLabel = producerChipLabel(snap.chip)
    const iconHtml = renderProducerIconHtml(visual).replace(
      'class="ref-firm-icon',
      'class="ref-firm-icon ref-empire-icon',
    )
    const card = document.createElement('div')
    card.className = `ref-empire-card ref-live-firm-card ref-firm-card--premium state-${snap.stateClass}` + (snap.owned > 0 ? ' owned' : '')
    card.dataset.id = def.id
    card.dataset.tone = visual.tone
    card.innerHTML = `
      <div class="ref-firm-card__tone-accent ref-tone-accent-${visual.tone}"></div>
      <div class="ref-empire-card__head">
        ${iconHtml}
        <div class="ref-empire-card__info">
          <div class="ref-empire-card__name">${def.name}</div>
          <div class="ref-empire-card__meta">
            <span class="ref-live-cat-chip">${chipLabel}</span>
            <span class="ref-level-txt">T${def.tier}</span>
            ${snap.owned > 0 ? `<span class="ref-live-owned-pill">×${snap.owned}</span>` : ''}
          </div>
          <div class="ref-empire-card__tier"><span class="ref-firm-badge ${snap.badgeCls}">${snap.badge}</span></div>
        </div>
        <span class="ref-firm-chevron" aria-hidden="true">›</span>
      </div>
      <div class="ref-live-econ-row ref-empire-econ">
        <div class="ref-live-econ ref-live-econ--income">
          <span class="ref-live-econ-lbl">Günlük +1</span>
          <span class="ref-live-econ-val">${snap.marginalIncomeText}</span>
        </div>
        <div class="ref-live-econ ref-live-econ--cost">
          <span class="ref-live-econ-lbl">Maliyet</span>
          <span class="ref-live-econ-val">${snap.costText}</span>
        </div>
      </div>
      ${snap.totalIncomeText ? `<div class="ref-live-total-income ref-empire-total"><span>Toplam pasif</span><strong>${snap.totalIncomeText}</strong></div>` : ''}
      <div class="ref-empire-card__foot">
        <span class="ref-empire-preview-tag">Önizleme · satın alma kapalı</span>
      </div>`
    return card
  }

  private buildEmpireCardPreview(def: ProducerDef): HTMLElement {
    const visual = producerVisual(def)
    const chipLabel = producerChipLabel(producerChipCategory(def))
    const iconHtml = renderProducerIconHtml(visual).replace(
      'class="ref-firm-icon',
      'class="ref-firm-icon ref-empire-icon',
    )
    const card = document.createElement('div')
    card.className = 'ref-empire-card ref-firm-card--premium'
    card.dataset.id = def.id
    card.innerHTML = `
      <div class="ref-empire-card__head">
        ${iconHtml}
        <div class="ref-empire-card__info">
          <div class="ref-empire-card__name">${def.name}</div>
          <div class="ref-empire-card__meta"><span class="ref-live-cat-chip">${chipLabel}</span><span class="ref-level-txt">T${def.tier}</span></div>
        </div>
      </div>
      <div class="ref-empire-card__foot">
        <button class="ref-prod-btn disabled" type="button" disabled>Önizleme · veri yok</button>
      </div>`
    return card
  }

  private liveKpiItems(s: GameState): KpiItem[] {
    const legalIncome = Math.round(s.legalIncomePerDay())
    const illegalIncome = Math.round(s.illegalIncomePerDay())
    const ownedProducers = NORMAL_PRODUCERS.filter((p) => (s.producers[p.id] ?? 0) > 0)
    const ownedTypes = ownedProducers.length
    const totalUnits = NORMAL_PRODUCERS.reduce((sum, p) => sum + (s.producers[p.id] ?? 0), 0)
    const efficiency = NORMAL_PRODUCERS.length
      ? Math.round((ownedTypes / NORMAL_PRODUCERS.length) * 100)
      : 0
    const avgLevel = ownedProducers.length
      ? (ownedProducers.reduce((sum, p) => sum + s.producerLevel(p.id), 0) / ownedProducers.length).toFixed(1)
      : '0'
    return [
      { icon: '🏢', label: 'Aktif Firma', value: String(ownedTypes), sub: `${totalUnits} birim`, subDir: 'muted' },
      { icon: '📈', label: 'Yasal Gelir', value: fmtMoney(legalIncome), sub: 'Günlük', subDir: 'up' },
      { icon: '💰', label: 'Yasadışı Gelir', value: illegalIncome > 0 ? fmtMoney(illegalIncome) : 'Yok', sub: 'Günlük', subDir: illegalIncome > 0 ? 'up' : 'muted' },
      { icon: '⚙️', label: 'Op. Verimlilik', value: `%${efficiency}`, sub: `${ownedTypes}/${NORMAL_PRODUCERS.length} tür`, subDir: efficiency > 0 ? 'up' : 'muted' },
      { icon: '⭐', label: 'Ort. Firma Lv', value: `Lv.${avgLevel}`, sub: 'Seviye ortalaması', subDir: parseFloat(avgLevel) > 1 ? 'up' : 'muted' },
    ]
  }

  private updateKpi(): void {
    if (this.kpiStrip && this.state) this.kpiStrip.update(this.liveKpiItems(this.state))
  }

  refresh(state: GameState): void {
    this.state = state
    this.updateKpi()
    this.refreshProducerCards()
    if (this.empireContentEl) this.renderEmpireTab(this.activeEmpireTab, this.empireContentEl)
    if (this.openDetailId) {
      const def = NORMAL_PRODUCERS.find((p) => p.id === this.openDetailId)
        ?? EMPIRE_PRODUCERS.find((p) => p.id === this.openDetailId)
      if (def) this.paintProducerDetail(def, state)
    }
  }

  onShow(): void {
    this.closeProducerDetail()
  }
}
