import type { GameState } from '../../../game/GameState'
import { formatMoney, formatIncomeRate } from '../../../game/Economy'
import {
  FRANCHISE_CITIES,
  FRANCHISE_COST,
  FRANCHISE_UNLOCK_COUNT,
  type FranchiseCity,
} from '../../../game/Franchise'
import { t } from '../../../i18n'

export function appendFranchiseSection(
  container: HTMLElement,
  producerId: string,
  producerName: string,
  owned: number,
  state: GameState,
): void {
  const branches = state.franchises.filter((f) => f.producerId === producerId)
  const canOpen = state.canOpenFranchise(producerId)
  const showHint = owned >= FRANCHISE_UNLOCK_COUNT - 2 && owned < FRANCHISE_UNLOCK_COUNT
  if (branches.length === 0 && !canOpen && !showHint) return

  const block = document.createElement('div')
  block.className = 'biz-franchise-block'

  const title = document.createElement('div')
  title.className = 'biz-franchise-title'
  title.innerHTML = `<strong>🏪 Franchise</strong><small>${t('franchise_title_meta').replace('{cost}', formatMoney(FRANCHISE_COST))}</small>`
  block.appendChild(title)

  if (showHint && !canOpen) {
    const hint = document.createElement('p')
    hint.className = 'biz-franchise-hint'
    hint.textContent = t('franchise_unlock_hint').replace('{n}', String(FRANCHISE_UNLOCK_COUNT - owned)).replace('{name}', producerName)
    block.appendChild(hint)
  }

  if (branches.length > 0 || canOpen) {
    const mapWrap = document.createElement('div')
    mapWrap.className = 'franchise-map-wrap'
    const mapTitle = document.createElement('div')
    mapTitle.className = 'franchise-map-title'
    mapTitle.textContent = t('franchise_map_title')
    mapWrap.appendChild(mapTitle)
    const cities = document.createElement('div')
    cities.className = 'franchise-map-cities'
    for (const c of FRANCHISE_CITIES) {
      const isActive = branches.some((b) => b.city === c.id)
      const dotWrap = document.createElement('span')
      dotWrap.className = `franchise-city-dot${isActive ? ' active' : ''}`
      dotWrap.title = `${c.label}${isActive ? ' ✓' : ''}`
      const dotCircle = document.createElement('span')
      dotCircle.className = 'dot'
      const label = document.createElement('span')
      label.textContent = c.label
      dotWrap.append(dotCircle, label)
      cities.appendChild(dotWrap)
    }
    mapWrap.appendChild(cities)
    block.appendChild(mapWrap)
  }

  if (branches.length > 0) {
    const open = document.createElement('div')
    open.className = 'biz-franchise-open'
    for (const b of branches) {
      const city = FRANCHISE_CITIES.find((c) => c.id === b.city)
      const tag = document.createElement('span')
      tag.className = 'biz-franchise-tag'
      tag.textContent = `✓ ${city?.label ?? b.city}`
      open.appendChild(tag)
    }
    block.appendChild(open)

    const totalBonus = branches.reduce((s, b) => s + b.incomeMult, 0)
    const basePassive = state.incomePerSecond()
    const franchiseContrib = basePassive > 0 ? basePassive * totalBonus / (1 + totalBonus) : 0
    const incomeRow = document.createElement('div')
    incomeRow.className = 'franchise-income-summary'
    incomeRow.innerHTML = `<span class="franchise-income-label">🏪 Franchise geliri</span><span class="franchise-income-value">${formatIncomeRate(franchiseContrib)}</span><small class="franchise-income-hint">+${Math.round(totalBonus * 100)}% pasif bonus · ${branches.length} şube</small>`
    block.appendChild(incomeRow)

    // Franchise milestone badges
    const totalFranchises = state.franchises.length
    const milestones = [
      { count: 3, emoji: '🥉', label: t('franchise_milestone_3') },
      { count: 5, emoji: '🥈', label: t('franchise_milestone_5') },
      { count: 10, emoji: '🥇', label: t('franchise_milestone_10') },
      { count: 20, emoji: '💎', label: t('franchise_milestone_20') },
    ]
    const earned = milestones.filter((m) => totalFranchises >= m.count)
    if (earned.length > 0) {
      const badgeRow = document.createElement('div')
      badgeRow.className = 'franchise-milestone-badges'
      for (const m of earned) {
        const badge = document.createElement('span')
        badge.className = 'franchise-milestone-badge'
        badge.title = `${m.label} franchise milestonu`
        badge.textContent = `${m.emoji} ${m.label}`
        badgeRow.appendChild(badge)
      }
      block.appendChild(badgeRow)
    }
  }

  if (canOpen) {
    const cities = document.createElement('div')
    cities.className = 'biz-franchise-cities'
    for (const city of FRANCHISE_CITIES) {
      const taken = branches.some((b) => b.city === city.id)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-sm biz-franchise-btn'
      btn.dataset.action = 'open-franchise'
      btn.dataset.id = `${producerId}:${city.id}`
      if (taken) {
        btn.textContent = `${city.label} ✓`
        btn.disabled = true
      } else {
        const repOk = state.reputation >= city.repReq
        const afford = state.canAfford(FRANCHISE_COST)
        btn.textContent = repOk
          ? `${city.label} · ${formatMoney(FRANCHISE_COST)}`
          : `${city.label} · ⭐${city.repReq}`
        btn.classList.toggle('biz-franchise-btn-blocked', !repOk || !afford)
        if (!repOk) btn.title = `Min itibar ${city.repReq} (sen: ${Math.floor(state.reputation)})`
        else if (!afford) btn.title = `${formatMoney(FRANCHISE_COST)} gerekli`
      }
      cities.appendChild(btn)
    }
    block.appendChild(cities)
  }

  container.appendChild(block)
}

export function franchiseReadyCount(state: GameState): number {
  return Object.entries(state.producers).filter(
    ([id, count]) => count >= FRANCHISE_UNLOCK_COUNT && state.canOpenFranchise(id),
  ).length
}

export function franchiseNearCount(state: GameState): number {
  return Object.entries(state.producers).filter(
    ([, count]) => count >= FRANCHISE_UNLOCK_COUNT - 2 && count < FRANCHISE_UNLOCK_COUNT,
  ).length
}

export function parseFranchiseAction(id: string): { producerId: string; city: FranchiseCity } | null {
  const sep = id.indexOf(':')
  if (sep <= 0) return null
  const producerId = id.slice(0, sep)
  const city = id.slice(sep + 1) as FranchiseCity
  if (!FRANCHISE_CITIES.some((c) => c.id === city)) return null
  return { producerId, city }
}
