import type { GameState } from '../../game/GameState'
import { formatMoney, formatIncomeRate, formatMoneyHero, moneyHeroTier } from '../../game/Economy'
import { prestigeMultiplier } from '../../game/Prestige'

export class StatsBar {
  readonly root: HTMLElement
  private moneyEl!: HTMLElement
  private incomeChip!: HTMLElement
  private prestigeChip!: HTMLElement
  private boostChip!: HTMLElement
  private state: GameState
  private lastIncomeText = ''
  private lastPrestigeText = ''
  private lastBoostText = ''
  private lastPassiveValue = -1
  private lastClickValue = -1
  private lastBoostWasTimer = false

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-bar stats-bar-hero'
    this.build()
  }

  private build(): void {
    const heroEl = document.createElement('div')
    heroEl.className = 'stats-hero'

    const moneyBlock = document.createElement('div')
    moneyBlock.className = 'stats-hero-money'
    const moneyLabel = document.createElement('span')
    moneyLabel.className = 'stats-hero-label'
    moneyLabel.textContent = 'Cüzdan'
    this.moneyEl = document.createElement('span')
    this.moneyEl.className = 'stats-hero-value money-stat-value'
    this.moneyEl.textContent = '0'
    moneyBlock.append(moneyLabel, this.moneyEl)

    const chips = document.createElement('div')
    chips.className = 'stats-hero-chips'
    this.incomeChip = this.chip('⚡', '0/sn')
    this.incomeChip.title = 'Saniye başına pasif gelir (tıklama hariç)'
    this.prestigeChip = this.chip('📊', 'x1.00')
    this.boostChip = this.chip('👆', '—')
    this.boostChip.title = 'Tıklama başına baz gelir (combo/krit hariç)'
    chips.append(this.incomeChip, this.prestigeChip, this.boostChip)

    heroEl.append(moneyBlock, chips)
    this.root.appendChild(heroEl)
  }

  private chip(icon: string, val: string): HTMLElement {
    const el = document.createElement('span')
    el.className = 'stats-chip'
    el.innerHTML = `<span class="stats-chip-icon">${icon}</span><span class="stats-chip-value">${val}</span>`
    return el
  }

  /** Cüzdan anında güncellenir; chip'ler sadece updateMeta=true iken yenilenir */
  render(updateMeta = true): void {
    const formatted = formatMoneyHero(this.state.money)
    if (this.moneyEl.textContent !== formatted) {
      this.moneyEl.textContent = formatted
    }
    this.moneyEl.classList.remove('money-tier-green', 'money-tier-gold', 'money-tier-platinum')
    this.moneyEl.classList.add(`money-tier-${moneyHeroTier(this.state.money)}`)
    if (updateMeta) this.updateMeta()
  }

  /** Pasif/tıklama/prestij — satın alma, gün/gece, haber vb. anlarda */
  updateMeta(): void {
    const passiveValue = this.state.displayPassiveIncomePerSecond()
    if (this.rateChanged(this.lastPassiveValue, passiveValue)) {
      const incomeText = formatIncomeRate(passiveValue)
      if (incomeText !== this.lastIncomeText) {
        this.setChip(this.incomeChip, incomeText)
        this.lastIncomeText = incomeText
      }
      this.lastPassiveValue = passiveValue
    }

    const prestigeText = `x${prestigeMultiplier(this.state.prestigePoints).toFixed(2)}`
    if (prestigeText !== this.lastPrestigeText) {
      this.setChip(this.prestigeChip, prestigeText)
      this.lastPrestigeText = prestigeText
    }

    this.updateBoostChip(false)
  }

  /** Sadece aktif bonus geri sayımı — pasif/tıklama dokunulmaz */
  tickBoostTimers(): void {
    const hasTimer = this.state.isShopBoostActive()
      || this.state.isAdBoostActive()
      || this.state.getEventBoostActive()
    if (hasTimer || this.lastBoostWasTimer) {
      this.updateBoostChip(hasTimer)
      this.lastBoostWasTimer = hasTimer
    }
  }

  private updateBoostChip(force: boolean): void {
    let boostIcon = '👆'
    let boostText: string
    if (this.state.isShopBoostActive()) {
      boostIcon = '🛒'
      boostText = `${Math.ceil(this.state.shopBoostRemainingMs() / 1000)}s`
      this.boostChip.title = 'Mağaza gelir bonusu aktif'
    } else if (this.state.isAdBoostActive()) {
      boostIcon = '📺'
      boostText = `${Math.ceil(this.state.adBoostRemainingMs() / 1000)}s`
      this.boostChip.title = 'Reklam gelir bonusu aktif'
    } else if (this.state.getEventBoostActive()) {
      boostIcon = '✨'
      boostText = '3x'
      this.boostChip.title = 'Altın etkinlik bonusu'
    } else {
      const clickValue = this.state.displayClickIncomePerTap()
      if (!force && !this.rateChanged(this.lastClickValue, clickValue)) return
      boostText = formatMoney(clickValue)
      this.boostChip.title = 'Tıklama başına baz gelir (combo/krit hariç)'
      this.lastClickValue = clickValue
    }
    const boostKey = `${boostIcon}|${boostText}`
    if (boostKey !== this.lastBoostText) {
      this.setChipIcon(this.boostChip, boostIcon)
      this.setChip(this.boostChip, boostText)
      this.lastBoostText = boostKey
    }
  }

  /** Küçük dalgalanmalar chip metnini değiştirmesin */
  private rateChanged(prev: number, next: number): boolean {
    if (prev < 0) return true
    if (prev === next) return false
    if (prev === 0) return next > 0
    const diff = Math.abs(next - prev)
    if (diff < 1) return false
    return diff / prev >= 0.02
  }

  destroy(): void {
    /* no rAF loop */
  }

  private setChip(chip: HTMLElement, value: string): void {
    const v = chip.querySelector('.stats-chip-value')
    if (v) v.textContent = value
  }

  private setChipIcon(chip: HTMLElement, icon: string): void {
    const el = chip.querySelector('.stats-chip-icon')
    if (el) el.textContent = icon
  }
}
