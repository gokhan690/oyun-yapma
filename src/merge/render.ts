/**
 * Canvas çizim yardımcıları — meyveler prosedürel çizilir, dosya/asset yok.
 */

import type { FruitDef } from './fruits'
import { FRUITS } from './fruits'

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  def: FruitDef,
  x: number,
  y: number,
  r: number,
  angle: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // Gövde
  const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.1, 0, 0, r)
  grad.addColorStop(0, def.light)
  grad.addColorStop(0.55, def.color)
  grad.addColorStop(1, def.shade)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  drawDeco(ctx, def, r)

  // Parlama
  ctx.globalAlpha = 0.45
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(-r * 0.34, -r * 0.4, r * 0.24, r * 0.16, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  drawFace(ctx, r)

  // Kenar çizgisi
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'
  ctx.lineWidth = Math.max(1, r * 0.045)
  ctx.beginPath()
  ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function drawDeco(ctx: CanvasRenderingContext2D, def: FruitDef, r: number): void {
  switch (def.deco) {
    case 'cherry':
    case 'apple':
      // Sap + yaprak
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
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
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
  ctx.fillStyle = '#4ea64e'
  ctx.beginPath()
  ctx.ellipse(0, 0, size, size * 0.45, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFace(ctx: CanvasRenderingContext2D, r: number): void {
  const ex = r * 0.3
  const ey = -r * 0.02
  ctx.fillStyle = '#2b2118'
  ctx.beginPath()
  ctx.ellipse(-ex, ey, r * 0.085, r * 0.11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(ex, ey, r * 0.085, r * 0.11, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(-ex + r * 0.03, ey - r * 0.04, r * 0.03, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex + r * 0.03, ey - r * 0.04, r * 0.03, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#2b2118'
  ctx.lineWidth = Math.max(1, r * 0.055)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, r * 0.12, r * 0.2, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.stroke()

  // Yanaklar
  ctx.fillStyle = 'rgba(255,120,120,0.28)'
  ctx.beginPath()
  ctx.arc(-ex - r * 0.16, r * 0.2, r * 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex + r * 0.16, r * 0.2, r * 0.11, 0, Math.PI * 2)
  ctx.fill()
}

/** Küçük önizleme (sıradaki meyve, evrim şeridi) için tek meyve çizer. */
export function drawFruitPreview(canvas: HTMLCanvasElement, tier: number, pad = 3): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const size = canvas.clientWidth || 40
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  drawFruit(ctx, FRUITS[tier], size / 2, size / 2, size / 2 - pad, 0)
}
