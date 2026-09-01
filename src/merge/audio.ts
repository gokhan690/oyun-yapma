/**
 * Ses — hepsi WebAudio ile anlık üretilir, dosya yok.
 *
 * Gerçekçilik için iki katman var: gövde sesi (filtrelenmiş gürültü —
 * meyvenin "pat" diye düşmesi, ezilmesi) ve üstüne binen kısa ton
 * (birleşmenin ödül hissi). Meyve büyüdükçe ses kalınlaşır.
 */

import { storageGet, storageSet } from './storage'

const STORAGE_KEY = 'fm_sound'

export class Sfx {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null
  private master: GainNode | null = null
  private lastImpact = 0
  enabled: boolean

  constructor() {
    this.enabled = storageGet(STORAGE_KEY) !== '0'
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    storageSet(STORAGE_KEY, this.enabled ? '1' : '0')
    if (!this.enabled) void this.ctx?.suspend()
    else void this.ctx?.resume()
    return this.enabled
  }

  private ac(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.ctx = new Ctor()
      } catch {
        return null
      }
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)

      // Bir saniyelik beyaz gürültü — darbe ve sıçrama sesleri buradan üretilir
      const len = Math.floor(this.ctx.sampleRate * 0.6)
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this.noise = buf
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0): void {
    const ac = this.ac()
    if (!ac || !this.master) return
    const t0 = ac.currentTime + delay
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  }

  /** Filtrelenmiş gürültü patlaması — "pat", "şap" gibi gövde sesleri. */
  private burst(freq: number, dur: number, gain: number, q = 1.2, type: BiquadFilterType = 'bandpass'): void {
    const ac = this.ac()
    if (!ac || !this.master || !this.noise) return
    const t0 = ac.currentTime
    const src = ac.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = ac.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t0)
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.45), t0 + dur)
    filter.Q.value = q
    const g = ac.createGain()
    g.gain.setValueAtTime(gain, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
    src.stop(t0 + dur + 0.02)
  }

  /** Meyve elden bırakılırken kısa hava sesi. */
  drop(): void {
    this.burst(1800, 0.07, 0.05, 0.8, 'highpass')
  }

  /**
   * Çarpma. Büyük meyve = kalın ve gür; küçük meyve = ince ve kısa.
   * Aynı karede yığılmasın diye en fazla 60 ms'de bir çalar.
   */
  impact(strength: number, tier: number, ground: boolean): void {
    const now = performance.now()
    if (now - this.lastImpact < 60) return
    this.lastImpact = now
    const size = tier / 10
    const freq = 520 - size * 330
    const gain = Math.min(0.22, 0.05 + strength * 0.2) * (ground ? 1 : 0.75)
    this.burst(freq, 0.09 + size * 0.09, gain, 1.4, 'lowpass')
    if (strength > 0.45) this.tone(90 + (1 - size) * 60, 0.09, 'sine', gain * 0.5, 45)
  }

  /** Birleşme: sulu bir "şlap" + combo ile tırmanan ton. */
  merge(tier: number, combo = 1): void {
    const size = tier / 10
    this.burst(900 - size * 420, 0.13, 0.13, 2.2)
    const base = (300 + tier * 55) * Math.pow(1.09, Math.max(0, combo - 1))
    this.tone(base, 0.12, 'triangle', 0.1, base * 1.6)
    this.tone(base * 1.5, 0.09, 'sine', 0.06, undefined, 0.055)
  }

  /** Karpuz birleşmesi — küçük bir fanfar. */
  watermelon(): void {
    this.burst(300, 0.35, 0.2, 1.6, 'lowpass')
    const notes = [523, 659, 784, 1046]
    notes.forEach((n, i) => this.tone(n, 0.24, 'triangle', 0.12, undefined, i * 0.09))
  }

  /** Bomba. */
  boom(): void {
    this.burst(240, 0.4, 0.24, 0.9, 'lowpass')
    this.tone(140, 0.3, 'sawtooth', 0.1, 40)
  }

  /** Meyve takası. */
  swap(): void {
    this.tone(520, 0.08, 'sine', 0.07, 760)
    this.tone(760, 0.08, 'sine', 0.06, 520, 0.06)
  }

  gameOver(): void {
    this.burst(500, 0.5, 0.14, 0.8, 'lowpass')
    const notes = [392, 349, 294, 233]
    notes.forEach((n, i) => this.tone(n, 0.3, 'triangle', 0.1, undefined, i * 0.13))
  }
}
