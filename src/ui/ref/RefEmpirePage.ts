import { sectionTitle, ua, fmtMoney, demoBanner } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS } from '../../game/Economy'
import { politicsLevelLabel } from '../../game/Empire'

interface CityDef { key: keyof typeof REF_ASSETS_V2_GENERIC.cities; name: string; id: string }
const CITY_DEFS: CityDef[] = [
  { key: 'istanbul', name: 'İstanbul',  id: 'istanbul' },
  { key: 'ankara',   name: 'Ankara',    id: 'ankara' },
  { key: 'izmir',    name: 'İzmir',     id: 'izmir' },
  { key: 'dubai',    name: 'Dubai',     id: 'dubai' },
  { key: 'london',   name: 'Londra',    id: 'london' },
]

interface Dept { asset: string; name: string; lvl: number }
const DEPTS: Dept[] = [
  { asset: REF_ASSETS_V2_GENERIC.departments.operations,     name: 'Operasyon', lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.finance,        name: 'Finans',    lvl: 6 },
  { asset: REF_ASSETS_V2_GENERIC.departments.marketing,      name: 'Pazarlama', lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.hr,             name: 'İK',        lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.legal,          name: 'Hukuk',     lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.rnd,            name: 'Ar-Ge',     lvl: 5 },
  { asset: REF_ASSETS_V2_GENERIC.departments.logistics,      name: 'Lojistik',  lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.security,       name: 'Güvenlik',  lvl: 2 },
  { asset: REF_ASSETS_V2_GENERIC.departments.prMedia,        name: 'PR/Medya',  lvl: 3 },
  { asset: REF_ASSETS_V2_GENERIC.departments.familyOffice,   name: 'Aile Ofisi', lvl: 4 },
  { asset: REF_ASSETS_V2_GENERIC.departments.politics,       name: 'Siyaset',   lvl: 1 },
  { asset: REF_ASSETS_V2_GENERIC.departments.globalStrategy, name: 'Strateji',  lvl: 4 },
]

