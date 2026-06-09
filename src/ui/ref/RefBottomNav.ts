export type RefNavTab = 'home' | 'career' | 'firms' | 'market' | 'empire' | 'cities' | 'family'

interface TabDef {
  id: RefNavTab
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { id: 'home',   label: 'Ana Panel',    icon: '🏠' },
  { id: 'career', label: 'Kariyer',      icon: '💼' },
  { id: 'firms',  label: 'Firmalar',     icon: '🏢' },
  { id: 'market', label: 'Piyasa',       icon: '📊' },
  { id: 'empire', label: 'İmparatorluk', icon: '👑' },
  { id: 'cities', label: 'Şehirler',     icon: '🌍' },
  { id: 'family', label: 'Aile',         icon: '👨‍👩‍👧' },
]

export class RefBottomNav {
  readonly el: HTMLElement
  private btns = new Map<RefNavTab, HTMLButtonElement>()
  private onTabChange?: (tab: RefNavTab) => void

  constructor(active: RefNavTab = 'firms') {
    this.el = document.createElement('nav')
    this.el.className = 'ref-bottom-nav'

    for (const tab of TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-nav-btn' + (tab.id === active ? ' active' : '')
      btn.innerHTML = `
        <span class="ref-nav-btn__ico">${tab.icon}</span>
        <span class="ref-nav-btn__lbl">${tab.label}</span>
      `
      btn.addEventListener('click', () => {
        this.setActive(tab.id)
        this.onTabChange?.(tab.id)
      })
      this.btns.set(tab.id, btn)
      this.el.appendChild(btn)
    }
  }

  setActive(tab: RefNavTab): void {
    this.btns.forEach((btn, id) => {
      btn.classList.toggle('active', id === tab)
    })
  }

  onChange(cb: (tab: RefNavTab) => void): void {
    this.onTabChange = cb
  }
}
