export class ParticleSystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private raf: number | null = null
  private maxParticles = 50
  private resizeHandler: () => void

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'particle-canvas'
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    this.ctx = ctx
    container.appendChild(this.canvas)
    this.resizeHandler = () => this.resize()
    this.resize()
    window.addEventListener('resize', this.resizeHandler)
  }

  private resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (!rect) return
    this.canvas.width = rect.width
    this.canvas.height = rect.height
  }

  spawnCoins(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 4,
        life: 1,
        color: '#ffd54a',
        size: 4 + Math.random() * 4,
        type: 'coin',
      })
    }
    this.startLoop()
  }

  spawnCritical(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color: '#ff6b6b',
        size: 3 + Math.random() * 5,
        type: 'burst',
      })
    }
    this.startLoop()
  }

  spawnConfetti(): void {
    const w = this.canvas.width
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break
      this.particles.push({
        x: Math.random() * w,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        life: 1,
        color: ['#ffd54a', '#4ade80', '#60a5fa', '#f472b6'][i % 4]!,
        size: 4 + Math.random() * 3,
        type: 'confetti',
      })
    }
    this.startLoop()
  }

  spawnPurchasePulse(): void {
    const cx = this.canvas.width / 2
    const cy = this.canvas.height / 2
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos((i / 6) * Math.PI * 2) * 3,
        vy: Math.sin((i / 6) * Math.PI * 2) * 3,
        life: 1,
        color: '#4ade80',
        size: 6,
        type: 'burst',
      })
    }
    this.startLoop()
  }

  spawnMoneyToHeader(): void {
    const cx = this.canvas.width / 2
    const cy = this.canvas.height * 0.6
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy,
        vx: (Math.random() - 0.5) * 2,
        vy: -4 - Math.random() * 3,
        life: 1,
        color: '#4ade80',
        size: 5,
        type: 'coin',
      })
    }
    this.startLoop()
  }

  private startLoop(): void {
    if (this.raf !== null) return
    const tick = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.particles = this.particles.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.type === 'confetti' ? 0.05 : 0.15
        p.life -= 0.02
        if (p.life <= 0) return false
        this.ctx.globalAlpha = p.life
        this.ctx.fillStyle = p.color
        if (p.type === 'coin') {
          this.ctx.beginPath()
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          this.ctx.fill()
        } else {
          this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        }
        return true
      })
      this.ctx.globalAlpha = 1
      if (this.particles.length > 0) {
        this.raf = requestAnimationFrame(tick)
      } else {
        this.raf = null
      }
    }
    this.raf = requestAnimationFrame(tick)
  }

  destroy(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resizeHandler)
    this.canvas.remove()
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  type: 'coin' | 'burst' | 'confetti'
}
