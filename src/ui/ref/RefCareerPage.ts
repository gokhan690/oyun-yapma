import { sectionTitle, fmtMoney } from './refShared'
import { buildRefCareerVM, type RefCareerVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { CareerActionId, CareerJobId } from '../../game/Career'
import { SaveManager } from '../../security/SaveManager'

const FALLBACK_CAREER: RefCareerVM = {
  phase: 'employee',
  phaseLabel: 'Çalışan',
  jobTitle: 'Stajyer',
  jobCompany: 'Metro Market · Tam zamanlı',
  level: 1,
  wageDaily: 85,
  businessIncomeDaily: 0,
  showWage: true,
  showBusinessIncome: false,
  stress: 15,
  seniorityYears: 0,
  promoPct: 0,
  promoText: '0 / 100',
  nextRank: '📚 Stajyer',
  careerXpPct: 0,
  careerXpText: 'Kariyer XP · 0%',
  transitionBanner: 'Biriktir, ilk işletmeni kur ve girişimci yoluna geç.',
  actionsRemaining: 3,
  actionsMax: 3,
  actions: [
    { id: 'shift', ico: '🕐', label: 'Mesai Yap', effect: '+maaş · +XP' },
    { id: 'overtime', ico: '🌙', label: 'Ek Mesai', effect: '+maaş · +stres' },
    { id: 'training', ico: '🎓', label: 'Eğitim Al', effect: '+beceri' },
    { id: 'networking', ico: '🌐', label: 'Networking', effect: '+bağlantı' },
    { id: 'freelance', ico: '💻', label: 'Freelance İş Al', effect: '+ek gelir' },
    { id: 'interview', ico: '🤝', label: 'İş Görüşmesine Git', effect: '+terfi şansı' },
  ],
  firstBusinessGoal: {
    producerId: 'stajyer',
    producerName: 'Limonata Tezgahı',
    producerEmoji: '🍋',
    costRequired: 3,
    moneyCurrent: 0,
    pct: 0,
    complete: false,
  },
  timeline: [
    { id: 'employee', label: 'Çalışan', status: 'active', pct: 0 },
    { id: 'entrepreneur', label: 'Girişimci', status: 'locked' },
    { id: 'patron', label: 'Patron', status: 'locked' },
    { id: 'holding', label: 'Holding Sahibi', status: 'locked' },
  ],
  skills: [
    { id: 'sales', name: 'Satış', emoji: '📈', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
    { id: 'management', name: 'Yönetim', emoji: '🏢', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
    { id: 'finance', name: 'Finans', emoji: '💰', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
    { id: 'network', name: 'Network', emoji: '🌐', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
    { id: 'operations', name: 'Operasyon', emoji: '⚙️', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
  ],
  needsJobSelection: false,
  availableJobs: [],
  shiftIncomeToday: 0,
  dailyWageReceivedToday: 0,
  canCollectWage: false,
  wageCollectedToday: false,
  actionsEnabled: false,
}

function phaseBadgeClass(phase: RefCareerVM['phase']): string {
  switch (phase) {
    case 'employee': return 'ref-phase-badge--employee'
    case 'entrepreneur': return 'ref-phase-badge--entrepreneur'
    case 'tycoon': return 'ref-phase-badge--tycoon'
  }
}

function stressFillClass(stress: number): string {
  if (stress >= 70) return 'low'
  if (stress >= 45) return 'medium'
  return 'high'
}

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'KARİYER'

  /** Firmalar sekmesine yönlendirme (satın alma burada yapılmaz). */
  onGoToFirms?: () => void

  private vm: RefCareerVM
  private hasLiveState: boolean
  private contentEl: HTMLElement
  private gameState?: GameState
  private lastNeedsJobSelection = false
  private lastSeenDailyWagePaid = 0

  constructor(vm?: RefCareerVM, hasLiveState = false, gameState?: GameState) {
    this.vm = vm ?? FALLBACK_CAREER
    this.hasLiveState = hasLiveState
    this.gameState = gameState
    this.lastNeedsJobSelection = this.vm.needsJobSelection
    this.lastSeenDailyWagePaid = this.vm.dailyWageReceivedToday
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ref-career-content'
    this.contentEl.addEventListener('click', (e) => this.handleContentClick(e))
    this.el.appendChild(this.contentEl)
    this.renderShell(this.vm)
  }

  refresh(state: GameState): void {
    if (!this.hasLiveState) return
    this.gameState = state
    const prevNeeds = this.lastNeedsJobSelection
    this.vm = buildRefCareerVM(state)
    this.lastNeedsJobSelection = this.vm.needsJobSelection
    if (prevNeeds !== this.vm.needsJobSelection || this.vm.needsJobSelection) {
      this.renderShell(this.vm)
    } else {
      this.applyLive(this.vm)
    }
    this.checkWageToast(this.vm)
  }

  private persistState(): void {
    if (!this.gameState) return
    new SaveManager().save(this.gameState)
  }

  private selectJob(jobId: CareerJobId): void {
    const st = this.gameState
    if (!st || !this.hasLiveState) return
    st.setCareerJob(jobId)
    this.persistState()
    this.refresh(st)
  }

  private onCareerAction(actionId: CareerActionId): void {
    const st = this.gameState
    if (!st || !this.hasLiveState || !st.career.jobId) return
    st.doCareerAction(actionId)
    this.persistState()
    this.refresh(st)
  }

  private handleContentClick(e: Event): void {
    if (!this.hasLiveState || !this.gameState) return
    const target = e.target as HTMLElement
    const jobBtn = target.closest<HTMLElement>('[data-job-id]')
    if (jobBtn?.dataset.jobId) {
      this.selectJob(jobBtn.dataset.jobId as CareerJobId)
      return
    }
    const wageBtn = target.closest<HTMLButtonElement>('[data-collect-wage]')
    if (wageBtn && !wageBtn.disabled) {
      this.onCollectWage()
      return
    }
    const actBtn = target.closest<HTMLButtonElement>('[data-career-action]')
    if (actBtn && !actBtn.disabled && actBtn.dataset.careerAction) {
      this.onCareerAction(actBtn.dataset.careerAction as CareerActionId)
    }
  }

  private onCollectWage(): void {
    const st = this.gameState
    if (!st || !this.hasLiveState) return
    const res = st.collectDailyWage()
    if (res.ok) {
      this.persistState()
      this.showWageToast(res.wage)
      this.lastSeenDailyWagePaid = res.wage
      this.refresh(st)
    }
  }

  private renderJobSelection(c: RefCareerVM): void {
    const banner = document.createElement('div')
    banner.className = 'ref-career-banner ref-career-banner--employee'
    banner.innerHTML = '<span class="ref-career-banner__ico">👷</span><span class="ref-career-banner__txt">İş hayatına başlamak için bir iş seç. Maaşını gör, mesai yaparak para biriktir.</span>'
    this.contentEl.appendChild(banner)

    this.contentEl.appendChild(sectionTitle('İlk İşini Seç', `${c.availableJobs.length} seçenek`))

    const grid = document.createElement('div')
    grid.className = 'ref-job-pick-grid'
    grid.innerHTML = c.availableJobs.map((j) => `
      <button type="button" class="ref-job-pick-card" data-job-id="${j.id}">
        <div class="ref-job-pick-card__head">
          <span class="ref-job-pick-card__emoji">${j.emoji}</span>
          <span class="ref-job-pick-card__name">${j.name}</span>
        </div>
        <p class="ref-job-pick-card__desc">${j.description}</p>
        <div class="ref-job-pick-card__meta">
          <span>Günlük maaş <strong>${fmtMoney(j.dailyWage)}</strong></span>
          <span>Stres <strong>+${j.stressDelta}/gün</strong></span>
          <span>LVL <strong>1</strong></span>
        </div>
        ${j.careerPath ? `<span class="ref-job-pick-card__path">${j.careerPath}</span>` : ''}
      </button>
    `).join('')
    this.contentEl.appendChild(grid)

    const note = document.createElement('div')
    note.className = 'ref-preview-note'
    note.textContent = 'İş seçtikten sonra mesai yaparak para kazanabilirsin. İlk işletmeyi sonra Firmalar sekmesinden alırsın.'
    this.contentEl.appendChild(note)
  }

  private renderActionTileHtml(a: RefCareerVM['actions'][number]): string {
    const used = !!a.usedToday
    const canUse = !!a.bindable && !used
    const locked = !a.bindable
    const cls = [
      'ref-action-tile',
      locked ? 'ref-action-tile--locked' : '',
      used ? 'ref-action-tile--used' : '',
      canUse ? 'ref-action-tile--active' : '',
    ].filter(Boolean).join(' ')
    const disabled = locked || used ? ' disabled aria-disabled="true"' : ''
    const actionAttr = a.careerActionId && a.bindable ? ` data-career-action="${a.careerActionId}"` : ''
    return `
      <button class="${cls}" type="button"${disabled}${actionAttr}>
        <span class="ref-action-tile__ico">${a.ico}</span>
        <span class="ref-action-tile__lbl">${a.label}</span>
        <span class="ref-action-tile__eff">${used ? 'Bugün yapıldı' : a.effect}</span>
      </button>
    `
  }

  private wagePanelHtml(c: RefCareerVM): string {
    if (!c.showWage && !c.actionsEnabled) return ''
    return `
      <div class="ref-wage-panel" data-ref="wage-panel">
        <div class="ref-wage-panel__row">
          <span class="ref-wage-panel__lbl">Günlük maaş</span>
          <span class="ref-wage-panel__val" data-ref="wage-daily-lbl">${fmtMoney(c.wageDaily)}/gün</span>
        </div>
        <div class="ref-wage-panel__row ref-wage-panel__row--highlight">
          <span class="ref-wage-panel__lbl">Bugün alınan maaş</span>
          <span class="ref-wage-panel__val income" data-ref="daily-paid-val">+${fmtMoney(c.dailyWageReceivedToday)}</span>
        </div>
        <div class="ref-wage-panel__row">
          <span class="ref-wage-panel__lbl">Mesai geliri (bugün)</span>
          <span class="ref-wage-panel__val income" data-ref="shift-val">+${fmtMoney(c.shiftIncomeToday)}</span>
        </div>
        ${this.wageButtonHtml(c)}
      </div>
    `
  }

  private wageButtonHtml(c: RefCareerVM): string {
    if (!this.hasLiveState || !c.actionsEnabled) return ''
    if (c.wageCollectedToday) {
      return `
        <div class="ref-wage-auto-pill ref-wage-auto-pill--paid" data-ref="wage-collect">
          ✅ Bugün maaş yattı · +${fmtMoney(c.dailyWageReceivedToday)}
        </div>
      `
    }
    return `
      <div class="ref-wage-auto-pill" data-ref="wage-collect">
        💵 Maaş otomatik yatıyor · ${fmtMoney(c.wageDaily)}/gün
      </div>
    `
  }

  private checkWageToast(c: RefCareerVM): void {
    if (!this.hasLiveState) return
    if (c.dailyWageReceivedToday > this.lastSeenDailyWagePaid && c.dailyWageReceivedToday > 0) {
      this.showWageToast(c.dailyWageReceivedToday)
    }
    this.lastSeenDailyWagePaid = c.dailyWageReceivedToday
  }

  private showWageToast(amount: number): void {
    let toast = this.contentEl.querySelector<HTMLElement>('[data-ref="wage-toast"]')
    if (!toast) {
      toast = document.createElement('div')
      toast.className = 'ref-career-wage-toast'
      toast.dataset.ref = 'wage-toast'
      this.contentEl.prepend(toast)
    }
    toast.textContent = `💵 Günlük maaş yattı: +${fmtMoney(amount)}`
    toast.classList.add('is-visible')
    window.setTimeout(() => toast?.classList.remove('is-visible'), 4500)
  }

  private renderShell(c: RefCareerVM): void {
    this.contentEl.replaceChildren()
    this.lastSeenDailyWagePaid = c.dailyWageReceivedToday

    if (c.needsJobSelection && this.hasLiveState) {
      this.renderJobSelection(c)
      return
    }

    // Geçiş banner'ı
    const banner = document.createElement('div')
    banner.className = `ref-career-banner ref-career-banner--${c.phase}`
    banner.dataset.ref = 'banner'
    banner.innerHTML = `<span class="ref-career-banner__ico">${c.phase === 'employee' ? '👷' : c.phase === 'entrepreneur' ? '🚀' : '👔'}</span><span class="ref-career-banner__txt" data-ref="banner-txt">${c.transitionBanner}</span>`
    this.contentEl.appendChild(banner)

    if (c.showWage || c.actionsEnabled) {
      const wageWrap = document.createElement('div')
      wageWrap.innerHTML = this.wagePanelHtml(c)
      this.contentEl.appendChild(wageWrap.firstElementChild!)
    }

    // Aktif iş kartı
    const job = document.createElement('div')
    job.className = 'ref-job-card'
    const estTag = this.hasLiveState ? '' : ' <span class="ref-est-tag">önizleme</span>'
    job.innerHTML = `
      <div class="ref-job-card__top">
        <div class="ref-job-card__icon" data-ref="job-icon">${c.phase === 'employee' ? '💼' : c.phase === 'entrepreneur' ? '🚀' : '👔'}</div>
        <div class="ref-job-card__id">
          <div class="ref-job-card__title-row">
            <div class="ref-job-card__title" data-ref="job-title">${c.jobTitle}</div>
            <span class="ref-phase-badge ${phaseBadgeClass(c.phase)}" data-ref="phase-badge">${c.phaseLabel}</span>
          </div>
          <div class="ref-job-card__company" data-ref="job-company">${c.jobCompany}</div>
        </div>
        <div class="ref-job-card__lvl" data-ref="job-level">LVL ${c.level}</div>
      </div>
      <div class="ref-job-stats">
        <div class="ref-job-stat" data-ref="stat-biz" ${c.showBusinessIncome ? '' : 'hidden'}>
          <span class="ref-job-stat__lbl">İşletme Geliri</span>
          <span class="ref-job-stat__val income" data-ref="biz-income-val">${fmtMoney(c.businessIncomeDaily)}</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">Kıdem</span>
          <span class="ref-job-stat__val" data-ref="seniority-val">${c.seniorityYears} yıl</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">Sıradaki Terfi</span>
          <span class="ref-job-stat__val" data-ref="next-rank-val">${c.nextRank}</span>
        </div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Terfi${estTag}</span><span data-ref="promo-text">${c.promoText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" data-ref="promo-fill" style="width:${c.promoPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Kariyer XP${estTag}</span><span data-ref="career-xp-text">${c.careerXpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" data-ref="career-xp-fill" style="width:${c.careerXpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Stres</span><span data-ref="stress-val">${c.stress}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${stressFillClass(c.stress)}" data-ref="stress-fill" style="width:${c.stress}%"></div></div>
        </div>
      </div>
    `
    this.contentEl.appendChild(job)

    const actionsTitle = c.actionsEnabled
      ? 'Günlük Aksiyonlar'
      : 'Günlük Aksiyonlar <span class="ref-demo-tag">C4\'te aktif</span>'
    this.contentEl.appendChild(sectionTitle(
      actionsTitle,
      `<span data-ref="actions-remaining">${c.actionsRemaining}</span>/${c.actionsMax} hak`,
    ))
    const actions = document.createElement('div')
    actions.className = 'ref-action-grid'
    actions.innerHTML = c.actions.map((a) => this.renderActionTileHtml(a)).join('')
    this.contentEl.appendChild(actions)
    if (!c.actionsEnabled) {
      const actNote = document.createElement('div')
      actNote.className = 'ref-preview-note'
      actNote.textContent = '🔒 İş seçtikten sonra mesai ve diğer aksiyonlar aktif olur'
      this.contentEl.appendChild(actNote)
    }

    // İlk işletme hedefi
    this.contentEl.appendChild(sectionTitle('İlk İşletme Hedefi'))
    const goal = document.createElement('div')
    goal.className = 'ref-cgoal-list'
    goal.innerHTML = this.firstBizGoalHtml(c)
    this.contentEl.appendChild(goal)

    if (!c.firstBusinessGoal.complete) {
      const cta = document.createElement('button')
      cta.type = 'button'
      cta.className = 'ref-career-cta'
      cta.dataset.ref = 'go-firms'
      cta.innerHTML = `<span>🏪</span> Firmalar sekmesine git · ${c.firstBusinessGoal.producerEmoji} ${c.firstBusinessGoal.producerName}`
      cta.addEventListener('click', () => this.onGoToFirms?.())
      this.contentEl.appendChild(cta)
    } else {
      const done = document.createElement('div')
      done.className = 'ref-career-done-chip'
      done.dataset.ref = 'biz-done'
      done.textContent = '✅ İlk işletme kuruldu — girişimci yolundasın'
      this.contentEl.appendChild(done)
    }

    // Kariyer yolu
    this.contentEl.appendChild(sectionTitle('Kariyer Yolu'))
    const timeline = document.createElement('div')
    timeline.className = 'ref-career-timeline'
    timeline.dataset.ref = 'timeline'
    timeline.innerHTML = this.timelineHtml(c)
    this.contentEl.appendChild(timeline)

    // Beceriler
    this.contentEl.appendChild(sectionTitle('Beceriler'))
    const skills = document.createElement('div')
    skills.className = 'ref-skill-list'
    skills.dataset.ref = 'skills'
    skills.innerHTML = this.skillsHtml(c)
    this.contentEl.appendChild(skills)
  }

  private firstBizGoalHtml(c: RefCareerVM): string {
    const g = c.firstBusinessGoal
    return `
      <div class="ref-cgoal-row">
        <span class="ref-cgoal-ico">${g.producerEmoji}</span>
        <div class="ref-cgoal-main">
          <div class="ref-cgoal-head">
            <span class="ref-cgoal-name">İlk işletmeni kur</span>
            <span class="ref-cgoal-reward">${g.complete ? '✅ Tamam' : '🎯 Hedef'}</span>
          </div>
          <div class="ref-cgoal-desc" data-ref="goal-desc">
            ${g.producerName} · Gereken: <strong data-ref="goal-cost">${fmtMoney(g.costRequired)}</strong>
            · Mevcut: <strong data-ref="goal-money">${fmtMoney(g.moneyCurrent)}</strong>
          </div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill high" data-ref="goal-fill" style="width:${g.pct}%"></div></div>
        </div>
      </div>
    `
  }

  private timelineHtml(c: RefCareerVM): string {
    return c.timeline.map((t) => `
      <div class="ref-timeline-step ref-timeline-step--${t.status}" data-timeline-id="${t.id}">
        <div class="ref-timeline-step__dot" aria-hidden="true"></div>
        <div class="ref-timeline-step__body">
          <div class="ref-timeline-step__head">
            <span class="ref-timeline-step__label">${t.label}</span>
            <span class="ref-timeline-step__status">${t.status === 'done' ? '✓' : t.status === 'active' ? '●' : '○'}</span>
          </div>
          ${t.status === 'active' && t.pct != null ? `
            <div class="ref-perf-track sm"><div class="ref-perf-fill high" style="width:${t.pct}%"></div></div>
          ` : ''}
        </div>
      </div>
    `).join('')
  }

  private skillsHtml(c: RefCareerVM): string {
    return c.skills.map((s) => `
      <div class="ref-skill-row" data-skill-id="${s.id}">
        <span class="ref-skill-emoji">${s.emoji}</span>
        <div class="ref-skill-main">
          <div class="ref-skill-head">
            <span class="ref-skill-name">${s.name}${s.source === 'preview' ? ' <span class="ref-est-tag">önizleme</span>' : ''}</span>
            <span class="ref-skill-lvl" data-skill-lvl="${s.id}">${s.level}/${s.max}</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${s.unlocked ? 'high' : 'medium'}" data-skill-fill="${s.id}" style="width:${s.pct}%"></div></div>
        </div>
      </div>
    `).join('')
  }

  private applyLive(c: RefCareerVM): void {
    const q = (sel: string) => this.contentEl.querySelector<HTMLElement>(sel)

    q('[data-ref="banner-txt"]')!.textContent = c.transitionBanner
    const banner = q('[data-ref="banner"]')!
    banner.className = `ref-career-banner ref-career-banner--${c.phase}`

    q('[data-ref="job-title"]')!.textContent = c.jobTitle
    q('[data-ref="job-company"]')!.textContent = c.jobCompany
    q('[data-ref="job-level"]')!.textContent = `LVL ${c.level}`
    q('[data-ref="phase-badge"]')!.textContent = c.phaseLabel
    q('[data-ref="phase-badge"]')!.className = `ref-phase-badge ${phaseBadgeClass(c.phase)}`

    const wagePanel = q('[data-ref="wage-panel"]')
    if (wagePanel && (c.showWage || c.actionsEnabled)) {
      q('[data-ref="wage-daily-lbl"]')!.textContent = `${fmtMoney(c.wageDaily)}/gün`
      q('[data-ref="daily-paid-val"]')!.textContent = `+${fmtMoney(c.dailyWageReceivedToday)}`
      q('[data-ref="shift-val"]')!.textContent = `+${fmtMoney(c.shiftIncomeToday)}`
      const collectBtn = q('[data-ref="wage-collect"]')
      const newBtnHtml = this.wageButtonHtml(c)
      if (newBtnHtml) {
        if (collectBtn) {
          const tmp = document.createElement('div')
          tmp.innerHTML = newBtnHtml
          collectBtn.replaceWith(tmp.firstElementChild!)
        } else {
          const tmp = document.createElement('div')
          tmp.innerHTML = newBtnHtml
          wagePanel.appendChild(tmp.firstElementChild!)
        }
      } else if (collectBtn) {
        collectBtn.remove()
      }
    } else if ((c.showWage || c.actionsEnabled) && !wagePanel) {
      const wageWrap = document.createElement('div')
      wageWrap.innerHTML = this.wagePanelHtml(c)
      const bannerEl = q('[data-ref="banner"]')
      bannerEl?.insertAdjacentElement('afterend', wageWrap.firstElementChild!)
    }

    const statBiz = q('[data-ref="stat-biz"]')
    if (statBiz) {
      statBiz.hidden = !c.showBusinessIncome
      if (c.showBusinessIncome) q('[data-ref="biz-income-val"]')!.textContent = fmtMoney(c.businessIncomeDaily)
    }

    q('[data-ref="seniority-val"]')!.textContent = `${c.seniorityYears} yıl`
    q('[data-ref="next-rank-val"]')!.textContent = c.nextRank
    q('[data-ref="promo-text"]')!.textContent = c.promoText
    q('[data-ref="promo-fill"]')!.style.width = `${c.promoPct}%`
    q('[data-ref="career-xp-text"]')!.textContent = c.careerXpText
    q('[data-ref="career-xp-fill"]')!.style.width = `${c.careerXpPct}%`
    q('[data-ref="stress-val"]')!.textContent = `${c.stress}%`
    const stressFill = q('[data-ref="stress-fill"]')!
    stressFill.style.width = `${c.stress}%`
    stressFill.className = `ref-perf-fill ${stressFillClass(c.stress)}`

    const actionsRem = q('[data-ref="actions-remaining"]')
    if (actionsRem) actionsRem.textContent = String(c.actionsRemaining)

    const actionsGrid = this.contentEl.querySelector('.ref-action-grid')
    if (actionsGrid) {
      actionsGrid.innerHTML = c.actions.map((a) => this.renderActionTileHtml(a)).join('')
    }

    q('[data-ref="goal-cost"]')!.textContent = fmtMoney(c.firstBusinessGoal.costRequired)
    q('[data-ref="goal-money"]')!.textContent = fmtMoney(c.firstBusinessGoal.moneyCurrent)
    q('[data-ref="goal-fill"]')!.style.width = `${c.firstBusinessGoal.pct}%`

    const timeline = q('[data-ref="timeline"]')
    if (timeline) timeline.innerHTML = this.timelineHtml(c)

    const skills = q('[data-ref="skills"]')
    if (skills) skills.innerHTML = this.skillsHtml(c)

    // CTA ↔ tamamlandı chip
    const existingCta = this.contentEl.querySelector('[data-ref="go-firms"]')
    const existingDone = this.contentEl.querySelector('[data-ref="biz-done"]')
    if (c.firstBusinessGoal.complete) {
      existingCta?.remove()
      if (!existingDone) {
        const done = document.createElement('div')
        done.className = 'ref-career-done-chip'
        done.dataset.ref = 'biz-done'
        done.textContent = '✅ İlk işletme kuruldu — girişimci yolundasın'
        const goalList = this.contentEl.querySelector('.ref-cgoal-list')
        goalList?.insertAdjacentElement('afterend', done)
      }
    } else {
      existingDone?.remove()
      if (!existingCta) {
        const cta = document.createElement('button')
        cta.type = 'button'
        cta.className = 'ref-career-cta'
        cta.dataset.ref = 'go-firms'
        cta.innerHTML = `<span>🏪</span> Firmalar sekmesine git · ${c.firstBusinessGoal.producerEmoji} ${c.firstBusinessGoal.producerName}`
        cta.addEventListener('click', () => this.onGoToFirms?.())
        const goalList = this.contentEl.querySelector('.ref-cgoal-list')
        goalList?.insertAdjacentElement('afterend', cta)
      } else {
        existingCta.innerHTML = `<span>🏪</span> Firmalar sekmesine git · ${c.firstBusinessGoal.producerEmoji} ${c.firstBusinessGoal.producerName}`
      }
    }

    // Faz değişiminde stat grid sütun sayısı — job stats may need layout tweak
    // Phase/job icon update
    const jobIcon = q('[data-ref="job-icon"]')
    if (jobIcon) jobIcon.textContent = c.phase === 'employee' ? '💼' : c.phase === 'entrepreneur' ? '🚀' : '👔'
  }
}
