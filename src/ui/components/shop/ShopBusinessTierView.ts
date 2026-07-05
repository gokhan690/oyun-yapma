import type { GameState } from '../../../game/GameState'
import {
  PRODUCERS,
  formatMoney,
  formatIncomeRate,
  producerIconPath,
  earlyUnlockCost,
  isProducerUnlocked,
  scaledUnlockAt,
  producerName,
  producerDesc,
  type ProducerDef,
} from '../../../game/Economy'

const recentlyBoughtAt: Record<string, number> = {}
export function markRecentlyBought(id: string): void {
  recentlyBoughtAt[id] = Date.now()
}
import { modernizeCost } from '../../../game/TechObsolescence'
import { FIRM_MAX_LEVEL, firmLevelBonusLabel } from '../../../game/FirmLevels'
import { firmUpgradesForProducer } from '../../../game/FirmUpgrades'
import { appendFranchiseSection } from './FranchiseBlock'
import { getActiveSynergies } from '../../../game/Synergies'
import { sortProducers, formatRoi, producerRoiSeconds, type BizSortOrder } from '../../../game/ShopAdvisor'
import type { BizTypeFilter, BuyMode } from '../ShopPanel'

import type { Translations } from '../../../i18n/keys'
import { t } from '../../../i18n'

export function tierBandLabel(bandId: string): string {
  const map: Record<string, keyof Translations> = {
    starter: 'tier_starter',
    growth: 'tier_growth',
    peak: 'tier_peak',
    legend: 'tier_legend',
  }
  return t(map[bandId] ?? 'tier_starter')
}

export interface TierBand {
  id: string
  label: string
  emoji: string
  minTier: number
  maxTier: number
  unlockAt: number
}

export const BIZ_TIER_BANDS: TierBand[] = [
  { id: 'starter', label: 'Başlangıç', emoji: '🌱', minTier: 1, maxTier: 3, unlockAt: 0 },
  { id: 'growth', label: 'Büyüme', emoji: '📈', minTier: 4, maxTier: 6, unlockAt: 480_000 },
  { id: 'peak', label: 'Zirve', emoji: '🏙️', minTier: 7, maxTier: 9, unlockAt: 40_000_000 },
  { id: 'legend', label: 'Efsane', emoji: '👑', minTier: 10, maxTier: 11, unlockAt: 3_600_000_000 },
]

const MILESTONES = [1, 10, 25, 50, 100]

export function bandUnlocked(band: TierBand, totalEarned: number): boolean {
  return totalEarned >= band.unlockAt
}

export function producersInBand(band: TierBand): ProducerDef[] {
  return PRODUCERS.filter((p) => !p.category && p.tier >= band.minTier && p.tier <= band.maxTier)
}

export function activeTierBandId(state: GameState): string {
  let active = 'starter'
  for (const band of BIZ_TIER_BANDS) {
    if (!bandUnlocked(band, state.totalEarned)) break
    const list = producersInBand(band)
    const hasActivity = list.some((p) => (state.producers[p.id] ?? 0) > 0 || isProducerUnlocked(p, state.totalEarned, state.forcedUnlocks))
    if (hasActivity) active = band.id
  }
  return active
}

