import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { prestigeMultiplier } from '../../game/Prestige'

export class StatsBar {
  readonly root: HTMLElement
  private moneyEl: HTMLElement
  private incomeEl: HTMLElement
  private stockEl: HTMLElement
  private boostEl: HTMLElement
  private displayedMoney = 0
  private moneyTarget = 0
  private rafId: number | null = null
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-bar'
    this.moneyEl = this.stat('Para', '💰', '0', 'money-stat')
    this.incomeEl = this.stat('Gelir', '⚡', '0/sn', 'income-stat')
    this.stockEl = this.stat('Çarpan', '📊', 'x1.00', 'stock-stat')
    this.boostEl = this.stat('Bonus', '🔥', '—', 'boost-stat')
    this.root.append(this.moneyEl, this.incomeEl, this.stockEl, this.boostEl)
    this.startMoneyLoop()
  }

  private stat(label: string, icon: string, val: string, cls: string): HTMLElement {
    const el = document.createElement('div')
    el.className = `stat ${cls}`
    const top = document.createElement('div')
    top.className = 'stat-top'
    const i = document.createElement('span')
    i.className = 'stat-icon'
    i.textContent = icon
    const v = document.createElement('span')
    v.className = 'stat-value'
    v.textContent = val
    top.append(i, v)
    const l = document.createElement('span')
    l.className = 'stat-label'
    l.textContent = label
    el.append(top, l)
    return el
  }

  setMoney(target: number): void {
    this.moneyTarget = target
  }

  render(updateAll = true): void {
    this.moneyTarget = this.state.money
    if (!updateAll) return
    this.setVal(this.incomeEl, `${formatMoney(this.state.incomePerSecond())}/sn`)
    this.setVal(this.stockEl, `x${prestigeMultiplier(this.state.prestigePoints).toFixed(2)}`)
    if (this.state.isAdBoostActive()) {
      const sec = Math.ceil(this.state.adBoostRemainingMs() / 1000)
      this.setVal(this.boostEl, `2x ${sec}sn`)
    } else if (this.state.getEventBoostActive()) {
      this.setVal(this.boostEl, '3x Viral')
    } else {
      this.setVal(this.boostEl, '—')
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
      this.setVal(this.moneyEl, formatMoney(this.displayedMoney))

      const now = performance.now()
      if (now - lastMeta > 450) {
        lastMeta = now
        this.setVal(this.incomeEl, `${formatMoney(this.state.incomePerSecond())}/sn`)
        this.setVal(this.stockEl, `x${prestigeMultiplier(this.state.prestigePoints).toFixed(2)}`)
        if (this.state.isAdBoostActive()) {
          const sec = Math.ceil(this.state.adBoostRemainingMs() / 1000)
          this.setVal(this.boostEl, `2x ${sec}sn`)
        } else if (this.state.getEventBoostActive()) {
          this.setVal(this.boostEl, '3x Viral')
        } else {
          this.setVal(this.boostEl, '—')
        }
      }

      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }

  private setVal(stat: HTMLElement, value: string): void {
    const v = stat.querySelector('.stat-value')
    if (v && v.textContent !== value) v.textContent = value
  }
}
