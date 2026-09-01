/**
 * Daire fiziği — Verlet integrasyonu + pozisyon rahatlatma.
 *
 * Gerçekçilik için üç ek var:
 *  1. Açısal hız: temas noktasındaki kayma sürtünmeye dönüşür, meyveler
 *     birbirinin ve zeminin üstünde gerçekten yuvarlanır.
 *  2. Çarpma olayları: darbe şiddeti dışarı verilir (ses + ezilme için).
 *  3. Boyuta bağlı esneklik: küçük meyveler biraz daha zıplar.
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
  /** Görsel dönüş açısı (rad). */
  angle: number
  /** Açısal hız (rad / alt adım). */
  av: number
  /** Doğduğu andan beri geçen süre (sn). */
  age: number
  /** Birleşme sonrası "pop" animasyonu ilerlemesi (0→1). */
  pop: number
  /** Çarpma anındaki ezilme (0→~0.3), zamanla söner. */
  squash: number
  /** Göz kırpma zamanlayıcısı (sn). */
  blink: number
  /** Nadir "altın meyve" — iki altın birleşince ekstra puan. */
  golden: boolean
  /** Bu adımda birleşip yok olacak mı? */
  dead: boolean
}

export interface MergeEvent {
  x: number
  y: number
  /** Yeni meyvenin devraldığı hız (momentum korunumu). */
  vx: number
  vy: number
  /** Yeni oluşan meyvenin tier'ı; MAX_TIER birleşmesinde -1. */
  tier: number
  /** Birleşen meyvelerin tier'ı. */
  from: number
  /** İki altın meyve mi birleşti? */
  golden: boolean
}

export interface ImpactEvent {
  x: number
  y: number
  /** 0..1 arası darbe şiddeti. */
  strength: number
  tier: number
  /** Zemine mi çarptı, meyveye mi? */
  ground: boolean
}

export interface StepResult {
  merges: MergeEvent[]
  impacts: ImpactEvent[]
}

export const WORLD_W = 440
export const WORLD_H = 660
/** Bu çizginin üstünde dinlenen meyve varsa oyun biter. */
export const DANGER_Y = 108

const SUBSTEPS = 8
const GRAVITY = 0.0062
const AIR_DRAG = 0.9995
const WALL_FRICTION = 0.7
const GROUND_BOUNCE = 0.24
const CONTACT_FRICTION = 0.42
const ANGULAR_DAMPING = 0.994
const MAX_SPIN = 0.22
const SOLVER_ITERATIONS = 4
const IMPACT_THRESHOLD = 1.1
const MAX_IMPACTS = 4

function byTopEdge(a: Body, b: Body): number {
  return a.y - a.r - (b.y - b.r)
}

export class World {
  bodies: Body[] = []
  private nextId = 1
  private impacts: ImpactEvent[] = []

  add(tier: number, x: number, y: number, vx = 0, vy = 0, golden = false): Body {
    const def = FRUITS[tier]
    const body: Body = {
      id: this.nextId++,
      tier,
      r: def.radius,
      x,
      y,
      px: x - vx,
      py: y - vy,
      angle: Math.random() * Math.PI * 2,
      av: 0,
      age: 0,
      pop: 1,
      squash: 0,
      blink: 1.5 + Math.random() * 4,
      golden,
      dead: false,
    }
    this.bodies.push(body)
    return body
  }

  clear(): void {
    this.bodies.length = 0
    this.impacts.length = 0
  }

  /** Bir kare ilerlet; birleşme ve çarpma olaylarını döndürür. */
  step(dt: number, maxTier: number): StepResult {
    const merges: MergeEvent[] = []
    this.impacts.length = 0

    for (const b of this.bodies) {
      b.age += dt
      if (b.pop < 1) b.pop = Math.min(1, b.pop + dt * 6)
      if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 1.6)
      b.blink -= dt
      if (b.blink < -0.12) b.blink = 2 + Math.random() * 5
    }

