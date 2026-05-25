import type { GameState } from '../../../game/GameState'
import { formatMoney } from '../../../game/Economy'
import { COMMODITIES, commodityChangePct } from '../../../game/Commodities'
import { INSURANCE_DAILY_COST } from '../../../game/Insurance'
import { UNDERGROUND_MARKET } from '../../../game/UndergroundMarket'
import { ADVISOR_FEE } from '../../../game/AdvisorNPC'

export type TabHeroFn = (icon: string, title: string, subtitle: string, stat?: string) => HTMLElement

export function renderInsurancePanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('🛡️', 'İşletme Sigortası', 'Risk al veya güvenlik için öde — gerçek karar', ''))
  for (const [kind, label, desc] of [
    ['business', 'Fabrika Sigortası', 'Baskında hasar yarıya iner'] as const,
    ['illegal', 'Illegal Koruma', 'İlk polis baskını bağışık'] as const,
    ['dynasty', 'Hanedan Sigortası', 'Mirasçısız ölümde %50 varlık korunur'] as const,
  ]) {
    const active = state.insurance[kind]
    const cost = INSURANCE_DAILY_COST[kind]
    const card = document.createElement('div')
    card.className = `shop-card${active ? ' manager-active' : ''}`
    card.innerHTML = `<strong>${label}</strong><p>${desc}</p><span>${formatMoney(cost)}/gün</span>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = active ? 'btn-secondary' : 'btn-primary'
    btn.dataset.action = 'insurance-toggle'
    btn.dataset.id = kind
    btn.textContent = active ? 'İptal et' : 'Aktif et'
    card.appendChild(btn)
    panel.appendChild(card)
  }
}

export function renderCommoditiesPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('📦', 'Emtialar', 'Altın, petrol, buğday, kahve — haberlerle al/sat', ''))
  if (state.advisorTip) {
    const adv = document.createElement('div')
    adv.className = 'advisor-card'
    adv.innerHTML = `<strong>👨‍💼 Danışman Kemal</strong><p>${state.advisorTip.headline}</p>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-secondary'
    btn.dataset.action = 'advisor-pay'
    btn.textContent = `Dinle → ${formatMoney(ADVISOR_FEE)}`
    adv.appendChild(btn)
    panel.appendChild(adv)
  }
  for (const c of COMMODITIES) {
    const price = state.commodities.prices[c.id] ?? c.basePrice
    const chg = commodityChangePct(state.commodities, c.id)
    const held = state.commodities.holdings[c.id] ?? 0
    const chgClass = chg >= 0 ? 'pl-positive' : chg < 0 ? 'pl-negative' : ''
    const card = document.createElement('div')
    card.className = 'shop-card stock-board-card'
    card.innerHTML = `
      <div><strong>${c.emoji} ${c.name}</strong><br>${formatMoney(price)}/${c.unit}</div>
      <div class="${chgClass}">${chg >= 0 ? '▲' : chg < 0 ? '▼' : '→'} ${Math.abs(chg).toFixed(1)}%</div>
      <div>Stok: ${held}</div>
    `
    const buy = document.createElement('button')
    buy.type = 'button'
    buy.className = 'btn-primary'
    buy.dataset.action = 'commodity-buy'
    buy.dataset.id = c.id
    buy.textContent = 'Al'
    const sell = document.createElement('button')
    sell.type = 'button'
    sell.className = 'btn-secondary'
    sell.dataset.action = 'commodity-sell'
    sell.dataset.id = c.id
    sell.textContent = 'Sat'
    sell.disabled = held <= 0
    card.append(buy, sell)
    panel.appendChild(card)
  }
}

export function renderOpportunitiesPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('💡', 'Yatırım Fırsatları', 'Süreli startup teklifleri — yüksek getiri, garantisiz', ''))
  const offer = state.investmentOffer
  if (!offer) {
    const empty = document.createElement('p')
    empty.className = 'finance-sub-hint'
    empty.textContent = 'Yeni fırsat birkaç gün içinde gelecek. Piyasa sekmesini kontrol et.'
    panel.appendChild(empty)
    return
  }
  const left = Math.max(0, Math.floor((offer.expiresAt - Date.now()) / 1000))
  const card = document.createElement('div')
  card.className = 'shop-card investment-offer-card'
  card.innerHTML = `
    <strong>⏰ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} kaldı</strong>
    <h4>${offer.title}</h4>
    <p>${offer.description}</p>
    <p>Maliyet: ${formatMoney(offer.cost)}</p>
  `
  const invest = document.createElement('button')
  invest.type = 'button'
  invest.className = 'btn-primary'
  invest.dataset.action = 'investment-accept'
  invest.textContent = 'Yatır'
  const skip = document.createElement('button')
  skip.type = 'button'
  skip.className = 'btn-secondary'
  skip.dataset.action = 'investment-dismiss'
  skip.textContent = 'Geç'
  card.append(invest, skip)
  panel.appendChild(card)
}

export function renderUndergroundMarketPanel(
  state: GameState,
  panel: HTMLElement,
  createTabHero: TabHeroFn,
): void {
  panel.appendChild(createTabHero('🕶️', 'Kara Borsa', 'Heat artırır — sadece cesur baronlar', ''))
  for (const def of UNDERGROUND_MARKET) {
    if (def.id === 'intel_leak' && !state.hasVictoryMechanic('shadow_network')) continue
    const active = state.undergroundMarketActive.includes(def.id)
    const card = document.createElement('div')
    card.className = `shop-card${active ? ' manager-active' : ''}`
    card.innerHTML = `<strong>${def.emoji} ${def.name}</strong><p>${def.description}</p><span>${formatMoney(def.dailyCost)}/gün · Heat +${def.heatGain}</span>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = active ? 'btn-secondary' : 'btn-primary'
    btn.dataset.action = 'underground-market-toggle'
    btn.dataset.id = def.id
    btn.textContent = active ? 'Kapat' : 'Aç'
    card.appendChild(btn)
    panel.appendChild(card)
  }
}
