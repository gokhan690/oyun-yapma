import { fmtMoney, refToast } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import {
  EXPANSION_CITIES,
  canUnlockCity,
  cityProducerBonus,
  type CityId,
} from '../../game/ExpansionMap'
import { RefKpiStrip, type KpiItem } from './RefKpiStrip'
import { SaveManager } from '../../security/SaveManager'

const CITY_EMOJIS: Record<string, string> = {
  istanbul: '🌉',
  ankara: '🏛️',
  izmir: '🌊',
  dubai: '🏜️',
  london: '🇬🇧',
}

const REGIONAL_BONUSES: { city: CityId; category: string; bonus: string }[] = [
  { city: 'ankara', category: 'Siyaset', bonus: '+%20 Siyaset geliri' },
  { city: 'izmir', category: 'Turizm/Lüks', bonus: '+%20 Turizm · +%10 Lüks' },
  { city: 'dubai', category: 'Finans/Lüks', bonus: '+%25 Lüks · +%15 Finans' },
  { city: 'london', category: 'Finans/Bilim', bonus: '+%25 Finans · +%15 Bilim' },
]

export class RefCitiesPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'ŞEHİRLER'

  private state?: GameState
  private kpiStrip?: RefKpiStrip
  private cityListEl?: HTMLElement

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-cities-page'
    this.el.addEventListener('click', (e) => this.handleClick(e))
    this.build()
  }

  refresh(state: GameState): void {
    this.state = state
    this.kpiStrip?.update(this.kpiItems(state))
    this.renderCityList()
  }

  private kpiItems(s: GameState): KpiItem[] {
    const unlocked = s.cities.unlocked.length
    const totalCities = EXPANSION_CITIES.length
    const incomePerDay = Math.round(s.incomePerDay())
    const globalBonus = Math.round(cityProducerBonus(s.cities, 'finance') * 100)
    const firmCount = Object.values(s.producers).filter((c) => c > 0).length
    return [
      { icon: '🌍', label: 'Toplam Şehir', value: `${unlocked}/${totalCities}`, sub: 'Fethedilen', subDir: unlocked > 1 ? 'up' : 'muted' },
      { icon: '💰', label: 'Şehirlerden Gelir', value: fmtMoney(incomePerDay), sub: 'Günlük', subDir: 'up' },
      { icon: '⭐', label: 'Küresel Nüfuz', value: String(s.reputation ?? 0), sub: 'İtibar puanı', subDir: (s.reputation ?? 0) > 0 ? 'up' : 'muted' },
      { icon: '🏢', label: 'Aktif İşletme', value: String(firmCount), sub: `${globalBonus > 0 ? `+%${globalBonus} finans bon.` : 'Şehir bonusları'}`, subDir: firmCount > 0 ? 'up' : 'muted' },
    ]
  }

  private build(): void {
    const s = this.state
    if (s) {
      this.kpiStrip = new RefKpiStrip(this.kpiItems(s))
      this.el.appendChild(this.kpiStrip.el)
    }

    // Yolculuk Yolu (zincir)
    const journeySection = document.createElement('div')
    journeySection.className = 'ref-cities-journey'
    journeySection.innerHTML = this.buildJourneyHtml()
    this.el.appendChild(journeySection)

    // Şehir Yönetim Kartları
    const listTitle = document.createElement('div')
    listTitle.className = 'ref-cities-section-title'
    listTitle.textContent = 'Şehir Yönetimi'
    this.el.appendChild(listTitle)

    this.cityListEl = document.createElement('div')
    this.cityListEl.className = 'ref-cities-list'
    this.el.appendChild(this.cityListEl)
    this.renderCityList()

    // Bölgesel Bonuslar
    const bonusTitle = document.createElement('div')
    bonusTitle.className = 'ref-cities-section-title'
    bonusTitle.textContent = 'Bölgesel Bonuslar'
    this.el.appendChild(bonusTitle)

    const bonusGrid = document.createElement('div')
    bonusGrid.className = 'ref-cities-bonuses'
    bonusGrid.innerHTML = REGIONAL_BONUSES.map((b) => `
      <div class="ref-city-bonus-row">
        <span class="ref-city-bonus-ico">${CITY_EMOJIS[b.city] ?? '🌍'}</span>
        <div class="ref-city-bonus-info">
          <span class="ref-city-bonus-city">${EXPANSION_CITIES.find((c) => c.id === b.city)?.label ?? b.city}</span>
          <span class="ref-city-bonus-cat">${b.category}</span>
        </div>
        <span class="ref-city-bonus-val">${b.bonus}</span>
      </div>
    `).join('')
    this.el.appendChild(bonusGrid)
  }

  private buildJourneyHtml(): string {
    const s = this.state
    const unlockedIds = s ? s.cities.unlocked : ['istanbul']
    return `
      <div class="ref-cities-journey-inner">
        ${EXPANSION_CITIES.map((city, i) => {
          const isUnlocked = unlockedIds.includes(city.id)
          const isLast = i === EXPANSION_CITIES.length - 1
          return `
            <div class="ref-journey-stop${isUnlocked ? ' ref-journey-stop--unlocked' : ''}">
              <div class="ref-journey-node">${isUnlocked ? city.emoji : '🔒'}</div>
              <div class="ref-journey-label">${city.label}</div>
              ${!isLast ? '<div class="ref-journey-connector"></div>' : ''}
            </div>`
        }).join('')}
      </div>`
  }

  private renderCityList(): void {
    if (!this.cityListEl) return
    const s = this.state
    const unlockedIds = s ? s.cities.unlocked : ['istanbul']
    const activeCity = s?.cities.activeCity ?? 'istanbul'

    this.cityListEl.innerHTML = EXPANSION_CITIES.map((city) => {
      const isUnlocked = unlockedIds.includes(city.id)
      const isActive = city.id === activeCity
      const check = s ? canUnlockCity(city.id, s.cities, s.money, s.reputation, s.ipoCount) : { ok: false, reason: 'Veri yok' }
      const categoryBonusHtml = city.categoryBonuses
        ? Object.entries(city.categoryBonuses).map(([cat, val]) =>
            `<span class="ref-city-card-bonus">+%${Math.round(val * 100)} ${cat}</span>`
          ).join('')
        : ''

      if (isUnlocked) {
        return `
          <div class="ref-city-mgmt-card ref-city-mgmt-card--active">
            <div class="ref-city-mgmt-card__head">
              <span class="ref-city-mgmt-card__emoji">${city.emoji}</span>
              <div class="ref-city-mgmt-card__info">
                <span class="ref-city-mgmt-card__name">${city.label}</span>
                <div class="ref-city-mgmt-card__bonuses">${categoryBonusHtml}</div>
              </div>
              ${isActive ? '<span class="ref-city-active-badge">Aktif Şehir</span>' : ''}
            </div>
            <div class="ref-city-mgmt-card__foot">
              ${isActive
                ? '<span class="ref-city-mgmt-note">Bu şehirde faaliyet gösteriyorsunuz</span>'
                : `<button type="button" class="ref-city-mgmt-btn" data-set-active="${city.id}">🏙️ AKTİF YAP</button>`}
            </div>
          </div>`
      } else {
        return `
          <div class="ref-city-mgmt-card ref-city-mgmt-card--locked">
            <div class="ref-city-mgmt-card__head">
              <span class="ref-city-mgmt-card__emoji">🔒</span>
              <div class="ref-city-mgmt-card__info">
                <span class="ref-city-mgmt-card__name">${city.label}</span>
                <span class="ref-city-mgmt-card__reason">${check.reason ?? 'Kilitli'}</span>
              </div>
              <span class="ref-city-locked-cost">${fmtMoney(city.unlockCost)}</span>
            </div>
            <div class="ref-city-mgmt-card__foot">
              <button type="button" class="ref-city-mgmt-btn ref-city-mgmt-btn--unlock${check.ok && s ? '' : ' ref-city-mgmt-btn--off'}"
                data-unlock-city="${city.id}" ${check.ok && s ? '' : 'disabled'}>
                🔓 ŞEHİR AÇ · ${fmtMoney(city.unlockCost)}
              </button>
            </div>
          </div>`
      }
    }).join('')
  }

  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const t = e.target as HTMLElement

    const unlockBtn = t.closest<HTMLButtonElement>('[data-unlock-city]')
    if (unlockBtn && !unlockBtn.disabled) {
      const id = unlockBtn.dataset.unlockCity as CityId
      const ok = s.unlockCity(id)
      if (ok) {
        new SaveManager().save(s)
        const def = EXPANSION_CITIES.find((c) => c.id === id)
        refToast(`${def?.emoji ?? '🏙️'} ${def?.label ?? id} fethedildi!`, 'ok')
        this.kpiStrip?.update(this.kpiItems(s))
        this.renderCityList()
        this.el.querySelector('.ref-cities-journey-inner')!.outerHTML = this.buildJourneyHtml()
      } else {
        const check = canUnlockCity(id, s.cities, s.money, s.reputation, s.ipoCount)
        refToast(check.reason ?? 'Şehir açılamadı', 'err')
      }
      return
    }

    const setActiveBtn = t.closest<HTMLButtonElement>('[data-set-active]')
    if (setActiveBtn) {
      const id = setActiveBtn.dataset.setActive as CityId
      s.cities.activeCity = id
      new SaveManager().save(s)
      refToast(`🏙️ Aktif şehir: ${EXPANSION_CITIES.find((c) => c.id === id)?.label ?? id}`, 'ok')
      this.renderCityList()
    }
  }
}