export function createHeroBusinessCard(p: ProducerDef): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'biz-hero-card'
  card.dataset.producerId = p.id

  card.innerHTML = `
    <div class="biz-hero-head">
      <div class="biz-hero-icon-wrap">
        <span class="biz-hero-emoji"></span>
      </div>
      <div class="biz-hero-titles">
        <strong class="biz-hero-name"></strong>
        <small class="biz-hero-desc"></small>
      </div>
      <span class="biz-hero-owned-badge"></span>
    </div>
    <div class="biz-hero-metrics">
      <span class="biz-hero-income"></span>
      <span class="biz-hero-cost"></span>
      <span class="biz-hero-roi"></span>
    </div>
    <div class="biz-hero-milestones"></div>
    <div class="biz-hero-badges"></div>
    <div class="biz-hero-actions">
      <button type="button" class="biz-hero-buy btn-primary" data-action="buy-business">Satın Al</button>
      <button type="button" class="biz-hero-info" data-action="biz-detail" title="Detay">ℹ️</button>
    </div>
    <div class="biz-hero-extra"></div>
  `

  const emojiEl = card.querySelector('.biz-hero-emoji') as HTMLElement
  emojiEl.textContent = p.emoji
  const img = document.createElement('img')
  img.className = 'biz-hero-img'
  img.src = producerIconPath(p.id)
  img.alt = ''
  img.loading = 'lazy'
  img.onerror = () => img.remove()
  img.onload = () => emojiEl.after(img)

  const nameEl = card.querySelector('.biz-hero-name')!
  nameEl.textContent = producerName(p)
  const descEl = card.querySelector('.biz-hero-desc')!
  descEl.textContent = producerDesc(p)

  for (const btn of card.querySelectorAll<HTMLButtonElement>('[data-action="buy-business"], [data-action="biz-detail"]')) {
    btn.dataset.id = p.id
  }

  if (p.illegal) {
    card.classList.add('biz-hero-illegal')
    const badgeWrap = document.createElement('div')
    badgeWrap.className = 'biz-illegal-header-badges'
    badgeWrap.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;'
    const illBadge = document.createElement('span')
    illBadge.className = 'biz-illegal-badge'
    illBadge.textContent = '🚨 GAYRİRESMİ'
    const riskBadge = document.createElement('span')
    riskBadge.className = 'biz-illegal-risk'
    riskBadge.dataset.illegalRisk = '1'
    riskBadge.textContent = `⚠️ Baskın: ~${Math.round((p.riskChance ?? 0) * 100)}%`
    const heatWrap = document.createElement('div')
    heatWrap.className = 'biz-illegal-heat-bar'
    heatWrap.style.width = '100%'
    const heatFill = document.createElement('div')
    heatFill.className = 'biz-illegal-heat-fill'
    heatFill.dataset.heatFill = '1'
    heatFill.style.width = '0%'
    heatWrap.appendChild(heatFill)
    badgeWrap.append(illBadge, riskBadge)
    card.insertBefore(badgeWrap, card.querySelector('.biz-hero-head'))
    card.insertBefore(heatWrap, card.querySelector('.biz-hero-metrics'))
  }

  const msWrap = card.querySelector('.biz-hero-milestones')!
  for (const ms of MILESTONES) {
    const dot = document.createElement('span')
    dot.className = 'biz-milestone-dot'
    dot.dataset.milestone = String(ms)
    dot.title = `${ms} adet`
    msWrap.appendChild(dot)
  }

  const tier = document.createElement('span')
  tier.className = `biz-tier-badge biz-tier-${p.tier}`
  tier.textContent = `T${p.tier}`
  card.appendChild(tier)

  const newBadge = document.createElement('span')
  newBadge.className = 'biz-new-badge'
  newBadge.textContent = 'YENİ'
  newBadge.hidden = true
  newBadge.dataset.newBadge = '1'
  card.appendChild(newBadge)

  return card
}

