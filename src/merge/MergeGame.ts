/**
 * Meyve Birleştir — Suika tipi düşür & birleştir oyunu.
 * Reklam yok, satın alma yok, internet yok: her şey yerelde çalışır.
 */

import { FRUITS, MAX_TIER, SPAWNABLE_TIERS, mergeScore } from './fruits'
import { DANGER_Y, WORLD_H, WORLD_W, World } from './physics'
import type { Body } from './physics'
import { drawContactShadow, drawFruit, setSpriteScale } from './render'
import { Sfx } from './audio'
import { storageGet, storageRemove, storageSet } from './storage'

const SAVE_KEY = 'fm_save_v2'
const BEST_KEY = 'fm_best'
const STATS_KEY = 'fm_stats'
const DROP_Y = 54
const DROP_COOLDOWN = 0.34
const DANGER_LIMIT = 2.2
const COMBO_WINDOW = 1.1

// Yardımcılar (eklentiler)
const BOMB_START = 1
const BOMB_EVERY = 1500
const BOMB_MAX = 3
const SWAP_START = 3
const SWAP_EVERY = 2000
const SWAP_MAX = 5

type State = 'ready' | 'playing' | 'over'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  r: number
  color: string
}

interface Ring {
  x: number
  y: number
  r: number
  life: number
  color: string
}

interface Popup {
  x: number
  y: number
  life: number
  maxLife: number
  text: string
  size: number
}

interface SaveData {
  score: number
  current: number
  next: number
  zen: boolean
  bomb: number
  swap: number
  bodies: { t: number; x: number; y: number }[]
}

export interface Stats {
  games: number
  merges: number
}

export interface Powerups {
  bomb: number
  swap: number
  armed: boolean
}

export interface GameCallbacks {
  onScore: (score: number, best: number) => void
  onNext: (tier: number) => void
  onBiggest: (tier: number) => void
  onCombo: (count: number) => void
  onPowerups: (p: Powerups) => void
  onGameOver: (result: { score: number; best: number; isRecord: boolean; biggest: number }) => void
}

export class MergeGame {
  private world = new World()
  private ctx: CanvasRenderingContext2D
  private sfx = new Sfx()
  private canvas: HTMLCanvasElement
  private cb: GameCallbacks

  private score = 0
  private best = Number(storageGet(BEST_KEY) ?? 0)
  private biggest = 0
  private current = 0
  private next = 0
  private aimX = WORLD_W / 2
  private cooldown = 0
  private dangerTime = 0
  private shake = 0
  private flashScreen = 0
  private state: State = 'ready'
  private raf = 0
  private last = 0
  private acc = 0
  private time = 0
  private saveTimer = 0
  private comboCount = 0
  private comboTimer = 0
  private particles: Particle[] = []
  private rings: Ring[] = []
  private popups: Popup[] = []
  private pointerActive = false
  private bgCanvas: HTMLCanvasElement | null = null

