import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, ua, areaChartSvg, donutSvg, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefDashboardVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'

/** Gerçek veri yoksa kullanılan fallback (mock) dashboard. */
const MOCK_DASHBOARD: RefDashboardVM = {
  netWorth: 248_420_000,
  cash: 42_600_000,
  dailyIncome: 26_300_000,
  dailyExpense: 7_600_000,
  reputation: 87,
  reputationLabel: 'Saygın',
  firmCount: 12,
  cityCount: 3,
  incomeSources: [
    { label: 'Gıda',      value: 38, color: '#F6A609' },
    { label: 'Teknoloji', value: 27, color: '#13B8A6' },
    { label: 'Hizmet',    value: 21, color: '#2563EB' },
    { label: 'Yasadışı',  value: 14, color: '#EA5455' },
  ],
  netWorthTrend: [180, 192, 188, 205, 214, 222, 230, 226, 238, 248],
  goals: [
    { ico: '🏙️', name: 'Dubai Pazarı', pct: 83, metaA: '₺248M / ₺300M' },
    { ico: '🏆', name: 'Borsa Kurdu',   pct: 64, metaA: '₺32M / ₺50M' },
  ],
}

const QUICK = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.franchise,      label: 'Yeni Firma' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.cityExpansion,  label: 'Şehir Aç' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, label: 'Piyasa' },
  { asset: REF_ASSETS_V2_GENERIC.achievements.cupGold,    label: 'Başarılar' },
]

const FEED = [
  { ico: '🏆', txt: 'Yeni başarı: <b>Fırın İmparatoru</b> kilidini açtın.', time: '2 sa' },
  { ico: '📈', txt: 'En çok kazandıran firman bugün <b>%9,7</b> arttı.', time: '5 sa' },
  { ico: '🏙️', txt: 'Yeni pazar fırsatı belirdi.', time: '1 gün' },
]

