import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { sectionTitle, ua, areaChartSvg, donutSvg, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { reputationLabel } from '../../game/Reputation'
import type { RefDashboardVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { RefNavTab } from './RefBottomNav'
import type { GameState } from '../../game/GameState'
import {
  TASK_DEFS, TASK_SEQUENTIAL_DEPS,
  type DailyPlanState, type DailyTaskId,
  DAILY_BONUS_AMOUNT, DAILY_BONUS_REPUTATION,
} from '../../game/DailyPlan'

const DAILY_TASK_NAV_TARGETS: Record<DailyTaskId, RefNavTab> = {
  pick_job: 'career', career_action: 'career',
  buy_firm: 'firms',  upgrade_firm: 'firms',
  visit_firms: 'firms', visit_market: 'market',
  visit_empire: 'empire', visit_life: 'life',
  unlock_city: 'empire', upgrade_department: 'empire',
  wellbeing: 'life', life_item: 'life',
}

/** Gerçek veri yoksa kullanılan fallback (mock) dashboard. */
const MOCK_DASHBOARD: RefDashboardVM = {
  netWorth: 248_420_000,
  cash: 42_600_000,
  dailyIncome: 26_300_000,
  dailyExpense: 7_600_000,
  reputation: 87,
  reputationLabel: 'Saygın',
  firmCount: 12,
  cityCount: 3,
  incomeSources: [
    { label: 'Gıda',      value: 38, color: '#F6A609' },
    { label: 'Teknoloji', value: 27, color: '#13B8A6' },
    { label: 'Hizmet',    value: 21, color: '#2563EB' },
    { label: 'Yasadışı',  value: 14, color: '#EA5455' },
  ],
  netWorthTrend: [180, 192, 188, 205, 214, 222, 230, 226, 238, 248],
  goals: [
    { ico: '🏙️', name: 'Dubai Pazarı', pct: 83, metaA: '₺248M / ₺300M' },
    { ico: '🏆', name: 'Borsa Kurdu',   pct: 64, metaA: '₺32M / ₺50M' },
  ],
}

const QUICK = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.franchise,      label: 'Yeni Firma' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.cityExpansion,  label: 'Şehir Aç' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, label: 'Piyasa' },
  { asset: REF_ASSETS_V2_GENERIC.achievements.cupGold,    label: 'Başarılar' },
]

/* Aktivite akışı — GameState olay geçmişi henüz adapter'a bağlı değil (örnek/önizleme). */
const FEED = [
  { ico: '🏆', txt: 'Başarı kilidi açıldığında burada görünür.', time: '—' },
  { ico: '📈', txt: 'Firma gelir değişimleri burada listelenir.', time: '—' },
  { ico: '🏙️', txt: 'Yeni pazar/şehir fırsatları burada belirir.', time: '—' },
]

