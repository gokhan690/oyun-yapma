import { ua, ringSvg } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

const A = REF_ASSETS_V2_GENERIC.achievements

type TabKey = 'gorevler' | 'hedefler' | 'basarilar' | 'rozetler'
const TABS: { id: TabKey; label: string }[] = [
  { id: 'gorevler',  label: 'Görevler' },
  { id: 'hedefler',  label: 'Hedefler' },
  { id: 'basarilar', label: 'Başarılar' },
  { id: 'rozetler',  label: 'Rozetler' },
]

interface TaskRow { ico: string; name: string; desc: string; pct: number; prog: string; reward: string; state: 'done' | 'active' | 'locked' }
const TASKS: TaskRow[] = [
  { ico: '🏭', name: '3 Firmayı Modernize Et', desc: 'Bugün 3 işletmeyi geliştir', pct: 66, prog: '2/3', reward: '+₺500K', state: 'active' },
  { ico: '⭐', name: 'İtibarı 9,0’a Çıkar',     desc: 'Saygın baron statüsü', pct: 88, prog: '8,7/9', reward: '+İtibar', state: 'active' },
  { ico: '👤', name: 'Yeni Yönetici Ata',       desc: 'Bir firmaya yönetici ata', pct: 0,  prog: '0/1', reward: '+XP',     state: 'locked' },
  { ico: '📦', name: 'Lojistik Rotasını Aç',    desc: 'Yeni kargo hattı kur', pct: 100, prog: '1/1', reward: '+₺200K', state: 'done' },
]

interface GoalRow { ico: string; name: string; desc: string; pct: number; prog: string; reward: string; state: 'done' | 'active' | 'locked' }
const GOALS: GoalRow[] = [
  { ico: '🏙️', name: 'Dubai Pazarı', desc: '₺300M servete ulaş', pct: 83, prog: '₺248M / ₺300M', reward: 'Yeni şehir', state: 'active' },
  { ico: '🏆', name: 'Borsa Kurdu',   desc: '₺50M portföy oluştur', pct: 64, prog: '₺32M / ₺50M',   reward: 'Rozet',      state: 'active' },
  { ico: '👑', name: 'Global Baron',  desc: 'Dubai + Londra’yı aç', pct: 0,  prog: '0/2 şehir',      reward: 'Unvan',      state: 'locked' },
]

interface Ach { cup: string; name: string; desc: string; state: 'done' | 'active' | 'locked'; pct?: number }
const ACHS: Ach[] = [
  { cup: A.cupGold,   name: 'Fırın İmparatoru', desc: '5 fırın işletmesi', state: 'done' },
  { cup: A.cupSilver, name: 'Şehir Fatihi',     desc: '3 şehirde firma',   state: 'done' },
  { cup: A.cupBronze, name: 'İlk Milyon',       desc: '₺1M servet',        state: 'done' },
  { cup: A.cupBlue,   name: 'Borsa Kurdu',      desc: '₺50M portföy',      state: 'active', pct: 64 },
  { cup: A.cupLocked, name: 'Global Baron',     desc: 'Dubai + Londra',    state: 'locked' },
  { cup: A.cupLocked, name: 'Efsane Hanedan',   desc: '5. nesle ulaş',     state: 'locked' },
]

const BADGES = [
  { asset: A.badgeCompleted, label: 'Kurucu',   on: true },
  { asset: A.badgeCompleted, label: 'Milyoner', on: true },
  { asset: A.badgeActive,    label: 'Yatırımcı', on: true },
  { asset: A.rewardReputation, label: 'Saygın', on: true },
  { asset: A.badgeLocked,    label: 'Tekel',    on: false },
  { asset: A.badgeLocked,    label: 'Efsane',   on: false },
]

const MILESTONES = [
  { cup: A.cupBronze, label: '10', reached: true },
  { cup: A.cupSilver, label: '25', reached: false },
  { cup: A.cupGold,   label: '40', reached: false },
  { cup: A.cupBlue,   label: '46', reached: false },
]

function statusBadge(state: 'done' | 'active' | 'locked'): string {
  if (state === 'done') return '<span class="ref-tstatus done">✓ Tamamlandı</span>'
  if (state === 'active') return '<span class="ref-tstatus active">● Devam Ediyor</span>'
  return '<span class="ref-tstatus locked">🔒 Kilitli</span>'
}

