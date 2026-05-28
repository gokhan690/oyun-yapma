import type { GameState } from '../../../game/GameState'
import { formatMoney, formatIncomeRate } from '../../../game/Economy'
import { COMMODITIES, commodityChangePct } from '../../../game/Commodities'
import { insuranceDailyCost, type InsuranceState } from '../../../game/Insurance'
import { UNDERGROUND_MARKET } from '../../../game/UndergroundMarket'
import { ADVISOR_FEE } from '../../../game/AdvisorNPC'
import { t, tRaw } from '../../../i18n'

export type TabHeroFn = (icon: string, title: string, subtitle: string, stat?: string) => HTMLElement

export function renderInsurancePanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('🛡️', t('ins_title'), t('ins_subtitle'), ''))
  const totalBiz = Object.values(state.producers).reduce((a, b) => a + ((b as number) ?? 0), 0)
  const incomePerDay = state.incomePerDay()
  for (const [kind, labelKey, descKey] of [
    ['business', 'ins_business', 'ins_business_desc'] as const,
    ['illegal', 'ins_illegal', 'ins_illegal_desc'] as const,
    ['dynasty', 'ins_dynasty', 'ins_dynasty_desc'] as const,
  ]) {
    const active = state.insurance[kind]
    // Sadece bu poliçenin günlük primi (gelire oranlı gerçek tutar)
    const singleKind = { business: false, illegal: false, dynasty: false } as InsuranceState
    singleKind[kind] = true
    const cost = insuranceDailyCost(singleKind, totalBiz, state.ipoCount, incomePerDay)
    const card = document.createElement('div')
    card.className = `shop-card${active ? ' manager-active' : ''}`
    card.innerHTML = `<strong>${t(labelKey)}</strong><p>${t(descKey)}</p><span>${formatMoney(cost)}${t('lbl_per_day')}</span>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = active ? 'btn-secondary' : 'btn-primary'
    btn.dataset.action = 'insurance-toggle'
    btn.dataset.id = kind
    btn.textContent = active ? t('btn_cancel') : t('btn_activate')
    card.appendChild(btn)
    panel.appendChild(card)
  }
}

export function renderCommoditiesPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('📦', t('com_title'), t('com_subtitle'), ''))

  // --- Aktif Etkiler bölümü ---
  const comChips: string[] = []

  for (const c of COMMODITIES) {
    const chg = commodityChangePct(state.commodities, c.id)
    if (Math.abs(chg) >= 10) {
      comChips.push(`${chg > 0 ? '📈' : '📉'} ${c.emoji} ${c.name}: ${chg > 0 ? '+' : ''}${chg.toFixed(1)}%`)
    }
  }

  const totalHeld = COMMODITIES.reduce((sum, c) => sum + (state.commodities.holdings[c.id] ?? 0), 0)
  if (totalHeld > 0) {
    comChips.push(`📦 ${totalHeld} birim pozisyon açık`)
  }

  let totalPl = 0
  for (const c of COMMODITIES) {
    const held = state.commodities.holdings[c.id] ?? 0
    if (held > 0) {
      const price = state.commodities.prices[c.id] ?? c.basePrice
      const avg = state.commodities.avgBuy[c.id] ?? c.basePrice
      totalPl += (price - avg) * held
    }
  }
  if (totalHeld > 0) {
    const plSign = totalPl >= 0 ? '+' : ''
    comChips.push(`${totalPl >= 0 ? '✅' : '🔴'} Toplam K/Z: ${plSign}${formatMoney(totalPl)}`)
  }

  if (comChips.length > 0) {
    const fxEl = document.createElement('div')
    fxEl.className = 'stock-active-effects'
    fxEl.innerHTML = comChips.map(c => `<span class="fx-chip">${c}</span>`).join('')
    panel.appendChild(fxEl)
  }
  // --- /Aktif Etkiler ---

  if (state.advisorTip) {
    const adv = document.createElement('div')
    adv.className = 'advisor-card'
    adv.innerHTML = `<strong>${t('com_advisor')}</strong><p>${state.advisorTip.headline}</p>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-secondary'
    btn.dataset.action = 'advisor-pay'
    btn.textContent = t('com_advisor_btn').replace('{cost}', formatMoney(ADVISOR_FEE))
    adv.appendChild(btn)
    panel.appendChild(adv)
  }
  for (const c of COMMODITIES) {
    const price = state.commodities.prices[c.id] ?? c.basePrice
    const chg = commodityChangePct(state.commodities, c.id)
    const held = state.commodities.holdings[c.id] ?? 0
    const chgClass = chg >= 0 ? 'pl-positive' : chg < 0 ? 'pl-negative' : ''
    const comName = tRaw('com_' + c.id) ?? c.name
    const card = document.createElement('div')
    card.className = 'shop-card stock-board-card'
    card.innerHTML = `
      <div><strong>${c.emoji} ${comName}</strong><br>${formatMoney(price)}/${c.unit}</div>
      <div class="${chgClass}">${chg >= 0 ? '▲' : chg < 0 ? '▼' : '→'} ${Math.abs(chg).toFixed(1)}%</div>
      <div>${t('com_stock').replace('{n}', String(held))}</div>
    `
    const buy = document.createElement('button')
    buy.type = 'button'
    buy.className = 'btn-primary'
    buy.dataset.action = 'commodity-buy'
    buy.dataset.id = c.id
    buy.textContent = t('btn_buy')
    const sell = document.createElement('button')
    sell.type = 'button'
    sell.className = 'btn-secondary'
    sell.dataset.action = 'commodity-sell'
    sell.dataset.id = c.id
    sell.textContent = t('btn_sell')
    sell.disabled = held <= 0
    const customRow = document.createElement('div')
    customRow.className = 'finance-custom-row commodity-custom-row'
    const input = document.createElement('input')
    input.type = 'number'
    input.inputMode = 'numeric'
    input.min = '1'
    input.step = '1'
    input.placeholder = t('stock_qty_hint')
    input.className = 'finance-custom-input'
    const buyCustom = document.createElement('button')
    buyCustom.type = 'button'
    buyCustom.className = 'btn-primary btn-sm'
    buyCustom.dataset.action = 'commodity-buy'
    buyCustom.dataset.id = c.id
    buyCustom.dataset.count = 'custom'
    buyCustom.textContent = t('btn_buy')
    buyCustom.addEventListener('pointerdown', (e) => e.preventDefault())
    const sellCustom = document.createElement('button')
    sellCustom.type = 'button'
    sellCustom.className = 'btn-secondary btn-sm'
    sellCustom.dataset.action = 'commodity-sell'
    sellCustom.dataset.id = c.id
    sellCustom.dataset.count = 'custom'
    sellCustom.textContent = t('btn_sell')
    sellCustom.disabled = held <= 0
    sellCustom.addEventListener('pointerdown', (e) => e.preventDefault())
    customRow.append(input, buyCustom, sellCustom)
    card.append(buy, sell, customRow)
    panel.appendChild(card)
  }
}

