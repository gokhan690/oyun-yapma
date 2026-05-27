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

const MANDATORY_COUNT = 3

function mandatorySteps(): TutorialStep[] {
  return [
    {
      target: '.tap-area',
      title: t('tut_tap_title'),
      text: t('tut_tap_text'),
      view: 'earn',
      mandatory: true,
      waitFor: 'tap',
    },
    {
      target: '[data-action="nav-view"][data-id="shop"]',
      title: t('tut_firstbiz_title'),
      text: t('tut_firstbiz_text'),
      view: 'shop',
      mandatory: true,
      waitFor: 'nav',
    },
    {
      target: '[data-action="buy-business"][data-id="stajyer"]',
      title: t('tut_buy_title'),
      text: t('tut_buy_text'),
      tab: 'growth',
      view: 'shop',
      mandatory: true,
      waitFor: 'purchase',
    },
  ]
}

function optionalSteps(): TutorialStep[] {
  return [
    { target: '.combo-wrap', title: t('tut_combo_title'), text: t('tut_combo_text'), view: 'earn' },
    { target: '.quick-ads', title: t('tut_ads_title'), text: t('tut_ads_text'), view: 'earn' },
    { target: '.session-panel', title: t('tut_stats_title'), text: t('tut_stats_text'), view: 'earn' },
    { target: '[data-id="shop"]', title: t('tut_mgmt_title'), text: t('tut_mgmt_text') },
    { target: '.tier-band-header', title: t('tut_tiers_title'), text: t('tut_tiers_text'), view: 'shop' },
    { target: '[data-tab="management"]', title: t('tut_managers_title'), text: t('tut_managers_text'), view: 'shop' },
    { target: '[data-tab="upgrades"]', title: t('tut_upgrades_title'), text: t('tut_upgrades_text'), view: 'shop' },
    { target: '[data-tab="research"]', title: t('tut_research_title'), text: t('tut_research_text'), view: 'shop' },
    { target: '[data-id="market"]', title: t('tut_market_title'), text: t('tut_market_text'), view: 'market' },
    { target: '[data-id="profile"]', title: t('tut_profile_title'), text: t('tut_profile_text') },
    { target: '.btn-daily', title: t('tut_daily_title'), text: t('tut_daily_text') },
  ]
}

function allSteps(): TutorialStep[] {
  return [...mandatorySteps(), ...optionalSteps()]
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
  private active = false

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
    if (!this.active || !this.shouldShow()) return
    const step = allSteps()[this.stepIndex]
    if (step?.waitFor === 'purchase') {
      this.completeMandatoryPhase()
      this.stepIndex++
      this.showStep()
    }
  }

  onTapMade(): void {
    if (!this.active || !this.shouldShow()) return
    const step = allSteps()[this.stepIndex]
    if (step?.waitFor === 'tap') {
      this.stepIndex++
      this.showStep()
    }
  }

  onViewChange(view: NavView): void {
    this.currentView = view
    if (this.state.tutorialDone) {
      this.active = false
      this.cleanup()
      return
    }
    if (!this.active) return
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
    this.active = false
    this.cleanup()
  }

  start(): void {
    if (!this.shouldShow()) return
    this.active = true
    this.mandatoryComplete = this.state.onboardingComplete
    if (this.mandatoryComplete) {
      this.stepIndex = MANDATORY_COUNT
    } else {
      this.stepIndex = 0
    }
    this.showStep()
  }

  restart(): void {
    this.state.tutorialDone = false
    this.state.onboardingComplete = false
    this.mandatoryComplete = false
    this.active = true
    this.stepIndex = 0
    this.showStep()
  }

  private showStep(): void {
    if (!this.active) return
    this.cleanup()
    const steps = allSteps()
    if (this.stepIndex >= steps.length) {
      this.state.tutorialDone = true
      this.active = false
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

      this.ensureTargetInView(target!)
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
          this.active = false
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
          if (this.stepIndex >= MANDATORY_COUNT) {
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

  private ensureTargetInView(target: HTMLElement): void {
    const rect = target.getBoundingClientRect()
    const margin = 24
    const fullyInView = rect.top >= margin && rect.bottom <= window.innerHeight - margin
    if (!fullyInView) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    }
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
