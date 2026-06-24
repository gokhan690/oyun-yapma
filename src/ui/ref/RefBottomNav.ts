import { i18n } from '../../i18n'

export type RefNavTab = 'home' | 'career' | 'market' | 'firms' | 'empire' | 'life'

interface TabDef {
  id: RefNavTab
  icon: string
  key: 'ref_nav_home' | 'ref_nav_career' | 'ref_nav_firms' | 'ref_nav_market' | 'ref_nav_empire' | 'ref_nav_life'
}

const TABS: TabDef[] = [
  { id: 'home',   icon: '🏠', key: 'ref_nav_home'   },
  { id: 'career', icon: '💼', key: 'ref_nav_career'  },
  { id: 'firms',  icon: '🏢', key: 'ref_nav_firms'   },
  { id: 'market', icon: '📊', key: 'ref_nav_market'  },
  { id: 'empire', icon: '👑', key: 'ref_nav_empire'  },
  { id: 'life',   icon: '👨‍👩‍👧', key: 'ref_nav_life' },
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
        <span class="ref-nav-btn__lbl">${i18n.t(tab.key)}</span>
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
