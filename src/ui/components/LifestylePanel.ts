import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import {
  RESIDENCES,
  VEHICLES,
  PETS,
  WELLBEING_ACTIVITIES,
  lifestyleMonthlyExpense,
  lifestyleRentalIncome,
  residenceSellValue,
  vehicleSellValue,
  stressIncomePenalty,
  stressLabel,
  stressEmoji,
  type ResidenceId,
  type VehicleId,
  type OwnedPropertyEntry,
} from '../../game/Lifestyle'
import { gameDay } from '../../game/GameClock'
import { t } from '../../i18n'

export class LifestylePanel {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'lifestyle-panel tab-panel'
    this.root.hidden = true

    // Qty-selector buttons update the neighboring buy button dynamically
    this.root.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('[data-qty]') as HTMLButtonElement | null
      if (!btn) return
      const card = btn.closest('.lifestyle-card')
      if (!card) return
      const buyBtn = card.querySelector<HTMLButtonElement>('[data-action="buy-residence"],[data-action="buy-vehicle"]')
      if (!buyBtn) return
      const qty = parseInt(btn.dataset.qty ?? '1')
      const baseCost = parseInt(buyBtn.dataset.baseCost ?? '0')
      const actionLabel = buyBtn.dataset.baseLabel ?? t('lp_buy_btn')
      buyBtn.dataset.count = String(qty)
      buyBtn.textContent = qty > 1
        ? `${actionLabel} ×${qty} · ${formatMoney(baseCost * qty)}`
        : `${actionLabel} · ${formatMoney(baseCost)}`
      card.querySelectorAll<HTMLElement>('[data-qty]').forEach((b) => {
        b.classList.toggle('qty-active', b === btn)
      })
    })
  }

  render(state: GameState): void {
    this.root.replaceChildren()
    const ls = state.lifestyle

    const header = document.createElement('div')
    header.className = 'lifestyle-header'
    header.innerHTML = `<h2>${t('lifestyle_title')}</h2><p>${t('lifestyle_header_desc')}</p>`
    this.root.appendChild(header)

    this.root.appendChild(this.renderStressBar(state))

    const monthlyExp = lifestyleMonthlyExpense(ls)
    const rentalInc = lifestyleRentalIncome(ls)
    if (monthlyExp > 0 || rentalInc > 0) {
      const expChip = document.createElement('div')
      expChip.className = 'lifestyle-expense-chip'
      let txt = ''
      if (monthlyExp > 0) txt += `<span>${t('lp_monthly_expense')}: <strong>${formatMoney(monthlyExp)}</strong></span>`
      if (rentalInc > 0) txt += `<span>${t('lp_rental_income')}: <strong>+${formatMoney(rentalInc)}</strong>/ay</span>`
      expChip.innerHTML = txt
      this.root.appendChild(expChip)
    }

    this.root.appendChild(this.renderResidences(state))
    this.root.appendChild(this.renderVehicles(state))
    this.root.appendChild(this.renderPets(state))
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
    labelEl.textContent = `${stressEmoji(stress)} ${t('lp_stress_label_full').replace('{label}', stressLabel(stress)).replace('{value}', String(stress))}`
    row.appendChild(labelEl)

    if (penalty < 1) {
      const penaltyBadge = document.createElement('span')
      penaltyBadge.className = 'lifestyle-stress-penalty'
      penaltyBadge.textContent = t('lp_stress_penalty_value').replace('{pct}', String(Math.round((1 - penalty) * 100)))
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
      burnout.textContent = t('lp_burnout_syndrome')
      wrap.appendChild(burnout)
    }

    return wrap
  }

  private renderResidences(state: GameState): HTMLElement {
    const section = this.sectionBlock(t('lifestyle_residence'))
    const ls = state.lifestyle

    // --- Portfolio (grouped by id) ---
    if (ls.ownedResidences.length > 0) {
      const portfolioTitle = document.createElement('p')
      portfolioTitle.className = 'lifestyle-portfolio-title'
      portfolioTitle.textContent = t('lp_portfolio_residences')
      section.appendChild(portfolioTitle)

      const portfolioGrid = document.createElement('div')
      portfolioGrid.className = 'lifestyle-portfolio-grid'

      const grouped = this.groupEntries(ls.ownedResidences)
      for (const [id, group] of grouped) {
        const res = RESIDENCES.find((r) => r.id === id)
        if (!res) continue
        const isLiving = ls.residence === id
        const nonRentingNonLiving = group.count - group.rentingCount - (isLiving ? 1 : 0)

        const pCard = document.createElement('div')
        pCard.className = `lifestyle-portfolio-card${isLiving ? ' current' : ''}${group.rentingCount > 0 ? ' renting' : ''}`

        const pTop = document.createElement('div')
        pTop.className = 'lifestyle-portfolio-top'
        let topHtml = `<span class="lp-emoji">${res.emoji}</span><span class="lp-name">${res.name}</span>`
        if (group.count > 1) topHtml += `<span class="lp-badge count">×${group.count}</span>`
        if (isLiving) topHtml += `<span class="lp-badge live">${t('lp_living_here')}</span>`
        if (group.rentingCount > 0) {
          const rentTotal = group.firstEntry.rentalMonthlyIncome * group.rentingCount
          topHtml += `<span class="lp-badge rent">💰 ${group.rentingCount > 1 ? group.rentingCount + ' adet' : ''} +${formatMoney(rentTotal)}/ay</span>`
        }
        pTop.innerHTML = topHtml
        pCard.appendChild(pTop)

        const pActions = document.createElement('div')
        pActions.className = 'lifestyle-portfolio-actions'

        if (!isLiving) {
          const moveBtn = document.createElement('button')
          moveBtn.type = 'button'
          moveBtn.className = 'btn-sm btn-outline'
          moveBtn.dataset.action = 'move-to-residence'
          moveBtn.dataset.id = id
          moveBtn.textContent = t('lp_move_in')
          pActions.appendChild(moveBtn)
        }

        // Rent out button for non-renting, non-living units
        if (nonRentingNonLiving > 0) {
          const rentBtn = document.createElement('button')
          rentBtn.type = 'button'
          rentBtn.className = 'btn-sm btn-accent'
          rentBtn.dataset.action = 'rent-out-residence'
          rentBtn.dataset.id = id
          rentBtn.dataset.count = String(nonRentingNonLiving)
          const rentInc = group.firstEntry.rentalMonthlyIncome
          rentBtn.textContent = nonRentingNonLiving > 1
            ? `${t('lp_rent_out')} ×${nonRentingNonLiving} (+${formatMoney(rentInc * nonRentingNonLiving)}/ay)`
            : `${t('lp_rent_out')} (+${formatMoney(rentInc)}/ay)`
          pActions.appendChild(rentBtn)
        }

        if (group.rentingCount > 0) {
          const stopBtn = document.createElement('button')
          stopBtn.type = 'button'
          stopBtn.className = 'btn-sm btn-outline'
          stopBtn.dataset.action = 'stop-rent-residence'
          stopBtn.dataset.id = id
          stopBtn.dataset.count = String(group.rentingCount)
          stopBtn.textContent = group.rentingCount > 1 ? `${t('lp_stop_renting')} ×${group.rentingCount}` : t('lp_stop_renting')
          pActions.appendChild(stopBtn)
        }

        // Sell: can't sell the one you live in unless there are extras
        const sellable = isLiving ? group.count - 1 : group.count
        if (sellable > 0) {
          const sellVal = residenceSellValue(id as ResidenceId)
          const sell1 = document.createElement('button')
          sell1.type = 'button'
          sell1.className = 'btn-sm btn-danger'
          sell1.dataset.action = 'sell-residence'
          sell1.dataset.id = id
          sell1.dataset.count = '1'
          sell1.textContent = `${t('lp_sell')} (${formatMoney(sellVal)})`
          pActions.appendChild(sell1)

          if (sellable > 1) {
            const sellAll = document.createElement('button')
            sellAll.type = 'button'
            sellAll.className = 'btn-sm btn-danger'
            sellAll.dataset.action = 'sell-residence'
            sellAll.dataset.id = id
            sellAll.dataset.count = String(sellable)
            sellAll.textContent = `Tümünü Sat ×${sellable} (${formatMoney(sellVal * sellable)})`
            pActions.appendChild(sellAll)
          }
        }

        pCard.appendChild(pActions)
        portfolioGrid.appendChild(pCard)
      }
      section.appendChild(portfolioGrid)
    }

    // --- Buy section ---
    const buyTitle = document.createElement('p')
    buyTitle.className = 'lifestyle-portfolio-title'
    buyTitle.textContent = t('lp_buy_new_residence')
    section.appendChild(buyTitle)

    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const res of RESIDENCES) {
      if (res.buyCost === 0) continue // Skip kira (free/default)
      const ownedCount = ls.ownedResidences.filter((e) => e.id === res.id).length
      const isCurrentLiving = ls.residence === res.id

      const card = document.createElement('div')
      card.className = `lifestyle-card${isCurrentLiving ? ' owned' : ''}`

      const emoji = document.createElement('div')
      emoji.className = 'lifestyle-card-emoji'
      emoji.textContent = res.emoji

      const info = document.createElement('div')
      info.className = 'lifestyle-card-info'
      const name = document.createElement('strong')
      name.textContent = res.name
      const descEl = document.createElement('small')
      descEl.textContent = res.description
      info.append(name, descEl)

      if (ownedCount > 0) {
        const ownedBadge = document.createElement('small')
        ownedBadge.className = 'lifestyle-bonus-text'
        ownedBadge.textContent = `Sahipsin: ×${ownedCount}`
        info.appendChild(ownedBadge)
      }

      const cost = document.createElement('div')
      cost.className = 'lifestyle-card-cost'
      cost.textContent = t('lp_buy_cost').replace('{cost}', formatMoney(res.buyCost))

      card.append(emoji, info, cost)

      // Qty selector
      const qtyRow = document.createElement('div')
      qtyRow.className = 'lifestyle-qty-row'
      for (const qty of [1, 5, 10]) {
        const qBtn = document.createElement('button')
        qBtn.type = 'button'
        qBtn.className = `btn-sm lifestyle-qty-btn${qty === 1 ? ' qty-active' : ''}`
        qBtn.dataset.qty = String(qty)
        qBtn.textContent = `×${qty}`
        qtyRow.appendChild(qBtn)
      }
      card.appendChild(qtyRow)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary btn-sm lifestyle-buy-btn'
      btn.dataset.action = 'buy-residence'
      btn.dataset.id = res.id
      btn.dataset.count = '1'
      btn.dataset.baseCost = String(res.buyCost)
      btn.dataset.baseLabel = t('lp_buy_btn')
      btn.textContent = `${t('lp_buy_btn')} · ${formatMoney(res.buyCost)}`
      btn.disabled = !state.canAfford(res.buyCost)
      card.appendChild(btn)

      grid.appendChild(card)
    }

    // Also show kira option if not already there
    const kira = RESIDENCES[0]!
    if (ls.residence !== 'kira') {
      const card = document.createElement('div')
      card.className = 'lifestyle-card'
      card.innerHTML = `
        <div class="lifestyle-card-emoji">${kira.emoji}</div>
        <div class="lifestyle-card-info">
          <strong>${kira.name}</strong>
          <small>${kira.description}</small>
        </div>
        <div class="lifestyle-card-cost">${t('lp_monthly_rent').replace('{cost}', formatMoney(kira.monthlyRent))}</div>
      `
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-outline btn-sm lifestyle-buy-btn'
      btn.dataset.action = 'move-to-residence'
      btn.dataset.id = 'kira'
      btn.textContent = t('lp_move_in')
      card.appendChild(btn)
      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderVehicles(state: GameState): HTMLElement {
    const section = this.sectionBlock(t('lifestyle_vehicle'))
    const ls = state.lifestyle

    // --- Portfolio ---
    if (ls.ownedVehicles.length > 0) {
      const portfolioTitle = document.createElement('p')
      portfolioTitle.className = 'lifestyle-portfolio-title'
      portfolioTitle.textContent = t('lp_portfolio_vehicles')
      section.appendChild(portfolioTitle)

      const portfolioGrid = document.createElement('div')
      portfolioGrid.className = 'lifestyle-portfolio-grid'

      const grouped = this.groupEntries(ls.ownedVehicles)
      for (const [id, group] of grouped) {
        const veh = VEHICLES.find((v) => v.id === id)
        if (!veh) continue
        const isCurrent = ls.vehicle === id
        const nonRentingNonCurrent = group.count - group.rentingCount - (isCurrent ? 1 : 0)

        const pCard = document.createElement('div')
        pCard.className = `lifestyle-portfolio-card${isCurrent ? ' current' : ''}${group.rentingCount > 0 ? ' renting' : ''}`

        const pTop = document.createElement('div')
        pTop.className = 'lifestyle-portfolio-top'
        let topHtml = `<span class="lp-emoji">${veh.emoji}</span><span class="lp-name">${veh.name}</span>`
        if (group.count > 1) topHtml += `<span class="lp-badge count">×${group.count}</span>`
        if (isCurrent) topHtml += `<span class="lp-badge live">${t('lp_using_now')}</span>`
        if (group.rentingCount > 0) {
          const rentTotal = group.firstEntry.rentalMonthlyIncome * group.rentingCount
          topHtml += `<span class="lp-badge rent">💰 ${group.rentingCount > 1 ? group.rentingCount + ' adet' : ''} +${formatMoney(rentTotal)}/ay</span>`
        }
        pTop.innerHTML = topHtml
        pCard.appendChild(pTop)

        const pActions = document.createElement('div')
        pActions.className = 'lifestyle-portfolio-actions'

        if (!isCurrent) {
          const useBtn = document.createElement('button')
          useBtn.type = 'button'
          useBtn.className = 'btn-sm btn-outline'
          useBtn.dataset.action = 'use-vehicle'
          useBtn.dataset.id = id
          useBtn.textContent = t('lp_use')
          pActions.appendChild(useBtn)
        }

        if (nonRentingNonCurrent > 0) {
          const rentBtn = document.createElement('button')
          rentBtn.type = 'button'
          rentBtn.className = 'btn-sm btn-accent'
          rentBtn.dataset.action = 'rent-out-vehicle'
          rentBtn.dataset.id = id
          rentBtn.dataset.count = String(nonRentingNonCurrent)
          const rentInc = group.firstEntry.rentalMonthlyIncome
          rentBtn.textContent = nonRentingNonCurrent > 1
            ? `${t('lp_rent_out')} ×${nonRentingNonCurrent} (+${formatMoney(rentInc * nonRentingNonCurrent)}/ay)`
            : `${t('lp_rent_out')} (+${formatMoney(rentInc)}/ay)`
          pActions.appendChild(rentBtn)
        }

        if (group.rentingCount > 0) {
          const stopBtn = document.createElement('button')
          stopBtn.type = 'button'
          stopBtn.className = 'btn-sm btn-outline'
          stopBtn.dataset.action = 'stop-rent-vehicle'
          stopBtn.dataset.id = id
          stopBtn.dataset.count = String(group.rentingCount)
          stopBtn.textContent = group.rentingCount > 1 ? `${t('lp_stop_renting')} ×${group.rentingCount}` : t('lp_stop_renting')
          pActions.appendChild(stopBtn)
        }

        const sellable = isCurrent ? group.count - 1 : group.count
        if (sellable > 0) {
          const sellVal = vehicleSellValue(id as VehicleId)
          const sell1 = document.createElement('button')
          sell1.type = 'button'
          sell1.className = 'btn-sm btn-danger'
          sell1.dataset.action = 'sell-vehicle'
          sell1.dataset.id = id
          sell1.dataset.count = '1'
          sell1.textContent = `${t('lp_sell')} (${formatMoney(sellVal)})`
          pActions.appendChild(sell1)

          if (sellable > 1) {
            const sellAll = document.createElement('button')
            sellAll.type = 'button'
            sellAll.className = 'btn-sm btn-danger'
            sellAll.dataset.action = 'sell-vehicle'
            sellAll.dataset.id = id
            sellAll.dataset.count = String(sellable)
            sellAll.textContent = `Tümünü Sat ×${sellable} (${formatMoney(sellVal * sellable)})`
            pActions.appendChild(sellAll)
          }
        }

        pCard.appendChild(pActions)
        portfolioGrid.appendChild(pCard)
      }
      section.appendChild(portfolioGrid)
    }

    // --- Buy section ---
    const buyTitle = document.createElement('p')
    buyTitle.className = 'lifestyle-portfolio-title'
    buyTitle.textContent = t('lp_buy_new_vehicle')
    section.appendChild(buyTitle)

    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const veh of VEHICLES) {
      if (veh.buyCost === 0) continue // Skip yürüyüş
      const ownedCount = ls.ownedVehicles.filter((e) => e.id === veh.id).length
      const isCurrent = ls.vehicle === veh.id

      const card = document.createElement('div')
      card.className = `lifestyle-card${isCurrent ? ' owned' : ''}`

      const emoji = document.createElement('div')
      emoji.className = 'lifestyle-card-emoji'
      emoji.textContent = veh.emoji

      const info = document.createElement('div')
      info.className = 'lifestyle-card-info'
      const name = document.createElement('strong')
      name.textContent = veh.name
      const descEl = document.createElement('small')
      descEl.textContent = veh.description
      const bonusText = []
      if (veh.reputationBonus > 0) bonusText.push(t('lp_rep_bonus').replace('{val}', String(veh.reputationBonus)))
      if (veh.incomeMult > 1) bonusText.push(t('lp_income_mult').replace('{val}', veh.incomeMult.toFixed(2)))
      info.append(name, descEl)
      if (bonusText.length > 0) {
        const bonus = document.createElement('small')
        bonus.className = 'lifestyle-bonus-text'
        bonus.textContent = bonusText.join(' · ')
        info.appendChild(bonus)
      }
      if (ownedCount > 0) {
        const ownedBadge = document.createElement('small')
        ownedBadge.className = 'lifestyle-bonus-text'
        ownedBadge.textContent = `Sahipsin: ×${ownedCount}`
        info.appendChild(ownedBadge)
      }

      const cost = document.createElement('div')
      cost.className = 'lifestyle-card-cost'
      cost.textContent = `${formatMoney(veh.buyCost)} + ${formatMoney(veh.monthlyUpkeep)}/ay`

      card.append(emoji, info, cost)

      // Qty selector
      const qtyRow = document.createElement('div')
      qtyRow.className = 'lifestyle-qty-row'
      for (const qty of [1, 5, 10]) {
        const qBtn = document.createElement('button')
        qBtn.type = 'button'
        qBtn.className = `btn-sm lifestyle-qty-btn${qty === 1 ? ' qty-active' : ''}`
        qBtn.dataset.qty = String(qty)
        qBtn.textContent = `×${qty}`
        qtyRow.appendChild(qBtn)
      }
      card.appendChild(qtyRow)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary btn-sm lifestyle-buy-btn'
      btn.dataset.action = 'buy-vehicle'
      btn.dataset.id = veh.id
      btn.dataset.count = '1'
      btn.dataset.baseCost = String(veh.buyCost)
      btn.dataset.baseLabel = t('lp_get_btn')
      btn.textContent = `${t('lp_get_btn')} · ${formatMoney(veh.buyCost)}`
      btn.disabled = !state.canAfford(veh.buyCost)
      card.appendChild(btn)

      grid.appendChild(card)
    }

    // Yürüyüş option
    const walk = VEHICLES[0]!
    if (ls.vehicle !== 'yuruyus') {
      const card = document.createElement('div')
      card.className = 'lifestyle-card'
      card.innerHTML = `
        <div class="lifestyle-card-emoji">${walk.emoji}</div>
        <div class="lifestyle-card-info">
          <strong>${walk.name}</strong>
          <small>${walk.description}</small>
        </div>
        <div class="lifestyle-card-cost">${t('lp_free')}</div>
      `
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-outline btn-sm'
      btn.dataset.action = 'use-vehicle'
      btn.dataset.id = 'yuruyus'
      btn.textContent = t('lp_walk')
      card.appendChild(btn)
      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderPets(state: GameState): HTMLElement {
    const section = this.sectionBlock(t('lifestyle_pets'))
    const desc = document.createElement('p')
    desc.className = 'lifestyle-section-hint'
    desc.textContent = t('lp_pets_hint')
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
          <small>${t('lp_stress_reduce').replace('{val}', String(pet.dailyStressReduction))}</small>
          <small class="lifestyle-bonus-text">${formatMoney(pet.buyCost)} + ${formatMoney(pet.monthlyUpkeep)}/ay</small>
        </div>
      `

      if (!owned) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-primary btn-sm'
        btn.dataset.action = 'buy-pet'
        btn.dataset.id = pet.id
        btn.textContent = t('lp_pet_adopt').replace('{cost}', formatMoney(pet.buyCost))
        btn.disabled = !state.canAfford(pet.buyCost)
        card.appendChild(btn)
      } else {
        const badge = document.createElement('span')
        badge.className = 'lifestyle-owned-badge'
        badge.textContent = t('lp_pet_lives')
        card.appendChild(badge)
      }

      grid.appendChild(card)
    }

    section.appendChild(grid)
    return section
  }

  private renderWellbeing(state: GameState): HTMLElement {
    const currentDay = gameDay(state.gameTimeMs)
    const section = this.sectionBlock(t('lp_wellbeing_title'))
    const grid = document.createElement('div')
    grid.className = 'lifestyle-grid'

    for (const act of WELLBEING_ACTIVITIES) {
      const card = document.createElement('div')
      card.className = 'lifestyle-card lifestyle-activity-card'

      const activeUntil = act.id === 'terapi'
        ? state.lifestyle.therapyActiveUntilDay
        : state.lifestyle.vacationActiveUntilDay
      const isActive = activeUntil > currentDay

      const slowWorkText = act.incomePenaltyDays > 0 ? ` · ${act.incomePenaltyDays} gün ${t('lifestyle_slow_work')}` : ''
      card.innerHTML = `
        <div class="lifestyle-card-emoji">${act.emoji}</div>
        <div class="lifestyle-card-info">
          <strong>${act.name}</strong>
          <small>${act.description}</small>
          <small class="lifestyle-bonus-text">Stres -${act.stressReduction}${slowWorkText}</small>
        </div>
      `

      if (isActive) {
        const active = document.createElement('span')
        active.className = 'lifestyle-owned-badge'
        active.textContent = t('lp_activity_active').replace('{n}', String(activeUntil - currentDay))
        card.appendChild(active)
        const adBtn = document.createElement('button')
        adBtn.type = 'button'
        adBtn.className = 'btn-secondary btn-sm lifestyle-ad-boost-btn'
        adBtn.dataset.action = 'wellbeing-ad-boost'
        adBtn.dataset.id = act.id
        adBtn.textContent = t('lp_ad_boost')
        card.appendChild(adBtn)
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

  private groupEntries(entries: OwnedPropertyEntry[]): Map<string, { count: number; rentingCount: number; firstEntry: OwnedPropertyEntry }> {
    const grouped = new Map<string, { count: number; rentingCount: number; firstEntry: OwnedPropertyEntry }>()
    for (const entry of entries) {
      const g = grouped.get(entry.id)
      if (g) {
        g.count++
        if (entry.isRenting) g.rentingCount++
      } else {
        grouped.set(entry.id, { count: 1, rentingCount: entry.isRenting ? 1 : 0, firstEntry: entry })
      }
    }
    return grouped
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
