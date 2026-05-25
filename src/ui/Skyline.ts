import { PRODUCERS, producerIconPath } from '../game/Economy'
import { isGameWeekend } from '../game/GameClock'
import type { LegacyMonument } from '../game/Chronicle'
import type { WorldStageId } from '../game/WorldStage'

const BUILDING_HEIGHTS = [36, 44, 52, 48, 56, 64, 72, 80, 88, 96, 104]

function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 20
}

const TIER_HEIGHTS: Record<number, number> = {
  1: 32, 2: 44, 3: 52, 4: 60, 5: 72, 6: 84, 7: 96, 8: 108,
}

export interface SkylineBuilding {
  producerId: string
  name: string
  emoji: string
  tier: number
  income: number
}

export class Skyline {
  private el: HTMLElement
  private buildingsEl: HTMLElement
  private starsEl: HTMLElement
  private layerBack: HTMLElement
  private layerFront: HTMLElement
  private skyEl: HTMLElement
  private startTime = Date.now()
  private lastNight: boolean | null = null
  private gameTimeMs = 0
  private parallaxRaf: number | null = null
  private prevProducerIds = new Set<string>()
  private onBuildingClick?: (producerId: string) => void

  constructor(container: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'skyline'

    this.layerBack = document.createElement('div')
    this.layerBack.className = 'skyline-layer skyline-back'

    this.skyEl = document.createElement('div')
    this.skyEl.className = 'skyline-sky'

    this.starsEl = document.createElement('div')
    this.starsEl.className = 'skyline-stars'
    for (let i = 0; i < 24; i++) {
      const star = document.createElement('span')
      star.className = 'skyline-star'
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 45}%`
      star.style.animationDelay = `${Math.random() * 3}s`
      this.starsEl.appendChild(star)
    }

    this.buildingsEl = document.createElement('div')
    this.buildingsEl.className = 'skyline-buildings'

    this.layerFront = document.createElement('div')
    this.layerFront.className = 'skyline-layer skyline-front'

    const ground = document.createElement('div')
    ground.className = 'skyline-ground'

    this.el.append(this.layerBack, this.skyEl, this.starsEl, this.buildingsEl, this.layerFront, ground)
    container.prepend(this.el)
    this.animateParallax()
  }

  setBuildingClickHandler(handler: (producerId: string) => void): void {
    this.onBuildingClick = handler
  }

  update(
    buildings: SkylineBuilding[],
    worldStageId: WorldStageId = 'local',
    gameTimeMs?: number,
    monuments: LegacyMonument[] = [],
    citySkylineClass = 'city-istanbul',
  ): void {
    if (gameTimeMs !== undefined) this.gameTimeMs = gameTimeMs
    this.buildingsEl.replaceChildren()

    this.el.classList.remove('skyline-stage-local', 'skyline-stage-national', 'skyline-stage-forbes', 'skyline-stage-endgame')
    this.el.classList.remove('city-istanbul', 'city-ankara', 'city-izmir', 'city-dubai', 'city-london')
    this.el.classList.add(`skyline-stage-${worldStageId}`, citySkylineClass)

    const sorted = [...buildings].sort((a, b) => a.tier - b.tier)
    const count = sorted.length + monuments.length
    this.el.classList.toggle('skyline-mega', count >= 12 || worldStageId === 'endgame')
    this.el.classList.toggle('skyline-mid', (count >= 6 && count < 12) || worldStageId === 'forbes')

    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i]!
      const p = PRODUCERS.find((x) => x.id === b.producerId)
      const isNew = !this.prevProducerIds.has(b.producerId)
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `skyline-building svg-building skyline-tier-${b.tier}${isNew ? ' skyline-building-new' : ''}`
      el.style.animationDelay = `${i * 0.12}s`
      el.style.height = `${TIER_HEIGHTS[b.tier] ?? BUILDING_HEIGHTS[i] ?? 48}px`
      el.title = `${b.name} · ${Math.floor(b.income).toLocaleString('tr-TR')}/gün`
      el.dataset.producerId = b.producerId
      const img = document.createElement('img')
      img.src = producerIconPath(b.producerId)
      img.alt = b.name
      img.className = 'skyline-building-icon'
      el.appendChild(img)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.onBuildingClick?.(b.producerId)
      })
      this.buildingsEl.appendChild(el)
      void p
    }

    for (let mi = 0; mi < monuments.length; mi++) {
      const m = monuments[mi]!
      const el = document.createElement('div')
      el.className = 'skyline-building skyline-monument'
      el.style.animationDelay = `${(sorted.length + mi) * 0.12}s`
      el.style.height = `${96 + mi * 4}px`
      el.title = `${m.producerName} · G${m.generation} · IPO ${m.ipoEra}`
      el.textContent = m.emoji
      this.buildingsEl.appendChild(el)
    }

    if (sorted.length === 0 && monuments.length === 0) {
      const placeholder = document.createElement('div')
      placeholder.className = 'skyline-placeholder'
      placeholder.textContent = worldStageId === 'local' ? '🏘️' : '🌆'
      this.buildingsEl.appendChild(placeholder)
    }

    this.prevProducerIds = new Set(sorted.map((b) => b.producerId))
    this.updateDayNight()
  }

  flashUpgrade(): void {
    this.el.classList.remove('skyline-flash')
    void this.el.offsetWidth
    this.el.classList.add('skyline-flash')
  }

  private animateParallax(): void {
    const tick = (): void => {
      const t = (Date.now() - this.startTime) / 1000
      this.layerBack.style.transform = `translateX(${Math.sin(t * 0.2) * 8}px)`
      this.layerFront.style.transform = `translateX(${Math.sin(t * 0.3 + 1) * 12}px)`
      this.starsEl.style.transform = `translateX(${Math.sin(t * 0.1) * 4}px)`
      this.updateDayNight()
      this.parallaxRaf = requestAnimationFrame(tick)
    }
    this.parallaxRaf = requestAnimationFrame(tick)
  }

  destroy(): void {
    if (this.parallaxRaf !== null) {
      cancelAnimationFrame(this.parallaxRaf)
      this.parallaxRaf = null
    }
    this.el.remove()
  }

  private updateDayNight(): void {
    const night = this.gameTimeMs > 0 ? isGameWeekend(this.gameTimeMs) : isNightHour(new Date().getHours())
    if (this.lastNight === night) return
    this.lastNight = night
    this.el.classList.toggle('skyline-night', night)
    this.skyEl.classList.toggle('skyline-sky-night', night)
    this.starsEl.classList.toggle('visible', night)
    document.documentElement.classList.toggle('theme-night', night)
  }

  isNight(): boolean {
    return this.lastNight ?? isNightHour(new Date().getHours())
  }
}

export function currentIsNight(): boolean {
  return isNightHour(new Date().getHours())
}

export function buildSkylineBuildings(
  producers: Record<string, number>,
  incomeFn: (id: string) => number,
): SkylineBuilding[] {
  const out: SkylineBuilding[] = []
  for (const p of PRODUCERS) {
    const owned = producers[p.id] ?? 0
    if (owned <= 0) continue
    out.push({
      producerId: p.id,
      name: p.name,
      emoji: p.emoji,
      tier: p.tier,
      income: incomeFn(p.id),
    })
  }
  return out
}
