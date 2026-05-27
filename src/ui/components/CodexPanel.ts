import type { GameState } from '../../game/GameState'
import { PRODUCERS, formatIncomeRate, producerIconPath, isProducerUnlocked } from '../../game/Economy'
import { producerLore } from '../../game/CodexLore'
import { SYNERGIES, synergyName } from '../../game/Synergies'
import { t } from '../../i18n'

type CodexTab = 'businesses' | 'synergies'

export class CodexPanel {
  readonly root: HTMLElement
  private activeTab: CodexTab = 'businesses'

  constructor() {
    this.root = document.createElement('div')
    this.root.className = 'codex-panel'
  }

  render(state: GameState): void {
    this.root.replaceChildren()
    const bonus = state.codexCompletionBonus()
    const header = document.createElement('div')
    header.className = 'codex-header'
    header.innerHTML = `<strong>${t('codex_title')}</strong><small>${PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0).length}/${PRODUCERS.length} ${t('codex_discovered')}</small>`
    if (bonus.legal) header.innerHTML += '<span class="codex-bonus">Yasal tamam: +%5 global</span>'
    if (bonus.all) header.innerHTML += '<span class="codex-bonus">Tam koleksiyon!</span>'
    this.root.appendChild(header)

    // Tab switcher
    const tabs = document.createElement('div')
    tabs.className = 'codex-tabs'
    const tabDefs: { id: CodexTab; label: string }[] = [
      { id: 'businesses', label: t('codex_tab_businesses') },
      { id: 'synergies', label: t('codex_tab_synergies') },
    ]
    for (const td of tabDefs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `codex-tab-btn${this.activeTab === td.id ? ' active' : ''}`
      btn.textContent = td.label
      btn.addEventListener('click', () => {
        this.activeTab = td.id
        this.render(state)
      })
      tabs.appendChild(btn)
    }
    this.root.appendChild(tabs)

    if (this.activeTab === 'businesses') {
      this.renderBusinesses(state)
    } else {
      this.renderSynergies(state)
    }
  }

  private renderBusinesses(state: GameState): void {
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
      if (!unlocked) meta.textContent = t('codex_locked')
      else if (owned <= 0) meta.textContent = t('codex_unlocked_empty')
      else {
        const date = state.codexUnlockDates[p.id]
        const income = state.producerIncome(p)
        const lore = producerLore(p.id)
        meta.textContent = `x${owned}${date ? ` · ${date}` : ''} · ${formatIncomeRate(income)}`
        if (lore) {
          const loreEl = document.createElement('p')
          loreEl.className = 'codex-lore'
          loreEl.textContent = lore
          card.appendChild(loreEl)
        }
      }
      card.append(icon, name, meta)
      grid.appendChild(card)
    }
    this.root.appendChild(grid)
  }

  private renderSynergies(state: GameState): void {
    const list = document.createElement('div')
    list.className = 'codex-synergy-list'

    const activeSynergies = new Set<string>()
    for (const s of SYNERGIES) {
      const [a, b] = s.requires
      if ((state.producers[a] ?? 0) > 0 && (state.producers[b] ?? 0) > 0) {
        activeSynergies.add(s.id)
      }
    }

    const activeCnt = activeSynergies.size
    const total = SYNERGIES.length
    const summary = document.createElement('p')
    summary.className = 'codex-synergy-summary'
    summary.textContent = `${activeCnt}/${total} ${t('codex_synergy_summary')}`
    list.appendChild(summary)

    for (const s of SYNERGIES) {
      const isActive = activeSynergies.has(s.id)
      const [reqA, reqB] = s.requires
      const defA = PRODUCERS.find((p) => p.id === reqA)
      const defB = PRODUCERS.find((p) => p.id === reqB)
      const ownA = (state.producers[reqA] ?? 0) > 0
      const ownB = (state.producers[reqB] ?? 0) > 0

      const row = document.createElement('div')
      row.className = `codex-synergy-row${isActive ? ' synergy-active' : ''}`

      const bonusPct = Math.round(s.bonus * 100)
      const effectLabel = s.effect === 'global'
        ? t('codex_synergy_global').replace('{pct}', String(bonusPct))
        : `${PRODUCERS.find((p) => p.id === s.targetProducer)?.name ?? s.targetProducer} +${bonusPct}%`

      row.innerHTML = `
        <div class="codex-synergy-name">${isActive ? '✅' : '🔒'} ${synergyName(s)}</div>
        <div class="codex-synergy-combo">
          <span class="${ownA ? 'syn-biz-owned' : 'syn-biz-missing'}">${defA?.emoji ?? '?'} ${defA?.name ?? reqA}</span>
          <span class="syn-plus">+</span>
          <span class="${ownB ? 'syn-biz-owned' : 'syn-biz-missing'}">${defB?.emoji ?? '?'} ${defB?.name ?? reqB}</span>
        </div>
        <div class="codex-synergy-effect">→ ${effectLabel}</div>
      `
      list.appendChild(row)
    }
    this.root.appendChild(list)
  }
}
