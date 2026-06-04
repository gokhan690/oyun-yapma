import { sectionTitle, ua, ringSvg } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

const A = REF_ASSETS_V2_GENERIC.achievements

interface Ach { cup: string; name: string; desc: string; state: 'done' | 'active' | 'locked'; pct?: number }
const ACHS: Ach[] = [
  { cup: A.cupGold,   name: 'Fırın İmparatoru',  desc: '5 fırın işletmesine ulaş', state: 'done' },
  { cup: A.cupSilver, name: 'Şehir Fatihi',      desc: '3 şehirde firma aç',       state: 'done' },
  { cup: A.cupBronze, name: 'İlk Milyon',        desc: '₺1M servete ulaş',         state: 'done' },
  { cup: A.cupBlue,   name: 'Borsa Kurdu',       desc: '₺50M portföy oluştur',     state: 'active', pct: 64 },
  { cup: A.cupLocked, name: 'Global Baron',      desc: 'Dubai + Londra’yı aç',     state: 'locked' },
  { cup: A.cupLocked, name: 'Efsane Hanedan',    desc: '5. nesle ulaş',            state: 'locked' },
]

interface Task { reward: string; name: string; prog: string; pct: number }
const TASKS: Task[] = [
  { reward: A.rewardMoney,      name: '3 firmayı modernize et', prog: '2/3', pct: 66 },
  { reward: A.rewardReputation, name: 'İtibarı 9,0’a çıkar',    prog: '8,7/9', pct: 88 },
  { reward: A.rewardXp,         name: 'Yeni yönetici ata',      prog: '0/1', pct: 0 },
]

export class RefAchievementsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'BAŞARILAR'

  onBack?: () => void

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

    // Tamamlanma halkası özeti
    const summary = document.createElement('div')
    summary.className = 'ref-ach-summary'
    summary.innerHTML = `
      <div class="ref-ach-ring">${ringSvg(26, '%26', '12 / 46', 112, 11, '#F6A609')}</div>
      <div class="ref-ach-summary__stats">
        <div class="ref-ach-stat"><span class="ref-ach-stat__n done">12</span><span>Tamamlandı</span></div>
        <div class="ref-ach-stat"><span class="ref-ach-stat__n active">3</span><span>Devam Eden</span></div>
        <div class="ref-ach-stat"><span class="ref-ach-stat__n locked">31</span><span>Kilitli</span></div>
      </div>
    `
    this.el.appendChild(summary)

    // Başarılar grid
    this.el.appendChild(sectionTitle('Başarımlar'))
    const grid = document.createElement('div')
    grid.className = 'ref-ach-grid'
    grid.innerHTML = ACHS.map(a => `
      <div class="ref-ach-card ${a.state}">
        <img src="${ua(a.cup)}" alt="" class="ref-ach-cup">
        <div class="ref-ach-name">${a.name}</div>
        <div class="ref-ach-desc">${a.desc}</div>
        ${a.state === 'active' && a.pct != null
          ? `<div class="ref-perf-track ref-ach-bar"><div class="ref-perf-fill medium" style="width:${a.pct}%"></div></div>`
          : a.state === 'done' ? '<div class="ref-ach-flag done">✓ Tamamlandı</div>'
          : '<div class="ref-ach-flag locked">🔒 Kilitli</div>'}
      </div>
    `).join('')
    this.el.appendChild(grid)

    // Günlük görevler
    this.el.appendChild(sectionTitle('Günlük Görevler'))
    const tasks = document.createElement('div')
    tasks.className = 'ref-task-list'
    tasks.innerHTML = TASKS.map(t => `
      <div class="ref-task-row">
        <img src="${ua(t.reward)}" alt="" class="ref-task-reward">
        <div class="ref-task-main">
          <div class="ref-task-head">
            <span class="ref-task-name">${t.name}</span>
            <span class="ref-task-prog">${t.prog}</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${t.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(tasks)
  }
}
