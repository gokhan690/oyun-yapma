import { sectionTitle, fmtMoney } from './refShared'
import {
  buildRefCareerVM,
  buildRefCareerPhasePreview,
  type RefCareerDevPreviewMode,
  type RefCareerVM,
} from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'

/** DEV-only: production build'de false (vite dead-code elimination). */
const IS_DEV = import.meta.env.DEV

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

  private realVm: RefCareerVM
  private vm: RefCareerVM
  private hasLiveState: boolean
  /** DEV-only: sayfa içi önizleme modu (GameState/localStorage'a yazılmaz). */
  private devPreviewMode: RefCareerDevPreviewMode = 'real'
  private contentEl: HTMLElement

  constructor(vm?: RefCareerVM, hasLiveState = false) {
    this.realVm = vm ?? FALLBACK_CAREER
    this.vm = this.resolveDisplayVm()
    this.hasLiveState = hasLiveState
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    if (IS_DEV) {
      this.el.appendChild(this.buildDevPreviewBar())
    }

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ref-career-content'
    this.el.appendChild(this.contentEl)
    this.renderShell(this.vm)
  }

  refresh(state: GameState): void {
    if (!this.hasLiveState) return
    this.realVm = buildRefCareerVM(state)
    this.vm = this.resolveDisplayVm()
    this.applyLive(this.vm)
  }

  /** Gerçek VM + DEV önizleme override (salt UI). */
  private resolveDisplayVm(): RefCareerVM {
    if (!IS_DEV || this.devPreviewMode === 'real') return this.realVm
    return buildRefCareerPhasePreview(this.devPreviewMode, this.realVm)
  }

  private buildDevPreviewBar(): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'ref-career-devbar'
    bar.setAttribute('aria-label', 'Kariyer faz önizleme (yalnızca geliştirme)')

    const label = document.createElement('div')
    label.className = 'ref-career-devbar__label'
    label.innerHTML = '🧪 Önizleme modu <span class="ref-est-tag">DEV</span>'
    bar.appendChild(label)

    const opts: { id: RefCareerDevPreviewMode; text: string }[] = [
      { id: 'real', text: 'Gerçek veri' },
      { id: 'employee', text: 'Çalışan' },
      { id: 'entrepreneur', text: 'Girişimci' },
      { id: 'tycoon', text: 'Patron' },
    ]

    const seg = document.createElement('div')
    seg.className = 'ref-career-devbar__seg'
    seg.setAttribute('role', 'group')

    for (const o of opts) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-career-devbar__btn'
      btn.dataset.mode = o.id
      btn.textContent = o.text
      if (o.id === this.devPreviewMode) btn.classList.add('is-active')
      btn.addEventListener('click', () => this.setDevPreviewMode(o.id))
      seg.appendChild(btn)
    }
    bar.appendChild(seg)

    const hint = document.createElement('div')
    hint.className = 'ref-career-devbar__hint'
    hint.textContent = 'Yalnızca Kariyer UI · GameState değişmez'
    bar.appendChild(hint)

    return bar
  }

  private setDevPreviewMode(mode: RefCareerDevPreviewMode): void {
    if (!IS_DEV) return
    this.devPreviewMode = mode
    this.el.querySelectorAll<HTMLButtonElement>('.ref-career-devbar__btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mode === mode)
    })
    this.vm = this.resolveDisplayVm()
    this.renderShell(this.vm)
  }

  private renderShell(c: RefCareerVM): void {
    this.contentEl.replaceChildren()

    // Geçiş banner'ı
    const banner = document.createElement('div')
    banner.className = `ref-career-banner ref-career-banner--${c.phase}`
    banner.dataset.ref = 'banner'
    banner.innerHTML = `<span class="ref-career-banner__ico">${c.phase === 'employee' ? '👷' : c.phase === 'entrepreneur' ? '🚀' : '👔'}</span><span class="ref-career-banner__txt" data-ref="banner-txt">${c.transitionBanner}</span>`
    this.contentEl.appendChild(banner)

    // Aktif iş kartı
    const job = document.createElement('div')
    job.className = 'ref-job-card'
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
        <div class="ref-job-stat" data-ref="stat-wage" ${c.showWage ? '' : 'hidden'}>
          <span class="ref-job-stat__lbl">Günlük Maaş <span class="ref-est-tag">önizleme</span></span>
          <span class="ref-job-stat__val income" data-ref="wage-val">${fmtMoney(c.wageDaily)}</span>
        </div>
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
          <div class="ref-job-bar__lbl"><span>Terfi <span class="ref-est-tag">önizleme</span></span><span data-ref="promo-text">${c.promoText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" data-ref="promo-fill" style="width:${c.promoPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Kariyer XP <span class="ref-est-tag">önizleme</span></span><span data-ref="career-xp-text">${c.careerXpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" data-ref="career-xp-fill" style="width:${c.careerXpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Stres</span><span data-ref="stress-val">${c.stress}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${stressFillClass(c.stress)}" data-ref="stress-fill" style="width:${c.stress}%"></div></div>
        </div>
      </div>
    `
    this.contentEl.appendChild(job)

    // Günlük aksiyonlar
    this.contentEl.appendChild(sectionTitle(
      'Günlük Aksiyonlar <span class="ref-demo-tag">C4\'te aktif</span>',
      `<span data-ref="actions-remaining">${c.actionsRemaining}</span>/${c.actionsMax} hak`,
    ))
    const actions = document.createElement('div')
    actions.className = 'ref-action-grid'
    actions.innerHTML = c.actions.map((a) => `
      <button class="ref-action-tile ref-action-tile--locked${a.usedToday ? ' ref-action-tile--used' : ''}" type="button" disabled aria-disabled="true">
        <span class="ref-action-tile__ico">${a.ico}</span>
        <span class="ref-action-tile__lbl">${a.label}</span>
        <span class="ref-action-tile__eff">${a.usedToday ? 'Bugün yapıldı' : a.effect}</span>
      </button>
    `).join('')
    this.contentEl.appendChild(actions)
    const actNote = document.createElement('div')
    actNote.className = 'ref-preview-note'
    actNote.textContent = '🔒 View-only · aksiyonlar C4\'te bağlanacak, şu an para/XP vermez'
    this.contentEl.appendChild(actNote)

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

    const statWage = q('[data-ref="stat-wage"]')!
    const statBiz = q('[data-ref="stat-biz"]')!
    statWage.hidden = !c.showWage
    statBiz.hidden = !c.showBusinessIncome
    if (c.showWage) q('[data-ref="wage-val"]')!.textContent = fmtMoney(c.wageDaily)
    if (c.showBusinessIncome) q('[data-ref="biz-income-val"]')!.textContent = fmtMoney(c.businessIncomeDaily)

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
      actionsGrid.innerHTML = c.actions.map((a) => `
        <button class="ref-action-tile ref-action-tile--locked${a.usedToday ? ' ref-action-tile--used' : ''}" type="button" disabled aria-disabled="true">
          <span class="ref-action-tile__ico">${a.ico}</span>
          <span class="ref-action-tile__lbl">${a.label}</span>
          <span class="ref-action-tile__eff">${a.usedToday ? 'Bugün yapıldı' : a.effect}</span>
        </button>
      `).join('')
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
