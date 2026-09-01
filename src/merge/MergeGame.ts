/**
 * Meyve Birleştir — Suika tipi düşür & birleştir oyunu.
 * Reklam yok, satın alma yok, internet yok: her şey yerelde çalışır.
 *
 * Bu sınıf simülasyonu, çizimi ve tur boyunca tutulan sayaçları yönetir;
 * kalıcı profil (para, başarım, albüm) `profile.ts` üzerinden güncellenir.
 */

import { FRUITS, MAX_TIER, SPAWNABLE_TIERS, mergeScore } from './fruits'
import { DANGER_Y, WORLD_H, WORLD_W, World } from './physics'
import type { Body } from './physics'
import { drawContactShadow, drawFruit, setSpriteScale } from './render'
import { Sfx } from './audio'
import { storageGet, storageRemove, storageSet } from './storage'
import { mulberry32, seedFromString, todayKey } from './rng'
import type { Rng } from './rng'
import { emptyRun, rollMissions } from './missions'
import type { Mission, RunStats } from './missions'
import { newlyEarned } from './achievements'
import type { Achievement } from './achievements'
import { dailyRecord, loadProfile, updateProfile } from './profile'
import { POWERUPS, powerupById } from './powerups'

const SAVE_KEY = 'fm_save_v3'
const BEST_KEY = 'fm_best'
const DROP_Y = 54
const DROP_COOLDOWN = 0.34
const DANGER_LIMIT = 2.2
const COMBO_WINDOW = 1.1
const GOLDEN_CHANCE = 0.02
const FEVER_TIME = 10
const TIMED_SECONDS = 120
const DAILY_TARGET = 5000

export type Mode = 'classic' | 'zen' | 'timed' | 'daily'

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
  /** Konfeti: dikdörtgen ve dönerek düşer */
  confetti?: boolean
  spin?: number
  angle?: number
}

interface Ring {
  x: number
  y: number
  r: number
  life: number
  color: string
  width?: number
}

interface Popup {
  x: number
  y: number
  life: number
  maxLife: number
  text: string
  size: number
  color?: string
}

interface Snapshot {
  score: number
  current: number
  next: number
  currentGolden: boolean
  nextGolden: boolean
  bodies: { t: number; x: number; y: number; vx: number; vy: number; g: boolean }[]
}

interface SaveData {
  mode: Mode
  score: number
  current: number
  next: number
  currentGolden: boolean
  nextGolden: boolean
  charges: Record<string, number>
  bodies: { t: number; x: number; y: number; g?: boolean }[]
}

export interface PowerupState {
  id: string
  icon: string
  name: string
  count: number
  armed: boolean
}

export interface MissionView {
  text: string
  progress: number
  done: boolean
}

export interface GameReport {
  mode: Mode
  score: number
  best: number
  isRecord: boolean
  biggest: number
  maxCombo: number
  merges: number
  drops: number
  seconds: number
  coins: number
  missions: MissionView[]
  achievements: Achievement[]
  dailyTarget: number
  toRecord: number
}

export interface GameCallbacks {
  onScore: (score: number, best: number) => void
  onNext: (tier: number, golden: boolean) => void
  onBiggest: (tier: number) => void
  onCombo: (count: number) => void
  onFever: (active: boolean, meter: number) => void
  onPowerups: (list: PowerupState[]) => void
  onMissions: (missions: MissionView[]) => void
  onTime: (secondsLeft: number | null) => void
  onToast: (text: string) => void
  onGameOver: (report: GameReport) => void
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
  private currentGolden = false
  private nextGolden = false
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

  private mode: Mode = 'classic'
  private rng: Rng = Math.random
  private run: RunStats = emptyRun()
  private missions: Mission[] = []
  private coinsEarned = 0
  private fever = 0
  private feverTime = 0
  private confettiTimer = 0
  private timeLeft = TIMED_SECONDS
  private dangerWasHigh = false
  private undoSnapshot: Snapshot | null = null

  private charges: Record<string, number> = {}
  private armed: 'bomb' | 'joker' | null = null
  private armPulse = 0
  private nextGrant: Record<string, number> = {}

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas
    this.cb = cb
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D desteklenmiyor')
    this.ctx = ctx
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

  setMode(mode: Mode): void {
    if (this.mode === mode) return
    this.mode = mode
    this.newRound()
    this.emitAll()
    this.draw()
  }

