import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { UNDERGROUND_ACTIONS } from '../../game/Underground'

export class UndergroundSheet {
  readonly scrim: HTMLElement
  readonly sheet: HTMLElement
  private content!: HTMLElement

  constructor() {
    this.scrim = document.createElement('div')
    this.scrim.className = 'sheet-scrim'
    this.scrim.hidden = true
    this.scrim.dataset.action = 'close-underground'

    this.sheet = document.createElement('div')
    this.sheet.className = 'underground-sheet goals-sheet'
    this.sheet.hidden = true

    const handle = document.createElement('div')
    handle.className = 'sheet-handle'
    const header = document.createElement('div')
    header.className = 'sheet-header'
    const title = document.createElement('h2')
    title.textContent = '🕶️ Underground'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'icon-btn'
    close.dataset.action = 'close-underground'
    close.textContent = '✕'
    header.append(title, close)
    this.content = document.createElement('div')
    this.content.className = 'goals-content underground-content'
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
    const heat = document.createElement('div')
    heat.className = 'underground-heat-summary'
    heat.innerHTML = `<strong>Radar: ${state.illegalRiskLabel()} (${Math.round(state.illegalHeat)}%)</strong>`
    if (state.isHeatShieldActive()) {
      heat.innerHTML += '<small>🛡️ Heat kalkanı aktif</small>'
    }
    this.content.appendChild(heat)

    for (const action of UNDERGROUND_ACTIONS) {
      const card = document.createElement('div')
      card.className = 'underground-action-card'
      const check = state.canUseUnderground(action.id)
      const cd = state.undergroundCooldownRemaining(action.id)
      let costText = ''
      if (action.id === 'lawyer') costText = formatMoney(state.incomePerDay() * 0.5)
      else if (action.id === 'bribe') costText = formatMoney(Math.floor(state.money * 0.05))
      else costText = formatMoney(Math.max(1, Math.floor(state.illegalIncomePerDay() * 0.2)))

      card.innerHTML = `
        <div class="underground-action-top">
          <span class="underground-action-emoji">${action.emoji}</span>
          <div><strong>${action.name}</strong><small>${action.description}</small></div>
        </div>
        <div class="underground-action-meta">
          <span>Maliyet: ${costText}</span>
          ${cd > 0 ? `<span>Bekle: ${Math.ceil(cd / 1000)}sn</span>` : ''}
        </div>
      `
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'underground-use'
      btn.dataset.id = action.id
      btn.textContent = check.ok ? 'Kullan' : (check.reason ?? 'Kullanılamaz')
      btn.disabled = !check.ok
      card.appendChild(btn)
      this.content.appendChild(card)
    }

    const adBtn = document.createElement('button')
    adBtn.type = 'button'
    adBtn.className = 'btn-ad'
    adBtn.dataset.action = 'ad-heat-shield'
    adBtn.textContent = '📺 Heat Kalkanı (15 dk)'
    this.content.appendChild(adBtn)
  }
}
