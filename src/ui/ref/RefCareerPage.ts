import { sectionTitle, ua } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

interface DailyAction { ico: string; label: string; effect: string }
const ACTIONS: DailyAction[] = [
  { ico: '🕐', label: 'Mesai Yap',    effect: '+₺2.4K · +6 XP' },
  { ico: '🌙', label: 'Ek Mesai',     effect: '+₺3.8K · +stres' },
  { ico: '🤝', label: 'Müşteri Bul',  effect: '+1 fırsat' },
  { ico: '💼', label: 'Satış Kapat',  effect: '+₺5K · +12 XP' },
  { ico: '🎓', label: 'Eğitim Al',    effect: '+beceri' },
  { ico: '🌐', label: 'Networking',   effect: '+1 bağlantı' },
]

interface Goal { ico: string; name: string; desc: string; pct: number; reward: string }
const GOALS: Goal[] = [
  { ico: '🪙', name: '₺500 Kazan', desc: 'İlk küçük işletmeni aç', pct: 70, reward: 'İlk firma' },
  { ico: '🚀', name: '₺10.000 Net Değer', desc: 'Girişimci unvanı kazan', pct: 32, reward: 'Girişimci' },
]

interface Skill { asset: string; name: string; level: number; max: number; pct: number }
const SKILLS: Skill[] = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketing,      name: 'Pazarlama', level: 7, max: 10, pct: 70 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.research,       name: 'Ar-Ge',     level: 5, max: 10, pct: 50 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, name: 'Finans',    level: 8, max: 10, pct: 82 },
]

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'KARİYER'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    // Aktif iş kartı
    const job = document.createElement('div')
    job.className = 'ref-job-card'
    job.innerHTML = `
      <div class="ref-job-card__top">
        <div class="ref-job-card__icon">💼</div>
        <div class="ref-job-card__id">
          <div class="ref-job-card__title">Holding YK Başkanı</div>
          <div class="ref-job-card__company">Karahan Holding · Tam zamanlı</div>
        </div>
        <div class="ref-job-card__lvl">LVL 24</div>
      </div>
      <div class="ref-job-stats">
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Günlük Maaş</span><span class="ref-job-stat__val income">₺48K</span></div>
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Kıdem</span><span class="ref-job-stat__val">6 yıl</span></div>
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Sıradaki</span><span class="ref-job-stat__val">Sektör Lideri</span></div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Terfi (XP)</span><span>6.400 / 10.000</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:64%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Stres</span><span>48%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill medium" style="width:48%"></div></div>
        </div>
      </div>
    `
    this.el.appendChild(job)

    // Bugünkü aksiyonlar
    this.el.appendChild(sectionTitle('Bugünkü Aksiyonlar', '3 hak'))
    const actions = document.createElement('div')
    actions.className = 'ref-action-grid'
    actions.innerHTML = ACTIONS.map(a => `
      <button class="ref-action-tile">
        <span class="ref-action-tile__ico">${a.ico}</span>
        <span class="ref-action-tile__lbl">${a.label}</span>
        <span class="ref-action-tile__eff">${a.effect}</span>
      </button>
    `).join('')
    this.el.appendChild(actions)

    // İlk hedefler
    this.el.appendChild(sectionTitle('İlk Hedefler'))
    const goals = document.createElement('div')
    goals.className = 'ref-cgoal-list'
    goals.innerHTML = GOALS.map(g => `
      <div class="ref-cgoal-row">
        <span class="ref-cgoal-ico">${g.ico}</span>
        <div class="ref-cgoal-main">
          <div class="ref-cgoal-head"><span class="ref-cgoal-name">${g.name}</span><span class="ref-cgoal-reward">🎁 ${g.reward}</span></div>
          <div class="ref-cgoal-desc">${g.desc}</div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill high" style="width:${g.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(goals)

    // Beceriler
    this.el.appendChild(sectionTitle('Beceriler'))
    const skills = document.createElement('div')
    skills.className = 'ref-skill-list'
    skills.innerHTML = SKILLS.map(s => `
      <div class="ref-skill-row">
        <img src="${ua(s.asset)}" alt="" class="ref-skill-ico">
        <div class="ref-skill-main">
          <div class="ref-skill-head">
            <span class="ref-skill-name">${s.name}</span>
            <span class="ref-skill-lvl">${s.level}/${s.max}</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${s.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(skills)
  }
}