  get currentMode(): Mode {
    return this.mode
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
    this.fever = 0
    this.feverTime = 0
    this.coinsEarned = 0
    this.timeLeft = TIMED_SECONDS
    this.dangerWasHigh = false
    this.undoSnapshot = null
    this.armed = null
    this.state = 'ready'
    this.aimX = WORLD_W / 2
    this.run = emptyRun()

    // Günlük mod: tarihe göre tohumlanır — herkeste aynı sıra
    this.rng = this.mode === 'daily' ? mulberry32(seedFromString(todayKey())) : Math.random
    this.missions = rollMissions(this.mode === 'daily' ? mulberry32(seedFromString(`m${todayKey()}`)) : Math.random)

    const profile = loadProfile()
    this.charges = {}
    this.nextGrant = {}
    for (const id of profile.loadout) {
      const def = powerupById(id)
      if (!def) continue
      this.charges[id] = def.start
      this.nextGrant[id] = def.every
    }

    this.current = this.rollTier()
    this.next = this.rollTier()
    this.currentGolden = this.rollGolden()
    this.nextGolden = this.rollGolden()
    storageRemove(SAVE_KEY)
  }

  private emitAll(): void {
    this.cb.onScore(this.score, Math.max(this.best, this.score))
    this.cb.onNext(this.next, this.nextGolden)
    this.cb.onBiggest(this.biggest)
    this.cb.onFever(this.feverTime > 0, this.fever)
    this.cb.onTime(this.mode === 'timed' ? this.timeLeft : null)
    this.emitPowerups()
    this.emitMissions()
  }

  /**
   * Menüden yardımcı seçimi değişince mevcut turun haklarını tazeler:
   * yeni eklenenler başlangıç hakkını alır, kalanlar sayacını korur.
   */
  syncLoadout(): void {
    const profile = loadProfile()
    const charges: Record<string, number> = {}
    const grants: Record<string, number> = {}
    for (const id of profile.loadout) {
      const def = powerupById(id)
      if (!def) continue
      charges[id] = this.charges[id] ?? def.start
      grants[id] = this.nextGrant[id] ?? (Math.floor(this.score / def.every) + 1) * def.every
    }
    this.charges = charges
    this.nextGrant = grants
    if (this.armed && charges[this.armed] === undefined) this.armed = null
    this.emitPowerups()
  }

  private emitPowerups(): void {
    const profile = loadProfile()
    this.cb.onPowerups(
      profile.loadout
        .map((id) => {
          const def = powerupById(id)
          if (!def) return null
          return {
            id,
            icon: def.icon,
            name: def.name,
            count: this.charges[id] ?? 0,
            armed: this.armed === id,
          }
        })
        .filter((p): p is PowerupState => p !== null),
    )
  }

  private emitMissions(): void {
    this.cb.onMissions(this.missionViews())
  }

