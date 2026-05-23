import type { IpoPreviewData } from '../../game/FinanceBank'
import { formatMoney } from '../../game/Economy'

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

  showContent(title: string, bodyEl: HTMLElement, actions: HTMLElement[]): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
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
    const lostNote = streakLost ? '<p class="streak-lost-warn">⚠️ Serin sıfırlandı — yeniden başlıyorsun!</p>' : ''
    modal.innerHTML = `<div class="reward-box">🎁</div><h2>Günlük Ödül</h2>${lostNote}<p>${streak}. gün streak!</p><strong class="reward-amount">+${amount}</strong>`

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
      ms.textContent = streak >= 30 ? '🏆 Efsane seri bonusu!' : streak >= 14 ? '💪 Demir irade bonusu!' : '🔥 7 gün bonusu!'
      modal.appendChild(ms)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-primary'
    btn.textContent = 'Topla!'
    btn.addEventListener('click', () => {
      onClaim()
      this.close()
    })
    modal.appendChild(btn)
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
    h2.textContent = 'IPO — Şirket Birleşmesi'

    const intro = document.createElement('p')
    intro.className = 'ipo-preview-intro'
    intro.textContent = 'Run sıfırlanır; kalıcı prestij hisselerin ve meta ilerlemen korunur. Borsa ve mevduat nakde çevrilir — yeni turda başlangıç sermayesi alırsın.'

    const table = document.createElement('div')
    table.className = 'ipo-preview-table'

    const gainRows: [string, string][] = [
      ['Kazanılacak kalıcı hisse', `+${preview.pointsToEarn}`],
      ['Yeni toplam hisse', `${preview.newTotal}`],
      ['Kalıcı gelir çarpanı', `x${preview.newMultiplier.toFixed(2)}`],
      ['Başlangıç sermayesi', formatMoney(preview.startingCash)],
    ]
    const lossRows: [string, string][] = [
      ['Borsa portföyü (satılacak)', formatMoney(preview.portfolioValue)],
      ['Mevduat + tahvil', formatMoney(preview.depositValue + preview.bondValue)],
      ['Kredi borcu (kapanacak)', formatMoney(preview.loanDebt)],
      ['İşletmeler sıfırlanır', `${preview.businessesOwned} adet`],
      ['Yükseltmeler sıfırlanır', `${preview.upgradesOwned} adet`],
      ['Yöneticiler sıfırlanır', `${preview.managersOwned} adet`],
    ]
    const keepRows: [string, string][] = [
      ['Prestij ağacı', '✓ Korunur'],
      ['Ar-Ge seviyeleri', '✓ Korunur'],
      ['Hanedan / imparatorluk', '✓ Korunur'],
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

    section('Kazanacakların', gainRows, 'gain')
    section('Sıfırlanacaklar (run)', lossRows, 'loss')
    section('Korunacaklar (meta)', keepRows, 'keep')

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'btn-prestige'
    confirmBtn.textContent = `🚀 IPO Yap · ${formatMoney(preview.startingCash)} ile başla`
    confirmBtn.addEventListener('click', () => void onConfirm())

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.dataset.action = 'close-modal'
    cancelBtn.textContent = 'Vazgeç'

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
    timer.textContent = '10sn'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-primary golden-claim-btn'
    btn.textContent = 'Kabul Et!'
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
    this.goldenTimerEl.textContent = `${secondsLeft}sn`
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
    close.textContent = 'Kapat'
    modal.append(h2, list, foot, close)
    this.layer.append(scrim, modal)
    this.openLayer()
  }

  showToast(root: HTMLElement, message: string): void {
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = message
    root.appendChild(toast)
    window.setTimeout(() => toast.remove(), 2800)
  }

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
