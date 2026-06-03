import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import {
  CAREER_JOBS,
  careerJobDef,
  dailyCareerWage,
  careerPageLabel,
  FIRST_GOAL_TARGET,
  type CareerActionId,
  type CareerJobId,
} from '../../game/Career'
import { Dashboard } from './Dashboard'
import { incomeExpenseBars } from './Charts'

export class CareerPanel {
  readonly root: HTMLElement
  private state: GameState
  private onAction: (actionId: CareerActionId) => void
  private onBecomeEntrepreneur: () => void
  private onTimeSkip: () => void
  private onSelectJob: (jobId: CareerJobId) => void
  private dashboard: Dashboard

  constructor(
    state: GameState,
    onAction: (actionId: CareerActionId) => void,
    onBecomeEntrepreneur: () => void,
    onTimeSkip: () => void = () => {},
    onSelectJob: (jobId: CareerJobId) => void = () => {},
  ) {
    this.state = state
    this.onAction = onAction
    this.onBecomeEntrepreneur = onBecomeEntrepreneur
    this.onTimeSkip = onTimeSkip
    this.onSelectJob = onSelectJob
    this.dashboard = new Dashboard(state)
    this.root = document.createElement('div')
    this.root.className = 'career-panel tab-panel'
    this.root.hidden = true
    this.render()
  }

  render(): void {
    const s = this.state
    const career = s.career
    const job = careerJobDef(career.jobId)
    this.root.replaceChildren()

    // Ana dashboard her zaman üstte (Aşama 2)
    this.dashboard.render()
    this.root.appendChild(this.dashboard.root)

    const pageTitle = careerPageLabel(career.isEntrepreneur, s.totalEarned)

    // Düzeltme 3: İşsiz fallback — jobId yoksa iş seçtir
    if (!career.isEntrepreneur && !career.jobId) {
      this.renderJoblessFallback()
      return
    }

    if (career.isEntrepreneur) {
      this.renderEntrepreneurMode(pageTitle)
      return
    }

    // Kariyer başlığı
    const header = document.createElement('div')
    header.className = 'career-header'
    const titleEl = document.createElement('h2')
    titleEl.className = 'career-title'
    titleEl.textContent = `${job?.emoji ?? '💼'} ${pageTitle}`
    const jobName = document.createElement('p')
    jobName.className = 'career-job-name'
    jobName.textContent = job ? job.name : 'İşsiz'
    header.append(titleEl, jobName)

    // Kariyer stats
    const statsRow = document.createElement('div')
    statsRow.className = 'career-stats-row'

    const wageStat = this.makeStat('💰 Günlük Maaş', job ? formatMoney(dailyCareerWage(career)) : '—')
    const levelStat = this.makeStat('⭐ Kariyer Seviyesi', `${career.level}/10`)
    const stressStat = this.makeStat('😓 Stres', `${Math.round(career.stress)}%`)
    statsRow.append(wageStat, levelStat, stressStat)

    // XP çubuğu
    const xpRow = document.createElement('div')
    xpRow.className = 'career-xp-row'
    const xpLabel = document.createElement('span')
    xpLabel.className = 'career-xp-label'
    const xpPct = career.level >= 10 ? 100 : Math.round((career.xp / career.xpToNext) * 100)
    xpLabel.textContent = career.level >= 10
      ? 'Maksimum seviye'
      : `Deneyim: ${career.xp}/${career.xpToNext} XP`
    const xpBar = document.createElement('div')
    xpBar.className = 'progress-bar career-xp-bar'
    const xpFill = document.createElement('div')
    xpFill.className = 'progress-fill career-xp-fill'
    xpFill.style.width = `${xpPct}%`
    xpBar.appendChild(xpFill)
    xpRow.append(xpLabel, xpBar)

    // Stres çubuğu
    const stressRow = document.createElement('div')
    stressRow.className = 'career-stress-row'
    const stressLabel = document.createElement('span')
    stressLabel.className = 'career-stress-label'
    stressLabel.textContent = `Stres Seviyesi: ${Math.round(career.stress)}%`
    if (career.stress >= 80) stressLabel.textContent += ' ⚠️ Yüksek!'
    const stressBar = document.createElement('div')
    stressBar.className = 'progress-bar career-stress-bar'
    const stressFill = document.createElement('div')
    stressFill.className = `progress-fill career-stress-fill${career.stress >= 70 ? ' stress-high' : career.stress >= 40 ? ' stress-mid' : ''}`
    stressFill.style.width = `${career.stress}%`
    stressBar.appendChild(stressFill)
    stressRow.append(stressLabel, stressBar)

    // İlk hedef
    const goalSection = this.renderFirstGoal()

    // Aksiyon butonları
    const actionsSection = document.createElement('div')
    actionsSection.className = 'career-actions'
    const actionsTitle = document.createElement('h3')
    actionsTitle.className = 'career-actions-title'
    actionsTitle.textContent = 'Bugünkü Aksiyonlar'

    const actionDefs: { id: CareerActionId; label: string; emoji: string; desc: string }[] = [
      { id: 'mesai', label: 'Mesai Yap', emoji: '⏰', desc: `+${Math.floor(dailyCareerWage(career) * 0.3)}₺` },
      { id: 'ek_mesai', label: 'Ek Mesai', emoji: '🌙', desc: `+${Math.floor(dailyCareerWage(career) * 0.5)}₺` },
      { id: 'musteri_bul', label: 'Müşteri Bul', emoji: '🤝', desc: `+${Math.floor(dailyCareerWage(career) * 0.2)}₺` },
      { id: 'satis_kapat', label: 'Satış Kapat', emoji: '🎯', desc: `+${Math.floor(dailyCareerWage(career) * 0.6)}₺` },
      { id: 'egitim_al', label: 'Eğitim Al', emoji: '📚', desc: '+30 XP' },
      { id: 'networking', label: 'Networking', emoji: '🌐', desc: `+${Math.floor(dailyCareerWage(career) * 0.1)}₺` },
    ]

    const actionsGrid = document.createElement('div')
    actionsGrid.className = 'career-actions-grid'
    for (const a of actionDefs) {
      const used = career.actionsUsedToday.includes(a.id) && a.id !== 'egitim_al'
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `career-action-btn${used ? ' used' : ''}`
      btn.disabled = used
      btn.innerHTML =
        `<span class="career-action-emoji">${a.emoji}</span>` +
        `<span class="career-action-label">${a.label}</span>` +
        `<span class="career-action-reward">${a.desc}</span>`
      btn.addEventListener('click', () => this.onAction(a.id))
      actionsGrid.appendChild(btn)
    }
    actionsSection.append(actionsTitle, actionsGrid)

    // Girişimci ol butonu
    const entrepreneurSection = this.renderEntrepreneurButton()

    this.root.append(header, statsRow, xpRow, stressRow, goalSection, actionsSection, entrepreneurSection)
  }

