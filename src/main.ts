import './ui/styles.css'
import { GameState } from './game/GameState'
import { SaveManager } from './security/SaveManager'
import { AdManager } from './ads/AdManager'
import { SoundManager } from './audio/SoundManager'
import { HUD } from './ui/HUD'

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

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

  const hud = new HUD(state, ads, sound, saveManager, app)

  if (saveCorrupted) {
    window.setTimeout(() => {
      hud.showCorruptedSaveNotice()
    }, 500)
  }

  if (ok) {
    const offlineBefore = state.money
    state.applyOfflineEarnings(lastSaveTime)
    const offlineAmount = state.money - offlineBefore
    if (offlineAmount > 0) {
      hud.showOfflinePopup(offlineAmount)
    }
  }

  if (state.canClaimDaily()) {
    window.setTimeout(() => {
      const amount = state.claimDailyReward()
      if (amount > 0) hud.renderAll()
    }, 800)
  }

  state.startTick()
  state.startEventLoop()
  saveManager.startAutoSave(state)
  hud.renderAll()

  document.addEventListener('click', () => sound.resume(), { once: true })
}

bootstrap()
