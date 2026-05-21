import type { GameState } from '../../game/GameState'
import { PRODUCERS, formatMoney, producerIconPath, type ProducerDef } from '../../game/Economy'
import { RESEARCH_NODES, researchCost } from '../../game/Research'
import { ACHIEVEMENTS } from '../../game/Achievements'
import { getActiveSynergies } from '../../game/Synergies'
import { PRESTIGE_THRESHOLD } from '../../game/GameState'
import { calcPrestigePoints, prestigeMultiplier } from '../../game/Prestige'
import { managerCost, hasManager } from '../../game/Managers'
import { profitLoss, sparklinePath, STOCK_DEFS } from '../../game/StockMarket'
import { PRESTIGE_TREE_NODES, canBuyNode, hasNode } from '../../game/PrestigeTree'

export type BuyMode = 1 | 10 | 'max'

export class ShopPanel {
  readonly root: HTMLElement
  private buyMode: BuyMode = 1
  private activeTab = 'businesses'
  private panels: Record<string, HTMLElement> = {}
  private tabButtons: HTMLButtonElement[] = []
  private buyModesEl!: HTMLElement
  private businessCards = new Map<string, HTMLDivElement>()
  private synergyEl: HTMLElement | null = null

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'shop-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'shop-header'
    header.innerHTML = '<span class="shop-title">Mağaza</span><span class="shop-sub">İşletme & yükseltme</span>'

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
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === id)
    }
    for (const [pid, panel] of Object.entries(this.panels)) {
      panel.hidden = pid !== id
    }
    this.buyModesEl.hidden = id !== 'businesses'
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

  /** Sadece fiyat/alınabilirlik güncelle — DOM yeniden oluşturma yok */
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
      const nextLockedDef = PRODUCERS.find(p => !visibleIds.has(p.id))
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
          lockText.textContent = `${formatMoney(nextLockedDef.unlockAt)} kazan, açılır`
          overlay.append(lockIcon, lockText)
          lockedCard.append(inner, overlay)
          panel.appendChild(lockedCard)
        }
      } else {
        panel.querySelector('.biz-card-locked-preview')?.remove()
      }
    }

    if (!patchOnly && panel.querySelectorAll('.biz-card:not([hidden])').length === 0 && visibleIds.size === 0) {
      let empty = panel.querySelector('.empty-msg') as HTMLElement | null
      if (!empty) {
        empty = document.createElement('p')
        empty.className = 'empty-msg'
        empty.textContent = 'Daha fazla kazan — yeni işletmeler açılacak.'
        panel.appendChild(empty)
      }
    } else {
      panel.querySelector('.empty-msg')?.remove()
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

    const bottom = document.createElement('div')
    bottom.className = 'biz-bottom'
    const costEl = document.createElement('span')
    costEl.className = 'biz-cost'
    const inc = document.createElement('span')
    inc.className = 'biz-income'
    bottom.append(costEl, inc)

    buyBtn.append(top, bottom)
    card.append(buyBtn)

    // Tier badge (absolute positioned, appended after buyBtn)
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

    // Milestone dots (10, 25, 50, 100 adet)
    let dotsEl = card.querySelector('.biz-milestone-dots') as HTMLElement | null
    if (!dotsEl) {
      dotsEl = document.createElement('div')
      dotsEl.className = 'biz-milestone-dots'
      for (const ms of [10, 25, 50, 100]) {
        const dot = document.createElement('div')
        dot.className = 'biz-milestone-dot'
        dot.title = `${ms} adet`
        dotsEl.appendChild(dot)
      }
      const bottom = card.querySelector('.biz-bottom')
      if (bottom) bottom.after(dotsEl)
    }
    const milestones = [10, 25, 50, 100]
    const dotEls = dotsEl.querySelectorAll('.biz-milestone-dot')
    milestones.forEach((ms, i) => {
      dotEls[i]?.classList.toggle('reached', owned >= ms)
    })
  }

  private renderManagement(state: GameState): void {
    const panel = this.panels.management!
    panel.replaceChildren()
    for (const p of PRODUCERS) {
      const owned = state.producers[p.id] ?? 0
      if (owned <= 0) continue
      const hired = hasManager(state.managers, p.id)
      const cost = managerCost(p.baseIncome, owned)
      const card = document.createElement('div')
      card.className = 'manager-card'
      const portrait = document.createElement('div')
      portrait.className = 'manager-portrait'
      portrait.textContent = p.emoji
      const info = document.createElement('div')
      info.className = 'manager-info'
      const name = document.createElement('strong')
      name.textContent = p.name
      const desc = document.createElement('small')
      desc.textContent = hired ? 'Yönetici aktif (+25% gelir, offline +50%)' : 'Yönetici işe al'
      info.append(name, desc)
      card.append(portrait, info)
      if (!hired) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary'
        btn.dataset.action = 'hire-manager'
        btn.dataset.id = p.id
        btn.textContent = `İşe al — ${formatMoney(state.managerDiscountActive ? cost * 0.5 : cost)}`
        btn.disabled = !state.canAfford(state.managerDiscountActive ? cost * 0.5 : cost)
        card.appendChild(btn)
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-ad'
        adBtn.dataset.action = 'ad-manager-discount'
        adBtn.dataset.id = p.id
        adBtn.textContent = '📺 %50 indirim'
        card.appendChild(adBtn)
      } else {
        const autoBtn = document.createElement('button')
        autoBtn.type = 'button'
        autoBtn.className = 'btn-secondary auto-buy-btn'
        autoBtn.dataset.action = 'toggle-autobuy'
        autoBtn.dataset.id = p.id
        autoBtn.textContent = state.managerAutoBuy[p.id] ? '🤖 Auto: Açık' : '🤖 Auto: Kapalı'
        card.appendChild(autoBtn)
      }
      panel.appendChild(card)
    }
    if (panel.childElementCount === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty-msg'
      empty.textContent = 'Önce işletme satın al.'
      panel.appendChild(empty)
    }
  }

  private renderUpgrades(state: GameState): void {
    const panel = this.panels.upgrades!
    panel.replaceChildren()
    const list = state.availableUpgrades()
    if (list.length === 0) {
      const p = document.createElement('p')
      p.className = 'empty-msg'
      p.textContent = 'Tüm yükseltmeler alındı!'
      panel.appendChild(p)
      return
    }
    for (const u of list) {
      const upgradeCost = Math.floor(u.cost * (1 - (hasNode(state.prestigeTree, 'upgrade_10') ? 0.1 : 0)))
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'biz-card'
      if (state.canAfford(upgradeCost)) card.classList.add('affordable')
      card.dataset.action = 'buy-upgrade'
      card.dataset.id = u.id
      card.disabled = !state.canAfford(upgradeCost)
      const name = document.createElement('strong')
      name.textContent = u.name
      const desc = document.createElement('small')
      desc.textContent = u.description
      const costEl = document.createElement('span')
      costEl.textContent = formatMoney(upgradeCost)
      card.append(name, desc, costEl)
      panel.appendChild(card)
    }
  }

  private renderResearch(state: GameState): void {
    const panel = this.panels.research!
    panel.replaceChildren()
    for (const node of RESEARCH_NODES) {
      const level = state.research[node.id] ?? 0
      const maxed = level >= node.maxLevel
      const cost = state.researchCostWithWeekly(researchCost(node, level))
      const canBuy = !maxed && (node.currency === 'money' ? state.canAfford(cost) : state.prestigePoints >= cost)

      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'biz-card'
      if (canBuy) card.classList.add('affordable')
      card.dataset.action = 'buy-research'
      card.dataset.id = node.id
      card.disabled = !canBuy

      const name = document.createElement('strong')
      name.textContent = `${node.name} (${level}/${node.maxLevel})`
      const desc = document.createElement('small')
      desc.textContent = node.description
      const dotsWrap = document.createElement('div')
      dotsWrap.className = 'research-level-dots'
      for (let i = 0; i < node.maxLevel; i++) {
        const dot = document.createElement('div')
        dot.className = `research-level-dot${i < level ? ' filled' : ''}`
        dotsWrap.appendChild(dot)
      }
      const costEl = document.createElement('span')
      costEl.textContent = maxed ? 'MAX' : node.currency === 'money' ? formatMoney(cost) : `${cost} hisse`
      card.append(name, desc, dotsWrap, costEl)
      panel.appendChild(card)
    }
  }

  private renderMissions(state: GameState): void {
    const panel = this.panels.missions!
    panel.replaceChildren()
    state.ensureMissions()
    for (const m of state.missions) {
      const card = document.createElement('div')
      card.className = 'mission-card'
      const label = document.createElement('p')
      label.textContent = m.label
      const bar = document.createElement('div')
      bar.className = 'progress-bar'
      const fill = document.createElement('div')
      fill.className = 'progress-fill'
      fill.style.width = `${(m.progress / m.target) * 100}%`
      bar.appendChild(fill)
      const status = document.createElement('span')
      status.textContent = `${Math.floor(m.progress)}/${m.target}`
      const reward = document.createElement('small')
      reward.textContent = m.rewardMoney > 0 ? `Ödül: ${formatMoney(m.rewardMoney)}` : `Ödül: ${m.rewardBoostMinutes}dk 2x`

      if (m.progress >= m.target && !m.claimed) {
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
        card.append(label, bar, status, reward, claimBtn, adBtn)
      } else {
        card.append(label, bar, status, reward)
        if (m.claimed) {
          const done = document.createElement('span')
          done.className = 'mission-done'
          done.textContent = 'Tamamlandı'
          card.appendChild(done)
        }
      }
      panel.appendChild(card)
    }
  }

  private renderAchievements(state: GameState): void {
    const panel = this.panels.achievements!
    panel.replaceChildren()
    const progress = document.createElement('p')
    progress.className = 'achieve-progress'
    progress.textContent = `${state.achievements.size}/${ACHIEVEMENTS.length} başarım`
    panel.appendChild(progress)

    const grid = document.createElement('div')
    grid.className = 'achieve-grid'
    for (const a of ACHIEVEMENTS) {
      const done = state.achievements.has(a.id)
      const cell = document.createElement('div')
      cell.className = `achieve-cell${done ? ' done' : ''}`
      cell.title = `${a.name}: ${a.description} (+${formatMoney(a.reward)})`
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

    const stockTitle = document.createElement('h3')
    stockTitle.textContent = `${ticker.emoji} ${ticker.name}`
    const priceRow = document.createElement('div')
    priceRow.className = 'stock-price-row'
    const trend = state.stock.trendDirection === 'up' ? '↑' : state.stock.trendDirection === 'down' ? '↓' : '→'
    priceRow.innerHTML = `<strong>${formatMoney(ticker.price)}</strong> <span class="stock-trend">${trend}</span>`

    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    spark.setAttribute('class', 'stock-sparkline')
    spark.setAttribute('viewBox', '0 0 120 32')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', sparklinePath(ticker.history, 120, 32))
    path.setAttribute('fill', 'none')
    const trendColor = state.stock.trendDirection === 'up' ? '#34d399' : state.stock.trendDirection === 'down' ? '#f87171' : '#60a5fa'
    path.setAttribute('stroke', trendColor)
    path.setAttribute('stroke-width', '2')
    spark.appendChild(path)

    const stockInfo = document.createElement('p')
    stockInfo.innerHTML = `${ticker.shares} lot | Değer: ${formatMoney(ticker.shares * ticker.price)} | K/Z: <span class="${plClass}">${formatMoney(pl)}</span>`

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
    panel.append(stockTitle, priceRow, spark, stockInfo, stockActions, hintAd)

    const divider = document.createElement('hr')
    divider.className = 'panel-divider'
    panel.appendChild(divider)

    const treeTitle = document.createElement('h3')
    treeTitle.textContent = '🌳 Prestij Ağacı'
    const treeInfo = document.createElement('p')
    treeInfo.textContent = `${state.prestigePoints} harcanabilir hisse puanı`
    panel.append(treeTitle, treeInfo)

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

    const title = document.createElement('h3')
    title.textContent = 'Şirket Birleşmesi & IPO'
    const info = document.createElement('p')
    const pending = calcPrestigePoints(state.totalEarned)
    info.textContent = pending > 0
      ? `${pending} hisse senedi kazanacaksın. Kalıcı çarpan: x${prestigeMultiplier(state.prestigePoints + pending).toFixed(2)}`
      : `IPO için enaz ${formatMoney(PRESTIGE_THRESHOLD)} toplam kazanç gerekir.`

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

    panel.append(title, info, bar, btn)
  }
}
