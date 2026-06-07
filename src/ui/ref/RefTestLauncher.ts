import { RefApp } from './RefApp'
import { buildRefViewModel, type RefViewModel } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'

/*
 * İZOLE GÖRSEL TEST MODU.
 * Ana oyuna RefApp'i bağlamaz, GameState'e dokunmaz, ekonomi/tutorial/piyasa
 * kilidini değiştirmez. Yalnızca yüzen bir butonla RefApp'i (mock data) tam
 * ekran, izole overlay olarak açıp kapatır.
 *
 * Launcher butonu YALNIZCA oyun gerçekten hazırken ve oyuncu normal oyun
 * ekranındayken görünür: onboarding, karakter/eğitim seçimi, tutorial veya
 * herhangi bir büyük modal/sheet açıkken GİZLENİR.
 */

// Oyunu kilitleyen/odak çalan tam ekran katmanlar (görünürlerse launcher gizlenir)
const BLOCKING_SELECTORS = [
  '.onboarding-overlay',
  '.tutorial-overlay',
  '.modal-scrim',
  '.sheet-scrim.is-open',
  '#boot-error',
  '#ref-test-overlay',
]

function gameBusy(): boolean {
  // Uygulama henüz render olmadıysa (boş #app) hazır değil
  const app = document.getElementById('app')
  if (!app || app.children.length === 0) return true
  for (const sel of BLOCKING_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el && el.offsetParent !== null) return true
    // #boot-error offsetParent null olabilir; display kontrolü
    if (el && sel === '#boot-error' && getComputedStyle(el).display !== 'none') return true
  }
  return false
}

export function installRefTestLauncher(state?: GameState): void {
  if (document.getElementById('ref-test-launch')) return

  // Test/önizleme kolaylığı: adapter'ın okuduğu GameState'i Playwright/konsol
  // ile seed edebilmek için (yalnızca test modu scaffolding'i; oyun mantığı değil).
  if (state) (window as unknown as { __II_REF_STATE__?: GameState }).__II_REF_STATE__ = state

  /** GameState → view-model; hata olursa undefined (RefApp mock fallback'e düşer). */
  const buildData = (): RefViewModel | undefined => {
    if (!state) return undefined
    try {
      return buildRefViewModel(state)
    } catch (e) {
      console.warn('RefApp data adapter hatası, mock fallback kullanılıyor:', e)
      return undefined
    }
  }

  const btn = document.createElement('button')
  btn.id = 'ref-test-launch'
  btn.type = 'button'
  btn.textContent = '✨ Yeni Arayüz'
  btn.title = 'Yeni arayüz önizlemesi (gerçek veriyi SALT OKUR · oyunu değiştirmez)'
  btn.setAttribute('aria-label', 'Yeni arayüz test modunu aç')
  Object.assign(btn.style, {
    position: 'fixed',
    left: '10px',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
    zIndex: '9000',
    padding: '9px 14px',
    borderRadius: '999px',
    border: '1.5px solid rgba(246,200,76,0.7)',
    background: 'linear-gradient(180deg,#13B8A6,#078B83)',
    color: '#fff',
    fontWeight: '800',
    fontSize: '12px',
    fontFamily: 'Outfit, system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(0,60,80,0.28)',
    cursor: 'pointer',
    display: 'none',
    transition: 'opacity 0.2s',
  } as CSSStyleDeclaration)

  let overlay: HTMLElement | null = null
  let bodyOverflowPrev = ''
  let mo: MutationObserver | null = null
  let pollId: number | null = null

  // Launcher görünürlük izleyicileri. Overlay AÇIKKEN durdurulur: buton zaten
  // gizli, ve RefApp her nav geçişinde innerHTML değiştirdiği için observer
  // sürekli tetiklenir → gereksiz arka plan işi/kasma.
  const startWatchers = (): void => {
    if (!mo) {
      mo = new MutationObserver(() => syncVisibility())
      mo.observe(document.body, { childList: true, subtree: true })
    }
    if (pollId === null) pollId = window.setInterval(syncVisibility, 600)
  }
  const stopWatchers = (): void => {
    mo?.disconnect()
    mo = null
    if (pollId !== null) { window.clearInterval(pollId); pollId = null }
  }

  const close = (): void => {
    if (overlay) {
      ;(overlay as HTMLElement & { __refDestroy?: () => void }).__refDestroy?.()
    }
    overlay?.remove()
    overlay = null
    document.body.style.overflow = bodyOverflowPrev
    startWatchers()   // izleyicileri geri aç
    syncVisibility()
  }

  const open = (): void => {
    if (overlay) return
    // GÜVENLİK KİLİDİ: oyun intro akışı bitmeden RefApp AÇILMAZ. Aksi halde
    // GameState tick'i hiç başlamadığı (gameDt=0) için RefApp donmuş bir oyun
    // üzerine açılır → zaman çubuğu "Day 1"de kalır. Buton zaten gizli olsa da
    // programatik/yarış durumlarına karşı burada da kesin engelle.
    if (state && !state.isIntroFlowReady()) {
      syncVisibility()
      return
    }
    // Oyun hazır: mevcut tick'in çalıştığından emin ol (idempotent — yeni loop kurmaz).
    state?.startTick()
    overlay = document.createElement('div')
    overlay.id = 'ref-test-overlay'
    // Opak sky zemin → geniş ekran kenar boşluklarında bile ana oyun görünmez,
    // tıklamalar arkadaki eski UI'a geçmez.
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9500',
      background: '#3a8fd4',
      overscrollBehavior: 'contain',
    } as CSSStyleDeclaration)

    const app = new RefApp({ initial: 'firms', onExit: close, data: buildData(), state: state ?? undefined })
    app.mount(overlay)
    document.body.appendChild(overlay)
    // Kapandığında abonelikleri temizle (bellek sızıntısı önleme)
    ;(overlay as HTMLElement & { __refDestroy?: () => void }).__refDestroy = () => app.destroy()

    // Arka plan (eski oyun) scroll'unu kilitle
    bodyOverflowPrev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    btn.style.display = 'none'
    stopWatchers()   // overlay açıkken izleyiciler boşuna çalışmasın
  }

  btn.addEventListener('click', open)
  document.body.appendChild(btn)

  // Görünürlük senkronu: oyun durumu değiştikçe launcher'ı göster/gizle
  const syncVisibility = (): void => {
    if (overlay) {
      btn.style.display = 'none'
      return
    }
    // Launcher YALNIZCA intro akışı tamamlandığında görünür; aksi hâlde RefApp
    // tick'i başlamamış bir oyun üzerine açılır → oyun saati donar.
    const notReady = !!state && !state.isIntroFlowReady()
    btn.style.display = (notReady || gameBusy()) ? 'none' : ''
  }

  syncVisibility()
  // DOM değişimlerini izle (modal aç/kapa) + güvenlik için periyodik kontrol
  startWatchers()
}
