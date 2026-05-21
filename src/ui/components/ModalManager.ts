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
    this.goldenModal = null
    this.goldenTimerEl = null
    this.goldenClaimHandler = null
  }

  private openLayer(): void {
    this.layer.classList.add('is-open')
  }

  show(title: string, body: string, actions: HTMLElement[]): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    scrim.dataset.action = 'close-modal'
    const modal = document.createElement('div')
    modal.className = 'game-modal modal-enter'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const p = document.createElement('p')
    p.textContent = body
    const row = document.createElement('div')
    row.className = 'modal-actions'
    row.append(...actions)
    modal.append(h2, p, row)
    this.layer.append(scrim, modal)
    this.openLayer()
  }

  showDailyReward(streak: number, amount: string, onClaim: () => void): void {
    this.layer.replaceChildren()
    const scrim = document.createElement('div')
    scrim.className = 'modal-scrim'
    const modal = document.createElement('div')
    modal.className = 'game-modal daily-reward-modal modal-enter'
    modal.innerHTML = `<div class="reward-box">🎁</div><h2>Günlük Ödül</h2><p>${streak}. gün streak!</p><strong class="reward-amount">+${amount}</strong>`
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
