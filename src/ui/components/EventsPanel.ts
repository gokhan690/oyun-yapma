import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { dailyGoalProgress, calcDailyLoginReward } from '../../game/DailyGoal'
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
  private scrollBody!: HTMLElement

  constructor() {
    this.root = document.createElement('section')
    this.root.className = 'events-panel tab-panel'
    this.root.hidden = true
    this.scrollBody = document.createElement('div')
    this.scrollBody.className = 'events-scroll-body'
    this.root.appendChild(this.scrollBody)
  }

  render(state: GameState): void {
    state.ensureSeason()
    state.ensureWeekly()
    state.ensureDailyGoal()
    state.ensureMissions()
    this.scrollBody.replaceChildren()

    const header = document.createElement('div')
    header.className = 'events-panel-header'
    header.innerHTML = '<h2>🎪 Etkinlikler</h2><p>Günlük hedefler, haftalık bonuslar ve sezon ödülleri</p>'
    this.scrollBody.appendChild(header)

    const boosts = this.renderActiveBoosts(state)
    if (boosts) this.scrollBody.appendChild(boosts)

    if (state.isSurpriseInvestorActive()) {
      this.scrollBody.appendChild(this.banner('💎 Sürpriz yatırımcı aktif — tüm gelir iki kat!', 'surprise-investor-banner'))
    }

    const headline = state.currentMarketHeadline()
    if (headline) {
      this.scrollBody.appendChild(this.banner(`📰 ${headline}`, 'market-news-banner'))
    }

    if (Date.now() < state.stock.marketEventUntil) {
      this.scrollBody.appendChild(this.banner(
        state.stock.marketEventMult < 0 ? '📉 Borsa çöküşü — fiyatlar düşüyor!' : '📈 Borsa rallisi — fiyatlar yükseliyor!',
        'market-event-banner',
      ))
    }

    const heat = state.illegalHeat
    if (heat > 0 || state.illegalIncomePerDay() > 0) {
      const heatWarn = document.createElement('div')
      heatWarn.className = `events-heat-banner${heat >= 55 ? ' heat-alert' : ''}`
      const heatText = document.createElement('div')
      heatText.className = 'events-heat-text'
      heatText.innerHTML = `
        <strong>🕶️ Radar: ${state.illegalRiskLabel()}</strong>
        <small>${Math.round(heat)}% — Underground menüsünden temizleyebilirsin</small>
      `
      const cleanBtn = document.createElement('button')
      cleanBtn.type = 'button'
      cleanBtn.className = 'btn-secondary btn-sm'
      cleanBtn.dataset.action = 'open-underground'
      cleanBtn.textContent = 'Temizle'
      heatWarn.append(heatText, cleanBtn)
      this.scrollBody.appendChild(heatWarn)
    }

    this.scrollBody.appendChild(this.renderDaily(state))
    this.scrollBody.appendChild(this.renderWeekly(state))
    this.scrollBody.appendChild(this.renderSeason(state))
    this.scrollBody.appendChild(this.renderMissions(state))
  }

  private renderActiveBoosts(state: GameState): HTMLElement | null {
    const now = Date.now()
    const chips: { emoji: string; label: string; detail: string }[] = []

    if (now < state.adIncomeBoostUntil) {
      chips.push({ emoji: '📺', label: 'Reklam bonusu', detail: formatRemainingMs(state.adIncomeBoostUntil - now) })
    }
    if (state.getEventBoostActive()) {
      chips.push({ emoji: '📱', label: 'Viral etkinlik', detail: formatRemainingMs(state.eventBoostUntil - now) })
    }
    if (now < state.shopBoostUntil) {
      chips.push({ emoji: '🛒', label: 'Mağaza bonusu', detail: formatRemainingMs(state.shopBoostUntil - now) })
    }
    if (state.isSurpriseInvestorActive()) {
      chips.push({ emoji: '💎', label: 'Yatırımcı bonusu', detail: formatRemainingMs(state.surpriseInvestorUntil - now) })
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
    const rewardPreview = formatMoney(Math.max(200, Math.floor(state.incomePerDay() * 0.22)))
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-daily'

    wrap.appendChild(this.blockHeader(
      '🎯',
      'Günlük hedef',
      `${formatMoney(state.dailyGoalEarned)} / ${formatMoney(target)} kazanç`,
      `${goalPct}%`,
      `🔥 Giriş serisi: ${state.dailyStreak} gün · Yarın: ${formatMoney(calcDailyLoginReward(state.dailyStreak + 1, state.incomePerDay()))}`,
    ))
    wrap.appendChild(this.progressBar(goalPct))

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
    const rewardPreview = formatMoney(Math.max(500, Math.floor(state.incomePerDay() * 0.55)))
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-weekly'

    wrap.appendChild(this.blockHeader(
      '🗓️',
      def.name,
      `${formatMoney(w.progress)} / ${formatMoney(w.target)} · ${daysLeft} gün kaldı`,
      `${Math.floor(wPct)}%`,
      def.description,
    ))
    wrap.appendChild(this.progressBar(wPct))

    if (bonusPct > 0 || def.comboCapMult) {
      const chips = document.createElement('div')
      chips.className = 'events-chip-row'
      if (bonusPct > 0) {
        const chip = document.createElement('span')
        chip.className = 'events-bonus-chip'
        chip.textContent = `Bu hafta +${bonusPct}% bonus${w.adDoubled ? ' (reklam)' : ''}`
        chips.appendChild(chip)
      }
      if (def.comboCapMult) {
        const chip = document.createElement('span')
        chip.className = 'events-bonus-chip'
        chip.textContent = `Combo cap ${def.comboCapMult}${w.adDoubled ? ' (güçlü)' : ''}`
        chips.appendChild(chip)
      }
      wrap.appendChild(chips)
    }

    const weeklyActions = document.createElement('div')
    weeklyActions.className = 'events-actions'
    if (w.progress >= w.target && !w.claimed) {
      weeklyActions.appendChild(this.actionBtn('claim-weekly', `Haftalık ödül · ${rewardPreview}`, 'btn-primary'))
    } else if (w.claimed) {
      const done = document.createElement('p')
      done.className = 'events-done-label'
      done.textContent = `✓ Bu haftanın ödülü alındı${w.adDoubled ? ' · Bonus aktif' : ''}`
      weeklyActions.appendChild(done)
    }
    if (!w.adDoubled) {
      weeklyActions.appendChild(this.actionBtn('ad-weekly', '📺 Haftalık bonus (reklam)', 'btn-ad'))
    }
    wrap.appendChild(weeklyActions)
    return wrap
  }

  private renderSeason(state: GameState): HTMLElement {
    const prog = tierProgress(state.season.xp)
    const tier = currentTier(state.season.xp)
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-season'

    wrap.appendChild(this.blockHeader(
      '👑',
      'İmparatorluk Yolu',
      `${formatSeasonLabel()} · Tier ${prog.tier}/${SEASON_MAX_TIER}`,
      `T${prog.tier}`,
      `${prog.current} / ${prog.needed} XP · Para kazanınca XP gelir`,
    ))
    wrap.appendChild(this.progressBar(prog.pct))

    const track = document.createElement('div')
    track.className = 'season-track'
    for (let i = 1; i <= Math.min(SEASON_MAX_TIER, tier + 3); i++) {
      const node = document.createElement('div')
      node.className = 'season-node'
      if (i <= tier) node.classList.add('unlocked')
      if (state.season.claimedTiers.includes(i)) node.classList.add('claimed')
      const rw = rewardForTier(i)
      node.innerHTML = `<span class="season-node-tier">${i}</span><small>${rw.label}</small>`
      if (i <= tier && !state.season.claimedTiers.includes(i)) {
        const claim = document.createElement('button')
        claim.type = 'button'
        claim.className = 'season-claim-btn btn-primary btn-sm'
        claim.dataset.action = 'claim-season'
        claim.dataset.id = String(i)
        claim.textContent = 'Topla'
        node.appendChild(claim)
      }
      track.appendChild(node)
    }
    wrap.appendChild(track)

    const seasonActions = document.createElement('div')
    seasonActions.className = 'events-actions'
    seasonActions.appendChild(this.actionBtn('ad-season-xp', '📺 Sezon XP bonusu (reklam)', 'btn-ad'))
    wrap.appendChild(seasonActions)
    return wrap
  }

  private renderMissions(state: GameState): HTMLElement {
    const section = document.createElement('section')
    section.className = 'events-block events-missions-section'
    const title = document.createElement('h3')
    title.textContent = '📋 Günlük Görevler'
    section.appendChild(title)
    const ready = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length
    const sub = document.createElement('p')
    sub.className = 'events-missions-summary'
    sub.textContent = `${ready} hazır · ${state.missions.filter((m) => m.claimed).length}/${state.missions.length} tamamlandı · Her gün sıfırlanır`
    section.appendChild(sub)
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
          ? `${m.rewardBoostMinutes} dk gelir bonusu`
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

  private blockHeader(icon: string, title: string, subtitle: string, stat: string, hint?: string): HTMLElement {
    const head = document.createElement('div')
    head.className = 'events-block-head'
    head.innerHTML = `
      <span class="events-hero-icon">${icon}</span>
      <div class="events-hero-text">
        <strong>${title}</strong>
        <small>${subtitle}</small>
        ${hint ? `<small class="events-streak-line">${hint}</small>` : ''}
      </div>
      <span class="events-hero-stat">${stat}</span>
    `
    return head
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
