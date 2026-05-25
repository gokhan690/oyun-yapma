import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { boostDurationLabel } from '../../game/BoostInventory'
import { dailyGoalProgress, calcDailyLoginReward } from '../../game/DailyGoal'
import { currentTier, tierProgress, rewardForTier, SEASON_MAX_TIER } from '../../game/SeasonPass'
import { getWeeklyDef } from '../../game/WeeklyEvent'
import { daysUntilWeekReset, calendarMonthKey } from '../../game/dateUtils'
import {
  CAMPAIGN_CHAPTERS,
  chapterById,
  currentCampaignStep,
  campaignProgressPct,
  isChapterUnlocked,
} from '../../game/Campaign'
import { iapManager } from '../../monetization/IAPManager'

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
    void iapManager.refreshStorePrices()
    state.ensureSeason()
    state.ensureWeekly()
    state.ensureDailyGoal()
    state.ensureMissions()
    this.scrollBody.replaceChildren()

    const header = document.createElement('div')
    header.className = 'events-panel-header'
    header.innerHTML = '<h2>🎪 Etkinlikler</h2><p>Günlük hedefler, haftalık bonuslar ve sezon ödülleri</p>'
    this.scrollBody.appendChild(header)

    const boosts = this.renderBoostInventory(state)
    const active = this.renderActiveBoosts(state)
    if (active) this.scrollBody.appendChild(active)
    if (boosts) this.scrollBody.appendChild(boosts)

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
    this.scrollBody.appendChild(this.renderCampaign(state))
    this.scrollBody.appendChild(this.renderGacha(state))
    this.scrollBody.appendChild(this.renderSeason(state))
    this.scrollBody.appendChild(this.renderMissions(state))

    const iapFooter = document.createElement('div')
    iapFooter.className = 'iap-restore-footer'
    const restoreBtn = document.createElement('button')
    restoreBtn.type = 'button'
    restoreBtn.className = 'btn-secondary btn-sm'
    restoreBtn.dataset.action = 'iap-restore'
    restoreBtn.textContent = '🔄 Satın almaları geri yükle (Google Play / App Store)'
    iapFooter.appendChild(restoreBtn)
    this.scrollBody.appendChild(iapFooter)
  }

  /** Tam DOM yenilemeden ilerleme ve bonus sürelerini günceller. */
  patchLive(state: GameState): boolean {
    if (!this.scrollBody.querySelector('.events-block-daily')) return false

    const target = state.dailyGoalTarget()
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, target))
    const dailyBlock = this.scrollBody.querySelector('.events-block-daily')
    if (dailyBlock) {
      const stat = dailyBlock.querySelector('.events-hero-stat')
      if (stat) stat.textContent = `${goalPct}%`
      const sub = dailyBlock.querySelector('.events-hero-text > small')
      if (sub) sub.textContent = `${formatMoney(state.dailyGoalEarned)} / ${formatMoney(target)} kazanç`
      const fill = dailyBlock.querySelector('.progress-fill') as HTMLElement | null
      if (fill) fill.style.width = `${goalPct}%`
    }

    const w = state.weekly
    const wPct = w.target > 0 ? Math.min(100, (w.progress / w.target) * 100) : 0
    const daysLeft = daysUntilWeekReset()
    const weeklyBlock = this.scrollBody.querySelector('.events-block-weekly')
    if (weeklyBlock) {
      const stat = weeklyBlock.querySelector('.events-hero-stat')
      if (stat) stat.textContent = `${Math.floor(wPct)}%`
      const sub = weeklyBlock.querySelector('.events-hero-text > small')
      if (sub) sub.textContent = `${formatMoney(w.progress)} / ${formatMoney(w.target)} · ${daysLeft} gün kaldı`
      const fill = weeklyBlock.querySelector('.progress-fill') as HTMLElement | null
      if (fill) fill.style.width = `${wPct}%`
    }

    for (const m of state.missions) {
      const card = this.scrollBody.querySelector(`.events-mission-card[data-mission-id="${m.id}"]`)
      if (!card) continue
      const pct = Math.min(100, (m.progress / m.target) * 100)
      const headSmall = card.querySelector('.events-mission-head small')
      if (headSmall) headSmall.textContent = `${Math.floor(m.progress)}/${m.target}`
      const fill = card.querySelector('.progress-fill') as HTMLElement | null
      if (fill) fill.style.width = `${pct}%`
      const ready = m.progress >= m.target && !m.claimed
      const hasClaim = !!card.querySelector('[data-action="claim-mission"]')
      if (ready !== hasClaim) return false
    }

    if (!this.patchDailyActions(state)) return false
    if (!this.patchWeeklyActions(state)) return false
    if (!this.patchPendingBoosts(state)) return false

    return this.patchBoostRow(state)
  }

  private patchDailyActions(state: GameState): boolean {
    const dailyBlock = this.scrollBody.querySelector('.events-block-daily')
    if (!dailyBlock) return true
    const target = state.dailyGoalTarget()
    const needClaim = state.dailyGoalEarned >= target && !state.dailyGoalClaimed
    const actions = dailyBlock.querySelector('.events-actions')
    if (!actions) return true
    const claimBtn = actions.querySelector('[data-action="claim-daily-goal"]')
    if (needClaim && !claimBtn) return false
    if (!needClaim && claimBtn) claimBtn.remove()
    if (needClaim && claimBtn) {
      const preview = formatMoney(state.dailyGoalRewardPreview())
      claimBtn.textContent = `Topla · ${preview}`
    }
    return true
  }

  private patchWeeklyActions(state: GameState): boolean {
    const weeklyBlock = this.scrollBody.querySelector('.events-block-weekly')
    if (!weeklyBlock) return true
    const w = state.weekly
    const needClaim = w.progress >= w.target && !w.claimed
    const actions = weeklyBlock.querySelector('.events-actions')
    if (!actions) return true
    const claimBtn = actions.querySelector('[data-action="claim-weekly"]')
    if (needClaim && !claimBtn) return false
    if (!needClaim && claimBtn) claimBtn.remove()
    if (needClaim && claimBtn) {
      claimBtn.textContent = `Haftalık ödül · ${formatMoney(state.weeklyRewardPreview())}`
    }
    return true
  }

  private patchBoostRow(state: GameState): boolean {
    const expected = this.activeBoostSpecs(state)
    const section = this.scrollBody.querySelector('.events-active-boosts')
    const row = section?.querySelector('.events-boosts-row') ?? null
    if (expected.length === 0) {
      section?.remove()
      return true
    }
    if (!row || row.querySelectorAll('.events-boost-chip').length !== expected.length) return false
    const chips = row.querySelectorAll('.events-boost-chip')
    expected.forEach((spec, i) => {
      const chip = chips[i]
      if (!chip) return
      const emojiEl = chip.querySelector('span')
      if (emojiEl && emojiEl.textContent !== spec.emoji) emojiEl.textContent = spec.emoji
      const strong = chip.querySelector('strong')
      if (strong && strong.textContent !== spec.label) strong.textContent = spec.label
      const small = chip.querySelector('small')
      if (small) small.textContent = spec.detail
    })
    return true
  }

  private patchPendingBoosts(state: GameState): boolean {
    const expected = state.pendingBoosts.length
    const section = this.scrollBody.querySelector('.events-pending-boosts')
    if (expected === 0) {
      section?.remove()
      return true
    }
    if (!section) return false
    return section.querySelectorAll('.events-pending-card').length === expected
  }

  private activeBoostSpecs(state: GameState): { emoji: string; label: string; detail: string }[] {
    const now = Date.now()
    const chips: { emoji: string; label: string; detail: string }[] = []
    if (now < state.adIncomeBoostUntil) {
      chips.push({
        emoji: state.adBoostEmoji || '📺',
        label: state.adBoostLabel || 'Gelir x2',
        detail: formatRemainingMs(state.adIncomeBoostUntil - now),
      })
    }
    if (state.getEventBoostActive()) {
      chips.push({
        emoji: state.eventBoostEmoji || '✨',
        label: state.eventBoostLabel || 'Gelir x3',
        detail: formatRemainingMs(state.eventBoostUntil - now),
      })
    }
    if (now < state.shopBoostUntil) {
      chips.push({
        emoji: state.shopBoostEmoji || '🛒',
        label: state.shopBoostLabel || 'Mağaza x1.5',
        detail: formatRemainingMs(state.shopBoostUntil - now),
      })
    }
    if (now < state.heatShieldUntil) {
      chips.push({
        emoji: '🛡️',
        label: 'Radar kalkanı',
        detail: formatRemainingMs(state.heatShieldUntil - now),
      })
    }
    if (now < state.launderingUntil) {
      chips.push({
        emoji: '🧼',
        label: 'Aklama',
        detail: formatRemainingMs(state.launderingUntil - now),
      })
    }
    return chips
  }

  private renderBoostInventory(state: GameState): HTMLElement | null {
    if (state.pendingBoosts.length === 0) return null

    const wrap = document.createElement('section')
    wrap.className = 'events-block events-pending-boosts'
    const head = document.createElement('div')
    head.className = 'events-block-head'
    head.innerHTML = `
      <span class="events-hero-icon">🎁</span>
      <div class="events-hero-text">
        <strong>Bonus envanteri</strong>
        <small>İstediğin zaman aktifleştir — otomatik başlamaz</small>
      </div>
      <span class="events-hero-stat">${state.pendingBoosts.length}</span>
    `
    wrap.appendChild(head)

    const list = document.createElement('div')
    list.className = 'events-pending-list'
    for (const item of state.pendingBoosts) {
      const card = document.createElement('div')
      card.className = 'events-pending-card'
      const kindLabel = item.kind === 'income_3x' ? 'Gelir x3' : item.kind === 'shop_1_5x' ? 'Mağaza x1.5' : 'Gelir x2'
      card.innerHTML = `
        <span class="events-pending-emoji">${item.emoji}</span>
        <div class="events-pending-info">
          <strong>${item.label}</strong>
          <small>${kindLabel} · ${boostDurationLabel(item.durationMs)}</small>
        </div>
      `
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-primary btn-sm'
      btn.dataset.action = 'activate-boost'
      btn.dataset.id = item.id
      btn.textContent = 'Aktifleştir'
      card.appendChild(btn)
      list.appendChild(card)
    }
    wrap.appendChild(list)
    return wrap
  }

  private renderActiveBoosts(state: GameState): HTMLElement | null {
    const chips = this.activeBoostSpecs(state)
    if (chips.length === 0) return null

    const wrap = document.createElement('section')
    wrap.className = 'events-block events-active-boosts'
    const head = document.createElement('div')
    head.className = 'events-block-head'
    head.innerHTML = `
      <span class="events-hero-icon">⚡</span>
      <div class="events-hero-text">
        <strong>Aktif etkiler</strong>
        <small>Şu an çalışan bonuslar</small>
      </div>
    `
    wrap.appendChild(head)

    const row = document.createElement('div')
    row.className = 'events-boosts-row'
    for (const c of chips) {
      const chip = document.createElement('div')
      chip.className = 'events-boost-chip'
      chip.innerHTML = `<span>${c.emoji}</span><div><strong>${c.label}</strong><small>${c.detail}</small></div>`
      row.appendChild(chip)
    }
    wrap.appendChild(row)
    return wrap
  }

  private renderDaily(state: GameState): HTMLElement {
    const target = state.dailyGoalTarget()
    const goalPct = Math.floor(dailyGoalProgress(state.dailyGoalEarned, target))
    const rewardPreview = formatMoney(state.dailyGoalRewardPreview())
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
    const rewardPreview = formatMoney(state.weeklyRewardPreview())
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

    if (!state.season.premiumUnlocked) {
      const premiumCta = document.createElement('div')
      premiumCta.className = 'season-premium-cta iap-value-card'
      const product = iapManager.getProduct('season_premium')
      premiumCta.innerHTML = `
        <strong>⭐ Premium Sezon Yolu</strong>
        <p>${product.description}</p>
        <ul class="iap-perks">
          <li>2x para ödülleri (premium kolon)</li>
          <li>Özel tema ve sandık biletleri</li>
          <li>Tek seferlik — bu sezon boyunca geçerli</li>
        </ul>
      `
      const buyBtn = this.actionBtn('iap-season-premium', `${product.priceLabel} · Premium Aç`, 'btn-premium')
      premiumCta.appendChild(buyBtn)
      wrap.appendChild(premiumCta)
    } else {
      const badge = document.createElement('p')
      badge.className = 'season-premium-active'
      badge.textContent = '⭐ Premium yol aktif — sağ kolondan ödülleri topla'
      wrap.appendChild(badge)
    }

    const dual = document.createElement('div')
    dual.className = 'season-dual-track'

    const freeCol = document.createElement('div')
    freeCol.className = 'season-track-col'
    freeCol.innerHTML = '<h4>Ücretsiz</h4>'
    freeCol.appendChild(this.buildSeasonNodes(state, tier, 'free'))
    dual.appendChild(freeCol)

    const premCol = document.createElement('div')
    premCol.className = `season-track-col season-track-premium${state.season.premiumUnlocked ? ' unlocked' : ''}`
    premCol.innerHTML = '<h4>Premium</h4>'
    premCol.appendChild(this.buildSeasonNodes(state, tier, 'premium'))
    dual.appendChild(premCol)

    wrap.appendChild(dual)

    const seasonActions = document.createElement('div')
    seasonActions.className = 'events-actions'
    seasonActions.appendChild(this.actionBtn('ad-season-xp', '📺 Sezon XP bonusu (reklam)', 'btn-ad'))
    wrap.appendChild(seasonActions)
    return wrap
  }

  private buildSeasonNodes(state: GameState, tier: number, track: 'free' | 'premium'): HTMLElement {
    const trackEl = document.createElement('div')
    trackEl.className = 'season-track'
    const claimed = track === 'premium' ? state.season.claimedPremiumTiers : state.season.claimedTiers
    const locked = track === 'premium' && !state.season.premiumUnlocked
    for (let i = 1; i <= Math.min(SEASON_MAX_TIER, tier + 3); i++) {
      const node = document.createElement('div')
      node.className = 'season-node'
      if (i <= tier) node.classList.add('unlocked')
      if (claimed.includes(i)) node.classList.add('claimed')
      if (locked) node.classList.add('locked')
      const rw = rewardForTier(i, track)
      node.innerHTML = `<span class="season-node-tier">${i}</span><small>${rw.label}</small>`
      if (i <= tier && !claimed.includes(i) && !locked) {
        const claim = document.createElement('button')
        claim.type = 'button'
        claim.className = 'season-claim-btn btn-primary btn-sm'
        claim.dataset.action = track === 'premium' ? 'claim-season-premium' : 'claim-season'
        claim.dataset.id = String(i)
        claim.textContent = 'Topla'
        node.appendChild(claim)
      }
      trackEl.appendChild(node)
    }
    return trackEl
  }

  private renderGacha(state: GameState): HTMLElement {
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-gacha'
    const ready = state.luckyChestReady
    wrap.appendChild(this.blockHeader(
      '🎁',
      'Şans Sandığı',
      ready ? 'Ücretsiz sandık hazır!' : `Pity: ${state.chestPityCounter}/10 · Bilet: ${state.chestTickets}`,
      ready ? 'HAZIR' : `${state.chestTickets} bilet`,
      'Reklam veya bilet ile aç — nadir ödüller',
    ))

    const actions = document.createElement('div')
    actions.className = 'events-actions gacha-actions'
    if (ready) {
      actions.appendChild(this.actionBtn('open-free-chest', '🎁 Ücretsiz Sandığı Aç', 'btn-primary'))
    }
    actions.appendChild(this.actionBtn('ad-chest', '📺 Reklam ile Aç', 'btn-ad'))
    if (state.chestTickets > 0) {
      actions.appendChild(this.actionBtn('open-paid-chest', `🎫 Bilet ile Aç (${state.chestTickets})`, 'btn-secondary'))
    }
    const pack = iapManager.getProduct('chest_pack_5')
    const packCard = document.createElement('div')
    packCard.className = 'iap-value-card iap-chest-card'
    packCard.innerHTML = `
      <strong>🎁 ${pack.name}</strong>
      <p>${pack.description}</p>
      <ul class="iap-perks">
        <li>Reklamsız 5 premium sandık</li>
        <li>Pity sayacını atla — nadir ödül şansı</li>
      </ul>
    `
    packCard.appendChild(this.actionBtn('iap-chest-pack', `${pack.priceLabel} · Satın Al`, 'btn-premium'))
    actions.appendChild(packCard)
    wrap.appendChild(actions)
    return wrap
  }

  private renderCampaign(state: GameState): HTMLElement {
    state.syncCampaignProgress()
    const wrap = document.createElement('section')
    wrap.className = 'events-block events-block-campaign'
    const chapter = chapterById(state.campaign.chapterId)
    const step = currentCampaignStep(state.campaign)
    const completed = state.campaign.completedChapters.length
    wrap.appendChild(this.blockHeader(
      '📜',
      'Kampanya',
      chapter ? chapter.title : 'Tamamlandı',
      `${completed}/${CAMPAIGN_CHAPTERS.length}`,
      chapter?.subtitle ?? 'Tüm bölümler bitti — efsane baron!',
    ))

    if (!chapter || !step) {
      const done = document.createElement('p')
      done.className = 'campaign-done'
      done.textContent = '🏆 Kampanya tamamlandı! Hikâye devam ediyor…'
      wrap.appendChild(done)
      return wrap
    }

    if (!isChapterUnlocked(chapter, state.lifetimeTotalEarned, state.campaign.completedChapters)) {
      const lock = document.createElement('p')
      lock.className = 'campaign-locked'
      lock.textContent = `Kilitli — ${formatMoney(chapter.unlockAtTotalEarned)} yaşam boyu kazanç gerekir`
      wrap.appendChild(lock)
      return wrap
    }

    const pct = campaignProgressPct(state, state.campaign)
    wrap.appendChild(this.progressBar(pct))
    const stepEl = document.createElement('div')
    stepEl.className = 'campaign-step-card'
    stepEl.innerHTML = `
      <strong>${step.title}</strong>
      <p>${step.description}</p>
      <small>Ödül: ${formatMoney(step.rewardMoney)}${step.rewardBoostMinutes ? ` + ${step.rewardBoostMinutes} dk bonus` : ''}</small>
    `
    if (state.hasClaimableCampaignReward()) {
      stepEl.appendChild(this.actionBtn('claim-campaign', 'Bölüm adımını topla', 'btn-primary btn-sm'))
    }
    wrap.appendChild(stepEl)

    const list = document.createElement('div')
    list.className = 'campaign-chapter-list'
    for (const ch of CAMPAIGN_CHAPTERS) {
      const item = document.createElement('span')
      item.className = 'campaign-chapter-pill'
      if (state.campaign.completedChapters.includes(ch.id)) item.classList.add('done')
      else if (ch.id === state.campaign.chapterId) item.classList.add('active')
      item.textContent = `${ch.id}`
      list.appendChild(item)
    }
    wrap.appendChild(list)
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
          ? `${m.rewardBoostMinutes} dk bonus (envanter)`
          : '—'
      const card = document.createElement('div')
      card.className = `events-mission-card${m.claimed ? ' claimed' : ''}${m.progress >= m.target && !m.claimed ? ' ready' : ''}`
      card.dataset.missionId = m.id
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
