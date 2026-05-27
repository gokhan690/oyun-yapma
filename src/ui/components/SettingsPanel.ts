import type { GameState } from '../../game/GameState'
import type { SoundManager } from '../../audio/SoundManager'
import type { SaveManager } from '../../security/SaveManager'
import { THEMES, type ThemeId } from '../../game/Themes'
import { APP_TITLE, APP_VERSION } from '../../appVersion'
import { rescheduleFromPrefs, isWebPushSupported, isNativePlatform } from '../../notifications/NotificationManager'
import { i18n, LANG_META, t, type LangCode } from '../../i18n'
import { COUNTRIES } from '../../game/Countries'

export class SettingsPanel {
  readonly layer: HTMLElement
  private state: GameState
  private sound: SoundManager
  private saveManager: SaveManager
  private onTutorialRestart: () => void
  private onReset: () => void
  private onThemeChange: (themeId: ThemeId) => void

  constructor(
    state: GameState,
    sound: SoundManager,
    saveManager: SaveManager,
    onTutorialRestart: () => void,
    onReset: () => void,
    onThemeChange: (themeId: ThemeId) => void = () => {},
  ) {
    this.state = state
    this.sound = sound
    this.saveManager = saveManager
    this.onTutorialRestart = onTutorialRestart
    this.onReset = onReset
    this.onThemeChange = onThemeChange
    this.layer = document.createElement('div')
    this.layer.className = 'slide-panel settings-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.textContent = t('settings_title')
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'icon-btn'
    close.dataset.action = 'close-settings'
    close.textContent = '✕'
    header.append(title, close)

    const body = document.createElement('div')
    body.className = 'panel-body'

    body.appendChild(this.sectionTitle('Profil'))
    const nameLabel = document.createElement('label')
    nameLabel.className = 'settings-field'
    nameLabel.innerHTML = 'Baron adı<input id="profile-name" type="text" maxlength="24" placeholder="Baron" />'
    body.appendChild(nameLabel)

    const yearLabel = document.createElement('label')
    yearLabel.className = 'settings-field'
    yearLabel.innerHTML = 'Doğum yılı<input id="profile-birth-year" type="number" min="1920" max="2026" placeholder="1990" />'
    body.appendChild(yearLabel)

    const genderLabel = document.createElement('label')
    genderLabel.className = 'settings-field'
    genderLabel.innerHTML = 'Cinsiyet<select id="profile-gender"><option value="male">Erkek</option><option value="female">Kadın</option></select>'
    body.appendChild(genderLabel)

    const saveProfile = document.createElement('button')
    saveProfile.type = 'button'
    saveProfile.className = 'btn-primary'
    saveProfile.dataset.action = 'save-profile'
    saveProfile.textContent = 'Profili kaydet'
    body.appendChild(saveProfile)

    body.appendChild(this.sectionTitle('Miras — çocuğa aktar'))
    const legacyHint = document.createElement('p')
    legacyHint.className = 'settings-hint'
    legacyHint.textContent = 'Miras kodunu kopyala, çocuğunun telefonunda Ayarlar → Kodu yapıştır ile aynı kaydı yüklesin. Render veya sunucu gerekmez.'
    body.appendChild(legacyHint)

    const exportBtn = document.createElement('button')
    exportBtn.type = 'button'
    exportBtn.className = 'btn-secondary'
    exportBtn.dataset.action = 'export-legacy'
    exportBtn.textContent = '📋 Miras kodu oluştur'
    body.appendChild(exportBtn)

    const importArea = document.createElement('textarea')
    importArea.id = 'legacy-import'
    importArea.className = 'legacy-import-input'
    importArea.placeholder = 'Miras kodunu buraya yapıştır…'
    importArea.rows = 3
    body.appendChild(importArea)

    const importBtn = document.createElement('button')
    importBtn.type = 'button'
    importBtn.className = 'btn-secondary'
    importBtn.dataset.action = 'import-legacy'
    importBtn.textContent = '⬇️ Miras kodunu yükle'
    body.appendChild(importBtn)

    body.appendChild(this.sectionTitle('Kayıt'))
    const restoreHint = document.createElement('p')
    restoreHint.className = 'settings-hint'
    restoreHint.textContent = 'Ana kayıt açılmazsa otomatik yedekten geri yüklemeyi dene.'
    body.appendChild(restoreHint)
    const restoreBtn = document.createElement('button')
    restoreBtn.type = 'button'
    restoreBtn.className = 'btn-secondary'
    restoreBtn.dataset.action = 'restore-save-backup'
    restoreBtn.textContent = '💾 Yedekten geri yükle'
    body.appendChild(restoreBtn)

    body.appendChild(this.sectionTitle('🌐 Dil / Language'))
    const langGrid = document.createElement('div')
    langGrid.className = 'settings-lang-grid'
    for (const [code, meta] of Object.entries(LANG_META) as [LangCode, typeof LANG_META[LangCode]][]) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `settings-lang-btn${i18n.getLang() === code ? ' active' : ''}`
      btn.dataset.action = 'set-language'
      btn.dataset.id = code
      btn.innerHTML = `<span class="lang-native">${meta.nativeLabel}</span><span class="lang-label">${meta.label}</span>`
      langGrid.appendChild(btn)
    }
    body.appendChild(langGrid)

