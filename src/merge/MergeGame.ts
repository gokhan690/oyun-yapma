/**
 * Meyve Birleştir — Suika tipi düşür & birleştir oyunu.
 * Reklam yok, satın alma yok, internet yok: her şey yerelde çalışır.
 */

import { FRUITS, MAX_TIER, SPAWNABLE_TIERS, mergeScore } from './fruits'
import { DANGER_Y, WORLD_H, WORLD_W, World } from './physics'
import type { Body } from './physics'
import { drawFruit } from './render'
import { Sfx } from './audio'

const SAVE_KEY = 'fm_save_v1'
const BEST_KEY = 'fm_best'
const DROP_Y = 54
const DROP_COOLDOWN = 0.36
const DANGER_LIMIT = 2.2

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

interface Popup {
  x: number
  y: number
  life: number
  text: string
  big: boolean
}

interface SaveData {
  score: number
  current: number
  next: number
  bodies: { t: number; x: number; y: number }[]
}

export interface GameCallbacks {
  onScore: (score: number, best: number) => void
  onNext: (tier: number) => void
  onCurrent: (tier: number) => void
  onGameOver: (score: number, best: number, isRecord: boolean) => void
  onDanger: (ratio: number) => void
  onUnlock: (tier: number) => void
}

export class MergeGame {
  private world = new World()
  private ctx: CanvasRenderingContext2D
  private sfx = new Sfx()

  private score = 0
  private best = Number(localStorage.getItem(BEST_KEY) ?? 0)
  private current = 0
  private next = 0
  private aimX = WORLD_W / 2
  private cooldown = 0
  private dangerTime = 0
  private shake = 0
  private running = false
  private over = false
  private raf = 0
  private last = 0
  private acc = 0
  private saveTimer = 0
  private particles: Particle[] = []
  private popups: Popup[] = []
  private seen = new Set<number>()
  private scale = 1