export class RefDashboardPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'ANA PANEL'

  onOpenAchievements?: () => void
  onNavigate?: (tab: RefNavTab) => void

  private kpi!: RefKpiStrip
  private heroValEl?: HTMLElement
  private heroMetaEl?: HTMLElement
  private donutTotalEl?: HTMLElement
  private todayIncomeEl?: HTMLElement
  private todayFirmEl?: HTMLElement
  private todayCityEl?: HTMLElement
  private state?: GameState
  private dailyPanelEl: HTMLElement | null = null
  private lastDailyPanelSig = ''

  constructor(vm?: RefDashboardVM, state?: GameState) {
    this.state = state
    const d = vm ?? MOCK_DASHBOARD
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-dash-page'

    // Hero servet kartı + net değer grafiği
    const repInfo = `${d.reputationLabel} · ${d.reputation}/100`
    const hero = document.createElement('div')
    hero.className = 'ref-dash-hero'
    hero.innerHTML = `
      <div class="ref-dash-hero__lbl">Toplam İmparatorluk Değeri</div>
      <div class="ref-dash-hero__val">${fmtMoney(d.netWorth)}</div>
      <div class="ref-dash-hero__row">
        <span class="ref-dash-hero__chip up">⭐ ${repInfo}</span>
        <span class="ref-dash-hero__chip">${d.firmCount} firma · ${d.cityCount} şehir</span>
      </div>
      <div class="ref-dash-hero__chart">${areaChartSvg(d.netWorthTrend, '#ffffff', 320, 70)}</div>
      <div class="ref-dash-hero__chart-cap">Son 10 gün · tahmini eğri</div>
    `
    this.el.appendChild(hero)
    this.heroValEl = hero.querySelector<HTMLElement>('.ref-dash-hero__val') ?? undefined
    this.heroMetaEl = hero.querySelector<HTMLElement>('.ref-dash-hero__chip:not(.up)') ?? undefined

    // KPI strip (gerçek değerler — canlı tazelenir)
    this.kpi = new RefKpiStrip(this.kpiItems(d))
    this.el.appendChild(this.kpi.el)

    // Gelir kaynakları (donut tam genişlik, dengeli legend + toplam)
    const donutCard = document.createElement('div')
    donutCard.className = 'ref-card-soft ref-dash-donut'
    donutCard.style.margin = '8px 14px 0'
    donutCard.innerHTML = `
      <div class="ref-card-soft__title-row">
        <span class="ref-card-soft__title">Gelir Kaynakları</span>
        <span class="ref-dash-donut__total">${fmtMoney(d.dailyIncome)} / gün</span>
      </div>
      <div class="ref-dash-donut__body">
        ${donutSvg(d.incomeSources, 96, 17)}
        <div class="ref-donut-legend">
          ${d.incomeSources.map(s => `
            <div class="ref-legend-row">
              <span class="ref-legend-dot" style="background:${s.color}"></span>
              <span class="ref-legend-lbl">${s.label}</span>
              <span class="ref-legend-bar"><span style="width:${Math.min(100, s.value * 2)}%;background:${s.color}"></span></span>
              <span class="ref-legend-val">%${s.value}</span>
            </div>`).join('')}
        </div>
      </div>
    `
    this.el.appendChild(donutCard)
    this.donutTotalEl = donutCard.querySelector<HTMLElement>('.ref-dash-donut__total') ?? undefined

    // Sıradaki hedefler (gerçek ilerleme)
    if (d.goals.length) {
      const goal = document.createElement('div')
      goal.className = 'ref-card-soft ref-dash-goal'
      goal.style.margin = '10px 14px 0'
      goal.innerHTML = `
        <div class="ref-card-soft__title">Sıradaki Hedefler</div>
        ${d.goals.map((g) => `
          <div class="ref-goal-item">
            <div class="ref-goal-head"><span class="ref-goal-name">${g.ico} ${g.name}</span><span class="ref-goal-pct">%${g.pct}</span></div>
            <div class="ref-perf-track"><div class="ref-perf-fill ${g.pct >= 70 ? 'high' : 'medium'}" style="width:${g.pct}%"></div></div>
            <div class="ref-goal-meta">${g.metaA}</div>
          </div>`).join('')}
      `
      this.el.appendChild(goal)
    }

    // Bugünkü özet
    const today = document.createElement('div')
    today.className = 'ref-today-strip'
    today.innerHTML = `
      <div class="ref-today-item"><span>💰</span><b>${fmtMoney(d.dailyIncome)}</b><small>Günlük gelir</small></div>
      <div class="ref-today-item"><span>🏢</span><b>${d.firmCount}</b><small>Aktif firma</small></div>
      <div class="ref-today-item"><span>🏙️</span><b>${d.cityCount}</b><small>Şehir</small></div>
    `
    this.el.appendChild(today)
    const todayBs = today.querySelectorAll<HTMLElement>('.ref-today-item b')
    this.todayIncomeEl = todayBs[0]
    this.todayFirmEl = todayBs[1]
    this.todayCityEl = todayBs[2]

    // Risk paneli — GERÇEK itibar + nakit/servet oranından türetilmiş tahmin.
    // Yüksek itibar → düşük baskın riski; düşük nakit tamponu → yüksek likidite riski.
    const raidRisk = Math.max(8, Math.min(58, Math.round(58 - d.reputation * 0.5)))
    const cashRatio = d.netWorth > 0 ? d.cash / d.netWorth : 1
    const liquidityRisk = Math.max(5, Math.min(55, Math.round(55 - cashRatio * 100)))
    const avgRisk = (raidRisk + liquidityRisk) / 2
    const riskBadge = avgRisk < 25 ? { cls: 'ok', txt: 'Düşük Risk' }
                    : avgRisk < 42 ? { cls: 'warn', txt: 'Orta Risk' }
                    : { cls: 'danger', txt: 'Yüksek Risk' }
    const riskFill = (v: number): string => v < 25 ? 'high' : v < 45 ? 'medium' : 'low'
    const risk = document.createElement('div')
    risk.className = 'ref-risk-panel'
    risk.innerHTML = `
      <div class="ref-risk-panel__head">
        <span>🛡️ Risk Paneli <span class="ref-est-tag">tahmini</span></span>
        <span class="ref-risk-panel__badge ${riskBadge.cls}">${riskBadge.txt}</span>
      </div>
      <div class="ref-risk-bars">
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>Baskın Riski</span><span>${raidRisk}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${riskFill(raidRisk)}" style="width:${raidRisk}%"></div></div>
        </div>
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>Likidite Riski</span><span>${liquidityRisk}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${riskFill(liquidityRisk)}" style="width:${liquidityRisk}%"></div></div>
        </div>
      </div>
    `
    this.el.appendChild(risk)

    // Hızlı işlemler (mock — sadece görüntü)
    this.el.appendChild(sectionTitle('Hızlı İşlemler'))
    const quick = document.createElement('div')
    quick.className = 'ref-quick-grid'
    for (const q of QUICK) {
      const tile = document.createElement('button')
      tile.className = 'ref-quick-tile'
      tile.innerHTML = `<img src="${ua(q.asset)}" alt="" class="ref-quick-tile__img"><span>${q.label}</span>`
      if (q.label === 'Başarılar') tile.addEventListener('click', () => this.onOpenAchievements?.())
      quick.appendChild(tile)
    }
    this.el.appendChild(quick)

    // Aktivite akışı (örnek — olay geçmişi henüz bağlı değil)
    this.el.appendChild(sectionTitle('Son Aktiviteler', 'örnek'))
    const feed = document.createElement('div')
    feed.className = 'ref-feed'
    feed.innerHTML = FEED.map(f => `
      <div class="ref-feed-row">
        <span class="ref-feed-ico">${f.ico}</span>
        <span class="ref-feed-txt">${f.txt}</span>
        <span class="ref-feed-time">${f.time}</span>
      </div>
    `).join('')
    this.el.appendChild(feed)

    // Bugünün Hamleleri paneli
    this.el.appendChild(sectionTitle('Bugünün Hamleleri'))
    this.dailyPanelEl = document.createElement('div')
    this.dailyPanelEl.className = 'ref-daily-panel ref-card-soft'
    this.el.appendChild(this.dailyPanelEl)
    this.el.addEventListener('click', (e) => this.handleDailyClick(e))
  }

  onShow(): void {
    if (this.state) {
      this.state.ensureDailyPlan()
      this.refreshDailyPanel()
    }
  }

  private kpiItems(d: RefDashboardVM): KpiItem[] {
    return [
      { icon: '💎', label: 'Net Servet',   value: fmtMoney(d.netWorth), sub: 'Toplam', subDir: 'muted' },
      { icon: '💵', label: 'Nakit',        value: fmtMoney(d.cash),     sub: 'Likit',  subDir: 'muted' },
      { icon: '📈', label: 'Toplam Günlük Gelir', value: fmtMoney(d.dailyIncome), sub: 'Tüm kaynaklardan', subDir: 'up' },
      { icon: '⭐', label: 'İtibar',        value: String(d.reputation), sub: d.reputationLabel, subDir: 'muted' },
    ]
  }

  /** Canlı GameState'ten para/servet/gelir/itibar değerlerini DOM kurmadan tazeler. */
  refresh(state: GameState): void {
    this.state = state
    const netWorth   = Math.round(state.financeNetWorth())
    const cash       = Math.round(state.money)
    const income     = Math.round(state.incomePerDay())
    const reputation = Math.round(state.reputation)
    const firmCount  = Object.values(state.producers).filter((c) => c > 0).length
    const cityCount  = state.cities?.unlocked.length ?? 0

    this.kpi.update([
      { icon: '💎', label: 'Net Servet',   value: fmtMoney(netWorth), sub: 'Toplam', subDir: 'muted' },
      { icon: '💵', label: 'Nakit',        value: fmtMoney(cash),     sub: 'Likit',  subDir: 'muted' },
      { icon: '📈', label: 'Toplam Günlük Gelir', value: fmtMoney(income), sub: 'Tüm kaynaklardan', subDir: 'up' },
      { icon: '⭐', label: 'İtibar',        value: String(reputation), sub: reputationLabel(reputation), subDir: 'muted' },
    ])
    if (this.heroValEl)    this.heroValEl.textContent = fmtMoney(netWorth)
    if (this.heroMetaEl)   this.heroMetaEl.textContent = `${firmCount} firma · ${cityCount} şehir`
    if (this.donutTotalEl) this.donutTotalEl.textContent = `${fmtMoney(income)} / gün`
    if (this.todayIncomeEl) this.todayIncomeEl.textContent = fmtMoney(income)
    if (this.todayFirmEl)   this.todayFirmEl.textContent = String(firmCount)
    if (this.todayCityEl)   this.todayCityEl.textContent = String(cityCount)
    state.ensureDailyPlan()
    this.refreshDailyPanel()
  }

  // ── Günlük Plan panel ──────────────────────────────────────────────────────

  private computeDailySig(plan: DailyPlanState | null): string {
    if (!plan) return 'null'
    return [
      plan.dayKey,
      plan.taskIds.join(','),
      plan.taskIds.map(id => plan.progress[id] ?? 0).join(','),
      plan.claimed.join(','),
      plan.completionBonusClaimed ? '1' : '0',
    ].join('|')
  }

  private refreshDailyPanel(): void {
    if (!this.dailyPanelEl || !this.state) return
    const plan = this.state.dailyPlan
    const sig = this.computeDailySig(plan)
    if (sig === this.lastDailyPanelSig) return
    this.lastDailyPanelSig = sig
    this.dailyPanelEl.innerHTML = this.buildDailyPanelHtml(plan)
  }

  private buildDailyPanelHtml(plan: DailyPlanState | null): string {
    if (!plan) return '<div class="ref-daily-empty">Yükleniyor…</div>'

    const getTaskUIState = (taskId: DailyTaskId) => {
      if (plan.claimed.includes(taskId)) return 'claimed'
      const prereqId = TASK_SEQUENTIAL_DEPS[taskId]
      if (prereqId && plan.taskIds.includes(prereqId)) {
        const prereqDef = TASK_DEFS.find(d => d.id === prereqId)!
        if ((plan.progress[prereqId] ?? 0) < prereqDef.target) return 'blocked_by_previous'
      }
      const def = TASK_DEFS.find(d => d.id === taskId)!
      return (plan.progress[taskId] ?? 0) >= def.target ? 'ready_to_claim' : 'in_progress'
    }

    const doneCount = plan.taskIds.filter(id => {
      const s = getTaskUIState(id)
      return s === 'ready_to_claim' || s === 'claimed'
    }).length

    const taskRows = plan.taskIds.map(taskId => {
      const def = TASK_DEFS.find(d => d.id === taskId)!
      const uiState = getTaskUIState(taskId)

      let btnHtml = ''
      if (uiState === 'claimed') {
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>ALINDI</button>`
      } else if (uiState === 'ready_to_claim') {
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--claim" data-action="daily-claim:${taskId}">ÖDÜLÜ AL ₺${def.reward}</button>`
      } else {
        const navTarget = DAILY_TASK_NAV_TARGETS[taskId]
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--go" data-action="daily-go:${navTarget}" ${uiState === 'blocked_by_previous' ? 'disabled' : ''}>GİT →</button>`
      }

      const blockedNote = uiState === 'blocked_by_previous'
        ? `<div class="ref-daily-task-blocked">Önce: ${TASK_DEFS.find(d => d.id === TASK_SEQUENTIAL_DEPS[taskId])?.label}</div>`
        : ''

      return `
        <div class="ref-daily-task-row ref-daily-task-row--${uiState}">
          <span class="ref-daily-task-icon">${uiState === 'claimed' ? '✅' : def.icon}</span>
          <div class="ref-daily-task-info">
            <div class="ref-daily-task-name">${def.label}</div>
            <div class="ref-daily-task-desc">${def.desc}</div>
            ${blockedNote}
          </div>
          <div class="ref-daily-task-action">${btnHtml}</div>
        </div>`
    }).join('')

    const allClaimed = plan.taskIds.every(id => plan.claimed.includes(id))
    const bonusHtml = `
      <div class="ref-daily-bonus-row">
        <span class="ref-daily-bonus-label">Tümünü tamamla: <b>+₺${DAILY_BONUS_AMOUNT} + ${DAILY_BONUS_REPUTATION} İtibar</b></span>
        ${allClaimed
          ? plan.completionBonusClaimed
            ? `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>BONUS ALINDI</button>`
            : `<button class="ref-btn ref-daily-btn ref-daily-btn--claim" data-action="daily-bonus">GÜNLÜK BONUS</button>`
          : `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>${doneCount}/4</button>`
        }
      </div>`

    return `
      <div class="ref-daily-header">
        <span class="ref-card-soft__title">Bugünün Hamleleri</span>
        <span class="ref-daily-counter">${doneCount}/4</span>
      </div>
      ${taskRows}
      ${bonusHtml}`
  }

  private handleDailyClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!target || !this.state) return
    const action = target.dataset.action ?? ''
    if (action === 'daily-bonus') {
      this.state.claimDailyCompletionBonus()
    } else if (action.startsWith('daily-claim:')) {
      const taskId = action.slice('daily-claim:'.length) as DailyTaskId
      this.state.claimDailyTask(taskId)
    } else if (action.startsWith('daily-go:')) {
      const tab = action.slice('daily-go:'.length) as RefNavTab
      this.onNavigate?.(tab)
    }
  }
}