  private missionViews(): MissionView[] {
    return this.missions.map((m) => ({
      text: m.text,
      progress: Math.min(1, m.progress(this.run)),
      done: m.done === true,
    }))
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

  // ---------------------------------------------------------------- meyve üretimi

  private rollTier(): number {
    return Math.floor(this.rng() * SPAWNABLE_TIERS)
  }

  private rollGolden(): boolean {
    return this.rng() < GOLDEN_CHANCE
  }

  // ---------------------------------------------------------------- yardımcılar

  /** Yardımcıyı kullan / kur. UI tek bir düğmeden çağırır. */
  usePowerup(id: string): void {
    if (this.state !== 'playing') return
    if ((this.charges[id] ?? 0) <= 0) {
      if (this.armed === id) {
        this.armed = null
        this.emitPowerups()
      }
      return
    }
    switch (id) {
      case 'bomb':
      case 'joker':
        this.armed = this.armed === id ? null : (id as 'bomb' | 'joker')
        this.emitPowerups()
        break
      case 'swap':
        this.doSwap()
        break
      case 'undo':
        this.doUndo()
        break
      case 'shake':
        this.doShake()
        break
    }
  }

  private consume(id: string): void {
    this.charges[id] = Math.max(0, (this.charges[id] ?? 0) - 1)
    this.emitPowerups()
  }

  private doSwap(): void {
    if (this.current === this.next && this.currentGolden === this.nextGolden) {
      this.cb.onToast('Eldeki ve sıradaki aynı — takasa gerek yok')
      return
    }
    const t = this.current
    const g = this.currentGolden
    this.current = this.next
    this.currentGolden = this.nextGolden
    this.next = t
    this.nextGolden = g
    this.setAim(this.aimX)
    this.sfx.swap()
    this.cb.onNext(this.next, this.nextGolden)
    this.consume('swap')
  }

  private doUndo(): void {
    const snap = this.undoSnapshot
    if (!snap) {
      this.cb.onToast('Geri alacak hamle yok')
      return
    }
    this.world.clear()
    for (const b of snap.bodies) {
      this.world.add(b.t, b.x, b.y, b.vx, b.vy, b.g)
    }
    this.score = snap.score
    this.current = snap.current
    this.next = snap.next
    this.currentGolden = snap.currentGolden
    this.nextGolden = snap.nextGolden
    this.undoSnapshot = null
    this.dangerTime = 0
    this.cb.onScore(this.score, Math.max(this.best, this.score))
    this.cb.onNext(this.next, this.nextGolden)
    this.sfx.swap()
    this.consume('undo')
    this.cb.onToast('↩️ Son hamle geri alındı')
  }

  private doShake(): void {
    this.world.jolt(2.4)
    this.shake = 0.9
    this.sfx.impact(0.8, 6, true)
    vibrate([12, 30, 12])
    this.consume('shake')
    this.cb.onToast('🌀 Kutu sallandı')
  }

  private detonate(x: number, y: number): boolean {
    const target = this.world.pick(x, y)
    if (!target) return false
    this.world.remove(target)
    this.armed = null
    this.run.bombUsed = true
    this.sfx.boom()
    this.splash(target.x, target.y, FRUITS[target.tier].color, 26)
    this.rings.push({ x: target.x, y: target.y, r: target.r * 0.6, life: 1.1, color: '#ffd08a' })
    this.shake = 0.7
    vibrate(30)
    this.consume('bomb')
    return true
  }

  private joker(x: number, y: number): boolean {
    const target = this.world.pick(x, y)
    if (!target) return false
    this.current = Math.min(target.tier, 7)
    this.currentGolden = target.golden
    this.armed = null
    this.setAim(this.aimX)
    this.sfx.swap()
    this.rings.push({ x: target.x, y: target.y, r: target.r * 0.7, life: 0.9, color: '#9be7ff' })
    this.consume('joker')
    this.cb.onToast(`🌈 Elindeki ${FRUITS[this.current].name} oldu`)
    return true
  }

  private grantPowerups(): void {
    for (const def of POWERUPS) {
      const threshold = this.nextGrant[def.id]
      if (threshold === undefined) continue
      while (this.score >= this.nextGrant[def.id]) {
        this.nextGrant[def.id] += def.every
        if ((this.charges[def.id] ?? 0) < def.max) {
          this.charges[def.id] = (this.charges[def.id] ?? 0) + 1
          this.popups.push({
            x: WORLD_W / 2,
            y: 150,
            life: 1.1,
            maxLife: 1.1,
            text: `${def.icon} +1`,
            size: 26,
          })
        }
      }
    }
    this.emitPowerups()
  }

  // ---------------------------------------------------------------- giriş

  private bindInput(): void {
    const c = this.canvas
    c.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      if (this.armed) {
        const p = this.toWorld(e)
        const hit = this.armed === 'bomb' ? this.detonate(p.x, p.y) : this.joker(p.x, p.y)
        if (!hit) {
          this.armed = null
          this.emitPowerups()
        }
        return
      }
      this.pointerActive = true
      c.setPointerCapture(e.pointerId)
      this.aimAt(e)
    })
    c.addEventListener('pointermove', (e) => {
      if (this.state !== 'playing' || this.armed) return
      if (this.pointerActive || e.pointerType === 'mouse') this.aimAt(e)
    })
    c.addEventListener('pointerup', (e) => {
      if (this.state !== 'playing' || this.armed) return
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

  private takeSnapshot(): void {
    this.undoSnapshot = {
      score: this.score,
      current: this.current,
      next: this.next,
      currentGolden: this.currentGolden,
      nextGolden: this.nextGolden,
      bodies: this.world.bodies.map((b) => ({
        t: b.tier,
        x: b.x,
        y: b.y,
        vx: b.x - b.px,
        vy: b.y - b.py,
        g: b.golden,
      })),
    }
  }

  private drop(): void {
    if (this.state !== 'playing' || this.cooldown > 0 || this.armed) return
    this.takeSnapshot()
    const jitter = (this.rng() - 0.5) * 1.6
    const body = this.world.add(
      this.current,
      this.aimX + jitter,
      DROP_Y,
      (this.rng() - 0.5) * 0.06,
      0.6,
      this.currentGolden,
    )
    body.av = (this.rng() - 0.5) * 0.02
    this.sfx.drop()
    vibrate(8)
    this.cooldown = DROP_COOLDOWN
    this.run.drops++
    this.current = this.next
    this.currentGolden = this.nextGolden
    this.next = this.rollTier()
    this.nextGolden = this.rollGolden()
    this.setAim(this.aimX)
    this.cb.onNext(this.next, this.nextGolden)
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
    this.run.seconds += dt
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3)
    if (this.flashScreen > 0) this.flashScreen = Math.max(0, this.flashScreen - dt * 2.5)
    this.armPulse = (this.armPulse + dt * 4) % (Math.PI * 2)

    if (this.mode === 'timed') {
      this.timeLeft = Math.max(0, this.timeLeft - dt)
      this.cb.onTime(this.timeLeft)
      if (this.timeLeft <= 0) {
        this.endGame()
        return
      }
    }

    this.updateFever(dt)

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

    for (const m of merges) this.handleMerge(m.x, m.y, m.vx, m.vy, m.tier, m.golden)
    if (merges.length > 0) {
      this.grantPowerups()
      this.checkMissions()
    }

    this.updateParticles(dt)

    if (this.mode !== 'zen') {
      if (this.world.overDangerLine()) this.dangerTime += dt
      else this.dangerTime = Math.max(0, this.dangerTime - dt * 2)
      const ratio = this.dangerTime / DANGER_LIMIT
      if (ratio > 0.6) this.dangerWasHigh = true
      else if (ratio <= 0.01 && this.dangerWasHigh) {
        this.dangerWasHigh = false
        this.run.escaped = true
      }
      if (this.dangerTime >= DANGER_LIMIT) {
        this.endGame()
        return
      }
    }

    this.saveTimer += dt
    if (this.saveTimer > 3) {
      this.saveTimer = 0
      this.save()
    }
  }

  private handleMerge(x: number, y: number, vx: number, vy: number, tier: number, golden: boolean): void {
    this.comboCount++
    this.comboTimer = COMBO_WINDOW
    const combo = Math.min(5, Math.max(1, this.comboCount))
    if (combo > 1) this.cb.onCombo(combo)
    if (combo > this.run.maxCombo) this.run.maxCombo = combo
    this.run.merges++

    // FEVER göstergesi zincirle dolar
    if (this.feverTime <= 0) {
      this.fever = Math.min(1, this.fever + 0.1 + Math.max(0, tier) * 0.012 + (combo - 1) * 0.04)
      if (this.fever >= 1) this.startFever()
    }

    const feverBonus = this.feverTime > 0 ? 2 : 1
    const goldBonus = golden ? 3 : 1
    if (golden) {
      this.run.goldenMerges++
      this.rings.push({ x, y, r: 30, life: 1.2, color: '#ffd76a', width: 8 })
      this.splash(x, y, '#ffd76a', 26)
    }

    if (tier >= 0) {
      const body = this.world.add(tier, x, y, vx, vy)
      body.pop = 0
      const gained = mergeScore(tier) * combo * feverBonus * goldBonus
      this.score += gained
      this.run.score = this.score
      this.sfx.merge(tier, this.comboCount + (this.feverTime > 0 ? 3 : 0))
      this.splash(x, y, FRUITS[tier].color, 8 + tier * 2)
      this.rings.push({ x, y, r: FRUITS[tier].radius * 0.7, life: 1, color: FRUITS[tier].light })
      this.popups.push({
        x,
        y,
        life: 0.9,
        maxLife: 0.9,
        text: golden ? `ALTIN +${gained}` : combo > 1 ? `+${gained} ×${combo}` : `+${gained}`,
        size: tier >= 6 || golden ? 32 : 24,
        color: golden ? '#ffe9a8' : undefined,
      })
      vibrate(tier >= 6 ? 24 : 12)
      if (tier >= 6) this.shake = Math.min(1, 0.25 + tier * 0.05)
      if (tier > this.biggest) {
        this.biggest = tier
        this.run.biggest = tier
        this.cb.onBiggest(tier)
        if (tier >= 6) this.flashScreen = 0.5
        this.unlockAlbum(tier)
      }
      if (tier === MAX_TIER) {
        this.run.watermelons++
        this.cb.onToast('🍉 Karpuz! İki karpuzu birleştirirsen mega patlama olur')
      }
    } else {
      // İki karpuz → MEGA KARPUZ: patlar ve çevresini iter
      const bonus = 200 * combo * feverBonus * goldBonus
      this.score += bonus
      this.run.score = this.score
      this.sfx.watermelon()
      this.world.explode(x, y, 240, 1)
      this.splash(x, y, FRUITS[MAX_TIER].color, 50)
      this.splash(x, y, '#ffe9a8', 26)
      this.rings.push({ x, y, r: 40, life: 1.6, color: '#ffe9a8', width: 10 })
      this.rings.push({ x, y, r: 20, life: 1.9, color: '#ff9f43', width: 6 })
      this.popups.push({ x, y, life: 1.6, maxLife: 1.6, text: `🌟 MEGA KARPUZ +${bonus}`, size: 32, color: '#fff0b8' })
      this.shake = 1
      this.flashScreen = 1
      vibrate([20, 40, 20, 40])
    }
    this.cb.onScore(this.score, Math.max(this.best, this.score))
  }

  private startFever(): void {
    this.feverTime = FEVER_TIME
    this.fever = 1
    this.run.fevers++
    this.sfx.watermelon()
    this.cb.onFever(true, 1)
    this.cb.onToast('🔥 FEVER! 10 saniye çift puan')
    this.popups.push({ x: WORLD_W / 2, y: 200, life: 1.4, maxLife: 1.4, text: '🔥 FEVER!', size: 40, color: '#ffd76a' })
    this.shake = 0.6
  }

  private updateFever(dt: number): void {
    if (this.feverTime > 0) {
      this.feverTime = Math.max(0, this.feverTime - dt)
      this.fever = this.feverTime / FEVER_TIME
      this.confettiTimer -= dt
      if (this.confettiTimer <= 0) {
        this.confettiTimer = 0.07
        this.spawnConfetti()
      }
      if (this.feverTime === 0) {
        this.fever = 0
        this.cb.onFever(false, 0)
        this.cb.onToast('Fever bitti')
      } else {
        this.cb.onFever(true, this.fever)
      }
    } else if (this.fever > 0) {
      this.fever = Math.max(0, this.fever - dt * 0.05)
      this.cb.onFever(false, this.fever)
    }
  }

  private spawnConfetti(): void {
    const colors = ['#ffd76a', '#ff9f43', '#e63946', '#9b5de5', '#3aa14b', '#f2495c']
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: Math.random() * WORLD_W,
        y: -10,
        vx: (Math.random() - 0.5) * 60,
        vy: 60 + Math.random() * 90,
        life: 2.6,
        maxLife: 2.6,
        r: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        confetti: true,
        spin: (Math.random() - 0.5) * 8,
        angle: Math.random() * Math.PI,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.vy += (p.confetti ? 130 : 900) * dt
      if (p.confetti) p.vx += Math.sin(this.time * 3 + p.x) * 12 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.confetti && p.spin !== undefined) p.angle = (p.angle ?? 0) + p.spin * dt
      p.life -= dt
    }
    if (this.particles.length > 0) this.particles = this.particles.filter((p) => p.life > 0 && p.y < WORLD_H + 40)

