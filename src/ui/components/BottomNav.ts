export type NavView = 'earn' | 'career' | 'shop' | 'market' | 'events' | 'profile'

import { assetUrl } from '../../utils/assetUrl'
import { t } from '../../i18n'
import type { Translations } from '../../i18n/keys'

const NAV_ICONS: Record<NavView, string> = {
  career: assetUrl('icons/nav/earn.svg'),
  earn: assetUrl('icons/nav/earn.svg'),
  shop: assetUrl('icons/nav/shop.svg'),
  market: assetUrl('icons/nav/empire.svg'),
  events: assetUrl('icons/nav/events.svg'),
  profile: assetUrl('icons/nav/profile.svg'),
}

/** Alt menü: Kariyer · İş · Piyasa · Olaylar · Baron */
export class BottomNav {
  readonly root: HTMLElement
  private active: NavView = 'career'
  private buttons = new Map<NavView, HTMLButtonElement>()
  private badgeBaron!: HTMLElement
  private badgeShop!: HTMLElement
  private badgeMarket!: HTMLElement
  private badgeEvents!: HTMLElement
  private labels = new Map<NavView, HTMLElement>()
  private static readonly LABEL_KEYS: Record<NavView, keyof Translations> = {
    career: 'nav_city',
    earn: 'nav_city',
    shop: 'nav_business',
    market: 'nav_market',
    events: 'tab_events',
    profile: 'nav_baron',
  }

  constructor() {
    this.root = document.createElement('nav')
    this.root.className = 'bottom-nav bottom-nav-five'
    const defs: { id: NavView; label: string }[] = [
      { id: 'career', label: 'Kariyer' },
      { id: 'shop', label: t('nav_business') },
      { id: 'market', label: t('nav_market') },
      { id: 'events', label: t('tab_events') },
      { id: 'profile', label: t('nav_baron') },
    ]
    for (const d of defs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nav-btn'
      btn.dataset.action = 'nav-view'
      btn.dataset.id = d.id
      if (d.id === 'career') btn.classList.add('active')
      const iconWrap = document.createElement('span')
      iconWrap.className = 'nav-icon'
      const img = document.createElement('img')
      img.src = NAV_ICONS[d.id]
      img.alt = ''
      img.width = 22
      img.height = 22
      iconWrap.appendChild(img)
      const label = document.createElement('span')
      label.className = 'nav-label'
      label.textContent = d.label
      this.labels.set(d.id, label)
      btn.append(iconWrap, label)
      if (d.id === 'profile') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeBaron = badge
      }
      if (d.id === 'shop') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeShop = badge
      }
      if (d.id === 'market') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeMarket = badge
      }
      if (d.id === 'events') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeEvents = badge
      }
      this.buttons.set(d.id, btn)
      this.root.appendChild(btn)
    }
  }

  setActive(view: NavView): void {
    this.active = view
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle('active', id === view)
    }
  }

  getActive(): NavView {
    return this.active
  }

  relabel(): void {
    for (const [id, el] of this.labels) {
      if (id === 'career') {
        el.textContent = 'Kariyer'
      } else {
        el.textContent = t(BottomNav.LABEL_KEYS[id])
      }
    }
  }

  setBadges(baron: boolean, shop: boolean, market = false, events = false): void {
    if (this.badgeBaron) this.badgeBaron.hidden = !baron
    if (this.badgeShop) this.badgeShop.hidden = !shop
    if (this.badgeMarket) this.badgeMarket.hidden = !market
    if (this.badgeEvents) this.badgeEvents.hidden = !events
  }

  setNavLocked(locks: Partial<Record<NavView, string | null>>): void {
    for (const [id, btn] of this.buttons) {
      const reason = locks[id]
      const locked = !!reason
      btn.classList.toggle('nav-btn-locked', locked)
      btn.dataset.lockedReason = reason ?? ''
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false')
    }
  }
}
