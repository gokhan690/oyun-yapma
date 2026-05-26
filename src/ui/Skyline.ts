import { PRODUCERS } from '../game/Economy'
import { isGameWeekend } from '../game/GameClock'
import type { LegacyMonument } from '../game/Chronicle'
import type { WorldStageId } from '../game/WorldStage'
import { t } from '../i18n'

const MAX_BUILDINGS = 16

const TIER_HEIGHTS: Record<number, number> = {
  1: 48, 2: 56, 3: 64, 4: 72, 5: 82, 6: 92, 7: 102, 8: 112, 9: 122, 10: 132, 11: 142,
}

const TIER_COLORS: Record<number, [string, string]> = {
  1:  ['#4a4038', '#211a12'],  // koyu beton / eski ahşap
  2:  ['#5c4f43', '#2e241a'],  // sıcak çimento
  3:  ['#6b5a48', '#3a2c1e'],  // kahverengi tuğla
  4:  ['#7d6a52', '#44321e'],  // sıcak taş
  5:  ['#fbbf24', '#b45309'],  // altın
  6:  ['#34d399', '#047857'],  // zümrüt
  7:  ['#a78bfa', '#6d28d9'],  // mor
  8:  ['#f472b6', '#be185d'],  // pembe
  9:  ['#38bdf8', '#0369a1'],  // gökyüzü
  10: ['#fcd34d', '#92400e'],  // derin altın
  11: ['#e879f9', '#86198f'],  // fuşya
}

