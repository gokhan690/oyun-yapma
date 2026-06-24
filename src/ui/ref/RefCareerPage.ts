import { sectionTitle, fmtMoney, refToast } from './refShared'
import { i18n } from '../../i18n'
import { RefSubTabs } from './RefSubTabs'
import type { RefCareerVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { DiseaseId } from '../../game/Diseases'
import { FAME_CAREERS, fameLevelLabel } from '../../game/Fame'
import type { FameCareerType } from '../../game/Fame'
import { diseaseDef } from '../../game/Diseases'
import { PLAYER_RANKS, rankProgress } from '../../game/PlayerRank'
import { JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS } from '../../game/CharacterProfile'
import {
  CAREER_JOBS, BINDABLE_CAREER_ACTION_IDS, careerJobDef, estimatedCareerActionPay,
  type CareerJobId, type CareerActionId,
} from '../../game/Career'
import { WELLBEING_ACTIVITIES, type WellbeingActivityId } from '../../game/Lifestyle'
import { PRODUCERS } from '../../game/Economy'

/** Kariyer aksiyon butonlarının etiket/emoji/açıklaması. */
const CAREER_ACTION_META: Record<string, { emoji: string; label: string; desc: string }> = {
  mesai:      { emoji: '🕘', label: 'Mesai Yap',  desc: 'Günlük çalışma' },
  ek_mesai:   { emoji: '🌙', label: 'Ek Mesai',   desc: 'Fazla mesai, yüksek prim' },
  egitim_al:  { emoji: '📚', label: 'Eğitim Al',  desc: 'XP kazan, stres düşür' },
  networking: { emoji: '🤝', label: 'Networking', desc: 'Ağ kur, az gelir + XP' },
}

/** Kariyer Sağlık sekmesinde bağlanan günlük rutin aksiyonları. */
const ROUTINE_META: { id: 'exercise' | 'meditate'; emoji: string; label: string; effect: string }[] = [
  { id: 'exercise', emoji: '🏃', label: 'Egzersiz',   effect: '+5 sağlık · -5 stres' },
  { id: 'meditate', emoji: '🧘', label: 'Meditasyon', effect: '-10 stres' },
]

/** Kariyer Sağlık sekmesinde gösterilen stres tedavileri (yalnız bu ikisi). */
const CAREER_WELLBEING_IDS: WellbeingActivityId[] = ['terapi', 'meditasyon']

const MOCK_CAREER: RefCareerVM = {
  jobTitle: 'Holding YK Başkanı', level: 24, salaryDaily: 48_000, stress: 48,
  xpPct: 64, xpText: '₺248M / ₺1Mr', nextRank: 'Sektör Lideri', seniorityYears: 6,
  health: 72, healthLabel: 'İyi', diseases: [], fame: 0, fameLabel: 'Yeni Başlayan',
  fameCareerName: null, fameCareerType: null, fameIsActive: false, karma: 0, siblingCount: 0,
}

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = i18n.t('ref_career_title')

  private tabs: RefSubTabs
  private jobCard!: HTMLElement
  private profileCard!: HTMLElement
  private vm: RefCareerVM
  private state?: GameState
  private lastDynSig = ''
  private lastJobSig = ''

  constructor(vm?: RefCareerVM, state?: GameState) {
    this.vm = vm ?? MOCK_CAREER
    this.state = state

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    this.tabs = new RefSubTabs([
      { id: 'job',    label: 'İş',     icon: '💼' },
      { id: 'health', label: 'Sağlık', icon: '❤️' },
      { id: 'fame',   label: 'Şöhret', icon: '⭐' },
    ])
    this.el.appendChild(this.tabs.tabsEl)
    const secJob = this.tabs.section('job')
    this.el.appendChild(secJob)
    this.el.appendChild(this.tabs.section('health'))
    this.el.appendChild(this.tabs.section('fame'))

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

  /** Onboarding'de seçilen meslek/eğitim/yaşam tarzı çipleri. */
  private profileHtml(): string {
    const p = this.state?.characterProfile
    if (!p) return ''
    const job = JOB_DEFS[p.jobId]
    const edu = EDUCATION_DEFS[p.educationLevel]
    const life = LIFESTYLE_DEFS[p.lifestyleType]
    return `
      <div class="ref-career-profile__title">Karakter Profili</div>
      <div class="ref-career-profile__chips">
        <span class="ref-member-chip">${job.emoji} ${job.label}${job.incomeDailyBonus > 0 ? ` · +${fmtMoney(job.incomeDailyBonus)}/g` : ''}</span>
        <span class="ref-member-chip">${edu.emoji} ${edu.label}</span>
        <span class="ref-member-chip">${life.emoji} ${life.label} yaşam</span>
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
      mainSub = `Kariyer Seviyesi ${c.level} · ${c.seniorityYears} yıl kıdem`
      badge = `LVL ${c.level}`
    } else if (isEntrepreneur) {
      mainTitle = '🚀 Girişimci'
      mainSub = 'Gelir firmalarından geliyor'
      badge = 'Firma Sahibi'
    } else if (!career?.jobId) {
      mainTitle = '🔍 İşsiz'
      mainSub = 'Henüz iş seçilmedi'
      badge = 'Başlangıç'
    } else {
      const jobDef = careerJobDef(career.jobId)
      mainTitle = `${jobDef?.emoji ?? '💼'} ${jobDef?.name ?? ''}`
      mainSub = `Çalışan · Kariyer Seviyesi ${career.level} · ${c.seniorityYears} yıl kıdem`
      badge = `İş Lv.${career.level}`
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

    // 3. stat hücresi: işsizken rütbe yerine nötr yönlendirme.
    const thirdStat = isUnemployed
      ? `<span class="ref-job-stat__lbl">🎯 Başlangıç</span>
         <span class="ref-job-stat__val">İlk işini seç</span>`
      : `<span class="ref-job-stat__lbl">🏆 Sıradaki Rütbe</span>
         <span class="ref-job-stat__val">${c.nextRank}</span>`

    return banner + `
      <div class="ref-job-stats">
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">💰 Günlük Gelir</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily)}</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">📅 Aylık Tahmini</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily * 30)}</span>
        </div>
        <div class="ref-job-stat">
          ${thirdStat}
        </div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>📈 Kariyer İlerlemesi</span><span>${c.xpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.xpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl">
            <span>😤 Stres ${c.stress >= 70 ? '⚠️' : ''}</span>
            <span>${c.stress}%</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
        </div>
      </div>
      <div class="ref-career-tips">
        ${c.stress >= 70 ? '<div class="ref-career-tip ref-career-tip--warn">⚠️ Stres çok yüksek — sağlık riske girdi</div>' : ''}
        ${c.xpPct >= 80 ? '<div class="ref-career-tip ref-career-tip--good">🚀 Rütbe atlamaya yakın!</div>' : ''}
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
      if (!best || inc > best.income) best = { name: p.name, emoji: p.emoji, income: inc }
    }

    const bestRow = best
      ? `<div class="ref-entre-best">
           <span class="ref-entre-best__ico">${best.emoji}</span>
           <div class="ref-entre-best__main">
             <div class="ref-entre-best__lbl">En çok gelir getiren</div>
             <div class="ref-entre-best__name">${best.name}</div>
           </div>
           <div class="ref-entre-best__income">${fmtMoney(Math.round(best.income))}/gün</div>
         </div>`
      : `<div class="ref-career-entrepreneur-badge">Henüz firman yok — Firmalar sekmesinden ilk işletmeni kur.</div>`

    return `
      <div class="ref-career-section-title">Girişimci Paneli</div>
      <div class="ref-entre-grid">
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">🏢 Firma</span><span class="ref-entre-stat__val">${firmCount}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💰 Günlük Gelir</span><span class="ref-entre-stat__val income">${fmtMoney(dailyIncome)}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💎 Net Değer</span><span class="ref-entre-stat__val">${fmtMoney(netWorth)}</span></div>
        <div class="ref-entre-stat"><span class="ref-entre-stat__lbl">💵 Nakit</span><span class="ref-entre-stat__val">${fmtMoney(cash)}</span></div>
      </div>
      ${bestRow}
      <div class="ref-entre-note">Artık kariyer maaşı yerine şirketlerinden gelir kazanıyorsun.</div>
      <button class="ref-entre-cta" type="button" data-career-goto-firms>🏢 Firmalara Git</button>
      <div class="ref-career-tips">
        <div class="ref-career-tip ref-career-tip--good">📈 Firma gelişimi: Firmalar sekmesinden yönet</div>
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

    if (!career.jobId) {
      const cards = CAREER_JOBS.map((job) => `
        <button class="ref-career-job-card" type="button" data-career-job="${job.id}">
          <span class="ref-career-job-card__ico">${job.emoji}</span>
          <span class="ref-career-job-card__name">${job.name}</span>
          <span class="ref-career-job-card__wage">${fmtMoney(job.baseDailyWage)}/gün</span>
          <span class="ref-career-job-card__stress">😤 +${job.stressDelta} stres</span>
        </button>`).join('')
      return `
        <div class="ref-career-section-title">Bir İş Seç</div>
        <div class="ref-career-job-grid">${cards}</div>`
    }

    const jobName = careerJobDef(career.jobId)?.name ?? 'İşin'
    const buttons = BINDABLE_CAREER_ACTION_IDS.map((actId) => {
      const meta = CAREER_ACTION_META[actId]
      const used = career.actionsUsedToday.includes(actId)
      const pay = estimatedCareerActionPay(career, actId)
      const earnLine = pay > 0
        ? `<div class="ref-career-action-btn__earn">≈ ${fmtMoney(pay)} + prim</div>`
        : `<div class="ref-career-action-btn__xp">XP & stres odaklı</div>`
      const sub = used
        ? '<div class="ref-career-action-btn__done">✓ Bugün tamamlandı</div>'
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
    return `
      <div class="ref-career-section-title">${jobName} · Günlük Aksiyonlar</div>
      <div class="ref-career-action-grid">${buttons}</div>`
  }

  private renderDyn(c: RefCareerVM): void {
    const secHealth = this.tabs.section('health')
    secHealth.innerHTML = ''
    secHealth.appendChild(this.buildHealthSection(c))
    const secFame = this.tabs.section('fame')
    secFame.innerHTML = ''
    secFame.appendChild(this.buildFameSection(c))
    secFame.appendChild(this.buildKarmaRow(c))
  }

  private buildHealthSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    const hClass = c.health >= 70 ? 'high' : c.health >= 40 ? 'medium' : 'low'
    const hEmoji = c.health >= 80 ? '💚' : c.health >= 50 ? '💛' : c.health >= 20 ? '🟠' : '❤️'
    wrap.appendChild(sectionTitle('Sağlık & Yaşam', `${c.health}% · ${c.healthLabel}`))

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
            <div class="ref-health-stat__lbl">Stres</div>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
          </div>
          <span class="ref-health-val">${c.stress}%</span>
        </div>
      </div>
      <div class="ref-health-tips">
        ${c.health >= 80 ? '<div class="ref-health-tip good">✅ Sağlık durumu mükemmel</div>' : ''}
        ${c.health < 50 ? '<div class="ref-health-tip warn">⚠️ Sağlık düşük — tedavi önerilir</div>' : ''}
        ${c.stress >= 70 ? '<div class="ref-health-tip warn">⚠️ Stres yüksek — dinlenme gerekli</div>' : ''}
      </div>
    `

    if (c.diseases.length > 0) {
      const dTitle = document.createElement('div')
      dTitle.className = 'ref-disease-list-title'
      dTitle.textContent = '🏥 Aktif Hastalıklar'
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
            <div class="ref-disease-dmg">−${d.dailyDamage} sağlık/gün</div>
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
      ok.textContent = '✅ Aktif hastalık yok'
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
          <span class="ref-routine-btn__label">${r.label}</span>
          <span class="ref-routine-btn__effect">${used ? '✓ Yapıldı' : r.effect}</span>
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
            <div class="ref-wellbeing-row__name">${act.name}</div>
            <div class="ref-wellbeing-row__effect">😌 -${act.stressReduction} stres</div>
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
    wrap.appendChild(sectionTitle('Şöhret Kariyeri', c.fameIsActive ? (c.fameCareerName ?? '') : 'Pasif'))

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
        <div class="ref-fame-income">📈 Şöhret geliri: ${fmtMoney(c.fame * c.fame * 12 + (career?.baseDailyIncome ?? 0))}/gün</div>
        <button class="ref-fame-quit-btn" type="button" data-action="quit_fame">Kariyeri Bırak</button>
      `
      if (career) {
        const actWrap = document.createElement('div')
        actWrap.className = 'ref-fame-actions'
        for (const act of career.actions) {
          const btn = document.createElement('button')
          btn.className = 'ref-fame-action-btn'
          btn.type = 'button'
          btn.dataset.action = `fame_action:${act.id}`
          btn.innerHTML = `${act.emoji} ${act.label}${act.cost > 0 ? ` · ${fmtMoney(act.cost)}` : ''}`
          actWrap.appendChild(btn)
        }
        active.appendChild(actWrap)
      }
      wrap.appendChild(active)
    } else {
      const note = document.createElement('div')
      note.className = 'ref-fame-inactive'
      note.textContent = 'Şöhret kariyeri başlatmak için bir alan seç:'
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
          <div class="ref-fame-pick-name">${career.name}</div>
          <div class="ref-fame-pick-income">${fmtMoney(career.baseDailyIncome)}/gün</div>
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
      <span>${c.karma >= 0 ? '😇' : '😈'} Karma</span>
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
    return `${c.jobTitle}|${c.level}|${Math.round(c.salaryDaily)}|${c.stress}|${c.xpPct}|${c.nextRank}|${career?.jobId ?? '-'}|${career?.level ?? 0}|${career?.isEntrepreneur ?? false}|${acts}${entrePart}`
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
      jobTitle: `${rp.current.emoji} ${rp.current.name}`,
      level: PLAYER_RANKS.indexOf(rp.current) + 1,
      salaryDaily: Math.round(state.incomePerDay()),
      stress: Math.round(state.lifestyle.stress),
      xpPct: Math.round(rp.pct),
      xpText: rp.next ? `${fmtMoney(Math.round(state.totalEarned))} / ${fmtMoney(rp.next.minEarned)}` : 'ZİRVE 🏆',
      nextRank: rp.next ? `${rp.next.emoji} ${rp.next.name}` : '🏆 Zirvede',
      seniorityYears: Math.max(0, age - 18),
      health,
      healthLabel: health >= 80 ? 'İyi' : health >= 50 ? 'Orta' : health >= 20 ? 'Kötü' : 'Kritik',
      diseases: diseases.map((d) => {
        const def = diseaseDef(d.id)
        return { id: d.id, name: def.name, emoji: def.emoji, treatCost: def.treatCost, dailyDamage: def.dailyHealthDamage }
      }),
      fame: Math.round(fs?.fameLevel ?? 0),
      fameLabel: fameLevelLabel(fs?.fameLevel ?? 0),
      fameCareerName: fameCareerDef?.name ?? null,
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
      if (b.querySelector('.ref-nav-btn__lbl')?.textContent?.trim() === 'Firmalar') {
        b.click()
        return
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-action],[data-disease],[data-career-job],[data-career-action],[data-routine],[data-wellbeing],[data-career-goto-firms]',
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
      s.setCareerJob(careerJob)
      refToast('💼 İş seçildi', 'ok')
      this.refresh(s)
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
      if (r.levelUp) parts.push('🎉 Seviye atladın!')
      refToast(gained ? `✅ ${parts.join(' · ')}` : '⚠️ Bugün bu aksiyonu kullandın', gained ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    // ── Günlük rutin (egzersiz/meditasyon) ──
    const routine = btn.dataset.routine as 'exercise' | 'meditate' | undefined
    if (routine) {
      const ok = s.doDailyRoutine(routine)
      refToast(ok ? '✅ Tamamlandı' : '⚠️ Günlük limit doldu', ok ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    // ── Stres tedavisi (wellbeing) ──
    const wellbeing = btn.dataset.wellbeing as WellbeingActivityId | undefined
    if (wellbeing) {
      const ok = s.buyWellbeing(wellbeing)
      refToast(ok ? '🧘 Aktivite tamamlandı' : '💸 Para yetersiz', ok ? 'ok' : 'err')
      this.refresh(s)
      return
    }

    const diseaseId = btn.dataset.disease as DiseaseId | undefined
    if (diseaseId) {
      const ok = (this.state as unknown as { treatDisease: (id: DiseaseId) => boolean }).treatDisease(diseaseId)
      refToast(ok ? '💊 Tedavi tamamlandı' : '💸 Para yetersiz', ok ? 'ok' : 'err')
      return
    }

    const action = btn.dataset.action
    if (!action) return

    if (action === 'quit_fame') {
      ;(this.state as unknown as { quitFameCareer: () => void }).quitFameCareer()
      refToast('Şöhret kariyeri bırakıldı', 'ok')
      return
    }
    if (action.startsWith('start_fame:')) {
      const type = action.split(':')[1] as FameCareerType
      const ok = (this.state as unknown as { startFameCareer: (t: FameCareerType) => boolean }).startFameCareer(type)
      refToast(ok ? '🌟 Kariyer başladı!' : 'Zaten aktif bir kariyer var', ok ? 'ok' : 'err')
      return
    }
    if (action.startsWith('fame_action:')) {
      const actionId = action.split(':')[1]!
      const ok = (this.state as unknown as { doFameAction: (id: string) => boolean }).doFameAction(actionId)
      refToast(ok ? '⭐ Aksiyon tamamlandı!' : '💸 Para yetersiz', ok ? 'ok' : 'err')
    }
  }
}
