export type NavView = 'earn' | 'shop' | 'events' | 'profile'

export class BottomNav {
  readonly root: HTMLElement
  private active: NavView = 'earn'
  private buttons = new Map<NavView, HTMLButtonElement>()
  private badgeEvents!: HTMLElement
  private badgeShop!: HTMLElement

  constructor() {
    this.root = document.createElement('nav')
    this.root.className = 'bottom-nav'
    const defs: { id: NavView; icon: string; label: string }[] = [
      { id: 'earn', icon: '💼', label: 'Kazan' },
      { id: 'shop', icon: '🏪', label: 'Mağaza' },
      { id: 'events', icon: '🎯', label: 'Etkinlik' },
      { id: 'profile', icon: '👤', label: 'Profil' },
    ]
    for (const d of defs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nav-btn'
      btn.dataset.action = 'nav-view'
      btn.dataset.id = d.id
      if (d.id === 'earn') btn.classList.add('active')
      btn.innerHTML = `<span class="nav-icon">${d.icon}</span><span class="nav-label">${d.label}</span>`
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
