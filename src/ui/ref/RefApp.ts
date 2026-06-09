import './ref-ui.css'
import { RefHeader, type HeaderData } from './RefHeader'
import { RefTimeCard } from './RefTimeCard'
import { RefBottomNav, type RefNavTab } from './RefBottomNav'
import { RefFirmDetailPage } from './RefFirmDetailPage'
import { type FirmData } from './RefCard'
import { RefFirmsPage } from './RefFirmsPage'
import { RefDashboardPage } from './RefDashboardPage'
import { RefCareerPage } from './RefCareerPage'
import { RefMarketPage } from './RefMarketPage'
import { RefEmpirePage } from './RefEmpirePage'
import { RefFamilyPage } from './RefFamilyPage'
import { RefAchievementsPage } from './RefAchievementsPage'
import type { RefViewModel } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'
import { performRefCareerReset } from './refDevReset'
import { REFAPP_DEFAULT_FLAG } from './RefTestLauncher'

/** DEV-only: production build'de false (vite dead-code elimination). */
const IS_DEV = import.meta.env.DEV

/** Tüm ref sayfalarının ortak arayüzü: header + nav RefApp tarafından sağlanır. */
export interface RefPage {
  /** Sayfa gövdesi (scroll edilebilir .ref-body içine yerleştirilir). */
  readonly el: HTMLElement
  /** Header'da gösterilecek sayfa başlığı. */
  readonly title: string
  readonly titleDeco?: string
  /** Sayfa görünür olunca çağrılır. */
  onShow?(): void
  /**
   * Canlı para/gelir/KPI değerlerini DOM'u yeniden kurmadan tazeler.
   * RefApp tek aboneliğinden (yalnız aktif sayfa için) çağrılır.
   */
  refresh?(state: GameState): void
  /** Overlay kapanınca abonelik/timer temizliği. */
  destroy?(): void
}

const PLAYER: HeaderData = {
  name: 'Mert Karahan',
  title: 'Holding YK Başkanı',
  age: 34,
  city: 'İstanbul',
  avatarEmoji: '👤',
  avatarAsset: '/assets/ref-v2/avatars/avatar_main_businessman.png',
  notifCount: 1,
}

export interface RefAppOptions {
  initial?: RefNavTab
  /** Test/overlay modunda header'da kapat butonu gösterir ve bunu çağırır. */
  onExit?: () => void
  /** Gerçek GameState'ten türetilmiş view-model (salt okunur). Yoksa mock. */
  data?: RefViewModel
  /** Canlı GameState — zaman kontrolü ve işletme satın alma için gerekli. */
  state?: GameState
  /**
   * Kalıcı mod aktifken true: "Klasik Görünüm" butonu gösterilir.
   * Bu buton flag'i siler ve onExit'i çağırır (eski HUD'a döner).
   */
  isPermanent?: boolean
}

export class RefApp {
  readonly el: HTMLElement
  private header: RefHeader
  private timeBar: RefTimeCard
  private content: HTMLElement
  private nav: RefBottomNav
  private detail: RefFirmDetailPage
  /** Tembel önbellek: sayfa yalnızca ilk ziyarette kurulur, sonra saklanır. */
  private pages = new Map<RefNavTab, RefPage>()
  private achievements?: RefAchievementsPage
  private vm?: RefViewModel
  private gameState?: GameState
  private active: RefNavTab
  /** Tek GameState aboneliği (canlı para/KPI refresh) + throttle timer. */
  private unsub?: () => void
  private refreshTimer: number | null = null

  /** Ana oyuna bağlandığında geri/çıkış için (standalone'da kullanılmaz). */
  onExit?: () => void

