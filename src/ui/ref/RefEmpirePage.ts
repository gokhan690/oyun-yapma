import { sectionTitle, ua, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

interface City { key: keyof typeof REF_ASSETS_V2_GENERIC.cities; name: string; firms: number; income: number; owned: boolean }
const CITIES: City[] = [
  { key: 'istanbul', name: 'İstanbul', firms: 6, income: 14_200_000, owned: true },
  { key: 'ankara',   name: 'Ankara',   firms: 3, income: 6_800_000,  owned: true },
  { key: 'izmir',    name: 'İzmir',    firms: 3, income: 5_300_000,  owned: true },
  { key: 'dubai',    name: 'Dubai',    firms: 0, income: 0,          owned: false },
  { key: 'london',   name: 'Londra',   firms: 0, income: 0,          owned: false },
]

interface Dept { asset: string; name: string; lvl: number }
const DEPTS: Dept[] = [
  { asset: REF_ASSETS_V2_GENERIC.departments.operations,     name: 'Operasyon', lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.finance,        name: 'Finans',    lvl: 6 },
  { asset: REF_ASSETS_V2_GENERIC.departments.marketing,      name: 'Pazarlama', lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.legal,          name: 'Hukuk',     lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.rnd,            name: 'Ar-Ge',     lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.security,       name: 'Güvenlik',  lvl: 2 },
  { asset: REF_ASSETS_V2_GENERIC.departments.globalStrategy, name: 'Strateji',  lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.politics,       name: 'Siyaset',   lvl: 1 },
]

export class RefEmpirePage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'İMPARATORLUK'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-empire-page'

    // Özet şerit
    const summary = document.createElement('div')
    summary.className = 'ref-empire-summary'
    summary.innerHTML = `
      <div class="ref-empire-summary__item"><span>🏙️</span><b>3</b><small>Şehir</small></div>
      <div class="ref-empire-summary__item"><span>🏢</span><b>12</b><small>Firma</small></div>
      <div class="ref-empire-summary__item"><span>🏛️</span><b>8</b><small>Departman</small></div>
      <div class="ref-empire-summary__item"><span>💎</span><b>₺248M</b><small>Değer</small></div>
    `
    this.el.appendChild(summary)

    // Şehirler
    this.el.appendChild(sectionTitle('Şehirler'))
    const cityGrid = document.createElement('div')
    cityGrid.className = 'ref-city-grid'
    cityGrid.innerHTML = CITIES.map(c => {
      const card = REF_ASSETS_V2_GENERIC.cities[c.key].card
      return `
        <div class="ref-city-card ${c.owned ? '' : 'locked'}">
          <div class="ref-city-card__img">
            <img src="${ua(card)}" alt="">
            ${c.owned ? '' : '<span class="ref-city-lock">🔒</span>'}
          </div>
          <div class="ref-city-card__body">
            <div class="ref-city-card__name">${c.name}</div>
            ${c.owned
              ? `<div class="ref-city-card__meta">${c.firms} firma · ${fmtMoney(c.income)}/gün</div>`
              : `<div class="ref-city-card__meta locked">Kilitli — yakında</div>`}
          </div>
        </div>
      `
    }).join('')
    this.el.appendChild(cityGrid)

    // Departmanlar
    this.el.appendChild(sectionTitle('Departmanlar'))
    const deptGrid = document.createElement('div')
    deptGrid.className = 'ref-dept-grid'
    deptGrid.innerHTML = DEPTS.map(d => `
      <div class="ref-dept-tile">
        <img src="${ua(d.asset)}" alt="" class="ref-dept-tile__img">
        <span class="ref-dept-tile__name">${d.name}</span>
        <span class="ref-dept-tile__lvl">Sv ${d.lvl}</span>
      </div>
    `).join('')
    this.el.appendChild(deptGrid)
  }
}
