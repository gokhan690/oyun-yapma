import type { GameState } from '../../game/GameState'
import { PRODUCERS, UPGRADES, formatMoney, producerIconPath, earlyUnlockCost, isProducerUnlocked, type ProducerDef, type UpgradeDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost } from '../../game/Research'
import { ACHIEVEMENTS, type AchievementDef } from '../../game/Achievements'
import { getActiveSynergies } from '../../game/Synergies'
import { PRESTIGE_THRESHOLD } from '../../game/GameState'
import { calcPrestigePoints, prestigeMultiplier } from '../../game/Prestige'
import { managerCost, hasManager } from '../../game/Managers'
import { profitLoss, sparklinePath, STOCK_DEFS } from '../../game/StockMarket'
import { PRESTIGE_TREE_NODES, canBuyNode, hasNode } from '../../game/PrestigeTree'
import { dailyGoalProgress, scaledDailyGoalTarget } from '../../game/DailyGoal'

export type BuyMode = 1 | 10 | 'max'
export type IpoSubTab = 'stock' | 'prestige' | 'ipo'
export type UpgradeFilter = 'all' | 'click' | 'global' | 'producer'
export type AchievementCategory = 'all' | 'earn' | 'click' | 'business' | 'ipo'
export type BizTypeFilter = 'all' | 'legal' | 'illegal'

const TAB_SUBTITLES: Record<string, string> = {
  businesses: 'İşletme satın al ve genişlet',
  management: 'Yönetici işe al, otomasyon kur',
  upgrades: 'Gelir ve tıklama güçlendir',
  research: 'Kalıcı bonuslar araştır',
  missions: 'Günlük görevleri tamamla',
  achievements: 'Başarımları keşfet',
  ipo: 'Borsa ve şirket birleşmesi',
}

const MILESTONES = [1, 10, 25, 50, 100]

export class ShopPanel {
  readonly root: HTMLElement
  private buyMode: BuyMode = 1
  private activeTab = 'businesses'
  private panels: Record<string, HTMLElement> = {}
  private tabButtons: HTMLButtonElement[] = []
  private buyModesEl!: HTMLElement
  private shopSubEl!: HTMLElement
  private shopHubEl!: HTMLElement
  private businessCards = new Map<string, HTMLDivElement>()
  private synergyEl: HTMLElement | null = null
  private selectedAchievementId: string | null = null
  private ipoSubTab: IpoSubTab = 'stock'
  private upgradeFilter: UpgradeFilter = 'all'
  private achievementCategory: AchievementCategory = 'all'
  private achievementViewMode: 'grid' | 'list' = 'grid'
  private bizTypeFilter: BizTypeFilter = 'all'

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'shop-panel shop-tab-businesses'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'shop-header'
    const title = document.createElement('span')
    title.className = 'shop-title'
    title.textContent = 'Mağaza'
    this.shopSubEl = document.createElement('span')
    this.shopSubEl.className = 'shop-sub'
    this.shopSubEl.textContent = TAB_SUBTITLES.businesses
    header.append(title, this.shopSubEl)

    const buyModes = document.createElement('div')
    buyModes.className = 'buy-modes'
    this.buyModesEl = buyModes
    for (const mode of ['1', '10', 'max'] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'buy-mode-btn'
      btn.dataset.action = 'buy-mode'
      btn.dataset.count = mode
      btn.textContent = mode === 'max' ? 'Max' : `x${mode}`
      if (mode === '1') btn.classList.add('active')
      buyModes.appendChild(btn)
    }

    const tabs = document.createElement('div')
    tabs.className = 'shop-tabs-pill'
    const tabDefs = [
      { id: 'businesses', label: 'İşletme', icon: '🏢' },
      { id: 'management', label: 'Yönetim', icon: '👔' },
      { id: 'upgrades', label: 'Yükselt', icon: '⬆️' },
      { id: 'research', label: 'Ar-Ge', icon: '🔬' },
      { id: 'missions', label: 'Görev', icon: '📋' },
      { id: 'achievements', label: 'Başarım', icon: '🏆' },
      { id: 'ipo', label: 'Borsa', icon: '📈' },
    ]
    for (const t of tabDefs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab-btn'
      btn.dataset.action = 'shop-tab'
      btn.dataset.id = t.id
      btn.dataset.tab = t.id
      btn.innerHTML = `<span>${t.icon}</span> ${t.label}`
      if (t.id === 'businesses') btn.classList.add('active')
      this.tabButtons.push(btn)
      tabs.appendChild(btn)
    }

    for (const id of tabDefs.map((t) => t.id)) {
      const panel = document.createElement('div')
      panel.className = 'tab-panel'
      panel.dataset.panel = id
      panel.hidden = id !== 'businesses'
      this.panels[id] = panel
    }

    const tabsWrap = document.createElement('div')
    tabsWrap.className = 'shop-tabs-wrap'
    tabsWrap.appendChild(tabs)

    const chrome = document.createElement('div')
    chrome.className = 'shop-chrome'
    this.shopHubEl = document.createElement('div')
    this.shopHubEl.className = 'shop-hub-strip'
    chrome.append(header, this.shopHubEl, buyModes, tabsWrap)

    const body = document.createElement('div')
    body.className = 'shop-body'
    for (const panel of Object.values(this.panels)) {
      body.appendChild(panel)
    }

