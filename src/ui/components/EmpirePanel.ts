import type { GameState } from '../../game/GameState'
import { formatMoney, formatIncomeRate, PRODUCERS } from '../../game/Economy'
import {
  leagueName,
  politicsLevelLabel,
  stadiumUpgradeCost,
  leagueUpgradeCost,
  lobbyCost,
  footballClubDef,
  footballIncomeBreakdown,
  leagueUpgradeRequirements,
  canUpgradeLeague,
} from '../../game/Empire'
import { formatGameClock, gameDay, gameYear } from '../../game/GameClock'

export type EmpireSection = 'football' | 'politics' | 'dark'

export class EmpirePanel {
  readonly root: HTMLElement
  private section: EmpireSection = 'football'

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'empire-panel tab-panel'
    this.root.hidden = true
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'empire-header'
    header.innerHTML = `
      <div class="empire-header-top">
        <h2>İmparatorluk Yönetimi</h2>
        <button type="button" class="btn-secondary btn-sm" data-action="close-empire-manage">✕ Kapat</button>
      </div>
      <p class="empire-sub">Satın aldığın varlıkları yönet, gücünü artır</p>
    `

    const tabs = document.createElement('div')
    tabs.className = 'empire-section-tabs'
    for (const [id, label] of [['football', '⚽ Spor'], ['politics', '🏛️ Siyaset'], ['dark', '🏭 Yeraltı']] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `empire-section-tab${id === 'football' ? ' active' : ''}`
      btn.dataset.action = 'empire-section'
      btn.dataset.id = id
      btn.textContent = label
      tabs.appendChild(btn)
    }

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'empire-content'

