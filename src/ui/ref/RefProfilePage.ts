import { fmtMoney, ua, backRow } from './refShared'
import type { RefPage } from './RefApp'
import type { RefViewModel } from './refAppDataAdapter'
import { playerVMFromState } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { CAREER_JOBS } from '../../game/Career'
import { ACHIEVEMENTS } from '../../game/Achievements'

export class RefProfilePage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'PROFİL'
  readonly titleDeco = '👤'

  onOpenAchievements?: () => void
  onBack?: () => void

  private kpiStrip: RefKpiStrip
  private nameEl!: HTMLElement
  private titleEl!: HTMLElement
  private ageEl!: HTMLElement
  private cityEl!: HTMLElement
  private healthEl!: HTMLElement
  private karmaEl!: HTMLElement
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

    // ── Achievements button (sağda görünür sayaç badge'i) ──
    const achBtn = document.createElement('button')
    achBtn.className = 'ref-profile-ach-btn'
    achBtn.type = 'button'
    const doneInit = state ? ACHIEVEMENTS.filter(a => state.achievements.has(a.id)).length : 0
    achBtn.innerHTML = `<span class="ref-profile-ach-btn__txt">🏆 Başarımlar & Rozetler</span><span class="ref-profile-ach-badge" data-ref="achcount">${doneInit}/${ACHIEVEMENTS.length}</span>`
    achBtn.addEventListener('click', () => this.onOpenAchievements?.())
    this.el.appendChild(achBtn)
    if (state) this.achHintEl = achBtn.querySelector('[data-ref="achcount"]') as HTMLElement
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
          <span class="ref-profile-meta-chip" data-ref="age">🎂 ${vm?.player.age ?? 34} yaş</span>
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
    // TEK KAYNAK: canlı state öncelikli — vm açılışta bir kez kurulur, bayatlar
    const cash      = state ? Math.round(state.money) : vm?.dashboard.cash ?? 0
    const income    = state ? Math.round(state.incomePerDay()) : vm?.dashboard.dailyIncome ?? 0
    const netWorth  = state ? Math.round(state.financeNetWorth()) : vm?.dashboard.netWorth ?? 0
    const rep       = state ? Math.round(state.reputation) : vm?.dashboard.reputation ?? 0
    const firmCount = state ? Object.values(state.producers).filter(c => c > 0).length : vm?.dashboard.firmCount ?? 0
    const cityCount = state ? state.cities.unlocked.length : vm?.dashboard.cityCount ?? 1
    const repLabel  = vm?.dashboard.reputationLabel ?? ''
    const incomeItem: KpiItem = income > 0
      ? { icon: '💰', label: 'Nakit', value: fmtMoney(cash), sub: fmtMoney(income) + '/gün', subDir: 'up' }
      : { icon: '💰', label: 'Nakit', value: fmtMoney(cash), sub: 'Günlük gelir: ₺0', subDir: 'muted' }
    return [
      incomeItem,
      { icon: '🏆', label: 'Net Değer', value: fmtMoney(netWorth) },
      { icon: '⭐', label: 'İtibar', value: String(rep), sub: repLabel ? `Durum: ${repLabel}` : '', subDir: 'muted' },
      { icon: '🏢', label: 'İMPARATORLUK', value: `${firmCount} şirket`, sub: `${cityCount} şehir`, subDir: 'muted' },
    ]
  }

  private buildPersonalInfo(state?: GameState): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-profile-info-section'

    const health = (state as unknown as { health?: { health?: number } })?.health?.health ?? 100
    const karma = (state as unknown as { karma?: number })?.karma ?? 0
    const stress = (state as unknown as { stress?: number })?.stress ?? 0

    wrap.innerHTML = `
      <div class="ref-profile-info-title">Durum</div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">❤️ Sağlık</span>
        <span class="ref-profile-stat-val" data-ref="health">${Math.round(health)}%</span>
      </div>
      <div class="ref-perf-track sm">
        <div class="ref-perf-fill ${health >= 70 ? 'high' : health >= 40 ? 'medium' : 'low'}" style="width:${Math.round(health)}%"></div>
      </div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">😰 Stres</span>
        <span class="ref-profile-stat-val">${Math.round(stress)}%</span>
      </div>
      <div class="ref-perf-track sm">
        <div class="ref-perf-fill ${stress >= 70 ? 'low' : stress >= 45 ? 'medium' : 'high'}" style="width:${Math.round(stress)}%"></div>
      </div>
      <div class="ref-profile-stat-row ref-profile-karma">
        <span class="ref-profile-stat-lbl">${karma >= 0 ? '😇' : '😈'} Karma</span>
        <span class="ref-profile-stat-val ref-karma-val" data-ref="karma">${karma >= 0 ? '+' : ''}${karma}</span>
      </div>
    `

    this.healthEl = wrap.querySelector('[data-ref="health"]')!
    this.karmaEl = wrap.querySelector('[data-ref="karma"]')!
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
        <div class="ref-profile-info-title">Kariyer</div>
        <div class="ref-profile-stat-row">
          <span class="ref-profile-stat-lbl">Durum</span>
          <span class="ref-profile-stat-val">Girişimci</span>
        </div>
        <div class="ref-profile-career-hint">${hint}</div>`
    }
    if (jobId) {
      const job = CAREER_JOBS.find(j => j.id === jobId)
      const name = job ? `${job.emoji} ${job.name}` : jobId
      const rawPct = xpToNext > 0 ? Math.round((xp / xpToNext) * 100) : 0
      const pct = Math.max(0, Math.min(100, rawPct))
      return `
        <div class="ref-profile-info-title">Kariyer</div>
        <div class="ref-profile-stat-row">
          <span class="ref-profile-stat-lbl">Durum</span>
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
      <div class="ref-profile-info-title">Kariyer</div>
      <div class="ref-profile-stat-row">
        <span class="ref-profile-stat-lbl">Durum</span>
        <span class="ref-profile-stat-val">İşsiz</span>
      </div>
      <div class="ref-profile-career-hint">Henüz iş seçilmedi</div>`
  }

  refresh(state: GameState): void {
    const vm = this.vm

    // KPI strip patch-only
    this.kpiStrip.update(this.buildKpis(vm, state))

    // Hero fields — always live from state (vm.player.title bayatlar)
    const livePlayer = playerVMFromState(state)
    this.nameEl.textContent = livePlayer.name
    this.titleEl.textContent = livePlayer.title
    this.ageEl.textContent = `🎂 ${livePlayer.age} yaş`
    this.cityEl.textContent = `📍 ${livePlayer.city}`

    // Status fields (patch text only)
    const health = Math.round((state as unknown as { health?: { health?: number } })?.health?.health ?? 100)
    const karma = (state as unknown as { karma?: number })?.karma ?? 0
    if (this.healthEl) this.healthEl.textContent = `${health}%`
    if (this.karmaEl) this.karmaEl.textContent = `${karma >= 0 ? '+' : ''}${karma}`

    // Kariyer bölümü — signature değişince container yeniden render
    if (this.careerSectionEl) {
      const sig = this.careerSig(state)
      if (sig !== this.lastCareerSig) {
        this.lastCareerSig = sig
        this.careerSectionEl.innerHTML = this.careerInfoHtml(state)
      }
    }

    // Başarım sayacı badge patch
    if (this.achHintEl) {
      const done = ACHIEVEMENTS.filter(a => state.achievements.has(a.id)).length
      this.achHintEl.textContent = `${done}/${ACHIEVEMENTS.length}`
    }
  }
}
