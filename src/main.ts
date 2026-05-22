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

    const loaded = saveManager.load(state)
    const saveLoaded = loaded.ok
    const lastSaveTime = loaded.lastSaveTime

    if (!saveLoaded) {
      console.warn('Kayıt yüklenemedi:', loaded.reason)
    }

    ads.syncRewardedCount(state.rewardedAdsToday, state.rewardedAdsDay)
    applyDocumentTheme(state.activeTheme)

    const hud = new HUD(state, ads, sound, saveManager, app)

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
