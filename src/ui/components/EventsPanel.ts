import type { GameState } from '../../game/GameState'
import { currentTier, tierProgress, rewardForTier, SEASON_MAX_TIER } from '../../game/SeasonPass'

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

    const weeklySec = document.createElement('div')
    weeklySec.className = 'events-section'
    const def = state.getWeeklyEventDef()
    const w = state.weekly
    weeklySec.innerHTML = `<h3>🗓️ ${def.name}</h3><p>${def.description}</p>`
    const wBar = document.createElement('div')
    wBar.className = 'progress-bar'
    const wFill = document.createElement('div')
    wFill.className = 'progress-fill'
    wFill.style.width = `${Math.min(100, (w.progress / w.target) * 100)}%`
    wBar.appendChild(wFill)
    weeklySec.appendChild(wBar)
    if (w.progress >= w.target && !w.claimed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary'
      btn.dataset.action = 'claim-weekly'
      btn.textContent = 'Haftalık ödülü topla'
      weeklySec.appendChild(btn)
    }
    const adWeekly = document.createElement('button')
    adWeekly.type = 'button'
    adWeekly.className = 'btn-ad'
    adWeekly.dataset.action = 'ad-weekly'
    adWeekly.textContent = '📺 Etkinlik 2x (reklam)'
    weeklySec.appendChild(adWeekly)

    const seasonSec = document.createElement('div')
    seasonSec.className = 'events-section season-section'
    const prog = tierProgress(state.season.xp)
    seasonSec.innerHTML = `<h3>👑 İmparatorluk Yolu</h3><p>Tier ${prog.tier}/${SEASON_MAX_TIER} — ${prog.current}/${prog.needed} XP</p>`
    const sBar = document.createElement('div')
    sBar.className = 'progress-bar'
    const sFill = document.createElement('div')
    sFill.className = 'progress-fill season-fill'
    sFill.style.width = `${prog.pct}%`
    sBar.appendChild(sFill)
    seasonSec.appendChild(sBar)

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
    seasonSec.appendChild(track)

    const adSeason = document.createElement('button')
    adSeason.type = 'button'
    adSeason.className = 'btn-ad'
    adSeason.dataset.action = 'ad-season-xp'
    adSeason.textContent = '📺 Sezon XP 2x'
    seasonSec.appendChild(adSeason)

    if (Date.now() < state.stock.marketEventUntil) {
      const market = document.createElement('div')
      market.className = 'market-event-banner'
      market.textContent = state.stock.marketEventMult < 0
        ? '📉 Piyasa çöküşü aktif!'
        : '📈 Piyasa rallisi aktif!'
      this.root.appendChild(market)
    }

    this.root.append(weeklySec, seasonSec)
  }
}