  private makeStat(label: string, value: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'career-stat'
    const l = document.createElement('span')
    l.className = 'career-stat-label'
    l.textContent = label
    const v = document.createElement('strong')
    v.className = 'career-stat-value'
    v.textContent = value
    el.append(l, v)
    return el
  }

  private renderFirstGoal(): HTMLElement {
    const career = this.state.career
    const money = this.state.money
    const section = document.createElement('div')
    section.className = 'career-first-goal'

    if (career.firstGoalComplete) {
      section.innerHTML = `<div class="career-goal-done">✅ İlk hedef tamamlandı! Artık işletme açabilirsin.</div>`
      return section
    }

    const pct = Math.min(100, Math.round((money / FIRST_GOAL_TARGET) * 100))
    const title = document.createElement('p')
    title.className = 'career-goal-title'
    title.textContent = `🎯 İlk Hedef: ${formatMoney(FIRST_GOAL_TARGET)} biriktir`

    const progress = document.createElement('div')
    progress.className = 'career-goal-progress'
    const progressLabel = document.createElement('span')
    progressLabel.textContent = `${formatMoney(money)} / ${formatMoney(FIRST_GOAL_TARGET)} (${pct}%)`
    const bar = document.createElement('div')
    bar.className = 'progress-bar career-goal-bar'
    const fill = document.createElement('div')
    fill.className = 'progress-fill career-goal-fill'
    fill.style.width = `${pct}%`
    bar.appendChild(fill)
    progress.append(progressLabel, bar)

    section.append(title, progress)
    return section
  }

