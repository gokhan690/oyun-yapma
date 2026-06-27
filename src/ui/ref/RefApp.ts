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
import { RefSettingsPage } from './RefSettingsPage'
import type { RefViewModel } from './refAppDataAdapter'
import { playerVMFromState } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'
import type { AdManager } from '../../ads/AdManager'
import type { SaveManager } from '../../security/SaveManager'
import type { DailyEvent } from '../../game/DailyPlan'
import { RefRewardQueue } from './RefRewardQueue'
import { RefNotificationBridge } from './RefNotificationBridge'
import { refToast, fmtMoney } from './refShared'
import { fmt } from '../../i18n'

// Tab → DailyEvent map (here so DailyPlan.ts stays UI-free)
const DAILY_VISIT_EVENTS: Partial<Record<RefNavTab, DailyEvent>> = {
  career: 'career_viewed',
  firms:  'firms_viewed',
  market: 'market_viewed',
  empire: 'empire_viewed',
  life:   'life_viewed',
}

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
  /** Ödüllü reklam yöneticisi — reward kuyruğu (offline/comeback/bankruptcy) için. */
  ads?: AdManager
  /** Başarılı claim sonrası anlık kayıt (reload çift-ödeme koruması). */
  onPersist?: () => void
  /** SaveManager — settings sayfasında kayıt işlemleri için. */
  saveManager?: SaveManager
  /** Oyun sıfırlama onayı: main.ts tarafından sağlanır, reset sequansını yönetir. */
  onResetConfirmed?: () => void
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
  /** Ziyaret takibi için ayrı alan — null başlangıç, ilk show'da set edilir. */
  private currentTab: RefNavTab | null = null
  /** Tek GameState aboneliği (canlı para/KPI refresh) + throttle timer. */
  private unsub?: () => void
  private refreshTimer: number | null = null
  /** Reward kuyruğu (offline/comeback/daily/bankruptcy) — canlı state + ads varsa. */
  private rewardQueue?: RefRewardQueue
  /** Bildirim köprüsü (toast/aktivite) — tek abonelikten beslenir. */
  private notifBridge?: RefNotificationBridge
  private settings?: RefSettingsPage
  private saveManager?: SaveManager
  private onResetConfirmed?: () => void
  private readonly handleVisibilityChange = (): void => {
    if (document.hidden || !this.gameState) return
    this.gameState.ensureDailyPlan()
    // daily_plan_updated emitted → subscription calls refreshActive automatically
    // Self-heal: if tick stopped (e.g. after long background) restart it
    if (this.gameState.isIntroFlowReady() && !this.gameState.isTicking() && !this.gameState.isPaused()) {
      this.gameState.startTick()
    }
  }

  /** Ana oyuna bağlandığında geri/çıkış için (standalone'da kullanılmaz). */
  onExit?: () => void

  constructor(opts: RefAppOptions = {}) {
    const initial = opts.initial ?? 'firms'
    this.onExit = opts.onExit
    this.active = initial
    this.vm = opts.data
    this.gameState = opts.state
    this.saveManager = opts.saveManager
    this.onResetConfirmed = opts.onResetConfirmed

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
    // ensureDailyPlan önce çağrılır; show() mount sırasında plan hazır olsun.
    this.gameState?.ensureDailyPlan()
    this.show(initial)

    // ── Tek GameState aboneliği: yalnız AKTİF sayfanın para/KPI metnini tazeler ──
    // game_time → timeBar kendi aboneliğiyle güncellenir (tüm sayfa rerender ETME).
    // money_changed/passive_income → throttle; purchase → anında.
    const st = this.gameState
    if (st) {
      // Bildirim köprüsü — tek abonelik içinden beslenir (ayrı listener AÇMAZ).
      const onPersistNotif = opts.onPersist
      this.notifBridge = new RefNotificationBridge(st, () => {
        this.refreshActive(st)
        onPersistNotif?.()
      })
      this.unsub = st.subscribe((ev) => {
        this.notifBridge?.handle(ev)
        if (ev.type === 'purchase') this.refreshActive(st)
        else if (ev.type === 'health_changed' || ev.type === 'fame_changed') this.refreshActive(st)
        else if (ev.type === 'money_changed' || ev.type === 'passive_income') this.scheduleRefresh(st)
        else if (ev.type === 'career_day_reset') this.refreshActive(st)
        else if (ev.type === 'day_settled') {
          // Gün değişimi bildirimi: gerçekten ödenen toplamı (çok günlü yakalamada
          // kaç gün için ödendiğini) göster.
          const amount = fmtMoney(ev.total)
          refToast(
            ev.days > 1
              ? fmt('ref_day_settled_multi', { amount, days: String(ev.days) })
              : fmt('ref_day_settled', { amount }),
            'ok',
          )
        }
        else if (ev.type === 'daily_plan_updated') this.refreshActive(st)
        else if (ev.type === 'gazette_headline') {
          // 🔔 rozeti + açıksa bildirim sayfasını tazele
          if (this.mounted === this.notifs) this.notifs?.refresh(st)
          else this.header.setNotifBadge(true)
        }
      })
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    // ── Reward kuyruğu: pending offline/comeback/daily/bankruptcy ödülleri ──
    // Canlı state + AdManager varsa kur. Shell mount edildikten sonra (ilk
    // paint) göster ki modal görünür shell üzerine binsin.
    if (st && opts.ads) {
      const onPersist = opts.onPersist
      this.rewardQueue = new RefRewardQueue(
        st,
        opts.ads,
        () => { this.refreshActive(st); onPersist?.() },
        // Reward kuyruğu boşalınca karar modalı on-load kontrolünü çalıştır
        // (aynı anda tek modal kuralı: önce ödüller, sonra kritik durumlar).
        () => this.notifBridge?.start(),
      )
      requestAnimationFrame(() => this.rewardQueue?.start())
    } else if (st) {
      // ads yoksa reward kuyruğu kurulmaz; karar modalı on-load kontrolünü yine çalıştır.
      requestAnimationFrame(() => this.notifBridge?.start())
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
        const dashboard = new RefDashboardPage(vm?.dashboard, st)
        dashboard.onOpenAchievements = () => this.showAchievements()
        dashboard.onNavigate = (tab) => this.show(tab)
        dashboard.onQuickNewFirm = () => {
          this.show('firms')
          requestAnimationFrame(() => {
            const card = this.pages.get('firms')?.el.querySelector('.ref-prod-card.available')
              ?? this.pages.get('firms')?.el.querySelector('.ref-prod-card')
            card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
        dashboard.onQuickOpenCity = () => {
          this.show('empire')
          requestAnimationFrame(() => {
            const sec = this.pages.get('empire')?.el.querySelector('.ref-cities-journey')
              ?? this.pages.get('empire')?.el.querySelector('.ref-cities-kpi')
            sec?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
        }
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
    const previousTab = this.currentTab
    // Mount first — if it throws, active/currentTab stay unchanged and no visit event fires.
    this.mountBody(this.getPage(tab))
    this.active = tab
    this.nav.setActive(tab)
    this.currentTab = tab
    if (previousTab !== null && tab !== previousTab) {
      const visitEvent = DAILY_VISIT_EVENTS[tab]
      if (visitEvent && this.gameState) this.gameState.recordDailyEvent(visitEvent)
    }
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
      this.profile.onSettings = () => this.showSettings()
    }
    this.mountBody(this.profile)
  }

  private showSettings(): void {
    if (!this.settings) {
      const st = this.gameState
      const sm = this.saveManager
      if (!st || !sm) return
      this.settings = new RefSettingsPage({
        state: st,
        saveManager: sm,
        onBack: () => {
          this.settings?.destroy()
          this.settings = undefined
          this.showProfile()
        },
        onPersist: () => sm.save(st),
        onResetConfirmed: this.onResetConfirmed,
      })
    }
    this.mountBody(this.settings)
  }

  /** Toast mesajı göster. */
  showToast(message: string, kind: 'ok' | 'err' = 'ok'): void {
    refToast(message, kind)
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
    // Utility ekranlarda (Profil/Başarımlar/Bildirimler) bottom nav gizlenir.
    const isUtility = page === this.profile || page === this.achievements || page === this.notifs || page === this.settings
    this.el.classList.toggle('ref-shell--utility', isUtility)
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
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.rewardQueue?.destroy()
    this.rewardQueue = undefined
    this.notifBridge?.destroy()
    this.notifBridge = undefined
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
    this.settings?.destroy()
    this.settings = undefined
    this.el.remove()
  }
}
