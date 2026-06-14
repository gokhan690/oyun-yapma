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
import { RefLifePage } from './RefLifePage'
import { RefAchievementsPage } from './RefAchievementsPage'
import { RefProfilePage } from './RefProfilePage'
import { RefNotifsPage } from './RefNotifsPage'
import type { RefViewModel } from './refAppDataAdapter'
import { playerVMFromState } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'

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
  private profile?: RefProfilePage
  private notifs?: RefNotifsPage
  /** Şu an gövdede görünen sayfa (profil/başarımlar tab haritasında yok). */
  private mounted?: RefPage
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

    // ── Shell ──
    this.el = document.createElement('div')
    this.el.className = 'ref-shell'

    // ── Shared header (gerçek veri varsa oyuncudan) ──
    const vm = this.vm
    this.header = new RefHeader({
      ...PLAYER,
      ...(vm ? { name: vm.player.name, title: vm.player.title, age: vm.player.age, city: vm.player.city, avatarAsset: vm.player.avatarAsset } : {}),
      onClose: opts.onExit ? () => this.onExit?.() : undefined,
      onProfile: () => this.showProfile(),
      onAchievements: () => this.showAchievements(),
      onNotifs: () => this.showNotifs(),
    })
    this.el.appendChild(this.header.el)

    // ── Sabit zaman çubuğu (her sayfada görünür; tek kaynak gameTimeMs) ──
    this.timeBar = new RefTimeCard(this.gameState)
    this.el.appendChild(this.timeBar.el)

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
        else if (ev.type === 'health_changed' || ev.type === 'fame_changed') this.refreshActive(st)
        else if (ev.type === 'money_changed' || ev.type === 'passive_income') this.scheduleRefresh(st)
        else if (ev.type === 'gazette_headline') {
          // 🔔 rozeti + açıksa bildirim sayfasını tazele
          if (this.mounted === this.notifs) this.notifs?.refresh(st)
          else this.header.setNotifBadge(true)
        }
      })
    }
  }

  /** Aktif (görünür) sayfanın canlı değerlerini tazele + header player bilgisini güncelle. */
  private refreshActive(st: GameState): void {
    this.mounted?.refresh?.(st)
    const p = playerVMFromState(st)
    this.header.updatePlayer(p.name, p.title, p.age, p.city)
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
        firms.onOpenFirm = (f: FirmData, live) => this.detail.show(f, live)
        return firms
      }
      case 'career': return new RefCareerPage(vm?.career, st)
      case 'market': return new RefMarketPage(st)
      case 'empire': return new RefEmpirePage(st)
      case 'life':   return new RefLifePage(st)
    }
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

  private showProfile(): void {
    if (!this.profile) {
      this.profile = new RefProfilePage(this.vm, this.gameState)
      this.profile.onBack = () => this.show(this.active)
      this.profile.onOpenAchievements = () => this.showAchievements()
    }
    this.mountBody(this.profile)
  }

  private showNotifs(): void {
    if (!this.notifs) {
      this.notifs = new RefNotifsPage(this.gameState)
      this.notifs.onBack = () => this.show(this.active)
    }
    this.mountBody(this.notifs)
    // Görüldü → rozet söner
    this.header.setNotifBadge(false)
  }

  private mountBody(page: RefPage): void {
    this.mounted = page
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
    ;(this.profile as { destroy?: () => void } | undefined)?.destroy?.()
    ;(this.achievements as { destroy?: () => void } | undefined)?.destroy?.()
    ;(this.notifs as { destroy?: () => void } | undefined)?.destroy?.()
    this.el.remove()
  }
}