    body.appendChild(this.sectionTitle('🌍 Ülke / Country'))
    const countryGrid = document.createElement('div')
    countryGrid.className = 'settings-country-grid'
    for (const c of COUNTRIES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `settings-country-btn${this.state.country === c.id ? ' active' : ''}`
      btn.dataset.action = 'set-country'
      btn.dataset.id = c.id
      btn.innerHTML = `<span class="country-flag">${c.flag}</span><span class="country-name">${c.name}</span>`
      countryGrid.appendChild(btn)
    }
    body.appendChild(countryGrid)

    body.appendChild(this.sectionTitle(t('settings_section_appearance')))

    const themeWrap = document.createElement('div')
    themeWrap.className = 'settings-theme-grid'
    themeWrap.id = 'theme-picker'
    body.appendChild(themeWrap)

    body.appendChild(this.sectionTitle(t('settings_notifications')))
    body.appendChild(this.notifHint())

    const notifDaily = this.notifToggle(t('notif_daily_reward'), 'notif-daily', () => this.state.notificationPrefs.dailyReward, (v) => {
      this.state.notificationPrefs.dailyReward = v
      void this.syncNotifications()
    })
    body.appendChild(notifDaily)

    const notifPassive = this.notifToggle(t('notif_passive_income'), 'notif-passive', () => this.state.notificationPrefs.passiveIncome, (v) => {
      this.state.notificationPrefs.passiveIncome = v
      void this.syncNotifications()
    })
    body.appendChild(notifPassive)

    const notifGoal = this.notifToggle(t('notif_daily_goal'), 'notif-goal', () => this.state.notificationPrefs.goalNear, (v) => {
      this.state.notificationPrefs.goalNear = v
      void this.syncNotifications()
    })
    body.appendChild(notifGoal)

    if (isWebPushSupported() && !isNativePlatform()) {
      const notifWeb = this.notifToggle(t('notif_web_push'), 'notif-webpush', () => this.state.notificationPrefs.webPush, (v) => {
        this.state.notificationPrefs.webPush = v
        void this.syncNotifications()
      })
      body.appendChild(notifWeb)
    }

    body.appendChild(this.sectionTitle(t('settings_section_difficulty')))
    const diffHint = document.createElement('p')
    diffHint.className = 'settings-hint'
    diffHint.textContent = t('settings_difficulty_hint')
    body.appendChild(diffHint)
    body.appendChild(this.buildDifficultyGrid())

    body.appendChild(this.sectionTitle(t('settings_section_game')))

    const soundRow = this.toggleRow(t('settings_sound_effects'), this.sound.isEnabled(), () => {
      this.sound.setEnabled(!this.sound.isEnabled())
    })
    body.appendChild(soundRow)

    const tutorialBtn = document.createElement('button')
    tutorialBtn.type = 'button'
    tutorialBtn.className = 'btn-secondary'
    tutorialBtn.dataset.action = 'restart-tutorial'
    tutorialBtn.textContent = t('settings_tutorial_replay')
    tutorialBtn.addEventListener('click', () => {
      this.hide()
      this.onTutorialRestart()
    })
    body.appendChild(tutorialBtn)

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'btn-danger'
    resetBtn.textContent = t('settings_reset_save')
    resetBtn.addEventListener('click', () => {
      if (confirm(t('settings_reset_confirm'))) {
        this.saveManager.clear()
        this.state.resetProgress()
        this.hide()
        this.onReset()
      }
    })
    body.appendChild(resetBtn)

    const version = document.createElement('p')
    version.className = 'version-tag'
    version.textContent = `${APP_TITLE} v${APP_VERSION}`
    body.appendChild(version)

    const hapticRow = this.toggleRow(t('settings_haptic'), this.state.hapticsEnabled, () => {
      this.state.hapticsEnabled = !this.state.hapticsEnabled
    })
    body.appendChild(hapticRow)

    const motionRow = this.toggleRow(t('settings_reduced_motion'), this.state.reducedMotion, () => {
      this.state.reducedMotion = !this.state.reducedMotion
      document.documentElement.classList.toggle('reduced-motion', this.state.reducedMotion)
    })
    body.appendChild(motionRow)

