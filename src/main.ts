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

  let ok = false
  let lastSaveTime = Date.now()
  let saveCorrupted = false
  try {
    const loaded = saveManager.load(state)
    ok = loaded.ok
    lastSaveTime = loaded.lastSaveTime
  } catch (err) {
    console.warn('Kayıt yüklenemedi, yeni oyun başlatılıyor.', err)
    saveCorrupted = true
    saveManager.clear()
  }
  ads.syncRewardedCount(state.rewardedAdsToday, state.rewardedAdsDay)

  applyDocumentTheme(state.activeTheme)

  const hud = new HUD(state, ads, sound, saveManager, app)

  if (saveCorrupted) {
    window.setTimeout(() => {
      hud.showCorruptedSaveNotice()
    }, 500)
  }

  if (ok) {
    const pendingOffline = state.applyOfflineEarnings(lastSaveTime)
    if (pendingOffline > 0) {
      hud.showOfflinePopup(pendingOffline)
    }
    if (state.hasPendingComeback()) {
      window.setTimeout(() => hud.showComebackPopup(), 1200)
    }
  }

  window.setTimeout(() => hud.showDailyRewardIfAvailable(), 900)

  state.startTick()
  state.startEventLoop()
  saveManager.startAutoSave(state)
  hud.renderAll()

  document.addEventListener('click', () => sound.resume(), { once: true })
  void scheduleDailyReminder(state.notificationPrefs)
  } catch (err) {
    console.error('Bootstrap hatası:', err)
    const bootErr = document.querySelector<HTMLDivElement>('#boot-error')
    if (bootErr) {
      bootErr.style.display = 'block'
      bootErr.textContent = 'Oyun başlatılamadı. Ctrl+F5 ile yenile veya gizli sekmede dene.'
    }
  }
}

bootstrap()
