import type { GameState } from '../../game/GameState'
import { PRODUCERS, formatMoney, producerIconPath, type ProducerDef, type UpgradeDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost } from '../../game/Research'
import { ACHIEVEMENTS, type AchievementDef } from '../../game/Achievements'
import { getActiveSynergies } from '../../game/Synergies'
import { PRESTIGE_THRESHOLD } from '../../game/GameState'
import { calcPrestigePoints, prestigeMultiplier } from '../../game/Prestige'
import { managerCost, hasManager } from '../../game/Managers'
import { profitLoss, sparklinePath, STOCK_DEFS } from '../../game/StockMarket'
import { PRESTIGE_TREE_NODES, canBuyNode, hasNode } from '../../game/PrestigeTree'

export type BuyMode = 1 | 10 | 'max'

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
  private businessCards = new Map<string, HTMLDivElement>()
  private synergyEl: HTMLElement | null = null
  private selectedAchievementId: string | null = null

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

    this.root.append(header, buyModes, tabs, ...Object.values(this.panels))
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
    this.updateShopSubtitle(id)
    const activeBtn = this.tabButtons.find((b) => b.dataset.tab === id)
    activeBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }

  selectAchievement(id: string): void {
    this.selectedAchievementId = id
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
        this.synergyEl.className = 'synergy-bar'
        panel.prepend(this.synergyEl)
      }
      if (this.synergyEl.textContent !== synergyText) this.synergyEl.textContent = synergyText
      this.synergyEl.hidden = false
    } else if (this.synergyEl) {
      this.synergyEl.hidden = true
    }

    const visibleIds = new Set<string>()
    for (const p of state.unlockedProducers()) {
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
      const nextLockedDef = PRODUCERS.find((p) => !visibleIds.has(p.id))
      if (nextLockedDef) {
        let lockedCard = panel.querySelector('.biz-card-locked-preview') as HTMLElement | null
        if (!lockedCard) {
          lockedCard = document.createElement('div')
          lockedCard.className = 'biz-card biz-card-locked-preview'
          const inner = document.createElement('div')
          inner.className = 'biz-card-locked-inner'
          const emojiEl = document.createElement('span')
          emojiEl.className = 'biz-emoji'
          emojiEl.textContent = nextLockedDef.emoji
          const infoEl = document.createElement('div')
          const nameEl = document.createElement('strong')
          nameEl.textContent = nextLockedDef.name
          const descEl = document.createElement('small')
          descEl.textContent = nextLockedDef.description
          infoEl.append(nameEl, descEl)
          inner.append(emojiEl, infoEl)
          const overlay = document.createElement('div')
          overlay.className = 'biz-locked-overlay'
          const lockIcon = document.createElement('span')
          lockIcon.className = 'biz-locked-icon'
          lockIcon.textContent = '🔒'
          const lockText = document.createElement('span')
          lockText.className = 'biz-locked-text'
          overlay.append(lockIcon, lockText)
          lockedCard.append(inner, overlay)
          panel.appendChild(lockedCard)
        }
        const pct = nextLockedDef.unlockAt > 0
          ? (state.totalEarned / nextLockedDef.unlockAt) * 100
          : 100
        const lockText = lockedCard.querySelector('.biz-locked-text')
        if (lockText) {
          lockText.textContent = `${formatMoney(state.totalEarned)} / ${formatMoney(nextLockedDef.unlockAt)}`
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
  }

  private renderManagement(state: GameState): void {
    const panel = this.panels.management!
    panel.replaceChildren()

    const hiredCount = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0 && hasManager(state.managers, p.id)).length
    const ownedCount = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length
    panel.appendChild(this.createSectionHeader('Yönetim', `${hiredCount}/${ownedCount} yönetici aktif`))

    for (const p of PRODUCERS) {
      const owned = state.producers[p.id] ?? 0
      if (owned <= 0) continue
      const hired = hasManager(state.managers, p.id)
      const cost = managerCost(p.baseIncome, owned)
      const autoOn = state.managerAutoBuy[p.id]

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
      info.append(name, desc)

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
    const list = state.availableUpgrades()
    panel.appendChild(this.createSectionHeader('Yükseltmeler', `${list.length} mevcut`))

    if (list.length === 0) {
      panel.appendChild(this.createEmptyState('⬆️', 'Tüm yükseltmeler alındı!', 'IPO sonrası yeni bonuslar açılabilir'))
      return
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
      tag.textContent = this.upgradeEffectLabel(u)
      body.append(name, desc, tag)

      const price = document.createElement('span')
      price.className = 'shop-card-price'
      price.textContent = formatMoney(upgradeCost)

      card.append(icon, body, price)
      panel.appendChild(card)
    }
  }

  private renderResearch(state: GameState): void {
    const panel = this.panels.research!
    panel.replaceChildren()
    panel.appendChild(this.createSectionHeader('Ar-Ge', 'Kalıcı bonuslar'))

    for (const node of RESEARCH_NODES) {
      const level = state.research[node.id] ?? 0
      const maxed = level >= node.maxLevel
      const cost = state.researchCostWithWeekly(researchCost(node, level))
      const canBuy = !maxed && (node.currency === 'money' ? state.canAfford(cost) : state.prestigePoints >= cost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = `shop-card shop-card-research${canBuy ? ' affordable' : ''}${maxed ? ' research-maxed' : ''}`
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
      panel.appendChild(card)
    }
  }

  private renderMissions(state: GameState): void {
    const panel = this.panels.missions!
    panel.replaceChildren()
    state.ensureMissions()

    const done = state.missions.filter((m) => m.claimed).length
    const ready = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length
    panel.appendChild(this.createSectionHeader('Günlük Görevler', `${done}/${state.missions.length} tamamlandı${ready > 0 ? ` · ${ready} hazır` : ''}`))

    for (const m of state.missions) {
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

    const stickyHeader = document.createElement('div')
    stickyHeader.className = 'achieve-sticky-header'

    const progressRow = document.createElement('div')
    progressRow.className = 'achieve-progress-row'
    const pct = Math.round((state.achievements.size / ACHIEVEMENTS.length) * 100)
    const ring = document.createElement('div')
    ring.className = 'achieve-progress-ring'
    ring.style.background = `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--surface2) 0)`
    ring.innerHTML = `<span>${pct}%</span>`
    const progressText = document.createElement('p')
    progressText.className = 'achieve-progress'
    progressText.textContent = `${state.achievements.size}/${ACHIEVEMENTS.length} başarım açıldı`
    progressRow.append(ring, progressText)

    const selected = this.selectedAchievementId
      ? ACHIEVEMENTS.find((a) => a.id === this.selectedAchievementId) ?? null
      : null
    const banner = this.buildAchievementBanner(
      selected,
      selected ? state.achievements.has(selected.id) : false,
    )

    stickyHeader.append(progressRow, banner)
    panel.appendChild(stickyHeader)

    const grid = document.createElement('div')
    grid.className = 'achieve-grid'
    for (const a of ACHIEVEMENTS) {
      const done = state.achievements.has(a.id)
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = `achieve-cell${done ? ' done' : ''}${this.selectedAchievementId === a.id ? ' selected' : ''}`
      cell.dataset.action = 'achieve-detail'
      cell.dataset.id = a.id
      const emoji = document.createElement('span')
      emoji.className = 'achieve-cell-emoji'
      emoji.textContent = done ? a.emoji : '🔒'
      cell.appendChild(emoji)
      grid.appendChild(cell)
    }
    panel.appendChild(grid)
  }

  private renderIpo(state: GameState): void {
    const panel = this.panels.ipo!
    panel.replaceChildren()

    panel.appendChild(this.createSectionHeader('Borsa', 'Hisse al/sat, piyasa takibi'))

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

    const divider = document.createElement('hr')
    divider.className = 'panel-divider'
    panel.appendChild(divider)

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

    const divider2 = document.createElement('hr')
    divider2.className = 'panel-divider'
    panel.appendChild(divider2)

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
