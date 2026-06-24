import { backRow, refToast } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { SaveManager } from '../../security/SaveManager'
import { i18n, PRODUCTION_LANGS, type LangCode } from '../../i18n'
import { LANG_META } from '../../i18n'
import { applyDocumentTheme } from '../../utils/themeApply'
import { THEMES } from '../../game/Themes'
import { scheduleDailyReminder } from '../../notifications/NotificationManager'

interface RefSettingsPageOpts {
  state: GameState
  saveManager: SaveManager
  onBack: () => void
  onPersist: () => void
  onResetConfirmed: () => void
}

export class RefSettingsPage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_settings_title') }
  readonly titleDeco = '⚙️'

  private opts: RefSettingsPageOpts

  constructor(opts: RefSettingsPageOpts) {
    this.opts = opts
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-settings-page'
    this.build()
  }

  private build(): void {
    const { state, saveManager, onBack } = this.opts

    this.el.appendChild(backRow(() => onBack()))

    const title = document.createElement('div')
    title.className = 'ref-settings-header'
    title.innerHTML = `<h2 class="ref-settings-title">${i18n.t('ref_settings_title')}</h2><p class="ref-settings-subtitle">${i18n.t('ref_settings_subtitle')}</p>`
    this.el.appendChild(title)

    // ── Section 1: Language ──
    this.el.appendChild(this.buildSection(i18n.t('ref_settings_lang_title'), this.buildLangSection()))

    // ── Section 2: Appearance ──
    this.el.appendChild(this.buildSection(i18n.t('ref_settings_appearance_title'), this.buildAppearanceSection(state)))

    // ── Section 3: Notifications ──
    this.el.appendChild(this.buildSection(i18n.t('ref_settings_notif_title'), this.buildNotifSection(state)))

    // ── Section 4: Game Data ──
    this.el.appendChild(this.buildSection(i18n.t('ref_settings_data_title'), this.buildDataSection(state, saveManager)))

    // ── Reset (danger zone) ──
    this.el.appendChild(this.buildResetSection())

    // ── Version ──
    const ver = document.createElement('p')
    ver.className = 'ref-settings-version'
    const pkg = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : ''
    ver.textContent = pkg ? `${i18n.t('ref_settings_version')}: ${pkg}` : ''
    this.el.appendChild(ver)
  }

  private buildSection(heading: string, content: HTMLElement): HTMLElement {
    const section = document.createElement('div')
    section.className = 'ref-settings-section'
    const h = document.createElement('div')
    h.className = 'ref-settings-section-title'
    h.textContent = heading
    section.appendChild(h)
    section.appendChild(content)
    return section
  }

  private buildLangSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-settings-lang-btns'
    const current = i18n.getLang()
    for (const code of PRODUCTION_LANGS) {
      const meta = LANG_META[code as LangCode]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-settings-lang-btn' + (code === current ? ' active' : '')
      btn.textContent = meta.nativeLabel
      btn.addEventListener('click', async () => {
        if (code === i18n.getLang()) return
        this.opts.onPersist()
        await i18n.setLang(code as LangCode)
        location.reload()
      })
      wrap.appendChild(btn)
    }
    return wrap
  }

  private buildAppearanceSection(state: GameState): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-settings-appearance'

    // Theme selector
    const themeWrap = document.createElement('div')
    themeWrap.className = 'ref-settings-theme-wrap'
    const themeLabel = document.createElement('div')
    themeLabel.className = 'ref-settings-item-label'
    themeLabel.textContent = i18n.t('ref_settings_theme_title')
    themeWrap.appendChild(themeLabel)
    const themeRow = document.createElement('div')
    themeRow.className = 'ref-settings-theme-row'
    for (const theme of THEMES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-settings-theme-btn' + (theme.id === state.activeTheme ? ' active' : '')
      btn.title = theme.id
      btn.style.background = (theme.colors?.[2]) ?? '#888'
      btn.addEventListener('click', () => {
        state.setActiveTheme(theme.id)
        applyDocumentTheme(theme.id)
        this.opts.onPersist()
        themeRow.querySelectorAll('.ref-settings-theme-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      })
      themeRow.appendChild(btn)
    }
    themeWrap.appendChild(themeRow)
    wrap.appendChild(themeWrap)

    // Reduced motion toggle
    wrap.appendChild(this.buildToggle(
      i18n.t('ref_settings_reduced_motion'),
      state.reducedMotion,
      (val) => {
        state.reducedMotion = val
        document.documentElement.classList.toggle('reduced-motion', val)
        this.opts.onPersist()
      },
    ))

    // Haptics toggle
    wrap.appendChild(this.buildToggle(
      i18n.t('ref_settings_haptic'),
      state.hapticsEnabled,
      (val) => {
        state.hapticsEnabled = val
        this.opts.onPersist()
      },
    ))

    return wrap
  }

  private buildNotifSection(state: GameState): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-settings-notifs'

    const prefs = state.notificationPrefs
    wrap.appendChild(this.buildToggle(
      i18n.t('ref_settings_notif_daily'),
      prefs.dailyReward,
      (val) => {
        state.notificationPrefs.dailyReward = val
        void scheduleDailyReminder(state.notificationPrefs)
        this.opts.onPersist()
      },
    ))
    wrap.appendChild(this.buildToggle(
      i18n.t('ref_settings_notif_income'),
      prefs.passiveIncome,
      (val) => {
        state.notificationPrefs.passiveIncome = val
        this.opts.onPersist()
      },
    ))
    wrap.appendChild(this.buildToggle(
      i18n.t('ref_settings_notif_goal'),
      prefs.goalNear,
      (val) => {
        state.notificationPrefs.goalNear = val
        this.opts.onPersist()
      },
    ))

    return wrap
  }

  private buildDataSection(state: GameState, saveManager: SaveManager): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-settings-data'

    // Export
    const exportWrap = document.createElement('div')
    exportWrap.className = 'ref-settings-data-item'
    const exportLabel = document.createElement('div')
    exportLabel.className = 'ref-settings-item-label'
    exportLabel.textContent = i18n.t('ref_settings_export')
    exportWrap.appendChild(exportLabel)
    const exportBtn = document.createElement('button')
    exportBtn.type = 'button'
    exportBtn.className = 'ref-settings-action-btn'
    exportBtn.textContent = i18n.t('ref_settings_export_copy_btn')
    exportBtn.addEventListener('click', () => {
      try {
        const code = saveManager.exportLegacyCode(state)
        navigator.clipboard.writeText(code).then(() => {
          refToast(i18n.t('ref_settings_export_copied'), 'ok')
        }).catch(() => {
          // Fallback: textarea select
          const ta = document.createElement('textarea')
          ta.value = code
          ta.style.position = 'fixed'
          ta.style.top = '-9999px'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
          refToast(i18n.t('ref_settings_export_copied'), 'ok')
        })
      } catch {
        refToast(i18n.t('ref_settings_restore_fail'), 'err')
      }
    })
    exportWrap.appendChild(exportBtn)
    wrap.appendChild(exportWrap)

    // Import
    const importWrap = document.createElement('div')
    importWrap.className = 'ref-settings-data-item'
    const importLabel = document.createElement('div')
    importLabel.className = 'ref-settings-item-label'
    importLabel.textContent = i18n.t('ref_settings_import')
    importWrap.appendChild(importLabel)
    const importTa = document.createElement('textarea')
    importTa.className = 'ref-settings-import-ta'
    importTa.placeholder = i18n.t('ref_settings_import_placeholder')
    importTa.rows = 3
    importWrap.appendChild(importTa)
    const importMsg = document.createElement('div')
    importMsg.className = 'ref-settings-import-msg'
    importMsg.style.display = 'none'
    importWrap.appendChild(importMsg)
    const importBtn = document.createElement('button')
    importBtn.type = 'button'
    importBtn.className = 'ref-settings-action-btn'
    importBtn.textContent = i18n.t('ref_settings_import_btn')
    importBtn.addEventListener('click', () => {
      const code = importTa.value.trim()
      if (!code) return
      const result = saveManager.importLegacyCode(state, code)
      if (result.ok) {
        importMsg.textContent = i18n.t('ref_settings_import_ok')
        importMsg.className = 'ref-settings-import-msg ok'
        importMsg.style.display = 'block'
        setTimeout(() => location.reload(), 800)
      } else {
        importMsg.textContent = result.reason ?? i18n.t('ref_settings_restore_fail')
        importMsg.className = 'ref-settings-import-msg err'
        importMsg.style.display = 'block'
      }
    })
    importWrap.appendChild(importBtn)
    wrap.appendChild(importWrap)

    // Restore backup
    const restoreWrap = document.createElement('div')
    restoreWrap.className = 'ref-settings-data-item'
    const hasBackup = saveManager.hasBackup()
    const restoreBtn = document.createElement('button')
    restoreBtn.type = 'button'
    restoreBtn.className = 'ref-settings-action-btn'
    restoreBtn.disabled = !hasBackup
    restoreBtn.textContent = hasBackup
      ? i18n.t('ref_settings_restore_backup')
      : i18n.t('ref_settings_no_backup')
    if (hasBackup) {
      const restoreMsg = document.createElement('div')
      restoreMsg.className = 'ref-settings-import-msg'
      restoreMsg.style.display = 'none'
      restoreBtn.addEventListener('click', () => {
        saveManager.setSaveEnabled(true)
        const ok = saveManager.tryRestoreBackup(state)
        if (ok) {
          location.reload()
        } else {
          saveManager.setSaveEnabled(false)
          restoreMsg.textContent = i18n.t('ref_settings_restore_fail')
          restoreMsg.className = 'ref-settings-import-msg err'
          restoreMsg.style.display = 'block'
        }
      })
      restoreWrap.appendChild(restoreBtn)
      restoreWrap.appendChild(restoreMsg)
    } else {
      restoreWrap.appendChild(restoreBtn)
    }
    wrap.appendChild(restoreWrap)

    return wrap
  }

  private buildResetSection(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-settings-reset-zone'

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'ref-settings-reset-btn'
    resetBtn.textContent = i18n.t('ref_settings_reset_btn')

    // Modal overlay (hidden initially)
    const modal = document.createElement('div')
    modal.className = 'ref-reset-modal-overlay'
    modal.style.display = 'none'
    modal.innerHTML = `
      <div class="ref-reset-modal-card">
        <h3 class="ref-reset-modal-title">${i18n.t('ref_settings_reset_title')}</h3>
        <p class="ref-reset-modal-body">${i18n.t('ref_settings_reset_body')}</p>
        <div class="ref-reset-modal-actions">
          <button type="button" class="ref-reset-modal-confirm">${i18n.t('ref_settings_reset_confirm')}</button>
          <button type="button" class="ref-reset-modal-cancel">${i18n.t('ref_settings_reset_cancel')}</button>
        </div>
      </div>
    `

    resetBtn.addEventListener('click', () => {
      modal.style.display = 'flex'
    })
    modal.querySelector('.ref-reset-modal-cancel')!.addEventListener('click', () => {
      modal.style.display = 'none'
    })
    modal.querySelector('.ref-reset-modal-confirm')!.addEventListener('click', () => {
      modal.style.display = 'none'
      this.opts.onResetConfirmed()
    })

    wrap.appendChild(resetBtn)
    wrap.appendChild(modal)
    return wrap
  }

  private buildToggle(label: string, initial: boolean, onChange: (val: boolean) => void): HTMLElement {
    const row = document.createElement('div')
    row.className = 'ref-settings-toggle-row'
    const lbl = document.createElement('span')
    lbl.className = 'ref-settings-toggle-label'
    lbl.textContent = label
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ref-settings-toggle' + (initial ? ' on' : '')
    btn.setAttribute('role', 'switch')
    btn.setAttribute('aria-checked', String(initial))
    let state = initial
    btn.addEventListener('click', () => {
      state = !state
      btn.classList.toggle('on', state)
      btn.setAttribute('aria-checked', String(state))
      onChange(state)
    })
    row.appendChild(lbl)
    row.appendChild(btn)
    return row
  }

  destroy(): void {
    // No subscriptions to clean up
  }
}

// Declare __APP_VERSION__ to avoid TS error; injected by Vite
declare const __APP_VERSION__: string | undefined
