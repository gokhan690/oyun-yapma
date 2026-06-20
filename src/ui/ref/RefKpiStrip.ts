export interface KpiItem {
  icon: string
  label: string
  value: string
  sub?: string
  subDir?: 'up' | 'down' | 'muted'
}

interface KpiRefs {
  valueEl: HTMLElement
  subEl: HTMLElement | null
  lastValue: string
  lastSub: string
  lastSubDir: string
}

export class RefKpiStrip {
  readonly el: HTMLElement
  private refs: KpiRefs[] = []

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

    const icon = document.createElement('div')
    icon.className = 'ref-kpi-icon'
    icon.textContent = item.icon

    const label = document.createElement('div')
    label.className = 'ref-kpi-label'
    label.textContent = item.label

    const valueEl = document.createElement('div')
    valueEl.className = 'ref-kpi-value'
    valueEl.textContent = item.value

    card.appendChild(icon)
    card.appendChild(label)
    card.appendChild(valueEl)

    let subEl: HTMLElement | null = null
    if (item.sub) {
      subEl = document.createElement('div')
      const dir = item.subDir ?? 'up'
      subEl.className = `ref-kpi-sub ${dir}`
      const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''
      subEl.textContent = arrow + item.sub
      card.appendChild(subEl)
    }

    this.refs.push({
      valueEl,
      subEl,
      lastValue: item.value,
      lastSub: item.sub ?? '',
      lastSubDir: item.subDir ?? 'up',
    })

    return card
  }

  /** Patch-only update: only touches text nodes that actually changed. */
  update(items: KpiItem[]): void {
    // If count changed (unlikely but safe), rebuild completely
    if (items.length !== this.refs.length) {
      this.el.innerHTML = ''
      this.refs = []
      for (const item of items) this.el.appendChild(this.buildCard(item))
      return
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const ref = this.refs[i]

      if (item.value !== ref.lastValue) {
        ref.valueEl.textContent = item.value
        ref.lastValue = item.value
      }

      const newSub = item.sub ?? ''
      const newDir = item.subDir ?? 'up'

      if (newSub !== ref.lastSub || newDir !== ref.lastSubDir) {
        if (newSub && ref.subEl) {
          ref.subEl.className = `ref-kpi-sub ${newDir}`
          const arrow = newDir === 'up' ? '▲ ' : newDir === 'down' ? '▼ ' : ''
          ref.subEl.textContent = arrow + newSub
        } else if (newSub && !ref.subEl) {
          const subEl = document.createElement('div')
          subEl.className = `ref-kpi-sub ${newDir}`
          const arrow = newDir === 'up' ? '▲ ' : newDir === 'down' ? '▼ ' : ''
          subEl.textContent = arrow + newSub
          ref.valueEl.parentElement!.appendChild(subEl)
          ref.subEl = subEl
        } else if (!newSub && ref.subEl) {
          ref.subEl.remove()
          ref.subEl = null
        }
        ref.lastSub = newSub
        ref.lastSubDir = newDir
      }
    }
  }
}