  private renderEntrepreneurButton(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'career-entrepreneur-section'

    const career = this.state.career
    const money = this.state.money
    const canBecomeEntrepreneur = money >= FIRST_GOAL_TARGET || career.firstGoalComplete

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `career-entrepreneur-btn${canBecomeEntrepreneur ? '' : ' locked'}`
    btn.disabled = !canBecomeEntrepreneur
    if (canBecomeEntrepreneur) {
      btn.innerHTML = `<span>🚀 İşten Ayrıl & Girişimci Ol</span><small>Maaşlı işi bırak, kendi işine odaklan</small>`
    } else {
      btn.innerHTML = `<span>🔒 Önce ${formatMoney(FIRST_GOAL_TARGET)} biriktir</span><small>Kariyer geliri + işletmeler ile büyü</small>`
    }
    btn.addEventListener('click', () => {
      if (canBecomeEntrepreneur) this.onBecomeEntrepreneur()
    })
    section.appendChild(btn)
    return section
  }

  /** İşsiz oyuncuya iş seçtir (Düzeltme 3 — eski kayıt/jobId boş) */
  private renderJoblessFallback(): void {
    const wrap = document.createElement('div')
    wrap.className = 'career-jobless'
    const head = document.createElement('div')
    head.className = 'career-jobless-head'
    head.innerHTML = `
      <h2 class="career-title">💼 Henüz bir işin yok</h2>
      <p class="career-job-name">Kariyerine başlamak için ilk işini seç.</p>
    `
    wrap.appendChild(head)

    const grid = document.createElement('div')
    grid.className = 'career-jobless-grid'
    for (const job of CAREER_JOBS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'career-jobless-btn'
      btn.innerHTML =
        `<span class="cj-emoji">${job.emoji}</span>` +
        `<span class="cj-name">${job.name}</span>` +
        `<span class="cj-wage">₺${job.baseDailyWage}/gün</span>` +
        `<span class="cj-desc">${job.description}</span>`
      btn.addEventListener('click', () => this.onSelectJob(job.id))
      grid.appendChild(btn)
    }
    wrap.appendChild(grid)
    this.root.appendChild(wrap)
  }

  private renderEntrepreneurMode(pageTitle: string): void {
    const s = this.state
    const header = document.createElement('div')
    header.className = 'career-header'
    const titleEl = document.createElement('h2')
    titleEl.className = 'career-title'
    titleEl.textContent = `🏢 ${pageTitle}`
    const subEl = document.createElement('p')
    subEl.className = 'career-job-name'
    subEl.textContent = 'İşletmelerini Yönet sayfasından idare edebilirsin.'
    header.append(titleEl, subEl)

    const infoCard = document.createElement('div')
    infoCard.className = 'career-entrepreneur-card'
    infoCard.innerHTML = `
      <div class="career-ent-stat">
        <span>💰 Toplam Kariyer Geliri</span>
        <strong>${formatMoney(s.career.totalWageEarned)}</strong>
      </div>
      <div class="career-ent-stat">
        <span>⭐ Ulaşılan Kariyer Seviyesi</span>
        <strong>${s.career.level}</strong>
      </div>
      <div class="career-ent-tip">
        Artık kariyer değil, işletme yönetimi önceliğin.
        Mağazadan yeni işletmeler aç, büyü!
      </div>
    `

    // Aylık gelir/gider raporu (Aşama 3C)
    const monthlyIncome = Math.floor(s.incomePerDay() * 30)
    const monthlyExpense = s.estimatedMonthlyExpense()
    const net = monthlyIncome - monthlyExpense
    const report = document.createElement('div')
    report.className = 'career-monthly-report'
    report.innerHTML = `
      <h3 class="career-report-title">📊 Aylık Rapor</h3>
      ${incomeExpenseBars(monthlyIncome, monthlyExpense)}
      <div class="career-report-net">
        <span>Net Aylık Kâr</span>
        <strong class="${net >= 0 ? 'ts-pos' : 'ts-neg'}">${net >= 0 ? '+' : ''}${formatMoney(net)}</strong>
      </div>
    `

    const timeSkipBtn = document.createElement('button')
    timeSkipBtn.type = 'button'
    timeSkipBtn.className = 'career-timeskip-btn'
    timeSkipBtn.innerHTML = `<span>⏳ Zamanı İleri Sar</span><small>Çocuk büyüt, varis yetişir, yaşı ilerlet</small>`
    timeSkipBtn.addEventListener('click', () => this.onTimeSkip())

    this.root.append(header, infoCard, report, timeSkipBtn)
  }
}
