export interface KpiItem {
  icon: string
  label: string
  value: string
  sub?: string
  subDir?: 'up' | 'down' | 'muted'
}

export class RefKpiStrip {
  readonly el: HTMLElement
  /** Önceki değerler — update() yalnız değişen metni patch'ler (innerHTML rebuild yok). */
  private lastItems: KpiItem[] = []
  private valueEls: HTMLElement[] = []
  private subEls: (HTMLElement | null)[] = []

  constructor(items: KpiItem[]) {
    this.el = document.createElement('div')
    this.el.className = 'ref-kpi-strip'
    this.rebuild(items)
  }

  private rebuild(items: KpiItem[]): void {
    this.el.innerHTML = ''
    this.valueEls = []
    this.subEls = []
    for (const item of items) {
      this.el.appendChild(this.buildCard(item))
    }
    this.lastItems = items.map((i) => ({ ...i }))
  }

  private buildCard(item: KpiItem): HTMLElement {
    const card = document.createElement('div')
    card.className = 'ref-kpi-card'
    card.innerHTML = `
      <div class="ref-kpi-icon">${item.icon}</div>
      <div class="ref-kpi-label">${item.label}</div>
      <div class="ref-kpi-value">${item.value}</div>
      ${item.sub ? `<div class="ref-kpi-sub ${item.subDir ?? 'up'}">${item.subDir === 'up' ? '▲' : item.subDir === 'down' ? '▼' : ''} ${item.sub}</div>` : ''}
    `
    this.valueEls.push(card.querySelector('.ref-kpi-value') as HTMLElement)
    this.subEls.push(card.querySelector('.ref-kpi-sub') as HTMLElement | null)
    return card
  }

  update(items: KpiItem[]): void {
    // Yapı değiştiyse (kart sayısı/etiket/sub varlığı) komple yeniden kur
    const structureChanged =
      items.length !== this.lastItems.length ||
      items.some((it, i) =>
        it.label !== this.lastItems[i]?.label ||
        it.icon !== this.lastItems[i]?.icon ||
        !!it.sub !== !!this.lastItems[i]?.sub)
    if (structureChanged) {
      this.rebuild(items)
      return
    }
    // Aynı yapı: yalnız değişen value/sub metnini patch'le
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!
      const prev = this.lastItems[i]!
      if (it.value !== prev.value) {
        const el = this.valueEls[i]
        if (el) el.textContent = it.value
        prev.value = it.value
      }
      if (it.sub !== prev.sub && this.subEls[i]) {
        const arrow = it.subDir === 'up' ? '▲ ' : it.subDir === 'down' ? '▼ ' : ''
        this.subEls[i]!.textContent = `${arrow}${it.sub ?? ''}`
        prev.sub = it.sub
      }
    }
  }
}
