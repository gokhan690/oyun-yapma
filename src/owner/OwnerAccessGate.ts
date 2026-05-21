import { ownerAccessCode } from './OwnerSecrets'

/** Gizli Baron konsolu — profil bas + kod veya başlık tıklama. */
export class OwnerAccessGate {
  private armed = false
  private armTimer: number | null = null
  private titleTaps = 0
  private titleTimer: number | null = null
  private keyBuffer = ''
  private keyTimer: number | null = null

  private static readonly ARM_MS = 10_000
  private static readonly TITLE_TAPS = 15
  private static readonly TITLE_WINDOW_MS = 2200
  private static readonly KEY_WINDOW_MS = 3500

  get isArmed(): boolean {
    return this.armed
  }

  canArm(): boolean {
    return ownerAccessCode().length >= 4
  }

  arm(): void {
    if (!this.canArm()) return
    this.armed = true
    this.titleTaps = 0
    this.keyBuffer = ''
    if (this.armTimer !== null) window.clearTimeout(this.armTimer)
    this.armTimer = window.setTimeout(() => this.disarm(), OwnerAccessGate.ARM_MS)
  }

  disarm(): void {
    this.armed = false
    this.titleTaps = 0
    this.keyBuffer = ''
    if (this.armTimer !== null) {
      window.clearTimeout(this.armTimer)
      this.armTimer = null
    }
    if (this.titleTimer !== null) {
      window.clearTimeout(this.titleTimer)
      this.titleTimer = null
    }
    if (this.keyTimer !== null) {
      window.clearTimeout(this.keyTimer)
      this.keyTimer = null
    }
  }

  registerTitleTap(): boolean {
    if (!this.armed) return false
    this.titleTaps++
    if (this.titleTimer !== null) window.clearTimeout(this.titleTimer)
    this.titleTimer = window.setTimeout(() => { this.titleTaps = 0 }, OwnerAccessGate.TITLE_WINDOW_MS)
    if (this.titleTaps >= OwnerAccessGate.TITLE_TAPS) {
      this.disarm()
      return true
    }
    return false
  }

  registerKey(key: string): boolean {
    if (!this.armed || key.length !== 1 || !/[a-z0-9]/i.test(key)) return false
    const secret = ownerAccessCode()
    if (!secret) return false
    this.keyBuffer += key.toLowerCase()
    if (this.keyTimer !== null) window.clearTimeout(this.keyTimer)
    this.keyTimer = window.setTimeout(() => { this.keyBuffer = '' }, OwnerAccessGate.KEY_WINDOW_MS)
    if (this.keyBuffer.endsWith(secret)) {
      this.disarm()
      return true
    }
    return false
  }
}
