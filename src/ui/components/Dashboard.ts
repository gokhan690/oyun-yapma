import type { GameState } from '../../game/GameState'
import { formatMoney, formatIncomeRate } from '../../game/Economy'
import { progressPathSnapshot } from '../../game/ProgressPath'
import { playerGameAge } from '../../game/Dynasty'
import { lineChart, donutChart, gauge, type DonutSegment } from './Charts'

/**
 * Ana ekran dashboard'u (Aşama 2-3).
 * Oyuncu 3 saniyede durumunu anlar: para, net değer, hedef, risk, zaman/aile.
 */
export class Dashboard {
  readonly root: HTMLElement
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'dashboard'
  }

  render(): void {
    this.root.replaceChildren()
    this.root.append(
      this.renderTopBar(),
      this.renderNetWorthCard(),
      this.renderCardGrid(),
    )
  }

  /** Üst bar: nakit, net değer, gelir, yaş */
  private renderTopBar(): HTMLElement {
    const s = this.state
    const bar = document.createElement('div')
    bar.className = 'dash-topbar'
    const age = playerGameAge(s.gameTimeMs, s.dynasty)
    const nw = s.financeNetWorth()
    const cells: { label: string; value: string; cls: string }[] = [
      { label: 'Nakit', value: formatMoney(s.money), cls: 'dash-cell-cash' },
      { label: 'Net Değer', value: formatMoney(nw), cls: 'dash-cell-nw' },
      { label: 'Gelir', value: `${formatIncomeRate(s.incomePerDay())}`, cls: 'dash-cell-income' },
      { label: 'Yaş', value: `${age}`, cls: 'dash-cell-age' },
    ]
    for (const c of cells) {
      const el = document.createElement('div')
      el.className = `dash-cell ${c.cls}`
      el.innerHTML = `<span class="dash-cell-label">${c.label}</span><strong class="dash-cell-value">${c.value}</strong>`
      bar.appendChild(el)
    }
    return bar
  }

  /** Net değer çizgi grafiği kartı */
  private renderNetWorthCard(): HTMLElement {
    const s = this.state
    const card = document.createElement('div')
    card.className = 'dash-card dash-card-networth'
    const hist = s.netWorthHistory.length >= 2 ? s.netWorthHistory : [s.financeNetWorth(), s.financeNetWorth()]
    const first = hist[0] ?? 0
    const last = hist[hist.length - 1] ?? 0
    const delta = last - first
    const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0
    const rising = delta >= 0
    const header = document.createElement('div')
    header.className = 'dash-card-header'
    header.innerHTML = `
      <div>
        <span class="dash-card-title">📈 Net Değer</span>
        <strong class="dash-networth-value">${formatMoney(last)}</strong>
      </div>
      <span class="dash-networth-delta ${rising ? 'up' : 'down'}">
        ${rising ? '▲' : '▼'} ${formatMoney(Math.abs(delta))} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)
      </span>
    `
    const chart = document.createElement('div')
    chart.className = 'dash-chart-wrap'
    chart.innerHTML = lineChart(hist, { height: 100 })
    card.append(header, chart)
    return card
  }

  /** 4 ana kart: gelir kaynakları, sıradaki hedef, risk, zaman/aile */
  private renderCardGrid(): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'dash-grid'
    grid.append(
      this.renderIncomeSourcesCard(),
      this.renderGoalCard(),
      this.renderRiskCard(),
      this.renderTimeFamilyCard(),
    )
    return grid
  }

  private renderIncomeSourcesCard(): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dash-card dash-card-sm'
    const breakdown = this.state.incomeBreakdown()
    const total = breakdown.reduce((s, b) => s + b.value, 0)
    const segments: DonutSegment[] = breakdown.map((b) => ({ label: b.label, value: b.value, color: b.color }))
    card.innerHTML = `<span class="dash-card-title">💰 Gelir Kaynakları</span>`
    if (total <= 0) {
      const empty = document.createElement('p')
      empty.className = 'dash-empty'
      empty.textContent = 'Henüz gelir yok. Kariyer veya işletme ile başla.'
      card.appendChild(empty)
      return card
    }
    const wrap = document.createElement('div')
    wrap.className = 'dash-donut-wrap'
    wrap.innerHTML = donutChart(segments, { size: 96 })
    const legend = document.createElement('div')
    legend.className = 'dash-legend'
    for (const seg of breakdown) {
      const pct = Math.round((seg.value / total) * 100)
      const item = document.createElement('div')
      item.className = 'dash-legend-item'
      item.innerHTML = `<span class="dash-legend-dot dash-dot-${seg.color}"></span><span class="dash-legend-label">${seg.label}</span><span class="dash-legend-pct">%${pct}</span>`
      legend.appendChild(item)
    }
    wrap.appendChild(legend)
    card.appendChild(wrap)
    return card
  }

  private renderGoalCard(): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dash-card dash-card-sm'
    const snap = progressPathSnapshot(this.state.totalEarned, this.state.ipoCount)
    card.innerHTML = `<span class="dash-card-title">🎯 Sıradaki Hedef</span>`
    const body = document.createElement('div')
    body.className = 'dash-goal-body'
    if (snap.nextRank) {
      body.innerHTML = `
        <div class="dash-goal-line">
          <span>${snap.nextEmoji} ${snap.nextRank}</span>
          <span class="dash-goal-remain">${formatMoney(snap.remaining)} kaldı</span>
        </div>
        <div class="chart-progress"><div class="chart-progress-fill" style="width:${snap.rankPct}%;background:var(--accent)"></div></div>
      `
    }
    const ipo = document.createElement('div')
    ipo.className = 'dash-goal-ipo'
    ipo.innerHTML = `
      <div class="dash-goal-line">
        <span>📊 IPO #${snap.ipoCount + 1}</span>
        <span class="dash-goal-remain">%${snap.ipoPct.toFixed(0)}</span>
      </div>
      <div class="chart-progress"><div class="chart-progress-fill chart-progress-glow" style="width:${snap.ipoPct}%;background:#60a5fa;box-shadow:0 0 8px #60a5fa"></div></div>
    `
    body.appendChild(ipo)
    card.appendChild(body)
    return card
  }

  private renderRiskCard(): HTMLElement {
    const s = this.state
    const card = document.createElement('div')
    card.className = 'dash-card dash-card-sm dash-card-risk'
    card.innerHTML = `<span class="dash-card-title">⚠️ Risk Paneli</span>`
    const grid = document.createElement('div')
    grid.className = 'dash-risk-grid'

    const heat = Math.round(s.illegalHeat)
    const stress = Math.round(s.lifestyle.stress ?? 0)

    const heatGauge = document.createElement('div')
    heatGauge.className = 'dash-mini-gauge'
    heatGauge.innerHTML = gauge(heat, { size: 80, label: '🔥 Heat' })
    const stressGauge = document.createElement('div')
    stressGauge.className = 'dash-mini-gauge'
    stressGauge.innerHTML = gauge(stress, {
      size: 80,
      label: '😓 Stres',
      thresholds: [
        { at: 30, color: 'green' },
        { at: 60, color: 'gold' },
        { at: 80, color: 'orange' },
        { at: 100, color: 'red' },
      ],
    })
    grid.append(heatGauge, stressGauge)
    card.appendChild(grid)

    // Borç + rakip uyarı satırı
    const extras: string[] = []
    if (s.bank.loan > 0) extras.push(`💳 Borç: ${formatMoney(s.bank.loan)}`)
    if (heat >= 70) extras.push('🚨 Baskın riski yüksek!')
    if (stress >= 80) extras.push('🏥 Sağlık riski!')
    if (extras.length > 0) {
      const warn = document.createElement('div')
      warn.className = 'dash-risk-warn'
      warn.innerHTML = extras.map((e) => `<span>${e}</span>`).join('')
      card.appendChild(warn)
    }
    return card
  }

  private renderTimeFamilyCard(): HTMLElement {
    const s = this.state
    const card = document.createElement('div')
    card.className = 'dash-card dash-card-sm'
    card.innerHTML = `<span class="dash-card-title">⏳ Zaman & Aile</span>`
    const age = playerGameAge(s.gameTimeMs, s.dynasty)
    const d = s.dynasty
    const childCount = d.children.length
    const heir = d.dynastyBonusId ? d.children.find((c) => c.id === d.dynastyBonusId) : null

    const body = document.createElement('div')
    body.className = 'dash-family-body'

    // Yaşam çizgisi timeline
    const milestones = [
      { age: 25, label: 'Aile' },
      { age: 50, label: 'Miras' },
      { age: 60, label: 'Emeklilik' },
      { age: 70, label: 'Risk' },
    ]
    const timelinePct = Math.min(100, Math.max(0, ((age - 18) / (75 - 18)) * 100))
    const marks = milestones.map((m) => {
      const pct = Math.min(100, Math.max(0, ((m.age - 18) / (75 - 18)) * 100))
      const reached = age >= m.age
      return `<span class="dash-timeline-mark${reached ? ' reached' : ''}" style="left:${pct}%" title="${m.age} yaş: ${m.label}">${m.label}</span>`
    }).join('')

    body.innerHTML = `
      <div class="dash-family-line"><strong>${s.playerName}</strong> · ${age} yaş${d.spouseName ? ' · 💍 Evli' : ''}${childCount > 0 ? ` · 👶 ${childCount}` : ''}</div>
      <div class="dash-timeline">
        <div class="dash-timeline-track"><div class="dash-timeline-fill" style="width:${timelinePct}%"></div></div>
        <div class="dash-timeline-marks">${marks}</div>
      </div>
      ${heir ? `<div class="dash-heir-line">👑 Varis: ${heir.name}</div>` : childCount > 0 ? `<div class="dash-heir-line dash-heir-none">⚠️ Varis seçilmedi</div>` : ''}
    `
    card.appendChild(body)
    return card
  }
}