export function updateHeroBusinessCard(
  card: HTMLDivElement,
  p: ProducerDef,
  state: GameState,
  buyMode: BuyMode,
): void {
  const owned = state.producers[p.id] ?? 0
  const maxCount = state.countMaxAffordable(p.id)
  const buyCount = buyMode === 'max' ? Math.max(1, maxCount) : (typeof buyMode === 'number' ? buyMode : 1)
  const cost = state.producerCostFor(p, owned, buyMode === 'max' ? Math.max(1, maxCount) : buyCount)
  const affordable = maxCount >= 1 && state.canAfford(cost)

  card.classList.toggle('biz-owned', owned > 0)
  card.classList.toggle('biz-unowned', owned <= 0)
  card.classList.toggle('biz-affordable', affordable)
  card.classList.toggle('biz-dim', owned <= 0 && !affordable)

  const ownedBadge = card.querySelector('.biz-hero-owned-badge')!
  ownedBadge.textContent = owned > 0 ? `×${owned}` : 'Yeni'

  const incomeEl = card.querySelector('.biz-hero-income')!
  incomeEl.textContent = owned > 0
    ? `Gelir: ${formatIncomeRate(state.producerIncome(p))}`
    : `+${formatIncomeRate(p.baseIncome)}/ad`

  const costEl = card.querySelector('.biz-hero-cost')!
  costEl.textContent = buyMode === 'max' && maxCount > 1
    ? `${formatMoney(cost)} · ${maxCount} adet`
    : formatMoney(cost)

  const roiEl = card.querySelector('.biz-hero-roi')!
  const effectiveBuy = maxCount >= 1 ? Math.min(buyCount, maxCount) : buyCount
  const roiSec = maxCount >= 1 ? producerRoiSeconds(state, p, effectiveBuy) : Infinity
  roiEl.textContent = `ROI ~${formatRoi(roiSec)}`

  // Verimlilik rengi (Aşama 4) — ROI'ye göre köşe göstergesi
  card.classList.remove('biz-eff-green', 'biz-eff-yellow', 'biz-eff-orange', 'biz-eff-red', 'biz-eff-illegal')
  if (p.illegal) {
    card.classList.add('biz-eff-illegal')
  } else if (roiSec < 300) {
    card.classList.add('biz-eff-green')
  } else if (roiSec < 1800) {
    card.classList.add('biz-eff-yellow')
  } else if (roiSec < 10800) {
    card.classList.add('biz-eff-orange')
  } else {
    card.classList.add('biz-eff-red')
  }

  card.querySelectorAll('.biz-milestone-dot').forEach((dot) => {
    const ms = Number((dot as HTMLElement).dataset.milestone)
    dot.classList.toggle('reached', owned >= ms)
  })

  const buyBtn = card.querySelector('.biz-hero-buy') as HTMLButtonElement
  buyBtn.disabled = !affordable
  buyBtn.textContent = affordable
    ? (buyMode === 'max' && maxCount > 1 ? `Satın Al · ${maxCount} adet` : `Satın Al · ${formatMoney(cost)}`)
    : (maxCount < 1 ? 'Yetersiz para' : `Satın Al · ${formatMoney(cost)}`)

  const badges = card.querySelector('.biz-hero-badges')!
  badges.replaceChildren()
  const activeSyns = getActiveSynergies(state.producers).filter(
    (s) => s.active && (s.def.requires.includes(p.id) || s.def.targetProducer === p.id),
  )
  if (activeSyns.length > 0) {
    const b = document.createElement('span')
    b.className = 'biz-synergy-badge'
    b.textContent = `⚡ +${Math.round(activeSyns[0]!.def.bonus * 100)}% ${activeSyns[0]!.def.name}`
    badges.appendChild(b)
  }
  const obsLabel = state.obsolescenceLabel(p.id)
  if (obsLabel && owned > 0) {
    const b = document.createElement('span')
    b.className = 'biz-obsolete-badge'
    b.textContent = obsLabel
    badges.appendChild(b)
  }
  if (p.illegal && p.riskChance) {
    const chancePct = Math.round(p.riskChance * 100 * (1 + state.illegalHeat / 100))
    const riskEl = card.querySelector('[data-illegal-risk]') as HTMLElement | null
    if (riskEl) riskEl.textContent = `⚠️ Baskın: ~${chancePct}%/gün · Ceza: -%${Math.round((p.riskFinePct ?? 0) * 100)} gelir`
    const heatFill = card.querySelector('[data-heat-fill]') as HTMLElement | null
    if (heatFill) heatFill.style.width = `${Math.min(100, state.illegalHeat)}%`
  }

  const extra = card.querySelector('.biz-hero-extra')!
  extra.replaceChildren()
  if (owned > 0) {
    // Firma seviye geliştirme (Karar 9)
    const level = state.producerLevel(p.id)
    const levelRow = document.createElement('div')
    levelRow.className = 'biz-level-row'
    if (level >= FIRM_MAX_LEVEL) {
      levelRow.innerHTML = `<span class="biz-level-badge biz-level-max">⭐ Lv.${level} MAKS</span>`
    } else {
      const lvCost = state.firmLevelUpCostFor(p)
      const lvBtn = document.createElement('button')
      lvBtn.type = 'button'
      lvBtn.className = 'btn-primary biz-levelup-btn'
      lvBtn.dataset.action = 'levelup-firm'
      lvBtn.dataset.id = p.id
      lvBtn.disabled = !state.canAfford(lvCost)
      lvBtn.innerHTML = `<span>⬆️ Geliştir → Lv.${level + 1}</span><small>${firmLevelBonusLabel(level + 1)} · ${formatMoney(lvCost)}</small>`
      const badge = document.createElement('span')
      badge.className = 'biz-level-badge'
      badge.textContent = `Lv.${level}`
      levelRow.append(badge, lvBtn)
    }
    extra.appendChild(levelRow)

    // Kategoriye özel geliştirmeler (Karar 8-10)
    const upgrades = firmUpgradesForProducer(p)
    const purchased = state.firmUpgradesPurchased(p.id)
    if (upgrades.length > 0) {
      const upWrap = document.createElement('div')
      upWrap.className = 'biz-upgrades-wrap'
      const upTitle = document.createElement('div')
      upTitle.className = 'biz-upgrades-title'
      upTitle.textContent = '🛠️ Geliştirmeler'
      upWrap.appendChild(upTitle)
      const upGrid = document.createElement('div')
      upGrid.className = 'biz-upgrades-grid'
      for (const up of upgrades) {
        const isPurchased = purchased.includes(up.id)
        const cost = state.firmUpgradeCostFor(p, up.id)
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `biz-upgrade-btn${isPurchased ? ' biz-upgrade-owned' : ''}`
        btn.dataset.action = 'buy-firm-upgrade'
        btn.dataset.id = `${p.id}:${up.id}`
        btn.disabled = isPurchased || !state.canAfford(cost)
        btn.title = up.description
        btn.innerHTML = isPurchased
          ? `<span class="biz-up-emoji">${up.emoji}</span><span class="biz-up-name">${up.name}</span><span class="biz-up-status">✅ +%${Math.round(up.incomeBonus * 100)}</span>`
          : `<span class="biz-up-emoji">${up.emoji}</span><span class="biz-up-name">${up.name}</span><span class="biz-up-cost">+%${Math.round(up.incomeBonus * 100)} · ${formatMoney(cost)}</span>`
        upGrid.appendChild(btn)
      }
      upWrap.appendChild(upGrid)
      extra.appendChild(upWrap)
    }

    // Sell quantity selector
    const sellWrap = document.createElement('div')
    sellWrap.className = 'biz-sell-wrap'

    const sellAmounts = owned >= 10 ? [1, 10, owned] : [1, owned]
    for (const amt of [...new Set(sellAmounts)]) {
      const sellBtn = document.createElement('button')
      sellBtn.type = 'button'
      sellBtn.className = `btn-secondary biz-sell-btn${amt === 1 ? ' biz-sell-active' : ''}`
      sellBtn.dataset.action = 'sell-producer'
      sellBtn.dataset.id = p.id
      sellBtn.dataset.count = String(amt)
      const refundEst = Math.floor(state.producerCostFor(p, owned - amt, amt) * 0.55)
      sellBtn.textContent = amt === owned ? `Hepsini Sat (${owned}) · +${formatMoney(refundEst)}` : `Sat ×${amt} · +${formatMoney(refundEst)}`
      sellWrap.appendChild(sellBtn)
    }
    extra.appendChild(sellWrap)
    if (obsLabel && !state.producerModernized[p.id]) {
      const modCost = modernizeCost(p, owned)
      const modBtn = document.createElement('button')
      modBtn.type = 'button'
      modBtn.className = 'btn-primary biz-modernize-btn'
      modBtn.dataset.action = 'modernize-producer'
      modBtn.dataset.id = p.id
      modBtn.textContent = `Modernize · ${formatMoney(modCost)}`
      modBtn.disabled = !state.canAfford(modCost)
      extra.appendChild(modBtn)
    }
    appendFranchiseSection(extra as HTMLElement, p.id, producerName(p), owned, state)
  }

  const newBadgeEl = card.querySelector('[data-new-badge]') as HTMLElement | null
  if (newBadgeEl) {
    const boughtAt = recentlyBoughtAt[p.id]
    newBadgeEl.hidden = !boughtAt || (Date.now() - boughtAt) > 30_000
  }
}

