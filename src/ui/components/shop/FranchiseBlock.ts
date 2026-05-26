import type { GameState } from '../../../game/GameState'
import { formatMoney } from '../../../game/Economy'
import {
  FRANCHISE_CITIES,
  FRANCHISE_COST,
  FRANCHISE_UNLOCK_COUNT,
  type FranchiseCity,
} from '../../../game/Franchise'

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
  title.innerHTML = `<strong>🏪 Franchise</strong><small>+8% pasif gelir / şube · ${formatMoney(FRANCHISE_COST)}/açılış</small>`
  block.appendChild(title)

  if (showHint && !canOpen) {
    const hint = document.createElement('p')
    hint.className = 'biz-franchise-hint'
    hint.textContent = `${FRANCHISE_UNLOCK_COUNT - owned} adet daha al → ${producerName} franchise açılabilir`
    block.appendChild(hint)
  }

  if (branches.length > 0 || canOpen) {
    const mapWrap = document.createElement('div')
    mapWrap.className = 'franchise-map-wrap'
    const mapTitle = document.createElement('div')
    mapTitle.className = 'franchise-map-title'
    mapTitle.textContent = '🗺️ Şube haritası'
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
