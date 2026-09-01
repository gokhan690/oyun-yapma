/**
 * Canvas çizim yardımcıları — meyveler prosedürel çizilir, asset yok.
 */

import type { FruitDef } from './fruits'
import { FRUITS } from './fruits'

export interface FruitDrawOpts {
  /** Yuvarlanma açısı */
  angle?: number
  /** 0..0.3 — çarpma anındaki dikey ezilme */
  squash?: number
  /** Göz bebeklerinin bakacağı yön (birim vektör) */
  look?: { x: number; y: number }
  /** 0..1 — birleşme anındaki beyaz parlama */
  flash?: number
  /** Göz kırpma karesi */
  blink?: boolean
  /** Nadir altın meyve — ışıltılı kaplama */
  golden?: boolean
  /** Altın ışıltının dönmesi için zaman (sn) */
  time?: number
}

/**
 * Sprite önbelleği: gövde+desen ve ışık katmanı meyve başına bir kez çizilip
 * saklanır, her karede yeniden gradyan üretilmez. Çok sayıda meyve varken
 * kare hızını belirgin biçimde yükseltir.
 */
const PAD = 1.45
const MAX_SPRITE_R = 90
let spriteScale = 1
const bodyCache = new Map<number, HTMLCanvasElement>()
const lightCache = new Map<number, HTMLCanvasElement>()

/** Tuval ölçeği değiştiğinde sprite'ları yeniden üret (dünya birimi → cihaz pikseli). */
export function setSpriteScale(scale: number): void {
  if (!Number.isFinite(scale) || scale <= 0) return
  if (Math.abs(scale - spriteScale) / spriteScale < 0.12) return
  spriteScale = scale
  bodyCache.clear()
  lightCache.clear()
}

function makeSprite(def: FruitDef, light: boolean): HTMLCanvasElement | null {
  const r = def.radius * spriteScale
  const size = Math.ceil(2 * PAD * r)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const c = canvas.getContext('2d')
  if (!c) return null
  c.translate(size / 2, size / 2)
  if (light) paintLight(c, r)
  else paintBody(c, def, r)
  return canvas
}

function sprite(def: FruitDef, light: boolean): HTMLCanvasElement | null {
  if (def.radius * spriteScale > MAX_SPRITE_R) return null
  const cache = light ? lightCache : bodyCache
  const hit = cache.get(def.tier)
  if (hit) return hit
  const made = makeSprite(def, light)
  if (made) cache.set(def.tier, made)
  return made
}

/** Gövde + desen (meyveyle birlikte döner). */
function paintBody(ctx: CanvasRenderingContext2D, def: FruitDef, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.06, 0, 0, r * 1.06)
  grad.addColorStop(0, def.light)
  grad.addColorStop(0.48, def.color)
  grad.addColorStop(1, def.shade)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  drawDeco(ctx, def, r)
}

