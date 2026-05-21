export class SoundManager {
  private ctx: AudioContext | null = null
  private enabled = true

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume()
  }

  playClick(critical = false): void {
    if (!this.enabled) return
    this.beep(critical ? 880 : 520, 0.05, critical ? 0.16 : 0.09)
  }

  playPurchase(): void {
    if (!this.enabled) return
    this.beep(523, 0.08, 0.12)
    window.setTimeout(() => this.beep(659, 0.08, 0.1), 60)
  }

  playPrestige(): void {
    if (!this.enabled) return
    ;[392, 494, 587, 784, 988].forEach((freq, i) => {
      window.setTimeout(() => this.beep(freq, 0.18, 0.11), i * 90)
    })
  }

  playReward(): void {
    if (!this.enabled) return
    ;[660, 880, 1100].forEach((freq, i) => {
      window.setTimeout(() => this.beep(freq, 0.1, 0.1), i * 80)
    })
  }

  playCombo(combo: number): void {
    if (!this.enabled) return
    const freq = combo >= 30 ? 988 : combo >= 15 ? 784 : 659
    this.beep(freq, 0.12, 0.12)
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

  private beep(frequency: number, duration: number, volume: number): void {
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {
      // audio unavailable
    }
  }
}
