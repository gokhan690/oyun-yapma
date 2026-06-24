import { fmtMoney, ua, backRow } from './refShared'
import type { RefPage } from './RefApp'
import type { RefViewModel } from './refAppDataAdapter'
import { playerVMFromState } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { CAREER_JOBS } from '../../game/Career'
import { ACHIEVEMENTS } from '../../game/Achievements'
import { reputationLabel } from '../../game/Reputation'
import { i18n } from '../../i18n'

export class RefProfilePage implements RefPage {
  readonly el: HTMLElement
  get title() { return i18n.t('ref_profile_title') }
  readonly titleDeco = '👤'

  onOpenAchievements?: () => void
  onBack?: () => void
  onSettings?: () => void

  private kpiStrip: RefKpiStrip
  private nameEl!: HTMLElement
  private titleEl!: HTMLElement
  private ageEl!: HTMLElement
  private cityEl!: HTMLElement
  private healthTextEl!: HTMLElement
  private healthBarEl!: HTMLElement
  private stressTextEl!: HTMLElement
  private stressBarEl!: HTMLElement
  private karmaEmojiEl!: HTMLElement
  private karmaTextEl!: HTMLElement
  private vm?: RefViewModel
  private careerSectionEl?: HTMLElement
  private achHintEl?: HTMLElement
  private lastCareerSig = ''

  constructor(vm?: RefViewModel, state?: GameState) {
    this.vm = vm

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-profile-page'

    // ── Geri ──
    this.el.appendChild(backRow(() => this.onBack?.()))

    // ── Hero card ──
    this.el.appendChild(this.buildHero(vm))

    // ── KPI strip ──
    this.kpiStrip = new RefKpiStrip(this.buildKpis(vm, state))
    this.el.appendChild(this.kpiStrip.el)

    // ── Kişisel bilgiler ──
    this.el.appendChild(this.buildPersonalInfo(state))

    // ── Kariyer bölümü ──
    if (state) {
      const careerSection = document.createElement('div')
      careerSection.className = 'ref-profile-info-section ref-profile-career-section'
      careerSection.innerHTML = this.careerInfoHtml(state)
      this.careerSectionEl = careerSection
      this.lastCareerSig = this.careerSig(state)
      this.el.appendChild(careerSection)
    }

    // ── Achievements button ──
    const achBtn = document.createElement('button')
    achBtn.className = 'ref-profile-ach-btn'
    achBtn.type = 'button'
    const doneInit = state ? ACHIEVEMENTS.filter(a => state.achievements.has(a.id)).length : 0
    achBtn.innerHTML = `<span class="ref-profile-ach-btn__txt">${i18n.t('ref_profile_achievements')}</span><span class="ref-profile-ach-badge" data-ref="achcount">${doneInit}/${ACHIEVEMENTS.length}</span>`
    achBtn.addEventListener('click', () => this.onOpenAchievements?.())
    this.el.appendChild(achBtn)
    if (state) this.achHintEl = achBtn.querySelector('[data-ref="achcount"]') as HTMLElement

    // ── Settings button ──
    const settingsBtn = document.createElement('button')
    settingsBtn.className = 'ref-profile-settings-btn'
    settingsBtn.type = 'button'
    settingsBtn.textContent = i18n.t('ref_settings_btn')
    settingsBtn.addEventListener('click', () => this.onSettings?.())
    this.el.appendChild(settingsBtn)
  }

  private buildHero(vm?: RefViewModel): HTMLElement {
    const hero = document.createElement('div')
    hero.className = 'ref-profile-hero'

    const avatarSrc = vm?.player.avatarAsset ?? REF_ASSETS_V2_GENERIC.avatars.mainBusinessman
    hero.innerHTML = `
      <div class="ref-profile-avatar-wrap">
        <img src="${ua(avatarSrc)}" alt="" class="ref-profile-avatar">
        <div class="ref-profile-avatar-ring"></div>
      </div>
      <div class="ref-profile-hero-info">
        <div class="ref-profile-name" data-ref="name">${vm?.player.name ?? 'Mert Karahan'}</div>
        <div class="ref-profile-hero-rank-label">GENEL UNVAN</div>
        <div class="ref-profile-title" data-ref="title">${vm?.player.title ?? 'Holding YK Başkanı'}</div>
        <div class="ref-profile-meta">
          <span class="ref-profile-meta-chip" data-ref="age">🎂 ${vm?.player.age ?? 34} ${i18n.t('ref_age_suffix')}</span>
          <span class="ref-profile-meta-chip" data-ref="city">📍 ${vm?.player.city ?? 'İstanbul'}</span>
        </div>
      </div>
    `

    this.nameEl = hero.querySelector('[data-ref="name"]')!
    this.titleEl = hero.querySelector('[data-ref="title"]')!
    this.ageEl = hero.querySelector('[data-ref="age"]')!
    this.cityEl = hero.querySelector('[data-ref="city"]')!
    return hero
  }

