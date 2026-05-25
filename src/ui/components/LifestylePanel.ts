import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import {
  RESIDENCES,
  VEHICLES,
  PETS,
  WELLBEING_ACTIVITIES,
  lifestyleMonthlyExpense,
  stressIncomePenalty,
  stressLabel,
  stressEmoji,
} from '../../game/Lifestyle'
import { gameDay } from '../../game/GameClock'

export class LifestylePanel {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'lifestyle-panel tab-panel'
    this.root.hidden = true
  }

  render(state: GameState): void {
    this.root.replaceChildren()
    const ls = state.lifestyle

    const header = document.createElement('div')
    header.className = 'lifestyle-header'
    header.innerHTML = '<h2>🏠 Yaşam Tarzı</h2><p>Konut, araç, evcil hayvan ve refah</p>'
    this.root.appendChild(header)

    // Stres barı
    this.root.appendChild(this.renderStressBar(state))

    // Aylık yaşam giderleri
    const monthlyExp = lifestyleMonthlyExpense(ls)
    if (monthlyExp > 0) {
      const expChip = document.createElement('div')
      expChip.className = 'lifestyle-expense-chip'
      expChip.innerHTML = `<span>💸 Aylık yaşam gideri:</span><strong>${formatMoney(monthlyExp)}</strong>`
      this.root.appendChild(expChip)
    }

    // Konut
    this.root.appendChild(this.renderResidences(state))

    // Araç
    this.root.appendChild(this.renderVehicles(state))

    // Evcil Hayvanlar
    this.root.appendChild(this.renderPets(state))

    // Refah aktiviteleri
    this.root.appendChild(this.renderWellbeing(state))
  }

  private renderStressBar(state: GameState): HTMLElement {
    const ls = state.lifestyle
    const stress = Math.round(ls.stress)
    const penalty = stressIncomePenalty(ls.stress, ls.burnoutDays)
    const wrap = document.createElement('div')
    wrap.className = 'lifestyle-stress-section'

    const row = document.createElement('div')
    row.className = 'lifestyle-stress-row'
    const labelEl = document.createElement('span')
    labelEl.className = 'lifestyle-stress-label'
    labelEl.textContent = `${stressEmoji(stress)} Stres: ${stressLabel(stress)} (${stress}%)`
    row.appendChild(labelEl)

    if (penalty < 1) {
      const penaltyBadge = document.createElement('span')
      penaltyBadge.className = 'lifestyle-stress-penalty'
      penaltyBadge.textContent = `Gelir cezası: -%${Math.round((1 - penalty) * 100)}`
      row.appendChild(penaltyBadge)
    }

    wrap.appendChild(row)

    const barOuter = document.createElement('div')
    barOuter.className = 'lifestyle-stress-bar'
    const fill = document.createElement('div')
    fill.className = 'lifestyle-stress-fill'
    fill.style.width = `${stress}%`
    fill.style.background = stress >= 80 ? '#ef4444' : stress >= 50 ? '#f59e0b' : '#34d399'
    barOuter.appendChild(fill)
    wrap.appendChild(barOuter)

    if (ls.burnoutDays >= 3) {
      const burnout = document.createElement('p')
      burnout.className = 'lifestyle-burnout-warn'
      burnout.textContent = '💀 TÜKENMİŞLİK SENDROMU — Gelir %50 düştü! Tatile git veya terapi al.'
      wrap.appendChild(burnout)
    }

    return wrap
  }

  private renderResidences(state: GameState): HTMLElement {
    const section = this.sectionBlock('🏠 Konut')
    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const res of RESIDENCES) {
      const owned = state.lifestyle.residence === res.id
      const card = document.createElement('div')
      card.className = `lifestyle-card${owned ? ' owned' : ''}`

      const emoji = document.createElement('div')
      emoji.className = 'lifestyle-card-emoji'
      emoji.textContent = res.emoji

      const info = document.createElement('div')
      info.className = 'lifestyle-card-info'
      const name = document.createElement('strong')
      name.textContent = res.name
      const desc = document.createElement('small')
      desc.textContent = res.description
      info.append(name, desc)

      const cost = document.createElement('div')
      cost.className = 'lifestyle-card-cost'
      if (res.buyCost > 0) {
        cost.textContent = `Satın al: ${formatMoney(res.buyCost)}`
      } else if (res.monthlyRent > 0) {
        cost.textContent = `Aylık kira: ${formatMoney(res.monthlyRent)}`
      } else {
        cost.textContent = 'Ücretsiz'
      }

      card.append(emoji, info, cost)

      if (!owned) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary btn-sm lifestyle-buy-btn'
        btn.dataset.action = 'buy-residence'
        btn.dataset.id = res.id
        btn.textContent = res.buyCost > 0 ? `Satın Al · ${formatMoney(res.buyCost)}` : 'Taşın'
        btn.disabled = res.buyCost > 0 && !state.canAfford(res.buyCost)
        card.appendChild(btn)
      } else {
        const badge = document.createElement('span')
        badge.className = 'lifestyle-owned-badge'
        badge.textContent = '✅ Şu an burada yaşıyorsun'
        card.appendChild(badge)
      }

      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderVehicles(state: GameState): HTMLElement {
    const section = this.sectionBlock('🚗 Araç')
    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const veh of VEHICLES) {
      const owned = state.lifestyle.vehicle === veh.id
      const card = document.createElement('div')
      card.className = `lifestyle-card${owned ? ' owned' : ''}`

      const emoji = document.createElement('div')
      emoji.className = 'lifestyle-card-emoji'
      emoji.textContent = veh.emoji

      const info = document.createElement('div')
      info.className = 'lifestyle-card-info'
      const name = document.createElement('strong')
      name.textContent = veh.name
      const desc = document.createElement('small')
      desc.textContent = veh.description
      const bonusText = []
      if (veh.reputationBonus > 0) bonusText.push(`İtibar +${veh.reputationBonus}`)
      if (veh.incomeMult > 1) bonusText.push(`Gelir ×${veh.incomeMult.toFixed(2)}`)
      if (bonusText.length > 0) {
        const bonus = document.createElement('small')
        bonus.className = 'lifestyle-bonus-text'
        bonus.textContent = bonusText.join(' · ')
        info.append(name, desc, bonus)
      } else {
        info.append(name, desc)
      }

      const cost = document.createElement('div')
      cost.className = 'lifestyle-card-cost'
      cost.textContent = veh.buyCost > 0
        ? `${formatMoney(veh.buyCost)} + ${formatMoney(veh.monthlyUpkeep)}/ay`
        : 'Ücretsiz'

      card.append(emoji, info, cost)

      if (!owned) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary btn-sm lifestyle-buy-btn'
        btn.dataset.action = 'buy-vehicle'
        btn.dataset.id = veh.id
        btn.textContent = veh.buyCost > 0 ? `Al · ${formatMoney(veh.buyCost)}` : 'Yürü'
        btn.disabled = veh.buyCost > 0 && !state.canAfford(veh.buyCost)
        card.appendChild(btn)
      } else {
        const badge = document.createElement('span')
        badge.className = 'lifestyle-owned-badge'
        badge.textContent = '✅ Kullanıyorsun'
        card.appendChild(badge)
      }

      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderPets(state: GameState): HTMLElement {
    const section = this.sectionBlock('🐾 Evcil Hayvanlar')
    const desc = document.createElement('p')
    desc.className = 'lifestyle-section-hint'
    desc.textContent = 'Her evcil hayvan günlük stres azaltır.'
    section.appendChild(desc)

    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid lifestyle-grid-pets'

    for (const pet of PETS) {
      const owned = state.lifestyle.pets.includes(pet.id)
      const card = document.createElement('div')
      card.className = `lifestyle-card lifestyle-pet-card${owned ? ' owned' : ''}`

      card.innerHTML = `
        <div class="lifestyle-card-emoji">${pet.emoji}</div>
        <div class="lifestyle-card-info">
          <strong>${pet.name}</strong>
          <small>Günlük stres -${pet.dailyStressReduction}</small>
          <small class="lifestyle-bonus-text">${formatMoney(pet.buyCost)} + ${formatMoney(pet.monthlyUpkeep)}/ay</small>
        </div>
      `

      if (!owned) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary btn-sm'
        btn.dataset.action = 'buy-pet'
        btn.dataset.id = pet.id
        btn.textContent = `Sahiplen · ${formatMoney(pet.buyCost)}`
        btn.disabled = !state.canAfford(pet.buyCost)
        card.appendChild(btn)
      } else {
        const badge = document.createElement('span')
        badge.className = 'lifestyle-owned-badge'
        badge.textContent = '✅ Evinde yaşıyor'
        card.appendChild(badge)
      }

      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderWellbeing(state: GameState): HTMLElement {
    const currentDay = gameDay(state.gameTimeMs)
    const section = this.sectionBlock('🧘 Refah & Stres Yönetimi')
    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const act of WELLBEING_ACTIVITIES) {
      const card = document.createElement('div')
      card.className = 'lifestyle-card lifestyle-activity-card'

      const activeUntil = act.id === 'terapi'
        ? state.lifestyle.therapyActiveUntilDay
        : state.lifestyle.vacationActiveUntilDay
      const isActive = activeUntil > currentDay

      card.innerHTML = `
        <div class="lifestyle-card-emoji">${act.emoji}</div>
        <div class="lifestyle-card-info">
          <strong>${act.name}</strong>
          <small>${act.description}</small>
          <small class="lifestyle-bonus-text">Stres -${act.stressReduction}${act.incomePenaltyDays > 0 ? ` · ${act.incomePenaltyDays} gün yavaş çalışma` : ''}</small>
        </div>
      `

      if (isActive) {
        const active = document.createElement('span')
        active.className = 'lifestyle-owned-badge'
        active.textContent = `✅ Aktif (${activeUntil - currentDay} gün kaldı)`
        card.appendChild(active)
      } else {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-secondary btn-sm'
        btn.dataset.action = 'buy-wellbeing'
        btn.dataset.id = act.id
        btn.textContent = `${act.emoji} ${formatMoney(act.cost)}`
        btn.disabled = !state.canAfford(act.cost)
        card.appendChild(btn)
      }

      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private sectionBlock(title: string): HTMLElement {
    const section = document.createElement('div')
    section.className = 'lifestyle-section'
    const h3 = document.createElement('h3')
    h3.textContent = title
    section.appendChild(h3)
    return section
  }
}
