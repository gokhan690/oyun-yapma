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
import { i18n } from './i18n'
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

/**
 * Üretim arayüzü: integration RefApp shell'i. Canlı GameState'e bağlanır
 * (zaman çubuğu, KPI, Bugünün Hamleleri, 6 sekmeli alt menü). onExit YOK →
 * standalone üretim modu (kapat butonu gösterilmez, eski HUD'a dönüş yok).
 */
function mountProductionShell(
  app: HTMLElement,
  state: GameState,
  ads: AdManager,
  saveManager: SaveManager,
): RefApp {
  if (state.isIntroFlowReady() && !state.isTicking()) {
    state.startTick()
    state.startEventLoop()
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
    onPersist: () => saveManager.save(state),
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

  try {
    const state = new GameState()
    const saveManager = new SaveManager()
    const ads = new AdManager()
    const sound = new SoundManager()

    let loaded
    try {
      loaded = saveManager.load(state)
    } catch (loadErr) {
      console.error('Kayıt yükleme çökmesi:', loadErr)
      loaded = { ok: false, lastSaveTime: Date.now(), reason: 'load_crash' }
    }
    const saveLoaded = loaded.ok
    const lastSaveTime = loaded.lastSaveTime

    if (!saveLoaded) {
      console.warn('Kayıt yüklenemedi:', loaded.reason)
    }

    ads.syncRewardedCount(state.rewardedAdsToday, state.rewardedAdsDay)
    applyDocumentTheme(state.activeTheme)
    applyCountry(state.country)

    const setupDone = localStorage.getItem('baron_setup_done') === '1'
    if (!saveLoaded && !setupDone) {
      const onboarding = new OnboardingOverlay((country, profile) => {
        state.country = country
        applyCountry(country)
        state.setCharacterProfile(profile)
        applyProfileToState(profile, state)
        localStorage.setItem('baron_setup_done', '1')
        saveManager.save(state)
        if (!state.isTicking()) {
          state.startTick()
          state.startEventLoop()
        }
        mountProductionShell(app, state, ads, saveManager)
        saveManager.startAutoSave(state)
      })
      onboarding.show()
    } else {
      if (saveLoaded) {
        state.applyOfflineEarnings(lastSaveTime)
      }
      if (state.isIntroFlowReady()) {
        state.startTick()
        state.startEventLoop()
      }
      mountProductionShell(app, state, ads, saveManager)
      saveManager.startAutoSave(state)
    }

    document.addEventListener('click', () => sound.resume(), { once: true })
    void scheduleDailyReminder(state.notificationPrefs)
    void registerServiceWorker()
    window.__II_MARK_BOOTED__?.()
  } catch (err) {
    console.error('Bootstrap hatası:', err)
    reportCrash(err, 'bootstrap')
    showBootFailure(
      'Oyun başlatılamadı. Sayfayı yenile; sorun sürerse kaydı sıfırlayıp tekrar dene.',
      true,
    )
  }
}

void bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
  reportCrash(err, 'bootstrap.catch')
  showBootFailure(
    'Oyun başlatılamadı. Sayfayı yenile; sorun sürerse kaydı sıfırlayıp tekrar dene.',
    true,
  )
})