  private buildKpis(vm?: RefViewModel, state?: GameState): KpiItem[] {
    const cash      = state ? Math.round(state.money) : vm?.dashboard.cash ?? 0
    const income    = state ? Math.round(state.incomePerDay()) : vm?.dashboard.dailyIncome ?? 0
    const netWorth  = state ? Math.round(state.financeNetWorth()) : vm?.dashboard.netWorth ?? 0
    const rep       = state ? Math.round(state.reputation) : vm?.dashboard.reputation ?? 0
    const firmCount = state ? Object.values(state.producers).filter(c => c > 0).length : vm?.dashboard.firmCount ?? 0
    const cityCount = state ? state.cities.unlocked.length : vm?.dashboard.cityCount ?? 1
    const repLbl    = state ? reputationLabel(state.reputation) : (vm?.dashboard.reputationLabel ?? '')
    const incomeItem: KpiItem = income > 0
      ? { icon: '💰', label: i18n.t('ref_profile_cash'), value: fmtMoney(cash), sub: fmtMoney(income) + i18n.t('ref_profile_daily_income'), subDir: 'up' }
      : { icon: '💰', label: i18n.t('ref_profile_cash'), value: fmtMoney(cash), sub: `${i18n.t('ref_daily_income')}: ₺0`, subDir: 'muted' }
    return [
      incomeItem,
      { icon: '🏆', label: i18n.t('ref_profile_net_worth'), value: fmtMoney(netWorth) },
      { icon: '⭐', label: i18n.t('ref_profile_reputation'), value: String(rep), sub: repLbl ? `${i18n.t('ref_profile_status')}: ${repLbl}` : '', subDir: 'muted' },
      { icon: '🏢', label: i18n.t('ref_profile_empire'), value: `${firmCount} ${i18n.t('ref_profile_firms')}`, sub: `${cityCount} ${i18n.t('ref_profile_cities')}`, subDir: 'muted' },
    ]
  }

  private buildPersonalInfo(state?: GameState): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-profile-info-section'

    const hp  = state ? Math.round(state.health.health) : 100
    const st  = state ? Math.round(state.lifestyle.stress) : 0
    const karma = state ? state.karma : 0

    wrap.innerHTML = `
      <div class="ref-profile-info-title">${i18n.t('ref_profile_status')}</div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">${i18n.t('ref_profile_health')}</span>
        <span class="ref-profile-stat-val" data-ref="healthText">${hp}%</span>
      </div>
      <div class="ref-perf-track sm">
        <div class="ref-perf-fill ${hp >= 70 ? 'high' : hp >= 40 ? 'medium' : 'low'}" data-ref="healthBar" style="width:${hp}%"></div>
      </div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">${i18n.t('ref_profile_stress')}</span>
        <span class="ref-profile-stat-val" data-ref="stressText">${st}%</span>
      </div>
      <div class="ref-perf-track sm">
        <div class="ref-perf-fill ${st >= 70 ? 'low' : st >= 45 ? 'medium' : 'high'}" data-ref="stressBar" style="width:${st}%"></div>
      </div>
      <div class="ref-profile-stat-row ref-profile-karma">
        <span class="ref-profile-stat-lbl" data-ref="karmaEmoji">${karma >= 0 ? '😇' : '😈'} ${i18n.t('ref_profile_karma')}</span>
        <span class="ref-profile-stat-val ref-karma-val" data-ref="karmaText">${karma >= 0 ? '+' : ''}${karma}</span>
      </div>
    `

