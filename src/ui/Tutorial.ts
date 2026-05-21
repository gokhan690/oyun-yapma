import type { GameState } from '../game/GameState'

export interface TutorialStep {
  target: string
  title: string
  text: string
  tab?: string
}

const STEPS: TutorialStep[] = [
  { target: '.tap-area', title: 'Kazan', text: 'Buraya tıklayarak para kazan. Hızlı tıkla = combo bonusu!' },
  { target: '[data-tab="growth"]', title: 'Mağaza — Büyüme', text: 'İşletme al ve yönetici işe al. 3 hub: Büyüme, Güçlendir, Finans.', tab: 'growth' },
  { target: '.shop-advisor-strip', title: 'Akıllı Alım', text: 'En iyi sonraki alım önerisi burada — tek tıkla satın al.', tab: 'growth' },
  { target: '.combo-wrap', title: 'Combo', text: '2 saniye içinde art arda tıkla — combo çarpanı artar.' },
  { target: '[data-id="events"]', title: 'Etkinlikler & Görevler', text: 'Günlük hedef, haftalık etkinlik, sezon yolu ve görevler burada.' },
  { target: '[data-tab="finance"]', title: 'Finans', text: 'Borsa, prestij ağacı ve IPO burada.', tab: 'finance' },
  { target: '.btn-daily', title: 'Günlük Ödül', text: 'Her gün giriş yap, streak bonusu topla!' },
  { target: '.heat-meter-row', title: 'Illegal Radar', text: 'Illegal işletmeler radar biriktirir. Underground menüsünden temizle.' },
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
      next.textContent = this.stepIndex >= STEPS.length - 1 ? 'Bitir' : 'Devam'
      next.addEventListener('click', () => {
        this.stepIndex++
        this.showStep()
      })
      row.append(skip, next)
      card.append(h, p, row)
      this.overlay.appendChild(card)

      if (target) {
        const rect = target.getBoundingClientRect()
        const highlight = document.createElement('div')
        highlight.className = 'tutorial-highlight'
        highlight.style.top = `${rect.top - 6}px`
        highlight.style.left = `${rect.left - 6}px`
        highlight.style.width = `${rect.width + 12}px`
        highlight.style.height = `${rect.height + 12}px`
        this.overlay.appendChild(highlight)
        card.style.top = `${Math.min(rect.bottom + 12, window.innerHeight - 180)}px`
      }

      document.body.appendChild(this.overlay)
    }, step.tab ? 400 : 100)
  }

  private cleanup(): void {
    this.overlay?.remove()
    this.overlay = null
  }
}
