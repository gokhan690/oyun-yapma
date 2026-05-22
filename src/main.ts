import './ui/tokens.css'
import './ui/styles.css'
import './ui/responsive.css'
import { GameState } from './game/GameState'
import { SaveManager } from './security/SaveManager'
import { AdManager } from './ads/AdManager'
import { SoundManager } from './audio/SoundManager'
import { HUD } from './ui/HUD'
import { scheduleDailyReminder } from './notifications/NotificationManager'
import { applyDocumentTheme } from './utils/themeApply'

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  try {
    const state = new GameState()
    const saveManager = new SaveManager()
    const ads = new AdManager()
    const sound = new SoundManager()

    let saveLoaded = false
    let lastSaveTime = Date.now()
    let loadReason: string | undefined

    const loaded = saveManager.load(state)
    saveLoaded = loaded.ok
    lastSaveTime = loaded.lastSaveTime
    loadReason = loaded.reason

    if (!saveLoaded) {
      console.warn('Kayıt yüklenemedi:', loadReason)
      saveManager.setSaveEnabled(false)
    }

    ads.syncRewardedCount(state.rewardedAdsToday, state.rewardedAdsDay)
    applyDocumentTheme(state.activeTheme)

    const hud = new HUD(state, ads, sound, saveManager, app)

    if (!saveLoaded) {
      if (saveManager.hasBackup() || saveManager.hasAnySaveSlot()) {
        hud.showSaveRecoveryNotice(() => {
          if (saveManager.tryRestoreBackup(state)) {
            saveManager.setSaveEnabled(true)
            saveManager.save(state)
            window.location.reload()
            return
          }
          const retry = saveManager.load(state)
          if (retry.ok) {
            saveManager.setSaveEnabled(true)
            saveManager.save(state)
            window.location.reload()
          }
        })
      } else {
        hud.showNewGameNotice()
      }
    } else if (loaded.source === 'backup') {
      window.setTimeout(() => hud.toast('Yedek kayıttan geri yüklendi ✓'), 400)
    }

    if (saveLoaded) {
      const pendingOffline = state.applyOfflineEarnings(lastSaveTime)
      if (pendingOffline > 0) {
        hud.showOfflinePopup(pendingOffline)
      }
      if (state.hasPendingComeback()) {
        window.setTimeout(() => hud.showComebackPopup(), 1200)
      }
      saveManager.startAutoSave(state)
    }

    window.setTimeout(() => hud.showDailyRewardIfAvailable(), 900)

    state.startTick()
    state.startEventLoop()
    hud.renderAll()

    document.addEventListener('click', () => sound.resume(), { once: true })
    void scheduleDailyReminder(state.notificationPrefs)
  } catch (err) {
    console.error('Bootstrap hatası:', err)
    const bootErr = document.querySelector<HTMLDivElement>('#boot-error')
    if (bootErr) {
      bootErr.style.display = 'block'
      bootErr.textContent = 'Oyun başlatılamadı. Ctrl+F5 ile yenile. Kaydın silinmedi — tekrar dene veya Ayarlar → Miras kodu dene.'
    }
  }
}

bootstrap()
