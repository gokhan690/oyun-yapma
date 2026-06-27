import { i18n, fmt, LANG_META, type LangCode } from '../../i18n'
import { COUNTRIES, countryDisplayName, countryCityDisplayName, type CountryId } from '../../game/Countries'
import {
  JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS,
  profileJobLabel, profileJobDesc,
  educationLabel, educationDesc,
  lifestyleLabel, lifestyleDesc,
  computeStartingMoney, STARTING_MONEY_RANGE,
  type JobId, type EducationLevel, type LifestyleType, type CharacterProfile,
} from '../../game/CharacterProfile'
import { CHARACTER_BACKGROUNDS, careerBgName, careerBgDesc, backgroundDef, type CharacterBackgroundId } from '../../game/Career'
import { DIFFICULTY_OPTIONS, difficultyName, difficultyDesc } from '../../game/CharacterCreation'
import { REPUTATION_START } from '../../game/Reputation'

/**
 * First-run setup: 8-step flow with back navigation and progress.
 * Lang(1)→Country(2)→NameGender(3)→Background(4)→Education(5)→Job(6)→Lifestyle(7)→Difficulty(8,Başla)
 */
export class OnboardingOverlay {
  private root: HTMLElement | null = null
  private applying = false
  private selectedLang: LangCode
  private selectedCountry: CountryId = 'tr'
  private selectedName = 'Baron'
  private selectedGender: 'male' | 'female' = 'male'
  private selectedBackground: CharacterBackgroundId = 'sifirdan_gelen'
  private selectedDifficulty: 'easy' | 'normal' | 'hard' = 'normal'
  private selectedJob: JobId = 'calisan'
  private selectedEducation: EducationLevel = 'lise'
  private selectedLifestyle: LifestyleType = 'orta'
  private summaryHost?: HTMLElement
  private readonly onComplete: (country: CountryId, profile: CharacterProfile) => void

  constructor(onComplete: (country: CountryId, profile: CharacterProfile) => void) {
    this.onComplete = onComplete
    this.selectedLang = i18n.getLang()
  }

  show(): void {
    this.root = document.createElement('div')
    this.root.className = 'onboarding-overlay'
    this.renderLangStep()
    document.body.appendChild(this.root)
  }

  private clear(): void {
    if (this.root) this.root.replaceChildren()
  }

  private mkProgress(step: number): HTMLElement {
    const el = document.createElement('span')
    el.className = 'ob-progress'
    el.textContent = `${step} / 8`
    return el
  }

  private mkBack(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'onboarding-back-btn'
    btn.textContent = `← ${i18n.t('ref_back')}`
    btn.addEventListener('click', onClick)
    return btn
  }

  private mkTopRow(step: number, onBack?: () => void): HTMLElement {
    const row = document.createElement('div')
    row.className = 'ob-top-row'
    if (onBack) {
      row.appendChild(this.mkBack(onBack))
    } else {
      const spacer = document.createElement('span')
      spacer.className = 'ob-top-spacer'
      row.appendChild(spacer)
    }
    row.appendChild(this.mkProgress(step))
    return row
  }

  private renderLangStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    card.appendChild(this.mkTopRow(1))

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '🌐 Language · Dil'
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = 'Choose your language / Dilini seç'

