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
  desc: string
  warn?: string
  primaryLabel: string
  /** Tanımlıysa claim reklam izlendikten sonra yapılır. */
  ad?: RewardedAdType
  /** GameState claim metodu — verilen tutarı döndürür (0 = zaten alınmış). */
  claim: () => number
  /** Açık "vazgeç" aksiyonu (yalnız bankruptcy). X ile kapatma ödülü SİLMEZ. */
  discard?: { label: string; run: () => void }
}

export class RefRewardQueue {
  private queue: RewardId[] = []
  private overlay: HTMLElement | null = null
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
      case 'offline':    return this.state.pendingOfflineEarnings > 0
      case 'comeback':   return this.state.hasPendingComeback()
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
      // Kuyruk boş → bir sonraki modal sistemine (karar modalları) devret.
      if (!this.allDoneFired) {
        this.allDoneFired = true
        this.onAllDone?.()
      }
      return
    }
    this.render(this.specFor(next))
  }

  private specFor(id: RewardId): RewardSpec {
    const s = this.state
    switch (id) {
      case 'offline':
        return {
          id, emoji: '💰', title: i18n.t('ref_reward_offline_title'),
          amount: s.pendingOfflineEarnings,
          desc: i18n.t('ref_reward_offline_desc'),
          primaryLabel: i18n.t('ref_reward_offline_btn'),
          ad: 'offline_bonus',
          claim: () => s.claimOfflineViaAd(1),
        }
      case 'comeback':
        return {
          id, emoji: '🎁', title: i18n.t('ref_reward_comeback_title'),
          amount: s.comebackPending,
          desc: i18n.t('ref_reward_comeback_desc'),
          primaryLabel: i18n.t('ref_reward_comeback_btn'),
          ad: 'offline_bonus',
          claim: () => s.claimComebackViaAd(1),
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
    overlay.className = 'ref-reward-overlay'
    overlay.innerHTML = `
      <div class="ref-reward-card" role="dialog" aria-modal="true">
        <button class="ref-reward-close" type="button" aria-label="${i18n.t('ref_reward_close')}">✕</button>
        <div class="ref-reward-emoji">${spec.emoji}</div>
        <h2 class="ref-reward-title">${spec.title}</h2>
        <div class="ref-reward-amount">${fmtMoney(spec.amount)}</div>
        <p class="ref-reward-desc">${spec.desc}</p>
        ${spec.warn ? `<p class="ref-reward-warn">⚠️ ${spec.warn}</p>` : ''}
        <button class="ref-reward-primary" type="button">${spec.primaryLabel}</button>
        ${spec.discard ? `<button class="ref-reward-discard" type="button">${spec.discard.label}</button>` : ''}
      </div>
    `
    this.overlay = overlay
    document.body.appendChild(overlay)

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

    const amount = spec.claim()
    if (amount > 0) {
      refToast(`+${fmtMoney(amount)}`, 'ok')
      this.onClaimed()
    } else {
      // Guard: zaten alınmış (çift claim) — para uygulanmaz.
      refToast(i18n.t('ref_reward_already_claimed'), 'err')
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
    this.queue = []
  }
}
