import { sectionTitle, fmtMoney, refToast } from './refShared'
import { i18n, fmt, requiredDomainText } from '../../i18n'
import { RefSubTabs } from './RefSubTabs'
import type { RefCareerVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { DiseaseId } from '../../game/Diseases'
import { FAME_CAREERS, fameLevelLabel, fameCareerName, fameActionLabel } from '../../game/Fame'
import type { FameCareerType } from '../../game/Fame'
import { diseaseDef, diseaseName } from '../../game/Diseases'
import { PLAYER_RANKS, rankProgress, rankName } from '../../game/PlayerRank'
import { JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS, profileJobLabel, educationLabel, lifestyleLabel } from '../../game/CharacterProfile'
import {
  CAREER_JOBS, BINDABLE_CAREER_ACTION_IDS, careerJobDef, careerActionPreview, careerJobName, careerJobDesc,
  dailyCareerWage, backgroundDef, careerBgName, careerBgBonus,
  type CareerJobId, type CareerActionId, type CareerJobChangeResult, type MissingCareerRequirement,
} from '../../game/Career'
import { WELLBEING_ACTIVITIES, wellbeingName, type WellbeingActivityId } from '../../game/Lifestyle'
import { PRODUCERS, producerName } from '../../game/Economy'

/** Kariyer aksiyon butonlarının etiket/emoji/açıklaması. */
function buildCareerActionMeta(): Record<string, { emoji: string; label: string; desc: string }> {
  return {
    mesai:      { emoji: '🕘', label: i18n.t('ref_career_action_mesai_label'),      desc: i18n.t('ref_career_action_mesai_desc') },
    ek_mesai:   { emoji: '🌙', label: i18n.t('ref_career_action_ek_mesai_label'),   desc: i18n.t('ref_career_action_ek_mesai_desc') },
    egitim_al:  { emoji: '📚', label: i18n.t('ref_career_action_egitim_al_label'),  desc: i18n.t('ref_career_action_egitim_al_desc') },
    networking: { emoji: '🤝', label: i18n.t('ref_career_action_networking_label'), desc: i18n.t('ref_career_action_networking_desc') },
  }
}

/**
 * Şöhret (Fame) sekmesi/paneli production UI'da şimdilik GİZLİ. Fame sistemi,
 * FameState, save migration, gelir hesapları ve mevcut veri KORUNUR — yalnız
 * görünürlük kapalı. İleride tek noktadan açmak için bu sabiti true yap.
 */
const FAME_UI_ENABLED = false

/** Kariyer Sağlık sekmesinde bağlanan günlük rutin aksiyonları. */
const ROUTINE_META: { id: 'exercise' | 'meditate'; emoji: string; labelKey: string; effectKey: string }[] = [
  { id: 'exercise', emoji: '🏃', labelKey: 'career_routine_exercise_label', effectKey: 'career_routine_exercise_effect' },
  { id: 'meditate', emoji: '🧘', labelKey: 'career_routine_meditate_label', effectKey: 'career_routine_meditate_effect' },
]

/** Kariyer Sağlık sekmesinde gösterilen stres tedavileri (yalnız bu ikisi). */
const CAREER_WELLBEING_IDS: WellbeingActivityId[] = ['terapi', 'meditasyon']

/**
 * TUR15-C2 — careerPath id → i18n key ("yol" chip'i, iş kartında). Career.ts'teki
 * 6 sabit careerPath id'siyle eşleşir; unlock mantığını etkilemez, salt görünüm.
 */
const CAREER_PATH_LABEL_KEY: Record<string, string> = {
  lojistik: 'career_path_lojistik',
  gida: 'career_path_gida',
  satis: 'career_path_satis',
  teknoloji: 'career_path_teknoloji',
  finans: 'career_path_finans',
  siyaset: 'career_path_siyaset',
}

function buildMockCareer(): RefCareerVM {
  return {
    jobTitle: i18n.t('ref_career_mock_job_title'), level: 24, salaryDaily: 48_000, stress: 48,
    xpPct: 64, xpText: '₺248M / ₺1Mr', nextRank: i18n.t('ref_career_mock_next_rank'), seniorityYears: 6,
    health: 72, healthLabel: i18n.t('ref_health_good'), diseases: [], fame: 0, fameLabel: fameLevelLabel(0),
    fameCareerName: null, fameCareerType: null, fameIsActive: false, karma: 0, siblingCount: 0,
  }
}

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_career_title') }

  private tabs: RefSubTabs
  private jobCard!: HTMLElement
  private profileCard!: HTMLElement
  private vm: RefCareerVM
  private state?: GameState
  private onPersist?: () => void
  private lastDynSig = ''
  private lastJobSig = ''

  constructor(vm?: RefCareerVM, state?: GameState, onPersist?: () => void) {
    this.state = state
    this.onPersist = onPersist
    this.vm = vm ?? buildMockCareer()
    if (state) this.vm = this.buildVMFromState(state)

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    const tabDefs = [
      { id: 'job',    label: i18n.t('ref_career_tab_job'),    icon: '💼' },
      { id: 'health', label: i18n.t('ref_career_tab_health'), icon: '❤️' },
    ]
    if (FAME_UI_ENABLED) tabDefs.push({ id: 'fame', label: i18n.t('ref_career_tab_fame'), icon: '⭐' })
    this.tabs = new RefSubTabs(tabDefs)
    this.el.appendChild(this.tabs.tabsEl)
    const secJob = this.tabs.section('job')
    this.el.appendChild(secJob)
    this.el.appendChild(this.tabs.section('health'))
    if (FAME_UI_ENABLED) this.el.appendChild(this.tabs.section('fame'))

    this.jobCard = document.createElement('div')
    this.jobCard.className = 'ref-job-card'
    this.jobCard.innerHTML = this.jobCardHtml(this.vm)
    secJob.appendChild(this.jobCard)

    // Karakter profili (onboarding seçimleri) — İş sekmesinde
    this.profileCard = document.createElement('div')
    this.profileCard.className = 'ref-career-profile'
    this.profileCard.innerHTML = this.profileHtml()
    secJob.appendChild(this.profileCard)

    this.renderDyn(this.vm)
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /** Onboarding'de seçilen meslek/eğitim/yaşam tarzı/background çipleri. */
  private profileHtml(): string {
    const p = this.state?.characterProfile
    if (!p) return ''
    const job = JOB_DEFS[p.jobId]
    const edu = EDUCATION_DEFS[p.educationLevel]
    const life = LIFESTYLE_DEFS[p.lifestyleType]
    const bg = backgroundDef(p.backgroundId)
    const bgChip = bg
      ? `<span class="ref-member-chip">${bg.emoji} ${careerBgName(bg)} · ${careerBgBonus(bg)}</span>`
      : ''
    return `
      <div class="ref-career-profile__title">${i18n.t('ref_career_profile_section_title')}</div>
      <div class="ref-career-profile__chips">
        <span class="ref-member-chip">${job.emoji} ${profileJobLabel(p.jobId)}${job.incomeDailyBonus > 0 ? ` · +${fmtMoney(job.incomeDailyBonus)}/g` : ''}</span>
        <span class="ref-member-chip">${edu.emoji} ${educationLabel(p.educationLevel)}</span>
        <span class="ref-member-chip">${life.emoji} ${lifestyleLabel(p.lifestyleType)} ${i18n.t('ref_career_lifestyle_suffix')}</span>
        ${bgChip}
      </div>`
  }

  private jobCardHtml(c: RefCareerVM): string {
    const career = this.state?.career
    const isEntrepreneur = !!career?.isEntrepreneur
    const hasJob = !!career?.jobId && !isEntrepreneur
    const isUnemployed = !!this.state && !career?.jobId && !isEntrepreneur

    const rankColor = isEntrepreneur ? '#7c3aed' : hasJob ? '#0369a1' : '#475569'

    // Ana başlık / alt yazı / sağ-üst badge = oyuncunun GERÇEK durumu (PlayerRank değil).
    let mainTitle: string
    let mainSub: string
    let badge: string
    if (!this.state) {
      mainTitle = c.jobTitle
      mainSub = `${i18n.t('ref_career_level_label')} ${c.level} · ${fmt('ref_career_seniority_fmt', { years: String(c.seniorityYears) })}`
      badge = `LVL ${c.level}`
    } else if (isEntrepreneur) {
      mainTitle = '🚀 ' + i18n.t('ref_career_entrepreneur_title')
      mainSub = i18n.t('ref_career_entrepreneur_income')
      badge = i18n.t('ref_career_entrepreneur_title')
    } else if (!career?.jobId) {
      mainTitle = '🔍 ' + i18n.t('ref_career_unemployed_title')
      mainSub = i18n.t('ref_career_no_job_subtitle')
      badge = i18n.t('ref_career_starter_label')
    } else {
      const jobDef = careerJobDef(career.jobId)
      mainTitle = `${jobDef?.emoji ?? '💼'} ${jobDef ? careerJobName(jobDef) : ''}`
      mainSub = `${i18n.t('ref_career_working_employee_label')} · ${i18n.t('ref_career_level_label')} ${career.level} · ${fmt('ref_career_seniority_fmt', { years: String(c.seniorityYears) })}`
      badge = fmt('ref_career_job_level_fmt', { level: String(career.level) })
    }

    const banner = `
      <div class="ref-job-card__banner" style="background:linear-gradient(135deg,${rankColor}22,${rankColor}08)">
        <div class="ref-job-card__banner-left">
          <div class="ref-job-card__title">${mainTitle}</div>
          <div class="ref-job-card__company">${mainSub}</div>
        </div>
        <div class="ref-job-card__lvl-pill" style="background:${rankColor}">${badge}</div>
      </div>`

    // Girişimci modu: maaş/rütbe/XP yerine firma odaklı panel.
    if (isEntrepreneur) {
      return banner + this.buildEntrepreneurPanel()
    }

    // İşsizken net yönlendirme: iş seç → 3 aksiyon → ilk firma.
    const guidance = isUnemployed
      ? `<div class="ref-career-guidance">🧭 ${i18n.t('ref_career_unemployed_guidance')}</div>`
      : ''

    // 3. stat hücresi: işsizken rütbe yerine nötr yönlendirme.
    const thirdStat = isUnemployed
      ? `<span class="ref-job-stat__lbl">🎯 ${i18n.t('ref_career_starter_label')}</span>
         <span class="ref-job-stat__val">${i18n.t('ref_career_pick_first_job')}</span>`
      : `<span class="ref-job-stat__lbl">🏆 ${i18n.t('ref_career_next_rank_label')}</span>
         <span class="ref-job-stat__val">${c.nextRank}</span>`

    return banner + guidance + `
      <div class="ref-job-stats">
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">💰 ${i18n.t('ref_career_daily_income_label')}</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily)}</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">📅 ${i18n.t('ref_career_monthly_income_label')}</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily * 30)}</span>
        </div>
        <div class="ref-job-stat">
          ${thirdStat}
        </div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>📈 ${i18n.t('ref_career_progress_label')}</span><span>${c.xpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.xpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl">
            <span>😤 ${i18n.t('ref_career_stress_label')} ${c.stress >= 70 ? '⚠️' : ''}</span>
            <span>${c.stress}%</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
        </div>
      </div>
      <div class="ref-career-tips">
        ${c.stress >= 70 ? `<div class="ref-career-tip ref-career-tip--warn">⚠️ ${i18n.t('ref_career_stress_high')}</div>` : ''}
        ${c.xpPct >= 80 ? `<div class="ref-career-tip ref-career-tip--good">🚀 ${i18n.t('ref_career_promotion_soon_tip')}</div>` : ''}
      </div>
      ${this.buildJobActionsHtml()}
    `
  }

  /**
   * Girişimci paneli: firma sayısı, günlük gelir, net değer/nakit, en iyi firma
   * ve Firmalar sekmesine geçiş. (Salt-okunur GameState getter'ları kullanır.)
   */
  private buildEntrepreneurPanel(): string {
    const s = this.state
    if (!s) return ''
    const firmCount = s.ownedBusinessTiers()
    const dailyIncome = Math.round(s.incomePerDay())
    const netWorth = Math.round(s.financeNetWorth())
    const cash = Math.round(s.money)

    let best: { name: string; emoji: string; income: number } | null = null
    for (const p of PRODUCERS) {
      if ((s.producers[p.id] ?? 0) <= 0) continue
      const inc = s.producerIncome(p)
      if (!best || inc > best.income) best = { name: producerName(p), emoji: p.emoji, income: inc }
    }

    const bestRow = best
      ? `<div class="ref-entre-best">
           <span class="ref-entre-best__ico">${best.emoji}</span>
           <div class="ref-entre-best__main">
             <div class="ref-entre-best__lbl">${i18n.t('ref_career_best_earner_label')}</div>
             <div class="ref-entre-best__name">${best.name}</div>
           </div>
           <div class="ref-entre-best__income">${fmtMoney(Math.round(best.income))}${i18n.t('ref_career_best_earner_per_day')}</div>
         </div>`
      : `<div class="ref-career-entrepreneur-badge">${i18n.t('ref_career_no_firms_hint')}</div>`

    // TUR15-C5: meslek→firma bonusu bu kimlikten türeyecek; bonus hesabı domain
    // tarafında (GameState/producerIncomeFactors) kalacak, UI yalnız gösterecek.
    const formerJobDef = s.career.jobId ? careerJobDef(s.career.jobId) : null
    const formerJobLine = formerJobDef
      ? `<div class="ref-entre-note">💼 Eski meslek: ${formerJobDef.emoji} ${careerJobName(formerJobDef)} · ${i18n.t('ref_career_level_label')} ${s.career.level}</div>`
      : ''

    return `
      <div class="ref-career-entre-explainer">${i18n.t('ref_career_entre_explainer')}</div>
      ${formerJobLine}
      <div class="ref-career-section-title">${i18n.t('ref_career_entrepreneur_panel_title')}</div>
      <div class="ref-entre-grid">
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">🏢 ${i18n.t('ref_career_firms_count_label')}</span><span class="ref-entre-stat__val">${firmCount}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💰 ${i18n.t('ref_career_daily_income_label')}</span><span class="ref-entre-stat__val income">${fmtMoney(dailyIncome)}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💎 ${i18n.t('ref_career_net_worth_label')}</span><span class="ref-entre-stat__val">${fmtMoney(netWorth)}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💵 ${i18n.t('ref_career_cash_label')}</span><span class="ref-entre-stat__val">${fmtMoney(cash)}</span></div>
      </div>
      ${bestRow}
      <div class="ref-entre-note">${i18n.t('ref_career_entrepreneur_info')}</div>
      <button class="ref-entre-cta" type="button" data-career-goto-firms>${i18n.t('ref_career_entrepreneur_cta')}</button>
      <div class="ref-career-tips">
        <div class="ref-career-tip ref-career-tip--good">${i18n.t('ref_career_manage_firms_tip')}</div>
      </div>
    `
  }

  /**
   * İş sekmesi aksiyonları (yalnız çalışan/işsiz):
   *  - İş seçilmemişse: 6 iş seçim kartı.
   *  - İş seçilmişse: günlük kariyer aksiyon butonları (mesai/ek mesai/eğitim/networking).
   * (Girişimci modu jobCardHtml içinde ayrı panelle ele alınır.)
   */
  private buildJobActionsHtml(): string {
    const s = this.state
    if (!s) return ''
    const career = s.career
    const jobCards = CAREER_JOBS.map((job) => this.careerJobCardHtml(job.id)).join('')
    const jobsHtml = `
        <div class="ref-career-section-title">${i18n.t('ref_career_pick_job_section')}</div>
        <div class="ref-career-job-grid">${jobCards}</div>`

    if (!career.jobId) return jobsHtml

    const _jobDef = careerJobDef(career.jobId)
    const jobName = _jobDef ? careerJobName(_jobDef) : i18n.t('ref_career_working_employee_label')
    const careerActionMeta = buildCareerActionMeta()
    const buttons = BINDABLE_CAREER_ACTION_IDS.map((actId) => {
      const meta = careerActionMeta[actId]
      const used = career.actionsUsedToday.includes(actId)
      const preview = careerActionPreview(career, actId)
      const stressChip = preview.stress > 0
        ? `😤 +${preview.stress}`
        : preview.stress < 0
          ? `😌 −${Math.abs(preview.stress)}`
          : ''
      const previewTail = [`+${preview.xp} XP`, stressChip].filter(Boolean).join(' · ')
      const earnLine = preview.pay > 0
        ? `<div class="ref-career-action-btn__earn">≈ ${fmtMoney(preview.pay)} + ${i18n.t('ref_career_bonus_suffix')} · ${previewTail}</div>`
        : `<div class="ref-career-action-btn__xp">${previewTail}</div>`
      const sub = used
        ? `<div class="ref-career-action-btn__done">✓ ${i18n.t('ref_career_action_completed_today')}</div>`
        : earnLine
      return `
        <button class="ref-career-action-btn${used ? ' used' : ''}" type="button"
                data-career-action="${actId}" ${used ? 'disabled' : ''}>
          <span class="ref-career-action-btn__ico">${meta.emoji}</span>
          <span class="ref-career-action-btn__main">
            <span class="ref-career-action-btn__label">${meta.label}</span>
            ${sub}
          </span>
        </button>`
    }).join('')
    const doneCount = BINDABLE_CAREER_ACTION_IDS.filter((id) => career.actionsUsedToday.includes(id)).length
    const totalCount = BINDABLE_CAREER_ACTION_IDS.length
    const xpLine = career.level >= 10
      ? `<div class="ref-entre-note">📚 ${i18n.t('ref_career_level_label')} ${career.level} · MAX</div>`
      : `<div class="ref-entre-note">📚 ${i18n.t('ref_career_level_label')} ${career.level} · ${career.xp}/${career.xpToNext} XP</div>`
    return `
      ${jobsHtml}
      <div class="ref-career-section-title">${jobName} · ${i18n.t('ref_career_daily_actions_section')} (${doneCount}/${totalCount})</div>
      <div class="ref-career-action-grid">${buttons}</div>
      ${xpLine}
      ${this.buildFirstFirmGoalHtml(s)}
      <button class="ref-career-leave-btn" type="button" data-career-leave>${i18n.t('ref_career_leave_job_button')}</button>`
  }

  /**
   * "İlk Firma Hedefi" bloğu — yalnız çalışan (iş seçilmiş, girişimci değil) modda.
   * Veri kaynağı tek noktadan: state.firmsPurchaseLockStatus() (mevcut GameState
   * getter'ı — eşik formülü burada TEKRARLANMAZ).
   */
  private buildFirstFirmGoalHtml(s: GameState): string {
    const status = s.firmsPurchaseLockStatus()
    if (!status.locked) {
      return `
        <div class="ref-career-section-title">${i18n.t('ref_career_first_firm_title')}</div>
        <div class="ref-firm-goal ref-firm-goal--unlocked">
          <div class="ref-firm-goal__unlocked-text">✅ ${i18n.t('ref_career_first_firm_unlocked')}</div>
          <button class="ref-entre-cta" type="button" data-career-goto-firms>${i18n.t('ref_career_entrepreneur_cta')}</button>
        </div>`
    }
    const actionsPct = Math.min(100, Math.round((status.actions / status.actionsNeeded) * 100))
    const incomePct = Math.min(100, Math.round((status.income / status.incomeNeeded) * 100))
    return `
      <div class="ref-career-section-title">${i18n.t('ref_career_first_firm_title')}</div>
      <div class="ref-firm-goal">
        <div class="ref-firm-goal__row">
          <span class="ref-firm-goal__lbl">${i18n.t('ref_career_first_firm_actions_label')}</span>
          <span class="ref-firm-goal__val">${status.actions} / ${status.actionsNeeded}</span>
        </div>
        <div class="ref-perf-track sm"><div class="ref-perf-fill high" style="width:${actionsPct}%"></div></div>
        <div class="ref-firm-goal__row">
          <span class="ref-firm-goal__lbl">${i18n.t('ref_career_first_firm_income_label')}</span>
          <span class="ref-firm-goal__val">${fmtMoney(status.income)} / ${fmtMoney(status.incomeNeeded)}</span>
        </div>
        <div class="ref-perf-track sm"><div class="ref-perf-fill medium" style="width:${incomePct}%"></div></div>
      </div>`
  }

  private careerJobCardHtml(jobId: CareerJobId): string {
    const s = this.state
    const job = careerJobDef(jobId)
    if (!s || !job) return ''
    const eligibility = s.careerJobEligibility(jobId)
    const active = s.career.jobId === jobId
    const locked = !eligibility.eligible
    const actionLabel = active
      ? i18n.t('ref_career_current_job_badge')
      : s.career.jobId
        ? i18n.t('ref_career_job_change_button')
        : i18n.t('ref_career_job_apply_button')
    const reqLine = job.requirements?.find((req) => req.kind === 'career_level')
    const reqText = reqLine?.kind === 'career_level'
      ? fmt('ref_career_required_level_fmt', { level: String(reqLine.min) })
      : i18n.t('ref_career_requirements_met')
    const missing = eligibility.missingRequirements
      .map((req) => `<span>${this.missingRequirementText(req)}</span>`)
      .join('')
    const status = active
      ? i18n.t('ref_career_current_job_badge')
      : locked
        ? i18n.t('ref_career_requirements_not_met')
        : i18n.t('ref_career_open_label')
    const pathKey = job.careerPath ? CAREER_PATH_LABEL_KEY[job.careerPath] : undefined
    const pathChip = pathKey ? `<span class="ref-career-job-card__path">→ ${i18n.t(pathKey as Parameters<typeof i18n.t>[0])}</span>` : ''
    return `
      <button class="ref-career-job-card${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}" type="button"
              data-career-job="${job.id}" ${active || locked ? 'disabled' : ''}>
        <span class="ref-career-job-card__top">
          <span class="ref-career-job-card__ico">${job.emoji}</span>
          <span class="ref-career-job-card__name">${careerJobName(job)}</span>
          <span class="ref-career-job-card__status">${status}</span>
        </span>
        <span class="ref-career-job-card__desc">${careerJobDesc(job)}</span>
        ${pathChip}
        <span class="ref-career-job-card__facts">
          <span>${fmtMoney(job.baseDailyWage)}${i18n.t('ref_career_wage_per_day_unit')}</span>
          <span>😤 +${job.stressDelta} ${i18n.t('ref_career_stress_unit')}</span>
        </span>
        <span class="ref-career-job-card__req">${reqText}</span>
        ${locked ? `<span class="ref-career-job-card__missing">${missing}</span>` : ''}
        <span class="ref-career-job-card__button">${actionLabel}</span>
      </button>`
  }

  private missingRequirementText(req: MissingCareerRequirement): string {
    if (req.kind === 'career_level') {
      return `${fmt('ref_career_required_level_fmt', { level: String(req.required) })} · ${fmt('ref_career_current_level_fmt', { level: String(req.actual ?? 0) })}`
    }
    if (typeof req.required === 'number') {
      return `${i18n.t('ref_career_requirements_not_met')} · ${fmtMoney(req.required)}`
    }
    return i18n.t('ref_career_requirements_not_met')
  }

  private careerJobResultToast(result: CareerJobChangeResult): void {
    if (!result.ok) {
      const message = result.code === 'same_job'
        ? i18n.t('ref_career_toast_same_job')
        : result.code === 'requirements_not_met'
          ? i18n.t('ref_career_requirements_not_met')
          : i18n.t('ref_career_toast_job_failed')
      refToast(message, 'err')
      return
    }
    if (!result.currentJobId) {
      refToast(i18n.t('ref_career_toast_job_left'), 'ok')
      return
    }
    const current = careerJobDef(result.currentJobId)
    const previous = result.previousJobId ? careerJobDef(result.previousJobId) : null
    const currentName = current ? careerJobName(current) : result.currentJobId
    const previousName = previous ? careerJobName(previous) : ''
    const message = result.previousJobId
      ? fmt('ref_career_toast_job_changed_fmt', { previous: previousName, current: currentName })
      : fmt('ref_career_toast_job_started_fmt', { job: currentName })
    refToast(message, 'ok')
  }

  private renderDyn(c: RefCareerVM): void {
    const secHealth = this.tabs.section('health')
    secHealth.innerHTML = ''
    secHealth.appendChild(this.buildHealthSection(c))
    if (FAME_UI_ENABLED) {
      const secFame = this.tabs.section('fame')
      secFame.innerHTML = ''
      secFame.appendChild(this.buildFameSection(c))
      secFame.appendChild(this.buildKarmaRow(c))
    } else {
      // Şöhret gizli — karma satırı kaybolmasın diye Sağlık sekmesine eklenir.
      secHealth.appendChild(this.buildKarmaRow(c))
    }
  }

  private buildHealthSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    const hClass = c.health >= 70 ? 'high' : c.health >= 40 ? 'medium' : 'low'
    const hEmoji = c.health >= 80 ? '💚' : c.health >= 50 ? '💛' : c.health >= 20 ? '🟠' : '❤️'
    wrap.appendChild(sectionTitle(i18n.t('ref_career_health_section_title'), `${c.health}% · ${c.healthLabel}`))

    const card = document.createElement('div')
    card.className = 'ref-health-card'
    card.innerHTML = `
      <div class="ref-health-stats">
        <div class="ref-health-stat">
          <span class="ref-health-stat__ico">${hEmoji}</span>
          <div>
            <div class="ref-health-stat__lbl">Sağlık Puanı</div>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${hClass}" style="width:${c.health}%"></div></div>
          </div>
          <span class="ref-health-val">${c.health}%</span>
        </div>
        <div class="ref-health-stat">
          <span class="ref-health-stat__ico">😤</span>
          <div>
            <div class="ref-health-stat__lbl">${i18n.t('ref_career_stress_label')}</div>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
          </div>
          <span class="ref-health-val">${c.stress}%</span>
        </div>
      </div>
      <div class="ref-health-tips">
        ${c.health >= 80 ? `<div class="ref-health-tip good">✅ ${i18n.t('ref_career_health_excellent_tip')}</div>` : ''}
        ${c.health < 50 ? `<div class="ref-health-tip warn">⚠️ ${i18n.t('ref_career_health_low_tip')}</div>` : ''}
        ${c.stress >= 70 ? `<div class="ref-health-tip warn">⚠️ ${i18n.t('ref_career_stress_high_tip')}</div>` : ''}
      </div>
    `

    if (c.diseases.length > 0) {
      const dTitle = document.createElement('div')
      dTitle.className = 'ref-disease-list-title'
      dTitle.textContent = '🏥 ' + i18n.t('ref_career_diseases_section_title')
      card.appendChild(dTitle)
      const list = document.createElement('div')
      list.className = 'ref-disease-list'
      for (const d of c.diseases) {
        const row = document.createElement('div')
        row.className = 'ref-disease-row'
        row.innerHTML = `
          <span class="ref-disease-emoji">${d.emoji}</span>
          <div class="ref-disease-info">
            <div class="ref-disease-name">${d.name}</div>
            <div class="ref-disease-dmg">−${d.dailyDamage} ${i18n.t('ref_career_health_per_day_unit')}</div>
          </div>
          <button class="ref-disease-treat-btn" type="button" data-disease="${d.id}">
            Tedavi · ${fmtMoney(d.treatCost)}
          </button>
        `
        list.appendChild(row)
      }
      card.appendChild(list)
    } else {
      const ok = document.createElement('div')
      ok.className = 'ref-disease-ok'
      ok.textContent = '✅ ' + i18n.t('ref_career_no_diseases')
      card.appendChild(ok)
    }
    wrap.appendChild(card)

    // Günlük dinlenme + stres tedavisi (state'e gerçek bağlı)
    const s = this.state
    if (s) {
      const routine = document.createElement('div')
      routine.innerHTML = this.buildRoutineAndWellbeingHtml(s)
      wrap.appendChild(routine)
    }
    return wrap
  }

  /** Günlük rutin (egzersiz/meditasyon) + stres tedavisi (terapi/meditasyon). */
  private buildRoutineAndWellbeingHtml(s: GameState): string {
    const status = s.getDailyRoutineActions()
    const limitFull = status.remaining <= 0
    const routineBtns = ROUTINE_META.map((r) => {
      const used = status.used.includes(r.id)
      const disabled = used || limitFull
      return `
        <button class="ref-routine-btn" type="button" data-routine="${r.id}" ${disabled ? 'disabled' : ''}>
          <span class="ref-routine-btn__ico">${r.emoji}</span>
          <span class="ref-routine-btn__label">${requiredDomainText(r.labelKey)}</span>
          <span class="ref-routine-btn__effect">${used ? requiredDomainText('career_routine_done') : requiredDomainText(r.effectKey)}</span>
        </button>`
    }).join('')

    const wbRows = CAREER_WELLBEING_IDS.map((id) => {
      const act = WELLBEING_ACTIVITIES.find((a) => a.id === id)
      if (!act) return ''
      const canBuy = s.money >= act.cost
      return `
        <div class="ref-wellbeing-row">
          <span class="ref-routine-btn__ico">${act.emoji}</span>
          <div class="ref-wellbeing-row__main">
            <div class="ref-wellbeing-row__name">${wellbeingName(act)}</div>
            <div class="ref-wellbeing-row__effect">😌 -${act.stressReduction} ${i18n.t('ref_career_stress_unit')}</div>
          </div>
          <button class="ref-disease-treat-btn" type="button" data-wellbeing="${id}" ${canBuy ? '' : 'disabled'}>
            ${fmtMoney(act.cost)}
          </button>
        </div>`
    }).join('')

    return `
      <div class="ref-career-section-title">Günlük Dinlenme · ${status.remaining}/${status.max} hak</div>
      <div class="ref-routine-grid">${routineBtns}</div>
      <div class="ref-career-section-title">Stres Tedavisi</div>
      <div class="ref-wellbeing-list">${wbRows}</div>`
  }

  private buildFameSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-fame-section'
    wrap.appendChild(sectionTitle(i18n.t('ref_career_fame_section_title'), c.fameIsActive ? (c.fameCareerName ?? '') : i18n.t('ref_career_fame_inactive_label')))

    if (c.fameIsActive && c.fameCareerType) {
      const career = FAME_CAREERS.find((f) => f.id === c.fameCareerType)
      const active = document.createElement('div')
      active.className = 'ref-fame-active'
      active.innerHTML = `
        <div class="ref-fame-active__head">
          <span>${career?.emoji ?? '⭐'} ${c.fameCareerName}</span>
          <span class="ref-fame-level">${c.fameLabel} · ${c.fame}%</span>
        </div>
        <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.fame}%"></div></div>
        <div class="ref-fame-income">📈 ${i18n.t('ref_career_fame_income_label')}: ${fmtMoney(c.fame * c.fame * 12 + (career?.baseDailyIncome ?? 0))}${i18n.t('ref_career_best_earner_per_day')}</div>
        <button class="ref-fame-quit-btn" type="button" data-action="quit_fame">${i18n.t('ref_career_fame_quit_button')}</button>
      `
      if (career) {
        const actWrap = document.createElement('div')
        actWrap.className = 'ref-fame-actions'
        for (const act of career.actions) {
          const btn = document.createElement('button')
          btn.className = 'ref-fame-action-btn'
          btn.type = 'button'
          btn.dataset.action = `fame_action:${act.id}`
          btn.innerHTML = `${act.emoji} ${fameActionLabel(career.id, act)}${act.cost > 0 ? ` · ${fmtMoney(act.cost)}` : ''}`
          actWrap.appendChild(btn)
        }
        active.appendChild(actWrap)
      }
      wrap.appendChild(active)
    } else {
      const note = document.createElement('div')
      note.className = 'ref-fame-inactive'
      note.textContent = i18n.t('ref_career_fame_career_prompt') + ':'
      wrap.appendChild(note)
      const grid = document.createElement('div')
      grid.className = 'ref-fame-pick-grid'
      for (const career of FAME_CAREERS) {
        const card = document.createElement('button')
        card.className = 'ref-fame-pick-card'
        card.type = 'button'
        card.dataset.action = `start_fame:${career.id}`
        card.innerHTML = `
          <div class="ref-fame-pick-emoji">${career.emoji}</div>
          <div class="ref-fame-pick-name">${fameCareerName(career)}</div>
          <div class="ref-fame-pick-income">${fmtMoney(career.baseDailyIncome)}${i18n.t('ref_career_best_earner_per_day')}</div>
        `
        grid.appendChild(card)
      }
      wrap.appendChild(grid)
    }
    return wrap
  }

  private buildKarmaRow(c: RefCareerVM): HTMLElement {
    const row = document.createElement('div')
    row.className = `ref-karma-row ${c.karma >= 0 ? 'ref-karma-good' : 'ref-karma-bad'}`
    row.innerHTML = `
      <span>${c.karma >= 0 ? '😇' : '😈'} ${i18n.t('ref_career_karma_label')}</span>
      <span class="ref-karma-val">${c.karma >= 0 ? '+' : ''}${c.karma}</span>
    `
    return row
  }

  private dynSig(c: RefCareerVM): string {
    const routineUsed = this.state?.getDailyRoutineActions().used.join(',') ?? ''
    return `${c.health}|${c.diseases.map((d) => d.id).join(',')}|${c.fame}|${c.fameIsActive}|${c.fameCareerType}|${c.karma}|${routineUsed}|${Math.round(this.state?.money ?? 0)}`
  }

  private jobSig(c: RefCareerVM): string {
    const career = this.state?.career
    const acts = career?.actionsUsedToday.join(',') ?? ''
    // Girişimci panelinde nakit/net değer canlı; yalnız o modda imzaya ekle
    // (çalışan modda gereksiz rebuild olmasın).
    const entrePart = career?.isEntrepreneur
      ? `|${Math.round(this.state?.money ?? 0)}|${Math.round(this.state?.financeNetWorth() ?? 0)}`
      : ''
    // TUR15-C1 — İlk Firma Hedefi bloğu bu değerlere bağlı; bayat kalmasın.
    const lock = this.state?.firmsPurchaseLockStatus()
    const lockPart = lock ? `|${lock.locked}|${lock.actions}|${lock.income}` : ''
    return `${c.jobTitle}|${c.level}|${Math.round(c.salaryDaily)}|${c.stress}|${c.xpPct}|${c.nextRank}|${career?.jobId ?? '-'}|${career?.level ?? 0}|${career?.xp ?? 0}|${career?.isEntrepreneur ?? false}|${acts}${entrePart}${lockPart}`
  }

  refresh(state: GameState): void {
    this.state = state
    const vm = this.buildVMFromState(state)

    const jSig = this.jobSig(vm)
    if (jSig !== this.lastJobSig) {
      this.lastJobSig = jSig
      this.jobCard.innerHTML = this.jobCardHtml(vm)
    }

    // Profil onboarding'de bir kez seçilir — boşsa ve artık varsa doldur
    if (!this.profileCard.innerHTML && state.characterProfile) {
      this.profileCard.innerHTML = this.profileHtml()
    }

    const sig = this.dynSig(vm)
    if (sig === this.lastDynSig) return
    this.lastDynSig = sig
    this.renderDyn(vm)
  }

  private buildVMFromState(state: GameState): RefCareerVM {
    const st = state as unknown as {
      fameState?: { careerType: string | null; fameLevel: number; isActive: boolean }
      diseases?: { id: DiseaseId; diagnosedDay: number }[]
      karma?: number
    }
    const fs = st.fameState
    const diseases = st.diseases ?? []
    const karma = st.karma ?? 0
    const health = Math.round(state.health?.health ?? 100)
    const fameCareerDef = fs?.careerType
      ? FAME_CAREERS.find((c) => c.id === fs.careerType)
      : undefined

    // Gerçek kariyer basamağı: PlayerRank (totalEarned tabanlı) — TEK KAYNAK
    const rp = rankProgress(state.totalEarned)
    const age = state.playerAge()

    return {
      ...this.vm,
      jobTitle: `${rp.current.emoji} ${rankName(rp.current)}`,
      level: PLAYER_RANKS.indexOf(rp.current) + 1,
      salaryDaily: Math.round(dailyCareerWage(state.career)),
      stress: Math.round(state.career.stress),
      xpPct: Math.round(rp.pct),
      xpText: rp.next ? `${fmtMoney(Math.round(state.totalEarned))} / ${fmtMoney(rp.next.minEarned)}` : `${i18n.t('ref_career_peak_label')} 🏆`,
      nextRank: rp.next ? `${rp.next.emoji} ${rankName(rp.next)}` : `🏆 ${i18n.t('ref_career_at_peak')}`,
      seniorityYears: Math.max(0, age - 18),
      health,
      healthLabel: health >= 80 ? i18n.t('ref_health_good') : health >= 50 ? i18n.t('ref_health_medium') : health >= 20 ? i18n.t('ref_health_bad') : i18n.t('ref_health_critical'),
      diseases: diseases.map((d) => {
        const def = diseaseDef(d.id)
        return { id: d.id, name: diseaseName(def), emoji: def.emoji, treatCost: def.treatCost, dailyDamage: def.dailyHealthDamage }
      }),
      fame: Math.round(fs?.fameLevel ?? 0),
      fameLabel: fameLevelLabel(fs?.fameLevel ?? 0),
      fameCareerName: fameCareerDef ? fameCareerName(fameCareerDef) : null,
      fameCareerType: fs?.careerType ?? null,
      fameIsActive: fs?.isActive ?? false,
      karma,
    }
  }

  /**
   * Firmalar sekmesine geç. RefApp'in bottom-nav butonunu DOM üzerinden
   * tetikler → mevcut `nav.onChange → show('firms')` akışını aynen kullanır
   * (RefApp'e dokunmadan, güvenli tab geçişi).
   */
  private navigateToFirms(): void {
    const shell = this.el.closest('.ref-shell')
    const btns = shell?.querySelectorAll<HTMLButtonElement>('.ref-bottom-nav .ref-nav-btn')
    if (!btns) return
    for (const b of Array.from(btns)) {
      if (b.querySelector('.ref-nav-btn__lbl')?.textContent?.trim() === i18n.t('ref_nav_firms')) {
        b.click()
        return
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-action],[data-disease],[data-career-job],[data-career-action],[data-career-leave],[data-routine],[data-wellbeing],[data-career-goto-firms]',
    )
    if (!btn) return
    const s = this.state

    // ── Firmalara Git (girişimci paneli) ──
    if (btn.hasAttribute('data-career-goto-firms')) {
      this.navigateToFirms()
      return
    }

    // ── İş seçimi ──
    const careerJob = btn.dataset.careerJob as CareerJobId | undefined
    if (careerJob) {
      const result = s.setCareerJob(careerJob)
      if (result.ok) {
        this.refresh(s)
        this.onPersist?.()
      }
      this.careerJobResultToast(result)
      return
    }

    if (btn.hasAttribute('data-career-leave')) {
      const result = s.leaveCareerJob()
      if (result.ok) {
        this.refresh(s)
        this.onPersist?.()
      }
      this.careerJobResultToast(result)
      return
    }

    // ── Kariyer günlük aksiyonu ──
    const careerAction = btn.dataset.careerAction as CareerActionId | undefined
    if (careerAction) {
      const r = s.doCareerAction(careerAction)
      const gained = r.money > 0 || r.xp > 0
      const parts: string[] = []
      if (r.money > 0) parts.push(`+${fmtMoney(r.money)}`)
      if (r.xp > 0) parts.push(`+${r.xp} XP`)
      if (r.stressDelta > 0) parts.push(`😤 +${r.stressDelta}`)
      else if (r.stressDelta < 0) parts.push(`😌 −${Math.abs(r.stressDelta)}`)
      if (r.levelUp) parts.push('🎉 ' + i18n.t('ref_career_toast_level_up'))
      refToast(gained ? `✅ ${parts.join(' · ')}` : '⚠️ ' + i18n.t('ref_career_toast_action_used'), gained ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    // ── Günlük rutin (egzersiz/meditasyon) ──
    const routine = btn.dataset.routine as 'exercise' | 'meditate' | undefined
    if (routine) {
      const ok = s.doDailyRoutine(routine)
      refToast(ok ? '✅ ' + i18n.t('ref_career_toast_completed') : '⚠️ ' + i18n.t('ref_career_toast_daily_limit'), ok ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    // ── Stres tedavisi (wellbeing) ──
    const wellbeing = btn.dataset.wellbeing as WellbeingActivityId | undefined
    if (wellbeing) {
      const ok = s.buyWellbeing(wellbeing)
      refToast(ok ? '🧘 ' + i18n.t('ref_career_toast_activity_done') : '💸 ' + i18n.t('ref_career_toast_insufficient_funds'), ok ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    const diseaseId = btn.dataset.disease as DiseaseId | undefined
    if (diseaseId) {
      const ok = (this.state as unknown as { treatDisease: (id: DiseaseId) => boolean }).treatDisease(diseaseId)
      refToast(ok ? '💊 ' + i18n.t('ref_career_toast_treatment_done') : '💸 ' + i18n.t('ref_career_toast_insufficient_funds'), ok ? 'ok' : 'err')
      return
    }

    const action = btn.dataset.action
    if (!action) return

    if (action === 'quit_fame') {
      ;(this.state as unknown as { quitFameCareer: () => void }).quitFameCareer()
      refToast(i18n.t('ref_career_toast_fame_quit'), 'ok')
      return
    }
    if (action.startsWith('start_fame:')) {
      const type = action.split(':')[1] as FameCareerType
      const ok = (this.state as unknown as { startFameCareer: (t: FameCareerType) => boolean }).startFameCareer(type)
      refToast(ok ? '🌟 ' + i18n.t('ref_career_toast_fame_started') : i18n.t('ref_career_toast_fame_already_active'), ok ? 'ok' : 'err')
      return
    }
    if (action.startsWith('fame_action:')) {
      const actionId = action.split(':')[1]!
      const ok = (this.state as unknown as { doFameAction: (id: string) => boolean }).doFameAction(actionId)
      refToast(ok ? '⭐ ' + i18n.t('ref_career_toast_fame_action_done') : '💸 ' + i18n.t('ref_career_toast_insufficient_funds'), ok ? 'ok' : 'err')
    }
  }
}
