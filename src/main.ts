import './ui/tokens.css'
import './ui/styles.css'
import './ui/responsive.css'
import { GameState } from './game/GameState'
import { SaveManager } from './security/SaveManager'
import { AdManager } from './ads/AdManager'
import { SoundManager } from './audio/SoundManager'
import { HUD } from './ui/HUD'
import { scheduleDailyReminder, registerServiceWorker } from './notifications/NotificationManager'
import { applyDocumentTheme } from './utils/themeApply'
import { applyCountry } from './game/Countries'
import { OnboardingOverlay } from './ui/components/OnboardingOverlay'
import { i18n } from './i18n'
import { installGlobalCrashHandlers, reportCrash } from './utils/crashReport'
import { installRefTestLauncher } from './ui/ref/RefTestLauncher'

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

    const hud = new HUD(state, ads, sound, saveManager, app)

    // İzole görsel test modu: yeni arayüz (RefApp) — mock data, GameState'e bağlı değil.
    installRefTestLauncher()

    const setupDone = localStorage.getItem('baron_setup_done') === '1'
    if (!saveLoaded && !setupDone) {
      const onboarding = new OnboardingOverlay((country) => {
        state.country = country
        applyCountry(country)
        localStorage.setItem('baron_setup_done', '1')
        saveManager.save(state)
        hud.renderAll()
        hud.startTutorial(300)
      })
      onboarding.show()
    } else {
      hud.startTutorial()
    }

    if (saveLoaded) {
      if (loaded.source === 'backup') {
        window.setTimeout(() => hud.toast('Yedek kayıttan geri yüklendi ✓'), 400)
      }
      const pendingOffline = state.applyOfflineEarnings(lastSaveTime)
      if (pendingOffline > 0) {
        hud.showOfflinePopup(pendingOffline)
      }
      if (state.hasPendingComeback()) {
        window.setTimeout(() => hud.showComebackPopup(), 1200)
      }
      window.setTimeout(() => hud.showDailyRewardIfAvailable(), 900)
      saveManager.startAutoSave(state)
    } else {
      window.setTimeout(() => {
        if (saveManager.hasBackup()) {
          hud.toast('Kayıt açılamadı — Profil → Ayarlar → “Yedekten geri yükle” dene')
        } else {
          hud.toast('Yeni oyun başladı')
        }
      }, 600)
      saveManager.startAutoSave(state)
    }

    if (state.isIntroFlowReady()) {
      state.startTick()
      state.startEventLoop()
    }
    hud.renderAll()

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
