import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { currentTier, tierProgress, rewardForTier, SEASON_MAX_TIER } from '../../game/SeasonPass'
import { dailyGoalProgress, DAILY_GOAL_TARGET } from '../../game/DailyGoal'

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

    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned))
    const dailyHero = document.createElement('div')
    dailyHero.className = 'events-hero events-hero-daily'
    dailyHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">🎯</span>
        <div class="events-hero-text">
          <strong>Günlük hedef</strong>
          <small>${formatMoney(state.dailyGoalEarned)} / ${formatMoney(DAILY_GOAL_TARGET)}</small>
        </div>
        <span class="events-hero-stat">${goalPct}%</span>
      </div>
    `
    const dailyBar = document.createElement('div')
    dailyBar.className = 'progress-bar events-hero-bar'
    const dailyFill = document.createElement('div')
    dailyFill.className = 'progress-fill'
    dailyFill.style.width = `${goalPct}%`
    dailyBar.appendChild(dailyFill)
    dailyHero.appendChild(dailyBar)

    const heat = state.illegalHeat
    const hasIllegal = heat > 0 || state.illegalIncomePerSecond() > 0
    if (hasIllegal) {
      const heatWarn = document.createElement('div')
      heatWarn.className = `events-heat-banner${heat >= 55 ? ' heat-alert' : ''}`
      heatWarn.innerHTML = `
        <span>🕶️ Radar: ${state.illegalRiskLabel()} (${Math.round(heat)}%)</span>
        <small>Illegal gelir arttıkça baskın riski yükselir</small>
      `
      this.root.appendChild(heatWarn)
    }

    if (Date.now() < state.stock.marketEventUntil) {
      const market = document.createElement('div')
      market.className = 'market-event-banner'
      market.textContent = state.stock.marketEventMult < 0
        ? '📉 Piyasa çöküşü aktif!'
        : '📈 Piyasa rallisi aktif!'
      this.root.appendChild(market)
    }

    const def = state.getWeeklyEventDef()
    const w = state.weekly
    const wPct = Math.min(100, (w.progress / w.target) * 100)
    const weeklyHero = document.createElement('div')
    weeklyHero.className = 'events-hero events-hero-weekly'
    weeklyHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">🗓️</span>
        <div class="events-hero-text">
          <strong>${def.name}</strong>
          <small>${def.description}</small>
        </div>
        <span class="events-hero-stat">${Math.floor(wPct)}%</span>
      </div>
    `
    const wBar = document.createElement('div')
    wBar.className = 'progress-bar events-hero-bar'
    const wFill = document.createElement('div')
    wFill.className = 'progress-fill'
    wFill.style.width = `${wPct}%`
    wBar.appendChild(wFill)
    weeklyHero.appendChild(wBar)

    const weeklyActions = document.createElement('div')
    weeklyActions.className = 'events-actions'
    if (w.progress >= w.target && !w.claimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'claim-weekly'
      btn.textContent = 'Haftalık ödülü topla'
      weeklyActions.appendChild(btn)
    }
    const adWeekly = document.createElement('button')
    adWeekly.type = 'button'
    adWeekly.className = 'btn-ad'
    adWeekly.dataset.action = 'ad-weekly'
    adWeekly.textContent = '📺 Etkinlik 2x'
    weeklyActions.appendChild(adWeekly)
    weeklyHero.appendChild(weeklyActions)

    const prog = tierProgress(state.season.xp)
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
    const sBar = document.createElement('div')
    sBar.className = 'progress-bar events-hero-bar'
    const sFill = document.createElement('div')
    sFill.className = 'progress-fill season-fill'
    sFill.style.width = `${prog.pct}%`
    sBar.appendChild(sFill)
    seasonHero.appendChild(sBar)

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
    adSeason.textContent = '📺 Sezon XP 2x'
    seasonHero.appendChild(adSeason)

    this.root.append(dailyHero, weeklyHero, seasonHero)
  }
}