  // Eklentiler
  private zen = false
  private bomb = BOMB_START
  private swapLeft = SWAP_START
  private bombArmed = false
  private bombPulse = 0
  private nextBombAt = BOMB_EVERY
  private nextSwapAt = SWAP_EVERY
  private stats: Stats = { games: 0, merges: 0 }

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas
    this.cb = cb
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D desteklenmiyor')
    this.ctx = ctx
    this.loadStats()
    this.bindInput()
    window.addEventListener('resize', this.resize)
    const host = canvas.parentElement
    if (typeof ResizeObserver !== 'undefined' && host) {
      new ResizeObserver(() => this.resize()).observe(host)
    }
    window.addEventListener('pagehide', this.save)
    this.resize()
  }

  // ---------------------------------------------------------------- yaşam döngüsü

  /** Kayıt varsa yükler, tahtayı çizer ama oyunu başlatmaz. */
  boot(): boolean {
    const restored = this.restore()
    if (!restored) this.newRound()
    this.emitAll()
    this.draw()
    return restored
  }

  play(): void {
    if (this.state === 'over') return
    this.state = 'playing'
    this.last = performance.now()
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(this.frame)
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.state = 'ready'
    cancelAnimationFrame(this.raf)
    this.save()
  }

  reset(): void {
    this.newRound()
    this.emitAll()
    this.play()
  }

  private newRound(): void {
    this.world.clear()
    this.particles.length = 0
    this.rings.length = 0
    this.popups.length = 0
    this.score = 0
    this.biggest = 0
    this.dangerTime = 0
    this.cooldown = 0
    this.comboCount = 0
    this.comboTimer = 0
    this.bomb = BOMB_START
    this.swapLeft = SWAP_START
    this.bombArmed = false
    this.nextBombAt = BOMB_EVERY
    this.nextSwapAt = SWAP_EVERY
    this.state = 'ready'
    this.current = randomTier()
    this.next = randomTier()
    this.aimX = WORLD_W / 2
    storageRemove(SAVE_KEY)
  }

  private emitAll(): void {
    this.cb.onScore(this.score, Math.max(this.best, this.score))
    this.cb.onNext(this.next)
    this.cb.onBiggest(this.biggest)
    this.emitPowerups()
  }

  private emitPowerups(): void {
    this.cb.onPowerups({ bomb: this.bomb, swap: this.swapLeft, armed: this.bombArmed })
  }

  toggleSound(): boolean {
    return this.sfx.toggle()
  }

  get soundOn(): boolean {
    return this.sfx.enabled
  }

  get isOver(): boolean {
    return this.state === 'over'
  }

  get isPlaying(): boolean {
    return this.state === 'playing'
  }

  get isZen(): boolean {
    return this.zen
  }

  setZen(on: boolean): void {
    this.zen = on
    if (on) this.dangerTime = 0
  }

  getStats(): Stats {
    return { ...this.stats }
  }

  // ---------------------------------------------------------------- eklentiler

  /** Bombayı kur / iptal et. Kuruluyken bir meyveye dokunmak onu patlatır. */
  armBomb(): void {
    if (this.state !== 'playing' || this.bomb <= 0) return
    this.bombArmed = !this.bombArmed
    this.emitPowerups()
  }

  /** Eldeki meyveyle sıradakini takas et. */
  useSwap(): void {
    if (this.state !== 'playing' || this.swapLeft <= 0 || this.current === this.next) return
    this.swapLeft--
    const tmp = this.current
    this.current = this.next
    this.next = tmp
    this.setAim(this.aimX)
    this.sfx.swap()
    this.cb.onNext(this.next)
    this.emitPowerups()
  }

  private grantPowerups(): void {
    while (this.score >= this.nextBombAt) {
      this.nextBombAt += BOMB_EVERY
      if (this.bomb < BOMB_MAX) {
        this.bomb++
        this.popups.push({ x: WORLD_W / 2, y: 150, life: 1.1, maxLife: 1.1, text: '💣 +1', size: 26 })
      }
    }
    while (this.score >= this.nextSwapAt) {
      this.nextSwapAt += SWAP_EVERY
      if (this.swapLeft < SWAP_MAX) {
        this.swapLeft++
        this.popups.push({ x: WORLD_W / 2, y: 180, life: 1.1, maxLife: 1.1, text: '🔄 +1', size: 26 })
      }
    }
    this.emitPowerups()
  }

  private detonate(x: number, y: number): boolean {
    const target = this.world.pick(x, y)
    if (!target) return false
    this.world.remove(target)
    this.bomb--
    this.bombArmed = false
    this.sfx.boom()
    this.splash(target.x, target.y, FRUITS[target.tier].color, 26)
    this.rings.push({ x: target.x, y: target.y, r: target.r * 0.6, life: 1.1, color: '#ffd08a' })
    this.shake = 0.7
    vibrate(30)
    this.emitPowerups()
    return true
  }

  // ---------------------------------------------------------------- giriş

  private bindInput(): void {
    const c = this.canvas
    c.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      if (this.bombArmed) {
        const p = this.toWorld(e)
        if (!this.detonate(p.x, p.y)) {
          this.bombArmed = false
          this.emitPowerups()
        }
        return
      }
      this.pointerActive = true
      c.setPointerCapture(e.pointerId)
      this.aimAt(e)
    })
    c.addEventListener('pointermove', (e) => {
      if (this.state !== 'playing' || this.bombArmed) return
      if (this.pointerActive || e.pointerType === 'mouse') this.aimAt(e)
    })
    c.addEventListener('pointerup', (e) => {
      if (this.state !== 'playing' || this.bombArmed) return
      if (this.pointerActive) {
        this.aimAt(e)
        this.drop()
      }
      this.pointerActive = false
    })
    c.addEventListener('pointercancel', () => {
      this.pointerActive = false
    })
    c.addEventListener('contextmenu', (e) => e.preventDefault())

    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return
      if (e.key === 'ArrowLeft') this.setAim(this.aimX - 18)
      else if (e.key === 'ArrowRight') this.setAim(this.aimX + 18)
      else if (e.key === 's' || e.key === 'S') this.useSwap()
      else if (e.key === 'b' || e.key === 'B') this.armBomb()
      else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        this.drop()
      }
    })
  }

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const scale = rect.width / WORLD_W
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  private aimAt(e: PointerEvent): void {
    this.setAim(this.toWorld(e).x)
  }

  private setAim(x: number): void {
    const r = FRUITS[this.current].radius
    this.aimX = Math.max(r + 2, Math.min(WORLD_W - r - 2, x))
  }

  private drop(): void {
    if (this.state !== 'playing' || this.cooldown > 0 || this.bombArmed) return
    const jitter = (Math.random() - 0.5) * 1.6
    const body = this.world.add(this.current, this.aimX + jitter, DROP_Y, (Math.random() - 0.5) * 0.06, 0.6)
    body.av = (Math.random() - 0.5) * 0.02
    this.sfx.drop()
    vibrate(8)
    this.cooldown = DROP_COOLDOWN
    this.current = this.next
    this.next = randomTier()
    this.setAim(this.aimX)
    this.cb.onNext(this.next)
  }

  // ---------------------------------------------------------------- döngü

  private frame = (now: number): void => {
    if (this.state !== 'playing') return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.acc += dt

    const STEP = 1 / 60
    let guard = 0
    while (this.acc >= STEP && guard++ < 5) {
      this.update(STEP)
      this.acc -= STEP
      if (this.state !== 'playing') break
    }
    this.draw()
    if (this.state === 'playing') this.raf = requestAnimationFrame(this.frame)
  }

  private update(dt: number): void {
    this.time += dt
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3)
    if (this.flashScreen > 0) this.flashScreen = Math.max(0, this.flashScreen - dt * 2.5)
    this.bombPulse = (this.bombPulse + dt * 4) % (Math.PI * 2)

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      if (this.comboTimer <= 0 && this.comboCount > 0) {
        this.comboCount = 0
        this.cb.onCombo(0)
      }
    }

    const { merges, impacts } = this.world.step(dt, MAX_TIER)

    for (const hit of impacts) {
      this.sfx.impact(hit.strength, hit.tier, hit.ground)
      if (hit.ground && hit.strength > 0.35) {
        // Yere sert inişte toz
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: hit.x + (Math.random() - 0.5) * 20,
            y: WORLD_H - 4,
            vx: (Math.random() - 0.5) * 120,
            vy: -20 - Math.random() * 40,
            life: 0.3 + Math.random() * 0.25,
            maxLife: 0.55,
            r: 1.5 + Math.random() * 2.5,
            color: 'rgba(190,140,80,0.75)',
          })
        }
      }
    }

    for (const m of merges) {
      this.comboCount++
      this.comboTimer = COMBO_WINDOW
      const multiplier = Math.min(5, Math.max(1, this.comboCount))
      if (multiplier > 1) this.cb.onCombo(multiplier)
      this.stats.merges++

      if (m.tier >= 0) {
        const body = this.world.add(m.tier, m.x, m.y, m.vx, m.vy)
        body.pop = 0
        const gained = mergeScore(m.tier) * multiplier
        this.score += gained
        this.sfx.merge(m.tier, this.comboCount)
        this.splash(m.x, m.y, FRUITS[m.tier].color, 8 + m.tier * 2)
        this.rings.push({ x: m.x, y: m.y, r: FRUITS[m.tier].radius * 0.7, life: 1, color: FRUITS[m.tier].light })
        this.popups.push({
          x: m.x,
          y: m.y,
          life: 0.9,
          maxLife: 0.9,
          text: multiplier > 1 ? `+${gained} ×${multiplier}` : `+${gained}`,
          size: m.tier >= 6 ? 32 : 24,
        })
        vibrate(m.tier >= 6 ? 24 : 12)
        if (m.tier >= 6) this.shake = Math.min(1, 0.25 + m.tier * 0.05)
        if (m.tier > this.biggest) {
          this.biggest = m.tier
          this.cb.onBiggest(m.tier)
          if (m.tier >= 6) this.flashScreen = 0.5
        }
      } else {
        const bonus = mergeScore(MAX_TIER) * 2 * multiplier
        this.score += bonus
        this.sfx.watermelon()
        this.splash(m.x, m.y, FRUITS[MAX_TIER].color, 44)
        this.rings.push({ x: m.x, y: m.y, r: 40, life: 1.4, color: '#ffe9a8' })
        this.popups.push({ x: m.x, y: m.y, life: 1.4, maxLife: 1.4, text: `KARPUZ! +${bonus}`, size: 34 })
        this.shake = 1
        this.flashScreen = 1
        vibrate([20, 40, 20])
      }
      this.cb.onScore(this.score, Math.max(this.best, this.score))
    }
    if (merges.length > 0) this.grantPowerups()

    for (const p of this.particles) {
      p.vy += 900 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    if (this.particles.length > 0) this.particles = this.particles.filter((p) => p.life > 0)

    for (const r of this.rings) {
      r.life -= dt * 1.9
      r.r += dt * 320
    }
    if (this.rings.length > 0) this.rings = this.rings.filter((r) => r.life > 0)

    for (const p of this.popups) p.life -= dt
    if (this.popups.length > 0) this.popups = this.popups.filter((p) => p.life > 0)

    if (!this.zen) {
      if (this.world.overDangerLine()) this.dangerTime += dt
      else this.dangerTime = Math.max(0, this.dangerTime - dt * 2)
      if (this.dangerTime >= DANGER_LIMIT) {
        this.endGame()
        return
      }
    }

    this.saveTimer += dt
    if (this.saveTimer > 3) {
      this.saveTimer = 0
      this.save()
      this.saveStats()
    }
  }

  private endGame(): void {
    this.state = 'over'
    cancelAnimationFrame(this.raf)
    this.sfx.gameOver()
    const isRecord = !this.zen && this.score > this.best
    if (isRecord) {
      this.best = this.score
      storageSet(BEST_KEY, String(this.best))
    }
    this.stats.games++
    this.saveStats()
    storageRemove(SAVE_KEY)
    this.shake = 0.8
    this.draw()
    this.cb.onGameOver({ score: this.score, best: this.best, isRecord, biggest: this.biggest })
  }

  private splash(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 70 + Math.random() * 240
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        r: 2 + Math.random() * 5,
        color,
      })
    }
  }

  // ---------------------------------------------------------------- çizim

  private resize = (): void => {
    const host = this.canvas.parentElement
    const availW = host?.clientWidth || WORLD_W
    const availH = host?.clientHeight || WORLD_H
    const fit = Math.min(availW / WORLD_W, availH / WORLD_H)
    const cssW = Math.max(120, Math.floor(WORLD_W * fit))
    const cssH = Math.floor(WORLD_H * fit)
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    host?.style.setProperty('--board-w', `${cssW}px`)
    host?.style.setProperty('--board-h', `${cssH}px`)

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round(cssH * dpr)
    const scale = (cssW / WORLD_W) * dpr
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0)
    setSpriteScale(scale)
    this.buildBackground(scale)
    if (this.state !== 'playing') this.draw()
  }

  private draw(): void {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) {
      const s = this.shake * 7
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
    }

    this.drawBoard(ctx)

    // Gölgeler önce: meyveler birbirinin üstüne düzgün otursun
    for (const b of this.world.bodies) {
      drawContactShadow(ctx, b.x, b.y, b.r * (0.55 + 0.45 * b.pop), WORLD_H)
    }

    const look = { x: 0, y: 0 }
    for (const b of this.world.bodies) {
      const scale = 0.55 + 0.45 * easeOutBack(b.pop)
      const r = b.r * scale
      const dx = this.aimX - b.x
      const dy = DROP_Y - b.y
      const d = Math.hypot(dx, dy) || 1
      look.x = dx / d
      look.y = dy / d

      // Hızlı düşerken hafif uzama, çarpınca ezilme
      const vy = b.y - b.py
      const stretch = vy > 2.4 ? -Math.min(0.12, (vy - 2.4) * 0.02) : 0

      drawFruit(ctx, FRUITS[b.tier], b.x, b.y, r, {
        angle: b.angle,
        squash: b.squash > 0 ? b.squash : stretch,
        look,
        flash: b.pop < 1 ? (1 - b.pop) * 0.8 : 0,
        blink: b.blink < 0 && b.pop >= 1,
      })

      // Bomba kuruluyken hedeflenebilir meyveler işaretlensin
      if (this.bombArmed) {
        ctx.save()
        ctx.globalAlpha = 0.35 + Math.sin(this.bombPulse) * 0.2
        ctx.strokeStyle = '#ff5a4a'
        ctx.lineWidth = 3
        ctx.setLineDash([7, 7])
        ctx.beginPath()
        ctx.arc(b.x, b.y, r + 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }

    for (const ring of this.rings) {
      ctx.globalAlpha = Math.max(0, ring.life) * 0.5
      ctx.strokeStyle = ring.color
      ctx.lineWidth = 6 * Math.max(0.2, ring.life)
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    if (this.state !== 'over' && !this.bombArmed) {
      const def = FRUITS[this.current]
      const beam = ctx.createLinearGradient(0, DROP_Y, 0, WORLD_H)
      beam.addColorStop(0, 'rgba(255,255,255,0.42)')
      beam.addColorStop(0.75, 'rgba(255,255,255,0.06)')
      beam.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = beam
      ctx.fillRect(this.aimX - def.radius * 0.18, DROP_Y, def.radius * 0.36, WORLD_H - DROP_Y)

      const bob = Math.sin(this.time * 4) * 2
      ctx.globalAlpha = this.cooldown > 0 ? 0.3 : 1
      drawFruit(ctx, def, this.aimX, DROP_Y + bob, def.radius, { look: { x: 0, y: 1 } })
      ctx.globalAlpha = 1
    }

    if (this.bombArmed) {
      ctx.fillStyle = 'rgba(226,60,60,0.14)'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      ctx.textAlign = 'center'
      ctx.font = '800 21px system-ui, sans-serif'
      ctx.fillStyle = '#7d2020'
      ctx.fillText('💣 Patlatmak için bir meyveye dokun', WORLD_W / 2, DROP_Y + 6)
    }

    ctx.textAlign = 'center'
    for (const p of this.popups) {
      const t = 1 - p.life / p.maxLife
      ctx.globalAlpha = Math.min(1, p.life * 2.5)
      ctx.font = `800 ${p.size}px system-ui, sans-serif`
      ctx.strokeStyle = 'rgba(110,55,10,0.9)'
      ctx.lineWidth = 6
      ctx.lineJoin = 'round'
      ctx.strokeText(p.text, p.x, p.y - t * 52)
      ctx.fillStyle = '#fffdf4'
      ctx.fillText(p.text, p.x, p.y - t * 52)
    }
    ctx.globalAlpha = 1

    if (this.flashScreen > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashScreen * 0.28})`
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
    }
    if (this.state === 'over') {
      ctx.fillStyle = 'rgba(28,16,6,0.5)'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
    }
    ctx.restore()
  }

  /** Değişmeyen tahta zemini bir kez çizilip saklanır (her karede yeniden değil). */
  private buildBackground(scale: number): void {
    const canvas = this.bgCanvas ?? document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(WORLD_W * scale))
    canvas.height = Math.max(1, Math.round(WORLD_H * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    this.paintStaticBoard(ctx)
    this.bgCanvas = canvas
  }

  private paintStaticBoard(ctx: CanvasRenderingContext2D): void {
    const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H)
    bg.addColorStop(0, '#fffaf0')
    bg.addColorStop(0.55, '#fff3dc')
    bg.addColorStop(1, '#ffe4bd')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, WORLD_W, WORLD_H)

    ctx.fillStyle = 'rgba(190,140,80,0.07)'
    for (let y = 30; y < WORLD_H; y += 44) {
      for (let x = 24; x < WORLD_W; x += 44) {
        ctx.beginPath()
        ctx.arc(x + (y % 88 === 30 ? 0 : 22), y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Kap zemini ve iç gölgeler
    const floor = ctx.createLinearGradient(0, WORLD_H - 40, 0, WORLD_H)
    floor.addColorStop(0, 'rgba(150,95,40,0)')
    floor.addColorStop(1, 'rgba(150,95,40,0.16)')
    ctx.fillStyle = floor
    ctx.fillRect(0, WORLD_H - 40, WORLD_W, 40)

    const vig = ctx.createRadialGradient(WORLD_W / 2, WORLD_H * 0.45, WORLD_W * 0.3, WORLD_W / 2, WORLD_H * 0.5, WORLD_W * 0.95)
    vig.addColorStop(0, 'rgba(120,70,20,0)')
    vig.addColorStop(1, 'rgba(120,70,20,0.18)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, WORLD_W, WORLD_H)

    ctx.strokeStyle = 'rgba(150,95,40,0.5)'
    ctx.lineWidth = 5
    ctx.strokeRect(2.5, 2.5, WORLD_W - 5, WORLD_H - 5)
  }

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(-30, -30, WORLD_W + 60, WORLD_H + 60)
    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0, WORLD_W, WORLD_H)

    if (this.zen) {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#b58a55'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('ZEN — tehlike çizgisi yok', WORLD_W / 2, 26)
      ctx.globalAlpha = 1
    } else {
      const proximity = this.world.dangerProximity()
      const near = proximity < 150 ? Math.min(1, (150 - proximity) / 150) : 0
      const danger = Math.min(1, this.dangerTime / DANGER_LIMIT)
      const alpha = 0.18 + near * 0.4 + danger * 0.42
      ctx.save()
      ctx.setLineDash([14, 12])
      ctx.lineDashOffset = -this.time * 26
      ctx.lineWidth = 3
      ctx.strokeStyle = danger > 0.02 ? `rgba(226,60,60,${alpha})` : `rgba(196,120,50,${alpha})`
      ctx.beginPath()
      ctx.moveTo(0, DANGER_Y)
      ctx.lineTo(WORLD_W, DANGER_Y)
      ctx.stroke()
      ctx.restore()

      if (danger > 0.25) {
        ctx.globalAlpha = 0.35 + Math.sin(this.time * 12) * 0.25 * danger
        ctx.fillStyle = '#e23c3c'
        ctx.font = '800 20px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('DİKKAT!', WORLD_W / 2, DANGER_Y - 14)
        ctx.globalAlpha = 1
      }

      if (danger > 0.01) {
        const barW = WORLD_W - 40
        ctx.fillStyle = 'rgba(150,95,40,0.16)'
        roundRect(ctx, 20, 16, barW, 6, 3)
        ctx.fill()
        const grd = ctx.createLinearGradient(20, 0, 20 + barW, 0)
        grd.addColorStop(0, '#f4a62c')
        grd.addColorStop(1, '#e23c3c')
        ctx.fillStyle = grd
        roundRect(ctx, 20, 16, Math.max(6, barW * danger), 6, 3)
        ctx.fill()
      }
    }
  }

  // ---------------------------------------------------------------- kayıt

  private save = (): void => {
    if (this.state === 'over' || this.world.bodies.length === 0) return
    const data: SaveData = {
      score: this.score,
      current: this.current,
      next: this.next,
      zen: this.zen,
      bomb: this.bomb,
      swap: this.swapLeft,
      bodies: this.world.bodies.map((b: Body) => ({ t: b.tier, x: Math.round(b.x), y: Math.round(b.y) })),
    }
    storageSet(SAVE_KEY, JSON.stringify(data))
  }

  private restore(): boolean {
    const raw = storageGet(SAVE_KEY)
    if (!raw) return false
    try {
      const data = JSON.parse(raw) as SaveData
      if (!Array.isArray(data.bodies) || data.bodies.length === 0) return false
      this.world.clear()
      this.biggest = 0
      for (const b of data.bodies) {
        if (typeof b.t !== 'number' || b.t < 0 || b.t > MAX_TIER) continue
        this.world.add(b.t, b.x, b.y)
        if (b.t > this.biggest) this.biggest = b.t
      }
      this.score = Number(data.score) || 0
      this.current = clampTier(data.current)
      this.next = clampTier(data.next)
      this.zen = data.zen === true
      this.bomb = clampCount(data.bomb, BOMB_START, BOMB_MAX)
      this.swapLeft = clampCount(data.swap, SWAP_START, SWAP_MAX)
      this.nextBombAt = (Math.floor(this.score / BOMB_EVERY) + 1) * BOMB_EVERY
      this.nextSwapAt = (Math.floor(this.score / SWAP_EVERY) + 1) * SWAP_EVERY
      this.state = 'ready'
      return true
    } catch {
      return false
    }
  }

  private loadStats(): void {
    try {
      const raw = storageGet(STATS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Stats
      this.stats = {
        games: Number(parsed.games) || 0,
        merges: Number(parsed.merges) || 0,
      }
    } catch {
      /* bozuk kayıt — sıfırdan başla */
    }
  }

  private saveStats(): void {
    storageSet(STATS_KEY, JSON.stringify(this.stats))
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function randomTier(): number {
  return Math.floor(Math.random() * SPAWNABLE_TIERS)
}

function clampTier(t: number): number {
  return Number.isFinite(t) ? Math.max(0, Math.min(SPAWNABLE_TIERS - 1, Math.floor(t))) : 0
}

function clampCount(v: number, fallback: number, max: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : fallback
}

function easeOutBack(t: number): number {
  const c = 1.9
  const p = t - 1
  return 1 + (c + 1) * p * p * p + c * p * p
}

function vibrate(pattern: number | number[]): void {
  // Sadece dokunmatik cihazlarda: masaüstünde tarayıcı uyarı basıyor.
  if (typeof navigator === 'undefined' || (navigator.maxTouchPoints ?? 0) === 0) return
  if (typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* bazı tarayıcılar engelliyor */
    }
  }
}