export function renderOpportunitiesPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('💡', t('opp_title'), t('opp_subtitle'), ''))
  const offer = state.investmentOffer
  if (!offer) {
    const empty = document.createElement('p')
    empty.className = 'finance-sub-hint'
    empty.textContent = t('opp_no_offer')
    panel.appendChild(empty)
    return
  }
  const left = Math.max(0, Math.floor((offer.expiresAt - Date.now()) / 1000))
  const minStr = String(Math.floor(left / 60))
  const secStr = String(left % 60).padStart(2, '0')
  const timeLeft = t('opp_time_left').replace('{min}', minStr).replace('{sec}', secStr)
  const costReturn = t('opp_cost_return')
    .replace('{cost}', formatMoney(offer.cost))
    .replace('{min}', String(Math.round(offer.minReturn * 100)))
    .replace('{max}', String(Math.round(offer.maxReturn * 100)))
  const card = document.createElement('div')
  card.className = 'shop-card investment-offer-card'
  card.innerHTML = `
    <strong>⏰ ${timeLeft}</strong>
    <h4>${offer.emoji ?? '💡'} ${offer.title}</h4>
    <p><small>${offer.sector ?? 'Startup'}</small> · ${offer.description}</p>
    <p>${costReturn}</p>
  `
  const invest = document.createElement('button')
  invest.type = 'button'
  invest.className = 'btn-primary'
  invest.dataset.action = 'investment-accept'
  invest.textContent = t('btn_invest')
  const skip = document.createElement('button')
  skip.type = 'button'
  skip.className = 'btn-secondary'
  skip.dataset.action = 'investment-dismiss'
  skip.textContent = t('btn_skip')
  card.append(invest, skip)
  panel.appendChild(card)
}

export function renderUndergroundMarketPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('🕶️', t('ug_market_title'), t('ug_market_subtitle'), ''))

  // --- Aktif Etkiler bölümü ---
  const ugChips: string[] = []
  const heat = Math.round(state.illegalHeat)
  const heatLabel = heat < 25 ? 'Düşük' : heat < 55 ? 'Orta' : heat < 80 ? 'Yüksek' : 'Kritik'
  const heatEmoji = heat < 25 ? '🟢' : heat < 55 ? '🟡' : heat < 80 ? '🟠' : '🔴'
  ugChips.push(`${heatEmoji} Heat: ${heat}% (${heatLabel})`)

  const illegalIncome = state.illegalIncomePerDay()
  if (illegalIncome > 0) {
    ugChips.push(`💰 Illegal gelir: ${formatIncomeRate(illegalIncome)}/gün`)
  }

  const heatShieldOn = Date.now() < state.heatShieldUntil
  if (heatShieldOn) {
    const secsLeft = Math.ceil((state.heatShieldUntil - Date.now()) / 1000)
    ugChips.push(`🛡️ Heat Kalkanı aktif (${secsLeft}sn)`)
  }

  const ugFxEl = document.createElement('div')
  ugFxEl.className = 'stock-active-effects'
  ugFxEl.innerHTML = ugChips.map(c => `<span class="fx-chip">${c}</span>`).join('')
  panel.appendChild(ugFxEl)

  if (heat > 50) {
    const warn = document.createElement('div')
    warn.className = 'market-event-banner market-event-banner-top'
    warn.textContent = '⚠️ Yüksek risk — baskın olasılığı arttı!'
    panel.appendChild(warn)
  }
  // --- /Aktif Etkiler ---

  for (const def of UNDERGROUND_MARKET) {
    if (def.id === 'intel_leak' && !state.hasVictoryMechanic('shadow_network')) continue
    const active = state.undergroundMarketActive.includes(def.id)
    const ugName = tRaw('ugm_' + def.id) ?? def.name
    const ugDesc = tRaw('ugm_' + def.id + '_desc') ?? def.description
    const card = document.createElement('div')
    card.className = `shop-card${active ? ' manager-active' : ''}`
    card.innerHTML = `<strong>${def.emoji} ${ugName}</strong><p>${ugDesc}</p><span>${formatMoney(def.dailyCost)}${t('lbl_per_day')} · Heat +${def.heatGain}</span>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = active ? 'btn-secondary' : 'btn-primary'
    btn.dataset.action = 'underground-market-toggle'
    btn.dataset.id = def.id
    btn.textContent = active ? t('btn_close') : t('btn_open')
    card.appendChild(btn)
    panel.appendChild(card)
  }
}
