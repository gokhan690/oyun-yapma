import type { GameState } from '../../game/GameState'
import type { AdManager, RewardedAdType } from '../../ads/AdManager'
import { fmtMoney, refToast } from './refShared'
import { i18n } from '../../i18n'

/**
 * RefApp reward kuyruğu — legacy HUD'un offline/comeback/daily/bankruptcy claim
 * akışlarını integration RefApp mimarisine taşır. Tek seferde tek modal gösterir;
 * sonraki ödül kuyruğa girer.
 *
 * State mutation'ın TEK kaynağı mevcut GameState metotlarıdır (claimOfflineViaAd,
 * claimComebackViaAd, claimDailyReward, claimBankruptcyRecovery). UI yalnız
 * kullanıcının onayını/ad izlemesini toplar ve doğru metodu BİR kez çağırır.
 *
 * Reload güvenliği: her başarılı claim sonrası onClaimed() çağrılır (refresh +
 * persist). comeback/daily/bankruptcy bayrakları serialize edilir; offline
 * transient olduğundan claim sonrası para kaydedilir ve lastSaveTime ilerler →
 * yeniden hesaplanıp çift verilmez.
 */
export type RewardId = 'offline' | 'comeback' | 'daily' | 'bankruptcy'

interface RewardSpec {
  id: RewardId
  emoji: string
  title: string
  amount: number
  settlementAt?: number
  desc: string
  warn?: string
  primaryLabel: string
  /** Tanımlıysa claim reklam izlendikten sonra yapılır. */
  ad?: RewardedAdType
  /** GameState claim metodu — verilen tutarı döndürür (0 = zaten alınmış). */
  claim: (settlementAt?: number) => number
  /** Açık "vazgeç" aksiyonu (yalnız bankruptcy). X ile kapatma ödülü SİLMEZ. */
  discard?: { label: string; run: () => void }
  onShown?: () => void
}

export class RefRewardQueue {
  private queue: RewardId[] = []
  private overlay: HTMLElement | null = null
  private offlineBanner: HTMLElement | null = null
  private comebackBanner: HTMLElement | null = null
  /** Reklam beklerken ikinci aksiyonu engeller (çift claim koruması). */
  private busy = false
  private destroyed = false
  private readonly state: GameState
  private readonly ads: AdManager
  /** Başarılı claim/discard sonrası: aktif sayfayı tazele + kaydet. */
  private readonly onClaimed: () => void
  /** Kuyruk tamamen boşalınca bir kez çağrılır (sonraki modal sistemine devir). */
  private readonly onAllDone?: () => void
  private allDoneFired = false

  constructor(state: GameState, ads: AdManager, onClaimed: () => void, onAllDone?: () => void) {
    this.state = state
    this.ads = ads
    this.onClaimed = onClaimed
    this.onAllDone = onAllDone
  }

  /** Bootstrap sonrası bir kez çağrılır. Pending ödülleri sıraya alır. */
  start(): void {
    if (this.destroyed) return
    const order: RewardId[] = ['offline', 'comeback', 'daily', 'bankruptcy']
    for (const id of order) {
      if (this.isPending(id) && !this.queue.includes(id)) this.queue.push(id)
    }
    this.pump()
  }

  private isPending(id: RewardId): boolean {
    switch (id) {
      case 'offline':    return this.state.shouldPresentOfflineReward()
      case 'comeback':   return this.state.shouldPresentComeback()
      case 'daily':      return this.state.canClaimDaily() && this.state.canShowDailyRewardPrompt()
      case 'bankruptcy': return this.state.hasPendingBankruptcyRecovery()
    }
  }

  private pump(): void {
    if (this.destroyed || this.overlay) return
    let next = this.queue.shift()
    // Sıraya alındıktan sonra state değişmiş olabilir — yeniden doğrula.
    while (next && !this.isPending(next)) next = this.queue.shift()
    if (!next) {
      if (this.state.hasPendingOfflineReward()) this.showOfflineClaimBanner()
      if (this.state.hasPendingComeback()) this.showComebackClaimBanner()
      // Kuyruk boş → bir sonraki modal sistemine (karar modalları) devret.
      if (!this.allDoneFired) {
        this.allDoneFired = true
        this.onAllDone?.()
      }
      return
    }
    this.render(this.specFor(next, true))
  }

