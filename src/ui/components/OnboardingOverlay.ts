import { i18n, LANG_META, type LangCode } from '../../i18n'
import { COUNTRIES, type CountryId } from '../../game/Countries'
import {
  JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS,
  type JobId, type EducationLevel, type LifestyleType, type CharacterProfile,
} from '../../game/CharacterProfile'
import { CHARACTER_BACKGROUNDS, type CharacterBackgroundId } from '../../game/Career'
import { DIFFICULTY_OPTIONS } from '../../game/CharacterCreation'

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

  private tr(trText: string, enText: string): string {
    return this.selectedLang === 'tr' ? trText : enText
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
    btn.textContent = `← ${this.tr('Geri', 'Back')}`
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
    h.textContent = '🪪 ' + this.tr('Kendini tanıt', 'Introduce yourself')
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = this.tr(
      'İsmin ve cinsiyetin oyun boyunca seni temsil eder.',
      'Your name and gender represent you throughout the game.',
    )

    const nameSection = document.createElement('div')
    nameSection.className = 'ob-section'
    const nameLabel = document.createElement('label')
    nameLabel.className = 'ob-label'
    nameLabel.textContent = this.tr('İsmin', 'Your name')
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
    genderLabel.textContent = this.tr('Cinsiyet', 'Gender')
    const genderRow = document.createElement('div')
    genderRow.className = 'ob-gender-row'
    const genders: { id: 'male' | 'female'; emoji: string; label: string }[] = [
      { id: 'male', emoji: '👨', label: this.tr('Erkek', 'Male') },
      { id: 'female', emoji: '👩', label: this.tr('Kadın', 'Female') },
    ]
    for (const g of genders) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-gender-btn${this.selectedGender === g.id ? ' active' : ''}`
      btn.innerHTML = `<span style="font-size:22px">${g.emoji}</span>${g.label}`
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
    next.setAttribute('aria-label', 'Next')
    next.addEventListener('click', () => this.renderBackgroundStep())

    card.append(h, sub, nameSection, genderSection, next)
    this.root.appendChild(card)
  }

  private renderBackgroundStep(): void {
    const descOverrides: Partial<Record<CharacterBackgroundId, string>> = {
      sifirdan_gelen: this.tr(
        'Hiçbir servetin yok ama kararlısın. İtibar kazanımın daha hızlıdır.',
        'You have no wealth but you are determined. You gain reputation faster.',
      ),
      universiteli: this.tr(
        'Eğitimli geçmişin teknoloji ve araştırma alanlarında avantaj sağlar.',
        'Your educated background gives an edge in tech and research.',
      ),
      satisci: this.tr(
        'Doğal satış yeteneğin vardır. Yasal gelirde daha hızlı büyürsün.',
        'You have a natural talent for sales. You grow faster in legal income.',
      ),
      finansci: this.tr(
        'Piyasaları iyi tanırsın. Borsaya erken erişim ve kriz avantajı sağlar.',
        'You know the markets well. Early stock access and crisis advantage.',
      ),
      aile_sirketi: this.tr(
        'Ailenden küçük bir işletme devralırsın. İlk işletme maliyetin daha düşüktür.',
        'You inherit a small family business. Your first business costs less.',
      ),
      karanlik_cevre: this.tr(
        'Yeraltı bağlantıların işe yarar. Yasa dışı gelirin yüksektir ancak aranma riskin artar.',
        'Your underground connections pay off. High illegal income but more heat.',
      ),
    }
    this.renderChoiceStep({
      step: 4,
      title: '🌱 ' + this.tr('Nasıl Bir Geçmişten Geliyorsun?', 'What Is Your Background?'),
      sub: this.tr(
        'Geçmişin başlangıç paranı, itibarını ve bazı yeteneklerini etkiler.',
        'Your background affects starting money, reputation and some skills.',
      ),
      entries: CHARACTER_BACKGROUNDS.map((b) => [
        b.id,
        { label: b.name, emoji: b.emoji, desc: descOverrides[b.id] ?? b.description },
      ]),
      selected: this.selectedBackground,
      onSelect: (id) => { this.selectedBackground = id },
      onBack: () => this.renderNameGenderStep(),
      onNext: () => this.renderEducationStep(),
    })
  }

  private renderEducationStep(): void {
    const descOverrides: Partial<Record<EducationLevel, string>> = {
      ilkokul: this.tr(
        'Düşük başlangıç sermayesi ve temel işlere erişim.',
        'Low starting capital and access to basic jobs.',
      ),
      lise: this.tr('Dengeli ve standart bir başlangıç.', 'A balanced, standard start.'),
      universite: this.tr('Daha iyi başlangıç ve araştırma bonusu.', 'Better start and a research bonus.'),
      yukseklisans: this.tr(
        'Güçlü bağlantılar ve araştırma avantajı.',
        'Strong connections and research advantage.',
      ),
      doktora: this.tr(
        'Maksimum araştırma bonusu ve akademik avantaj.',
        'Maximum research bonus and academic advantage.',
      ),
    }
    this.renderChoiceStep({
      step: 5,
      title: '🎓 ' + this.tr('Eğitim Seviyen Ne?', 'What Is Your Education Level?'),
      sub: this.tr(
        'Eğitimin başlangıç sermayeni, iş seçeneklerini ve araştırma hızını etkiler.',
        'Education affects starting capital, job options and research speed.',
      ),
      entries: (Object.entries(EDUCATION_DEFS) as [EducationLevel, typeof EDUCATION_DEFS[EducationLevel]][]).map(
        ([id, def]) => [id, { label: def.label, emoji: def.emoji, desc: descOverrides[id] ?? def.desc }],
      ),
      selected: this.selectedEducation,
      onSelect: (id) => { this.selectedEducation = id },
      onBack: () => this.renderBackgroundStep(),
      onNext: () => this.renderJobStep(),
      centerLast: true,
    })
  }

  private renderJobStep(): void {
    const labelOverrides: Partial<Record<JobId, string>> = {
      serbest: this.tr('Serbest Çalışan', 'Freelancer'),
    }
    const descOverrides: Partial<Record<JobId, string>> = {
      calisan: this.tr('Düzenli maaş ve güvenli başlangıç.', 'Steady salary and a safe start.'),
      serbest: this.tr('Esnek çalışma ve değişken gelir.', 'Flexible work and variable income.'),
      girisimci: this.tr('Yüksek risk, yüksek büyüme potansiyeli.', 'High risk, high growth potential.'),
      sanatci: this.tr(
        'Şöhret ve itibar avantajı, daha düşük başlangıç geliri.',
        'Fame and reputation advantage, lower starting income.',
      ),
      akademisyen: this.tr('Araştırma bonusu ve düzenli gelir.', 'Research bonus and steady income.'),
      sporcu: this.tr('Şöhret, performans ve sponsor geliri.', 'Fame, performance and sponsor income.'),
    }
    this.renderChoiceStep({
      step: 6,
      title: '💼 ' + this.tr('Kariyer Yolun Ne Olsun?', 'What Is Your Career Path?'),
      sub: this.tr(
        'Kariyer yolun başlangıç gelirini, risklerini ve gelişim seçeneklerini belirler.',
        'Your career path sets your starting income, risks and growth options.',
      ),
      entries: (Object.entries(JOB_DEFS) as [JobId, typeof JOB_DEFS[JobId]][]).map(([id, def]) => [
        id,
        {
          label: labelOverrides[id] ?? def.label,
          emoji: def.emoji,
          desc: descOverrides[id] ?? def.desc,
        },
      ]),
      selected: this.selectedJob,
      onSelect: (id) => { this.selectedJob = id },
      onBack: () => this.renderEducationStep(),
      onNext: () => this.renderLifestyleStep(),
    })
  }

  private renderLifestyleStep(): void {
    const labelOverrides: Partial<Record<LifestyleType, string>> = {
      orta: this.tr('Dengeli', 'Balanced'),
    }
    const descOverrides: Partial<Record<LifestyleType, string>> = {
      mutevazi: this.tr('Düşük aylık gider ve daha az stres.', 'Low monthly expenses and less stress.'),
      orta: this.tr('Standart giderler ve dengeli yaşam.', 'Standard expenses and a balanced life.'),
      luks: this.tr(
        'Yüksek gider, yüksek statü ve itibar avantajı.',
        'High expenses, high status and reputation advantage.',
      ),
    }
    this.renderChoiceStep({
      step: 7,
      title: '🌿 ' + this.tr('Nasıl Bir Yaşam Tarzı?', 'What Lifestyle?'),
      sub: this.tr(
        'Yaşam tarzın aylık giderlerini, stresini ve sosyal statünü etkiler.',
        'Your lifestyle affects monthly expenses, stress and social status.',
      ),
      entries: (Object.entries(LIFESTYLE_DEFS) as [LifestyleType, typeof LIFESTYLE_DEFS[LifestyleType]][]).map(
        ([id, def]) => [id, { label: labelOverrides[id] ?? def.label, emoji: def.emoji, desc: descOverrides[id] ?? def.desc }],
      ),
      selected: this.selectedLifestyle,
      onSelect: (id) => { this.selectedLifestyle = id },
      onBack: () => this.renderJobStep(),
      onNext: () => this.renderDifficultyStep(),
      centerLast: true,
    })
  }

  private renderDifficultyStep(): void {
    const descOverrides: Record<'easy' | 'normal' | 'hard', string> = {
      easy: this.tr(
        'Daha fazla başlangıç parası, düşük gider ve daha az risk.',
        'More starting money, lower expenses and less risk.',
      ),
      normal: this.tr('Dengeli ekonomi ve standart riskler.', 'Balanced economy and standard risks.'),
      hard: this.tr(
        'Daha az başlangıç parası, yüksek gider ve daha sert riskler.',
        'Less starting money, higher expenses and harsher risks.',
      ),
    }
    this.renderChoiceStep({
      step: 8,
      title: '🎚️ ' + this.tr('Zorluk seç', 'Choose difficulty'),
      sub: this.tr('Zorluk başlangıç paranı ve riskleri belirler.', 'Difficulty sets your starting money and risk level.'),
      entries: DIFFICULTY_OPTIONS.map((d) => [d.id, { label: d.name, emoji: d.emoji, desc: descOverrides[d.id] }]),
      selected: this.selectedDifficulty,
      onSelect: (id) => { this.selectedDifficulty = id },
      onBack: () => this.renderLifestyleStep(),
      onNext: () => this.finish(),
      isLast: true,
      centerLast: true,
    })
  }

  private renderChoiceStep<T extends string>(opts: {
    step: number
    title: string
    sub: string
    entries: [T, { label: string; emoji: string; desc: string }][]
    selected: T
    onSelect: (id: T) => void
    onBack?: () => void
    onNext: () => void
    isLast?: boolean
    centerLast?: boolean
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
      next.addEventListener('click', () => {
        if (this.applying) return
        this.applying = true
        opts.onNext()
      })
    } else {
      next.className = 'onboarding-next-btn'
      next.textContent = '→'
      next.setAttribute('aria-label', 'Next')
      next.addEventListener('click', opts.onNext)
    }

    card.append(h, sub, grid, next)
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
