import type { GameState } from '../../game/GameState'
import { formatGameClock } from '../../game/GameClock'
import { fmtMoney } from './refShared'

/**
 * Zaman çubuğu — RefApp header'ı altında, HER sayfada sabit görünür.
 * TEK zaman kaynağı: GameState.gameTimeMs + GameClock helperları.
 * playTimeMs burada KULLANILMAZ (oyun zamanı = gameTimeMs).
 *
 * Pause/Resume mevcut state.togglePause() metodunu kullanır — yeni zaman
 * döngüsü/interval KURMAZ. game_time + game_pause eventlerine abone olur ve
 * yalnızca değişen küçük metinleri patch'ler (tüm sayfa re-render YOK).
 */
export class RefTimeCard {
  readonly el: HTMLElement
  private unsub?: () => void
  private state?: GameState

  private clockEl!: HTMLElement
  private ageEl!: HTMLElement
  private incomeEl!: HTMLElement
  private statusEl!: HTMLElement
  private btnEl!: HTMLButtonElement

  private lastClock = ''
  private lastPaused: boolean | undefined = undefined
  private lastAge = -1
  private lastIncome = -1

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-timebar'
    this.build()

    if (state) {
      this.unsub = state.subscribe((ev) => {
        if (ev.type === 'game_time' || ev.type === 'game_pause' || ev.type === 'money_changed' || ev.type === 'purchase') {
          this.update()
        }
      })
    }
  }

  private build(): void {
    this.el.innerHTML = `
      <div class="ref-timebar__main">
        <div class="ref-timebar__clock-row">
          <span class="ref-timebar__status"><span class="ref-timebar__dot"></span><span class="ref-timebar__status-txt"></span></span>
          <span class="ref-timebar__clock"></span>
        </div>
        <div class="ref-timebar__meta">
          <span class="ref-timebar__age"></span>
          <span class="ref-timebar__income"></span>
        </div>
      </div>
      <button class="ref-timebar__btn" type="button">⏸</button>
    `
    this.clockEl  = this.el.querySelector('.ref-timebar__clock')!
    this.ageEl    = this.el.querySelector('.ref-timebar__age')!
    this.incomeEl = this.el.querySelector('.ref-timebar__income')!
    this.statusEl = this.el.querySelector('.ref-timebar__status')!
    this.btnEl    = this.el.querySelector('.ref-timebar__btn')!
    this.btnEl.addEventListener('click', () => this.state?.togglePause())
    this.update()
  }

  private update(): void {
    const s = this.state
    if (!s) {
      this.clockEl.textContent = 'Zaman verisi yok'
      this.ageEl.textContent = ''
      this.incomeEl.textContent = ''
      this.statusEl.querySelector('.ref-timebar__status-txt')!.textContent = '—'
      this.btnEl.disabled = true
      return
    }

    const clock  = formatGameClock(s.gameTimeMs)
    const paused = s.isPaused()
    const age    = s.playerAge()
    const income = Math.round(s.incomePerDay())

    if (clock !== this.lastClock) {
      this.lastClock = clock
      this.clockEl.textContent = clock
    }
    if (age !== this.lastAge) {
      this.lastAge = age
      this.ageEl.textContent = `👤 ${age} yaş`
    }
    if (income !== this.lastIncome) {
      this.lastIncome = income
      this.incomeEl.textContent = `📈 ${fmtMoney(income)}/gün`
    }
    if (paused !== this.lastPaused) {
      this.lastPaused = paused
      const txt = this.statusEl.querySelector('.ref-timebar__status-txt')!
      if (paused) {
        txt.textContent = 'Duraklatıldı'
        this.statusEl.classList.add('paused')
        this.btnEl.textContent = '▶'
        this.btnEl.classList.add('resume')
        this.btnEl.title = 'Devam Et'
        this.el.classList.add('is-paused')
      } else {
        txt.textContent = 'Akıyor'
        this.statusEl.classList.remove('paused')
        this.btnEl.textContent = '⏸'
        this.btnEl.classList.remove('resume')
        this.btnEl.title = 'Duraklat'
        this.el.classList.remove('is-paused')
      }
      this.btnEl.disabled = false
    }
  }

  /** Bileşen DOM'dan kaldırılınca çağrılmalı (bellek sızıntısını önler). */
  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
  }
}
