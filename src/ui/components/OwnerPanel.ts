import type { GameState } from '../../game/GameState'
import type { SaveManager } from '../../security/SaveManager'
import { formatMoney } from '../../game/Economy'
import { THEMES, type ThemeId } from '../../game/Themes'
import { OWNER_FLAGS, loadOwnerFlags, saveOwnerFlags, type OwnerFlags } from '../../owner/FeatureFlags'
import {
  clearOwnerSession,
  isOwnerLocked,
  isOwnerPinConfigured,
  isOwnerSession,
  ownerLockRemainingMs,
  refreshOwnerSession,
  tryOwnerLogin,
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
    document.body.appendChild(this.layer)
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
    const form = document.createElement('form')
    form.className = 'owner-login-card'
    form.setAttribute('novalidate', '')

    const badge = document.createElement('span')
    badge.className = 'owner-badge'
    badge.textContent = '👑'
    const heading = document.createElement('h2')
    heading.textContent = 'Baron Girişi'
    const desc = document.createElement('p')
    desc.textContent = 'Sadece oyun sahibi. Bu ekran normal oyunculara görünmez.'

    const input = document.createElement('input')
    input.type = 'text'
    input.name = 'owner-pin'
    input.className = 'owner-pin-input'
    input.placeholder = 'PIN'
    input.autocomplete = 'off'
    input.autocapitalize = 'off'
    input.spellcheck = false
    input.maxLength = 32
    input.setAttribute('autocorrect', 'off')
    input.setAttribute('enterkeyhint', 'go')
    input.setAttribute('inputmode', 'text')

    const err = document.createElement('p')
    err.className = 'owner-login-err'
    err.hidden = true

    const row = document.createElement('div')
    row.className = 'owner-login-actions'
    const loginBtn = document.createElement('button')
    loginBtn.type = 'submit'
    loginBtn.className = 'btn-primary'
    loginBtn.textContent = 'Giriş'
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.dataset.action = 'owner-close'
    cancelBtn.textContent = 'İptal'
    row.append(loginBtn, cancelBtn)

    form.append(badge, heading, desc, input, err, row)
    this.body.appendChild(form)

    if (!isOwnerPinConfigured()) {
      err.hidden = false
      err.className = 'owner-login-err owner-login-warn'
      err.textContent = 'Baron konsolu yapılandırılmamış (VITE_OWNER_PIN).'
    }

    if (isOwnerLocked()) {
      input.disabled = true
      loginBtn.disabled = true
      const mins = Math.ceil(ownerLockRemainingMs() / 60_000)
      err.hidden = false
      err.className = 'owner-login-err'
      err.textContent = `Çok fazla deneme. ${mins} dk sonra tekrar dene.`
    }

    const stopBubble = (e: Event): void => { e.stopPropagation() }
    form.addEventListener('click', stopBubble)
    form.addEventListener('pointerdown', stopBubble)
    form.addEventListener('mousedown', stopBubble)
    form.addEventListener('touchstart', stopBubble, { passive: true })

    const tryLogin = (): void => {
      if (isOwnerLocked()) return
      if (!isOwnerPinConfigured()) {
        err.hidden = false
        err.className = 'owner-login-err'
        err.textContent = 'PIN sunucuda tanımlı değil.'
        return
      }
      if (tryOwnerLogin(input.value.trim())) {
        this.renderDashboard()
      } else {
        err.hidden = false
        err.className = 'owner-login-err'
        err.textContent = isOwnerLocked()
          ? `Kilitlendi. ${Math.ceil(ownerLockRemainingMs() / 60_000)} dk bekle.`
          : 'Yanlış PIN'
        if (!isOwnerLocked()) input.select()
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      e.stopPropagation()
      tryLogin()
    })
    cancelBtn.addEventListener('click', stopBubble)

    requestAnimationFrame(() => {
      input.focus({ preventScroll: true })
    })
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
