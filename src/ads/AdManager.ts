export type RewardedAdType =
  | 'double_income'
  | 'offline_bonus'
  | 'lucky_chest'
  | 'restore_event'
  | 'mission_double'
  | 'weekly_double'
  | 'stock_hint'
  | 'manager_discount'
  | 'season_xp'
  | 'heat_shield'
  | 'shop_boost_15m'
  | 'upgrade_discount'
  | 'golden_event'
  | 'bankruptcy_recovery'

export interface AdRewardResult {
  success: boolean
  type: RewardedAdType
  reason?: string
}

export interface IAdProvider {
  showRewarded(type: RewardedAdType): Promise<boolean>
  showInterstitial(): Promise<boolean>
  showBanner(container: HTMLElement): void
  hideBanner(): void
}

/** Orta reklam sıklığı — ödüllü reklamlar arası minimum bekleme */
const REWARDED_COOLDOWN_MS = 90_000
const DAILY_REWARDED_LIMIT = 18
const INTERSTITIAL_COOLDOWN_MS = 5 * 60_000
const MAX_INTERSTITIALS_PER_SESSION = 8

class MockAdProvider implements IAdProvider {
  async showRewarded(_type: RewardedAdType): Promise<boolean> {
    return showMockAdModal('Ödüllü reklam izleniyor...', 2000)
  }

  async showInterstitial(): Promise<boolean> {
    return showMockAdModal('Ara reklam gösteriliyor...', 1500)
  }

  showBanner(container: HTMLElement): void {
    container.replaceChildren()
    container.hidden = true
  }

  hideBanner(): void {
    // noop for mock
  }
}

class CapacitorAdProvider implements IAdProvider {
  private initialized = false

  private async ensureInit(): Promise<void> {
    if (this.initialized) return
    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')
      const appId = import.meta.env.VITE_ADMOB_APP_ID
      if (appId) {
        await AdMob.initialize({ initializeForTesting: import.meta.env.DEV })
      }
      this.initialized = true
      void RewardAdPluginEvents
    } catch (err) {
      console.warn('AdMob initialization failed', err)
    }
  }

  async showRewarded(type: RewardedAdType): Promise<boolean> {
    await this.ensureInit()
    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob')
      const unitId = import.meta.env.VITE_ADMOB_REWARDED_ID
      if (!unitId) return new MockAdProvider().showRewarded(type)

      await AdMob.prepareRewardVideoAd({ adId: unitId, isTesting: import.meta.env.DEV })
      return new Promise((resolve) => {
        let rewarded = false
        const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true
        })
        const dismissListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          Promise.all([rewardListener, dismissListener])
            .then(([r, d]) => Promise.all([r.remove(), d.remove()]))
            .catch((err) => console.warn('AdMob listener cleanup failed', err))
            .finally(() => resolve(rewarded))
        })
        void AdMob.showRewardVideoAd()
      })
    } catch {
      return new MockAdProvider().showRewarded(type)
    }
  }

  async showInterstitial(): Promise<boolean> {
    await this.ensureInit()
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      const unitId = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID
      if (!unitId) return new MockAdProvider().showInterstitial()
      await AdMob.prepareInterstitial({ adId: unitId, isTesting: import.meta.env.DEV })
      await AdMob.showInterstitial()
      return true
    } catch {
      return new MockAdProvider().showInterstitial()
    }
  }

  showBanner(container: HTMLElement): void {
    void this.ensureInit().then(async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob')
        const unitId = import.meta.env.VITE_ADMOB_BANNER_ID
        if (!unitId) {
          new MockAdProvider().showBanner(container)
          return
        }
        container.replaceChildren()
        await AdMob.showBanner({
          adId: unitId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          isTesting: import.meta.env.DEV,
        })
      } catch {
        new MockAdProvider().showBanner(container)
      }
    })
  }

  hideBanner(): void {
    void import('@capacitor-community/admob')
      .then(({ AdMob }) => AdMob.hideBanner())
      .catch(() => {})
  }
}

export class AdManager {
  private provider: IAdProvider
  private lastRewardedAt = 0
  private lastInterstitialAt = 0
  private interstitialCount = 0
  private rewardedToday = 0
  private rewardedDay = todayKey()
  private adsRemoved = false

  constructor(useCapacitor = isCapacitorNative()) {
    this.provider = useCapacitor ? new CapacitorAdProvider() : new MockAdProvider()
  }

  /** remove_ads IAP — banner + interstitial kapatılır; ödüllü reklamlar isteğe bağlı kalır */
  setAdsRemoved(removed: boolean): void {
    this.adsRemoved = removed
    if (removed) this.hideBanner()
  }

  isAdsRemoved(): boolean {
    return this.adsRemoved
  }

  syncRewardedCount(count: number, day: string): void {
    this.rewardedToday = count
    this.rewardedDay = day
  }

  canShowRewarded(): { ok: boolean; reason?: string } {
    const today = todayKey()
    if (this.rewardedDay !== today) {
      this.rewardedDay = today
      this.rewardedToday = 0
    }
    if (Date.now() - this.lastRewardedAt < REWARDED_COOLDOWN_MS) {
      const sec = Math.ceil((REWARDED_COOLDOWN_MS - (Date.now() - this.lastRewardedAt)) / 1000)
      return { ok: false, reason: `${sec} sn bekle` }
    }
    if (this.rewardedToday >= DAILY_REWARDED_LIMIT) {
      return { ok: false, reason: 'Günlük limit doldu' }
    }
    return { ok: true }
  }

  canShowInterstitial(): boolean {
    if (this.interstitialCount >= MAX_INTERSTITIALS_PER_SESSION) return false
    return Date.now() - this.lastInterstitialAt >= INTERSTITIAL_COOLDOWN_MS
  }

  hasBannerPlacement(): boolean {
    return false
  }

  async showRewarded(type: RewardedAdType): Promise<AdRewardResult> {
    const check = this.canShowRewarded()
    if (!check.ok) return { success: false, type, reason: check.reason }

    const watched = await this.provider.showRewarded(type)
    if (!watched) return { success: false, type, reason: 'Reklam tamamlanmadı' }

    this.lastRewardedAt = Date.now()
    this.rewardedToday++
    return { success: true, type }
  }

  async showInterstitial(): Promise<boolean> {
    if (this.adsRemoved) return false
    if (!this.canShowInterstitial()) return false
    const shown = await this.provider.showInterstitial()
    if (shown) {
      this.lastInterstitialAt = Date.now()
      this.interstitialCount++
    }
    return shown
  }

  showBanner(container: HTMLElement): void {
    if (!this.hasBannerPlacement()) {
      container.replaceChildren()
      container.hidden = true
      return
    }
    container.hidden = false
    this.provider.showBanner(container)
  }

  hideBanner(): void {
    this.provider.hideBanner()
  }

  getRewardedCountToday(): number {
    return this.rewardedToday
  }
}

function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && 'Capacitor' in window &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function showMockAdModal(message: string, durationMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'ad-modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'ad-modal'

    const text = document.createElement('p')
    text.textContent = message

    const bar = document.createElement('div')
    bar.className = 'ad-modal-bar'
    const fill = document.createElement('div')
    fill.className = 'ad-modal-bar-fill'
    bar.appendChild(fill)

    modal.append(text, bar)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    fill.animate([{ width: '0%' }, { width: '100%' }], { duration: durationMs, fill: 'forwards' })

    window.setTimeout(() => {
      overlay.remove()
      resolve(true)
    }, durationMs)
  })
}
