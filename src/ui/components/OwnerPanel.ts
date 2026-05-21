import type { GameState } from '../../game/GameState'
import type { SaveManager } from '../../security/SaveManager'
import { formatMoney } from '../../game/Economy'
import { THEMES, type ThemeId } from '../../game/Themes'
import { OWNER_FLAGS, loadOwnerFlags, saveOwnerFlags, type OwnerFlags } from '../../owner/FeatureFlags'
import {
  clearOwnerSession,
  isOwnerSession,
  refreshOwnerSession,
  startOwnerSession,
  verifyOwnerPin,
} from '../../owner/OwnerAuth'

export class OwnerPanel {
  readonly layer: HTMLElement
  private state: GameState
  private saveManager: SaveManager
  private onChange: () => void
  private body!: HTMLElement
  private flags: OwnerFlags = loadOwnerFlags()

  constructor(state: GameState, saveManager: SaveManager, onChange: () => void) {
    this.state = state
    this.saveManager = saveManager
    this.onChange = onChange
    this.layer = document.createElement('div')
    this.layer.className = 'owner-panel-layer'
    this.layer.hidden = true
    this.build()
  }

  private build(): void {
    this.body = document.createElement('div')
    this.body.className = 'owner-panel-body'
    this.layer.appendChild(this.body)
  }

  openLogin(): void {
    this.layer.hidden = false
    this.renderLogin()
  }

  openDashboard(): void {
    if (!isOwnerSession()) {
      this.openLogin()
      return
    }
    refreshOwnerSession()
    this.layer.hidden = false
    this.renderDashboard()
  }

  hide(): void {
    this.layer.hidden = true
  }

  isOpen(): boolean {
    return !this.layer.hidden
  }

