export type AmbientMode = 'day' | 'night' | 'crisis' | 'idle'

export class SoundManager {
  private ctx: AudioContext | null = null
  private enabled = true
  private ambientMode: AmbientMode = 'idle'
  private ambientOsc: OscillatorNode | null = null
  private ambientGain: GainNode | null = null
  private lastComboPitch = 0

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.stopAmbient()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume()
  }

  /** Tok, tatmin edici tık — para sesi değil */
  playClick(critical = false, combo = 1): void {
    if (!this.enabled) return
    const base = 180 + Math.min(combo, 30) * 8
    this.thump(base, critical ? 0.14 : 0.1, critical ? 0.07 : 0.045)
    if (combo >= 10 && combo % 5 === 0) {
      this.beep(base * 1.5, 0.06, 0.06, 'triangle')
    }
    if (combo >= 25) this.playComboMelody()
  }

  playComboMelody(): void {
    if (!this.enabled) return
    ;[523, 659, 784, 988].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.08, 0.08, 'sine'), i * 55)
    })
  }

  playPurchase(): void {
    if (!this.enabled) return
    ;[880, 1175, 1318].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.12, 0.09, 'triangle'), i * 45)
    })
  }

  playPrestige(): void {
    if (!this.enabled) return
    ;[392, 494, 587, 784, 988, 1175].forEach((freq, i) => {
      window.setTimeout(() => this.beep(freq, 0.2, 0.12, 'sine'), i * 85)
    })
  }

  playDeath(): void {
    if (!this.enabled) return
    ;[220, 165, 130, 98].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.35, 0.14, 'sawtooth'), i * 120)
    })
  }

  playLegendaryChest(): void {
    if (!this.enabled) return
    ;[440, 554, 659, 880, 1108, 1318].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.15, 0.1, 'triangle'), i * 65)
    })
  }

  playReward(): void {
    if (!this.enabled) return
    ;[660, 880, 1100].forEach((freq, i) => {
      window.setTimeout(() => this.beep(freq, 0.1, 0.1), i * 80)
    })
  }

  playCombo(combo: number): void {
    if (!this.enabled || combo < 10) return
    const freq = 400 + Math.min(combo, 30) * 15
    if (Math.abs(freq - this.lastComboPitch) > 20) {
      this.lastComboPitch = freq
      this.beep(freq, 0.1, 0.08, 'triangle')
    }
  }

  playEvent(): void {
    if (!this.enabled) return
    ;[880, 1175].forEach((f, i) => window.setTimeout(() => this.beep(f, 0.1, 0.1), i * 70))
  }

  playAchievement(): void {
    if (!this.enabled) return
    ;[523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 0.14, 0.11), i * 75)
    })
  }

  playDisaster(): void {
    if (!this.enabled) return
    this.thump(80, 0.25, 0.12)
    window.setTimeout(() => this.thump(60, 0.3, 0.1), 150)
  }

  setAmbient(mode: AmbientMode): void {
    if (!this.enabled) return
    if (mode === this.ambientMode && this.ambientOsc) return
    this.ambientMode = mode
    this.stopAmbient()
    if (mode === 'idle') return
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const configs: Record<AmbientMode, { freq: number; vol: number }> = {
        day: { freq: 220, vol: 0.015 },
        night: { freq: 165, vol: 0.01 },
        crisis: { freq: 130, vol: 0.018 },
        idle: { freq: 0, vol: 0 },
      }
      const cfg = configs[mode]
      osc.frequency.value = cfg.freq
      gain.gain.value = cfg.vol
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      this.ambientOsc = osc
      this.ambientGain = gain
    } catch {
      // audio unavailable
    }
  }

  stopAmbient(): void {
    try {
      this.ambientOsc?.stop()
      this.ambientOsc?.disconnect()
      this.ambientGain?.disconnect()
    } catch { /* noop */ }
    this.ambientOsc = null
    this.ambientGain = null
  }

  private thump(frequency: number, duration: number, volume: number): void {
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, ctx.currentTime + duration)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    } catch { /* noop */ }
  }

  private beep(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ): void {
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    } catch { /* noop */ }
  }
}
