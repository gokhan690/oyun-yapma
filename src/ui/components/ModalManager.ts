import type { IpoPreviewData } from '../../game/FinanceBank'
import { formatMoney } from '../../game/Economy'
import { t } from '../../i18n'

export class ModalManager {
  readonly layer: HTMLElement
  private goldenModal: HTMLElement | null = null
  private goldenTimerEl: HTMLElement | null = null
  private goldenClaimHandler: (() => void) | null = null

  constructor() {
    this.layer = document.createElement('div')
    this.layer.className = 'modal-layer'
  }

  close(): void {
    this.layer.classList.remove('is-open')
    this.layer.replaceChildren()
    this.layer.hidden = false
    this.goldenModal = null
    this.goldenTimerEl = null
    this.goldenClaimHandler = null
  }

  private openLayer(): void {
    this.layer.classList.add('is-open')
  }

  show(title: string, body: string, actions: HTMLElement[]): void {
    const p = document.createElement('p')
    p.textContent = body
    this.showContent(title, p, actions)
  }

  showBankruptcyModal(
    reason: string,
    loss: string,
    recovery40: string,
    recovery80: string,
    seizedLines: string[],
    actions: HTMLElement[],
  ): void {
    const body = document.createElement('div')
    body.className = 'bankruptcy-modal-body'
    const reasonEl = document.createElement('p')
    reasonEl.className = 'bankruptcy-reason'
    reasonEl.textContent = reason
    const lossEl = document.createElement('p')
    lossEl.className = 'bankruptcy-loss'
    lossEl.innerHTML = t('modal_bankruptcy_loss').replace('{amount}', `<strong>${loss}</strong>`)
    body.append(reasonEl, lossEl)
    if (seizedLines.length > 0) {
      const listTitle = document.createElement('p')
      listTitle.className = 'bankruptcy-seized-title'
      listTitle.textContent = t('modal_bankruptcy_seized')
      const list = document.createElement('ul')
      list.className = 'bankruptcy-seized-list'
      for (const line of seizedLines) {
        const li = document.createElement('li')
        li.textContent = line
        list.appendChild(li)
      }
      body.append(listTitle, list)
    }
    const hint = document.createElement('p')
    hint.className = 'bankruptcy-recovery-hint'
    hint.textContent = t('modal_bankruptcy_recovery').replace('{r40}', recovery40).replace('{r80}', recovery80)
    body.appendChild(hint)
    this.showContent(t('modal_bankruptcy_title'), body, actions)
  }