export function filterProducersForShop(
  state: GameState,
  bizTypeFilter: BizTypeFilter,
  bizSortOrder: BizSortOrder,
  matchesBizFilter: (p: ProducerDef, filter: BizTypeFilter) => boolean,
): ProducerDef[] {
  return sortProducers(
    state.unlockedProducers()
      .filter((p) => !p.category)
      .filter((p) => matchesBizFilter(p, bizTypeFilter)),
    bizSortOrder,
    state,
  )
}

export function renderLockedPreviewCard(p: ProducerDef, state: GameState): HTMLElement {
  const card = document.createElement('div')
  card.className = 'biz-hero-card biz-hero-locked'
  card.dataset.producerId = p.id
  const unlockAt = scaledUnlockAt(p)
  const earlyCost = earlyUnlockCost(p)
  const canEarly = state.canAfford(earlyCost)
  const earned = state.totalEarned
  const pct = Math.min(100, Math.floor((earned / unlockAt) * 100))
  const remaining = Math.max(0, unlockAt - earned)
  card.innerHTML = `
    <div class="biz-locked-head">
      <div class="biz-hero-icon-wrap biz-locked-icon-wrap">
        <span class="biz-hero-emoji">${p.emoji}</span>
        <span class="biz-lock-pip">🔒</span>
      </div>
      <div class="biz-hero-titles">
        <strong class="biz-hero-name">${producerName(p)}</strong>
        <small class="biz-hero-desc">${p.description}</small>
      </div>
    </div>
    <div class="biz-unlock-progress">
      <div class="biz-unlock-bar-wrap">
        <div class="biz-unlock-bar" style="width:${pct}%"></div>
      </div>
      <div class="biz-unlock-labels">
        <span>${formatMoney(earned)}</span>
        <span>${formatMoney(unlockAt)}</span>
      </div>
    </div>
    <button type="button" class="biz-early-btn" data-action="early-unlock" data-id="${p.id}" ${canEarly ? '' : 'disabled'}>
      🔓 Erken aç · ${formatMoney(earlyCost)}${remaining > 0 ? `<span class="biz-early-hint"> · ${formatMoney(remaining)} daha kazan</span>` : ''}
    </button>
  `
  return card
}