  private specFor(id: RewardId, autoPresent = false): RewardSpec {
    const s = this.state
    switch (id) {
      case 'offline':
        return {
          id, emoji: '💰', title: i18n.t('ref_reward_offline_title'),
          amount: s.pendingOfflineEarnings,
          settlementAt: s.offlineRewardSettlementAt ?? 0,
          desc: i18n.t('ref_reward_offline_desc'),
          primaryLabel: i18n.t('ref_reward_offline_btn'),
          ad: 'offline_bonus',
          claim: (settlementAt) => s.claimOfflineReward(settlementAt ?? 0, 1),
          onShown: autoPresent
            ? () => {
                if (s.markOfflineRewardPresented()) this.onClaimed()
              }
            : undefined,
        }
      case 'comeback':
        return {
          id, emoji: '🎁', title: i18n.t('ref_reward_comeback_title'),
          amount: s.comebackPending,
          desc: i18n.t('ref_reward_comeback_desc'),
          primaryLabel: i18n.t('ref_reward_comeback_btn'),
          ad: 'offline_bonus',
          claim: () => s.claimComebackViaAd(1),
          onShown: autoPresent
            ? () => {
                if (s.markComebackPresented()) this.onClaimed()
              }
            : undefined,
        }
      case 'daily': {
        const warn = s.peekDailyStreakReset()
          ? i18n.t('ref_reward_daily_streak_reset')
          : undefined
        return {
          id, emoji: '🗓️', title: i18n.t('ref_reward_daily_title'),
          amount: s.dailyLoginRewardPreview(),
          desc: i18n.t('ref_reward_daily_desc'),
          warn,
          primaryLabel: i18n.t('ref_reward_daily_btn'),
          claim: () => s.claimDailyReward(),
        }
      }
      case 'bankruptcy':
        return {
          id, emoji: '⚠️', title: i18n.t('ref_reward_bankruptcy_title'),
          amount: s.bankruptcyRecoveryPreview(1),
          desc: i18n.t('ref_reward_bankruptcy_desc'),
          primaryLabel: i18n.t('ref_reward_bankruptcy_btn'),
          ad: 'bankruptcy_recovery',
          claim: () => s.claimBankruptcyRecovery(1),
          discard: { label: i18n.t('ref_reward_discard'), run: () => s.discardBankruptcyRecovery() },
        }
    }
  }

  private render(spec: RewardSpec): void {
    const overlay = document.createElement('div')
    const settlementAttr = spec.settlementAt != null ? String(spec.settlementAt) : ''
    overlay.className = 'ref-reward-overlay'
    overlay.innerHTML = `
      <div class="ref-reward-card" role="dialog" aria-modal="true">
        <button class="ref-reward-close" type="button" aria-label="${i18n.t('ref_reward_close')}">✕</button>
        <div class="ref-reward-emoji">${spec.emoji}</div>
        <h2 class="ref-reward-title">${spec.title}</h2>
        <div class="ref-reward-amount">${fmtMoney(spec.amount)}</div>
        <p class="ref-reward-desc">${spec.desc}</p>
        ${spec.warn ? `<p class="ref-reward-warn">⚠️ ${spec.warn}</p>` : ''}
        <button class="ref-reward-primary" type="button" data-reward-id="${spec.id}" data-settlement-at="${settlementAttr}">${spec.primaryLabel}</button>
        ${spec.discard ? `<button class="ref-reward-discard" type="button">${spec.discard.label}</button>` : ''}
      </div>
    `
    this.overlay = overlay
    document.body.appendChild(overlay)
    spec.onShown?.()

    const primary = overlay.querySelector<HTMLButtonElement>('.ref-reward-primary')!
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.ref-reward-close')!
    const discardBtn = overlay.querySelector<HTMLButtonElement>('.ref-reward-discard')

    // X ile kapatma: ödülü SİLMEZ; pending kalır, sonraki açılışta yeniden sunulur.
    closeBtn.addEventListener('click', () => {
      if (this.busy) return
      this.close()
    })

    discardBtn?.addEventListener('click', () => {
      if (this.busy) return
      spec.discard!.run()
      this.onClaimed()
      this.close()
    })

    primary.addEventListener('click', () => { void this.handlePrimary(spec, primary) })
  }