  private canvas: HTMLCanvasElement
  private cb: GameCallbacks

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas
    this.cb = cb
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D desteklenmiyor')
    this.ctx = ctx
    this.bindInput()
    window.addEventListener('resize', this.resize)
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.resize()).observe(canvas)
    }
    window.addEventListener('pagehide', this.save)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save()
    })
    this.resize()
  }

  // ---------------------------------------------------------------- yaşam döngüsü

  start(): void {
    if (!this.restore()) this.reset(false)
    this.cb.onScore(this.score, this.best)
    this.cb.onCurrent(this.current)
    this.cb.onNext(this.next)
    this.resume()
  }

  reset(autostart = true): void {
    this.world.clear()
    this.particles.length = 0
    this.popups.length = 0
    this.score = 0
    this.dangerTime = 0
    this.cooldown = 0
    this.over = false
    this.seen.clear()
    this.current = randomTier()
    this.next = randomTier()
    this.aimX = WORLD_W / 2
    localStorage.removeItem(SAVE_KEY)
    this.cb.onScore(this.score, this.best)
    this.cb.onCurrent(this.current)
    this.cb.onNext(this.next)
    this.cb.onDanger(0)
    if (autostart) this.resume()
  }

  resume(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  pause(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.save()
  }

  toggleSound(): boolean {
    return this.sfx.toggle()
  }

  get soundOn(): boolean {
    return this.sfx.enabled
  }

  get isOver(): boolean {
    return this.over
  }

  // ---------------------------------------------------------------- giriş

  private pointerActive = false

  private bindInput(): void {
    const c = this.canvas
    c.addEventListener('pointerdown', (e) => {
      if (this.over) return
      this.pointerActive = true
      c.setPointerCapture(e.pointerId)
      this.aimAt(e)
    })
    c.addEventListener('pointermove', (e) => {
      if (this.over) return
      if (this.pointerActive || e.pointerType === 'mouse') this.aimAt(e)
    })
    c.addEventListener('pointerup', (e) => {
      if (this.over) return
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
      if (this.over) return
      if (e.key === 'ArrowLeft') this.moveAim(-18)
      else if (e.key === 'ArrowRight') this.moveAim(18)
      else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        this.drop()
      }
    })
  }

  private aimAt(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (rect.width / WORLD_W)
    this.setAim(x)
  }

  private moveAim(dx: number): void {
    this.setAim(this.aimX + dx)
  }

  private setAim(x: number): void {
    const r = FRUITS[this.current].radius
    this.aimX = Math.max(r + 2, Math.min(WORLD_W - r - 2, x))
  }

  private drop(): void {
    if (this.over || this.cooldown > 0) return
    const jitter = (Math.random() - 0.5) * 1.6
    this.world.add(this.current, this.aimX + jitter, DROP_Y, (Math.random() - 0.5) * 0.06, 0.6)
    this.sfx.drop()
    vibrate(8)
    this.cooldown = DROP_COOLDOWN
    this.current = this.next
    this.next = randomTier()
    this.setAim(this.aimX)
    this.cb.onCurrent(this.current)
    this.cb.onNext(this.next)
  }

  // ---------------------------------------------------------------- döngü

  private frame = (now: number): void => {
    if (!this.running) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.acc += dt

    const STEP = 1 / 60
    let guard = 0
    while (this.acc >= STEP && guard++ < 5) {
      this.update(STEP)
      this.acc -= STEP
    }
    this.draw()
    this.raf = requestAnimationFrame(this.frame)
  }

  private update(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3)

    const merges = this.world.step(dt, MAX_TIER)
    for (const m of merges) {
      if (m.tier >= 0) {
        const body = this.world.add(m.tier, m.x, m.y)
        body.pop = 0
        this.score += mergeScore(m.tier)
        this.sfx.merge(m.tier)
        this.burst(m.x, m.y, FRUITS[m.tier].color, 10 + m.tier)
        this.popups.push({ x: m.x, y: m.y, life: 1, text: `+${mergeScore(m.tier)}`, big: m.tier >= 7 })
        vibrate(m.tier >= 6 ? 24 : 12)
        if (m.tier >= 6) this.shake = Math.min(1, 0.3 + m.tier * 0.05)
        if (!this.seen.has(m.tier)) {
          this.seen.add(m.tier)
          this.cb.onUnlock(m.tier)
        }
      } else {
        // İki karpuz birleşti: ikisi de patlar
        const bonus = mergeScore(MAX_TIER) * 2
        this.score += bonus
        this.sfx.watermelon()
        this.burst(m.x, m.y, FRUITS[MAX_TIER].color, 40)
        this.popups.push({ x: m.x, y: m.y, life: 1.4, text: `KARPUZ! +${bonus}`, big: true })
        this.shake = 1
        vibrate([20, 40, 20])
      }
      this.cb.onScore(this.score, Math.max(this.best, this.score))
    }

    // Parçacıklar
    for (const p of this.particles) {
      p.vy += 900 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const p of this.popups) p.life -= dt
    this.popups = this.popups.filter((p) => p.life > 0)

    // Tehlike çizgisi
    if (this.world.overDangerLine()) this.dangerTime += dt
    else this.dangerTime = Math.max(0, this.dangerTime - dt * 2)
    this.cb.onDanger(Math.min(1, this.dangerTime / DANGER_LIMIT))
    if (this.dangerTime >= DANGER_LIMIT) this.endGame()

    this.saveTimer += dt
    if (this.saveTimer > 3) {
      this.saveTimer = 0
      this.save()
    }
  }

  private endGame(): void {
    this.over = true
    this.running = false
    cancelAnimationFrame(this.raf)
    this.sfx.gameOver()
    const isRecord = this.score > this.best
    if (isRecord) {
      this.best = this.score
      localStorage.setItem(BEST_KEY, String(this.best))
    }
    localStorage.removeItem(SAVE_KEY)
    this.draw()
    this.cb.onGameOver(this.score, this.best, isRecord)
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 60 + Math.random() * 220
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        r: 2 + Math.random() * 5,
        color,
      })
    }
  }

  // ---------------------------------------------------------------- çizim

  private resize = (): void => {
    const cssW = this.canvas.clientWidth || WORLD_W
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    this.scale = cssW / WORLD_W
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round(cssW * (WORLD_H / WORLD_W) * dpr)
    this.ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, 0, 0)
    if (!this.running) this.draw()
  }

  private draw(): void {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) {
      const s = this.shake * 6
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
    }
    ctx.clearRect(-20, -20, WORLD_W + 40, WORLD_H + 40)

    // Arka plan
    const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H)
    bg.addColorStop(0, '#fff6e2')
    bg.addColorStop(1, '#ffe6c0')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, WORLD_W, WORLD_H)

    // Tehlike çizgisi
    const danger = Math.min(1, this.dangerTime / DANGER_LIMIT)
    ctx.save()
    ctx.setLineDash([12, 10])
    ctx.lineWidth = 3
    ctx.strokeStyle = danger > 0 ? `rgba(220,50,50,${0.35 + danger * 0.65})` : 'rgba(200,120,60,0.45)'
    ctx.beginPath()
    ctx.moveTo(0, DANGER_Y)
    ctx.lineTo(WORLD_W, DANGER_Y)
    ctx.stroke()
    ctx.restore()

    // Nişan çizgisi + tutulan meyve
    if (!this.over) {
      const def = FRUITS[this.current]
      ctx.save()
      ctx.setLineDash([6, 10])
      ctx.strokeStyle = 'rgba(90,60,30,0.28)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(this.aimX, DROP_Y + def.radius)
      ctx.lineTo(this.aimX, WORLD_H)
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = this.cooldown > 0 ? 0.35 : 1
      drawFruit(ctx, def, this.aimX, DROP_Y, def.radius, 0)
      ctx.globalAlpha = 1
    }

    // Meyveler
    for (const b of this.world.bodies) {
      const r = b.r * (0.6 + 0.4 * easeOutBack(b.pop))
      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#8a5a20'
      ctx.beginPath()
      ctx.ellipse(b.x, Math.min(WORLD_H - 4, b.y + b.r * 0.92), r * 0.8, r * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      drawFruit(ctx, FRUITS[b.tier], b.x, b.y, r, b.angle)
    }

    // Parçacıklar
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Puan baloncukları
    ctx.textAlign = 'center'
    for (const p of this.popups) {
      const t = 1 - p.life / (p.big ? 1.4 : 1)
      ctx.globalAlpha = Math.min(1, p.life * 2)
      ctx.font = `800 ${p.big ? 34 : 24}px system-ui, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = 'rgba(120,60,10,0.85)'
      ctx.lineWidth = 5
      ctx.lineJoin = 'round'
      ctx.strokeText(p.text, p.x, p.y - t * 46)
      ctx.fillText(p.text, p.x, p.y - t * 46)
    }
    ctx.globalAlpha = 1

    // Kenarlıklar
    ctx.strokeStyle = 'rgba(140,90,40,0.55)'
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, WORLD_W - 6, WORLD_H - 6)

    if (this.over) {
      ctx.fillStyle = 'rgba(30,20,10,0.45)'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
    }
    ctx.restore()
  }

  // ---------------------------------------------------------------- kayıt

  private save = (): void => {
    if (this.over) return
    const data: SaveData = {
      score: this.score,
      current: this.current,
      next: this.next,
      bodies: this.world.bodies.map((b: Body) => ({ t: b.tier, x: Math.round(b.x), y: Math.round(b.y) })),
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      /* kota dolu olabilir — kayıt kritik değil */
    }
  }

  private restore(): boolean {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    try {
      const data = JSON.parse(raw) as SaveData
      if (!Array.isArray(data.bodies)) return false
      this.world.clear()
      for (const b of data.bodies) {
        if (typeof b.t !== 'number' || b.t < 0 || b.t > MAX_TIER) continue
        this.world.add(b.t, b.x, b.y)
      }
      this.score = Number(data.score) || 0
      this.current = clampTier(data.current)
      this.next = clampTier(data.next)
      this.over = false
      return true
    } catch {
      return false
    }
  }
}

function randomTier(): number {
  return Math.floor(Math.random() * SPAWNABLE_TIERS)
}

function clampTier(t: number): number {
  return Number.isFinite(t) ? Math.max(0, Math.min(SPAWNABLE_TIERS - 1, Math.floor(t))) : 0
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