export class RefDashboardPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'ANA PANEL'

  onOpenAchievements?: () => void

  constructor(vm?: RefDashboardVM) {
    const d = vm ?? MOCK_DASHBOARD
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-dash-page'

    // Hero servet kartı + net değer grafiği
    const repInfo = `${d.reputationLabel} · ${d.reputation}/100`
    const hero = document.createElement('div')
    hero.className = 'ref-dash-hero'
    hero.innerHTML = `
      <div class="ref-dash-hero__lbl">Toplam İmparatorluk Değeri</div>
      <div class="ref-dash-hero__val">${fmtMoney(d.netWorth)}</div>
      <div class="ref-dash-hero__row">
        <span class="ref-dash-hero__chip up">⭐ ${repInfo}</span>
        <span class="ref-dash-hero__chip">${d.firmCount} firma · ${d.cityCount} şehir</span>
      </div>
      <div class="ref-dash-hero__chart">${areaChartSvg(d.netWorthTrend, '#ffffff', 320, 70)}</div>
    `
    this.el.appendChild(hero)

    // KPI strip (gerçek değerler)
    const kpi = new RefKpiStrip([
      { icon: '💎', label: 'Net Servet',   value: fmtMoney(d.netWorth), sub: 'Toplam', subDir: 'muted' },
      { icon: '💵', label: 'Nakit',        value: fmtMoney(d.cash),     sub: 'Likit',  subDir: 'muted' },
      { icon: '📈', label: 'Günlük Gelir', value: fmtMoney(d.dailyIncome), sub: 'Bugün', subDir: 'up' },
      { icon: '⭐', label: 'İtibar',        value: String(d.reputation), sub: d.reputationLabel, subDir: 'muted' },
    ])
    this.el.appendChild(kpi.el)

    // Gelir kaynakları (donut tam genişlik, dengeli legend + toplam)
    const donutCard = document.createElement('div')
    donutCard.className = 'ref-card-soft ref-dash-donut'
    donutCard.style.margin = '8px 14px 0'
    donutCard.innerHTML = `
      <div class="ref-card-soft__title-row">
        <span class="ref-card-soft__title">Gelir Kaynakları</span>
        <span class="ref-dash-donut__total">${fmtMoney(d.dailyIncome)} / gün</span>
      </div>
      <div class="ref-dash-donut__body">
        ${donutSvg(d.incomeSources, 96, 17)}
        <div class="ref-donut-legend">
          ${d.incomeSources.map(s => `
            <div class="ref-legend-row">
              <span class="ref-legend-dot" style="background:${s.color}"></span>
              <span class="ref-legend-lbl">${s.label}</span>
              <span class="ref-legend-bar"><span style="width:${Math.min(100, s.value * 2)}%;background:${s.color}"></span></span>
              <span class="ref-legend-val">%${s.value}</span>
            </div>`).join('')}
        </div>
      </div>
    `
    this.el.appendChild(donutCard)

    // Sıradaki hedefler (gerçek ilerleme)
    if (d.goals.length) {
      const goal = document.createElement('div')
      goal.className = 'ref-card-soft ref-dash-goal'
      goal.style.margin = '10px 14px 0'
      goal.innerHTML = `
        <div class="ref-card-soft__title">Sıradaki Hedefler</div>
        ${d.goals.map((g) => `
          <div class="ref-goal-item">
            <div class="ref-goal-head"><span class="ref-goal-name">${g.ico} ${g.name}</span><span class="ref-goal-pct">%${g.pct}</span></div>
            <div class="ref-perf-track"><div class="ref-perf-fill ${g.pct >= 70 ? 'high' : 'medium'}" style="width:${g.pct}%"></div></div>
            <div class="ref-goal-meta">${g.metaA}</div>
          </div>`).join('')}
      `
      this.el.appendChild(goal)
    }

    // Bugünkü özet
    const today = document.createElement('div')
    today.className = 'ref-today-strip'
    today.innerHTML = `
      <div class="ref-today-item"><span>💰</span><b>${fmtMoney(d.dailyIncome)}</b><small>Günlük gelir</small></div>
      <div class="ref-today-item"><span>🏢</span><b>${d.firmCount}</b><small>Aktif firma</small></div>
      <div class="ref-today-item"><span>🏙️</span><b>${d.cityCount}</b><small>Şehir</small></div>
    `
    this.el.appendChild(today)

    // Risk paneli (mock/fallback)
    const risk = document.createElement('div')
    risk.className = 'ref-risk-panel'
    risk.innerHTML = `
      <div class="ref-risk-panel__head">
        <span>🛡️ Risk Paneli</span>
        <span class="ref-risk-panel__badge ok">Düşük Risk</span>
      </div>
      <div class="ref-risk-bars">
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>Baskın Riski</span><span>22%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:22%"></div></div>
        </div>
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>Borç Yükü</span><span>15%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:15%"></div></div>
        </div>
      </div>
    `
    this.el.appendChild(risk)

    // Hızlı işlemler (mock — sadece görüntü)
    this.el.appendChild(sectionTitle('Hızlı İşlemler'))
    const quick = document.createElement('div')
    quick.className = 'ref-quick-grid'
    for (const q of QUICK) {
      const tile = document.createElement('button')
      tile.className = 'ref-quick-tile'
      tile.innerHTML = `<img src="${ua(q.asset)}" alt="" class="ref-quick-tile__img"><span>${q.label}</span>`
      if (q.label === 'Başarılar') tile.addEventListener('click', () => this.onOpenAchievements?.())
      quick.appendChild(tile)
    }
    this.el.appendChild(quick)

    // Aktivite akışı (mock)
    this.el.appendChild(sectionTitle('Son Aktiviteler', 'Tümü'))
    const feed = document.createElement('div')
    feed.className = 'ref-feed'
    feed.innerHTML = FEED.map(f => `
      <div class="ref-feed-row">
        <span class="ref-feed-ico">${f.ico}</span>
        <span class="ref-feed-txt">${f.txt}</span>
        <span class="ref-feed-time">${f.time}</span>
      </div>
    `).join('')
    this.el.appendChild(feed)
  }
}
