import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { gameDay } from '../../game/GameClock'
import { SPOUSE_OPTIONS, PLAYER_LIFESPAN, yearsUntilLifespan, type ChildRecord } from '../../game/Dynasty'

const TRAIT_LABEL: Record<string, string> = {
  merchant: 'Tüccar — pasif +12%',
  diplomat: 'Diplomat — maliyet −8%',
  innovator: 'İnovatör — tıklama +15%',
  risk_taker: 'Riskçi — illegal +20%',
}

export class DynastyPanel {
  readonly root: HTMLElement
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-section dynasty-section'
  }

  render(): void {
    this.root.replaceChildren()
    const title = document.createElement('h3')
    title.textContent = `👨‍👩‍👧 Hanedan · Nesil ${this.state.dynasty.generation}`
    this.root.appendChild(title)

    const age = this.state.playerAge()
    const yearsLeft = yearsUntilLifespan(this.state.gameTimeMs, this.state.dynasty)
    const ageBar = document.createElement('div')
    ageBar.className = 'dynasty-age-bar'
    const pct = Math.min(100, (age / PLAYER_LIFESPAN) * 100)
    ageBar.innerHTML = `
      <label><span>${this.state.playerName} · ${age} yaş</span><span>${yearsLeft} yıl kaldı</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${pct}%"></div></div>
    `
    this.root.appendChild(ageBar)
    if (yearsLeft <= 5) {
      const warn = document.createElement('p')
      warn.className = 'dynasty-lifespan-warn'
      warn.textContent = yearsLeft === 0
        ? 'Ömür doldu — miras devri yap veya çocuk yetiştir.'
        : `⚠️ ${yearsLeft} yıl içinde bir varis seçmezsen hanedan risk altında.`
      this.root.appendChild(warn)
    }

    const d = this.state.dynasty
    if (!d.spouseName) {
      this.renderMarriage()
    } else {
      this.renderFamily()
    }
  }

  private renderMarriage(): void {
    const p = document.createElement('p')
    p.className = 'dynasty-desc'
    p.textContent = 'İmparatorluğunu büyütmek için evlen. Eşinin özelliği bonus verir; çocuklar mirasçı olur.'
    this.root.appendChild(p)
    const grid = document.createElement('div')
    grid.className = 'dynasty-spouse-grid'
    for (const s of SPOUSE_OPTIONS) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'dynasty-spouse-card'
      card.dataset.action = 'dynasty-marry'
      card.dataset.id = s.id
      card.innerHTML = `
        <span class="dynasty-spouse-emoji">${s.emoji}</span>
        <strong>${s.name}</strong>
        <small>${s.bonusLabel}</small>
        <small class="dynasty-cost">${formatMoney(s.cost)}</small>
      `
      card.disabled = !this.state.canAfford(s.cost)
      grid.appendChild(card)
    }
    this.root.appendChild(grid)
  }

  private renderFamily(): void {
    const d = this.state.dynasty
    const spouse = document.createElement('p')
    spouse.className = 'dynasty-spouse-line'
    spouse.textContent = `💍 Eş: ${d.spouseName} · ${TRAIT_LABEL[d.spouseTrait ?? ''] ?? ''}`
    this.root.appendChild(spouse)

    const kidsTitle = document.createElement('h4')
    kidsTitle.textContent = `Çocuklar (${d.children.length}/3)`
    this.root.appendChild(kidsTitle)

    if (d.children.length === 0) {
      const wait = document.createElement('p')
      wait.className = 'dynasty-desc'
      const day = gameDay(this.state.gameTimeMs)
      const married = d.marriedGameDay ?? day
      wait.textContent = day - married < 5
        ? 'Çocuk için oyun günlerinin ilerlemesini bekle…'
        : 'Çocuk yakında gelebilir — oyun saati aksın.'
      this.root.appendChild(wait)
    } else {
      const list = document.createElement('div')
      list.className = 'dynasty-children'
      for (const c of d.children) {
        list.appendChild(this.childCard(c))
      }
      this.root.appendChild(list)
    }

    if (d.children.length > 0) {
      const hint = document.createElement('p')
      hint.className = 'dynasty-desc'
      hint.textContent = this.state.needsSuccession()
        ? '80 yaşına geldin — bir çocuğu seçerek imparatorluğu devral.'
        : 'Miras devri: seçtiğin çocukla imparatorluğa devam edersin (isim + trait bonusu).'
      this.root.appendChild(hint)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `btn-primary dynasty-succession-btn${this.state.needsSuccession() ? ' btn-urgent' : ''}`
      btn.dataset.action = 'dynasty-succession-open'
      btn.textContent = this.state.needsSuccession() ? '👑 Varis Seç (Zorunlu)' : '👑 Miras Devri'
      this.root.appendChild(btn)
    }

    if (d.dynastyBonusId) {
      const active = d.children.find((c) => c.id === d.dynastyBonusId)
      if (active) {
        const badge = document.createElement('p')
        badge.className = 'dynasty-active-heir'
        badge.textContent = `Aktif varis: ${active.name} (${TRAIT_LABEL[active.trait]})`
        this.root.appendChild(badge)
      }
    }
  }

  private childCard(c: ChildRecord): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dynasty-child-card'
    const isHeir = this.state.dynasty.dynastyBonusId === c.id
      card.innerHTML = `
      <span class="dynasty-child-emoji">${isHeir ? '👑' : '🧒'}</span>
      <div>
        <strong>${c.name}</strong>
        <small>${TRAIT_LABEL[c.trait]}</small>
        <small>Gün ${c.bornGameDay}'de doğdu · Eğitim ${Math.floor(c.educationXp ?? 0)}%</small>
      </div>
    `
    const pick = document.createElement('button')
    pick.type = 'button'
    pick.className = 'btn-sm btn-secondary'
    pick.dataset.action = 'dynasty-succession'
    pick.dataset.id = c.id
    pick.textContent = isHeir ? 'Varis' : 'Devral'
    card.appendChild(pick)
    return card
  }
}
