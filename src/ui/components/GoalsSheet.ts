import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { DAILY_GOAL_TARGET } from '../../game/DailyGoal'
import { PRESTIGE_THRESHOLD } from '../../game/GameState'

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

    this.content.append(
      this.block('🎯 Günlük Hedef', `${formatMoney(state.dailyGoalEarned)} / ${formatMoney(DAILY_GOAL_TARGET)}`, (state.dailyGoalEarned / DAILY_GOAL_TARGET) * 100),
      this.block('📈 IPO', state.ipoProgress().ready ? 'Hazır!' : `${formatMoney(state.totalEarned)} / ${formatMoney(PRESTIGE_THRESHOLD)}`, state.ipoProgress().pct),
    )

    const def = state.getWeeklyEventDef()
    const w = state.weekly
    this.content.append(this.block(`🗓️ ${def.name}`, `${Math.floor(w.progress)}/${w.target}`, (w.progress / w.target) * 100))

    if (state.dailyGoalEarned >= DAILY_GOAL_TARGET && !state.dailyGoalClaimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'claim-daily-goal'
      btn.textContent = 'Günlük hedef ödülünü topla'
      this.content.appendChild(btn)
    }
    if (w.progress >= w.target && !w.claimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'claim-weekly'
      btn.textContent = 'Haftalık etkinlik ödülünü topla'
      this.content.appendChild(btn)
    }
  }

  private block(title: string, val: string, pct: number): HTMLElement {
    const el = document.createElement('div')
    el.className = 'goal-block'
    const h = document.createElement('strong')
    h.textContent = title
    const v = document.createElement('span')
    v.textContent = val
    const track = document.createElement('div')
    track.className = 'goal-track'
    const fill = document.createElement('div')
    fill.className = 'goal-fill'
    fill.style.width = `${Math.min(100, pct)}%`
    track.appendChild(fill)
    el.append(h, v, track)
    return el
  }
}
