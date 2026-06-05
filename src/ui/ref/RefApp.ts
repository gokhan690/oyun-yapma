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
import type { RefViewModel } from './refAppDataAdapter'
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
  private content: HTMLElement
  private nav: RefBottomNav
  private detail: RefFirmDetailPage
  /** Tembel önbellek: sayfa yalnızca ilk ziyarette kurulur, sonra saklanır. */
  private pages = new Map<RefNavTab, RefPage>()
  private achievements?: RefAchievementsPage
  private vm?: RefViewModel
  private gameState?: GameState
  private active: RefNavTab

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

    // ── Firma detay overlay (boş; yalnızca firma açılınca render eder) ──
    this.detail = new RefFirmDetailPage()
    this.detail.onBack = () => this.detail.hide()
    this.el.appendChild(this.detail.el)

    // Yalnızca açılış sekmesi kurulur; diğerleri ilk tıklamada (perf).
    this.show(initial)
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
        return dashboard
      }
      case 'firms': {
        // hasRealData=!!vm: gerçek (ama boş) GameState'i saf-önizleme mock'undan
        // ayır → 0 firmalı oyuncuda dashboard ₺0 ile firmalar listesi çelişmez.
        const firms = new RefFirmsPage(vm?.firms, !!vm, st)
        firms.onOpenFirm = (f: FirmData) => this.detail.show(f)
        return firms
      }
      case 'career': return new RefCareerPage(vm?.career)
      case 'market': return new RefMarketPage()
      case 'empire': return new RefEmpirePage(st)
      case 'family': return new RefFamilyPage()
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
      this.achievements = new RefAchievementsPage()
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
  }

  mount(target: HTMLElement): void {
    target.appendChild(this.el)
  }
}