    this.root.append(chrome, body)
  }

  setTab(id: string): void {
    this.activeTab = id
    this.root.className = `shop-panel shop-tab-${id}`
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === id)
    }
    for (const [pid, panel] of Object.entries(this.panels)) {
      const show = pid === id
      panel.hidden = !show
      if (show) {
        panel.scrollTop = 0
        panel.classList.remove('tab-fade-in')
        void panel.offsetWidth
        panel.classList.add('tab-fade-in')
      }
    }
    this.buyModesEl.hidden = id !== 'businesses'
    this.buyModesEl.classList.toggle('is-hidden', id !== 'businesses')
    this.updateShopSubtitle(id)
    const activeBtn = this.tabButtons.find((b) => b.dataset.tab === id)
    activeBtn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }

  selectAchievement(id: string): void {
    this.selectedAchievementId = id
  }

  setIpoSubTab(tab: IpoSubTab): void {
    this.ipoSubTab = tab
  }

  setUpgradeFilter(filter: UpgradeFilter): void {
    this.upgradeFilter = filter
  }

  setAchievementCategory(cat: AchievementCategory): void {
    this.achievementCategory = cat
  }

  toggleAchievementView(): void {
    this.achievementViewMode = this.achievementViewMode === 'grid' ? 'list' : 'grid'
  }

  setBizTypeFilter(filter: BizTypeFilter): void {
    this.bizTypeFilter = filter
  }

  hasShopBadge(state: GameState): boolean {
    state.ensureMissions()
    const missionReady = state.missions.some((m) => m.progress >= m.target && !m.claimed)
    const ipoReady = state.prestigeEligible()
    return missionReady || ipoReady
  }

  updateTabBadges(state: GameState): void {
    state.ensureMissions()
    for (const btn of this.tabButtons) {
      const tab = btn.dataset.tab
      let show = false
      if (tab === 'missions') show = state.missions.some((m) => m.progress >= m.target && !m.claimed)
      if (tab === 'ipo') show = state.prestigeEligible()
      let badge = btn.querySelector('.tab-badge') as HTMLElement | null
      if (show && !badge) {
        badge = document.createElement('span')
        badge.className = 'tab-badge'
        btn.appendChild(badge)
      }
      if (badge) badge.hidden = !show
    }
  }

  getActiveTab(): string {
    return this.activeTab
  }

  getBuyMode(): BuyMode {
    return this.buyMode
  }

  render(state: GameState, onlyActiveTab = false, patch = false): void {
    this.renderShopHub(state)
    if (patch && this.activeTab === 'businesses') {
      this.renderBusinesses(state, true)
      return
    }
    if (onlyActiveTab) {
      this.renderTab(state, this.activeTab)
      this.updateTabBadges(state)
      return
    }
    this.renderBusinesses(state, false)
    this.renderManagement(state)
    this.renderUpgrades(state)
    this.renderResearch(state)
    this.renderMissions(state)
    this.renderAchievements(state)
    this.renderIpo(state)
    this.updateTabBadges(state)
  }

  patchAffordability(state: GameState): void {
    if (this.activeTab === 'businesses') this.renderBusinesses(state, true)
  }

  private renderTab(state: GameState, tab: string): void {
    switch (tab) {
      case 'businesses': this.renderBusinesses(state); break
      case 'management': this.renderManagement(state); break
      case 'upgrades': this.renderUpgrades(state); break
      case 'research': this.renderResearch(state); break
      case 'missions': this.renderMissions(state); break
      case 'achievements': this.renderAchievements(state); break
      case 'ipo': this.renderIpo(state); break
    }
  }

  setBuyMode(mode: BuyMode): void {
    this.buyMode = mode
    const root = this.root.querySelector('.buy-modes')
    if (!root) return
    root.querySelectorAll('.buy-mode-btn').forEach((node) => {
      const btn = node as HTMLButtonElement
      const key = btn.dataset.count
      btn.classList.toggle('active', key === String(mode) || (mode === 'max' && key === 'max'))
    })
  }

  flashCard(producerId: string): void {
    const card = this.businessCards.get(producerId)
    if (!card) return
    card.classList.remove('just-bought')
    void card.offsetWidth
    card.classList.add('just-bought')
    window.setTimeout(() => card.classList.remove('just-bought'), 450)
  }

  private updateShopSubtitle(tab: string): void {
    this.shopSubEl.textContent = TAB_SUBTITLES[tab] ?? 'İşletme & yükseltme'
  }

  private renderShopHub(state: GameState): void {
    const ips = state.incomePerSecond()
    const legalIps = state.legalIncomePerSecond()
    const illegalIps = state.illegalIncomePerSecond()
    const ownedBiz = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length
    const nextUnlock = PRODUCERS.find((p) => state.totalEarned < p.unlockAt)
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, scaledDailyGoalTarget(state.incomePerSecond())))
    const nextText = nextUnlock ? `${nextUnlock.emoji} ${nextUnlock.name}` : 'Hepsi açık'
    const hasIllegal = illegalIps > 0
    const heatPct = Math.round(state.illegalHeat)
    const illegalStat = hasIllegal
      ? `<span class="hub-stat hub-stat-illegal"><strong>${formatMoney(illegalIps)}/sn</strong><small>🕶️ Illegal</small></span>
         <span class="hub-stat hub-stat-heat"><strong>${state.illegalRiskLabel()}</strong><small>Radar ${heatPct}%</small></span>`
      : ''
    this.shopHubEl.innerHTML = `
      <span class="hub-stat"><strong>${formatMoney(ips)}/sn</strong><small>Toplam gelir</small></span>
      <span class="hub-stat"><strong>${formatMoney(legalIps)}/sn</strong><small>Yasal</small></span>
      ${illegalStat}
      <span class="hub-stat"><strong>${ownedBiz}</strong><small>İşletme</small></span>
      <span class="hub-stat"><strong>${nextText}</strong><small>Sıradaki</small></span>
      <span class="hub-stat"><strong>${goalPct}%</strong><small>Günlük hedef</small></span>
    `
  }

  private achievementCat(a: AchievementDef): AchievementCategory {
    const id = a.id
    if (id.includes('click') || id.includes('combo') || id.includes('tap')) return 'click'
    if (id.includes('prestige') || id.includes('ipo') || id.includes('stock') || id.includes('season') || id.includes('tree') || id.includes('weekly')) return 'ipo'
    if (id.includes('business') || id.includes('manager') || id.includes('producer') || PRODUCERS.some((p) => id.includes(p.id))) return 'business'
    return 'earn'
  }

  private createFilterPills(
    filters: { id: string; label: string }[],
    activeId: string,
    action: string,
  ): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'shop-filter-pills'
    for (const f of filters) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `filter-pill${f.id === activeId ? ' active' : ''}`
      btn.dataset.action = action
      btn.dataset.id = f.id
      btn.textContent = f.label
      wrap.appendChild(btn)
    }
    return wrap
  }

  private createRevenueDistribution(state: GameState): HTMLElement | null {
    const entries = PRODUCERS
      .map((p) => ({ p, income: state.producerIncome(p) }))
      .filter((e) => e.income > 0)
      .sort((a, b) => b.income - a.income)
    if (entries.length === 0) return null
    const total = entries.reduce((s, e) => s + e.income, 0)
    const top3 = entries.slice(0, 3)
    const el = document.createElement('div')
    el.className = 'revenue-distribution'
    const title = document.createElement('strong')
    title.textContent = 'Gelir dağılımı'
    el.appendChild(title)
    const bar = document.createElement('div')
    bar.className = 'revenue-bar'
    const colors = ['var(--accent)', 'var(--green)', 'var(--blue)']
    top3.forEach((e, i) => {
      const seg = document.createElement('span')
      seg.className = 'revenue-seg'
      seg.style.flex = String(e.income / total)
      seg.style.background = colors[i] ?? 'var(--muted)'
      seg.title = `${e.p.name}: ${formatMoney(e.income)}/sn`
      bar.appendChild(seg)
    })
    el.appendChild(bar)
    const legend = document.createElement('div')
    legend.className = 'revenue-legend'
    for (const e of top3) {
      const item = document.createElement('span')
      item.textContent = `${e.p.emoji} ${Math.round((e.income / total) * 100)}%`
      legend.appendChild(item)
    }
    el.appendChild(legend)
    return el
  }

  private formatEta(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '—'
    if (seconds < 60) return `${Math.ceil(seconds)}sn`
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}dk`
    if (seconds < 86400) return `${Math.ceil(seconds / 3600)}sa`
    return `${Math.ceil(seconds / 86400)}g`
  }

  private createSectionHeader(title: string, subtitle?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'shop-section-header'
    const strong = document.createElement('strong')
    strong.textContent = title
    el.appendChild(strong)
    if (subtitle) {
      const small = document.createElement('small')
      small.textContent = subtitle
      el.appendChild(small)
    }
    return el
  }

  private createTabHero(icon: string, title: string, subtitle: string, stat?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'shop-tab-hero'
    const iconEl = document.createElement('span')
    iconEl.className = 'shop-tab-hero-icon'
    iconEl.textContent = icon
    const text = document.createElement('div')
    text.className = 'shop-tab-hero-text'
    const h = document.createElement('strong')
    h.textContent = title
    const sub = document.createElement('small')
    sub.textContent = subtitle
    text.append(h, sub)
    el.append(iconEl, text)
    if (stat) {
      const statEl = document.createElement('span')
      statEl.className = 'shop-tab-hero-stat'
      statEl.textContent = stat
      el.appendChild(statEl)
    }
    return el
  }

  private createProgressBar(pct: number, extraClass = ''): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = `progress-bar${extraClass ? ` ${extraClass}` : ''}`
    const fill = document.createElement('div')
    fill.className = 'progress-fill'
    fill.style.width = `${Math.min(100, Math.max(0, pct))}%`
    wrap.appendChild(fill)
    return wrap
  }

  private createEmptyState(icon: string, text: string, hint?: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'empty-state'
    const iconEl = document.createElement('span')
    iconEl.className = 'empty-state-icon'
    iconEl.textContent = icon
    const p = document.createElement('p')
    p.textContent = text
    el.append(iconEl, p)
    if (hint) {
      const small = document.createElement('small')
      small.textContent = hint
      el.appendChild(small)
    }
    return el
  }

  private upgradeEffectLabel(u: UpgradeDef): string {
    if (u.effect === 'click_mult') return 'Tıklama'
    if (u.effect === 'global_mult') return 'Global'
    return 'İşletme'
  }

  private upgradeEffectIcon(u: UpgradeDef): string {
    if (u.effect === 'click_mult') return '👆'
    if (u.effect === 'global_mult') return '🌍'
    return '🏢'
  }

  private renderBusinesses(state: GameState, patchOnly = false): void {
    const panel = this.panels.businesses!
    const synergies = getActiveSynergies(state.producers).filter((s) => s.active)
    const synergyText = synergies.length > 0
      ? `Sinerji aktif: ${synergies.map((s) => s.def.name).join(', ')}`
      : ''

    if (synergyText) {
      if (!this.synergyEl) {
        this.synergyEl = document.createElement('div')
        this.synergyEl.className = 'synergy-bar synergy-card'
        panel.prepend(this.synergyEl)
      }
      const detail = synergies.map((s) => `${s.def.name} (+${Math.round(s.def.bonus * 100)}%)`).join(' · ')
      if (this.synergyEl.textContent !== detail) {
        this.synergyEl.innerHTML = `<strong>⚡ Sinerji aktif</strong><span>${detail}</span>`
      }
      this.synergyEl.hidden = false
    } else if (this.synergyEl) {
      this.synergyEl.hidden = true
    }

    if (!patchOnly) {
      let filterBar = panel.querySelector('.biz-type-filters') as HTMLElement | null
      if (!filterBar) {
        filterBar = this.createFilterPills([
          { id: 'all', label: 'Tümü' },
          { id: 'legal', label: '✅ Yasal' },
          { id: 'illegal', label: '🕶️ Illegal' },
        ], this.bizTypeFilter, 'biz-filter')
        filterBar.classList.add('biz-type-filters')
        panel.prepend(filterBar)
      } else {
        filterBar.querySelectorAll('.filter-pill').forEach((node) => {
          const btn = node as HTMLButtonElement
          btn.classList.toggle('active', btn.dataset.id === this.bizTypeFilter)
        })
      }

      const revDist = this.createRevenueDistribution(state)
      let revEl = panel.querySelector('.revenue-distribution') as HTMLElement | null
      if (revDist) {
        if (revEl) revEl.replaceWith(revDist)
        else panel.prepend(revDist)
      } else {
        revEl?.remove()
      }
    }

    const visibleIds = new Set<string>()
    const unlocked = state.unlockedProducers().filter((p) => {
      if (this.bizTypeFilter === 'legal') return !p.illegal
      if (this.bizTypeFilter === 'illegal') return !!p.illegal
      return true
    })

    for (const p of unlocked) {
      const owned = state.producers[p.id] ?? 0
      let count = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : this.buyMode
      if (count < 1) count = 1
      visibleIds.add(p.id)

      let card = this.businessCards.get(p.id)
      if (!card) {
        card = this.createBusinessCard(p)
        this.businessCards.set(p.id, card)
        panel.appendChild(card)
      }
      card.hidden = false
      card.classList.toggle('biz-card-illegal', !!p.illegal)
      const buyCount = this.buyMode === 'max' ? Math.max(1, state.countMaxAffordable(p.id)) : count
      this.updateBusinessCard(card, p, state, owned, buyCount)
    }

    for (const [id, card] of this.businessCards) {
      if (!visibleIds.has(id)) {
        card.remove()
        this.businessCards.delete(id)
      }
    }

    if (!patchOnly) {
      const nextLockedDef = PRODUCERS.find((p) => {
        if (isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)) return false
        if (this.bizTypeFilter === 'legal' && p.illegal) return false
        if (this.bizTypeFilter === 'illegal' && !p.illegal) return false
        return true
      })
      if (nextLockedDef) {
        let lockedCard = panel.querySelector('.biz-card-locked-preview') as HTMLElement | null
        if (!lockedCard) {
          lockedCard = document.createElement('div')
          lockedCard.className = 'biz-card biz-card-locked-preview'
          lockedCard.dataset.producerId = nextLockedDef.id
          const inner = document.createElement('div')
          inner.className = 'biz-card-locked-inner'
          const emojiEl = document.createElement('span')
          emojiEl.className = 'biz-emoji'
          const icon = document.createElement('img')
          icon.className = 'biz-icon'
          icon.src = producerIconPath(nextLockedDef.id)
          icon.alt = ''
          icon.onerror = () => {
            icon.remove()
            emojiEl.textContent = nextLockedDef.emoji
          }
          emojiEl.appendChild(icon)
          const infoEl = document.createElement('div')
          const nameEl = document.createElement('strong')
          nameEl.textContent = nextLockedDef.name
          const descEl = document.createElement('small')
          descEl.className = 'biz-lock-desc'
          descEl.textContent = nextLockedDef.description
          const hintEl = document.createElement('small')
          hintEl.className = 'biz-lock-hint'
          hintEl.textContent = 'İşletmeler toplam kazanç ile açılır (cüzdan değil)'
          infoEl.append(nameEl, descEl, hintEl)
          inner.append(emojiEl, infoEl)
          const overlay = document.createElement('div')
          overlay.className = 'biz-locked-overlay'
          const lockIcon = document.createElement('span')
          lockIcon.className = 'biz-locked-icon'
          lockIcon.textContent = nextLockedDef.illegal ? '🕶️' : '🔒'
          const lockText = document.createElement('span')
          lockText.className = 'biz-locked-text'
          const earlyBtn = document.createElement('button')
          earlyBtn.type = 'button'
          earlyBtn.className = 'btn-early-unlock'
          earlyBtn.dataset.action = 'early-unlock'
          earlyBtn.dataset.id = nextLockedDef.id
          overlay.append(lockIcon, lockText, earlyBtn)
          lockedCard.append(inner, overlay)
          panel.appendChild(lockedCard)
        } else {
          lockedCard.dataset.producerId = nextLockedDef.id
        }
        const pct = nextLockedDef.unlockAt > 0
          ? (state.totalEarned / nextLockedDef.unlockAt) * 100
          : 100
        const lockText = lockedCard.querySelector('.biz-locked-text')
        if (lockText) {
          const remaining = Math.max(0, nextLockedDef.unlockAt - state.totalEarned)
          const ips = state.incomePerSecond()
          const eta = ips > 0 ? remaining / ips : Infinity
          lockText.textContent = `Toplam kazanç: ${formatMoney(state.totalEarned)} / ${formatMoney(nextLockedDef.unlockAt)} · ~${this.formatEta(eta)}`
        }
        const earlyBtn = lockedCard.querySelector('.btn-early-unlock') as HTMLButtonElement | null
        if (earlyBtn) {
          const cost = earlyUnlockCost(nextLockedDef)
          earlyBtn.textContent = `Erken aç — ${formatMoney(cost)}`
          earlyBtn.disabled = !state.canAfford(cost)
        }
        let progressBar = lockedCard.querySelector('.unlock-progress') as HTMLElement | null
        if (!progressBar) {
          progressBar = this.createProgressBar(pct, 'unlock-progress')
          lockedCard.appendChild(progressBar)
        } else {
          const fill = progressBar.querySelector('.progress-fill') as HTMLElement
          if (fill) fill.style.width = `${Math.min(100, pct)}%`
        }
      } else {
        panel.querySelector('.biz-card-locked-preview')?.remove()
      }
    }

    if (!patchOnly && panel.querySelectorAll('.biz-card:not([hidden]):not(.biz-card-locked-preview)').length === 0 && visibleIds.size === 0) {
      let empty = panel.querySelector('.empty-state') as HTMLElement | null
      if (!empty) {
        empty = this.createEmptyState('🏢', 'Daha fazla kazan', 'Yeni işletmeler açılacak')
        panel.appendChild(empty)
      }
    } else {
      panel.querySelector('.empty-state')?.remove()
    }
  }

  private createBusinessCard(p: ProducerDef): HTMLDivElement {
    const card = document.createElement('div')
    card.className = 'biz-card'
    card.dataset.producerId = p.id

    const infoBtn = document.createElement('button')
    infoBtn.type = 'button'
    infoBtn.className = 'biz-info-btn'
    infoBtn.dataset.action = 'biz-detail'
    infoBtn.dataset.id = p.id
    infoBtn.textContent = 'ℹ️'
    infoBtn.title = 'Gelir dökümü'

    const buyBtn = document.createElement('button')
    buyBtn.type = 'button'
    buyBtn.className = 'biz-buy-btn'
    buyBtn.dataset.action = 'buy-business'
    buyBtn.dataset.id = p.id

    const top = document.createElement('div')
    top.className = 'biz-top'
    const left = document.createElement('div')
    left.className = 'biz-left'
    const emoji = document.createElement('span')
    emoji.className = 'biz-emoji'
    const icon = document.createElement('img')
    icon.className = 'biz-icon'
    icon.src = producerIconPath(p.id)
    icon.alt = ''
    icon.onerror = () => {
      icon.remove()
      emoji.textContent = p.emoji
    }
    emoji.appendChild(icon)
    const info = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = p.name
    const desc = document.createElement('small')
    desc.textContent = p.description
    info.append(name, desc)
    left.append(emoji, info)
    const countEl = document.createElement('span')
    countEl.className = 'biz-owned'
    top.append(left, countEl, infoBtn)

    const milestoneDots = document.createElement('div')
    milestoneDots.className = 'biz-milestone-dots'
    for (const ms of MILESTONES) {
      const dot = document.createElement('span')
      dot.className = 'biz-milestone-dot'
      dot.dataset.milestone = String(ms)
      dot.title = `${ms} adet`
      milestoneDots.appendChild(dot)
    }

    const bottom = document.createElement('div')
    bottom.className = 'biz-bottom'
    const costEl = document.createElement('span')
    costEl.className = 'biz-cost'
    const inc = document.createElement('span')
    inc.className = 'biz-income'
    bottom.append(costEl, inc)

    buyBtn.append(top, milestoneDots, bottom)
    card.append(buyBtn)

    const tierBadge = document.createElement('div')
    tierBadge.className = `biz-tier-badge biz-tier-${p.tier}`
    tierBadge.textContent = `T${p.tier}`
    card.appendChild(tierBadge)

    if (p.illegal) {
      const riskBadge = document.createElement('span')
      riskBadge.className = 'biz-risk-badge'
      riskBadge.textContent = '🕶️ Risk'
      card.appendChild(riskBadge)
    }

    return card
  }

  private updateBusinessCard(
    card: HTMLDivElement,
    p: ProducerDef,
    state: GameState,
    owned: number,
    count: number,
  ): void {
    const affordableCount = this.buyMode === 'max' ? state.countMaxAffordable(p.id) : count
    const buyCount = this.buyMode === 'max' ? Math.max(1, affordableCount) : count
    const cost = state.producerCostFor(p, owned, buyCount)
    const income = state.producerIncome(p)
    const affordable = affordableCount >= 1 && state.canAfford(cost)

    const buyBtn = card.querySelector('.biz-buy-btn') as HTMLButtonElement
    if (buyBtn) {
      buyBtn.dataset.count = String(affordableCount >= 1 ? affordableCount : 1)
      buyBtn.disabled = !affordable
    }
    card.classList.toggle('affordable', affordable)

    const ownedEl = card.querySelector('.biz-owned')
    const costEl = card.querySelector('.biz-cost')
    const incEl = card.querySelector('.biz-income')
    const ownedText = `x${owned}`
    const costText = this.buyMode === 'max' && affordableCount > 1
      ? `${formatMoney(cost)} (x${affordableCount})`
      : formatMoney(cost)
    const incText = owned > 0 ? `${formatMoney(income)}/sn` : `+${formatMoney(p.baseIncome)}/sn`

    if (ownedEl && ownedEl.textContent !== ownedText) ownedEl.textContent = ownedText
    if (costEl && costEl.textContent !== costText) costEl.textContent = costText
    if (incEl && incEl.textContent !== incText) incEl.textContent = incText

    card.querySelectorAll('.biz-milestone-dot').forEach((dot) => {
      const ms = Number((dot as HTMLElement).dataset.milestone)
      dot.classList.toggle('reached', owned >= ms)
    })

    if (p.illegal && p.riskChance) {
      const riskBadge = card.querySelector('.biz-risk-badge')
      const chancePct = Math.round(p.riskChance * 100 * (1 + state.illegalHeat / 100))
      if (riskBadge) riskBadge.textContent = `🕶️ Baskın ~${chancePct}%/dk`
    }
  }

  private renderManagement(state: GameState): void {
    const panel = this.panels.management!
    panel.replaceChildren()

    const ownedProducers = PRODUCERS
      .filter((p) => (state.producers[p.id] ?? 0) > 0)
      .sort((a, b) => state.producerIncome(b) - state.producerIncome(a))
    const hiredCount = ownedProducers.filter((p) => hasManager(state.managers, p.id)).length
    const ownedCount = ownedProducers.length
    const missing = ownedCount - hiredCount
    panel.appendChild(this.createTabHero('👔', 'Yönetim Merkezi', 'Yöneticiler geliri artırır ve offline kazancı yükseltir', `${hiredCount}/${ownedCount} aktif`))

    if (missing > 0) {
      const summary = document.createElement('div')
      summary.className = 'manager-summary-banner'
      summary.textContent = `${missing} işletmede yönetici eksik — toplu işe almayı düşün`
      panel.appendChild(summary)
    }

    for (const p of ownedProducers) {
      const owned = state.producers[p.id] ?? 0
      const hired = hasManager(state.managers, p.id)
      const cost = managerCost(p.baseIncome, owned)
      const autoOn = state.managerAutoBuy[p.id]
      const income = state.producerIncome(p)

      const card = document.createElement('div')
      card.className = `shop-card manager-card${hired ? ' manager-active' : ''}`

      const portrait = document.createElement('div')
      portrait.className = 'manager-portrait'
      portrait.textContent = p.emoji

      const info = document.createElement('div')
      info.className = 'manager-info'
      const name = document.createElement('strong')
      name.textContent = p.name
      const desc = document.createElement('small')
      desc.textContent = hired ? 'Yönetici aktif (+25% gelir, offline +50%)' : 'Yönetici işe al — pasif gelir artar'
      const incomeChip = document.createElement('span')
      incomeChip.className = 'manager-income-chip'
      incomeChip.textContent = `${formatMoney(income)}/sn`
      info.append(name, desc, incomeChip)

      const badges = document.createElement('div')
      badges.className = 'manager-badges'
      if (hired) {
        const statusBadge = document.createElement('span')
        statusBadge.className = 'manager-status-badge active'
        statusBadge.textContent = 'Aktif'
        badges.appendChild(statusBadge)
        if (autoOn) {
          const autoBadge = document.createElement('span')
          autoBadge.className = 'manager-status-badge auto'
          autoBadge.textContent = 'Auto'
          badges.appendChild(autoBadge)
        }
      } else {
        const chip = document.createElement('span')
        chip.className = 'manager-bonus-chip'
        chip.textContent = '+25% gelir'
        badges.appendChild(chip)
      }

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      body.append(info, badges)

      const actions = document.createElement('div')
      actions.className = 'shop-card-actions'

      if (!hired) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary'
        btn.dataset.action = 'hire-manager'
        btn.dataset.id = p.id
        btn.textContent = `İşe al — ${formatMoney(state.managerDiscountActive ? cost * 0.5 : cost)}`
        btn.disabled = !state.canAfford(state.managerDiscountActive ? cost * 0.5 : cost)
        actions.appendChild(btn)
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-ad'
        adBtn.dataset.action = 'ad-manager-discount'
        adBtn.dataset.id = p.id
        adBtn.textContent = '📺 %50 indirim'
        actions.appendChild(adBtn)
      } else {
        const autoBtn = document.createElement('button')
        autoBtn.type = 'button'
        autoBtn.className = 'btn-secondary auto-buy-btn'
        autoBtn.dataset.action = 'toggle-autobuy'
        autoBtn.dataset.id = p.id
        autoBtn.textContent = autoOn ? '🤖 Auto: Açık' : '🤖 Auto: Kapalı'
        actions.appendChild(autoBtn)
      }

      card.append(portrait, body, actions)
      panel.appendChild(card)
    }

    if (panel.querySelectorAll('.manager-card').length === 0) {
      panel.appendChild(this.createEmptyState('👔', 'Henüz yönetici yok', 'Önce işletme satın al'))
    }
  }

  private renderUpgrades(state: GameState): void {
    const panel = this.panels.upgrades!
    panel.replaceChildren()
    const allAvailable = state.availableUpgrades()
    const filterMap: Record<UpgradeFilter, (u: UpgradeDef) => boolean> = {
      all: () => true,
      click: (u) => u.effect === 'click_mult',
      global: (u) => u.effect === 'global_mult',
      producer: (u) => u.effect === 'producer_mult',
    }
    const list = allAvailable.filter(filterMap[this.upgradeFilter])
    const purchased = UPGRADES.filter((u) => state.purchasedUpgrades.has(u.id))

    panel.appendChild(this.createTabHero('⬆️', 'Yükseltmeler', 'Kalıcı güç artışları — stratejik seçimler yap', `${list.length} mevcut`))
    panel.appendChild(this.createFilterPills([
      { id: 'all', label: 'Tümü' },
      { id: 'click', label: 'Tıklama' },
      { id: 'global', label: 'Global' },
      { id: 'producer', label: 'İşletme' },
    ], this.upgradeFilter, 'upgrade-filter'))

    if (list.length === 0 && purchased.length === 0) {
      panel.appendChild(this.createEmptyState('⬆️', 'Tüm yükseltmeler alındı!', 'IPO sonrası yeni bonuslar açılabilir'))
      return
    }

    if (list.length === 0) {
      panel.appendChild(this.createEmptyState('⬆️', 'Bu kategoride yükseltme yok', 'Başka filtre dene'))
    }

    for (const u of list) {
      const upgradeCost = Math.floor(u.cost * (1 - (hasNode(state.prestigeTree, 'upgrade_10') ? 0.1 : 0)))
      const affordable = state.canAfford(upgradeCost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card shop-card-upgrade${affordable ? ' affordable' : ''}`
      card.dataset.action = 'buy-upgrade'
      card.dataset.id = u.id
      card.disabled = !affordable

      const icon = document.createElement('span')
      icon.className = 'shop-card-icon'
      icon.textContent = this.upgradeEffectIcon(u)

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      const name = document.createElement('strong')
      name.textContent = u.name
      const desc = document.createElement('small')
      desc.textContent = u.description
      const tag = document.createElement('span')
      tag.className = 'shop-effect-tag'
      tag.textContent = `${this.upgradeEffectLabel(u)} · ${u.description.includes('x') ? u.description.match(/x[\d.]+/)?.[0] ?? '' : ''}`
      body.append(name, desc, tag)

      const price = document.createElement('span')
      price.className = 'shop-card-price'
      price.textContent = formatMoney(upgradeCost)

      card.append(icon, body, price)
      panel.appendChild(card)
    }

    if (purchased.length > 0) {
      const details = document.createElement('details')
      details.className = 'purchased-upgrades-section'
      const summary = document.createElement('summary')
      summary.textContent = `Satın alınanlar (${purchased.length})`
      details.appendChild(summary)
      for (const u of purchased) {
        const row = document.createElement('div')
        row.className = 'purchased-upgrade-row'
        row.innerHTML = `<span>${this.upgradeEffectIcon(u)} ${u.name}</span><small>${this.upgradeEffectLabel(u)}</small>`
        details.appendChild(row)
      }
      panel.appendChild(details)
    }
  }

  private renderResearch(state: GameState): void {
    const panel = this.panels.research!
    panel.replaceChildren()
    const totalLevels = RESEARCH_NODES.reduce((s, n) => s + (state.research[n.id] ?? 0), 0)
    const maxLevels = RESEARCH_NODES.reduce((s, n) => s + n.maxLevel, 0)
    panel.appendChild(this.createTabHero('🔬', 'Ar-Ge Laboratuvarı', 'Uzun vadeli bonuslar — her seviye kalıcı etki', `${totalLevels}/${maxLevels} seviye`))

    const treeGrid = document.createElement('div')
    treeGrid.className = 'research-tree-grid'

    for (const node of RESEARCH_NODES) {
      const level = state.research[node.id] ?? 0
      const maxed = level >= node.maxLevel
      const cost = state.researchCostWithWeekly(researchCost(node, level))
      const canBuy = !maxed && (node.currency === 'money' ? state.canAfford(cost) : state.prestigePoints >= cost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card shop-card-research research-tree-node${canBuy ? ' affordable' : ''}${maxed ? ' research-maxed' : ''}${node.currency === 'prestige' ? ' research-prestige' : ' research-money'}`
      card.dataset.action = 'buy-research'
      card.dataset.id = node.id
      card.disabled = !canBuy

      const icon = document.createElement('span')
      icon.className = 'shop-card-icon'
      icon.textContent = '🔬'

      const body = document.createElement('div')
      body.className = 'shop-card-body'
      const name = document.createElement('strong')
      name.textContent = node.name
      const desc = document.createElement('small')
      desc.textContent = node.description
      const dots = document.createElement('div')
      dots.className = 'research-level-dots'
      for (let i = 0; i < node.maxLevel; i++) {
        const dot = document.createElement('span')
        dot.className = `research-level-dot${i < level ? ' filled' : ''}`
        dots.appendChild(dot)
      }
      const levelLabel = document.createElement('span')
      levelLabel.className = 'shop-level-label'
      levelLabel.textContent = `${level}/${node.maxLevel}`
      body.append(name, desc, dots, levelLabel)

      const price = document.createElement('span')
      price.className = `shop-card-price${node.currency === 'prestige' ? ' price-prestige' : ''}`
      price.textContent = maxed ? 'MAX' : node.currency === 'money' ? formatMoney(cost) : `${cost} hisse`

      card.append(icon, body, price)
      treeGrid.appendChild(card)
    }
    panel.appendChild(treeGrid)
  }

  private renderMissions(state: GameState): void {
    const panel = this.panels.missions!
    panel.replaceChildren()
    state.ensureMissions()

    const done = state.missions.filter((m) => m.claimed).length
    const ready = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length
    panel.appendChild(this.createTabHero('📋', 'Günlük Görevler', 'Her gün yeni hedefler — ödülleri kaçırma', `${done}/${state.missions.length} tamam${ready > 0 ? ` · ${ready} hazır` : ''}`))

    const summary = document.createElement('div')
    summary.className = 'mission-daily-summary streak-card'
    const streakPct = Math.min(100, (state.dailyStreak / 30) * 100)
    summary.innerHTML = `
      <div class="streak-ring-wrap">
        <div class="streak-ring" style="background: conic-gradient(var(--accent) ${streakPct}%, rgba(255,255,255,0.08) ${streakPct}%)"></div>
        <span class="streak-ring-num">${state.dailyStreak}</span>
      </div>
      <div class="streak-card-text">
        <strong>🔥 Giriş serisi</strong>
        <small>${state.dailyStreak}/30 gün · ${ready} hazır görev</small>
      </div>
    `
    panel.appendChild(summary)

    const sorted = [...state.missions].sort((a, b) => {
      const aReady = a.progress >= a.target && !a.claimed ? 1 : 0
      const bReady = b.progress >= b.target && !b.claimed ? 1 : 0
      return bReady - aReady
    })

    for (const m of sorted) {
      const pct = (m.progress / m.target) * 100
      const isReady = m.progress >= m.target && !m.claimed

      const card = document.createElement('div')
      card.className = `shop-card mission-card${isReady ? ' mission-ready' : ''}${m.claimed ? ' mission-claimed' : ''}`

      const label = document.createElement('p')
      label.className = 'mission-label'
      label.textContent = m.label

      const bar = this.createProgressBar(pct)
      const meta = document.createElement('div')
      meta.className = 'mission-meta'
      const status = document.createElement('span')
      status.textContent = `${Math.floor(m.progress)}/${m.target} (${Math.floor(pct)}%)`
      const reward = document.createElement('small')
      reward.textContent = m.rewardMoney > 0 ? `Ödül: ${formatMoney(m.rewardMoney)}` : `Ödül: ${m.rewardBoostMinutes}dk 2x`
      meta.append(status, reward)

      card.append(label, bar, meta)

      if (isReady) {
        const actions = document.createElement('div')
        actions.className = 'shop-card-actions'
        const claimBtn = document.createElement('button')
        claimBtn.type = 'button'
        claimBtn.className = 'btn-primary'
        claimBtn.dataset.action = 'claim-mission'
        claimBtn.dataset.id = m.id
        claimBtn.textContent = 'Topla'
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-ad'
        adBtn.dataset.action = 'claim-mission-ad'
        adBtn.dataset.id = m.id
        adBtn.textContent = '📺 x2'
        actions.append(claimBtn, adBtn)
        card.appendChild(actions)
      } else if (m.claimed) {
        const doneEl = document.createElement('span')
        doneEl.className = 'mission-done'
        doneEl.textContent = '✓ Tamamlandı'
        card.appendChild(doneEl)
      }

      panel.appendChild(card)
    }
  }

  private buildAchievementBanner(a: AchievementDef | null, unlocked: boolean): HTMLElement {
    const banner = document.createElement('div')
    banner.className = `achieve-detail-banner${a ? (unlocked ? ' done' : ' locked') : ' placeholder'}`

    if (!a) {
      banner.innerHTML = '<span class="achieve-banner-emoji">🏆</span><div><strong>Bir başarım seç</strong><small>Detayları görmek için aşağıdaki hücrelere dokun</small></div>'
      return banner
    }

    const emoji = document.createElement('span')
    emoji.className = 'achieve-banner-emoji'
    emoji.textContent = unlocked ? a.emoji : '🔒'

    const info = document.createElement('div')
    info.className = 'achieve-banner-info'
    const name = document.createElement('strong')
    name.textContent = a.name
    const desc = document.createElement('small')
    desc.textContent = a.description
    const reward = document.createElement('span')
    reward.className = 'achieve-banner-reward'
    reward.textContent = unlocked ? `✓ Açıldı · Ödül: ${formatMoney(a.reward)}` : `Ödül: ${formatMoney(a.reward)}`
    info.append(name, desc, reward)

    banner.append(emoji, info)
    return banner
  }

  private renderAchievements(state: GameState): void {
    const panel = this.panels.achievements!
    panel.replaceChildren()

    const pct = Math.round((state.achievements.size / ACHIEVEMENTS.length) * 100)
    panel.appendChild(this.createTabHero('🏆', 'Başarım Galerisi', 'Hedefleri tamamla, kalıcı ödüller kazan', `${pct}% · ${state.achievements.size}/${ACHIEVEMENTS.length}`))

    const toolbar = document.createElement('div')
    toolbar.className = 'achieve-toolbar'
    toolbar.appendChild(this.createFilterPills([
      { id: 'all', label: 'Tümü' },
      { id: 'earn', label: 'Kazanç' },
      { id: 'click', label: 'Tıklama' },
      { id: 'business', label: 'İşletme' },
      { id: 'ipo', label: 'IPO' },
    ], this.achievementCategory, 'achieve-filter'))
    const viewBtn = document.createElement('button')
    viewBtn.type = 'button'
    viewBtn.className = 'achieve-view-btn'
    viewBtn.dataset.action = 'achieve-view-toggle'
    viewBtn.textContent = this.achievementViewMode === 'grid' ? '☰ Liste' : '▦ Grid'
    toolbar.appendChild(viewBtn)
    panel.appendChild(toolbar)

    const detailWrap = document.createElement('div')
    detailWrap.className = 'achieve-detail-wrap achieve-sticky-header'

    const selected = this.selectedAchievementId
      ? ACHIEVEMENTS.find((a) => a.id === this.selectedAchievementId) ?? null
      : null
    detailWrap.appendChild(this.buildAchievementBanner(
      selected,
      selected ? state.achievements.has(selected.id) : false,
    ))
    panel.appendChild(detailWrap)

    const filtered = ACHIEVEMENTS.filter((a) => this.achievementCategory === 'all' || this.achievementCat(a) === this.achievementCategory)
    const grid = document.createElement('div')
    grid.className = this.achievementViewMode === 'grid' ? 'achieve-grid' : 'achieve-list'
    for (const a of filtered) {
      const done = state.achievements.has(a.id)
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = `achieve-cell${done ? ' done' : ''}${this.selectedAchievementId === a.id ? ' selected' : ''}`
      cell.dataset.action = 'achieve-detail'
      cell.dataset.id = a.id
      if (this.achievementViewMode === 'list') {
        cell.innerHTML = `<span class="achieve-cell-emoji">${done ? a.emoji : '🔒'}</span><span class="achieve-list-text"><strong>${a.name}</strong><small>${a.description}</small></span>`
      } else {
        const emoji = document.createElement('span')
        emoji.className = 'achieve-cell-emoji'
        emoji.textContent = done ? a.emoji : '🔒'
        cell.appendChild(emoji)
      }
      grid.appendChild(cell)
    }
    panel.appendChild(grid)
  }

  private renderIpo(state: GameState): void {
    const panel = this.panels.ipo!
    panel.replaceChildren()

    panel.appendChild(this.createTabHero('📈', 'Borsa & IPO', 'Hisse al/sat, prestij ağacını geliştir, birleşme yap', `${state.prestigePoints} hisse puanı`))

    const subTabs = document.createElement('div')
    subTabs.className = 'ipo-sub-tabs'
    for (const [id, label] of [['stock', 'Hisse'], ['prestige', 'Prestij Ağacı'], ['ipo', 'IPO']] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ipo-sub-tab${this.ipoSubTab === id ? ' active' : ''}`
      btn.dataset.action = 'ipo-sub-tab'
      btn.dataset.id = id
      btn.textContent = label
      subTabs.appendChild(btn)
    }
    panel.appendChild(subTabs)

    if (this.ipoSubTab === 'stock') this.renderIpoStock(state, panel)
    else if (this.ipoSubTab === 'prestige') this.renderIpoPrestige(state, panel)
    else this.renderIpoMerge(state, panel)
  }

  private renderIpoStock(state: GameState, panel: HTMLElement): void {
    const tickerTabs = document.createElement('div')
    tickerTabs.className = 'ticker-tabs'
    for (const def of STOCK_DEFS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ticker-tab'
      btn.dataset.action = 'stock-ticker'
      btn.dataset.id = def.id
      if (state.stock.activeTickerId === def.id) btn.classList.add('active')
      btn.textContent = `${def.emoji} ${def.name}`
      tickerTabs.appendChild(btn)
    }
    panel.appendChild(tickerTabs)

    const ticker = state.stock.tickers[state.stock.activeTickerId]!
    const pl = profitLoss(ticker)
    const plClass = pl >= 0 ? 'pl-positive' : 'pl-negative'

    const stockCard = document.createElement('div')
    stockCard.className = 'shop-card stock-card'

    const stockTitle = document.createElement('h3')
    stockTitle.className = 'stock-card-title'
    stockTitle.textContent = `${ticker.emoji} ${ticker.name}`

    const priceRow = document.createElement('div')
    priceRow.className = 'stock-price-row'
    const trend = state.stock.trendDirection === 'up' ? '↑' : state.stock.trendDirection === 'down' ? '↓' : '→'
    priceRow.innerHTML = `<strong>${formatMoney(ticker.price)}</strong> <span class="stock-trend">${trend}</span>`

    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    spark.setAttribute('class', 'stock-sparkline stock-sparkline-lg')
    spark.setAttribute('viewBox', '0 0 120 40')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', sparklinePath(ticker.history, 120, 40))
    path.setAttribute('fill', 'none')
    const trendColor = state.stock.trendDirection === 'up' ? '#34d399' : state.stock.trendDirection === 'down' ? '#f87171' : '#60a5fa'
    path.setAttribute('stroke', trendColor)
    path.setAttribute('stroke-width', '2')
    spark.appendChild(path)

    const stockInfo = document.createElement('p')
    stockInfo.className = 'stock-info'
    stockInfo.innerHTML = `${ticker.shares} lot · Değer: ${formatMoney(ticker.shares * ticker.price)} · K/Z: <span class="${plClass}">${formatMoney(pl)}</span>`

    stockCard.append(stockTitle, priceRow, spark, stockInfo)
    panel.appendChild(stockCard)

    if (Date.now() < state.stock.trendHintUntil) {
      const hint = document.createElement('p')
      hint.className = 'stock-hint'
      hint.textContent = `Piyasa ipucu: trend ${state.stock.trendDirection === 'up' ? 'YUKARI' : state.stock.trendDirection === 'down' ? 'AŞAĞI' : 'YATAY'}`
      panel.appendChild(hint)
    }
    if (Date.now() < state.stock.marketEventUntil) {
      const ev = document.createElement('p')
      ev.className = 'market-event-banner'
      ev.textContent = state.stock.marketEventMult < 0 ? '📉 Piyasa çöküşü!' : '📈 Piyasa rallisi!'
      panel.appendChild(ev)
    }

    const stockActions = document.createElement('div')
    stockActions.className = 'stock-actions'
    for (const [action, label, count] of [
      ['stock-buy', 'Al 1', '1'],
      ['stock-buy', 'Al 10', '10'],
      ['stock-sell', 'Sat 1', '1'],
      ['stock-sell', 'Sat hepsi', 'max'],
    ] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = action.includes('buy') ? 'btn-buy-stock' : 'btn-sell-stock'
      btn.dataset.action = action
      btn.dataset.count = count
      btn.textContent = label
      stockActions.appendChild(btn)
    }
    const hintAd = document.createElement('button')
    hintAd.type = 'button'
    hintAd.className = 'btn-ad'
    hintAd.dataset.action = 'ad-stock-hint'
    hintAd.textContent = state.isStockHintFree() ? '📊 Ücretsiz ipucu' : '📺 Piyasa ipucu (1 saat)'
    panel.append(stockActions, hintAd)
  }

  private renderIpoPrestige(state: GameState, panel: HTMLElement): void {
    panel.appendChild(this.createSectionHeader('Prestij Ağacı', `${state.prestigePoints} harcanabilir puan`))

    const treeGrid = document.createElement('div')
    treeGrid.className = 'prestige-tree-grid'
    for (const node of PRESTIGE_TREE_NODES) {
      const owned = hasNode(state.prestigeTree, node.id)
      const canBuy = canBuyNode(state.prestigeTree, node, state.prestigePoints)
      const card = document.createElement('button')
      card.type = 'button'
      card.className = `tree-node ${owned ? 'owned' : canBuy ? 'available' : 'locked'}`
      card.dataset.action = owned ? '' : 'buy-tree-node'
      card.dataset.id = node.id
      card.disabled = owned || !canBuy
      card.innerHTML = `<strong>${node.name}</strong><small>${node.description}</small><span>${owned ? '✓' : `${node.cost} puan`}</span>`
      treeGrid.appendChild(card)
    }
    panel.appendChild(treeGrid)
  }

  private renderIpoMerge(state: GameState, panel: HTMLElement): void {
    panel.appendChild(this.createSectionHeader('Şirket Birleşmesi & IPO'))

    const ipoCard = document.createElement('div')
    ipoCard.className = 'shop-card ipo-card'
    const pending = calcPrestigePoints(state.totalEarned)
    const info = document.createElement('p')
    info.textContent = pending > 0
      ? `${pending} hisse senedi kazanacaksın. Kalıcı çarpan: x${prestigeMultiplier(state.prestigePoints + pending).toFixed(2)}`
      : `IPO için en az ${formatMoney(PRESTIGE_THRESHOLD)} toplam kazanç gerekir.`

    const ipoPct = Math.min(100, (state.totalEarned / PRESTIGE_THRESHOLD) * 100)
    const bar = document.createElement('div')
    bar.className = 'progress-bar ipo-progress-bar'
    const fill = document.createElement('div')
    fill.className = `progress-fill ipo-progress-fill${ipoPct >= 80 ? ' ipo-near' : ''}`
    fill.style.width = `${ipoPct}%`
    bar.appendChild(fill)
    for (const ms of [25, 50, 75]) {
      const tick = document.createElement('div')
      tick.className = 'ipo-milestone-tick'
      tick.style.left = `${ms}%`
      bar.appendChild(tick)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-prestige'
    btn.dataset.action = 'ipo'
    btn.textContent = 'Borsaya Çık (IPO)'
    btn.disabled = !state.prestigeEligible()

    ipoCard.append(info, bar, btn)
    panel.appendChild(ipoCard)
  }
}
