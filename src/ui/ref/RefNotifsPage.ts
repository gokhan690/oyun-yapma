import { backRow, sectionTitle, demoBanner } from './refShared'
import { i18n, fmt } from '../../i18n'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { GazetteCategory } from '../../game/BaronGazette'

const CATEGORY_EMOJI: Record<GazetteCategory, string> = {
  player:   '👤',
  rival:    '⚔️',
  market:   '📊',
  politics: '🏛️',
  crisis:   '🚨',
  calendar: '📅',
}

/** BİLDİRİMLER — gazette akışı, salt okunur (son ~50 girdi, yeniden eskiye). */
export class RefNotifsPage implements RefPage {
  readonly el: HTMLElement
  get title(): string { return i18n.t('ref_notifs_title') }
  readonly titleDeco = '🔔'

  onBack?: () => void

  private state?: GameState
  private listEl: HTMLElement
  private lastSig = ''

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-notifs-page'

    this.el.appendChild(backRow(() => this.onBack?.()))

    if (!state) this.el.appendChild(demoBanner(i18n.t('ref_notifs_demo_banner')))

    this.el.appendChild(sectionTitle(i18n.t('ref_notifs_section_title'), i18n.t('ref_notifs_section_sub')))
    this.listEl = document.createElement('div')
    this.listEl.className = 'ref-notif-list'
    this.el.appendChild(this.listEl)

    this.render()
  }

  private sig(s: GameState): string {
    const last = s.gazetteEntries[s.gazetteEntries.length - 1]
    return `${s.gazetteEntries.length}|${last?.id ?? '-'}`
  }

  private render(): void {
    const s = this.state
    if (!s) {
      this.listEl.innerHTML = `<div class="ref-notif-empty">${i18n.t('ref_notifs_empty')}</div>`
      return
    }
    const entries = s.gazetteEntries.slice(-50).reverse()
    if (!entries.length) {
      this.listEl.innerHTML = `<div class="ref-notif-empty">${i18n.t('ref_notifs_empty')}</div>`
      return
    }
    this.listEl.innerHTML = entries.map(e => `
      <div class="ref-notif-row cat-${e.category}">
        <span class="ref-notif-row__ico">${CATEGORY_EMOJI[e.category] ?? '📰'}</span>
        <div class="ref-notif-row__main">
          <div class="ref-notif-row__headline">${e.headline}</div>
          <div class="ref-notif-row__date">${fmt('ref_notifs_day_fmt', { day: String(e.gameDay) })}</div>
        </div>
      </div>
    `).join('')
  }

  refresh(state: GameState): void {
    this.state = state
    const sig = this.sig(state)
    if (sig === this.lastSig) return
    this.lastSig = sig
    this.render()
  }
}