  constructor(opts: RefAppOptions = {}) {
    const initial = opts.initial ?? 'firms'
    this.onExit = opts.onExit
    this.active = initial
    this.vm = opts.data
    this.gameState = opts.state
    const isPermanent = opts.isPermanent ?? (localStorage.getItem(REFAPP_DEFAULT_FLAG) === '1')

    // ── Shell ──
    this.el = document.createElement('div')
    this.el.className = 'ref-shell'

    // ── Shared header (gerçek veri varsa oyuncudan) ──
    const vm = this.vm
    this.header = new RefHeader({
      ...PLAYER,
      ...(vm ? { name: vm.player.name, title: vm.player.title, age: vm.player.age, city: vm.player.city, avatarAsset: vm.player.avatarAsset } : {}),
      onClose: opts.onExit ? () => this.onExit?.() : undefined,
    })
    this.el.appendChild(this.header.el)

    // ── Sabit zaman çubuğu (her sayfada görünür; tek kaynak gameTimeMs) ──
    this.timeBar = new RefTimeCard(this.gameState)
    this.el.appendChild(this.timeBar.el)

    if (IS_DEV && this.gameState) {
      this.el.appendChild(this.buildDevToolsBar())
    }

    // Kalıcı modda eski arayüze dönüş çubuğu (her ortamda; dev guard yok)
    if (isPermanent && opts.onExit) {
      this.el.appendChild(this.buildClassicBar(opts.onExit))
    }

    // ── Content (scroll) ──
    this.content = document.createElement('div')
    this.content.className = 'ref-body'
    this.el.appendChild(this.content)

    // ── Shared bottom nav ──
    this.nav = new RefBottomNav(initial)
    this.nav.onChange((tab) => this.show(tab))
    this.el.appendChild(this.nav.el)

    // ── Firma detay overlay (boş; yalnızca firma açılınca render eder) ──
    this.detail = new RefFirmDetailPage()
    this.detail.onBack = () => this.detail.hide()
    this.el.appendChild(this.detail.el)

    // Yalnızca açılış sekmesi kurulur; diğerleri ilk tıklamada (perf).
    this.show(initial)

    // ── Tek GameState aboneliği: yalnız AKTİF sayfanın para/KPI metnini tazeler ──
    // game_time → timeBar kendi aboneliğiyle güncellenir (tüm sayfa rerender ETME).
    // money_changed/passive_income → throttle; purchase → anında.
    const st = this.gameState
    if (st) {
      this.unsub = st.subscribe((ev) => {
        if (ev.type === 'purchase') this.refreshActive(st)
        else if (
          ev.type === 'money_changed'
          || ev.type === 'passive_income'
          || ev.type === 'game_time'
          || ev.type === 'career_action'
          || ev.type === 'career_wage'
          || ev.type === 'career_phase_changed'
        ) this.scheduleRefresh(st)
      })
    }
  }

  /** Aktif (görünür) sayfanın canlı değerlerini tazele. */
  private refreshActive(st: GameState): void {
    // Başarılar overlay açıksa onu tazele, değilse aktif sekmeyi
    const activePage = this.content.contains(this.achievements?.el ?? null)
      ? this.achievements
      : this.pages.get(this.active)
    activePage?.refresh?.(st)
  }