    this.layer.append(header, body)
  }

  private buildDifficultyGrid(): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'difficulty-grid'
    const diffs: { id: 'easy' | 'normal' | 'hard'; emoji: string; name: string; desc: string }[] = [
      { id: 'easy', emoji: '😌', name: t('diff_easy'), desc: t('diff_easy_desc') },
      { id: 'normal', emoji: '💼', name: t('diff_normal'), desc: t('diff_normal_desc') },
      { id: 'hard', emoji: '🔥', name: t('diff_hard'), desc: t('diff_hard_desc') },
    ]
    for (const d of diffs) {
      const card = document.createElement('div')
      card.className = `difficulty-card${this.state.difficulty === d.id ? ' selected' : ''}`
      card.innerHTML = `<span class="diff-emoji">${d.emoji}</span><strong class="diff-name">${d.name}</strong><small class="diff-desc">${d.desc}</small>`
      card.addEventListener('click', () => {
        this.state.difficulty = d.id
        grid.querySelectorAll('.difficulty-card').forEach((c) => c.classList.remove('selected'))
        card.classList.add('selected')
      })
      grid.appendChild(card)
    }
    return grid
  }

  private sectionTitle(text: string): HTMLElement {
    const el = document.createElement('h3')
    el.className = 'settings-section-title'
    el.textContent = text
    return el
  }

  private toggleRow(label: string, on: boolean, toggle: () => void): HTMLElement {
    const row = document.createElement('label')
    row.className = 'settings-row'
    const span = document.createElement('span')
    span.textContent = label
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = on
    input.addEventListener('change', toggle)
    row.append(span, input)
    return row
  }

  private notifHint(): HTMLElement {
    const p = document.createElement('p')
    p.className = 'settings-hint'
    p.textContent = isNativePlatform()
      ? t('notif_hint_native')
      : t('notif_hint_web')
    return p
  }

  private notifToggle(
    label: string,
    id: string,
    get: () => boolean,
    set: (v: boolean) => void,
  ): HTMLElement {
    const row = document.createElement('label')
    row.className = 'settings-row'
    const span = document.createElement('span')
    span.textContent = label
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = id
    input.checked = get()
    input.addEventListener('change', () => set(input.checked))
    row.append(span, input)
    return row
  }

  private async syncNotifications(): Promise<void> {
    await rescheduleFromPrefs(this.state.notificationPrefs)
  }

  private renderThemePicker(): void {
    const wrap = this.layer.querySelector('#theme-picker')
    if (!wrap) return
    wrap.replaceChildren()
    for (const t of THEMES) {
      const unlocked = this.state.unlockedThemes.has(t.id)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `theme-pick-btn${this.state.activeTheme === t.id ? ' active' : ''}`
      btn.dataset.action = 'set-theme'
      btn.dataset.id = t.id
      if (unlocked) {
        btn.innerHTML = `<span>${t.emoji}</span> ${t.name}`
      } else {
        btn.innerHTML = `<span>${t.emoji}</span> ${t.name} 🔒<br><small>${t.hint}</small>`
      }
      btn.disabled = !unlocked
      wrap.appendChild(btn)
    }
  }

  show(): void {
    const nameInput = this.layer.querySelector<HTMLInputElement>('#profile-name')
    const yearInput = this.layer.querySelector<HTMLInputElement>('#profile-birth-year')
    if (nameInput) nameInput.value = this.state.playerName
    if (yearInput && this.state.birthYear) yearInput.value = String(this.state.birthYear)
    const genderInput = this.layer.querySelector<HTMLSelectElement>('#profile-gender')
    if (genderInput) genderInput.value = this.state.playerGender
    const daily = this.layer.querySelector<HTMLInputElement>('#notif-daily')
    const passive = this.layer.querySelector<HTMLInputElement>('#notif-passive')
    const goal = this.layer.querySelector<HTMLInputElement>('#notif-goal')
    if (daily) daily.checked = this.state.notificationPrefs.dailyReward
    if (passive) passive.checked = this.state.notificationPrefs.passiveIncome
    if (goal) goal.checked = this.state.notificationPrefs.goalNear
    const webPush = this.layer.querySelector<HTMLInputElement>('#notif-webpush')
    if (webPush) webPush.checked = this.state.notificationPrefs.webPush
    this.renderThemePicker()
    this.layer.classList.add('is-open')
  }

  applyTheme(themeId: ThemeId): void {
    if (!this.state.unlockedThemes.has(themeId)) return
    this.state.setActiveTheme(themeId)
    this.onThemeChange(themeId)
    this.renderThemePicker()
  }

  hide(): void {
    this.layer.classList.remove('is-open')
  }

  toggle(): void {
    if (!this.layer.classList.contains('is-open')) this.show()
    else this.hide()
  }

  rebuild(): void {
    this.layer.replaceChildren()
    this.build()
    this.show()
  }
}
