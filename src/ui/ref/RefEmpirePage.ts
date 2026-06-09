import { sectionTitle, ua, fmtMoney, demoBanner, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { PRODUCERS } from '../../game/Economy'
import { politicsLevelLabel } from '../../game/Empire'
import {
  RESEARCH_NODES,
  researchCost,
  researchIsUnlocked,
  researchPrereqName,
  researchNodeName,
  researchNodeDesc,
  researchNodesByBranch,
  type ResearchBranch,
  type ResearchNode,
} from '../../game/Research'
import { EXPANSION_CITIES, canUnlockCity, type CityId } from '../../game/ExpansionMap'
import { SaveManager } from '../../security/SaveManager'

interface BranchMeta { id: ResearchBranch; label: string; ico: string }
const RESEARCH_BRANCHES: BranchMeta[] = [
  { id: 'operasyon',    label: 'Operasyon Ar-Ge',    ico: '⚙️' },
  { id: 'finans',       label: 'Finans Ar-Ge',       ico: '💰' },
  { id: 'imparatorluk', label: 'İmparatorluk Ar-Ge', ico: '👑' },
]

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
  /** Ar-Ge bölümü için bağımsız re-render hedefi (görselsiz → ucuz tazeleme). */
  private readonly researchHost: HTMLElement

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-empire-page'
    this.researchHost = document.createElement('div')
    this.researchHost.className = 'ref-research-host'
    this.el.addEventListener('click', (e) => this.handleClick(e))
    this.build()
  }

  /** Canlı para → yalnız Ar-Ge satın alma durumlarını tazele (görselleri yeniden decode etme). */
  refresh(state: GameState): void {
    if (!this.state) return
    this.state = state
    this.renderResearch()
  }

  // ── Ar-Ge / Araştırma (gerçek Research sistemi) ─────────────────────
  private renderResearch(): void {
    const s = this.state
    if (!s) return
    this.researchHost.innerHTML = ''
    for (const br of RESEARCH_BRANCHES) {
      const nodes = researchNodesByBranch(br.id)
      if (nodes.length === 0) continue
      this.researchHost.appendChild(sectionTitle(`${br.ico} ${br.label}`, `${nodes.length} dal`))
      const list = document.createElement('div')
      list.className = 'ref-research-list'
      list.innerHTML = nodes.map((n) => this.researchCardHtml(n)).join('')
      this.researchHost.appendChild(list)
    }
  }

  private researchCardHtml(n: ResearchNode): string {
    const s = this.state!
    const level = s.research[n.id] ?? 0
    const maxed = level >= n.maxLevel
    const unlocked = researchIsUnlocked(n.id, s.research)
    const cost = s.researchCostWithWeekly(researchCost(n, level))
    const isPrestige = n.currency === 'prestige'
    const affordable = isPrestige ? s.prestigePoints >= cost : s.canAfford(cost)
    const costText = isPrestige ? `${cost} ⭐` : fmtMoney(cost)
    const pips = Array.from({ length: n.maxLevel }, (_, i) =>
      `<span class="${i < level ? 'on' : ''}"></span>`).join('')

    let foot: string
    if (maxed) {
      foot = `<span class="ref-research-badge maxed">MAKS</span>`
    } else if (!unlocked) {
      const pre = researchPrereqName(n.id) ?? 'Önkoşul'
      foot = `<span class="ref-research-badge locked">🔒 ${pre} gerekli</span>`
    } else {
      foot = `<button type="button" class="ref-research-buy" data-research-id="${n.id}"${affordable ? '' : ' disabled aria-disabled="true"'}>${affordable ? `Yükselt · ${costText}` : costText}</button>`
    }

    const cls = maxed ? 'is-maxed' : !unlocked ? 'is-locked' : ''
    return `
      <div class="ref-research-card ${cls}">
        <div class="ref-research-card__head">
          <span class="ref-research-card__name">${researchNodeName(n)}</span>
          <span class="ref-research-card__lvl">Sv ${level}/${n.maxLevel}</span>
        </div>
        <p class="ref-research-card__desc">${researchNodeDesc(n)}</p>
        <div class="ref-research-pips">${pips}</div>
        <div class="ref-research-card__foot">${foot}</div>
      </div>`
  }

  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const t = e.target as HTMLElement

    // Ar-Ge satın alma
    const researchBtn = t.closest<HTMLButtonElement>('[data-research-id]')
    if (researchBtn && !researchBtn.disabled) {
      const id = researchBtn.dataset.researchId!
      const ok = s.buyResearch(id)
      if (ok) {
        new SaveManager().save(s)
        const node = RESEARCH_NODES.find((x) => x.id === id)
        refToast(`Ar-Ge yükseltildi${node ? ': ' + researchNodeName(node) : ''}`, 'ok')
        this.renderResearch()
      } else {
        refToast('Yetersiz bakiye veya kilitli', 'err')
      }
      return
    }

    // Şehir aç
    const cityBtn = t.closest<HTMLButtonElement>('[data-unlock-city]')
    if (cityBtn && !cityBtn.disabled) {
      const id = cityBtn.dataset.unlockCity as CityId
      const ok = s.unlockCity(id)
      if (ok) {
        new SaveManager().save(s)
        const def = EXPANSION_CITIES.find((c) => c.id === id)
        refToast(`${def?.label ?? id} fethedildi! ${def?.emoji ?? '🏙️'}`, 'ok')
        // Şehirler bölümünü yeniden oluştur
        const cityGrid = this.el.querySelector<HTMLElement>('.ref-city-grid')
        if (cityGrid) cityGrid.outerHTML = this.buildCityGrid(s)
      } else {
        const check = canUnlockCity(id, s.cities, s.money, s.reputation, s.ipoCount)
        refToast(check.reason ?? 'Şehir açılamadı', 'err')
      }
    }
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

    // ── Ar-Ge Laboratuvarı (gerçek Research sistemi — satın alınabilir) ──
    if (s) {
      this.el.appendChild(sectionTitle('Ar-Ge Laboratuvarı', 'Araştırma'))
      this.el.appendChild(this.researchHost)
      this.renderResearch()
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
    const cityGridEl = document.createElement('div')
    cityGridEl.innerHTML = this.buildCityGrid(s)
    this.el.appendChild(cityGridEl.firstElementChild ?? cityGridEl)
  }

  private buildCityGrid(s?: GameState): string {
    const firmsCount = s ? Object.entries(s.producers).filter(([,cnt]) => cnt > 0).length : 0
    const cityIncomePer = s && s.cities.unlocked.length > 0
      ? Math.round(s.incomePerDay() / s.cities.unlocked.length) : 0

    const cards = CITY_DEFS.map(c => {
      const owned = s ? s.cities.unlocked.includes(c.id as any) : ['istanbul','ankara','izmir'].includes(c.id)
      const card = REF_ASSETS_V2_GENERIC.cities[c.key].card
      const def = EXPANSION_CITIES.find((d) => d.id === c.id)

      let foot: string
      if (owned) {
        foot = `<div class="ref-city-card__meta">${firmsCount} firma · ${fmtMoney(cityIncomePer)}/gün</div>`
      } else if (s && def) {
        const check = canUnlockCity(c.id as CityId, s.cities, s.money, s.reputation, s.ipoCount)
        const canBuy = check.ok
        foot = `
          <div class="ref-city-card__meta locked">${check.reason ?? 'Kilitli'}</div>
          <button type="button" class="ref-city-unlock-btn"
            data-unlock-city="${c.id}"
            ${canBuy ? '' : 'disabled'}
          >${canBuy ? `🔓 Aç · ${fmtMoney(def.unlockCost)}` : fmtMoney(def.unlockCost)}</button>`
      } else {
        foot = `<div class="ref-city-card__meta locked">Kilitli — yakında</div>`
      }

      return `
        <div class="ref-city-card ${owned ? '' : 'locked'}">
          <div class="ref-city-card__img">
            <img src="${ua(card)}" alt="">
            ${owned ? '' : '<span class="ref-city-lock">🔒</span>'}
          </div>
          <div class="ref-city-card__body">
            <div class="ref-city-card__name">${c.name}</div>
            ${foot}
          </div>
        </div>`
    }).join('')
    return `<div class="ref-city-grid">${cards}</div>`
  }
}
