import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { sectionTitle, ua, areaChartSvg, donutSvg, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { reputationLabel } from '../../game/Reputation'
import { i18n, fmt } from '../../i18n'
import type { RefDashboardVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { RefNavTab } from './RefBottomNav'
import type { GameState } from '../../game/GameState'
import {
  TASK_DEFS, TASK_SEQUENTIAL_DEPS,
  type DailyPlanState, type DailyTaskId,
  DAILY_BONUS_REPUTATION, dailyCompletionBonusAmount,
  taskLabel, taskDesc,
} from '../../game/DailyPlan'

const DAILY_TASK_NAV_TARGETS: Record<DailyTaskId, RefNavTab> = {
  pick_job: 'career', career_action: 'career',
  buy_firm: 'firms',  upgrade_firm: 'firms',
  visit_career: 'career',
  visit_firms: 'firms', visit_market: 'market',
  visit_empire: 'empire', visit_life: 'life',
  unlock_city: 'empire', upgrade_department: 'empire',
  wellbeing: 'life', life_item: 'life',
  market_action: 'market',
  hire_manager: 'firms',
}

/** Gerçek veri yoksa kullanılan fallback (mock) dashboard. */
function buildMockDashboard(): RefDashboardVM {
  return {
    netWorth: 248_420_000,
    cash: 42_600_000,
    dailyIncome: 26_300_000,
    dailyExpense: 7_600_000,
    reputation: 87,
    reputationLabel: reputationLabel(87),
    firmCount: 12,
    cityCount: 3,
    incomeSources: [
      { label: i18n.t('ref_sector_food'),    value: 38, color: '#F6A609' },
      { label: i18n.t('ref_sector_tech'),    value: 27, color: '#13B8A6' },
      { label: i18n.t('ref_sector_service'), value: 21, color: '#2563EB' },
      { label: i18n.t('ref_sector_illegal'), value: 14, color: '#EA5455' },
    ],
    netWorthTrend: [180, 192, 188, 205, 214, 222, 230, 226, 238, 248],
    goals: [
      { ico: '🏙️', name: 'Dubai Pazarı', pct: 83, metaA: '₺248M / ₺300M' },
      { ico: '🏆', name: 'Borsa Kurdu',   pct: 64, metaA: '₺32M / ₺50M' },
    ],
  }
}

type QuickAct = 'new_firm' | 'open_city' | 'market' | 'achievements'
function buildQuickActions(): { asset: string; label: string; act: QuickAct }[] {
  return [
    { asset: REF_ASSETS_V2_GENERIC.upgrades.franchise,      label: i18n.t('ref_dash_new_firm_button'),     act: 'new_firm' },
    { asset: REF_ASSETS_V2_GENERIC.upgrades.cityExpansion,  label: i18n.t('ref_dash_open_city_button'),    act: 'open_city' },
    { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, label: i18n.t('ref_dash_market_button'),       act: 'market' },
    { asset: REF_ASSETS_V2_GENERIC.achievements.cupGold,    label: i18n.t('ref_dash_achievements_button'), act: 'achievements' },
  ]
}

/* Aktivite akışı — GameState olay geçmişi henüz adapter'a bağlı değil (örnek/önizleme). */
function buildFeed() {
  return [
    { ico: '🏆', txt: i18n.t('ref_dash_no_activity'),  time: '—' },
    { ico: '📈', txt: i18n.t('ref_dash_feed_income'),  time: '—' },
    { ico: '🏙️', txt: i18n.t('ref_dash_feed_market'),  time: '—' },
  ]
}

export class RefDashboardPage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_dash_title') }

  onOpenAchievements?: () => void
  onNavigate?: (tab: RefNavTab) => void
  /** Firms sekmesine git + ilk alınabilir karta kaydır (varsa). */
  onQuickNewFirm?: () => void
  /** Empire sekmesine git + şehir genişleme bölümüne kaydır (varsa). */
  onQuickOpenCity?: () => void

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
    const d = vm ?? buildMockDashboard()
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-dash-page'

    // Hero servet kartı + net değer grafiği
    const repInfo = `${d.reputationLabel} · ${d.reputation}/100`
    const hero = document.createElement('div')
    hero.className = 'ref-dash-hero'
    hero.innerHTML = `
      <div class="ref-dash-hero__lbl">${i18n.t('ref_dash_total_empire_value')}</div>
      <div class="ref-dash-hero__val">${fmtMoney(d.netWorth)}</div>
      <div class="ref-dash-hero__row">
        <span class="ref-dash-hero__chip up">⭐ ${repInfo}</span>
        <span class="ref-dash-hero__chip">${fmt('ref_dash_firms_cities_fmt', { firms: String(d.firmCount), cities: String(d.cityCount) })}</span>
      </div>
      <div class="ref-dash-hero__chart">${areaChartSvg(d.netWorthTrend, '#ffffff', 320, 70)}</div>
      <div class="ref-dash-hero__chart-cap">${i18n.t('ref_dash_income_trend')}</div>
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
        <span class="ref-card-soft__title">${i18n.t('ref_dash_income_sources')}</span>
        <span class="ref-dash-donut__total">${fmtMoney(d.dailyIncome)} ${i18n.t('ref_dash_per_day_unit')}</span>
      </div>
      <div class="ref-dash-donut__body">
        ${donutSvg(d.incomeSources, 96, 17)}
        <div class="ref-donut-legend">
          ${d.incomeSources.map(s => `
            <div class="ref-legend-row">
              <span class="ref-legend-dot" style="background:${s.color}"></span>
              <span class="ref-legend-lbl">${s.label}</span>
              <span class="ref-legend-bar"><span style="width:${Math.min(100, s.value * 2)}%;background:${s.color}"></span></span>
              <span class="ref-legend-val">${fmt('ref_dash_percent_fmt', { value: String(s.value) })}</span>
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
        <div class="ref-card-soft__title">${i18n.t('ref_dash_next_goals')}</div>
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
      <div class="ref-today-item"><span>💰</span><b>${fmtMoney(d.dailyIncome)}</b><small>${i18n.t('ref_dash_daily_income_label')}</small></div>
      <div class="ref-today-item"><span>🏢</span><b>${d.firmCount}</b><small>${i18n.t('ref_dash_active_firms_label')}</small></div>
      <div class="ref-today-item"><span>🏙️</span><b>${d.cityCount}</b><small>${i18n.t('ref_dash_cities_label')}</small></div>
    `
    this.el.appendChild(today)
    const todayBs = today.querySelectorAll<HTMLElement>('.ref-today-item b')
    this.todayIncomeEl = todayBs[0]
    this.todayFirmEl = todayBs[1]
    this.todayCityEl = todayBs[2]

    // Bugünün Hamleleri paneli — title only inside panel (no external sectionTitle)
    this.dailyPanelEl = document.createElement('div')
    this.dailyPanelEl.className = 'ref-daily-panel ref-card-soft'
    this.el.appendChild(this.dailyPanelEl)
    this.el.addEventListener('click', (e) => this.handleDailyClick(e))

    // Risk paneli — GERÇEK itibar + nakit/servet oranından türetilmiş tahmin.
    // Yüksek itibar → düşük baskın riski; düşük nakit tamponu → yüksek likidite riski.
    const raidRisk = Math.max(8, Math.min(58, Math.round(58 - d.reputation * 0.5)))
    const cashRatio = d.netWorth > 0 ? d.cash / d.netWorth : 1
    const liquidityRisk = Math.max(5, Math.min(55, Math.round(55 - cashRatio * 100)))
    const avgRisk = (raidRisk + liquidityRisk) / 2
    const riskBadge = avgRisk < 25 ? { cls: 'ok', txt: i18n.t('ref_dash_low_risk_badge') }
                    : avgRisk < 42 ? { cls: 'warn', txt: i18n.t('ref_dash_medium_risk_badge') }
                    : { cls: 'danger', txt: i18n.t('ref_dash_high_risk_badge') }
    const riskFill = (v: number): string => v < 25 ? 'high' : v < 45 ? 'medium' : 'low'
    const risk = document.createElement('div')
    risk.className = 'ref-risk-panel'
    risk.innerHTML = `
      <div class="ref-risk-panel__head">
        <span>🛡️ ${i18n.t('ref_dash_risk_panel_title')} <span class="ref-est-tag">${i18n.t('ref_dash_estimated_tag')}</span></span>
        <span class="ref-risk-panel__badge ${riskBadge.cls}">${riskBadge.txt}</span>
      </div>
      <div class="ref-risk-bars">
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>${i18n.t('ref_dash_raid_risk_label')}</span><span>${raidRisk}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${riskFill(raidRisk)}" style="width:${raidRisk}%"></div></div>
        </div>
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>${i18n.t('ref_dash_liquidity_risk_label')}</span><span>${liquidityRisk}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${riskFill(liquidityRisk)}" style="width:${liquidityRisk}%"></div></div>
        </div>
      </div>
    `
    this.el.appendChild(risk)

    // Hızlı işlemler (mock — sadece görüntü)
    this.el.appendChild(sectionTitle(i18n.t('ref_dash_quick_actions_title')))
    const quick = document.createElement('div')
    quick.className = 'ref-quick-grid'
    for (const q of buildQuickActions()) {
      const tile = document.createElement('button')
      tile.className = 'ref-quick-tile'
      tile.type = 'button'
      tile.title = q.label
      tile.setAttribute('aria-label', q.label)
      tile.innerHTML = `<img src="${ua(q.asset)}" alt="" class="ref-quick-tile__img"><span>${q.label}</span>`
      tile.addEventListener('click', () => {
        // Gerçek navigasyon — RefApp callback'leri üzerinden (sahte DOM click yok).
        switch (q.act) {
          case 'new_firm':     if (this.onQuickNewFirm) this.onQuickNewFirm(); else this.onNavigate?.('firms'); break
          case 'open_city':    if (this.onQuickOpenCity) this.onQuickOpenCity(); else this.onNavigate?.('empire'); break
          case 'market':       this.onNavigate?.('market'); break
          case 'achievements': this.onOpenAchievements?.(); break
        }
      })
      quick.appendChild(tile)
    }
    this.el.appendChild(quick)

    // Aktivite akışı (örnek — olay geçmişi henüz bağlı değil)
    this.el.appendChild(sectionTitle(i18n.t('ref_dash_recent_activities_title'), i18n.t('ref_dash_sample_tag')))
    const feed = document.createElement('div')
    feed.className = 'ref-feed'
    feed.innerHTML = buildFeed().map(f => `
      <div class="ref-feed-row">
        <span class="ref-feed-ico">${f.ico}</span>
        <span class="ref-feed-txt">${f.txt}</span>
        <span class="ref-feed-time">${f.time}</span>
      </div>
    `).join('')
    this.el.appendChild(feed)

  }

  onShow(): void {
    if (this.state) {
      this.state.ensureDailyPlan()
      this.refreshDailyPanel()
    }
  }

  private kpiItems(d: RefDashboardVM): KpiItem[] {
    return [
      { icon: '💎', label: i18n.t('ref_dash_net_worth_label'), value: fmtMoney(d.netWorth), sub: i18n.t('ref_dash_net_worth_sub'), subDir: 'muted' },
      { icon: '💵', label: i18n.t('ref_dash_cash_label'),      value: fmtMoney(d.cash),     sub: i18n.t('ref_dash_cash_sub'),      subDir: 'muted' },
      { icon: '📈', label: i18n.t('ref_dash_total_daily_income_label'), value: fmtMoney(d.dailyIncome), sub: i18n.t('ref_dash_income_sub'), subDir: 'up' },
      { icon: '⭐', label: i18n.t('ref_dash_reputation_label'), value: String(d.reputation), sub: d.reputationLabel, subDir: 'muted' },
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
      { icon: '💎', label: i18n.t('ref_dash_net_worth_label'), value: fmtMoney(netWorth), sub: i18n.t('ref_dash_net_worth_sub'), subDir: 'muted' },
      { icon: '💵', label: i18n.t('ref_dash_cash_label'),      value: fmtMoney(cash),     sub: i18n.t('ref_dash_cash_sub'),      subDir: 'muted' },
      { icon: '📈', label: i18n.t('ref_dash_total_daily_income_label'), value: fmtMoney(income), sub: i18n.t('ref_dash_income_sub'), subDir: 'up' },
      { icon: '⭐', label: i18n.t('ref_dash_reputation_label'), value: String(reputation), sub: reputationLabel(reputation), subDir: 'muted' },
    ])
    if (this.heroValEl)    this.heroValEl.textContent = fmtMoney(netWorth)
    if (this.heroMetaEl)   this.heroMetaEl.textContent = fmt('ref_dash_firms_cities_fmt', { firms: String(firmCount), cities: String(cityCount) })
    if (this.donutTotalEl) this.donutTotalEl.textContent = `${fmtMoney(income)} ${i18n.t('ref_dash_per_day_unit')}`
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
    if (!plan) return `<div class="ref-daily-empty">${i18n.t('ref_dash_loading_ellipsis')}</div>`

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
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>${i18n.t('ref_daily_btn_claimed')}</button>`
      } else if (uiState === 'ready_to_claim') {
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--claim" data-action="daily-claim:${taskId}">${fmt('ref_daily_claim_reward_fmt', { reward: String(def.reward) })}</button>`
      } else {
        const navTarget = DAILY_TASK_NAV_TARGETS[taskId]
        btnHtml = `<button class="ref-btn ref-daily-btn ref-daily-btn--go" data-action="daily-go:${navTarget}">${i18n.t('ref_daily_go_button')}</button>`
      }

      const prereqDef = TASK_DEFS.find(d => d.id === TASK_SEQUENTIAL_DEPS[taskId])
      const blockedNote = uiState === 'blocked_by_previous'
        ? `<div class="ref-daily-task-blocked">${i18n.t('ref_daily_blocked_prefix')} ${prereqDef ? taskLabel(prereqDef) : ''}</div>`
        : ''

      return `
        <div class="ref-daily-task-row ref-daily-task-row--${uiState}">
          <span class="ref-daily-task-icon">${uiState === 'claimed' ? '✅' : def.icon}</span>
          <div class="ref-daily-task-info">
            <div class="ref-daily-task-name">${taskLabel(def)}</div>
            <div class="ref-daily-task-desc">${taskDesc(def)}</div>
            ${blockedNote}
          </div>
          <div class="ref-daily-task-action">${btnHtml}</div>
        </div>`
    }).join('')

    const allClaimed = plan.taskIds.every(id => plan.claimed.includes(id))
    const bonusAmt = dailyCompletionBonusAmount(plan.taskIds)
    const bonusHtml = `
      <div class="ref-daily-bonus-row">
        <span class="ref-daily-bonus-label"><b>${fmt('ref_daily_bonus_all_fmt', { amount: String(bonusAmt), rep: String(DAILY_BONUS_REPUTATION) })}</b></span>
        ${allClaimed
          ? plan.completionBonusClaimed
            ? `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>${i18n.t('ref_daily_bonus_claimed_btn')}</button>`
            : `<button class="ref-btn ref-daily-btn ref-daily-btn--claim" data-action="daily-bonus">${i18n.t('ref_daily_bonus_action_btn')}</button>`
          : `<button class="ref-btn ref-daily-btn ref-daily-btn--done" disabled>${doneCount}/4</button>`
        }
      </div>`

    return `
      <div class="ref-daily-header">
        <span class="ref-card-soft__title">${i18n.t('ref_daily_today_moves_title')}</span>
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