function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 20
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
  private silhouetteEl: HTMLElement
  private starsEl: HTMLElement
  private layerBack: HTMLElement
  private layerFront: HTMLElement
  private skyEl: HTMLElement
  private startTime = Date.now()
  private lastNight: boolean | null = null
  private gameTimeMs = 0
  private parallaxRaf: number | null = null
  private prevProducerIds = new Set<string>()
  /** producerId → satır başına koyu pencere indexleri (sabit, titreme yok) */
  private windowCache = new Map<string, boolean[][]>()
  private hillsEl: HTMLElement
  private moonEl: HTMLElement
  private rainEl: HTMLElement
  private lastCrisis = false

  constructor(container: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'skyline'

    this.layerBack = document.createElement('div')
    this.layerBack.className = 'skyline-layer skyline-back'

    this.skyEl = document.createElement('div')
    this.skyEl.className = 'skyline-sky'

    this.starsEl = document.createElement('div')
    this.starsEl.className = 'skyline-stars'
    for (let i = 0; i < 36; i++) {
      const star = document.createElement('span')
      star.className = 'skyline-star'
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 45}%`
      star.style.animationDelay = `${Math.random() * 3}s`
      this.starsEl.appendChild(star)
    }

    this.buildingsEl = document.createElement('div')
    this.buildingsEl.className = 'skyline-buildings'

    this.silhouetteEl = document.createElement('div')
    this.silhouetteEl.className = 'skyline-silhouette'
    this.silhouetteEl.setAttribute('aria-hidden', 'true')

    this.hillsEl = document.createElement('div')
    this.hillsEl.className = 'skyline-hills'
    this.hillsEl.setAttribute('aria-hidden', 'true')

    this.moonEl = document.createElement('div')
    this.moonEl.className = 'skyline-moon'
    this.moonEl.setAttribute('aria-hidden', 'true')

    this.rainEl = document.createElement('div')
    this.rainEl.className = 'skyline-rain'
    this.rainEl.setAttribute('aria-hidden', 'true')
    this.rainEl.hidden = true
    for (let i = 0; i < 18; i++) {
      const drop = document.createElement('span')
      drop.className = 'skyline-rain-drop'
      drop.style.left = `${Math.random() * 100}%`
      drop.style.height = `${10 + Math.random() * 14}px`
      drop.style.animationDelay = `${Math.random() * 1.2}s`
      drop.style.animationDuration = `${0.9 + Math.random() * 0.6}s`
      this.rainEl.appendChild(drop)
    }

    this.layerFront = document.createElement('div')
    this.layerFront.className = 'skyline-layer skyline-front'

    const ground = document.createElement('div')
    ground.className = 'skyline-ground'

    this.el.append(this.layerBack, this.skyEl, this.starsEl, this.moonEl, this.hillsEl, this.silhouetteEl, this.buildingsEl, this.layerFront, ground, this.rainEl)
    container.prepend(this.el)
    this.animateParallax()
  }

  setBuildingClickHandler(_handler: (producerId: string) => void): void {
    /* skyline dekoratif — tıklama tap alanında */
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

    const sorted = [...buildings].sort((a, b) => a.tier - b.tier || b.income - a.income)
    const overflow = sorted.length > MAX_BUILDINGS ? sorted.length - MAX_BUILDINGS + 1 : 0
    const visible = overflow > 0 ? sorted.slice(-MAX_BUILDINGS + 1) : sorted

    const count = visible.length + monuments.length + (overflow > 0 ? 1 : 0)
    this.el.classList.toggle('skyline-mega', count >= 12 || worldStageId === 'endgame')
    this.el.classList.toggle('skyline-mid', (count >= 6 && count < 12) || worldStageId === 'forbes')

    if (overflow > 0) {
      const cluster = document.createElement('div')
      cluster.className = 'skyline-building skyline-cluster'
      cluster.title = t('skyline_more').replace('{n}', String(overflow))
      cluster.innerHTML = `<div class="skyline-tower" style="height:52px"><span class="skyline-emoji">🏙️</span><span class="skyline-cluster-count">+${overflow}</span></div>`
      this.buildingsEl.appendChild(cluster)
    }

    for (let i = 0; i < visible.length; i++) {
      const b = visible[i]!
      const isNew = !this.prevProducerIds.has(b.producerId)
      const height = TIER_HEIGHTS[b.tier] ?? 48
      const [top, bottom] = TIER_COLORS[b.tier] ?? TIER_COLORS[1]!
      const bldWidth = Math.min(56, 28 + b.tier * 4)

      const el = document.createElement('div')
      el.className = `skyline-building skyline-tier-${b.tier}${isNew ? ' skyline-building-new' : ''}`
      el.style.animationDelay = `${i * 0.07}s`
      el.title = `${b.name} · ${Math.floor(b.income).toLocaleString('tr-TR')}/sn`
      el.dataset.producerId = b.producerId

      const tower = document.createElement('div')
      tower.className = 'skyline-tower'
      tower.style.cssText = `height:${height}px; width:${bldWidth}px; background:linear-gradient(170deg,${top} 0%,${bottom} 100%)`

      // Rooftop ledge
      const ledge = document.createElement('div')
      ledge.className = 'skyline-ledge'
      ledge.style.background = top
      tower.appendChild(ledge)

      // Spire + antenna light for tier 6+
      if (b.tier >= 6) {
        const spire = document.createElement('div')
        spire.className = 'skyline-spire'
        tower.appendChild(spire)
        if (b.tier >= 8) {
          const light = document.createElement('div')
          light.className = 'skyline-antenna-light'
          tower.appendChild(light)
        }
      }

      // Side shadow stripe for depth
      const shade = document.createElement('div')
      shade.className = 'skyline-shade'
      tower.appendChild(shade)

      // Windows — vary lit/unlit (cache'li, titreme yok)
      const windows = document.createElement('div')
      windows.className = 'skyline-windows'
      const cols = bldWidth >= 46 ? 4 : 3
      const rowCount = Math.max(2, Math.floor((height - 14) / 16))
      if (!this.windowCache.has(b.producerId)) {
        const rows: boolean[][] = []
        for (let r = 0; r < rowCount; r++) {
          rows.push(Array.from({ length: cols }, () => Math.random() < 0.28))
        }
        this.windowCache.set(b.producerId, rows)
      }
      const cachedRows = this.windowCache.get(b.producerId)!
      for (let r = 0; r < rowCount; r++) {
        const row = document.createElement('div')
        row.className = 'skyline-window-row'
        const rowData = cachedRows[r] ?? []
        for (let c = 0; c < cols; c++) {
          const w = document.createElement('span')
          if (rowData[c]) w.className = 'win-dark'
          row.appendChild(w)
        }
        windows.appendChild(row)
      }

      const emoji = document.createElement('span')
      emoji.className = 'skyline-emoji'
      emoji.textContent = b.emoji

      tower.append(windows, emoji)
      el.appendChild(tower)
      this.buildingsEl.appendChild(el)
    }

    for (let mi = 0; mi < monuments.length; mi++) {
      const m = monuments[mi]!
      const el = document.createElement('div')
      el.className = 'skyline-building skyline-monument'
      el.style.animationDelay = `${(visible.length + mi) * 0.08}s`
      el.title = `${m.producerName} · G${m.generation} · IPO ${m.ipoEra}`
      const tower = document.createElement('div')
      tower.className = 'skyline-tower skyline-monument-tower'
      tower.style.height = `${88 + mi * 6}px`
      tower.innerHTML = `<span class="skyline-emoji">${m.emoji}</span>`
      el.appendChild(tower)
      this.buildingsEl.appendChild(el)
    }

    if (visible.length === 0 && monuments.length === 0) {
      const placeholder = document.createElement('div')
      placeholder.className = 'skyline-placeholder'
      placeholder.innerHTML = `<span>${worldStageId === 'local' ? '🏘️' : '🌆'}</span><strong>Şehir silüeti</strong><small>${t('skyline_placeholder')}</small>`
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

  setCrisis(hasCrisis: boolean): void {
    if (hasCrisis === this.lastCrisis) return
    this.lastCrisis = hasCrisis
    this.rainEl.hidden = !hasCrisis
    this.el.classList.toggle('skyline-crisis', hasCrisis)
  }

  private animateParallax(): void {
    const tick = (): void => {
      const t = (Date.now() - this.startTime) / 1000
      this.layerBack.style.transform = `translateX(${Math.sin(t * 0.2) * 10}px)`
      this.layerFront.style.transform = `translateX(${Math.sin(t * 0.3 + 1) * 14}px)`
      this.starsEl.style.transform = `translateX(${Math.sin(t * 0.1) * 5}px)`
      this.hillsEl.style.transform = `translateX(${Math.sin(t * 0.15) * 6}px)`
      this.moonEl.style.transform = `translateY(${Math.sin(t * 0.08) * 3}px)`
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
