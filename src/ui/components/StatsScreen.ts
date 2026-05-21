import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS } from '../../game/Achievements'
import { formatMoney } from '../../game/Economy'
import type { Leaderboard } from '../../game/Leaderboard'

export class StatsScreen {
  readonly layer: HTMLElement
  private state: GameState
  private leaderboard: Leaderboard
  private content!: HTMLElement

  constructor(
    state: GameState,
    leaderboard: Leaderboard,
  ) {
    this.state = state
    this.leaderboard = leaderboard
    this.layer = document.createElement('div')
    this.layer.className = 'slide-panel stats-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.textContent = 'İstatistikler'
    const settingsBtn = document.createElement('button')
    settingsBtn.type = 'button'
    settingsBtn.className = 'icon-btn'
    settingsBtn.dataset.action = 'open-settings'
    settingsBtn.textContent = '⚙️'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'icon-btn'
    close.dataset.action = 'nav-view'
    close.dataset.id = 'earn'
    close.textContent = '✕'
    header.append(title, settingsBtn, close)
    this.content = document.createElement('div')
    this.content.className = 'panel-body'
    this.layer.append(header, this.content)
  }

  render(): void {
    this.content.replaceChildren()
    const lb = this.leaderboard.getData()
    const rows = [
      ['Toplam kazanç (run)', formatMoney(this.state.totalEarned)],
      ['Yaşam boyu kazanç', formatMoney(this.state.lifetimeTotalEarned)],
      ['Tıklama', String(this.state.totalClicks)],
      ['En iyi combo', String(this.state.comboBest)],
      ['IPO sayısı', String(this.state.ipoCount)],
      ['Hisse puanı', String(this.state.prestigePoints)],
      ['Oyun süresi', formatTime(this.state.playTimeMs)],
      ['Başarım', `${this.state.achievements.size}/${ACHIEVEMENTS.length}`],
      ['Rekor kazanç', formatMoney(lb.bestLifetimeEarned)],
      ['Rekor combo', String(lb.bestCombo)],
    ]
    for (const [label, val] of rows) {
      const row = document.createElement('div')
      row.className = 'stat-row'
      const l = document.createElement('span')
      l.textContent = label
      const v = document.createElement('strong')
      v.textContent = val
      row.append(l, v)
      this.content.appendChild(row)
    }
  }

  show(): void {
    this.render()
    this.layer.classList.add('is-open')
  }

  hide(): void {
    this.layer.classList.remove('is-open')
  }

  toggle(): void {
    if (this.layer.classList.contains('is-open')) this.hide()
    else this.show()
  }
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}s ${m % 60}dk`
  return `${m}dk ${sec % 60}sn`
}
