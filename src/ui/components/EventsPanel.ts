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

    if (state.isSurpriseInvestorActive()) {
      const inv = document.createElement('div')
      inv.className = 'market-event-banner surprise-investor-banner'
      inv.textContent = '💎 Sürpriz yatırımcı aktif — gelir x2!'
      this.root.appendChild(inv)
    }

    const target = state.dailyGoalTarget()
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, target))
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
    const dailyBar = document.createElement('div')
    dailyBar.className = 'progress-bar events-hero-bar'
    const dailyFill = document.createElement('div')
    dailyFill.className = 'progress-fill'
    dailyFill.style.width = `${goalPct}%`
    dailyBar.appendChild(dailyFill)
    dailyHero.appendChild(dailyBar)

    const dailyActions = document.createElement('div')
    dailyActions.className = 'events-actions'
    if (state.dailyGoalEarned >= target && !state.dailyGoalClaimed) {
      const claim = document.createElement('button')
      claim.type = 'button'
      claim.className = 'btn-primary'
      claim.dataset.action = 'claim-daily-goal'
      claim.textContent = 'Günlük hedefi topla'
      dailyActions.appendChild(claim)
    }
    if (state.canClaimDaily()) {
      const dailyBtn = document.createElement('button')
      dailyBtn.type = 'button'
      dailyBtn.className = 'btn-secondary'
      dailyBtn.dataset.action = 'daily'
      dailyBtn.textContent = '🎁 Günlük ödül'
      dailyActions.appendChild(dailyBtn)
    }
    dailyHero.appendChild(dailyActions)

    const heat = state.illegalHeat
    if (heat > 0 || state.illegalIncomePerSecond() > 0) {
      const heatWarn = document.createElement('div')
      heatWarn.className = `events-heat-banner${heat >= 55 ? ' heat-alert' : ''}`
      heatWarn.innerHTML = `
        <span>🕶️ Radar: ${state.illegalRiskLabel()} (${Math.round(heat)}%)</span>
        <small>Underground menüsünden heat temizleyebilirsin</small>
      `
      const cleanBtn = document.createElement('button')
      cleanBtn.type = 'button'
      cleanBtn.className = 'btn-secondary btn-sm'
      cleanBtn.dataset.action = 'open-underground'
      cleanBtn.textContent = 'Temizle'
      heatWarn.appendChild(cleanBtn)
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

    const def = getWeeklyDef(state.weekly)
    const w = state.weekly
    const wPct = Math.min(100, (w.progress / w.target) * 100)
    const bonusPct = def.bonus ? Math.round(def.bonus * 100) : 0
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
    const trackWrap = document.createElement('div')
    trackWrap.className = 'season-dual-track'
    const freeLabel = document.createElement('span')
    freeLabel.className = 'season-track-label'
    freeLabel.textContent = 'Ücretsiz'
    trackWrap.appendChild(freeLabel)

    const sBar = document.createElement('div')
    sBar.className = 'progress-bar events-hero-bar'
    const sFill = document.createElement('div')
    sFill.className = 'progress-fill season-fill'
    sFill.style.width = `${prog.pct}%`
    sBar.appendChild(sFill)
    seasonHero.appendChild(sBar)

    const premiumLabel = document.createElement('span')
    premiumLabel.className = 'season-track-label season-track-premium'
    premiumLabel.textContent = 'Premium (yakında)'
    trackWrap.appendChild(premiumLabel)
    seasonHero.appendChild(trackWrap)

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

    const missionsSection = this.renderMissions(state)

    this.root.append(dailyHero, weeklyHero, seasonHero, missionsSection)
  }

  private renderMissions(state: GameState): HTMLElement {
    state.ensureMissions()
    const section = document.createElement('div')
    section.className = 'events-missions-section'
    const title = document.createElement('h3')
    title.textContent = 'Günlük Görevler'
    section.appendChild(title)
    const ready = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length
    const summary = document.createElement('p')
    summary.className = 'events-missions-summary'
    summary.textContent = `${ready} hazır · ${state.missions.filter((m) => m.claimed).length}/${state.missions.length} tamam`
    section.appendChild(summary)
    const sorted = [...state.missions].sort((a, b) => {
      const aReady = a.progress >= a.target && !a.claimed ? 1 : 0
      const bReady = b.progress >= b.target && !b.claimed ? 1 : 0
      return bReady - aReady
    })
    for (const m of sorted) {
      const pct = (m.progress / m.target) * 100
      const card = document.createElement('div')
      card.className = `events-mission-card${m.claimed ? ' claimed' : ''}${m.progress >= m.target && !m.claimed ? ' ready' : ''}`
      card.innerHTML = `<strong>${m.label}</strong><small>${Math.floor(m.progress)}/${m.target}</small>`
      const bar = document.createElement('div')
      bar.className = 'progress-bar events-hero-bar'
      const fill = document.createElement('div')
      fill.className = 'progress-fill'
      fill.style.width = `${pct}%`
      bar.appendChild(fill)
      card.appendChild(bar)
      if (m.progress >= m.target && !m.claimed) {
        const claim = document.createElement('button')
        claim.type = 'button'
        claim.className = 'btn-primary btn-sm'
        claim.dataset.action = 'claim-mission'
        claim.dataset.id = m.id
        claim.textContent = 'Topla'
        card.appendChild(claim)
      }
      section.appendChild(card)
    }
    return section
  }
}
