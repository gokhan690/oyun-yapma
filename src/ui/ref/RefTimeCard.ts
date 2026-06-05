import type { GameState } from '../../game/GameState'
import { formatGameClock } from '../../game/GameClock'
import { fmtMoney } from './refShared'

/**
 * Zaman kontrolü kartı — oyun saati, yaş, günlük gelir, duraklat/devam.
 * state verilmezse salt görüntü modunda (mock değerlerle) çalışır.
 */
export class RefTimeCard {
  readonly el: HTMLElement
  private unsub?: () => void
  private state?: GameState

  private clockEl!: HTMLElement
  private metaEl!: HTMLElement
  private btnEl!: HTMLButtonElement

  private lastClock = ''
  private lastPaused: boolean | undefined = undefined
  private lastAge = -1

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-time-card'
    this.build()

    if (state) {
      this.unsub = state.subscribe((ev) => {
        if (ev.type === 'game_pause' || ev.type === 'game_time') this.update()
      })
    }
  }

  private build(): void {
    this.el.innerHTML = `
      <div class="ref-time-card__body">
        <div class="ref-time-card__clock-row">
          <span class="ref-time-card__ico">🕐</span>
          <span class="ref-time-card__clock"></span>
        </div>
        <div class="ref-time-card__meta"></div>
      </div>
      <div class="ref-time-card__ctrl">
        <button class="ref-time-btn" type="button">⏸ DURAKLAT</button>
      </div>
    `
    this.clockEl = this.el.querySelector('.ref-time-card__clock')!
    this.metaEl  = this.el.querySelector('.ref-time-card__meta')!
    this.btnEl   = this.el.querySelector('.ref-time-btn')!
    this.btnEl.addEventListener('click', () => this.state?.togglePause())
    this.update()
  }

  private update(): void {
    const s = this.state
    if (!s) {
      this.clockEl.textContent = '— Zaman verisiz —'
      this.metaEl.innerHTML = '<span>Yaş —</span><span>—/gün</span>'
      this.btnEl.textContent = '⏸ DURAKLAT'
      this.btnEl.disabled = true
      return
    }

    const clock  = formatGameClock(s.gameTimeMs)
    const paused = s.isPaused()
    const age    = s.playerAge()
    const income = s.incomePerDay()

    // Değişmediyse DOM'a dokunma
    if (clock === this.lastClock && paused === this.lastPaused && age === this.lastAge) return
    this.lastClock  = clock
    this.lastPaused = paused
    this.lastAge    = age

    this.clockEl.textContent = clock
    this.metaEl.innerHTML = `<span>👤 Yaş ${age}</span><span>📈 ${fmtMoney(income)}/gün</span>`

    this.btnEl.disabled = false
    if (paused) {
      this.btnEl.textContent = '▶ DEVAM ET'
      this.btnEl.classList.add('resume')
      this.btnEl.classList.remove('pause')
      this.el.classList.add('is-paused')
    } else {
      this.btnEl.textContent = '⏸ DURAKLAT'
      this.btnEl.classList.add('pause')
      this.btnEl.classList.remove('resume')
      this.el.classList.remove('is-paused')
    }
  }

  /** Bileşen DOM'dan kaldırılınca çağrılmalı (bellek sızıntısını önler). */
  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
  }
}
