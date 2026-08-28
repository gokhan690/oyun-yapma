/**
 * Basit ama kararlı daire fiziği (Verlet + pozisyon rahatlatma).
 * Suika tipi yığınlarda titremeyi önlemek için her karede birden çok alt adım
 * çalışır; çarpışmalar kütle ağırlıklı pozisyon düzeltmesiyle çözülür.
 */

import { FRUITS } from './fruits'

export interface Body {
  id: number
  tier: number
  r: number
  x: number
  y: number
  /** Bir önceki alt adımdaki konum — hız buradan türetilir. */
  px: number
  py: number
  /** Görsel dönüş açısı (yuvarlanma hissi). */
  angle: number
  /** Doğduğu andan beri geçen süre (sn) — oyun sonu toleransı için. */
  age: number
  /** Birleşme sonrası "pop" animasyonu ilerlemesi (0→1). */
  pop: number
  /** Bu adımda birleşip yok olacak mı? */
  dead: boolean
}

export interface MergeEvent {
  x: number
  y: number
  /** Yeni oluşan meyvenin tier'ı; MAX_TIER birleşmesinde -1 (ikisi de yok olur). */
  tier: number
  /** Birleşen meyvelerin tier'ı. */
  from: number
}

export const WORLD_W = 440
export const WORLD_H = 660
/** Bu çizginin üstünde dinlenen meyve varsa oyun biter. */
export const DANGER_Y = 108

const SUBSTEPS = 8
const GRAVITY = 0.0062
const AIR_DRAG = 0.9995
const WALL_FRICTION = 0.72
const GROUND_FRICTION = 0.86
const CONTACT_FRICTION = 0.985
const RESTITUTION = 0.12
const SOLVER_ITERATIONS = 4

export class World {
  bodies: Body[] = []
  private nextId = 1

  add(tier: number, x: number, y: number, vx = 0, vy = 0): Body {
    const def = FRUITS[tier]
    const body: Body = {
      id: this.nextId++,
      tier,
      r: def.radius,
      x,
      y,
      px: x - vx,
      py: y - vy,
      angle: 0,
      age: 0,
      pop: 1,
      dead: false,
    }
    this.bodies.push(body)
    return body
  }

  clear(): void {
    this.bodies.length = 0
  }

  /** Bir kare ilerlet; oluşan birleşmeleri döndürür. */
  step(dt: number, maxTier: number): MergeEvent[] {
    const merges: MergeEvent[] = []
    for (const b of this.bodies) {
      b.age += dt
      if (b.pop < 1) b.pop = Math.min(1, b.pop + dt * 6)
    }

    for (let s = 0; s < SUBSTEPS; s++) {
      this.integrate()
      for (let i = 0; i < SOLVER_ITERATIONS; i++) {
        this.solveCollisions(i === 0 ? merges : null, maxTier)
        this.solveWalls()
      }
    }

    if (merges.length > 0) {
      this.bodies = this.bodies.filter((b) => !b.dead)
    }
    return merges
  }

  private integrate(): void {
    for (const b of this.bodies) {
      const vx = (b.x - b.px) * AIR_DRAG
      const vy = (b.y - b.py) * AIR_DRAG
      b.px = b.x
      b.py = b.y
      b.x += vx
      b.y += vy + GRAVITY
      // Yatay hıza göre yuvarlanma efekti
      b.angle += vx / b.r
    }
  }

  private solveCollisions(merges: MergeEvent[] | null, maxTier: number): void {
    const list = this.bodies
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (a.dead) continue
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        if (b.dead) continue
        let dx = b.x - a.x
        let dy = b.y - a.y
        const minDist = a.r + b.r
        let d2 = dx * dx + dy * dy
        if (d2 >= minDist * minDist) continue

        let d = Math.sqrt(d2)
        if (d < 0.0001) {
          // Tam üst üste: rastgele küçük bir yön ver
          dx = (Math.random() - 0.5) * 0.02 + 0.01
          dy = -0.01
          d = Math.hypot(dx, dy)
          d2 = d * d
        }

        if (merges && a.tier === b.tier && a.pop >= 1 && b.pop >= 1) {
          a.dead = true
          b.dead = true
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          merges.push({
            x: mx,
            y: my,
            tier: a.tier >= maxTier ? -1 : a.tier + 1,
            from: a.tier,
          })
          break
        }

        const nx = dx / d
        const ny = dy / d
        const overlap = minDist - d

        const ma = a.r * a.r
        const mb = b.r * b.r
        const total = ma + mb
        const shareA = mb / total
        const shareB = ma / total

        a.x -= nx * overlap * shareA
        a.y -= ny * overlap * shareA
        b.x += nx * overlap * shareB
        b.y += ny * overlap * shareB

        // Temas sürtünmesi: teğet hızları biraz söndür
        this.dampContact(a, nx, ny)
        this.dampContact(b, nx, ny)

        // Hafif sekme
        if (overlap > 0.5) {
          const relN = (b.x - b.px - (a.x - a.px)) * nx + (b.y - b.py - (a.y - a.py)) * ny
          if (relN < 0) {
            const bounce = relN * RESTITUTION
            a.px += nx * bounce * shareA
            a.py += ny * bounce * shareA
            b.px -= nx * bounce * shareB
            b.py -= ny * bounce * shareB
          }
        }
      }
    }
  }

  private dampContact(b: Body, nx: number, ny: number): void {
    const vx = b.x - b.px
    const vy = b.y - b.py
    const vn = vx * nx + vy * ny
    const tx = vx - vn * nx
    const ty = vy - vn * ny
    b.px = b.x - (vn * nx + tx * CONTACT_FRICTION)
    b.py = b.y - (vn * ny + ty * CONTACT_FRICTION)
  }

  private solveWalls(): void {
    for (const b of this.bodies) {
      if (b.dead) continue
      if (b.x < b.r) {
        b.x = b.r
        b.px = b.x + (b.x - b.px) * WALL_FRICTION
      } else if (b.x > WORLD_W - b.r) {
        b.x = WORLD_W - b.r
        b.px = b.x + (b.x - b.px) * WALL_FRICTION
      }
      if (b.y > WORLD_H - b.r) {
        b.y = WORLD_H - b.r
        const vx = (b.x - b.px) * GROUND_FRICTION
        b.py = b.y + (b.y - b.py) * 0.3
        b.px = b.x - vx
      }
      // Tavan yok: meyveler tepeden taşabilir (oyun sonu koşulu bunu ölçer)
      if (b.y < -200) {
        b.y = -200
        b.py = b.y
      }
    }
  }

  /** Gövde neredeyse durmuşsa true. */
  isSettled(b: Body): boolean {
    const vx = b.x - b.px
    const vy = b.y - b.py
    return vx * vx + vy * vy < 0.09
  }

  /** Tehlike çizgisini aşmış ve durulmuş bir meyve var mı? */
  overDangerLine(): boolean {
    for (const b of this.bodies) {
      if (b.age > 1.2 && b.y - b.r < DANGER_Y && this.isSettled(b)) return true
    }
    return false
  }
}