    this.healthTextEl = wrap.querySelector('[data-ref="healthText"]')!
    this.healthBarEl  = wrap.querySelector('[data-ref="healthBar"]')!
    this.stressTextEl = wrap.querySelector('[data-ref="stressText"]')!
    this.stressBarEl  = wrap.querySelector('[data-ref="stressBar"]')!
    this.karmaEmojiEl = wrap.querySelector('[data-ref="karmaEmoji"]')!
    this.karmaTextEl  = wrap.querySelector('[data-ref="karmaText"]')!
    return wrap
  }

  private careerSig(s: GameState): string {
    const firmCount = Object.values(s.producers).filter(c => c > 0).length
    return [
      s.career.jobId ?? 'none',
      s.career.isEntrepreneur ? 1 : 0,
      s.career.level,
      s.career.xp,
      s.career.xpToNext,
      firmCount,
    ].join('|')
  }

  private careerInfoHtml(state: GameState): string {
    const { jobId, isEntrepreneur, level, xp, xpToNext } = state.career
    const firmCount = Object.values(state.producers).filter(c => c > 0).length
    if (isEntrepreneur) {
      const hint = firmCount > 0
        ? 'Gelir şirketlerinden geliyor · Şirketlerini büyüt'
        : 'Henüz şirketin yok · İlk şirketini kur'
      return `
        <div class="ref-profile-info-title">${i18n.t('ref_profile_career')}</div>
        <div class="ref-profile-stat-row">
          <span class="ref-profile-stat-lbl">${i18n.t('ref_profile_status')}</span>
          <span class="ref-profile-stat-val">${i18n.t('ref_profile_entrepreneur')}</span>
        </div>
        <div class="ref-profile-career-hint">${hint}</div>`
    }
    if (jobId) {
      const job = CAREER_JOBS.find(j => j.id === jobId)
      const name = job ? `${job.emoji} ${job.name}` : jobId
      const rawPct = xpToNext > 0 ? Math.round((xp / xpToNext) * 100) : 0
      const pct = Math.max(0, Math.min(100, rawPct))
      return `
        <div class="ref-profile-info-title">${i18n.t('ref_profile_career')}</div>
        <div class="ref-profile-stat-row">
          <span class="ref-profile-stat-lbl">${i18n.t('ref_profile_status')}</span>
          <span class="ref-profile-stat-val">${name}</span>
        </div>
        <div class="ref-profile-stat-row">
          <span class="ref-profile-stat-lbl">Seviye</span>
          <span class="ref-profile-stat-val">Lv.${level}</span>
        </div>
        <div class="ref-perf-track sm">
          <div class="ref-perf-fill high" style="width:${pct}%"></div>
        </div>
        <div class="ref-profile-career-hint">XP: ${xp} / ${xpToNext}</div>`
    }
    return `
      <div class="ref-profile-info-title">${i18n.t('ref_profile_career')}</div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">${i18n.t('ref_profile_status')}</span>
        <span class="ref-profile-stat-val">${i18n.t('ref_profile_jobless')}</span>
      </div>
      <div class="ref-profile-career-hint">${i18n.t('ref_career_no_job_selected')}</div>`
  }

  refresh(state: GameState): void {
    const vm = this.vm

    // KPI strip patch-only
    this.kpiStrip.update(this.buildKpis(vm, state))

    // Hero fields — always live from state
    const livePlayer = playerVMFromState(state)
    this.nameEl.textContent = livePlayer.name
    this.titleEl.textContent = livePlayer.title
    this.ageEl.textContent = `🎂 ${livePlayer.age} ${i18n.t('ref_age_suffix')}`
    this.cityEl.textContent = `📍 ${livePlayer.city}`

    // Status bars — patch in place
    const hp    = Math.round(state.health.health)
    const st    = Math.round(state.lifestyle.stress)
    const karma = state.karma

    this.healthTextEl.textContent = `${hp}%`
    this.healthBarEl.style.width  = `${hp}%`
    this.healthBarEl.className    = `ref-perf-fill ${hp >= 70 ? 'high' : hp >= 40 ? 'medium' : 'low'}`

    this.stressTextEl.textContent = `${st}%`
    this.stressBarEl.style.width  = `${st}%`
    this.stressBarEl.className    = `ref-perf-fill ${st >= 70 ? 'low' : st >= 45 ? 'medium' : 'high'}`

    this.karmaEmojiEl.textContent = `${karma >= 0 ? '😇' : '😈'} ${i18n.t('ref_profile_karma')}`
    this.karmaTextEl.textContent  = `${karma >= 0 ? '+' : ''}${karma}`

    // Kariyer bölümü
    if (this.careerSectionEl) {
      const sig = this.careerSig(state)
      if (sig !== this.lastCareerSig) {
        this.lastCareerSig = sig
        this.careerSectionEl.innerHTML = this.careerInfoHtml(state)
      }
    }

    // Başarım sayacı badge
    if (this.achHintEl) {
      const done = ACHIEVEMENTS.filter(a => state.achievements.has(a.id)).length
      this.achHintEl.textContent = `${done}/${ACHIEVEMENTS.length}`
    }
  }
}
