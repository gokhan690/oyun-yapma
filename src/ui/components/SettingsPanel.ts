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
    version.textContent = 'İş İmparatorluğu v2.0.0 — İmparatorluk Çağı'
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
    this.layer.classList.add('is-open')
  }

  hide(): void {
    this.layer.classList.remove('is-open')
  }

  toggle(): void {
    this.layer.classList.toggle('is-open')
  }
}
