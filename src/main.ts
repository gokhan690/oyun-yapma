import './ui/tokens.css'
import './ui/styles.css'
import './ui/responsive.css'
import { GameState } from './game/GameState'
import { SaveManager } from './security/SaveManager'
import { AdManager } from './ads/AdManager'
import { SoundManager } from './audio/SoundManager'
import { scheduleDailyReminder, registerServiceWorker } from './notifications/NotificationManager'
import { applyDocumentTheme } from './utils/themeApply'
import { applyCountry } from './game/Countries'
import { OnboardingOverlay } from './ui/components/OnboardingOverlay'
import { applyProfileToState } from './game/CharacterProfile'
import { i18n, normalizeToProductionLang } from './i18n'
import { installGlobalCrashHandlers, reportCrash } from './utils/crashReport'
import { RefApp } from './ui/ref/RefApp'
import { buildRefViewModel } from './ui/ref/refAppDataAdapter'

installGlobalCrashHandlers()

declare global {
  interface Window {
    __II_MARK_BOOTED__?: () => void
    __II_SHOW_BOOT_ERROR__?: (message: string, opts?: { resetSave?: boolean }) => void
  }
}

function showBootFailure(message: string, resetSave = true): void {
  if (typeof window.__II_SHOW_BOOT_ERROR__ === 'function') {
    window.__II_SHOW_BOOT_ERROR__(message, { resetSave })
    return
  }
  const bootErr = document.querySelector<HTMLDivElement>('#boot-error')
  if (bootErr) {
    bootErr.style.display = 'block'
    bootErr.textContent = message
  }
}

function hasMeaningfulProgress(state: GameState): boolean {
  return (
    state.playTimeMs > 0 ||
    state.totalEarned > 0 ||
    state.anyProducerOwned() ||
    state.characterProfile !== null
  )
}

function showRecoveryScreen(
  app: HTMLElement,
  state: GameState,
  saveManager: SaveManager,
): void {
  app.replaceChildren()
  app.style.display = 'flex'
  app.style.flexDirection = 'column'
  app.style.alignItems = 'center'
  app.style.justifyContent = 'center'
  app.style.minHeight = '100vh'
  app.style.padding = '24px'
  app.style.gap = '16px'
  app.style.background = '#0a1628'
  app.style.color = '#e2e8f0'
  app.style.textAlign = 'center'
  app.style.fontFamily = 'Outfit, system-ui, sans-serif'

  const title = document.createElement('h2')
  title.textContent = i18n.t('ref_recovery_title')
  title.style.cssText = 'margin:0;font-size:1.4rem;color:#fbbf24'
  app.appendChild(title)

  const body = document.createElement('p')
  body.textContent = i18n.t('ref_recovery_body')
  body.style.cssText = 'margin:0;max-width:360px;opacity:.85'
  app.appendChild(body)

  const btnRow = document.createElement('div')
  btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center'

  const retryBtn = document.createElement('button')
  retryBtn.textContent = i18n.t('ref_recovery_retry')
  retryBtn.style.cssText =
    'padding:10px 18px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-weight:700;cursor:pointer'
  retryBtn.addEventListener('click', () => location.reload())

  const restoreBtn = document.createElement('button')
  restoreBtn.textContent = i18n.t('ref_recovery_restore')
  restoreBtn.style.cssText =
    'padding:10px 18px;border:none;border-radius:10px;background:#10b981;color:#fff;font-weight:700;cursor:pointer'
  restoreBtn.addEventListener('click', () => {
    saveManager.setSaveEnabled(true)
    const ok = saveManager.tryRestoreBackup(state)
    if (ok) {
      location.reload()
    } else {
      saveManager.setSaveEnabled(false)
      errMsg.textContent = i18n.t('ref_recovery_restore_fail')
      errMsg.style.display = 'block'
    }
  })

  const resetBtn = document.createElement('button')
  resetBtn.textContent = i18n.t('ref_recovery_reset')
  resetBtn.style.cssText =
    'padding:10px 18px;border:1px solid #64748b;border-radius:10px;background:transparent;color:#e2e8f0;font-weight:600;cursor:pointer'

  let resetStep = 0
  resetBtn.addEventListener('click', () => {
    if (resetStep === 0) {
      resetStep = 1
      confirmMsg.style.display = 'block'
      resetBtn.textContent = i18n.t('ref_settings_reset_confirm')
      resetBtn.style.background = '#dc2626'
      resetBtn.style.border = 'none'
      resetBtn.style.color = '#fff'
    } else {
      saveManager.clear()
      localStorage.removeItem('baron_setup_done')
      location.reload()
    }
  })

  btnRow.appendChild(retryBtn)
  btnRow.appendChild(restoreBtn)
  btnRow.appendChild(resetBtn)
  app.appendChild(btnRow)

  const confirmMsg = document.createElement('p')
  confirmMsg.textContent = i18n.t('ref_recovery_reset_confirm')
  confirmMsg.style.cssText = 'display:none;margin:0;color:#fca5a5;font-size:.9rem'
  app.appendChild(confirmMsg)

  const errMsg = document.createElement('p')
  errMsg.style.cssText = 'display:none;margin:0;color:#fca5a5;font-size:.9rem'
  app.appendChild(errMsg)
}

