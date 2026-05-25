export type NavView = 'earn' | 'shop' | 'market' | 'profile'

import { assetUrl } from '../../utils/assetUrl'

const NAV_ICONS: Record<NavView, string> = {
  earn: assetUrl('icons/nav/earn.svg'),
  shop: assetUrl('icons/nav/shop.svg'),
  market: assetUrl('icons/nav/shop.svg'),
  profile: assetUrl('icons/nav/profile.svg'),
}

/** Alt menü: Şehir · İş · Piyasa · Baron */
export class BottomNav {
  readonly root: HTMLElement
  private active: NavView = 'earn'
  private buttons = new Map<NavView, HTMLButtonElement>()
  private badgeBaron!: HTMLElement
  private badgeShop!: HTMLElement
  private badgeMarket!: HTMLElement

  constructor() {
    this.root = document.createElement('nav')
    this.root.className = 'bottom-nav bottom-nav-four'
    const defs: { id: NavView; label: string }[] = [
      { id: 'earn', label: 'Şehir' },
      { id: 'shop', label: 'İş' },
      { id: 'market', label: 'Piyasa' },
      { id: 'profile', label: 'Baron' },
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

  setBadges(baron: boolean, shop: boolean, market = false): void {
    if (this.badgeBaron) this.badgeBaron.hidden = !baron
    if (this.badgeShop) this.badgeShop.hidden = !shop
    if (this.badgeMarket) this.badgeMarket.hidden = !market
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
