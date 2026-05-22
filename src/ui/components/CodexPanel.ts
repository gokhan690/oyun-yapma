import type { GameState } from '../../game/GameState'
import { PRODUCERS, formatMoney, producerIconPath, isProducerUnlocked } from '../../game/Economy'

export class CodexPanel {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('div')
    this.root.className = 'codex-panel'
  }

  render(state: GameState): void {
    this.root.replaceChildren()
    const bonus = state.codexCompletionBonus()
    const header = document.createElement('div')
    header.className = 'codex-header'
    header.innerHTML = `<strong>İmparatorluk Defteri</strong><small>${PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length}/${PRODUCERS.length} keşfedildi</small>`
    if (bonus.legal) header.innerHTML += '<span class="codex-bonus">Yasal tamam: +%5 global</span>'
    if (bonus.all) header.innerHTML += '<span class="codex-bonus">Tam koleksiyon!</span>'
    this.root.appendChild(header)

    const grid = document.createElement('div')
    grid.className = 'codex-grid'
    for (const p of PRODUCERS) {
      const owned = state.producers[p.id] ?? 0
      const unlocked = isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks)
      const card = document.createElement('div')
      card.className = 'codex-card'
      if (!unlocked) card.classList.add('codex-locked')
      else if (owned > 0) card.classList.add('codex-owned')
      if (p.illegal) card.classList.add('codex-illegal')

      const icon = document.createElement('img')
      icon.className = 'codex-icon'
      icon.src = producerIconPath(p.id)
      icon.alt = ''
      icon.onerror = () => { icon.replaceWith(document.createTextNode(p.emoji)) }

      const name = document.createElement('strong')
      name.textContent = unlocked ? p.name : '???'
      const meta = document.createElement('small')
      if (!unlocked) meta.textContent = 'Kilitli'
      else if (owned <= 0) meta.textContent = 'Açık · sahip değil'
      else {
        const date = state.codexUnlockDates[p.id]
        const income = state.producerIncome(p)
        meta.textContent = `x${owned}${date ? ` · ${date}` : ''} · ${formatMoney(income)}/gün`
      }
      card.append(icon, name, meta)
      grid.appendChild(card)
    }
    this.root.appendChild(grid)
  }
}