  /** money_changed/passive_income için ~600ms throttle (her tikte rebuild olmasın). */
  private scheduleRefresh(st: GameState): void {
    if (this.refreshTimer !== null) return
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null
      this.refreshActive(st)
    }, 600)
  }

  /**
   * Sayfayı tembel kur ve önbelleğe al. Açılışta yalnızca aktif sekme
   * kurulur; ağır SVG/görsel içeren diğer sayfalar DOM/bellekten uzak kalır.
   */
  private getPage(tab: RefNavTab): RefPage {
    let page = this.pages.get(tab)
    if (!page) {
      page = this.createPage(tab)
      this.pages.set(tab, page)
    }
    return page
  }

  private createPage(tab: RefNavTab): RefPage {
    const vm  = this.vm
    const st  = this.gameState
    switch (tab) {
      case 'home': {
        const dashboard = new RefDashboardPage(vm?.dashboard)
        dashboard.onOpenAchievements = () => this.showAchievements()
        return dashboard
      }
      case 'firms': {
        // hasRealData=!!vm: gerçek (ama boş) GameState'i saf-önizleme mock'undan
        // ayır → 0 firmalı oyuncuda dashboard ₺0 ile firmalar listesi çelişmez.
        const firms = new RefFirmsPage(vm?.firms, !!vm, st)
        firms.onOpenFirm = (f: FirmData) => this.detail.show(f)
        return firms
      }
      case 'career': {
        const career = new RefCareerPage(vm?.career, !!vm, st)
        career.onGoToFirms = () => this.show('firms')
        return career
      }
      case 'market': return new RefMarketPage(st)
      case 'empire': return new RefEmpirePage(st)
      case 'family': return new RefFamilyPage(st)
    }
  }

  /** DEV: RefApp çalışan fazı test başlangıcı — iki onay + yedek + reload. */
  private buildDevToolsBar(): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'ref-devtools'
    bar.setAttribute('aria-label', 'Geliştirici araçları')

    const label = document.createElement('div')
    label.className = 'ref-devtools__label'
    label.innerHTML = '🛠 Dev Tools <span class="ref-est-tag">DEV</span>'
    bar.appendChild(label)

    const row = document.createElement('div')
    row.className = 'ref-devtools__row'

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'ref-devtools__btn ref-devtools__btn--danger'
    resetBtn.textContent = 'Yeni Oyun / Sıfırla'
    resetBtn.title = 'Mevcut save yedeklenir, çalışan fazı başlangıcı yazılır'
    resetBtn.addEventListener('click', () => this.onNewGameReset())
    row.appendChild(resetBtn)

    bar.appendChild(row)

    const hint = document.createElement('div')
    hint.className = 'ref-devtools__hint'
    hint.textContent = 'İşletmesiz çalışan başlangıcı · tutorial bypass · sıfırlama öncesi otomatik yedek'
    bar.appendChild(hint)

    return bar
  }

  /**
   * Kalıcı modda gösterilen ince çubuk: flag'i siler ve eski HUD'a döner.
   * Üretim ortamında da görünür — feature flag toggle için erişilebilir olmalı.
   */
  private buildClassicBar(onExit: () => void): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'ref-classic-bar'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ref-classic-bar__btn'
    btn.textContent = '← Klasik Görünüm'
    btn.title = 'Yeni arayüzü kapat, eski oyun ekranına dön'
    btn.addEventListener('click', () => {
      localStorage.removeItem(REFAPP_DEFAULT_FLAG)
      onExit()
    })

    bar.appendChild(btn)
    return bar
  }

  private onNewGameReset(): void {
    const st = this.gameState
    if (!st || !IS_DEV) return
    const result = performRefCareerReset(st)
    if (!result.ok) return
    // HUD/tutorial senkronu için tam yenileme (otomatik onay yok — performRefCareerReset zaten sordu).
    window.setTimeout(() => window.location.reload(), 120)
  }

  /** Aktif nav sekmesini değiştir. */
  show(tab: RefNavTab): void {
    this.active = tab
    this.mountBody(this.getPage(tab))
    this.nav.setActive(tab)
  }

  private showAchievements(): void {
    if (!this.achievements) {
      this.achievements = new RefAchievementsPage(this.gameState)
      this.achievements.onBack = () => this.show(this.active)
    }
    this.mountBody(this.achievements)
  }

  private mountBody(page: RefPage): void {
    // Sayfa değişiminde açık firma detay overlay'ini kapat
    this.detail.hide()
    // Görseller tembel yüklensin (aynı anda onlarca asset decode etmesin)
    page.el.querySelectorAll<HTMLImageElement>('img:not([loading])').forEach((img) => {
      img.loading = 'lazy'
      img.decoding = 'async'
    })
    this.content.innerHTML = ''
    this.content.appendChild(page.el)
    this.content.scrollTop = 0
    this.header.setTitle(page.title, page.titleDeco ?? '⭐')
    page.onShow?.()
    // Sekme değişiminde önbellekli sayfa bayat para/KPI gösterebilir → anında tazele.
    if (this.gameState) page.refresh?.(this.gameState)
  }

  mount(target: HTMLElement): void {
    target.appendChild(this.el)
  }

  /** Overlay kapanınca çağrılır: tüm GameState aboneliklerini bırak (sızıntı önleme). */
  destroy(): void {
    this.unsub?.()
    this.unsub = undefined
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.timeBar.destroy()
    for (const page of this.pages.values()) {
      ;(page as { destroy?: () => void }).destroy?.()
    }
    this.el.remove()
  }
}
