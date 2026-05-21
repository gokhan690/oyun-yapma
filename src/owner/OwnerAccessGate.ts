/** Gizli Baron konsolu — önce profil chip'e 3 sn basılı tut, sonra kod veya tıklama. */
export class OwnerAccessGate {
  private armed = false
  private armTimer: number | null = null
  private titleTaps = 0
  private titleTimer: number | null = null
  private keyBuffer = ''
  private keyTimer: number | null = null

  private static readonly ARM_MS = 12_000
  private static readonly TITLE_TAPS = 12
  private static readonly TITLE_WINDOW_MS = 2500
  private static readonly SECRET = 'imparator'
  private static readonly KEY_WINDOW_MS = 4000

  get isArmed(): boolean {
    return this.armed
  }

  /** Profil chip 3 sn basılı tutulunca çağrılır. */
  arm(): void {
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

  /** Sadece silahlandırılmış modda; başlık metnine hızlı tıklama. */
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

  /** Sadece silahlandırılmış modda; klavyede gizli kelime. */
  registerKey(key: string): boolean {
    if (!this.armed || key.length !== 1 || !/[a-z]/i.test(key)) return false
    this.keyBuffer += key.toLowerCase()
    if (this.keyTimer !== null) window.clearTimeout(this.keyTimer)
    this.keyTimer = window.setTimeout(() => { this.keyBuffer = '' }, OwnerAccessGate.KEY_WINDOW_MS)
    if (this.keyBuffer.endsWith(OwnerAccessGate.SECRET)) {
      this.disarm()
      return true
    }
    return false
  }
}
