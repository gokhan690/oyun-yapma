import type { GameState } from '../game/GameState'
import type { NavView } from './components/BottomNav'
import { t } from '../i18n'

export interface TutorialStep {
  target: string
  title: string
  text: string
  tab?: string
  view?: NavView
  mandatory?: boolean
  waitFor?: 'tap' | 'purchase' | 'nav'
}

const MANDATORY_STEPS: TutorialStep[] = [
  {
    target: '.tap-area',
    title: 'Tıkla & Kazan',
    text: 'Buraya tıkla — para kazanmaya başla!',
    view: 'earn',
    mandatory: true,
    waitFor: 'tap',
  },
  {
    target: '[data-id="shop"]',
    title: 'İlk işletmen',
    text: 'İşletme sekmesine git — Limonata Tezgahı ile başla.',
    view: 'shop',
    mandatory: true,
    waitFor: 'nav',
  },
  {
    target: '[data-action="buy-business"][data-id="stajyer"]',
    title: 'Satın al',
    text: 'Bir işletme seç — pasif gelir kazanmaya başlarsın.',
    tab: 'growth',
    view: 'shop',
    mandatory: true,
    waitFor: 'purchase',
  },
]

const OPTIONAL_STEPS: TutorialStep[] = [
  { target: '.combo-wrap', title: 'Combo sistemi', text: 'Hızlı tıkla — çarpan artar, daha fazla para kazanırsın!', view: 'earn' },
  { target: '.quick-ads', title: '2x Gelir & Sandık', text: 'Reklam izleyerek gelirini 2 katına çıkar veya sandıktan ödül kazan.', view: 'earn' },
  { target: '.session-panel', title: 'İstatistiklerin', text: 'Tıklama gelirin, combo çarpanın ve pasif gelirin burada görünür.', view: 'earn' },
  { target: '[data-id="shop"]', title: 'İşletme yönetimi', text: 'İşletme sekmesinde yönetici işe alabilir, upgradelar satın alabilirsin.' },
  { target: '.tier-band-header', title: 'İşletme grupları', text: 'İşletmeler kademelere ayrılmış — üste tıkla, grubu genişlet ve işletme satın al.', view: 'shop' },
  { target: '[data-tab="management"]', title: 'Yöneticiler', text: 'Yönetici kirala — işletmen pasif olarak büyür, sen tıklamasan bile!', view: 'shop' },
  { target: '[data-tab="upgrades"]', title: 'Upgradeler', text: 'Tüm geliri artıran global upgradeları satın al.', view: 'shop' },
  { target: '[data-tab="research"]', title: 'Ar-Ge ağacı', text: 'Ar-Ge noktalarıyla kalıcı bonuslar aç — offline gelir, çarpan, özel güçler.', view: 'shop' },
  { target: '[data-id="market"]', title: 'Piyasa & Borsa', text: 'Hisse senedi al/sat, banka faizi kazan, sigorta ve emtia ticareti yap.', view: 'market' },
  { target: '[data-id="profile"]', title: 'Baron profili', text: 'IPO yap — işletmeni halka aç, prestige puanı kazan ve yeni avantajlar aç!' },
  { target: '.btn-daily', title: 'Günlük ödül', text: 'Her gün giriş yap, streak bonusu topla ve sezon XP kazan!' },
]

function allSteps(): TutorialStep[] {
  return [...MANDATORY_STEPS, ...OPTIONAL_STEPS]
}

export class Tutorial {
  private overlay: HTMLElement | null = null
  private stepIndex = 0
  private pendingStepTimer: number | null = null
  private onTab: ((tab: string) => void) | null = null
  private onMandatoryComplete: (() => void) | null = null
  private state: GameState
  private currentView: NavView = 'earn'
  private mandatoryComplete = false

  constructor(state: GameState) {
    this.state = state
  }

  setTabHandler(handler: (tab: string) => void): void {
    this.onTab = handler
  }

  setMandatoryCompleteHandler(handler: () => void): void {
    this.onMandatoryComplete = handler
  }

  shouldShow(): boolean {
    return !this.state.tutorialDone
  }

  isMandatoryPhase(): boolean {
    return !this.mandatoryComplete && !this.state.onboardingComplete
  }

  onPurchaseMade(): void {
    if (!this.shouldShow()) return
    const step = allSteps()[this.stepIndex]
    if (step?.waitFor === 'purchase') {
      this.completeMandatoryPhase()
      this.stepIndex++
      this.showStep()
    }
  }

  onTapMade(): void {
    if (!this.shouldShow()) return
    const step = allSteps()[this.stepIndex]
    if (step?.waitFor === 'tap') {
      this.stepIndex++
      this.showStep()
    }
  }

  onViewChange(view: NavView): void {
    this.currentView = view
    if (this.state.tutorialDone) {
      this.cleanup()
      return
    }
    this.cleanup()
    if (this.stepIndex >= allSteps().length) return
    const step = allSteps()[this.stepIndex]!
    if (step.waitFor === 'nav' && step.view === view) {
      this.stepIndex++
      window.setTimeout(() => this.showStep(), 120)
      return
    }
    if (!step.view || step.view === view) {
      window.setTimeout(() => this.showStep(), 120)
    }
  }

  dismiss(): void {
    this.cleanup()
  }

