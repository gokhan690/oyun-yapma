import { RefKpiStrip } from './RefKpiStrip'
import { sectionTitle, ua } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

const KPI = [
  { icon: '💎', label: 'Net Servet',   value: '₺248M', sub: '5,1%',  subDir: 'up' as const },
  { icon: '💵', label: 'Nakit',        value: '₺42,6M', sub: 'Likit', subDir: 'muted' as const },
  { icon: '📈', label: 'Günlük Gelir', value: '₺26,3M', sub: '6,2%',  subDir: 'up' as const },
  { icon: '⭐', label: 'İtibar',        value: '8,7',    sub: 'Saygın', subDir: 'muted' as const },
]

const QUICK = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.franchise,    label: 'Yeni Firma' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.cityExpansion, label: 'Şehir Aç' },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, label: 'Piyasa' },
  { asset: REF_ASSETS_V2_GENERIC.achievements.cupGold,  label: 'Başarılar' },
]

const FEED = [
  { ico: '🏆', txt: 'Yeni başarı: <b>Fırın İmparatoru</b> kilidini açtın.', time: '2 sa' },
  { ico: '📈', txt: 'Mavi Çekirdek geliri <b>%9,7</b> arttı.', time: '5 sa' },
  { ico: '🏙️', txt: 'İzmir pazarında yeni fırsat belirdi.', time: '1 gün' },
]

export class RefDashboardPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'ANA PANEL'

  /** Başarılar sayfasını açar (RefApp bağlar). */
  onOpenAchievements?: () => void

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-dash-page'

    // Hero servet kartı
    const hero = document.createElement('div')
    hero.className = 'ref-dash-hero'
    hero.innerHTML = `
      <div class="ref-dash-hero__lbl">Toplam İmparatorluk Değeri</div>
      <div class="ref-dash-hero__val">₺248.420.000</div>
      <div class="ref-dash-hero__row">
        <span class="ref-dash-hero__chip up">▲ %5,1 bu ay</span>
        <span class="ref-dash-hero__chip">12 firma · 3 şehir</span>
      </div>
    `
    this.el.appendChild(hero)

    // KPI strip
    this.el.appendChild(new RefKpiStrip(KPI).el)

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