    for (const r of this.rings) {
      r.life -= dt * 1.9
      r.r += dt * 320
    }
    if (this.rings.length > 0) this.rings = this.rings.filter((r) => r.life > 0)

    for (const p of this.popups) p.life -= dt
    if (this.popups.length > 0) this.popups = this.popups.filter((p) => p.life > 0)
  }

  // ---------------------------------------------------------------- görev / albüm

  private checkMissions(): void {
    let changed = false
    for (const m of this.missions) {
      if (m.done) continue
      if (m.progress(this.run) >= 1) {
        m.done = true
        changed = true
        this.coinsEarned += m.coins
        updateProfile((p) => {
          p.coins += m.coins
          if (m.stars) p.stars += m.stars
        })
        this.cb.onToast(`🎯 Görev tamam: ${m.text} · +${m.coins}🪙${m.stars ? ` +${m.stars}⭐` : ''}`)
        this.popups.push({
          x: WORLD_W / 2,
          y: 240,
          life: 1.3,
          maxLife: 1.3,
          text: `+${m.coins} 🪙`,
          size: 28,
          color: '#ffe9a8',
        })
      }
    }
    if (changed) this.emitMissions()
    else this.cb.onMissions(this.missionViews())
  }

  private unlockAlbum(tier: number): void {
    const profile = loadProfile()
    if (profile.album.includes(tier)) return
    updateProfile((p) => {
      p.album.push(tier)
      p.coins += 10
    })
    this.coinsEarned += 10
    this.cb.onToast(`📖 Albüme eklendi: ${FRUITS[tier].name} · +10🪙`)
  }

  // ---------------------------------------------------------------- oyun sonu

  private endGame(): void {
    this.state = 'over'
    cancelAnimationFrame(this.raf)
    this.sfx.gameOver()
    this.run.score = this.score
    this.run.biggest = this.biggest

    const isRecord = this.mode !== 'zen' && this.score > this.best
    if (isRecord) {
      this.best = this.score
      storageSet(BEST_KEY, String(this.best))
    }

    const profile = updateProfile((p) => {
      p.stats.games++
      p.stats.merges += this.run.merges
      p.stats.watermelons += this.run.watermelons
      p.stats.drops += this.run.drops
      p.stats.bestCombo = Math.max(p.stats.bestCombo, this.run.maxCombo)
      if (this.mode === 'daily') {
        const rec = p.daily
        if (!rec.done) {
          rec.score = this.score
          rec.done = true
        }
      }
    })

    const earned = newlyEarned(this.run, profile)
    if (earned.length > 0) {
      updateProfile((p) => {
        for (const a of earned) {
          if (!p.achievements.includes(a.id)) p.achievements.push(a.id)
        }
        p.coins += earned.length * 25
      })
      this.coinsEarned += earned.length * 25
    }

    storageRemove(SAVE_KEY)
    this.shake = 0.8
    this.draw()
    this.cb.onGameOver({
      mode: this.mode,
      score: this.score,
      best: this.best,
      isRecord,
      biggest: this.biggest,
      maxCombo: this.run.maxCombo,
      merges: this.run.merges,
      drops: this.run.drops,
      seconds: Math.round(this.run.seconds),
      coins: this.coinsEarned,
      missions: this.missionViews(),
      achievements: earned,
      dailyTarget: DAILY_TARGET,
      toRecord: Math.max(0, this.best - this.score),
    })
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

  private draw(): void {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) {
      const s = this.shake * 7
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
    }

    this.drawBoard(ctx)

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
      const vy = b.y - b.py
      const stretch = vy > 2.4 ? -Math.min(0.12, (vy - 2.4) * 0.02) : 0

      drawFruit(ctx, FRUITS[b.tier], b.x, b.y, r, {
        angle: b.angle,
        squash: b.squash > 0 ? b.squash : stretch,
        look,
        flash: b.pop < 1 ? (1 - b.pop) * 0.8 : 0,
        blink: b.blink < 0 && b.pop >= 1,
        golden: b.golden,
        time: this.time,
      })

      if (this.armed) {
        ctx.save()
        ctx.globalAlpha = 0.35 + Math.sin(this.armPulse) * 0.2
        ctx.strokeStyle = this.armed === 'bomb' ? '#ff5a4a' : '#4ac0ff'
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
      ctx.lineWidth = (ring.width ?? 6) * Math.max(0.2, ring.life)
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.fillStyle = p.color
      if (p.confetti) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle ?? 0)
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    if (this.state !== 'over' && !this.armed) {
      const def = FRUITS[this.current]
      const beam = ctx.createLinearGradient(0, DROP_Y, 0, WORLD_H)
      beam.addColorStop(0, 'rgba(255,255,255,0.42)')
      beam.addColorStop(0.75, 'rgba(255,255,255,0.06)')
      beam.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = beam
      ctx.fillRect(this.aimX - def.radius * 0.18, DROP_Y, def.radius * 0.36, WORLD_H - DROP_Y)

      const bob = Math.sin(this.time * 4) * 2
      ctx.globalAlpha = this.cooldown > 0 ? 0.3 : 1
      drawFruit(ctx, def, this.aimX, DROP_Y + bob, def.radius, {
        look: { x: 0, y: 1 },
        golden: this.currentGolden,
        time: this.time,
      })
      ctx.globalAlpha = 1
    }

    if (this.armed) {
      ctx.fillStyle = this.armed === 'bomb' ? 'rgba(226,60,60,0.14)' : 'rgba(60,150,226,0.14)'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      ctx.textAlign = 'center'
      ctx.font = '800 20px system-ui, sans-serif'
      ctx.fillStyle = this.armed === 'bomb' ? '#7d2020' : '#134b73'
      ctx.fillText(
        this.armed === 'bomb' ? '💣 Patlatmak için bir meyveye dokun' : '🌈 Dönüşmek istediğin meyveye dokun',
        WORLD_W / 2,
        DROP_Y + 6,
      )
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
      ctx.fillStyle = p.color ?? '#fffdf4'
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

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(-30, -30, WORLD_W + 60, WORLD_H + 60)
    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0, WORLD_W, WORLD_H)

    // FEVER sırasında tahta ısınır
    if (this.feverTime > 0) {
      const pulse = 0.1 + Math.sin(this.time * 8) * 0.05
      ctx.fillStyle = `rgba(255,150,40,${pulse})`
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      ctx.save()
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 10) * 0.2
      ctx.fillStyle = '#d8571a'
      ctx.font = '800 15px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🔥 FEVER ×2 — ${this.feverTime.toFixed(1)} sn`, WORLD_W / 2, 30)
      ctx.restore()
    }

    if (this.mode === 'zen') {
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
    if (this.mode === 'daily' || this.mode === 'timed') return // bu modlar tek oturumluk
    const data: SaveData = {
      mode: this.mode,
      score: this.score,
      current: this.current,
      next: this.next,
      currentGolden: this.currentGolden,
      nextGolden: this.nextGolden,
      charges: this.charges,
      bodies: this.world.bodies.map((b: Body) => ({
        t: b.tier,
        x: Math.round(b.x),
        y: Math.round(b.y),
        g: b.golden || undefined,
      })),
    }
    storageSet(SAVE_KEY, JSON.stringify(data))
  }

  private restore(): boolean {
    const raw = storageGet(SAVE_KEY)
    if (!raw) return false
    try {
      const data = JSON.parse(raw) as SaveData
      if (!Array.isArray(data.bodies) || data.bodies.length === 0) return false
      this.mode = data.mode === 'zen' ? 'zen' : 'classic'
      this.newRound()
      this.world.clear()
      this.biggest = 0
      for (const b of data.bodies) {
        if (typeof b.t !== 'number' || b.t < 0 || b.t > MAX_TIER) continue
        this.world.add(b.t, b.x, b.y, 0, 0, b.g === true)
        if (b.t > this.biggest) this.biggest = b.t
      }
      this.score = Number(data.score) || 0
      this.run.score = this.score
      this.run.biggest = this.biggest
      this.current = clampTier(data.current)
      this.next = clampTier(data.next)
      this.currentGolden = data.currentGolden === true
      this.nextGolden = data.nextGolden === true
      if (data.charges && typeof data.charges === 'object') {
        for (const id of Object.keys(this.charges)) {
          const v = data.charges[id]
          if (typeof v === 'number' && Number.isFinite(v)) this.charges[id] = Math.max(0, Math.floor(v))
        }
      }
      for (const def of POWERUPS) {
        if (this.nextGrant[def.id] !== undefined) {
          this.nextGrant[def.id] = (Math.floor(this.score / def.every) + 1) * def.every
        }
      }
      this.state = 'ready'
      return true
    } catch {
      return false
    }
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

function clampTier(t: number): number {
  return Number.isFinite(t) ? Math.max(0, Math.min(SPAWNABLE_TIERS - 1, Math.floor(t))) : 0
}

function easeOutBack(t: number): number {
  const c = 1.9
  const p = t - 1
  return 1 + (c + 1) * p * p * p + c * p * p
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || (navigator.maxTouchPoints ?? 0) === 0) return
  if (typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* bazı tarayıcılar engelliyor */
    }
  }
}

/** Günlük meydan okumanın bugünkü durumu — açılış kartı için. */
export function dailyStatus(): { target: number; done: boolean; score: number } {
  const rec = dailyRecord()
  return { target: DAILY_TARGET, done: rec.done, score: rec.score }
}
