import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import {
  attitudeLabel,
  mergeRivalCost,
  playerSectorShare,
  rivalSectorPressure,
  sectorConflict,
  type RivalFamilyState,
} from '../../game/Rivals'
import { reputationLabel } from '../../game/Reputation'
import { currentWorldStage, nextWorldStage, worldStageProgress } from '../../game/WorldStage'
import { VICTORY_DEFS, victoryProgress } from '../../game/VictoryConditions'
import type { ChronicleEntry } from '../../game/Chronicle'

export class WorldMetaPanel {
  readonly root: HTMLElement
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-section world-meta-section'
  }

  render(): void {
    this.root.replaceChildren()
    this.renderReputation()
    this.renderWorldStage()
    this.renderVictories()
    this.renderRivals()
    this.renderChronicle()
  }

  private renderReputation(): void {
    const block = document.createElement('div')
    block.className = 'meta-block reputation-block'
    const rep = this.state.reputation
    block.innerHTML = `
      <h3>⭐ İtibar · ${reputationLabel(rep)}</h3>
      <div class="reputation-bar-wrap">
        <div class="reputation-bar"><div class="reputation-fill" style="width:${rep}%"></div></div>
        <span>${rep}/100</span>
      </div>
      <p class="meta-hint">Yasal işletme ↑ · Baskın & illegal ↓ · Yüksek itibar: ucuz işletme, siyaset. Düşük: kredi yok.</p>
    `
    this.root.appendChild(block)
  }

  private renderWorldStage(): void {
    const nw = this.state.financeNetWorth()
    const stage = currentWorldStage(nw)
    const next = nextWorldStage(nw)
    const pct = worldStageProgress(nw)
    const block = document.createElement('div')
    block.className = 'meta-block world-stage-block'
    block.innerHTML = `
      <h3>${stage.emoji} Dünya · ${stage.name}</h3>
      <p class="meta-headline">${stage.headline}</p>
      <p class="meta-threat">Tehdit: ${stage.threat}</p>
      ${next ? `<div class="progress-bar meta-progress"><div class="progress-fill" style="width:${pct}%"></div></div><small>Sonraki: ${next.name} · ${formatMoney(next.minNetWorth)} net değer</small>` : '<small>Maksimum aşama!</small>'}
    `
    this.root.appendChild(block)
  }

  private renderVictories(): void {
    const block = document.createElement('div')
    block.className = 'meta-block victories-block'
    const h = document.createElement('h3')
    h.textContent = '🏁 Zafer Yolları'
    block.appendChild(h)
    const grid = document.createElement('div')
    grid.className = 'victory-grid'
    const ctx = this.state.victoryContext()
    for (const v of VICTORY_DEFS) {
      const done = this.state.victoriesUnlocked.includes(v.id)
      const pct = victoryProgress(ctx, v.id)
      const card = document.createElement('div')
      card.className = `victory-card${done ? ' victory-done' : ''}`
      card.innerHTML = `
        <span class="victory-emoji">${v.emoji}</span>
        <strong>${v.name}</strong>
        <small>${v.description}</small>
        <div class="progress-bar victory-progress"><div class="progress-fill" style="width:${done ? 100 : pct}%"></div></div>
        <span class="victory-pct">${done ? '✓ Kazanıldı' : `%${Math.floor(pct)}`}</span>
      `
      grid.appendChild(card)
    }
    block.appendChild(grid)
    this.root.appendChild(block)
  }

  private renderRivals(): void {
    const block = document.createElement('div')
    block.className = 'meta-block rivals-block'
    const h = document.createElement('h3')
    h.textContent = '⚔️ Rakip Aileler'
    block.appendChild(h)
    const list = document.createElement('div')
    list.className = 'rival-list'
    for (const rival of this.state.rivals) {
      list.appendChild(this.rivalCard(rival))
    }
    block.appendChild(list)
    this.root.appendChild(block)
  }

  private rivalCard(rival: RivalFamilyState): HTMLElement {
    const card = document.createElement('div')
    card.className = `rival-card rival-${rival.relation}`
    const sectors = rival.sectorFocus.map((s) => {
      const share = playerSectorShare(this.state.producers, s)
      const pressure = rivalSectorPressure(rival, s)
      const conflict = sectorConflict(share, pressure)
      return `${s}${conflict !== 'none' ? ' ⚡' : ''}`
    }).join(', ')
    card.innerHTML = `
      <div class="rival-head">
        <span>${rival.emoji}</span>
        <strong>${rival.name}</strong>
        <span class="rival-attitude">${attitudeLabel(rival.attitude)}</span>
      </div>
      <small>Değer: ${formatMoney(rival.netWorth)} · ${sectors}</small>
    `
    if (rival.relation !== 'merged') {
      const actions = document.createElement('div')
      actions.className = 'rival-actions'
      const lobby = document.createElement('button')
      lobby.type = 'button'
      lobby.className = 'btn-sm btn-secondary'
      lobby.dataset.action = 'rival-lobby'
      lobby.dataset.id = rival.id
      lobby.textContent = '🏛️ Lobi'
      const coop = document.createElement('button')
      coop.type = 'button'
      coop.className = 'btn-sm btn-secondary'
      coop.dataset.action = 'rival-coop'
      coop.dataset.id = rival.id
      coop.textContent = '🤝 İşbirliği'
      const merge = document.createElement('button')
      merge.type = 'button'
      merge.className = 'btn-sm btn-primary'
      merge.dataset.action = 'rival-merge'
      merge.dataset.id = rival.id
      merge.textContent = `🛒 Satın Al (${formatMoney(mergeRivalCost(rival))})`
  merge.disabled = !this.state.canAfford(mergeRivalCost(rival))
      actions.append(lobby, coop, merge)
      card.appendChild(actions)
    } else {
      const badge = document.createElement('span')
      badge.className = 'rival-merged-badge'
      badge.textContent = '✓ Birleşti'
      card.appendChild(badge)
    }
    return card
  }

  private renderChronicle(): void {
    const block = document.createElement('div')
    block.className = 'meta-block chronicle-block'
    const h = document.createElement('h3')
    h.textContent = '📜 İmparatorluk Tarihi'
    block.appendChild(h)
    if (this.state.chronicle.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'meta-hint'
      empty.textContent = 'Henüz tarih yok — işletme al, IPO yap, nesil devret.'
      block.appendChild(empty)
    } else {
      const timeline = document.createElement('div')
      timeline.className = 'chronicle-timeline'
      for (const e of this.state.chronicle.slice(0, 20)) {
        timeline.appendChild(this.chronicleRow(e))
      }
      block.appendChild(timeline)
    }
    if (this.state.legacyMonuments.length > 0) {
      const mon = document.createElement('div')
      mon.className = 'legacy-monuments'
      mon.innerHTML = `<h4>🏙️ Kalıcı Anıtlar (${this.state.legacyMonuments.length})</h4>`
      const chips = document.createElement('div')
      chips.className = 'legacy-monument-chips'
      for (const m of this.state.legacyMonuments) {
        const chip = document.createElement('span')
        chip.className = 'legacy-chip'
        chip.textContent = `${m.emoji} ${m.producerName} · G${m.generation}`
        chips.appendChild(chip)
      }
      mon.appendChild(chips)
      block.appendChild(mon)
    }
    this.root.appendChild(block)
  }

  private chronicleRow(e: ChronicleEntry): HTMLElement {
    const row = document.createElement('div')
    row.className = `chronicle-row chronicle-${e.category}`
    row.innerHTML = `
      <span class="chronicle-emoji">${e.emoji}</span>
      <div>
        <strong>G${e.generation} · IPO ${e.ipoEra} · Gün ${e.gameDay}</strong>
        <p>${e.text}</p>
      </div>
    `
    return row
  }
}
