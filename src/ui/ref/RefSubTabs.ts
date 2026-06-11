export interface SubTabDef { id: string; label: string; icon: string }

/**
 * Ortak alt-sekme bileşeni: .ref-main-tabs segmented kontrolü + display-toggle
 * içerik konteynerleri. setActive ASLA içerik rebuild etmez — yalnız buton
 * class'ı ve section display'i değişir (performans sözleşmesi).
 */
export class RefSubTabs {
  readonly tabsEl: HTMLElement
  private sections = new Map<string, HTMLElement>()
  private btns = new Map<string, HTMLButtonElement>()
  private activeId: string
  onChange?: (id: string) => void

  constructor(tabs: SubTabDef[], initial?: string) {
    this.activeId = initial ?? tabs[0]?.id ?? ''
    this.tabsEl = document.createElement('div')
    this.tabsEl.className = 'ref-main-tabs ref-subtabs'
    for (const tab of tabs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ref-main-tab' + (tab.id === this.activeId ? ' active' : '')
      btn.dataset.tab = tab.id
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => {
        this.setActive(tab.id)
        this.onChange?.(tab.id)
      })
      this.btns.set(tab.id, btn)
      this.tabsEl.appendChild(btn)
    }
  }

  /** Sekmeye ait içerik konteyneri (lazy oluşturulur; aktif değilse gizli). */
  section(id: string): HTMLElement {
    let sec = this.sections.get(id)
    if (!sec) {
      sec = document.createElement('div')
      sec.className = 'ref-subtab-content'
      sec.dataset.tab = id
      if (id !== this.activeId) sec.style.display = 'none'
      this.sections.set(id, sec)
    }
    return sec
  }

  setActive(id: string): void {
    this.activeId = id
    this.btns.forEach((btn, bid) => btn.classList.toggle('active', bid === id))
    this.sections.forEach((sec, sid) => { sec.style.display = sid === id ? '' : 'none' })
  }

  get active(): string {
    return this.activeId
  }
}
