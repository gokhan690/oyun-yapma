export interface KpiItem {
  icon: string
  label: string
  value: string
  sub?: string
  subDir?: 'up' | 'down' | 'muted'
}

export class RefKpiStrip {
  readonly el: HTMLElement

  constructor(items: KpiItem[]) {
    this.el = document.createElement('div')
    this.el.className = 'ref-kpi-strip'
    for (const item of items) {
      this.el.appendChild(this.buildCard(item))
    }
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
    return card
  }

  update(items: KpiItem[]): void {
    this.el.innerHTML = ''
    for (const item of items) this.el.appendChild(this.buildCard(item))
  }
}
