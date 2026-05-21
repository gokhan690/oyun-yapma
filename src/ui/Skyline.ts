const BUILDING_HEIGHTS = [36, 44, 52, 48, 56, 64, 72, 80, 88, 96]

function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 20
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

  update(tierCount: number): void {
    this.buildingsEl.replaceChildren()
    const count = Math.min(BUILDING_HEIGHTS.length, Math.max(0, tierCount))
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div')
      b.className = 'skyline-building svg-building'
      b.style.animationDelay = `${i * 0.12}s`
      b.style.height = `${BUILDING_HEIGHTS[i]}px`
      b.innerHTML = `<svg viewBox="0 0 40 80" preserveAspectRatio="none"><rect x="2" y="10" width="36" height="70" rx="2" fill="#1e3a5f"/><rect x="8" y="18" width="6" height="6" class="win"/><rect x="18" y="18" width="6" height="6" class="win"/><rect x="28" y="18" width="6" height="6" class="win"/><rect x="8" y="30" width="6" height="6" class="win"/><rect x="18" y="30" width="6" height="6" class="win"/><rect x="28" y="30" width="6" height="6" class="win"/></svg>`
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
    const hour = new Date().getHours()
    const night = isNightHour(hour)
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