  private showOfflineClaimBanner(): void {
    const settlementAt = this.state.offlineRewardSettlementAt
    if (
      this.destroyed
      || this.offlineBanner
      || this.overlay
      || !this.state.hasPendingOfflineReward()
      || settlementAt == null
    ) return

    const banner = document.createElement('div')
    banner.className = 'ref-rival-offer-banner'
    banner.style.position = 'fixed'
    banner.style.left = '50%'
    banner.style.bottom = 'calc(78px + env(safe-area-inset-bottom))'
    banner.style.width = 'min(420px, calc(100vw - 28px))'
    banner.style.margin = '0'
    banner.style.transform = 'translateX(-50%)'
    banner.style.zIndex = '3100'
    banner.innerHTML = `
      <div class="ref-rival-offer-banner__head">&#128176; ${i18n.t('ref_reward_offline_title')}</div>
      <div class="ref-rival-offer-banner__msg">${i18n.t('ref_reward_offline_desc')} ${fmtMoney(this.state.pendingOfflineEarnings)}</div>
      <div class="ref-rival-offer-banner__actions">
        <button class="ref-world-btn" type="button" data-action="claim_offline_reward" data-settlement-at="${settlementAt}">${i18n.t('ref_reward_offline_btn')}</button>
      </div>`
    banner.querySelector<HTMLButtonElement>('[data-action="claim_offline_reward"]')?.addEventListener('click', () => {
      if (
        !this.state.hasPendingOfflineReward()
        || this.state.offlineRewardSettlementAt !== settlementAt
        || this.overlay
        || document.querySelector('.ref-decision-overlay')
      ) return
      this.clearOfflineBanner()
      this.render(this.specFor('offline'))
    })
    this.offlineBanner = banner
    document.body.appendChild(banner)
  }

  private showComebackClaimBanner(): void {
    if (this.destroyed || this.comebackBanner || this.overlay || !this.state.hasPendingComeback()) return
    const banner = document.createElement('div')
    banner.className = 'ref-rival-offer-banner'
    banner.style.position = 'fixed'
    banner.style.left = '50%'
    banner.style.bottom = 'calc(78px + env(safe-area-inset-bottom))'
    banner.style.width = 'min(420px, calc(100vw - 28px))'
    banner.style.margin = '0'
    banner.style.transform = 'translateX(-50%)'
    banner.style.zIndex = '3100'
    banner.innerHTML = `
      <div class="ref-rival-offer-banner__head">🎁 ${i18n.t('ref_reward_comeback_title')}</div>
      <div class="ref-rival-offer-banner__msg">${i18n.t('ref_reward_comeback_desc')}</div>
      <div class="ref-rival-offer-banner__actions">
        <button class="ref-world-btn" type="button" data-action="claim_comeback">${i18n.t('ref_reward_comeback_btn')}</button>
      </div>`
    banner.querySelector<HTMLButtonElement>('[data-action="claim_comeback"]')?.addEventListener('click', () => {
      if (!this.state.hasPendingComeback() || this.overlay || document.querySelector('.ref-decision-overlay')) return
      this.clearComebackBanner()
      this.render(this.specFor('comeback'))
    })
    this.comebackBanner = banner
    document.body.appendChild(banner)
  }

  private clearComebackBanner(): void {
    this.comebackBanner?.remove()
    this.comebackBanner = null
  }

  private clearOfflineBanner(): void {
    this.offlineBanner?.remove()
    this.offlineBanner = null
  }

  private async handlePrimary(spec: RewardSpec, btn: HTMLButtonElement): Promise<void> {
    if (this.busy) return
    this.busy = true
    const restore = btn.textContent
    btn.disabled = true

    if (spec.ad) {
      btn.textContent = i18n.t('ref_reward_ad_loading')
      const res = await this.ads.showRewarded(spec.ad)
      if (this.destroyed) return
      if (!res.success) {
        // Sahte başarı üretme — reklam tamamlanmadıysa para verme.
        refToast(res.reason ?? i18n.t('ref_reward_ad_failed'), 'err')
        this.busy = false
        btn.disabled = false
        btn.textContent = restore
        return
      }
    }

    const amount = spec.claim(spec.settlementAt)
    if (amount > 0) {
      refToast(`+${fmtMoney(amount)}`, 'ok')
      if (spec.id === 'offline') this.clearOfflineBanner()
      if (spec.id === 'comeback') this.clearComebackBanner()
      this.onClaimed()
    } else {
      // Guard: zaten alınmış (çift claim) — para uygulanmaz.
      refToast(i18n.t('ref_reward_already_claimed'), 'err')
      if (spec.id === 'offline') this.clearOfflineBanner()
      if (spec.id === 'comeback') this.clearComebackBanner()
    }
    this.busy = false
    this.close()
  }

  private close(): void {
    this.overlay?.remove()
    this.overlay = null
    this.busy = false
    this.pump()
  }

  destroy(): void {
    this.destroyed = true
    this.overlay?.remove()
    this.overlay = null
    this.clearOfflineBanner()
    this.clearComebackBanner()
    this.queue = []
  }
}
