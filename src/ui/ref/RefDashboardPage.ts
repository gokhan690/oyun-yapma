import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, ua, areaChartSvg, donutSvg } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

const KPI = [
  { icon: '💎', label: 'Net Servet',   value: '₺248M', sub: '5,1%',  subDir: 'up' as const },
  { icon: '💵', label: 'Nakit',        value: '₺42,6M', sub: 'Likit', subDir: 'muted' as const },
  { icon: '📈', label: 'Günlük Gelir', value: '₺26,3M', sub: '6,2%',  subDir: 'up' as const },
  { icon: '⭐', label: 'İtibar',        value: '8,7',    sub: 'Saygın', subDir: 'muted' as const },
]

const NETWORTH = [180, 192, 188, 205, 214, 222, 230, 226, 238, 248]

const INCOME_SOURCES = [
  { label: 'Gıda',      value: 38, color: '#F6A609' },
  { label: 'Teknoloji', value: 27, color: '#13B8A6' },
  { label: 'Hizmet',    value: 21, color: '#2563EB' },
  { label: 'Yasadışı',  value: 14, color: '#EA5455' },
]

const QUICK = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.franchise,      label: 'Yeni Firma' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.cityExpansion,  label: 'Şehir Aç' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, label: 'Piyasa' },
  { asset: REF_ASSETS_V2_GENERIC.achievements.cupGold,    label: 'Başarılar' },
]

const FEED = [
  { ico: '🏆', txt: 'Yeni başarı: <b>Fırın İmparatoru</b> kilidini açtın.', time: '2 sa' },
  { ico: '📈', txt: 'Mavi Çekirdek geliri <b>%9,7</b> arttı.', time: '5 sa' },
  { ico: '🏙️', txt: 'İzmir pazarında yeni fırsat belirdi.', time: '1 gün' },
]

export class RefDashboardPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'ANA PANEL'

  onOpenAchievements?: () => void

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-dash-page'

    // Hero servet kartı + net değer grafiği
    const hero = document.createElement('div')
    hero.className = 'ref-dash-hero'
    hero.innerHTML = `
      <div class="ref-dash-hero__lbl">Toplam İmparatorluk Değeri</div>
      <div class="ref-dash-hero__val">₺248.420.000</div>
      <div class="ref-dash-hero__row">
        <span class="ref-dash-hero__chip up">▲ %5,1 bu ay</span>
        <span class="ref-dash-hero__chip">12 firma · 3 şehir</span>
      </div>
      <div class="ref-dash-hero__chart">${areaChartSvg(NETWORTH, '#ffffff', 320, 70)}</div>
    `
    this.el.appendChild(hero)

    // KPI strip
    this.el.appendChild(new RefKpiStrip(KPI).el)

    // Gelir kaynakları (donut) + Sıradaki hedef
    const row = document.createElement('div')
    row.className = 'ref-dash-row2'
    row.innerHTML = `
      <div class="ref-card-soft ref-dash-donut">
        <div class="ref-card-soft__title">Gelir Kaynakları</div>
        <div class="ref-dash-donut__body">
          ${donutSvg(INCOME_SOURCES, 84, 15)}
          <div class="ref-donut-legend">
            ${INCOME_SOURCES.map(s => `
              <div class="ref-legend-row">
                <span class="ref-legend-dot" style="background:${s.color}"></span>
                <span class="ref-legend-lbl">${s.label}</span>
                <span class="ref-legend-val">%${s.value}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="ref-card-soft ref-dash-goal">
        <div class="ref-card-soft__title">Sıradaki Hedef</div>
        <div class="ref-goal-name">🏙️ Dubai Pazarı</div>
        <div class="ref-goal-sub">₺300M servet gerekiyor</div>
        <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:83%"></div></div>
        <div class="ref-goal-meta"><b>₺248M</b> / ₺300M · %83</div>
        <div class="ref-goal-name" style="margin-top:10px">🏆 Borsa Kurdu</div>
        <div class="ref-perf-track"><div class="ref-perf-fill medium" style="width:64%"></div></div>
        <div class="ref-goal-meta">₺50M portföy · %64</div>
      </div>
    `
    this.el.appendChild(row)

    // Risk paneli
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
        <div class="ref-risk-item">
          <div class="ref-risk-item__lbl"><span>Stres</span><span>48%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill medium" style="width:48%"></div></div>
        </div>
      </div>
    `
    this.el.appendChild(risk)

    // Hızlı işlemler
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

    // Aktivite akışı
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