  private renderLogin(): void {
    this.body.replaceChildren()
    const card = document.createElement('div')
    card.className = 'owner-login-card'
    card.innerHTML = `
      <span class="owner-badge">👑</span>
      <h2>Baron Girişi</h2>
      <p>Sadece oyun sahibi. Bu ekran normal oyunculara görünmez.</p>
    `
    const input = document.createElement('input')
    input.type = 'password'
    input.className = 'owner-pin-input'
    input.placeholder = 'PIN'
    input.autocomplete = 'off'
    input.maxLength = 32
    const err = document.createElement('p')
    err.className = 'owner-login-err'
    err.hidden = true
    const row = document.createElement('div')
    row.className = 'owner-login-actions'
    const loginBtn = document.createElement('button')
    loginBtn.type = 'button'
    loginBtn.className = 'btn-primary'
    loginBtn.textContent = 'Giriş'
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.dataset.action = 'owner-close'
    cancelBtn.textContent = 'İptal'
    row.append(loginBtn, cancelBtn)
    card.append(input, err, row)
    this.body.appendChild(card)

    const tryLogin = (): void => {
      if (verifyOwnerPin(input.value)) {
        startOwnerSession()
        this.renderDashboard()
      } else {
        err.hidden = false
        err.textContent = 'Yanlış PIN'
        input.value = ''
      }
    }
    loginBtn.addEventListener('click', tryLogin)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryLogin()
    })
    window.setTimeout(() => input.focus(), 100)
  }

  private renderDashboard(): void {
    this.flags = loadOwnerFlags()
    this.body.replaceChildren()

    const header = document.createElement('div')
    header.className = 'owner-dash-header'
    header.innerHTML = `<div><h2>👑 Baron Konsolu</h2><small>Oyuncular bu sayfayı göremez</small></div>`
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'icon-btn'
    closeBtn.dataset.action = 'owner-close'
    closeBtn.textContent = '✕'
    const logoutBtn = document.createElement('button')
    logoutBtn.type = 'button'
    logoutBtn.className = 'btn-secondary btn-sm'
    logoutBtn.dataset.action = 'owner-logout'
    logoutBtn.textContent = 'Çıkış'
    header.append(closeBtn, logoutBtn)
    this.body.appendChild(header)

    this.body.appendChild(this.section('💰 Ekonomi', this.economyControls()))
    this.body.appendChild(this.section('🧪 Beta özellikler', this.flagControls()))
    this.body.appendChild(this.section('⚡ Hızlı aksiyonlar', this.quickActions()))
    this.body.appendChild(this.section('📦 Kayıt', this.saveControls()))
  }

  private section(title: string, content: HTMLElement): HTMLElement {
    const sec = document.createElement('section')
    sec.className = 'owner-section'
    const h = document.createElement('h3')
    h.textContent = title
    sec.append(h, content)
    return sec
  }

  private economyControls(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'owner-controls-grid'
    const moneyInput = document.createElement('input')
    moneyInput.type = 'number'
    moneyInput.className = 'owner-input'
    moneyInput.placeholder = 'Para miktarı'
    moneyInput.min = '0'
    const grantBtn = document.createElement('button')
    grantBtn.type = 'button'
    grantBtn.className = 'btn-primary'
    grantBtn.textContent = 'Para ekle'
    grantBtn.addEventListener('click', () => {
      const n = Number(moneyInput.value)
      if (n > 0) {
        this.state.ownerGrantMoney(n)
        this.onChange()
        this.toast(`+${formatMoney(n)} eklendi`)
        this.renderDashboard()
      }
    })
    wrap.append(moneyInput, grantBtn)

    const stats = document.createElement('p')
    stats.className = 'owner-stats-line'
    stats.textContent = `Cüzdan: ${formatMoney(this.state.money)} · Toplam: ${formatMoney(this.state.totalEarned)} · Heat: ${Math.round(this.state.illegalHeat)}%`
    wrap.appendChild(stats)
    return wrap
  }

  private flagControls(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'owner-flags-list'
    for (const f of OWNER_FLAGS) {
      const row = document.createElement('label')
      row.className = 'owner-flag-row'
      const text = document.createElement('div')
      text.innerHTML = `<strong>${f.label}</strong><small>${f.description}</small>`
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = this.flags[f.id] === true
      input.addEventListener('change', () => {
        this.flags[f.id] = input.checked
        saveOwnerFlags(this.flags)
        this.state.applyOwnerFlags(this.flags)
        this.onChange()
      })
      row.append(text, input)
      wrap.appendChild(row)
    }
    return wrap
  }

  private quickActions(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'owner-quick-grid'
    const actions: { action: string; label: string }[] = [
      { action: 'owner-clear-heat', label: '🕶️ Heat sıfırla' },
      { action: 'owner-unlock-themes', label: '🎨 Tüm temalar' },
      { action: 'owner-unlock-businesses', label: '🏢 Tüm işletmeler x1' },
      { action: 'owner-max-season', label: '👑 Sezon max tier' },
      { action: 'owner-complete-weekly', label: '🗓️ Haftalık doldur' },
      { action: 'owner-reset-daily', label: '🎁 Günlük ödül sıfırla' },
      { action: 'owner-all-upgrades', label: '⬆️ Tüm yükseltmeler' },
      { action: 'owner-surprise-now', label: '💎 Yatırımcı şimdi' },
    ]
    for (const a of actions) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'owner-quick-btn'
      btn.dataset.action = a.action
      btn.textContent = a.label
      wrap.appendChild(btn)
    }
    return wrap
  }

  private saveControls(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'owner-controls-grid'
    const saveBtn = document.createElement('button')
    saveBtn.type = 'button'
    saveBtn.className = 'btn-primary'
    saveBtn.dataset.action = 'owner-force-save'
    saveBtn.textContent = 'Kaydet'
    const exportBtn = document.createElement('button')
    exportBtn.type = 'button'
    exportBtn.className = 'btn-secondary'
    exportBtn.dataset.action = 'owner-export-save'
    exportBtn.textContent = 'JSON dışa aktar'
    wrap.append(saveBtn, exportBtn)
    return wrap
  }

  handleAction(action: string): boolean {
    if (!isOwnerSession() && action !== 'owner-close') return false
    if (action === 'owner-close') {
      this.hide()
      return true
    }
    refreshOwnerSession()

    switch (action) {
      case 'owner-logout':
        clearOwnerSession()
        this.hide()
        return true
      case 'owner-clear-heat':
        this.state.ownerClearHeat()
        this.onChange()
        this.toast('Heat sıfırlandı')
        this.renderDashboard()
        return true
      case 'owner-unlock-themes':
        for (const t of THEMES) {
          if (t.id !== 'default') this.state.unlockTheme(t.id as ThemeId)
        }
        this.onChange()
        this.toast('Temalar açıldı')
        return true
      case 'owner-unlock-businesses':
        this.state.ownerUnlockAllBusinesses()
        this.onChange()
        this.toast('İşletmeler açıldı')
        return true
      case 'owner-max-season':
        this.state.ownerMaxSeason()
        this.onChange()
        this.toast('Sezon max tier')
        this.renderDashboard()
        return true
      case 'owner-complete-weekly':
        this.state.ownerCompleteWeekly()
        this.onChange()
        this.toast('Haftalık hedef doldu')
        return true
      case 'owner-reset-daily':
        this.state.ownerResetDailyClaim()
        this.onChange()
        this.toast('Günlük ödül tekrar alınabilir')
        return true
      case 'owner-all-upgrades':
        this.state.ownerUnlockAllUpgrades()
        this.onChange()
        this.toast('Yükseltmeler açıldı')
        return true
      case 'owner-surprise-now':
        this.state.ownerTriggerSurpriseInvestor()
        this.onChange()
        this.toast('Sürpriz yatırımcı aktif')
        return true
      case 'owner-force-save':
        this.saveManager.save(this.state)
        this.toast('Kayıt yapıldı')
        return true
      case 'owner-export-save':
        void navigator.clipboard.writeText(JSON.stringify(this.state.toJSON(), null, 2)).then(() => {
          this.toast('Kayıt panoya kopyalandı')
        })
        return true
      default:
        return false
    }
  }

  private toast(msg: string): void {
    const el = document.createElement('div')
    el.className = 'owner-toast'
    el.textContent = msg
    this.layer.appendChild(el)
    window.setTimeout(() => el.remove(), 2200)
  }
}
