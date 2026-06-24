import type { GameState } from '../../game/GameState'
import { formatGameClock, MS_PER_GAME_DAY } from '../../game/GameClock'
import { fmtMoney } from './refShared'
import { i18n } from '../../i18n'

/**
 * Zaman çubuğu — RefApp header'ı altında, HER sayfada sabit görünür.
 * TEK zaman kaynağı: GameState.gameTimeMs + GameClock helperları.
 * playTimeMs burada KULLANILMAZ (oyun zamanı = gameTimeMs).
 *
 * Üç durum:
 *   ticking && !paused → running (Akıyor)
 *   paused             → paused  (Duraklatıldı)
 *   !ticking && !paused → stopped (Zaman motoru durdu)
 */
export class RefTimeCard {
  readonly el: HTMLElement
  private unsub?: () => void
  private state?: GameState

  private clockEl!: HTMLElement
  private ageEl!: HTMLElement
  private incomeEl!: HTMLElement
  private statusEl!: HTMLElement
  private progressEl!: HTMLElement
  private nextDayEl!: HTMLElement
  private btnEl!: HTMLButtonElement

  private lastClock = ''
  private lastStatus = ''
  private lastAge = -1
  private lastIncome = -1
  private lastProgress = -1

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
        <div class="ref-timebar__progress-row">
          <div class="ref-timebar__progress-track"><div class="ref-timebar__progress-fill"></div></div>
          <span class="ref-timebar__next-day"></span>
        </div>
        <div class="ref-timebar__meta">
          <span class="ref-timebar__age"></span>
          <span class="ref-timebar__income"></span>
        </div>
      </div>
      <button class="ref-timebar__btn" type="button">⏸</button>
    `
    this.clockEl    = this.el.querySelector('.ref-timebar__clock')!
    this.ageEl      = this.el.querySelector('.ref-timebar__age')!
    this.incomeEl   = this.el.querySelector('.ref-timebar__income')!
    this.statusEl   = this.el.querySelector('.ref-timebar__status')!
    this.progressEl = this.el.querySelector('.ref-timebar__progress-fill')!
    this.nextDayEl  = this.el.querySelector('.ref-timebar__next-day')!
    this.btnEl      = this.el.querySelector('.ref-timebar__btn')!
    this.btnEl.addEventListener('click', () => {
      const s = this.state
      if (!s) return
      if (!s.isTicking() && !s.isPaused() && s.isIntroFlowReady()) {
        // Motor durmuş (stopped state) — yeniden başlat
        s.startTick()
        this.update()
      } else {
        s.togglePause()
      }
    })
    this.update()
  }

  private update(): void {
    const s = this.state
    if (!s) {
      this.clockEl.textContent = i18n.t('ref_time_no_state')
      this.ageEl.textContent = ''
      this.incomeEl.textContent = ''
      this.statusEl.querySelector('.ref-timebar__status-txt')!.textContent = '—'
      this.nextDayEl.textContent = ''
      this.btnEl.disabled = true
      return
    }

    const clock   = formatGameClock(s.gameTimeMs)
    const ticking = s.isTicking()
    const paused  = s.isPaused()
    const age     = s.playerAge()
    const income  = Math.round(s.incomePerDay())

    // Day progress
    const elapsed   = s.gameTimeMs % MS_PER_GAME_DAY
    const remaining = MS_PER_GAME_DAY - elapsed
    const progress  = elapsed / MS_PER_GAME_DAY
    const sec       = Math.ceil(remaining / 1000)

    const progressPct = Math.round(progress * 100)

    if (clock !== this.lastClock) {
      this.lastClock = clock
      this.clockEl.textContent = clock
    }
    if (age !== this.lastAge) {
      this.lastAge = age
      this.ageEl.textContent = `👤 ${age} ${i18n.t('ref_age_suffix')}`
    }
    if (income !== this.lastIncome) {
      this.lastIncome = income
      this.incomeEl.textContent = `📈 ${fmtMoney(income)}/${i18n.t('ref_per_day')}`
    }
    if (progressPct !== this.lastProgress) {
      this.lastProgress = progressPct
      this.progressEl.style.width = `${progressPct}%`
      if (ticking && !paused) {
        this.nextDayEl.textContent = i18n.t('ref_time_next_day').replace('{sec}', String(sec))
      } else {
        this.nextDayEl.textContent = ''
      }
    }

    // Three-state status
    let statusKey: 'ref_time_running' | 'ref_time_paused' | 'ref_time_stopped'
    if (ticking && !paused) {
      statusKey = 'ref_time_running'
    } else if (paused) {
      statusKey = 'ref_time_paused'
    } else {
      statusKey = 'ref_time_stopped'
    }
    const statusStr = `${statusKey}:${ticking}`
    if (statusStr !== this.lastStatus) {
      this.lastStatus = statusStr
      const txt = this.statusEl.querySelector('.ref-timebar__status-txt')!
      txt.textContent = i18n.t(statusKey)
      const stopped = !ticking && !paused

      this.statusEl.classList.toggle('paused', paused)
      this.statusEl.classList.toggle('stopped', stopped)
      this.el.classList.toggle('is-paused', paused)
      this.el.classList.toggle('ref-timebar--stopped', stopped)

      if (paused) {
        this.btnEl.textContent = '▶'
        this.btnEl.classList.add('resume')
        this.btnEl.classList.remove('restart')
        this.btnEl.title = i18n.t('ref_time_resume')
        this.btnEl.disabled = false
      } else if (stopped) {
        this.btnEl.textContent = '▶'
        this.btnEl.classList.remove('resume')
        this.btnEl.classList.add('restart')
        this.btnEl.title = i18n.t('ref_time_resume')
        this.btnEl.disabled = !s.isIntroFlowReady()
      } else {
        this.btnEl.textContent = '⏸'
        this.btnEl.classList.remove('resume', 'restart')
        this.btnEl.title = i18n.t('ref_time_pause')
        this.btnEl.disabled = false
      }
    }
  }

  /** Bileşen DOM'dan kaldırılınca çağrılmalı (bellek sızıntısını önler). */
  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
  }
}
