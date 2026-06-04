import { sectionTitle, ua } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

interface Rank { title: string; reached: boolean; current?: boolean; req: string }

const RANKS: Rank[] = [
  { title: 'Çırak Girişimci', reached: true, req: '₺10K servet' },
  { title: 'Esnaf', reached: true, req: '5 firma' },
  { title: 'İşletme Sahibi', reached: true, req: '₺1M servet' },
  { title: 'Holding Başkanı', reached: true, current: true, req: '₺100M servet' },
  { title: 'Sektör Lideri', reached: false, req: '₺1Mr servet' },
  { title: 'Efsane Baron', reached: false, req: '3 IPO + ₺5Mr' },
]

interface Skill { asset: string; name: string; level: number; max: number; pct: number }
const SKILLS: Skill[] = [
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketing,    name: 'Pazarlama',  level: 7, max: 10, pct: 70 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.research,     name: 'Ar-Ge',      level: 5, max: 10, pct: 50 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.legal,        name: 'Hukuk',      level: 6, max: 10, pct: 60 },
  { asset: REF_ASSETS_V2_GENERIC.upgrades.marketAnalysis, name: 'Finans',   level: 8, max: 10, pct: 82 },
]

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'KARİYER'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    // Seviye kartı
    const lvl = document.createElement('div')
    lvl.className = 'ref-level-card'
    lvl.innerHTML = `
      <div class="ref-level-card__top">
        <div>
          <div class="ref-level-card__rank">Holding YK Başkanı</div>
          <div class="ref-level-card__sub">Kariyer Seviyesi 24</div>
        </div>
        <div class="ref-level-card__badge">LVL 24</div>
      </div>
      <div class="ref-perf-track ref-level-card__bar">
        <div class="ref-perf-fill high" style="width:64%"></div>
      </div>
      <div class="ref-level-card__xp">6.400 / 10.000 XP — sonraki: Sektör Lideri</div>
    `
    this.el.appendChild(lvl)

    // Unvan yolu
    this.el.appendChild(sectionTitle('Kariyer Yolu'))
    const path = document.createElement('div')
    path.className = 'ref-rank-path'
    path.innerHTML = RANKS.map(r => `
      <div class="ref-rank-row ${r.reached ? 'done' : 'locked'} ${r.current ? 'current' : ''}">
        <span class="ref-rank-dot">${r.reached ? '✓' : '🔒'}</span>
        <span class="ref-rank-title">${r.title}</span>
        <span class="ref-rank-req">${r.req}</span>
      </div>
    `).join('')
    this.el.appendChild(path)

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
