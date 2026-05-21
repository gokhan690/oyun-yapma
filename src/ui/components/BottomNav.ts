export type NavView = 'earn' | 'shop' | 'events' | 'profile'

import { assetUrl } from '../../utils/assetUrl'

const NAV_ICONS: Record<NavView, string> = {
  earn: assetUrl('icons/nav/earn.svg'),
  shop: assetUrl('icons/nav/shop.svg'),
  events: assetUrl('icons/nav/events.svg'),
  profile: assetUrl('icons/nav/profile.svg'),
}

export class BottomNav {
  readonly root: HTMLElement
  private active: NavView = 'earn'
  private buttons = new Map<NavView, HTMLButtonElement>()
  private badgeEvents!: HTMLElement
  private badgeShop!: HTMLElement

  constructor() {
    this.root = document.createElement('nav')
    this.root.className = 'bottom-nav'
    const defs: { id: NavView; label: string }[] = [
      { id: 'earn', label: 'Kazan' },
      { id: 'shop', label: 'Mağaza' },
      { id: 'events', label: 'Etkinlik' },
      { id: 'profile', label: 'Profil' },
    ]
    for (const d of defs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nav-btn'
      btn.dataset.action = 'nav-view'
      btn.dataset.id = d.id
      if (d.id === 'earn') btn.classList.add('active')
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
      btn.append(iconWrap, label)
      if (d.id === 'events') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeEvents = badge
      }
      if (d.id === 'shop') {
        const badge = document.createElement('span')
        badge.className = 'nav-badge'
        badge.hidden = true
        btn.appendChild(badge)
        this.badgeShop = badge
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

  setBadges(events: boolean, shop: boolean): void {
    if (this.badgeEvents) this.badgeEvents.hidden = !events
    if (this.badgeShop) this.badgeShop.hidden = !shop
  }
}