  start(): void {
    if (!this.shouldShow()) return
    this.mandatoryComplete = this.state.onboardingComplete
    if (this.mandatoryComplete) {
      this.stepIndex = MANDATORY_STEPS.length
    } else {
      this.stepIndex = 0
    }
    this.showStep()
  }

  restart(): void {
    this.state.tutorialDone = false
    this.state.onboardingComplete = false
    this.mandatoryComplete = false
    this.stepIndex = 0
    this.showStep()
  }

  private showStep(): void {
    this.cleanup()
    const steps = allSteps()
    if (this.stepIndex >= steps.length) {
      this.state.tutorialDone = true
      this.completeMandatoryPhase()
      return
    }
    const step = steps[this.stepIndex]!
    if (step.view && step.view !== this.currentView && step.waitFor !== 'nav') return

    if (step.tab && this.onTab) this.onTab(step.tab)

    const delay = step.tab ? 400 : 100
    this.pendingStepTimer = window.setTimeout(() => {
      this.pendingStepTimer = null
      if (this.state.tutorialDone || this.stepIndex >= steps.length) return
      const current = steps[this.stepIndex]!
      if (current.view && current.view !== this.currentView && current.waitFor !== 'nav') return
      if (current.waitFor === 'tap' || current.waitFor === 'purchase') {
        // Overlay göster; ilerleme olayla gelir
      }

      const target = document.querySelector(current.target) as HTMLElement | null
      if (!this.isTargetVisible(target)) return

      const rect = target!.getBoundingClientRect()

      this.overlay = document.createElement('div')
      this.overlay.className = 'tutorial-overlay'

      const card = document.createElement('div')
      card.className = 'tutorial-card'
      if (current.waitFor) card.classList.add('tutorial-card-passive')
      const appRect = document.querySelector<HTMLElement>('.app-root')?.getBoundingClientRect()
      const shellLeft = appRect?.left ?? 0
      const shellWidth = appRect?.width ?? window.innerWidth
      const cardInset = 16
      card.style.left = `${Math.max(cardInset, shellLeft + cardInset)}px`
      card.style.right = 'auto'
      card.style.width = `${Math.max(260, shellWidth - cardInset * 2)}px`
      const h = document.createElement('h3')
      h.textContent = current.title
      const p = document.createElement('p')
      p.textContent = current.text
      const row = document.createElement('div')
      row.className = 'tutorial-actions'

      const isMandatory = !!current.mandatory && !this.mandatoryComplete
      if (!isMandatory) {
        const skip = document.createElement('button')
        skip.type = 'button'
        skip.className = 'btn-secondary'
        skip.textContent = t('tutorial_skip')
        skip.addEventListener('click', () => {
          this.state.tutorialDone = true
          this.completeMandatoryPhase()
          this.cleanup()
        })
        row.appendChild(skip)
      }

      if (!current.waitFor) {
        const next = document.createElement('button')
        next.type = 'button'
        next.className = 'btn-primary'
        next.textContent = this.stepIndex >= steps.length - 1 ? t('btn_finish') : t('btn_continue')
        next.addEventListener('click', () => {
          this.stepIndex++
          if (this.stepIndex >= MANDATORY_STEPS.length) {
            this.completeMandatoryPhase()
          }
          this.showStep()
        })
        row.appendChild(next)
      } else {
        const hint = document.createElement('span')
        hint.className = 'tutorial-wait-hint'
        hint.textContent = current.waitFor === 'purchase' ? t('tutorial_buy_hint') : t('tutorial_click_hint')
        row.appendChild(hint)
      }

      card.append(h, p, row)
      this.overlay.appendChild(card)

      const highlight = document.createElement('div')
      highlight.className = 'tutorial-highlight'
      highlight.style.top = `${rect.top - 6}px`
      highlight.style.left = `${rect.left - 6}px`
      highlight.style.width = `${rect.width + 12}px`
      highlight.style.height = `${rect.height + 12}px`
      this.overlay.appendChild(highlight)
      const estimatedCardHeight = 170
      const belowTop = rect.bottom + 12
      const maxTop = window.innerHeight - estimatedCardHeight - 16
      const top = belowTop <= maxTop
        ? belowTop
        : Math.max(16, rect.top - estimatedCardHeight - 12)
      card.style.top = `${top}px`
      card.style.bottom = 'auto'

      document.body.appendChild(this.overlay)
    }, delay)
  }

  private isTargetVisible(target: HTMLElement | null): boolean {
    if (!target) return false
    let el: HTMLElement | null = target
    while (el) {
      if (el.hidden) return false
      el = el.parentElement
    }
    const rect = target.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    const style = window.getComputedStyle(target)
    return style.display !== 'none' && style.visibility !== 'hidden'
  }

  private completeMandatoryPhase(): void {
    const wasComplete = this.mandatoryComplete && this.state.onboardingComplete
    this.mandatoryComplete = true
    this.state.onboardingComplete = true
    if (!wasComplete) this.onMandatoryComplete?.()
  }

  private cleanup(): void {
    if (this.pendingStepTimer !== null) {
      window.clearTimeout(this.pendingStepTimer)
      this.pendingStepTimer = null
    }
    this.overlay?.remove()
    this.overlay = null
  }
}