    const grid = document.createElement('div')
    grid.className = 'onboarding-lang-grid'
    for (const code of Object.keys(LANG_META) as LangCode[]) {
      const meta = LANG_META[code]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `onboarding-lang-btn${this.selectedLang === code ? ' active' : ''}`
      btn.innerHTML = `<span class="ob-lang-native">${meta.nativeLabel}</span><span class="ob-lang-label">${meta.label}</span>`
      btn.addEventListener('click', () => {
        this.selectedLang = code
        i18n.setLang(code)
        grid.querySelectorAll('.onboarding-lang-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = '→'
    next.setAttribute('aria-label', i18n.t('ob_next'))
    next.addEventListener('click', () => this.renderCountryStep())

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private renderCountryStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    card.appendChild(this.mkTopRow(2, () => this.renderLangStep()))

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '🌍 ' + this.countryHeading()
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = this.countrySub()

    const grid = document.createElement('div')
    grid.className = 'onboarding-country-grid'
    for (const c of COUNTRIES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `onboarding-country-btn${this.selectedCountry === c.id ? ' active' : ''}`
      btn.innerHTML =
        `<span class="ob-flag">${c.flag}</span>` +
        `<span class="ob-country-name">${countryDisplayName(c.id)}</span>` +
        `<span class="ob-country-capital">${c.cities[0].emoji} ${countryCityDisplayName(c.id, 0)}</span>`
      btn.addEventListener('click', () => {
        this.selectedCountry = c.id
        grid.querySelectorAll('.onboarding-country-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = '→'
    next.setAttribute('aria-label', i18n.t('ob_next'))
    next.addEventListener('click', () => this.renderNameGenderStep())

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private renderNameGenderStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    card.appendChild(this.mkTopRow(3, () => this.renderCountryStep()))

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = i18n.t('ob_intro_heading')
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = i18n.t('ob_intro_sub')

    const nameSection = document.createElement('div')
    nameSection.className = 'ob-section'
    const nameLabel = document.createElement('label')
    nameLabel.className = 'ob-label'
    nameLabel.textContent = i18n.t('ob_name_label')
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.className = 'ob-name-input'
    nameInput.value = ''
    nameInput.placeholder = 'Baron'
    nameInput.maxLength = 20
    nameInput.addEventListener('input', () => {
      this.selectedName = nameInput.value.trim() || 'Baron'
    })
    nameSection.append(nameLabel, nameInput)

    const genderSection = document.createElement('div')
    genderSection.className = 'ob-section'
    const genderLabel = document.createElement('label')
    genderLabel.className = 'ob-label'
    genderLabel.textContent = i18n.t('ob_gender_label')
    const genderRow = document.createElement('div')
    genderRow.className = 'ob-gender-row'
    const genders: { id: 'male' | 'female'; emoji: string; labelKey: 'ob_gender_male' | 'ob_gender_female' }[] = [
      { id: 'male', emoji: '👨', labelKey: 'ob_gender_male' },
      { id: 'female', emoji: '👩', labelKey: 'ob_gender_female' },
    ]
    for (const g of genders) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-gender-btn${this.selectedGender === g.id ? ' active' : ''}`
      btn.innerHTML = `<span style="font-size:22px">${g.emoji}</span>${i18n.t(g.labelKey)}`
      btn.addEventListener('click', () => {
        this.selectedGender = g.id
        genderRow.querySelectorAll('.ob-gender-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      genderRow.appendChild(btn)
    }
    genderSection.append(genderLabel, genderRow)

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = '→'
    next.setAttribute('aria-label', i18n.t('ob_next'))
    next.addEventListener('click', () => this.renderBackgroundStep())

    card.append(h, sub, nameSection, genderSection, next)
    this.root.appendChild(card)
  }

  private renderBackgroundStep(): void {
    this.renderChoiceStep({
      step: 4,
      title: i18n.t('ob_background_heading'),
      sub: i18n.t('ob_background_sub'),
      entries: CHARACTER_BACKGROUNDS.map((b) => [
        b.id,
        { label: careerBgName(b), emoji: b.emoji, desc: careerBgDesc(b), chips: this.backgroundChips(b) },
      ]),
      selected: this.selectedBackground,
      onSelect: (id) => { this.selectedBackground = id },
      onBack: () => this.renderNameGenderStep(),
      onNext: () => this.renderEducationStep(),
    })
  }

  private renderEducationStep(): void {
    this.renderChoiceStep({
      step: 5,
      title: i18n.t('ob_edu_heading'),
      sub: i18n.t('ob_edu_sub'),
      entries: (Object.entries(EDUCATION_DEFS) as [EducationLevel, typeof EDUCATION_DEFS[EducationLevel]][]).map(
        ([id, def]) => [id, { label: educationLabel(id), emoji: def.emoji, desc: educationDesc(id), chips: this.eduChips(id) }],
      ),
      selected: this.selectedEducation,
      onSelect: (id) => { this.selectedEducation = id },
      onBack: () => this.renderBackgroundStep(),
      onNext: () => this.renderJobStep(),
      centerLast: true,
    })
  }

  private renderJobStep(): void {
    this.renderChoiceStep({
      step: 6,
      title: i18n.t('ob_job_heading'),
      sub: i18n.t('ob_job_sub'),
      entries: (Object.entries(JOB_DEFS) as [JobId, typeof JOB_DEFS[JobId]][]).map(([id, def]) => [
        id,
        {
          label: profileJobLabel(id),
          emoji: def.emoji,
          desc: profileJobDesc(id),
          chips: this.jobChips(id),
        },
      ]),
      selected: this.selectedJob,
      onSelect: (id) => { this.selectedJob = id },
      onBack: () => this.renderEducationStep(),
      onNext: () => this.renderLifestyleStep(),
    })
  }

  private renderLifestyleStep(): void {
    this.renderChoiceStep({
      step: 7,
      title: i18n.t('ob_lifestyle_heading'),
      sub: i18n.t('ob_lifestyle_sub'),
      entries: (Object.entries(LIFESTYLE_DEFS) as [LifestyleType, typeof LIFESTYLE_DEFS[LifestyleType]][]).map(
        ([id, def]) => [id, { label: lifestyleLabel(id), emoji: def.emoji, desc: lifestyleDesc(id), chips: this.lifestyleChips(id) }],
      ),
      selected: this.selectedLifestyle,
      onSelect: (id) => { this.selectedLifestyle = id },
      onBack: () => this.renderJobStep(),
      onNext: () => this.renderDifficultyStep(),
      centerLast: true,
    })
  }

  private renderDifficultyStep(): void {
    this.renderChoiceStep({
      step: 8,
      title: i18n.t('ob_difficulty_heading'),
      sub: i18n.t('ob_difficulty_sub'),
      entries: DIFFICULTY_OPTIONS.map((d) => [d.id, { label: difficultyName(d.id), emoji: d.emoji, desc: difficultyDesc(d.id), chips: this.difficultyChips(d.id) }]),
      selected: this.selectedDifficulty,
      onSelect: (id) => { this.selectedDifficulty = id },
      onBack: () => this.renderLifestyleStep(),
      onNext: () => this.finish(),
      isLast: true,
      centerLast: true,
      footer: () => this.buildStartingSummary(),
    })
  }

  // ── TUR13: gerçek (rakamsal) etki çipleri — yalnız var olan etkiler gösterilir ──
  private pct(v: number): string { return String(Math.round(v * 100)) }

  private backgroundChips(b: typeof CHARACTER_BACKGROUNDS[number]): string[] {
    const c: string[] = []
    if (b.startingReputationBonus) c.push(fmt('ob_chip_rep_fmt', { n: String(b.startingReputationBonus) }))
    if (b.clickBonus) c.push(fmt('ob_chip_active_fmt', { n: this.pct(b.clickBonus) }))
    if (b.illegalBonus) c.push(fmt('ob_chip_illegal_fmt', { n: this.pct(b.illegalBonus) }))
    if (b.costDiscount) c.push(fmt('ob_chip_cost_fmt', { n: this.pct(b.costDiscount) }))
    if (b.researchBonus) c.push(fmt('ob_chip_research_pct_fmt', { n: this.pct(b.researchBonus) }))
    if (b.heatBonus) c.push(fmt('ob_chip_heat_fmt', { n: String(b.heatBonus) }))
    if (b.unlockFinanceEarly) c.push(i18n.t('ob_chip_finance_early'))
    return c
  }

  private moneyMultChips(mult: number): string[] {
    const pct = Math.round((mult - 1) * 100)
    if (pct > 0) return [fmt('ob_chip_money_up_fmt', { n: String(pct) })]
    if (pct < 0) return [fmt('ob_chip_money_down_fmt', { n: String(-pct) })]
    return []
  }

  private jobChips(id: JobId): string[] {
    const def = JOB_DEFS[id]
    const c = this.moneyMultChips(def.startingMoneyMult)
    if (def.incomeDailyBonus > 0) c.push(fmt('ob_chip_daily_fmt', { n: String(def.incomeDailyBonus) }))
    return c
  }

  private eduChips(id: EducationLevel): string[] {
    const def = EDUCATION_DEFS[id]
    const c = this.moneyMultChips(def.moneyMult)
    if (def.researchBonus > 0) c.push(fmt('ob_chip_research_lvl_fmt', { n: String(def.researchBonus) }))
    return c
  }

  private lifestyleChips(id: LifestyleType): string[] {
    const def = LIFESTYLE_DEFS[id]
    const c: string[] = []
    const pct = Math.round((def.monthlyExpenseMult - 1) * 100)
    if (pct > 0) c.push(fmt('ob_chip_expense_up_fmt', { n: String(pct) }))
    else if (pct < 0) c.push(fmt('ob_chip_expense_down_fmt', { n: String(-pct) }))
    else c.push(i18n.t('ob_chip_expense_std'))
    c.push(fmt('ob_chip_health_fmt', { n: String(def.startHealth) }))
    c.push(fmt('ob_chip_stress_fmt', { n: String(def.startStress) }))
    return c
  }

  private difficultyChips(id: 'easy' | 'normal' | 'hard'): string[] {
    const r = STARTING_MONEY_RANGE[id]
    return [fmt('ob_chip_range_fmt', { min: String(r.min), max: String(r.max) })]
  }

  private currentProfile(): CharacterProfile {
    return {
      jobId: this.selectedJob,
      educationLevel: this.selectedEducation,
      lifestyleType: this.selectedLifestyle,
      name: this.selectedName,
      gender: this.selectedGender,
      backgroundId: this.selectedBackground,
      difficulty: this.selectedDifficulty,
    }
  }

  /** Son adımda canlı başlangıç özeti — applyProfileToState ile AYNI kaynaktan. */
  private buildStartingSummary(): HTMLElement {
    const p = this.currentProfile()
    const money = computeStartingMoney(p)
    const job = JOB_DEFS[p.jobId]
    const life = LIFESTYLE_DEFS[p.lifestyleType]
    const edu = EDUCATION_DEFS[p.educationLevel]
    const bg = backgroundDef(p.backgroundId)
    const rep = Math.min(100, REPUTATION_START + (bg?.startingReputationBonus ?? 0))
    const firmDiscount = Math.round((bg?.costDiscount ?? 0) * 100)
    const rows = [
      fmt('ob_summary_money_fmt', { n: String(money) }),
      fmt('ob_summary_career_fmt', { n: String(job.incomeDailyBonus) }),
      fmt('ob_summary_health_fmt', { n: String(life.startHealth) }),
      fmt('ob_summary_stress_fmt', { n: String(life.startStress) }),
      fmt('ob_summary_rep_fmt', { n: String(rep) }),
    ]
    if (edu.researchBonus > 0) rows.push(fmt('ob_summary_research_fmt', { n: String(edu.researchBonus) }))
    if (firmDiscount > 0) rows.push(fmt('ob_summary_firm_fmt', { n: String(firmDiscount) }))
    const wrap = document.createElement('div')
    wrap.className = 'ob-summary'
    wrap.innerHTML = `<div class="ob-summary__title">${i18n.t('ob_summary_title')}</div>` +
      rows.map(r => `<div class="ob-summary__row">${r}</div>`).join('')
    return wrap
  }

  private renderChoiceStep<T extends string>(opts: {
    step: number
    title: string
    sub: string
    entries: [T, { label: string; emoji: string; desc: string; chips?: string[] }][]
    selected: T
    onSelect: (id: T) => void
    onBack?: () => void
    onNext: () => void
    isLast?: boolean
    centerLast?: boolean
    footer?: () => HTMLElement
  }): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    card.appendChild(this.mkTopRow(opts.step, opts.onBack))

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = opts.title
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = opts.sub

    const gridClass = ['onboarding-country-grid', 'onboarding-character-grid']
    if (opts.centerLast) gridClass.push('ob-grid--center-last')
    const grid = document.createElement('div')
    grid.className = gridClass.join(' ')

    for (const [id, def] of opts.entries) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `onboarding-country-btn${opts.selected === id ? ' active' : ''}`
      const chipsHtml = (def.chips && def.chips.length)
        ? `<span class="ob-chips">${def.chips.map(ch => `<span class="ob-chip">${ch}</span>`).join('')}</span>`
        : ''
      btn.innerHTML =
        `<span class="ob-flag">${def.emoji}</span>` +
        `<span class="ob-country-name">${def.label}</span>` +
        `<span class="ob-country-capital">${def.desc}</span>` +
        chipsHtml
      btn.addEventListener('click', () => {
        opts.onSelect(id)
        grid.querySelectorAll('.onboarding-country-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        if (this.summaryHost) { this.summaryHost.replaceChildren(this.buildStartingSummary()) }
      })
      grid.appendChild(btn)
    }

    // Canlı başlangıç özeti (yalnız son adım — footer sağlanırsa)
    this.summaryHost = undefined
    let footerEl: HTMLElement | undefined
    if (opts.footer) {
      this.summaryHost = document.createElement('div')
      this.summaryHost.className = 'ob-summary-host'
      this.summaryHost.appendChild(opts.footer())
      footerEl = this.summaryHost
    }

    const next = document.createElement('button')
    next.type = 'button'
    if (opts.isLast) {
      next.className = 'onboarding-start-btn'
      next.textContent = this.startLabel()
      next.addEventListener('click', () => {
        if (this.applying) return
        this.applying = true
        opts.onNext()
      })
    } else {
      next.className = 'onboarding-next-btn'
      next.textContent = '→'
      next.setAttribute('aria-label', i18n.t('ob_next'))
      next.addEventListener('click', opts.onNext)
    }

    if (footerEl) card.append(h, sub, grid, footerEl, next)
    else card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private finish(): void {
    this.root?.remove()
    this.root = null
    this.onComplete(this.selectedCountry, {
      jobId: this.selectedJob,
      educationLevel: this.selectedEducation,
      lifestyleType: this.selectedLifestyle,
      name: this.selectedName,
      gender: this.selectedGender,
      backgroundId: this.selectedBackground,
      difficulty: this.selectedDifficulty,
    })
  }

  private countryHeading(): string {
    const map: Partial<Record<LangCode, string>> = {
      tr: 'Ülkeni seç', en: 'Choose your country', de: 'Wähle dein Land',
      fr: 'Choisis ton pays', es: 'Elige tu país', pt: 'Escolha seu país',
      ru: 'Выберите страну', ja: '国を選択', zh: '选择你的国家', ar: 'اختر بلدك',
    }
    return map[this.selectedLang] ?? map.en!
  }

  private countrySub(): string {
    const map: Partial<Record<LangCode, string>> = {
      tr: 'Başkentinde başlarsın; franchise için 2 büyük şehrin daha açılır.',
      en: 'You start in its capital; 2 more major cities unlock for franchises.',
      de: 'Du startest in der Hauptstadt; 2 weitere Großstädte für Franchises.',
      fr: 'Tu démarres dans la capitale ; 2 grandes villes en plus pour les franchises.',
      es: 'Empiezas en su capital; se desbloquean 2 grandes ciudades para franquicias.',
      pt: 'Você começa na capital; mais 2 grandes cidades para franquias.',
      ru: 'Старт в столице; ещё 2 крупных города для франшиз.',
      ja: '首都からスタート。フランチャイズ用に2都市が解放されます。',
      zh: '从首都开始；解锁另外2座大城市用于加盟。',
      ar: 'تبدأ في العاصمة؛ تُفتح مدينتان كبيرتان للامتياز.',
    }
    return map[this.selectedLang] ?? map.en!
  }

  private startLabel(): string {
    const map: Partial<Record<LangCode, string>> = {
      tr: '🚀 Başla', en: '🚀 Start', de: '🚀 Start', fr: '🚀 Commencer',
      es: '🚀 Empezar', pt: '🚀 Começar', ru: '🚀 Начать', ja: '🚀 開始', zh: '🚀 开始', ar: '🚀 ابدأ',
    }
    return map[this.selectedLang] ?? map.en!
  }
}
