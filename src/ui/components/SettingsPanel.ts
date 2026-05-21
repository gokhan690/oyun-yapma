import type { GameState } from '../../game/GameState'
import type { SoundManager } from '../../audio/SoundManager'
import type { SaveManager } from '../../security/SaveManager'

export class SettingsPanel {
  readonly layer: HTMLElement
  private state: GameState
  private sound: SoundManager
  private saveManager: SaveManager
  private onTutorialRestart: () => void
  private onReset: () => void

  constructor(
    state: GameState,
    sound: SoundManager,
    saveManager: SaveManager,
    onTutorialRestart: () => void,
    onReset: () => void,
  ) {
    this.state = state
    this.sound = sound
    this.saveManager = saveManager
    this.onTutorialRestart = onTutorialRestart
    this.onReset = onReset
    this.layer = document.createElement('div')
    this.layer.className = 'slide-panel settings-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.textContent = 'Ayarlar'
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

    body.appendChild(this.sectionTitle('Oyun'))

    const soundRow = this.toggleRow('Ses efektleri', this.sound.isEnabled(), () => {
      this.sound.setEnabled(!this.sound.isEnabled())
    })
    body.appendChild(soundRow)

    const tutorialBtn = document.createElement('button')
    tutorialBtn.type = 'button'
    tutorialBtn.className = 'btn-secondary'
    tutorialBtn.dataset.action = 'restart-tutorial'
    tutorialBtn.textContent = 'Tutorial tekrar göster'
    tutorialBtn.addEventListener('click', () => {
      this.hide()
      this.onTutorialRestart()
    })
    body.appendChild(tutorialBtn)

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'btn-danger'
    resetBtn.textContent = 'Kaydı sıfırla'
    resetBtn.addEventListener('click', () => {
      if (confirm('Tüm ilerleme silinecek. Emin misin?')) {
        this.saveManager.clear()
        this.state.resetProgress()
        this.hide()
        this.onReset()
      }
    })
    body.appendChild(resetBtn)

    const version = document.createElement('p')
    version.className = 'version-tag'
    version.textContent = 'İş İmparatorluğu v2.2.0'
    body.appendChild(version)

    const hapticRow = this.toggleRow('Titreşim', this.state.hapticsEnabled, () => {
      this.state.hapticsEnabled = !this.state.hapticsEnabled
    })
    body.appendChild(hapticRow)

    const motionRow = this.toggleRow('Azaltılmış hareket', this.state.reducedMotion, () => {
      this.state.reducedMotion = !this.state.reducedMotion
      document.documentElement.classList.toggle('reduced-motion', this.state.reducedMotion)
    })
    body.appendChild(motionRow)

    this.layer.append(header, body)
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

  show(): void {
    const nameInput = this.layer.querySelector<HTMLInputElement>('#profile-name')
    const yearInput = this.layer.querySelector<HTMLInputElement>('#profile-birth-year')
    if (nameInput) nameInput.value = this.state.playerName
    if (yearInput && this.state.birthYear) yearInput.value = String(this.state.birthYear)
    this.layer.classList.add('is-open')
  }

  hide(): void {
    this.layer.classList.remove('is-open')
  }

  toggle(): void {
    if (!this.layer.classList.contains('is-open')) this.show()
    else this.hide()
  }
}