function mountProductionShell(
  app: HTMLElement,
  state: GameState,
  ads: AdManager,
  saveManager: SaveManager,
): RefApp {
  if (state.isIntroFlowReady() && !state.isTicking()) {
    state.startTick()
  }
  let data
  try {
    data = buildRefViewModel(state)
  } catch (e) {
    console.warn('RefApp data adapter hatası, mock fallback:', e)
  }
  const refApp = new RefApp({
    initial: 'home',
    data,
    state,
    ads,
    saveManager,
    onPersist: () => saveManager.save(state),
    onResetConfirmed: () => {
      saveManager.setSaveEnabled(false)
      saveManager.stopAutoSave()
      state.stopTick()
      refApp.destroy()
      saveManager.clear()
      location.reload()
    },
  })
  document.body.style.background = 'var(--r-sky-top, #3a8fd4)'
  app.replaceChildren()
  refApp.mount(app)
  return refApp
}

async function bootstrap(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  await i18n.init()
  await normalizeToProductionLang()

  try {
    const state = new GameState()
    const saveManager = new SaveManager()
    const ads = new AdManager()
    const sound = new SoundManager()

    const finalizeBoot = (s: GameState): void => {
      document.addEventListener('click', () => sound.resume(), { once: true })
      void scheduleDailyReminder(s.notificationPrefs)
      void registerServiceWorker()
      window.__II_MARK_BOOTED__?.()
    }

    let loaded
    try {
      loaded = saveManager.load(state)
    } catch (loadErr) {
      console.error('Kayıt yükleme çökmesi:', loadErr)
      loaded = { ok: false, lastSaveTime: Date.now(), reason: 'load_crash' }
    }
    const saveLoaded = loaded.ok
    const lastSaveTime = loaded.lastSaveTime

    ads.syncRewardedCount(state.rewardedAdsToday, state.rewardedAdsDay)
    applyDocumentTheme(state.activeTheme)
    applyCountry(state.country)

    if (saveLoaded) {
      // CASE 1: save loaded successfully
      const meaningful = hasMeaningfulProgress(state)

      if (!meaningful && !state.isIntroFlowReady()) {
        // Valid but empty save — treat as fresh start
        saveManager.setSaveEnabled(false)
        saveManager.stopAutoSave()
        localStorage.removeItem('baron_setup_done')
        const freshState = new GameState()
        applyDocumentTheme(freshState.activeTheme)
        const onboarding = new OnboardingOverlay((country, profile) => {
          freshState.country = country
          applyCountry(country)
          freshState.setCharacterProfile(profile)
          applyProfileToState(profile, freshState)
          localStorage.setItem('baron_setup_done', '1')
          saveManager.setSaveEnabled(true)
          saveManager.save(freshState)
          if (!freshState.isTicking()) freshState.startTick()
          mountProductionShell(app, freshState, ads, saveManager)
          saveManager.startAutoSave(freshState)
        })
        onboarding.show()
        finalizeBoot(freshState)
        return
      }

      // Meaningful progress or intro already done: migrate intro flag if needed
      if (meaningful && !state.isIntroFlowReady()) {
        state.onboardingComplete = true
        // Note: tutorialDone handled internally by onboardingComplete
      }

      if (loaded.source === 'backup') {
        console.info('Yedekten otomatik kurtarıldı')
        // Toast will be shown after mount
      }

      state.applyOfflineEarnings(lastSaveTime)

      if (state.isIntroFlowReady()) {
        state.startTick()
      }

      const refApp = mountProductionShell(app, state, ads, saveManager)
      saveManager.startAutoSave(state)

      if (loaded.source === 'backup') {
        // Show backup recovery toast after a brief delay for mount to settle
        setTimeout(() => {
          refApp.showToast?.(i18n.t('ref_settings_restore_ok'), 'ok')
        }, 800)
      }
    } else if (!saveManager.hasAnySaveSlot()) {
      // CASE 2: no save slots at all — fresh start
      localStorage.removeItem('baron_setup_done')
      const onboarding = new OnboardingOverlay((country, profile) => {
        state.country = country
        applyCountry(country)
        state.setCharacterProfile(profile)
        applyProfileToState(profile, state)
        localStorage.setItem('baron_setup_done', '1')
        saveManager.save(state)
        if (!state.isTicking()) state.startTick()
        mountProductionShell(app, state, ads, saveManager)
        saveManager.startAutoSave(state)
      })
      onboarding.show()
    } else {
      // CASE 3: save slots exist but all failed to load
      saveManager.setSaveEnabled(false)
      showRecoveryScreen(app, state, saveManager)
    }

    finalizeBoot(state)
  } catch (err) {
    console.error('Bootstrap hatası:', err)
    reportCrash(err, 'bootstrap')
    showBootFailure(
      i18n.isReady() ? i18n.t('ref_boot_error') : 'Game failed to start. Please reload the page.',
      true,
    )
  }
}

void bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
  reportCrash(err, 'bootstrap.catch')
  showBootFailure(
    i18n.isReady() ? i18n.t('ref_boot_error') : 'Game failed to start. Please reload the page.',
    true,
  )
})
