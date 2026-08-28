/**
 * WebAudio ile üretilen minik ses efektleri — harici dosya yok.
 * Ses kapalıysa hiç AudioContext açılmaz.
 */

import { storageGet, storageSet } from './storage'

const STORAGE_KEY = 'fm_sound'

export class Sfx {
  private ctx: AudioContext | null = null
  enabled: boolean

  constructor() {
    this.enabled = storageGet(STORAGE_KEY) !== '0'
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    storageSet(STORAGE_KEY, this.enabled ? '1' : '0')
    if (!this.enabled) this.ctx?.suspend()
    return this.enabled
  }

  private ac(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
    const ac = this.ac()
    if (!ac) return
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ac.currentTime)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur)
    g.gain.setValueAtTime(gain, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
    osc.connect(g).connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + dur + 0.02)
  }

  drop(): void {
    this.tone(220, 0.08, 'sine', 0.08, 140)
  }

  merge(tier: number, combo = 1): void {
    // Combo yükseldikçe perde tırmanır — zincir hissi
    const base = (300 + tier * 55) * Math.pow(1.09, Math.max(0, combo - 1))
    this.tone(base, 0.12, 'triangle', 0.12, base * 1.6)
    setTimeout(() => this.tone(base * 1.5, 0.1, 'sine', 0.08), 55)
  }

  watermelon(): void {
    const notes = [523, 659, 784, 1046]
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.22, 'triangle', 0.14), i * 90))
  }

  gameOver(): void {
    this.tone(320, 0.5, 'sawtooth', 0.1, 90)
  }
}