  showContent(title: string, bodyEl: HTMLElement, actions: HTMLElement[], lockScrim = false): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    if (!lockScrim) {
      scrim.dataset.action = 'close-modal'
    } else {
      scrim.classList.add('modal-scrim-locked')
      window.setTimeout(() => {
        scrim.dataset.action = 'close-modal'
        scrim.classList.remove('modal-scrim-locked')
      }, 2000)
    }
    const modal = document.createElement('div')
    modal.className = 'game-modal modal-enter'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const row = document.createElement('div')
    row.className = 'modal-actions'
    row.append(...actions)
    modal.append(h2, bodyEl, row)
    this.layer.append(scrim, modal)
    this.openLayer()
  }

  showDailyReward(streak: number, amount: string, onClaim: () => void, streakLost = false): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
    const modal = document.createElement('div')
    modal.className = 'game-modal daily-reward-modal modal-enter'
    const lostNote = streakLost ? `<p class="streak-lost-warn">${t('modal_streak_lost')}</p>` : ''

    const title = document.createElement('h2')
    title.textContent = t('modal_daily_reward')
    modal.innerHTML = lostNote
    modal.prepend(title)

    const streakNote = document.createElement('p')
    streakNote.textContent = t('modal_daily_streak').replace('{n}', String(streak))
    modal.appendChild(streakNote)

    // Spin wheel
    const wheelWrap = document.createElement('div')
    wheelWrap.className = 'spin-wheel-wrap'
    const pointer = document.createElement('div')
    pointer.className = 'spin-pointer'
    pointer.textContent = '▼'
    const wheel = document.createElement('div')
    wheel.className = 'spin-wheel'
    const inner = document.createElement('div')
    inner.className = 'spin-wheel-inner'
    const segs = document.createElement('div')
    segs.className = 'spin-wheel-segments'
    const segData = [
      { emoji: '💰', label: amount },
      { emoji: '🎁', label: t('modal_spin_seg_chest') },
      { emoji: '⚡', label: t('modal_spin_seg_boost') },
      { emoji: '💰', label: `2x ${amount}` },
    ]
    for (const s of segData) {
      const seg = document.createElement('div')
      seg.className = 'spin-seg'
      seg.textContent = s.emoji
      segs.appendChild(seg)
    }
    inner.appendChild(segs)
    wheel.appendChild(inner)
    const resultEl = document.createElement('div')
    resultEl.className = 'spin-result'
    wheelWrap.append(pointer, wheel, resultEl)
    modal.appendChild(wheelWrap)

    const dayInCycle = streak % 7 || 7
    const calendar = document.createElement('div')
    calendar.className = 'streak-calendar streak-calendar-extended'
    for (let i = 1; i <= 7; i++) {
      const day = document.createElement('div')
      if (i < dayInCycle) day.className = 'streak-day streak-done'
      else if (i === dayInCycle) day.className = 'streak-day streak-today'
      else day.className = 'streak-day'
      day.textContent = i < dayInCycle ? '✓' : i === dayInCycle ? '⭐' : String(i)
      calendar.appendChild(day)
    }
    modal.appendChild(calendar)

    if (streak >= 7) {
      const ms = document.createElement('p')
      ms.className = 'streak-milestone-note'
      ms.textContent = streak >= 30 ? t('modal_streak_bonus_30') : streak >= 14 ? t('modal_streak_bonus_14') : t('modal_streak_bonus_7')
      modal.appendChild(ms)
    }

    const spinBtn = document.createElement('button')
    spinBtn.type = 'button'
    spinBtn.className = 'btn-primary'
    spinBtn.textContent = t('modal_spin_wheel')
    let spun = false
    let claimedResult: { emoji: string; label: string } | null = null
    const doSpin = (isPremium: boolean) => {
      if (spun) return
      spun = true
      spinBtn.disabled = true
      if (premiumBtn) premiumBtn.disabled = true
      inner.classList.remove('spinning')
      void inner.offsetWidth
      const deg = 720 + Math.floor(Math.random() * 1080) + (isPremium ? 180 : 0)
      inner.style.setProperty('--spin-deg', `${deg}deg`)
      inner.classList.add('spinning')
      window.setTimeout(() => {
        const pool = isPremium
          ? [segData[1]!, segData[2]!, segData[3]!, segData[3]!]
          : segData
        claimedResult = pool[Math.floor(Math.random() * pool.length)]!
        resultEl.textContent = t('modal_spin_won').replace('{emoji}', claimedResult.emoji).replace('{label}', claimedResult.label)
        spinBtn.textContent = t('modal_spin_collect')
        spinBtn.disabled = false
        if (premiumBtn) premiumBtn.hidden = true
        spinBtn.addEventListener('click', () => {
          onClaim()
          this.close()
        }, { once: true })
      }, 3100)
    }
    spinBtn.addEventListener('click', () => doSpin(false))
    modal.appendChild(spinBtn)

    const premiumBtn = document.createElement('button')
    premiumBtn.type = 'button'
    premiumBtn.className = 'btn-secondary spin-premium-btn'
    premiumBtn.innerHTML = t('modal_spin_premium')
    premiumBtn.addEventListener('click', () => {
      premiumBtn.disabled = true
      premiumBtn.textContent = t('modal_spin_premium_loading')
      window.setTimeout(() => {
        doSpin(true)
      }, 1500)
    })
    modal.appendChild(premiumBtn)

    this.layer.append(scrim, modal)
    this.openLayer()
  }

  showIpoPreview(preview: IpoPreviewData, onConfirm: () => Promise<void>): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
    const modal = document.createElement('div')
    modal.className = 'game-modal ipo-preview-modal modal-enter ipo-preview-modal-lg'

    const icon = document.createElement('div')
    icon.className = 'ipo-preview-icon'
    icon.textContent = '🚀'

    const h2 = document.createElement('h2')
    h2.textContent = t('modal_ipo_title')

    const intro = document.createElement('p')
    intro.className = 'ipo-preview-intro'
    intro.textContent = t('modal_ipo_intro')

    const table = document.createElement('div')
    table.className = 'ipo-preview-table'

    const gainRows: [string, string][] = [
      [t('modal_ipo_row_shares_earn'), `+${preview.pointsToEarn}`],
      [t('modal_ipo_row_shares_total'), `${preview.newTotal}`],
      [t('modal_ipo_row_multiplier'), `x${preview.newMultiplier.toFixed(2)}`],
      [t('modal_ipo_row_start_cash'), formatMoney(preview.startingCash)],
    ]
    const lossRows: [string, string][] = [
      [t('modal_ipo_row_portfolio'), formatMoney(preview.portfolioValue)],
      [t('modal_ipo_row_deposits'), formatMoney(preview.depositValue + preview.bondValue)],
      [t('modal_ipo_row_loan'), formatMoney(preview.loanDebt)],
      [t('modal_ipo_row_biz_reset'), t('modal_ipo_count_unit').replace('{n}', String(preview.businessesOwned))],
      [t('modal_ipo_row_upg_reset'), t('modal_ipo_count_unit').replace('{n}', String(preview.upgradesOwned))],
      [t('modal_ipo_row_mgr_reset'), t('modal_ipo_count_unit').replace('{n}', String(preview.managersOwned))],
    ]
    const keepRows: [string, string][] = [
      [t('modal_ipo_row_prestige_tree'), t('modal_ipo_preserved')],
      [t('modal_ipo_row_research'), t('modal_ipo_preserved')],
      [t('modal_ipo_row_dynasty'), t('modal_ipo_preserved')],
    ]

    const section = (title: string, rows: [string, string][], tone?: string) => {
      const head = document.createElement('h3')
      head.className = `ipo-preview-section${tone ? ` ipo-${tone}` : ''}`
      head.textContent = title
      table.appendChild(head)
      for (const [label, value] of rows) {
        const row = document.createElement('div')
        row.className = 'ipo-preview-row'
        const l = document.createElement('span')
        l.textContent = label
        const v = document.createElement('strong')
        v.textContent = value
        row.append(l, v)
        table.appendChild(row)
      }
    }

    section(t('modal_ipo_section_gain'), gainRows, 'gain')
    section(t('modal_ipo_section_loss'), lossRows, 'loss')
    section(t('modal_ipo_section_keep'), keepRows, 'keep')

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'btn-prestige'
    confirmBtn.textContent = t('modal_ipo_confirm').replace('{cash}', formatMoney(preview.startingCash))
    confirmBtn.addEventListener('click', () => void onConfirm())

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.dataset.action = 'close-modal'
    cancelBtn.textContent = t('btn_give_up')

    const actions = document.createElement('div')
    actions.className = 'modal-actions'
    actions.append(confirmBtn, cancelBtn)
    modal.append(icon, h2, intro, table, actions)
    this.layer.append(scrim, modal)
    this.openLayer()
  }

  openGoldenEvent(
    emoji: string,
    title: string,
    desc: string,
    onClaim: () => void,
    claimLabel?: string,
  ): void {
    this.layer.replaceChildren()
    this.goldenClaimHandler = onClaim
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
    const modal = document.createElement('div')
    modal.className = 'game-modal golden-event-modal modal-enter'
    const icon = document.createElement('div')
    icon.className = 'event-icon'
    icon.textContent = emoji
    const h2 = document.createElement('h2')
    h2.textContent = title
    const p = document.createElement('p')
    p.textContent = desc
    const timer = document.createElement('div')
    timer.className = 'event-timer'
    timer.textContent = t('modal_golden_timer').replace('{n}', '10')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-primary golden-claim-btn'
    btn.textContent = claimLabel ?? t('modal_golden_claim_ad')
    btn.addEventListener('click', () => {
      if (this.goldenClaimHandler) this.goldenClaimHandler()
    })
    modal.append(icon, h2, p, timer, btn)
    this.layer.append(scrim, modal)
    this.goldenModal = modal
    this.goldenTimerEl = timer
    this.openLayer()
  }

  updateGoldenEventTimer(secondsLeft: number): void {
    if (!this.goldenTimerEl) return
    this.goldenTimerEl.textContent = t('modal_golden_timer').replace('{n}', String(secondsLeft))
  }

  hasGoldenEventOpen(): boolean {
    return this.goldenModal !== null
  }

  showDetail(title: string, rows: { label: string; value: string }[], footer: string): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
    const modal = document.createElement('div')
    modal.className = 'game-modal detail-modal modal-enter'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const list = document.createElement('div')
    list.className = 'detail-rows'
    for (const row of rows) {
      const line = document.createElement('div')
      line.className = 'detail-row'
      const l = document.createElement('span')
      l.textContent = row.label
      const v = document.createElement('strong')
      v.textContent = row.value
      line.append(l, v)
      list.appendChild(line)
    }
    const foot = document.createElement('p')
    foot.className = 'detail-footer'
    foot.textContent = footer
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'btn-primary'
    close.dataset.action = 'close-modal'
    close.textContent = t('btn_close')
    modal.append(h2, list, foot, close)
    this.layer.append(scrim, modal)
    this.openLayer()
  }

  showToast(root: HTMLElement, message: string, priority: 'normal' | 'important' = 'normal'): void {
    const now = Date.now()
    if (priority === 'normal') {
      if (this.lastToastMessage === message && now - this.lastToastAt < 8000) return
      if (now - this.toastWindowStart > 12_000) {
        this.toastWindowStart = now
        this.toastWindowCount = 0
      }
      if (this.toastWindowCount >= 3) return
      this.toastWindowCount++
    }
    this.lastToastMessage = message
    this.lastToastAt = now
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = message
    root.appendChild(toast)
    window.setTimeout(() => toast.remove(), priority === 'important' ? 3400 : 2200)
  }

  private lastToastAt = 0
  private lastToastMessage = ''
  private toastWindowStart = 0
  private toastWindowCount = 0

  showAchievementToast(emoji: string, name: string, reward: string): void {
    const toast = document.createElement('div')
    toast.className = 'achievement-toast'
    const em = document.createElement('span')
    em.className = 'ach-toast-emoji'
    em.textContent = emoji
    const body = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = name
    const small = document.createElement('small')
    small.textContent = `+${reward}`
    body.append(strong, small)
    toast.append(em, body)
    document.body.appendChild(toast)
    window.setTimeout(() => {
      toast.classList.add('out')
      window.setTimeout(() => toast.remove(), 350)
    }, 3200)
  }
}