    for (let s = 0; s < SUBSTEPS; s++) {
      this.integrate()
      // Süpür-ve-ele: üst kenara göre sıralayıp uzak çiftleri hiç yoklamıyoruz
      this.bodies.sort(byTopEdge)
      for (let i = 0; i < SOLVER_ITERATIONS; i++) {
        this.solveCollisions(i === 0 ? merges : null, maxTier)
        this.solveWalls(i === 0)
      }
    }

    if (merges.length > 0) {
      this.bodies = this.bodies.filter((b) => !b.dead)
    }
    return { merges, impacts: this.impacts }
  }

  private integrate(): void {
    for (const b of this.bodies) {
      const vx = (b.x - b.px) * AIR_DRAG
      const vy = (b.y - b.py) * AIR_DRAG
      b.px = b.x
      b.py = b.y
      b.x += vx
      b.y += vy + GRAVITY
      b.av *= ANGULAR_DAMPING
      if (b.av > MAX_SPIN) b.av = MAX_SPIN
      else if (b.av < -MAX_SPIN) b.av = -MAX_SPIN
      b.angle += b.av
    }
  }

  private pushImpact(b: Body, strength: number, ground: boolean): void {
    const s = Math.min(1, strength / 9)
    if (b.squash < s * 0.26) b.squash = s * 0.26
    if (this.impacts.length >= MAX_IMPACTS) return
    if (s < 0.12) return
    this.impacts.push({ x: b.x, y: b.y + b.r * 0.8, strength: s, tier: b.tier, ground })
  }

  private solveCollisions(merges: MergeEvent[] | null, maxTier: number): void {
    const list = this.bodies
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (a.dead) continue
      const reach = a.y + a.r
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        // Sıralı liste: bu gövdenin üstü a'nın altından aşağıdaysa gerisi de öyledir
        if (b.y - b.r > reach) break
        if (b.dead) continue
        let dx = b.x - a.x
        let dy = b.y - a.y
        const minDist = a.r + b.r
        let d2 = dx * dx + dy * dy
        if (d2 >= minDist * minDist) continue

        let d = Math.sqrt(d2)
        if (d < 0.0001) {
          dx = (Math.random() - 0.5) * 0.02 + 0.01
          dy = -0.01
          d = Math.hypot(dx, dy)
          d2 = d * d
        }

        if (merges && a.tier === b.tier && a.pop >= 1 && b.pop >= 1) {
          a.dead = true
          b.dead = true
          const ma = a.r * a.r
          const mb = b.r * b.r
          const total = ma + mb
          merges.push({
            x: (a.x * ma + b.x * mb) / total,
            y: (a.y * ma + b.y * mb) / total,
            // Momentum korunumu: yeni meyve ağırlıklı ortalama hızı devralır
            vx: ((a.x - a.px) * ma + (b.x - b.px) * mb) / total,
            vy: ((a.y - a.py) * ma + (b.y - b.py) * mb) / total,
            tier: a.tier >= maxTier ? -1 : a.tier + 1,
            from: a.tier,
            golden: a.golden && b.golden,
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

        const relN = (b.x - b.px - (a.x - a.px)) * nx + (b.y - b.py - (a.y - a.py)) * ny

        this.friction(a, b, nx, ny, shareA, shareB)

        if (overlap > 0.4 && relN < 0) {
          if (relN < -IMPACT_THRESHOLD) {
            this.pushImpact(a.r >= b.r ? a : b, -relN, false)
          }
          // Küçük meyveler biraz daha zıplasın
          const restitution = 0.1 + 0.12 * (1 - Math.min(a.tier, b.tier) / 10)
          const bounce = relN * restitution
          a.px += nx * bounce * shareA
          a.py += ny * bounce * shareA
          b.px -= nx * bounce * shareB
          b.py -= ny * bounce * shareB
        }
      }
    }
  }

  /**
   * Temas sürtünmesi: yüzeylerin birbirine göre kayması hem teğet hızı
   * söndürür hem de dönmeye (yuvarlanmaya) dönüşür.
   */
  private friction(a: Body, b: Body, nx: number, ny: number, shareA: number, shareB: number): void {
    const tx = -ny
    const ty = nx
    const vaT = (a.x - a.px) * tx + (a.y - a.py) * ty
    const vbT = (b.x - b.px) * tx + (b.y - b.py) * ty
    // Temas noktasındaki yüzey hızları (dönme dahil)
    const surfaceA = vaT + a.av * a.r
    const surfaceB = vbT - b.av * b.r
    const slip = surfaceB - surfaceA
    if (Math.abs(slip) < 0.0005) return

    const j = slip * CONTACT_FRICTION * 0.5
    a.px -= tx * j * shareA
    a.py -= ty * j * shareA
    b.px += tx * j * shareB
    b.py += ty * j * shareB
    // Kayma dönmeye dönüşür (küre için etkin kol ~ 2/5 m r²)
    a.av += (j * 1.6) / a.r
    b.av += (j * 1.6) / b.r
  }

  private solveWalls(reportImpacts: boolean): void {
    for (const b of this.bodies) {
      if (b.dead) continue

      if (b.x < b.r) {
        const vx = b.x - b.px
        b.x = b.r
        b.px = b.x + vx * WALL_FRICTION
        b.av += (b.y - b.py) * 0.5 / b.r
      } else if (b.x > WORLD_W - b.r) {
        const vx = b.x - b.px
        b.x = WORLD_W - b.r
        b.px = b.x + vx * WALL_FRICTION
        b.av -= (b.y - b.py) * 0.5 / b.r
      }

      if (b.y > WORLD_H - b.r) {
        const vy = b.y - b.py
        if (reportImpacts && vy > IMPACT_THRESHOLD) this.pushImpact(b, vy, true)
        b.y = WORLD_H - b.r
        b.py = b.y + vy * GROUND_BOUNCE
        // Zeminde kayma → yuvarlanma
        const vx = b.x - b.px
        const slip = vx - b.av * b.r
        const j = slip * CONTACT_FRICTION
        b.px += j
        b.av += (j * 1.6) / b.r
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

  /** Tehlike çizgisine en çok yaklaşan meyvenin çizgiye uzaklığı (0 = çizgide). */
  dangerProximity(): number {
    let best = Infinity
    for (const b of this.bodies) {
      if (b.age < 0.8) continue
      best = Math.min(best, b.y - b.r - DANGER_Y)
    }
    return best
  }

  /** Tehlike çizgisini aşmış ve durulmuş bir meyve var mı? */
  overDangerLine(): boolean {
    for (const b of this.bodies) {
      if (b.age > 1.2 && b.y - b.r < DANGER_Y && this.isSettled(b)) return true
    }
    return false
  }

  /** Verilen noktadaki (dünya koordinatı) meyveyi bulur — bomba için. */
  pick(x: number, y: number): Body | null {
    let best: Body | null = null
    let bestD = Infinity
    for (const b of this.bodies) {
      const d = Math.hypot(b.x - x, b.y - y)
      if (d <= b.r && d < bestD) {
        best = b
        bestD = d
      }
    }
    return best
  }

  /** Patlama: yarıçap içindeki gövdeleri dışa doğru iter (mega karpuz). */
  explode(x: number, y: number, radius: number, power: number): void {
    for (const b of this.bodies) {
      const dx = b.x - x
      const dy = b.y - y
      const d = Math.hypot(dx, dy)
      if (d > radius || d < 0.001) continue
      const falloff = 1 - d / radius
      const push = (power * falloff * 900) / (b.r * b.r)
      b.px -= (dx / d) * push
      b.py -= (dy / d) * push
      b.av += (Math.random() - 0.5) * 0.1
      b.squash = Math.max(b.squash, 0.18 * falloff)
    }
  }

  /** Kutuyu salla: her gövdeye küçük rastgele itme (sıkışmayı bozar). */
  jolt(power: number): void {
    for (const b of this.bodies) {
      b.px -= (Math.random() - 0.5) * power
      b.py -= Math.random() * power * 0.6
      b.av += (Math.random() - 0.5) * 0.06
    }
  }

  remove(body: Body): void {
    const i = this.bodies.indexOf(body)
    if (i >= 0) this.bodies.splice(i, 1)
  }
}