/** Işık katmanı (dönmez: ışık hep tepeden gelir). */
function paintLight(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.clip()

  const edge = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(40,15,0,0.34)')
  ctx.fillStyle = edge
  ctx.fillRect(-r, -r, r * 2, r * 2)

  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(-r * 0.34, -r * 0.44, r * 0.27, r * 0.15, -0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.1, r * 0.06, -0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.2
  ctx.fillStyle = '#ffd9a0'
  ctx.beginPath()
  ctx.ellipse(r * 0.12, r * 0.62, r * 0.42, r * 0.16, 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()

  ctx.strokeStyle = 'rgba(60,30,10,0.2)'
  ctx.lineWidth = Math.max(1, r * 0.04)
  ctx.beginPath()
  ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
}

/** Altın meyve kaplaması: sıcak bir tül + dönen ışıltılar. */
function paintGolden(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.clip()
  const g = ctx.createLinearGradient(-r, -r, r, r)
  g.addColorStop(0, 'rgba(255,225,120,0.55)')
  g.addColorStop(0.5, 'rgba(255,190,60,0.3)')
  g.addColorStop(1, 'rgba(255,240,180,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,214,102,0.95)'
  ctx.lineWidth = Math.max(1.5, r * 0.07)
  ctx.beginPath()
  ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()

  // Dönen küçük ışıltılar
  ctx.fillStyle = '#fff6d0'
  for (let i = 0; i < 3; i++) {
    const a = time * 1.6 + (i / 3) * Math.PI * 2
    const px = Math.cos(a) * r * 0.72
    const py = Math.sin(a) * r * 0.72
    const size = r * (0.09 + 0.03 * Math.sin(time * 6 + i))
    ctx.beginPath()
    ctx.moveTo(px, py - size)
    ctx.lineTo(px + size * 0.4, py)
    ctx.lineTo(px, py + size)
    ctx.lineTo(px - size * 0.4, py)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  def: FruitDef,
  x: number,
  y: number,
  r: number,
  opts: FruitDrawOpts = {},
): void {
  const angle = opts.angle ?? 0
  const squash = opts.squash ?? 0

  const body = sprite(def, false)
  const light = body ? sprite(def, true) : null
  if (body && light) {
    const half = r * PAD
    ctx.save()
    ctx.translate(x, y)
    if (squash !== 0) ctx.scale(1 + squash, 1 - squash)
    ctx.save()
    ctx.rotate(angle)
    ctx.drawImage(body, -half, -half, half * 2, half * 2)
    drawFace(ctx, r, opts.look, angle, opts.blink === true)
    ctx.restore()
    ctx.drawImage(light, -half, -half, half * 2, half * 2)
    if (opts.golden) paintGolden(ctx, r, opts.time ?? 0)
    if (opts.flash && opts.flash > 0.01) {
      ctx.globalAlpha = opts.flash * 0.85
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
    return
  }

  // Sprite'a sığmayan büyük meyveler doğrudan çizilir (sayıları az)
  ctx.save()
  ctx.translate(x, y)
  if (squash !== 0) ctx.scale(1 + squash, 1 - squash)

  paintBody(ctx, def, r)
  ctx.save()
  ctx.rotate(angle)
  drawFace(ctx, r, opts.look, angle, opts.blink === true)
  ctx.restore()
  paintLight(ctx, r)
  if (opts.golden) paintGolden(ctx, r, opts.time ?? 0)

  // Birleşme parlaması
  if (opts.flash && opts.flash > 0.01) {
    ctx.globalAlpha = opts.flash * 0.85
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawDeco(ctx: CanvasRenderingContext2D, def: FruitDef, r: number): void {
  switch (def.deco) {
    case 'cherry':
    case 'apple':
      ctx.strokeStyle = '#7a4a21'
      ctx.lineWidth = r * 0.11
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.86)
      ctx.quadraticCurveTo(r * 0.12, -r * 1.16, r * 0.3, -r * 1.24)
      ctx.stroke()
      leaf(ctx, r * 0.34, -r * 1.16, r * 0.42, -0.5)
      break
    case 'berry':
      ctx.fillStyle = 'rgba(255,240,180,0.9)'
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3
        const rad = r * (0.4 + 0.25 * (i % 2))
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * rad, Math.sin(a) * rad, r * 0.07, r * 0.05, a, 0, Math.PI * 2)
        ctx.fill()
      }
      leaf(ctx, 0, -r * 0.95, r * 0.4, 0)
      break
    case 'grape':
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'citrus':
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = r * 0.06
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25)
        ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92)
        ctx.stroke()
      }
      leaf(ctx, r * 0.1, -r * 0.9, r * 0.34, -0.4)
      break
    case 'pear':
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.2, r * 0.62, r * 0.72, 0, 0, Math.PI * 2)
      ctx.fill()
      leaf(ctx, r * 0.24, -r * 0.92, r * 0.36, -0.5)
      break
    case 'peach':
      ctx.strokeStyle = 'rgba(180,80,60,0.35)'
      ctx.lineWidth = r * 0.07
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.9)
      ctx.quadraticCurveTo(-r * 0.16, 0, 0, r * 0.9)
      ctx.stroke()
      leaf(ctx, r * 0.18, -r * 0.92, r * 0.36, -0.5)
      break
    case 'pineapple':
      ctx.strokeStyle = 'rgba(150,110,10,0.35)'
      ctx.lineWidth = r * 0.05
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(-r * 0.9, i * r * 0.26 - r * 0.3)
        ctx.lineTo(r * 0.9, i * r * 0.26 + r * 0.3)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-r * 0.9, i * r * 0.26 + r * 0.3)
        ctx.lineTo(r * 0.9, i * r * 0.26 - r * 0.3)
        ctx.stroke()
      }
      ctx.fillStyle = '#4ea64e'
      for (let i = -1; i <= 1; i++) {
        ctx.save()
        ctx.translate(i * r * 0.22, -r * 0.9)
        ctx.rotate(i * 0.5)
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.18, r * 0.12, r * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      break
    case 'melon':
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = r * 0.045
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.ellipse(0, 0, r * (0.28 + i * 0.16), r * 0.94, 0.6, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'watermelon':
      ctx.fillStyle = 'rgba(20,80,30,0.55)'
      for (let i = -2; i <= 2; i++) {
        ctx.save()
        ctx.rotate(i * 0.42)
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.09, r * 0.99, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      leaf(ctx, r * 0.2, -r * 0.92, r * 0.38, -0.5)
      break
  }
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const g = ctx.createLinearGradient(-size, 0, size, 0)
  g.addColorStop(0, '#5cb85c')
  g.addColorStop(1, '#3d8b3d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, size, size * 0.45, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  r: number,
  look: { x: number; y: number } | undefined,
  angle: number,
  blink: boolean,
): void {
  const ex = r * 0.3
  const ey = -r * 0.02

  // Ekranda küçük kalan meyvelerde ayrıntı görünmüyor: ucuz yüz çiz
  if (r < 17) {
    ctx.fillStyle = '#2b2118'
    ctx.beginPath()
    ctx.ellipse(-ex, ey, r * 0.1, r * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.1, r * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2b2118'
    ctx.lineWidth = Math.max(1, r * 0.07)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, r * 0.12, r * 0.2, 0.25 * Math.PI, 0.75 * Math.PI)
    ctx.stroke()
    return
  }

  if (blink) {
    ctx.strokeStyle = '#2b2118'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.lineCap = 'round'
    for (const sx of [-ex, ex]) {
      ctx.beginPath()
      ctx.moveTo(sx - r * 0.09, ey)
      ctx.quadraticCurveTo(sx, ey + r * 0.06, sx + r * 0.09, ey)
      ctx.stroke()
    }
  } else {
    // Göz akı + bakış yönüne kayan bebek
    let lx = 0
    let ly = 0
    if (look) {
      const cos = Math.cos(-angle)
      const sin = Math.sin(-angle)
      lx = (look.x * cos - look.y * sin) * r * 0.035
      ly = (look.x * sin + look.y * cos) * r * 0.035
    }
    ctx.fillStyle = '#fffdf7'
    for (const sx of [-ex, ex]) {
      ctx.beginPath()
      ctx.ellipse(sx, ey, r * 0.13, r * 0.155, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#2b2118'
    for (const sx of [-ex, ex]) {
      ctx.beginPath()
      ctx.ellipse(sx + lx, ey + ly, r * 0.075, r * 0.095, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (const sx of [-ex, ex]) {
      ctx.beginPath()
      ctx.arc(sx + lx + r * 0.03, ey + ly - r * 0.04, r * 0.028, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.strokeStyle = '#2b2118'
  ctx.lineWidth = Math.max(1, r * 0.055)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, r * 0.12, r * 0.2, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,120,120,0.26)'
  for (const sx of [-ex - r * 0.16, ex + r * 0.16]) {
    ctx.beginPath()
    ctx.arc(sx, r * 0.2, r * 0.11, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Zemine düşen yumuşak gölge — meyve yaklaştıkça koyulaşıp daralır.
 * (Gerçek temas gölgesi hissi için mesafeye bağlı.)
 */
let shadowSprite: HTMLCanvasElement | null = null

function getShadowSprite(): HTMLCanvasElement | null {
  if (shadowSprite) return shadowSprite
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const c = canvas.getContext('2d')
  if (!c) return null
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(90,50,10,1)')
  g.addColorStop(0.6, 'rgba(90,50,10,0.45)')
  g.addColorStop(1, 'rgba(90,50,10,0)')
  c.fillStyle = g
  c.fillRect(0, 0, size, size)
  shadowSprite = canvas
  return shadowSprite
}

export function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  groundY: number,
): void {
  const gap = Math.max(0, groundY - (y + r))
  const t = Math.max(0, 1 - gap / (r * 3))
  if (t <= 0.02) return
  const s = getShadowSprite()
  if (!s) return
  const rx = r * (0.55 + 0.45 * t)
  const ry = r * (0.12 + 0.12 * t)
  ctx.save()
  ctx.globalAlpha = 0.3 * t
  ctx.drawImage(s, x - rx, groundY - 2 - ry, rx * 2, ry * 2)
  ctx.restore()
}

/** Küçük önizleme (sıradaki / en büyük meyve) için tek meyve çizer. */
export function drawFruitPreview(canvas: HTMLCanvasElement, tier: number, pad = 3, golden = false): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const size = canvas.clientWidth || 40
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  drawFruit(ctx, FRUITS[tier], size / 2, size / 2, size / 2 - pad, { look: { x: 0, y: 0.3 }, golden })
}