export class RefEmpirePage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'İMPARATORLUK'
  private state?: GameState

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-empire-page'
    this.build()
  }

  private build(): void {
    const s = this.state

    // ── Özet şerit (gerçek veri varsa oradan, yoksa mock) ───────────────
    const cityCount    = s ? s.cities.unlocked.length : 3
    const firmCount    = s ? Object.values(s.producers).filter(c => c > 0).length : 12
    const deptCount    = DEPTS.length

    // Sahip olunan özel işletmeler
    const sportOwned   = s ? PRODUCERS.filter(p => p.category === 'sport'    && (s.producers[p.id] ?? 0) > 0) : []
    const politicsOwned= s ? PRODUCERS.filter(p => p.category === 'politics' && (s.producers[p.id] ?? 0) > 0) : []
    const darkOwned    = s ? PRODUCERS.filter(p => (p.category === 'dark' || p.illegal) && (s.producers[p.id] ?? 0) > 0) : []
    const luxOwned     = s ? PRODUCERS.filter(p => p.category === 'luxury'   && (s.producers[p.id] ?? 0) > 0) : []

    const empireIncome = s
      ? [...sportOwned, ...politicsOwned, ...darkOwned, ...luxOwned].reduce((sum, p) => sum + s.producerIncome(p), 0)
      : 0

    const summary = document.createElement('div')
    summary.className = 'ref-empire-summary'
    summary.innerHTML = `
      <div class="ref-empire-summary__item"><span>🏙️</span><b>${cityCount}</b><small>Şehir</small></div>
      <div class="ref-empire-summary__item"><span>🏢</span><b>${firmCount}</b><small>Firma</small></div>
      <div class="ref-empire-summary__item"><span>🏛️</span><b>${deptCount}</b><small>Departman</small></div>
      <div class="ref-empire-summary__item"><span>💎</span><b>${empireIncome > 0 ? fmtMoney(empireIncome) : '—'}</b><small>${empireIncome > 0 ? 'İmpGelir' : 'Değer'}</small></div>
    `
    this.el.appendChild(summary)

    // ── Spor gücü ──────────────────────────────────────────────────────
    if (s && sportOwned.length > 0) {
      this.el.appendChild(sectionTitle(`Spor İmparatorluğu · ${sportOwned.length} kulüp`))
      const sportGrid = document.createElement('div')
      sportGrid.className = 'ref-empire-power-grid'
      for (const p of sportOwned) {
        const count = s.producers[p.id] ?? 0
        const income = Math.round(s.producerIncome(p))
        sportGrid.innerHTML += `
          <div class="ref-empire-power-card">
            <span class="ref-empire-power-card__ico">${p.emoji}</span>
            <div class="ref-empire-power-card__name">${p.name}</div>
            <div class="ref-empire-power-card__meta">${count} adet · ${fmtMoney(income)}/gün</div>
          </div>`
      }
      this.el.appendChild(sportGrid)
    }

    // ── Siyasi güç ─────────────────────────────────────────────────────
    if (s && politicsOwned.length > 0) {
      this.el.appendChild(sectionTitle(`Siyasi Güç · ${politicsOwned.length} mevzi`))
      const polLevel = s.empire.politics.level ?? 'none'
      const polCard = document.createElement('div')
      polCard.className = 'ref-politics-card'
      polCard.innerHTML = `
        <div class="ref-politics-card__level">
          <span>🏛️</span>
          <b>${politicsLevelLabel(polLevel)}</b>
        </div>
        <div class="ref-politics-card__offices">
          ${politicsOwned.map(p => `
            <span class="ref-politics-tag">${p.emoji} ${p.name} (${s.producers[p.id]})</span>
          `).join('')}
        </div>
      `
      this.el.appendChild(polCard)
    }

    // ── Yeraltı ısısı ──────────────────────────────────────────────────
    if (s && darkOwned.length > 0) {
      this.el.appendChild(sectionTitle(`Yeraltı Ağı · ${darkOwned.length} operasyon`))
      const heat = Math.round(s.illegalHeat * 100)
      const heatFill = heat < 30 ? 'high' : heat < 60 ? 'medium' : 'low'
      const heatCard = document.createElement('div')
      heatCard.className = 'ref-dark-card'
      heatCard.innerHTML = `
        <div class="ref-dark-card__row">
          <span>🌡️ Polis Isısı</span>
          <span>${heat}%</span>
        </div>
        <div class="ref-perf-track"><div class="ref-perf-fill ${heatFill}" style="width:${heat}%"></div></div>
        <div class="ref-dark-card__ops">
          ${darkOwned.map(p => `
            <span class="ref-dark-tag">${p.emoji} ${p.name} (${s.producers[p.id]})</span>
          `).join('')}
        </div>
      `
      this.el.appendChild(heatCard)
    }

    // ── Lüks varlıklar ─────────────────────────────────────────────────
    if (s && luxOwned.length > 0) {
      this.el.appendChild(sectionTitle(`Lüks Varlıklar · ${luxOwned.length} kalem`))
      const luxGrid = document.createElement('div')
      luxGrid.className = 'ref-empire-power-grid'
      for (const p of luxOwned) {
        const count = s.producers[p.id] ?? 0
        const income = Math.round(s.producerIncome(p))
        luxGrid.innerHTML += `
          <div class="ref-empire-power-card lux">
            <span class="ref-empire-power-card__ico">${p.emoji}</span>
            <div class="ref-empire-power-card__name">${p.name}</div>
            <div class="ref-empire-power-card__meta">${count} adet · ${fmtMoney(income)}/gün</div>
          </div>`
      }
      this.el.appendChild(luxGrid)
    }

    // ── Boş durum (state var ama hiç özel işletme yok) ─────────────────
    if (s && sportOwned.length === 0 && politicsOwned.length === 0 && darkOwned.length === 0 && luxOwned.length === 0) {
      const emptyCard = document.createElement('div')
      emptyCard.className = 'ref-empire-empty-state'
      emptyCard.innerHTML = `
        <div class="ref-empire-empty-state__ico">👑</div>
        <div class="ref-empire-empty-state__title">İmparatorluk Yatırımları</div>
        <div class="ref-empire-empty-state__desc">Spor, siyaset, lüks ve yeraltı varlıklarını İşletmeler → İmparatorluk Yatırımları sekmesinden alabilirsin.</div>
      `
      this.el.appendChild(emptyCard)
    }

    // ── Departmanlar (MOCK — salt görüntü) ──────────────────────────────
    if (!s) {
      this.el.appendChild(demoBanner('departman/şehir paneli henüz oyun verisine bağlı değil'))
    }

    this.el.appendChild(sectionTitle('Departmanlar', `${deptCount} birim`))
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

    // ── Şehirler ───────────────────────────────────────────────────────
    this.el.appendChild(sectionTitle('Şehirler', '5 bölge'))
    const cityGrid = document.createElement('div')
    cityGrid.className = 'ref-city-grid'
    cityGrid.innerHTML = CITY_DEFS.map(c => {
      const owned = s ? s.cities.unlocked.includes(c.id as any) : ['istanbul','ankara','izmir'].includes(c.id)
      const card = REF_ASSETS_V2_GENERIC.cities[c.key].card
      // Şehirdeki firma sayısı (yaklaşım)
      const firmsInCity = s
        ? Object.entries(s.producers).filter(([,cnt]) => cnt > 0).length
        : 0
      const cityIncome = s && owned ? Math.round(s.incomePerDay() / Math.max(1, s.cities.unlocked.length)) : 0

      return `
        <div class="ref-city-card ${owned ? '' : 'locked'}">
          <div class="ref-city-card__img">
            <img src="${ua(card)}" alt="">
            ${owned ? '' : '<span class="ref-city-lock">🔒</span>'}
          </div>
          <div class="ref-city-card__body">
            <div class="ref-city-card__name">${c.name}</div>
            ${owned
              ? `<div class="ref-city-card__meta">${s ? firmsInCity + ' firma · ' + fmtMoney(cityIncome) + '/gün' : 'Aktif'}</div>`
              : `<div class="ref-city-card__meta locked">Kilitli — yakında</div>`}
          </div>
        </div>
      `
    }).join('')
    this.el.appendChild(cityGrid)
  }
}
