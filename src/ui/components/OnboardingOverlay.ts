import { i18n, LANG_META, type LangCode } from '../../i18n'
import { COUNTRIES, type CountryId } from '../../game/Countries'
import {
  JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS,
  type JobId, type EducationLevel, type LifestyleType, type CharacterProfile,
} from '../../game/CharacterProfile'

/**
 * First-run setup shown before the game starts: pick a language, a country,
 * then character questions (job, education, lifestyle). Choices shape the
 * run: starting money, daily income bonus, health/stress.
 */
export class OnboardingOverlay {
  private root: HTMLElement | null = null
  private selectedLang: LangCode
  private selectedCountry: CountryId = 'tr'
  private selectedJob: JobId = 'calisan'
  private selectedEducation: EducationLevel = 'lise'
  private selectedLifestyle: LifestyleType = 'orta'
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

  private renderLangStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

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
    next.setAttribute('aria-label', 'Next')
    next.addEventListener('click', () => this.renderCountryStep())

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private renderCountryStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

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
        `<span class="ob-country-name">${c.name}</span>` +
        `<span class="ob-country-capital">${c.cities[0].emoji} ${c.cities[0].label}</span>`
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
    next.setAttribute('aria-label', 'Next')
    next.addEventListener('click', () => this.renderJobStep())

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  /** Ortak seçim adımı: başlık + kart gridi + ileri/başla butonu. */
  private renderChoiceStep<T extends string>(opts: {
    title: string
    sub: string
    entries: [T, { label: string; emoji: string; desc: string }][]
    selected: T
    onSelect: (id: T) => void
    onNext: () => void
    isLast?: boolean
  }): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = opts.title
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = opts.sub

    const grid = document.createElement('div')
    grid.className = 'onboarding-country-grid onboarding-character-grid'
    for (const [id, def] of opts.entries) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `onboarding-country-btn${opts.selected === id ? ' active' : ''}`
      btn.innerHTML =
        `<span class="ob-flag">${def.emoji}</span>` +
        `<span class="ob-country-name">${def.label}</span>` +
        `<span class="ob-country-capital">${def.desc}</span>`
      btn.addEventListener('click', () => {
        opts.onSelect(id)
        grid.querySelectorAll('.onboarding-country-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    if (opts.isLast) {
      next.className = 'onboarding-start-btn'
      next.textContent = this.startLabel()
    } else {
      next.className = 'onboarding-next-btn'
      next.textContent = '→'
      next.setAttribute('aria-label', 'Next')
    }
    next.addEventListener('click', opts.onNext)

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private renderJobStep(): void {
    this.renderChoiceStep({
      title: '💼 ' + this.tr('Hangi işte çalışmak istiyorsun?', 'What do you want to work as?'),
      sub: this.tr('Mesleğin başlangıç paranı ve günlük ek gelirini belirler.', 'Your job sets starting money and daily bonus income.'),
      entries: Object.entries(JOB_DEFS) as [JobId, typeof JOB_DEFS[JobId]][],
      selected: this.selectedJob,
      onSelect: (id) => { this.selectedJob = id },
      onNext: () => this.renderEducationStep(),
    })
  }

  private renderEducationStep(): void {
    this.renderChoiceStep({
      title: '🎓 ' + this.tr('Eğitim seviyen ne?', 'What is your education level?'),
      sub: this.tr('Eğitim başlangıç sermayeni ve araştırma hızını etkiler.', 'Education affects starting capital and research speed.'),
      entries: Object.entries(EDUCATION_DEFS) as [EducationLevel, typeof EDUCATION_DEFS[EducationLevel]][],
      selected: this.selectedEducation,
      onSelect: (id) => { this.selectedEducation = id },
      onNext: () => this.renderLifestyleStep(),
    })
  }

  private renderLifestyleStep(): void {
    this.renderChoiceStep({
      title: '🌿 ' + this.tr('Nasıl bir yaşam tarzı?', 'What lifestyle?'),
      sub: this.tr('Yaşam tarzın sağlık, stres ve aylık giderini belirler.', 'Lifestyle sets health, stress and monthly expenses.'),
      entries: Object.entries(LIFESTYLE_DEFS) as [LifestyleType, typeof LIFESTYLE_DEFS[LifestyleType]][],
      selected: this.selectedLifestyle,
      onSelect: (id) => { this.selectedLifestyle = id },
      onNext: () => this.finish(),
      isLast: true,
    })
  }

  private tr(trText: string, enText: string): string {
    return this.selectedLang === 'tr' ? trText : enText
  }

  private finish(): void {
    this.root?.remove()
    this.root = null
    this.onComplete(this.selectedCountry, {
      jobId: this.selectedJob,
      educationLevel: this.selectedEducation,
      lifestyleType: this.selectedLifestyle,
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
      tr: 'Başla', en: 'Start', de: 'Start', fr: 'Commencer', es: 'Empezar',
      pt: 'Começar', ru: 'Начать', ja: '開始', zh: '开始', ar: 'ابدأ',
    }
    return map[this.selectedLang] ?? map.en!
  }
}
