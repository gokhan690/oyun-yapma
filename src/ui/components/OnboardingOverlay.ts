import { i18n, LANG_META, type LangCode } from '../../i18n'
import { COUNTRIES, type CountryId } from '../../game/Countries'
import {
  CAREER_JOBS,
  CHARACTER_BACKGROUNDS,
  type CareerJobId,
  type CharacterBackgroundId,
} from '../../game/Career'
import {
  DIFFICULTY_OPTIONS,
  DEFAULT_CHARACTER,
  type CharacterCreationResult,
} from '../../game/CharacterCreation'

export class OnboardingOverlay {
  private root: HTMLElement | null = null
  private selectedLang: LangCode
  private selectedCountry: CountryId = 'tr'
  private characterName = DEFAULT_CHARACTER.name
  private selectedGender: 'male' | 'female' = DEFAULT_CHARACTER.gender
  private selectedBackground: CharacterBackgroundId = DEFAULT_CHARACTER.backgroundId
  private selectedJob: CareerJobId = DEFAULT_CHARACTER.startingJobId
  private selectedDifficulty: 'easy' | 'normal' | 'hard' = DEFAULT_CHARACTER.difficulty
  private readonly onComplete: (country: CountryId, character: CharacterCreationResult) => void

  constructor(onComplete: (country: CountryId, character: CharacterCreationResult) => void) {
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
    next.addEventListener('click', () => this.renderCharacterStep())

    card.append(h, sub, grid, next)
    this.root.appendChild(card)
  }

  private renderCharacterStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card onboarding-card-wide'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '👤 Karakterini Oluştur'

    // İsim
    const nameSection = document.createElement('div')
    nameSection.className = 'ob-section'
    const nameLabel = document.createElement('label')
    nameLabel.className = 'ob-label'
    nameLabel.textContent = 'İsmin'
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.className = 'ob-name-input'
    nameInput.value = this.characterName
    nameInput.placeholder = 'Baron...'
    nameInput.maxLength = 20
    nameInput.addEventListener('input', () => {
      this.characterName = nameInput.value.trim() || DEFAULT_CHARACTER.name
    })
    nameSection.append(nameLabel, nameInput)

    // Cinsiyet
    const genderSection = document.createElement('div')
    genderSection.className = 'ob-section'
    const genderLabel = document.createElement('p')
    genderLabel.className = 'ob-label'
    genderLabel.textContent = 'Cinsiyet'
    const genderRow = document.createElement('div')
    genderRow.className = 'ob-gender-row'
    for (const [id, label, emoji] of [['male', 'Erkek', '👨'], ['female', 'Kadın', '👩']] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-gender-btn${this.selectedGender === id ? ' active' : ''}`
      btn.innerHTML = `<span>${emoji}</span><span>${label}</span>`
      btn.addEventListener('click', () => {
        this.selectedGender = id
        genderRow.querySelectorAll('.ob-gender-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      genderRow.appendChild(btn)
    }
    genderSection.append(genderLabel, genderRow)

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = 'İleri →'
    next.addEventListener('click', () => this.renderBackgroundStep())

    card.append(h, nameSection, genderSection, next)
    this.root.appendChild(card)
  }

  private renderBackgroundStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card onboarding-card-wide'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '🌱 Geçmişini Seç'
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = 'Başlangıç bonusunu etkiler. Oyunu kırmaz, farklı hissettir.'

    const grid = document.createElement('div')
    grid.className = 'ob-background-grid'
    for (const bg of CHARACTER_BACKGROUNDS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-background-btn${this.selectedBackground === bg.id ? ' active' : ''}`
      btn.innerHTML =
        `<span class="ob-bg-emoji">${bg.emoji}</span>` +
        `<span class="ob-bg-name">${bg.name}</span>` +
        `<span class="ob-bg-bonus">${bg.bonusLabel}</span>` +
        `<span class="ob-bg-desc">${bg.description}</span>`
      btn.addEventListener('click', () => {
        this.selectedBackground = bg.id
        grid.querySelectorAll('.ob-background-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = 'İleri →'
    next.addEventListener('click', () => this.renderJobStep())

    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'onboarding-back-btn'
    back.textContent = '← Geri'
    back.addEventListener('click', () => this.renderCharacterStep())

    card.append(h, sub, grid, back, next)
    this.root.appendChild(card)
  }

  private renderJobStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card onboarding-card-wide'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '💼 İlk İşini Seç'
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = 'Hedefe ulaşınca (10.000₺) kendi işini kurabilirsin.'

    const grid = document.createElement('div')
    grid.className = 'ob-job-grid'
    for (const job of CAREER_JOBS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-job-btn${this.selectedJob === job.id ? ' active' : ''}`
      btn.innerHTML =
        `<span class="ob-job-emoji">${job.emoji}</span>` +
        `<span class="ob-job-name">${job.name}</span>` +
        `<span class="ob-job-wage">₺${job.baseDailyWage}/gün</span>` +
        `<span class="ob-job-desc">${job.description}</span>`
      btn.addEventListener('click', () => {
        this.selectedJob = job.id
        grid.querySelectorAll('.ob-job-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = 'İleri →'
    next.addEventListener('click', () => this.renderDifficultyStep())

    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'onboarding-back-btn'
    back.textContent = '← Geri'
    back.addEventListener('click', () => this.renderBackgroundStep())

    card.append(h, sub, grid, back, next)
    this.root.appendChild(card)
  }

  private renderDifficultyStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '⚙️ Zorluk Seç'

    const grid = document.createElement('div')
    grid.className = 'ob-difficulty-grid'
    for (const diff of DIFFICULTY_OPTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ob-difficulty-btn${this.selectedDifficulty === diff.id ? ' active' : ''}`
      btn.innerHTML =
        `<span class="ob-diff-emoji">${diff.emoji}</span>` +
        `<span class="ob-diff-name">${diff.name}</span>` +
        `<span class="ob-diff-desc">${diff.description}</span>`
      btn.addEventListener('click', () => {
        this.selectedDifficulty = diff.id
        grid.querySelectorAll('.ob-difficulty-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      grid.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'onboarding-next-btn'
    next.textContent = 'İleri →'
    next.addEventListener('click', () => this.renderCountryStep())

    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'onboarding-back-btn'
    back.textContent = '← Geri'
    back.addEventListener('click', () => this.renderJobStep())

    card.append(h, grid, back, next)
    this.root.appendChild(card)
  }

  private renderCountryStep(): void {
    if (!this.root) return
    this.clear()
    const card = document.createElement('div')
    card.className = 'onboarding-card'

    const h = document.createElement('h1')
    h.className = 'onboarding-title'
    h.textContent = '🌍 Ülkeni Seç'
    const sub = document.createElement('p')
    sub.className = 'onboarding-sub'
    sub.textContent = 'Başkentinde başlarsın; franchise için 2 büyük şehrin daha açılır.'

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

    const start = document.createElement('button')
    start.type = 'button'
    start.className = 'onboarding-start-btn'
    start.textContent = '🚀 Başla'
    start.addEventListener('click', () => this.finish())

    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'onboarding-back-btn'
    back.textContent = '← Geri'
    back.addEventListener('click', () => this.renderDifficultyStep())

    card.append(h, sub, grid, back, start)
    this.root.appendChild(card)
  }

  private finish(): void {
    this.root?.remove()
    this.root = null
    const character: CharacterCreationResult = {
      name: this.characterName,
      gender: this.selectedGender,
      backgroundId: this.selectedBackground,
      startingJobId: this.selectedJob,
      difficulty: this.selectedDifficulty,
    }
    this.onComplete(this.selectedCountry, character)
  }
}