function taskRowHtml(t: TaskRow | GoalRow): string {
  return `
    <div class="ref-trow ${t.state}">
      <span class="ref-trow__ico">${t.ico}</span>
      <div class="ref-trow__main">
        <div class="ref-trow__head"><span class="ref-trow__name">${t.name}</span>${statusBadge(t.state)}</div>
        <div class="ref-trow__desc">${t.desc}</div>
        <div class="ref-perf-track sm"><div class="ref-perf-fill ${t.pct >= 70 ? 'high' : t.pct > 0 ? 'medium' : 'low'}" style="width:${t.pct}%"></div></div>
        <div class="ref-trow__foot"><span class="ref-trow__prog">${t.prog}</span><span class="ref-trow__reward">🎁 ${t.reward}</span></div>
      </div>
    </div>`
}

export class RefAchievementsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'BAŞARILAR'

  onBack?: () => void

  private contentEl!: HTMLElement
  private activeTab: TabKey = 'gorevler'
  private tabBtns = new Map<TabKey, HTMLButtonElement>()

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-ach-page'

    // Geri + özet
    const top = document.createElement('div')
    top.className = 'ref-ach-top'
    top.innerHTML = `
      <button class="ref-back-btn" type="button">‹ Geri</button>
      <span class="ref-ach-count">12 / 46 tamamlandı</span>
    `
    top.querySelector('.ref-back-btn')!.addEventListener('click', () => this.onBack?.())
    this.el.appendChild(top)

    // Tamamlanma halkası + milestone çizgisi
    const summary = document.createElement('div')
    summary.className = 'ref-ach-summary'
    summary.innerHTML = `
      <div class="ref-ach-ring">${ringSvg(26, '%26', '12 / 46', 104, 10, '#F6A609')}</div>
      <div class="ref-ach-milestone">
        <div class="ref-ach-milestone__lbl">Başarı Kupası Yolu</div>
        <div class="ref-milestone-track">
          <div class="ref-milestone-line"><div class="ref-milestone-fill" style="width:30%"></div></div>
          ${MILESTONES.map(m => `
            <div class="ref-milestone-node ${m.reached ? 'on' : ''}">
              <img src="${ua(m.cup)}" alt="">
              <span>${m.label}</span>
            </div>`).join('')}
        </div>
      </div>
    `
    this.el.appendChild(summary)

    // Tablar
    const tabs = document.createElement('div')
    tabs.className = 'ref-ach-tabs'
    for (const tab of TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-ach-tab' + (tab.id === this.activeTab ? ' active' : '')
      btn.textContent = tab.label
      btn.addEventListener('click', () => this.setTab(tab.id))
      this.tabBtns.set(tab.id, btn)
      tabs.appendChild(btn)
    }
    this.el.appendChild(tabs)

    // İçerik
    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ref-ach-content'
    this.el.appendChild(this.contentEl)

    this.renderTab()
  }

  private setTab(id: TabKey): void {
    this.activeTab = id
    this.tabBtns.forEach((b, k) => b.classList.toggle('active', k === id))
    this.renderTab()
  }

  private renderTab(): void {
    if (this.activeTab === 'gorevler') {
      this.contentEl.innerHTML = `<div class="ref-trow-list">${TASKS.map(taskRowHtml).join('')}</div>`
    } else if (this.activeTab === 'hedefler') {
      this.contentEl.innerHTML = `<div class="ref-trow-list">${GOALS.map(taskRowHtml).join('')}</div>`
    } else if (this.activeTab === 'basarilar') {
      this.contentEl.innerHTML = `<div class="ref-ach-grid">${ACHS.map(a => `
        <div class="ref-ach-card ${a.state}">
          <img src="${ua(a.cup)}" alt="" class="ref-ach-cup">
          <div class="ref-ach-name">${a.name}</div>
          <div class="ref-ach-desc">${a.desc}</div>
          ${a.state === 'active' && a.pct != null
            ? `<div class="ref-perf-track ref-ach-bar"><div class="ref-perf-fill medium" style="width:${a.pct}%"></div></div>`
            : a.state === 'done' ? '<div class="ref-ach-flag done">✓ Tamamlandı</div>'
            : '<div class="ref-ach-flag locked">🔒 Kilitli</div>'}
        </div>`).join('')}</div>`
    } else {
      this.contentEl.innerHTML = `<div class="ref-badge-grid">${BADGES.map(bd => `
        <div class="ref-badge-tile ${bd.on ? '' : 'off'}">
          <img src="${ua(bd.asset)}" alt="" class="ref-badge-img">
          <span class="ref-badge-lbl">${bd.label}</span>
        </div>`).join('')}</div>`
    }
  }
}
