import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { dailyGoalProgress } from '../../game/DailyGoal'
import { currentTier, tierProgress, rewardForTier, SEASON_MAX_TIER } from '../../game/SeasonPass'
import { getWeeklyDef } from '../../game/WeeklyEvent'
import { daysUntilWeekReset, calendarMonthKey } from '../../game/dateUtils'

function formatRemainingMs(ms: number): string {
  if (ms <= 0) return 'bitti'
  const sec = Math.ceil(ms / 1000)
  if (sec < 60) return `${sec} sn`
  const min = Math.ceil(sec / 60)
  if (min < 60) return `${min} dk`
  return `${Math.ceil(min / 60)} sa`
}

function formatSeasonLabel(): string {
  const [y, m] = calendarMonthKey().split('-')
  const names = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  const month = names[Number(m) - 1] ?? m
  return `${month} ${y}`
}

export class EventsPanel {
  readonly root: HTMLElement

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'events-panel'
    this.root.hidden = true
  }

  render(state: GameState): void {
    state.ensureSeason()
    state.ensureWeekly()
    state.ensureDailyGoal()
    state.ensureMissions()
    this.root.replaceChildren()

    const header = document.createElement('div')
    header.className = 'events-panel-header'
    header.innerHTML = '<h2>🎪 Etkinlikler</h2><p>Günlük hedefler, haftalık bonuslar ve sezon ödülleri</p>'
    this.root.appendChild(header)

    const boosts = this.renderActiveBoosts(state)
    if (boosts) this.root.appendChild(boosts)

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

  private renderActiveBoosts(state: GameState): HTMLElement | null {
    const now = Date.now()
    const chips: { emoji: string; label: string; detail: string }[] = []

    if (now < state.adIncomeBoostUntil) {
      chips.push({ emoji: '📺', label: 'Reklam x2', detail: formatRemainingMs(state.adIncomeBoostUntil - now) })
    }
    if (state.getEventBoostActive()) {
      chips.push({ emoji: '📱', label: 'Viral etkinlik x3', detail: formatRemainingMs(state.eventBoostUntil - now) })
    }
    if (now < state.shopBoostUntil) {
      chips.push({ emoji: '🛒', label: 'Mağaza x1.5', detail: formatRemainingMs(state.shopBoostUntil - now) })
    }
    if (state.isSurpriseInvestorActive()) {
      chips.push({ emoji: '💎', label: 'Yatırımcı x2', detail: formatRemainingMs(state.surpriseInvestorUntil - now) })
    }
    if (state.isNight) {
      chips.push({ emoji: '🌙', label: 'Hafta sonu pasif', detail: 'Oyun takvimi Cmt–Paz' })
    } else {
      chips.push({ emoji: '☀️', label: 'Hafta içi tık', detail: 'Oyun takvimi Pzt–Cum' })
    }

    if (chips.length === 0) return null

    const wrap = document.createElement('div')
    wrap.className = 'events-boosts-row'
    for (const c of chips) {
      const chip = document.createElement('div')
      chip.className = 'events-boost-chip'
      chip.innerHTML = `<span>${c.emoji}</span><div><strong>${c.label}</strong><small>${c.detail}</small></div>`
      wrap.appendChild(chip)
    }
    return wrap
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
    const rewardPreview = formatMoney(Math.max(500, state.incomePerDay()))
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-daily'

    const dailyHero = document.createElement('div')
    dailyHero.className = 'events-hero events-hero-daily'
    dailyHero.innerHTML = `
      <div class="events-hero-top">
        <span class="events-hero-icon">🎯</span>
        <div class="events-hero-text">
          <strong>Günlük hedef</strong>
          <small>${formatMoney(state.dailyGoalEarned)} / ${formatMoney(target)} kazanç</small>
          <small class="events-streak-line">🔥 Giriş serisi: ${state.dailyStreak} gün · Gerçek takvim günü</small>
        </div>
        <span class="events-hero-stat">${goalPct}%</span>
      </div>
    `
    dailyHero.appendChild(this.progressBar(goalPct))
    wrap.appendChild(dailyHero)

    const dailyActions = document.createElement('div')
    dailyActions.className = 'events-actions'
    if (state.dailyGoalEarned >= target && !state.dailyGoalClaimed) {
      dailyActions.appendChild(this.actionBtn('claim-daily-goal', `Topla · ${rewardPreview}`, 'btn-primary'))
    }
    if (state.canClaimDaily()) {
      dailyActions.appendChild(this.actionBtn('daily', '🎁 Günlük giriş ödülü', 'btn-secondary'))
    }
    wrap.appendChild(dailyActions)
    return wrap
  }

  private renderWeekly(state: GameState): HTMLElement {
    const def = getWeeklyDef(state.weekly)
    const w = state.weekly
    const wPct = w.target > 0 ? Math.min(100, (w.progress / w.target) * 100) : 0
    const bonusPct = def.bonus ? Math.round(def.bonus * 100) : 0
    const daysLeft = daysUntilWeekReset()
    const rewardPreview = formatMoney(Math.max(1000, state.incomePerDay() * 2))
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
          <small class="events-streak-line">${formatMoney(w.progress)} / ${formatMoney(w.target)} kazanç · ${daysLeft} gün kaldı</small>
          ${bonusPct > 0 ? `<span class="events-bonus-chip">Bu hafta +${bonusPct}% bonus${w.adDoubled ? ' (reklam x2)' : ''}</span>` : ''}
          ${def.comboCapMult ? `<span class="events-bonus-chip">Combo cap x${def.comboCapMult}${w.adDoubled ? ' (güçlü)' : ''}</span>` : ''}
        </div>
        <span class="events-hero-stat">${Math.floor(wPct)}%</span>
      </div>
    `
    weeklyHero.appendChild(this.progressBar(wPct))
    wrap.appendChild(weeklyHero)

    const weeklyActions = document.createElement('div')
    weeklyActions.className = 'events-actions'
    if (w.progress >= w.target && !w.claimed) {
      weeklyActions.appendChild(this.actionBtn('claim-weekly', `Haftalık ödül · ${rewardPreview}`, 'btn-primary'))
    } else if (w.claimed) {
      const done = document.createElement('p')
      done.className = 'events-done-label'
      done.textContent = `✓ Bu haftanın ödülü alındı${w.adDoubled ? ' · Bonus x2 aktif' : ''}`
      weeklyActions.appendChild(done)
    }
    if (!w.adDoubled) {
      weeklyActions.appendChild(this.actionBtn('ad-weekly', '📺 Haftalık bonusu x2 (reklam)', 'btn-ad'))
    }
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
          <small>${formatSeasonLabel()} sezonu · Tier ${prog.tier}/${SEASON_MAX_TIER}</small>
          <small class="events-streak-line">${prog.current} / ${prog.needed} XP · Para kazanınca XP gelir</small>
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
    const section = document.createElement('section')
    section.className = 'events-block events-missions-section'
    const title = document.createElement('h3')
    title.textContent = '📋 Günlük Görevler'
    section.appendChild(title)
    const sub = document.createElement('p')
    sub.className = 'events-missions-summary'
    sub.textContent = 'Her gerçek gün 3 yeni görev · Yarın sıfırlanır'
    section.appendChild(sub)
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
      const reward = m.rewardMoney > 0
        ? formatMoney(m.rewardMoney)
        : m.rewardBoostMinutes > 0
          ? `${m.rewardBoostMinutes} dk x2 gelir`
          : '—'
      const card = document.createElement('div')
      card.className = `events-mission-card${m.claimed ? ' claimed' : ''}${m.progress >= m.target && !m.claimed ? ' ready' : ''}`
      card.innerHTML = `
        <div class="events-mission-head">
          <strong>${m.label}</strong>
          <small>${Math.floor(m.progress)}/${m.target}</small>
        </div>
        <p class="events-mission-reward">Ödül: ${reward}</p>
      `
      card.appendChild(this.progressBar(pct))
      if (m.progress >= m.target && !m.claimed) {
        card.appendChild(this.actionBtn('claim-mission', `Topla · ${reward}`, 'btn-primary btn-sm', m.id))
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
