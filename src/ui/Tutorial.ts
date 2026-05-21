import type { GameState } from '../game/GameState'

export interface TutorialStep {
  target: string
  title: string
  text: string
  tab?: string
}

const STEPS: TutorialStep[] = [
  { target: '.tap-area', title: 'Kazan', text: 'Buraya tıklayarak para kazan. Hızlı tıkla = combo bonusu!' },
  { target: '[data-tab="businesses"]', title: 'İşletme Al', text: 'İşletmeler saniyede otomatik gelir sağlar.', tab: 'businesses' },
  { target: '.combo-wrap', title: 'Combo', text: '2 saniye içinde art arda tıkla — combo çarpanı artar.' },
  { target: '[data-tab="missions"]', title: 'Görevler', text: 'Günlük görevleri tamamla, bonus kazan.', tab: 'missions' },
  { target: '[data-tab="ipo"]', title: 'IPO', text: '500K kazanınca borsaya çık — kalıcı hisse senedi kazan.', tab: 'ipo' },
]

export class Tutorial {
  private overlay: HTMLElement | null = null
  private stepIndex = 0
  private onTab: ((tab: string) => void) | null = null
  private state: GameState

  constructor(state: GameState) {
    this.state = state
  }

  setTabHandler(handler: (tab: string) => void): void {
    this.onTab = handler
  }

  shouldShow(): boolean {
    return !this.state.tutorialDone
  }

  start(): void {
    if (!this.shouldShow()) return
    this.stepIndex = 0
    this.showStep()
  }

  restart(): void {
    this.state.tutorialDone = false
    this.stepIndex = 0
    this.showStep()
  }

  private showStep(): void {
    this.cleanup()
    if (this.stepIndex >= STEPS.length) {
      this.state.tutorialDone = true
      return
    }
    const step = STEPS[this.stepIndex]!
    if (step.tab && this.onTab) this.onTab(step.tab)

    window.setTimeout(() => {
      const target = document.querySelector(step.target) as HTMLElement | null
      this.overlay = document.createElement('div')
      this.overlay.className = 'tutorial-overlay'

      const card = document.createElement('div')
      card.className = 'tutorial-card'
      const h = document.createElement('h3')
      h.textContent = step.title
      const p = document.createElement('p')
      p.textContent = step.text
      const row = document.createElement('div')
      row.className = 'tutorial-actions'
      const skip = document.createElement('button')
      skip.type = 'button'
      skip.className = 'btn-secondary'
      skip.textContent = 'Atla'
      skip.addEventListener('click', () => {
        this.state.tutorialDone = true
        this.cleanup()
      })
      const next = document.createElement('button')
      next.type = 'button'
      next.className = 'btn-primary'
      next.textContent = this.stepIndex === STEPS.length - 1 ? 'Başla!' : 'İleri'
      next.addEventListener('click', () => {
        this.stepIndex++
        this.showStep()
      })
      row.append(skip, next)
      card.append(h, p, row)

      if (target) {
        const rect = target.getBoundingClientRect()
        const spot = document.createElement('div')
        spot.className = 'tutorial-spotlight'
        spot.style.top = `${rect.top - 6}px`
        spot.style.left = `${rect.left - 6}px`
        spot.style.width = `${rect.width + 12}px`
        spot.style.height = `${rect.height + 12}px`
        document.body.appendChild(spot)
        this.overlay.dataset.spotlight = '1'
        ;(this.overlay as HTMLElement & { _spot?: HTMLElement })._spot = spot
      }

      this.overlay.appendChild(card)
      document.body.appendChild(this.overlay)
    }, step.tab ? 200 : 0)
  }

  private cleanup(): void {
    const overlay = this.overlay as (HTMLElement & { _spot?: HTMLElement }) | null
    overlay?._spot?.remove()
    overlay?.remove()
    this.overlay = null
  }
}
