import { PRODUCERS, producerIconPath } from '../game/Economy'
import { isGameWeekend } from '../game/GameClock'
import type { LegacyMonument } from '../game/Chronicle'

const BUILDING_HEIGHTS = [36, 44, 52, 48, 56, 64, 72, 80, 88, 96, 104]

function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 20
}

const TIER_HEIGHTS: Record<number, number> = {
  1: 32, 2: 44, 3: 52, 4: 60, 5: 72, 6: 84, 7: 96, 8: 108,
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

  update(tierCount: number, gameTimeMs?: number, monuments: LegacyMonument[] = []): void {
    if (gameTimeMs !== undefined) this.gameTimeMs = gameTimeMs
    this.buildingsEl.replaceChildren()
    const count = Math.min(PRODUCERS.length, Math.max(0, tierCount - monuments.length))
    this.el.classList.toggle('skyline-mega', tierCount >= 12)
    this.el.classList.toggle('skyline-mid', tierCount >= 6 && tierCount < 12)
    for (let i = 0; i < count; i++) {
      const p = PRODUCERS[i]!
      const b = document.createElement('div')
      b.className = `skyline-building svg-building skyline-tier-${p.tier}`
      b.style.animationDelay = `${i * 0.12}s`
      b.style.height = `${TIER_HEIGHTS[p.tier] ?? BUILDING_HEIGHTS[i] ?? 48}px`
      const img = document.createElement('img')
      img.src = producerIconPath(p.id)
      img.alt = ''
      img.className = 'skyline-building-icon'
      b.appendChild(img)
      this.buildingsEl.appendChild(b)
    }
    for (let mi = 0; mi < monuments.length; mi++) {
      const m = monuments[mi]!
      const b = document.createElement('div')
      b.className = 'skyline-building skyline-monument'
      b.style.animationDelay = `${(count + mi) * 0.12}s`
      b.style.height = `${96 + mi * 4}px`
      b.title = `${m.producerName} · G${m.generation} · IPO ${m.ipoEra}`
      b.textContent = m.emoji
      this.buildingsEl.appendChild(b)
    }
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
