import './ref-ui.css'
import { RefHeader, type HeaderData } from './RefHeader'
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

/** Tüm ref sayfalarının ortak arayüzü: header + nav RefApp tarafından sağlanır. */
export interface RefPage {
  /** Sayfa gövdesi (scroll edilebilir .ref-body içine yerleştirilir). */
  readonly el: HTMLElement
  /** Header'da gösterilecek sayfa başlığı. */
  readonly title: string
  readonly titleDeco?: string
  /** Sayfa görünür olunca çağrılır. */
  onShow?(): void
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
}

export class RefApp {
  readonly el: HTMLElement
  private header: RefHeader
  private content: HTMLElement
  private nav: RefBottomNav
  private detail: RefFirmDetailPage
  private pages = new Map<RefNavTab, RefPage>()
  private achievements: RefAchievementsPage
  private active: RefNavTab

  /** Ana oyuna bağlandığında geri/çıkış için (standalone'da kullanılmaz). */
  onExit?: () => void

  constructor(opts: RefAppOptions = {}) {
    const initial = opts.initial ?? 'firms'
    this.onExit = opts.onExit
    this.active = initial

    // ── Shell ──
    this.el = document.createElement('div')
    this.el.className = 'ref-shell'

    // ── Shared header ──
    this.header = new RefHeader({
      ...PLAYER,
      onClose: opts.onExit ? () => this.onExit?.() : undefined,
    })
    this.el.appendChild(this.header.el)

    // ── Content (scroll) ──
    this.content = document.createElement('div')
    this.content.className = 'ref-body'
    this.el.appendChild(this.content)

    // ── Shared bottom nav ──
    this.nav = new RefBottomNav(initial)
    this.nav.onChange((tab) => this.show(tab))
    this.el.appendChild(this.nav.el)

    // ── Firma detay overlay ──
    this.detail = new RefFirmDetailPage()
    this.detail.onBack = () => this.detail.hide()
    this.el.appendChild(this.detail.el)

    // ── Pages ──
    const firms = new RefFirmsPage()
    firms.onOpenFirm = (f: FirmData) => this.detail.show(f)

    const dashboard = new RefDashboardPage()
    dashboard.onOpenAchievements = () => this.showAchievements()

    this.pages.set('home',   dashboard)
    this.pages.set('career', new RefCareerPage())
    this.pages.set('firms',  firms)
    this.pages.set('market', new RefMarketPage())
    this.pages.set('empire', new RefEmpirePage())
    this.pages.set('family', new RefFamilyPage())

    // Başarılar — nav dışı, dashboard'dan açılır
    this.achievements = new RefAchievementsPage()
    this.achievements.onBack = () => this.show(this.active)

    this.show(initial)
  }

  /** Aktif nav sekmesini değiştir. */
  show(tab: RefNavTab): void {
    const page = this.pages.get(tab)
    if (!page) return
    this.active = tab
    this.mountBody(page)
    this.nav.setActive(tab)
  }

  private showAchievements(): void {
    this.mountBody(this.achievements)
  }

  private mountBody(page: RefPage): void {
    // Sayfa değişiminde açık firma detay overlay'ini kapat
    this.detail.hide()
    this.content.innerHTML = ''
    this.content.appendChild(page.el)
    this.content.scrollTop = 0
    this.header.setTitle(page.title, page.titleDeco ?? '⭐')
    page.onShow?.()
  }

  mount(target: HTMLElement): void {
    target.appendChild(this.el)
  }
}
