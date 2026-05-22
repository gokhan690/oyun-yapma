import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { dailyGoalProgress } from '../../game/DailyGoal'
import { currentTier, tierProgress, rewardForTier, SEASON_MAX_TIER } from '../../game/SeasonPass'
import { getWeeklyDef } from '../../game/WeeklyEvent'

export class EventsPanel {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'events-panel'
    this.root.hidden = true
  }

  render(state: GameState): void {
    state.ensureSeason()
    this.root.replaceChildren()

    const header = document.createElement('div')
    header.className = 'events-panel-header'
    header.innerHTML = '<h2>🎪 Etkinlikler</h2><p>Günlük hedefler, haftalık bonuslar ve sezon ödülleri</p>'
    this.root.appendChild(header)

    if (state.isSurpriseInvestorActive()) {
      this.root.appendChild(this.banner('💎 Sürpriz yatırımcı aktif — tüm gelir x2!', 'surprise-investor-banner'))
    }

    const headline = state.currentMarketHeadline()
    if (headline) {
      this.root.appendChild(this.banner(`📰 ${headline}`, 'market-news-banner'))
    }

    if (Date.now() < state.stock.marketEventUntil) {
      this.root.appendChild(this.banner(
        state.stock.marketEventMult < 0 ? '📉 Borsa çöküşü — fiyatlar düşüyor!' : '📈 Borsa rallisi — fiyatlar yükseliyor!',
        'market-event-banner',
      ))
    }

    const heat = state.illegalHeat
    if (heat > 0 || state.illegalIncomePerDay() > 0) {
      const heatWarn = document.createElement('div')
      heatWarn.className = `events-heat-banner${heat >= 55 ? ' heat-alert' : ''}`
      heatWarn.innerHTML = `
        <div>
          <strong>🕶️ Radar: ${state.illegalRiskLabel()}</strong>
          <small>${Math.round(heat)}% — Underground menüsünden temizleyebilirsin</small>
        </div>
      `
      const cleanBtn = document.createElement('button')
      cleanBtn.type = 'button'
      cleanBtn.className = 'btn-secondary btn-sm'
      cleanBtn.dataset.action = 'open-underground'
      cleanBtn.textContent = 'Temizle'
      heatWarn.appendChild(cleanBtn)
      this.root.appendChild(heatWarn)
    }

    this.root.appendChild(this.renderDaily(state))
    this.root.appendChild(this.renderWeekly(state))
    this.root.appendChild(this.renderSeason(state))
    this.root.appendChild(this.renderMissions(state))
  }

  private banner(text: string, className: string): HTMLElement {
    const el = document.createElement('div')
    el.className = `events-banner ${className}`
    el.textContent = text
    return el
  }

  private renderDaily(state: GameState): HTMLElement {
    const target = state.dailyGoalTarget()
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, target))
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-daily'

    const dailyHero = document.createElement('div')
    dailyHero.className = 'events-hero events-hero-daily'
    dailyHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">🎯</span>
        <div class="events-hero-text">
          <strong>Günlük hedef</strong>
          <small>${formatMoney(state.dailyGoalEarned)} / ${formatMoney(target)}</small>
          <small class="events-streak-line">🔥 Giriş serisi: ${state.dailyStreak} gün</small>
        </div>
        <span class="events-hero-stat">${goalPct}%</span>
      </div>
    `
    dailyHero.appendChild(this.progressBar(goalPct))
    wrap.appendChild(dailyHero)

    const dailyActions = document.createElement('div')
    dailyActions.className = 'events-actions'
    if (state.dailyGoalEarned >= target && !state.dailyGoalClaimed) {
      dailyActions.appendChild(this.actionBtn('claim-daily-goal', 'Günlük hedefi topla', 'btn-primary'))
    }
    if (state.canClaimDaily()) {
      dailyActions.appendChild(this.actionBtn('daily', '🎁 Günlük ödül', 'btn-secondary'))
    }
    wrap.appendChild(dailyActions)
    return wrap
  }

  private renderWeekly(state: GameState): HTMLElement {
    const def = getWeeklyDef(state.weekly)
    const w = state.weekly
    const wPct = Math.min(100, (w.progress / w.target) * 100)
    const bonusPct = def.bonus ? Math.round(def.bonus * 100) : 0
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-weekly'

    const weeklyHero = document.createElement('div')
    weeklyHero.className = 'events-hero events-hero-weekly'
    weeklyHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">🗓️</span>
        <div class="events-hero-text">
          <strong>${def.name}</strong>
          <small>${def.description}</small>
          ${bonusPct > 0 ? `<span class="events-bonus-chip">Bu hafta +${bonusPct}% bonus</span>` : ''}
        </div>
        <span class="events-hero-stat">${Math.floor(wPct)}%</span>
      </div>
    `
    weeklyHero.appendChild(this.progressBar(wPct))
    wrap.appendChild(weeklyHero)

    const weeklyActions = document.createElement('div')
    weeklyActions.className = 'events-actions'
    if (w.progress >= w.target && !w.claimed) {
      weeklyActions.appendChild(this.actionBtn('claim-weekly', 'Haftalık ödülü topla', 'btn-primary'))
    }
    weeklyActions.appendChild(this.actionBtn('ad-weekly', '📺 Etkinlik 2x (reklam)', 'btn-ad'))
    wrap.appendChild(weeklyActions)
    return wrap
  }

  private renderSeason(state: GameState): HTMLElement {
    const prog = tierProgress(state.season.xp)
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-season'

    const seasonHero = document.createElement('div')
    seasonHero.className = 'events-hero events-hero-season'
    seasonHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">👑</span>
        <div class="events-hero-text">
          <strong>İmparatorluk Yolu</strong>
          <small>Tier ${prog.tier}/${SEASON_MAX_TIER} — ${prog.current}/${prog.needed} XP</small>
        </div>
        <span class="events-hero-stat">T${prog.tier}</span>
      </div>
    `
    seasonHero.appendChild(this.progressBar(prog.pct))

    const track = document.createElement('div')
    track.className = 'season-track'
    const tier = currentTier(state.season.xp)
    for (let i = 1; i <= Math.min(SEASON_MAX_TIER, tier + 3); i++) {
      const node = document.createElement('div')
      node.className = 'season-node'
      if (i <= tier) node.classList.add('unlocked')
      if (state.season.claimedTiers.includes(i)) node.classList.add('claimed')
      const rw = rewardForTier(i)
      node.innerHTML = `<span>${i}</span><small>${rw.label}</small>`
      if (i <= tier && !state.season.claimedTiers.includes(i)) {
        const claim = document.createElement('button')
        claim.type = 'button'
        claim.className = 'season-claim-btn'
        claim.dataset.action = 'claim-season'
        claim.dataset.id = String(i)
        claim.textContent = 'Topla'
        node.appendChild(claim)
      }
      track.appendChild(node)
    }
    seasonHero.appendChild(track)

    const adSeason = document.createElement('button')
    adSeason.type = 'button'
    adSeason.className = 'btn-ad'
    adSeason.dataset.action = 'ad-season-xp'
    adSeason.textContent = '📺 Sezon XP 2x (reklam)'
    seasonHero.appendChild(adSeason)
    wrap.appendChild(seasonHero)
    return wrap
  }

  private renderMissions(state: GameState): HTMLElement {
    state.ensureMissions()
    const section = document.createElement('section')
    section.className = 'events-block events-missions-section'
    const title = document.createElement('h3')
    title.textContent = '📋 Günlük Görevler'
    section.appendChild(title)
    const ready = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length
    const summary = document.createElement('p')
    summary.className = 'events-missions-summary'
    summary.textContent = `${ready} hazır · ${state.missions.filter((m) => m.claimed).length}/${state.missions.length} tamamlandı`
    section.appendChild(summary)
    const sorted = [...state.missions].sort((a, b) => {
      const aReady = a.progress >= a.target && !a.claimed ? 1 : 0
      const bReady = b.progress >= b.target && !b.claimed ? 1 : 0
      return bReady - aReady
    })
    const list = document.createElement('div')
    list.className = 'events-missions-list'
    for (const m of sorted) {
      const pct = Math.min(100, (m.progress / m.target) * 100)
      const card = document.createElement('div')
      card.className = `events-mission-card${m.claimed ? ' claimed' : ''}${m.progress >= m.target && !m.claimed ? ' ready' : ''}`
      card.innerHTML = `<div class="events-mission-head"><strong>${m.label}</strong><small>${Math.floor(m.progress)}/${m.target}</small></div>`
      card.appendChild(this.progressBar(pct))
      if (m.progress >= m.target && !m.claimed) {
        card.appendChild(this.actionBtn('claim-mission', 'Topla', 'btn-primary btn-sm', m.id))
      }
      list.appendChild(card)
    }
    section.appendChild(list)
    return section
  }

  private progressBar(pct: number): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'progress-bar events-hero-bar'
    const fill = document.createElement('div')
    fill.className = 'progress-fill'
    fill.style.width = `${pct}%`
    bar.appendChild(fill)
    return bar
  }

  private actionBtn(action: string, label: string, className: string, id?: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = className
    btn.dataset.action = action
    if (id) btn.dataset.id = id
    btn.textContent = label
    return btn
  }
}
