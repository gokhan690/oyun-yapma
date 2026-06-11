import { fmtMoney, starsHtml, ua } from './refShared'
import type { RefPage } from './RefApp'
import type { RefViewModel } from './refAppDataAdapter'
import type { GameState } from '../../game/GameState'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import { RefKpiStrip, type KpiItem } from './RefKpiStrip'

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

  constructor(vm?: RefViewModel, state?: GameState) {
    this.vm = vm

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-profile-page'

    // ── Hero card ──
    this.el.appendChild(this.buildHero(vm))

    // ── KPI strip ──
    this.kpiStrip = new RefKpiStrip(this.buildKpis(vm, state))
    this.el.appendChild(this.kpiStrip.el)

    // ── Kişisel bilgiler ──
    this.el.appendChild(this.buildPersonalInfo(state))

    // ── Achievements button ──
    const achBtn = document.createElement('button')
    achBtn.className = 'ref-profile-ach-btn'
    achBtn.type = 'button'
    achBtn.innerHTML = '🏆 Başarımlar & Rozetler'
    achBtn.addEventListener('click', () => this.onOpenAchievements?.())
    this.el.appendChild(achBtn)
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
        <div class="ref-profile-title" data-ref="title">${vm?.player.title ?? 'Holding YK Başkanı'}</div>
        <div class="ref-profile-meta">
          <span class="ref-profile-meta-chip" data-ref="age">🎂 ${vm?.player.age ?? 34} yaş</span>
          <span class="ref-profile-meta-chip" data-ref="city">📍 ${vm?.player.city ?? 'İstanbul'}</span>
        </div>
        <div class="ref-stars ref-profile-stars">${starsHtml(4)}</div>
      </div>
    `

    this.nameEl = hero.querySelector('[data-ref="name"]')!
    this.titleEl = hero.querySelector('[data-ref="title"]')!
    this.ageEl = hero.querySelector('[data-ref="age"]')!
    this.cityEl = hero.querySelector('[data-ref="city"]')!
    return hero
  }

  private buildKpis(vm?: RefViewModel, state?: GameState): KpiItem[] {
    const cash = vm?.dashboard.cash ?? state?.money ?? 0
    const income = vm?.dashboard.dailyIncome ?? 0
    const rep = vm?.dashboard.reputation ?? 0
    const netWorth = vm?.dashboard.netWorth ?? 0
    return [
      { icon: '💰', label: 'Nakit', value: fmtMoney(cash), sub: fmtMoney(income) + '/gün', subDir: 'up' },
      { icon: '🏆', label: 'Net Değer', value: fmtMoney(netWorth) },
      { icon: '⭐', label: 'İtibar', value: String(rep), sub: vm?.dashboard.reputationLabel ?? '' },
      { icon: '🏢', label: 'Şirket', value: String(vm?.dashboard.firmCount ?? 0), sub: `${vm?.dashboard.cityCount ?? 1} şehir` },
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

  refresh(state: GameState): void {
    const vm = this.vm

    // KPI strip patch-only
    this.kpiStrip.update(this.buildKpis(vm, state))

    // Hero fields
    if (vm) {
      this.nameEl.textContent = vm.player.name
      this.titleEl.textContent = vm.player.title
      this.ageEl.textContent = `🎂 ${vm.player.age} yaş`
      this.cityEl.textContent = `📍 ${vm.player.city}`
    }

    // Status fields (patch text only)
    const health = Math.round((state as unknown as { health?: { health?: number } })?.health?.health ?? 100)
    const karma = (state as unknown as { karma?: number })?.karma ?? 0
    if (this.healthEl) this.healthEl.textContent = `${health}%`
    if (this.karmaEl) this.karmaEl.textContent = `${karma >= 0 ? '+' : ''}${karma}`
  }
}
