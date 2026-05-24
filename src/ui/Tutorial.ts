import type { GameState } from '../game/GameState'
import type { NavView } from './components/BottomNav'

export interface TutorialStep {
  target: string
  title: string
  text: string
  tab?: string
  view?: NavView
}

const STEPS: TutorialStep[] = [
  { target: '.tap-area', title: 'Para kazan', text: 'Buraya tıklayarak para kazan. Hızlı tık = combo bonusu!', view: 'earn' },
  { target: '[data-id="shop"]', title: 'İşletme', text: 'Tüm işletmeleri geniş kartlarla buradan satın al.' },
  { target: '[data-tab="growth"]', title: 'Büyüme', text: 'İşletme al, yönetici işe al. Büyüme · Güçlendir · İmparatorluk sekmeleri burada.', tab: 'growth', view: 'shop' },
  { target: '.shop-advisor-strip', title: 'Akıllı alım', text: 'En iyi sonraki alım önerisi — tek tıkla satın al.', tab: 'growth', view: 'shop' },
  { target: '[data-id="market"]', title: 'Borsa', text: 'Hisse al/sat, banka işlemleri ve run birleşmesi burada.' },
  { target: '[data-tab="empire"]', title: 'İmparatorluk', text: 'Spor, lüks, finans ve bilim kategorilerini İşletme sekmesinden aç.', tab: 'empire', view: 'shop' },
  { target: '.combo-wrap', title: 'Combo', text: '2 saniye içinde art arda tıkla — combo çarpanı artar.', view: 'earn' },
  { target: '[data-id="events"]', title: 'Etkinlikler', text: 'Günlük hedef, haftalık etkinlik, sezon yolu ve görevler burada.' },
  { target: '.btn-daily', title: 'Günlük ödül', text: 'Her gün giriş yap, streak bonusu topla!' },
  { target: '.heat-meter-row', title: 'Illegal radar', text: 'Illegal işletmeler radar biriktirir. Underground menüsünden temizle.', view: 'earn' },
]

export class Tutorial {
  private overlay: HTMLElement | null = null
  private stepIndex = 0
  private onTab: ((tab: string) => void) | null = null
  private state: GameState
  private currentView: NavView = 'earn'

  constructor(state: GameState) {
    this.state = state
  }

  setTabHandler(handler: (tab: string) => void): void {
    this.onTab = handler
  }

  shouldShow(): boolean {
    return !this.state.tutorialDone
  }

  onViewChange(view: NavView): void {
    this.currentView = view
    if (this.state.tutorialDone) {
      this.cleanup()
      return
    }
    this.cleanup()
    if (this.stepIndex >= STEPS.length) return
    const step = STEPS[this.stepIndex]!
    if (!step.view || step.view === view) {
      window.setTimeout(() => this.showStep(), 120)
    }
  }

  dismiss(): void {
    this.cleanup()
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
    if (step.view && step.view !== this.currentView) return

    if (step.tab && this.onTab) this.onTab(step.tab)

    window.setTimeout(() => {
      if (this.state.tutorialDone || this.stepIndex >= STEPS.length) return
      const current = STEPS[this.stepIndex]!
      if (current.view && current.view !== this.currentView) return

      const target = document.querySelector(current.target) as HTMLElement | null
      if (!target) return
      const rect = target.getBoundingClientRect()
      if (rect.width < 1 && rect.height < 1) return

      this.overlay = document.createElement('div')
      this.overlay.className = 'tutorial-overlay'

      const card = document.createElement('div')
      card.className = 'tutorial-card'
      const h = document.createElement('h3')
      h.textContent = current.title
      const p = document.createElement('p')
      p.textContent = current.text
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

      const highlight = document.createElement('div')
      highlight.className = 'tutorial-highlight'
      highlight.style.top = `${rect.top - 6}px`
      highlight.style.left = `${rect.left - 6}px`
      highlight.style.width = `${rect.width + 12}px`
      highlight.style.height = `${rect.height + 12}px`
      this.overlay.appendChild(highlight)
      card.style.top = `${Math.min(rect.bottom + 12, window.innerHeight - 180)}px`

      document.body.appendChild(this.overlay)
    }, step.tab ? 400 : 100)
  }

  private cleanup(): void {
    this.overlay?.remove()
    this.overlay = null
  }
}
