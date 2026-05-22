import type { GameState } from '../../game/GameState'
import { formatMoney, formatIncomeRate } from '../../game/Economy'
import { prestigeMultiplier } from '../../game/Prestige'

export class StatsBar {
  readonly root: HTMLElement
  private heroEl!: HTMLElement
  private moneyEl!: HTMLElement
  private incomeChip!: HTMLElement
  private prestigeChip!: HTMLElement
  private boostChip!: HTMLElement
  private displayedMoney = 0
  private moneyTarget = 0
  private rafId: number | null = null
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-bar stats-bar-hero'
    this.build()
    this.startMoneyLoop()
  }

  private build(): void {
    this.heroEl = document.createElement('div')
    this.heroEl.className = 'stats-hero'

    const moneyBlock = document.createElement('div')
    moneyBlock.className = 'stats-hero-money'
    const moneyLabel = document.createElement('span')
    moneyLabel.className = 'stats-hero-label'
    moneyLabel.textContent = 'Para'
    this.moneyEl = document.createElement('span')
    this.moneyEl.className = 'stats-hero-value money-stat-value'
    this.moneyEl.textContent = '0'
    moneyBlock.append(moneyLabel, this.moneyEl)

    const chips = document.createElement('div')
    chips.className = 'stats-hero-chips'
    this.incomeChip = this.chip('⚡', '0/gün')
    this.prestigeChip = this.chip('📊', 'x1.00')
    this.boostChip = this.chip('🔥', '—')
    chips.append(this.incomeChip, this.prestigeChip, this.boostChip)

    this.heroEl.append(moneyBlock, chips)
    this.root.appendChild(this.heroEl)
  }

  private chip(icon: string, val: string): HTMLElement {
    const el = document.createElement('span')
    el.className = 'stats-chip'
    el.innerHTML = `<span class="stats-chip-icon">${icon}</span><span class="stats-chip-value">${val}</span>`
    return el
  }

  setMoney(target: number): void {
    this.moneyTarget = target
  }

  render(updateAll = true): void {
    this.moneyTarget = this.state.money
    if (!updateAll) return
    this.updateMeta()
  }

  private updateMeta(): void {
    this.setChip(this.incomeChip, formatIncomeRate(this.state.incomePerDay()))
    this.setChip(this.prestigeChip, `x${prestigeMultiplier(this.state.prestigePoints).toFixed(2)}`)
    if (this.state.isShopBoostActive()) {
      const sec = Math.ceil(this.state.shopBoostRemainingMs() / 1000)
      this.setChip(this.boostChip, `+50% ${sec}sn`)
    } else if (this.state.isAdBoostActive()) {
      const sec = Math.ceil(this.state.adBoostRemainingMs() / 1000)
      this.setChip(this.boostChip, `2x ${sec}sn`)
    } else if (this.state.getEventBoostActive()) {
      this.setChip(this.boostChip, '3x Viral')
    } else {
      this.setChip(this.boostChip, '—')
    }
  }

  private startMoneyLoop(): void {
    let lastMeta = 0
    const tick = (): void => {
      this.moneyTarget = this.state.money
      const diff = this.moneyTarget - this.displayedMoney
      if (Math.abs(diff) < 0.05) {
        this.displayedMoney = this.moneyTarget
      } else if (Math.abs(diff) > 500) {
        this.displayedMoney += diff * 0.12
      } else {
        this.displayedMoney += diff * 0.25
      }
      const formatted = formatMoney(this.displayedMoney)
      if (this.moneyEl.textContent !== formatted) this.moneyEl.textContent = formatted

      const now = performance.now()
      if (now - lastMeta > 450) {
        lastMeta = now
        this.updateMeta()
      }

      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }

  private setChip(chip: HTMLElement, value: string): void {
    const v = chip.querySelector('.stats-chip-value')
    if (v && v.textContent !== value) v.textContent = value
  }
}
