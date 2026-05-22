import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { dailyGoalProgress } from '../../game/DailyGoal'
import { PRESTIGE_THRESHOLD } from '../../game/GameState'
import { daysUntilWeekReset } from '../../game/dateUtils'

export class GoalsSheet {
  readonly scrim: HTMLElement
  readonly sheet: HTMLElement
  private content!: HTMLElement

  constructor() {
    this.scrim = document.createElement('div')
    this.scrim.className = 'sheet-scrim'
    this.scrim.hidden = true
    this.scrim.dataset.action = 'close-goals'

    this.sheet = document.createElement('div')
    this.sheet.className = 'goals-sheet'
    this.sheet.hidden = true

    const handle = document.createElement('div')
    handle.className = 'sheet-handle'

    const header = document.createElement('div')
    header.className = 'sheet-header'
    const title = document.createElement('h2')
    title.textContent = 'Hedefler'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'icon-btn'
    close.dataset.action = 'close-goals'
    close.textContent = '✕'
    header.append(title, close)

    this.content = document.createElement('div')
    this.content.className = 'goals-content'
    this.sheet.append(handle, header, this.content)
  }

  mount(parent: HTMLElement): void {
    parent.append(this.scrim, this.sheet)
  }

  open(): void {
    this.scrim.hidden = false
    this.sheet.hidden = false
    requestAnimationFrame(() => {
      this.scrim.classList.add('is-open')
      this.sheet.classList.add('is-open')
    })
  }

  close(): void {
    this.scrim.classList.remove('is-open')
    this.sheet.classList.remove('is-open')
    window.setTimeout(() => {
      this.scrim.hidden = true
      this.sheet.hidden = true
    }, 280)
  }

  toggle(): void {
    if (this.sheet.hidden) this.open()
    else this.close()
  }

  render(state: GameState): void {
    this.content.replaceChildren()
    state.ensureDailyGoal()
    const target = state.dailyGoalTarget()

    this.content.append(
      this.block('🎯 Günlük Hedef', `${formatMoney(state.dailyGoalEarned)} / ${formatMoney(target)}`, dailyGoalProgress(state.dailyGoalEarned, target)),
      this.block('📈 IPO', state.ipoProgress().ready ? 'Hazır!' : `${formatMoney(state.totalEarned)} / ${formatMoney(PRESTIGE_THRESHOLD)}`, state.ipoProgress().pct),
    )

    const def = state.getWeeklyEventDef()
    const w = state.weekly
    const wPct = w.target > 0 ? (w.progress / w.target) * 100 : 0
    this.content.append(this.block(
      `🗓️ ${def.name}`,
      `${formatMoney(w.progress)} / ${formatMoney(w.target)} · ${daysUntilWeekReset()} gün kaldı`,
      wPct,
    ))

    if (state.dailyGoalEarned >= target && !state.dailyGoalClaimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'claim-daily-goal'
      btn.textContent = 'Günlük hedef ödülünü topla'
      this.content.appendChild(btn)
    }
  }

  private block(title: string, sub: string, pct: number): HTMLElement {
    const el = document.createElement('div')
    el.className = 'goals-block'
    el.innerHTML = `<strong>${title}</strong><span>${sub}</span>`
    const bar = document.createElement('div')
    bar.className = 'progress-bar'
    const fill = document.createElement('div')
    fill.className = 'progress-fill'
    fill.style.width = `${Math.min(100, pct)}%`
    bar.appendChild(fill)
    el.appendChild(bar)
    return el
  }
}