    this.root.append(header, tabs, this.contentEl)
  }

  private contentEl!: HTMLElement

  setSection(section: EmpireSection): void {
    this.section = section
    this.root.querySelectorAll('.empire-section-tab').forEach((node) => {
      const btn = node as HTMLButtonElement
      btn.classList.toggle('active', btn.dataset.id === section)
    })
  }

  render(state: GameState): void {
    this.contentEl.replaceChildren()
    const clock = formatGameClock(state.gameTimeMs)
    const year = gameYear(state.gameTimeMs)

    if (this.section === 'football') {
      this.renderFootball(state, clock)
    } else if (this.section === 'politics') {
      this.renderPolitics(state, year)
    } else {
      this.renderDark(state)
    }
  }

  private renderFootball(state: GameState, clock: string): void {
    if (state.empire.football.length === 0) {
      this.contentEl.innerHTML = `<div class="empire-empty"><span>⚽</span><p>Henüz futbol kulübün yok.</p><small>Mağaza → İmparatorluk → Spor'dan kulüp satın al.</small></div>`
      return
    }
    const meta = document.createElement('p')
    meta.className = 'empire-meta-line'
    meta.textContent = `📅 ${clock} · Günde 1 otomatik maç (5 sn = 1 oyun günü)`
    this.contentEl.appendChild(meta)

    for (const club of state.empire.football) {
      const def = footballClubDef(club.clubId)
      const breakdown = footballIncomeBreakdown(club)
      const req = leagueUpgradeRequirements(club)
      const canLeague = club.leagueLevel < 4
      const leagueReady = canUpgradeLeague(club)
      const card = document.createElement('div')
      card.className = 'shop-card empire-club-card'
      const stCost = stadiumUpgradeCost(club.stadiumLevel)
      const lgCost = leagueUpgradeCost(club.leagueLevel)

      const body = document.createElement('div')
      body.className = 'shop-card-body empire-club-body'
      body.innerHTML = `
        <strong>${def?.emoji ?? '⚽'} ${def?.name ?? club.clubId}</strong>
        <small>Lig: ${leagueName(club.leagueLevel)} · Taraftar: ${club.fanBase.toLocaleString('tr-TR')} · Galibiyet: ${club.wins}</small>
        <small>Stadyum Lv.${club.stadiumLevel} · Kapasite ~${breakdown.stadiumCapacity.toLocaleString('tr-TR')}</small>
        <small class="empire-income-breakdown">Gelir çarpanı x${breakdown.totalMult.toFixed(2)} · Lig +${Math.round(breakdown.leaguePct * 100)}% · Taraftar +${Math.round(breakdown.fanPct * 100)}% · G'ler +${Math.round(breakdown.winsPct * 100)}%</small>
        <small class="empire-match-estimate">Maç günü tahmini: ${formatMoney(breakdown.matchDayEstimate)}</small>
      `
      if (club.lastMatch) {
        const matchEl = document.createElement('small')
        matchEl.className = 'empire-last-match'
        matchEl.textContent = `Son maç (Gün ${club.lastMatch.gameDay}): ${club.lastMatch.score} · ${club.lastMatch.won ? 'Galibiyet' : 'Mağlubiyet'} · +${club.lastMatch.fanGain.toLocaleString('tr-TR')} taraftar${club.lastMatch.bonus > 0 ? ` · ${formatMoney(club.lastMatch.bonus)} prim` : ''}`
        body.appendChild(matchEl)
      } else {
        const nextEl = document.createElement('small')
        nextEl.className = 'empire-last-match'
        nextEl.textContent = `Sonraki maç: Gün ${gameDay(state.gameTimeMs) + 1}`
        body.appendChild(nextEl)
      }
      if (canLeague) {
        const reqEl = document.createElement('small')
        reqEl.className = 'empire-league-req'
        reqEl.textContent = leagueReady
          ? `Lig yükseltmeye hazır (${formatMoney(lgCost)})`
          : `Lig ↑ için: ${req.minFans.toLocaleString('tr-TR')} taraftar & ${req.minWins} galibiyet (şu an ${club.fanBase.toLocaleString('tr-TR')} / ${club.wins})`
        body.appendChild(reqEl)
      }

      card.appendChild(body)

      const actions = document.createElement('div')
      actions.className = 'shop-card-actions'
      const stBtn = document.createElement('button')
      stBtn.type = 'button'
      stBtn.className = 'btn-secondary btn-sm'
      stBtn.dataset.action = 'empire-stadium'
      stBtn.dataset.id = club.clubId
      stBtn.textContent = `Stadyum ↑ ${formatMoney(stCost)}`
      stBtn.disabled = !state.canAfford(stCost)
      actions.appendChild(stBtn)
      if (canLeague) {
        const lgBtn = document.createElement('button')
        lgBtn.type = 'button'
        lgBtn.className = 'btn-primary btn-sm'
        lgBtn.dataset.action = 'empire-league'
        lgBtn.dataset.id = club.clubId
        lgBtn.textContent = `Lig ↑ ${formatMoney(lgCost)}`
        lgBtn.disabled = !state.canAfford(lgCost) || !leagueReady
        lgBtn.title = leagueReady ? '' : `${req.minFans} taraftar ve ${req.minWins} galibiyet gerekli`
        actions.appendChild(lgBtn)
      }
      card.appendChild(actions)
      this.contentEl.appendChild(card)
    }
  }

  private renderPolitics(state: GameState, year: number): void {
    const pol = state.empire.politics
    const card = document.createElement('div')
    card.className = 'shop-card empire-politics-card'
    card.innerHTML = `
      <span class="shop-card-icon">🏛️</span>
      <div class="shop-card-body">
        <strong>${politicsLevelLabel(pol.level)}</strong>
        <small>Etki: ${pol.influence} · Kampanya: ${formatMoney(pol.campaignFund)}</small>
        <small>Son seçim yılı: ${pol.lastElectionYear} · Sıradaki: ~${pol.lastElectionYear + 4}</small>
        <small>Vergi indirimi: −${Math.round(state.dynastyCostMult() < 1 ? (1 - state.dynastyCostMult()) * 100 : 0)}% maliyet (siyaset bonusu dahil)</small>
      </div>
    `
    this.contentEl.appendChild(card)

    if (pol.level === 'none') {
      const empty = document.createElement('p')
      empty.className = 'empire-hint'
      empty.textContent = 'Mağaza → İmparatorluk → Siyaset\'ten belediye meclisi satın al.'
      this.contentEl.appendChild(empty)
      return
    }

    const actions = document.createElement('div')
    actions.className = 'empire-action-row'
    const lobbyC = lobbyCost(pol.influence)
    const lobbyBtn = document.createElement('button')
    lobbyBtn.type = 'button'
    lobbyBtn.className = 'btn-primary btn-sm'
    lobbyBtn.dataset.action = 'empire-lobby'
    lobbyBtn.textContent = `Lobi (${formatMoney(lobbyC)})`
    lobbyBtn.disabled = !state.canAfford(lobbyC)
    const donateBtn = document.createElement('button')
    donateBtn.type = 'button'
    donateBtn.className = 'btn-secondary btn-sm'
    donateBtn.dataset.action = 'empire-donate'
    donateBtn.textContent = `Bağış (${formatMoney(Math.max(5000, state.incomePerDay() * 0.1))})`
    donateBtn.disabled = !state.canAfford(Math.max(5000, state.incomePerDay() * 0.1))
    actions.append(lobbyBtn, donateBtn)
    this.contentEl.appendChild(actions)

    const owned = PRODUCERS.filter((p) => p.category === 'politics' && (state.producers[p.id] ?? 0) > 0)
    for (const p of owned) {
      const cnt = state.producers[p.id] ?? 0
      const row = document.createElement('div')
      row.className = 'empire-owned-chip'
      row.innerHTML = `
        <span>${p.emoji} ${p.name} ×${cnt}</span>
        <span class="empire-chip-income">${formatIncomeRate(state.producerIncome(p))}</span>
        <button type="button" class="btn-secondary btn-sm empire-sell-btn" data-action="sell-producer" data-id="${p.id}" data-count="1">Sat</button>
      `
      this.contentEl.appendChild(row)
    }

    if (year >= pol.lastElectionYear + 4) {
      const note = document.createElement('p')
      note.className = 'empire-election-note'
      note.textContent = '🗳️ Seçim yılı! Etki puanın otomatik arttı.'
      this.contentEl.appendChild(note)
    }
  }

  private renderDark(state: GameState): void {
    const dark = state.empire.darkIndustry
    const owned = PRODUCERS.filter((p) => p.category === 'dark' && (state.producers[p.id] ?? 0) > 0)
    if (owned.length === 0) {
      this.contentEl.innerHTML = `<div class="empire-empty"><span>🏭</span><p>Siyah endüstri yok.</p><small>Mağaza → İmparatorluk → Yeraltı'dan satın al.</small></div>`
      return
    }

    const card = document.createElement('div')
    card.className = 'shop-card'
    const boostActive = state.gameTimeMs < dark.boostUntilGameMs
    card.innerHTML = `
      <span class="shop-card-icon">🏭</span>
      <div class="shop-card-body">
        <strong>Siyah Endüstri</strong>
        <small>Üretim çarpanı: ×${dark.productionMult.toFixed(1)}${boostActive ? ' · Boost aktif!' : ''}</small>
        <small>Heat düzenleme: ${dark.heatBonus}</small>
        <small>Radar: ${Math.round(state.illegalHeat)}% — ${state.illegalRiskLabel()}</small>
      </div>
    `
    this.contentEl.appendChild(card)

    for (const p of owned) {
      const cnt = state.producers[p.id] ?? 0
      const row = document.createElement('div')
      row.className = 'empire-owned-chip empire-owned-dark'
      row.innerHTML = `
        <span>${p.emoji} ${p.name} ×${cnt}</span>
        <span class="empire-chip-income">${formatIncomeRate(state.producerIncome(p))}</span>
        <button type="button" class="btn-secondary btn-sm empire-sell-btn" data-action="sell-producer" data-id="${p.id}" data-count="1">Sat</button>
      `
      this.contentEl.appendChild(row)
    }

    const actions = document.createElement('div')
    actions.className = 'empire-action-row'
    const boostBtn = document.createElement('button')
    boostBtn.type = 'button'
    boostBtn.className = 'btn-primary btn-sm'
    boostBtn.dataset.action = 'empire-dark-boost'
    boostBtn.textContent = `Üretimi artır (${formatMoney(Math.max(5000, state.incomePerDay() * 0.25))})`
    const radarBtn = document.createElement('button')
    radarBtn.type = 'button'
    radarBtn.className = 'btn-secondary btn-sm'
    radarBtn.dataset.action = 'empire-dark-radar'
    radarBtn.textContent = `Radar düşür (${formatMoney(Math.max(3000, state.incomePerDay() * 0.15))})`
    actions.append(boostBtn, radarBtn)
    this.contentEl.appendChild(actions)
  }
}
