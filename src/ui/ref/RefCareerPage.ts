import { sectionTitle, ua, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefCareerVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import { FAME_CAREERS } from '../../game/Fame'
import type { GameState } from '../../game/GameState'

const MOCK_CAREER: RefCareerVM = {
  jobTitle: 'Holding YK Başkanı', level: 24, salaryDaily: 48_000, stress: 48,
  xpPct: 64, xpText: '₺248M / ₺1Mr', nextRank: 'Sektör Lideri', seniorityYears: 6,
  jobPerformance: null, health: 80, healthLabel: 'İyi', diseases: [],
  fame: 0, fameLabel: 'Bilinmiyor', fameCareerName: null, karma: 0, siblingCount: 0,
}

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
  private liveState?: GameState

  constructor(vm?: RefCareerVM) {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'
    this.renderAll(vm ?? MOCK_CAREER)
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  refresh(state: GameState): void {
    this.liveState = state
    // Rebuild career VM from state via adapter-like logic handled by parent
    // Just re-render health/fame section if VM is available
  }

  private renderAll(c: RefCareerVM): void {
    this.el.innerHTML = ''

    // Health & status section (always shown)
    this.el.appendChild(this.buildHealthSection(c))

    // Fame section
    this.el.appendChild(this.buildFameSection(c))

    // Aktif iş kartı
    const job = document.createElement('div')
    job.className = 'ref-job-card'
    job.innerHTML = `
      <div class="ref-job-card__top">
        <div class="ref-job-card__icon">💼</div>
        <div class="ref-job-card__id">
          <div class="ref-job-card__title">${c.jobTitle}</div>
          <div class="ref-job-card__company">Tam zamanlı · Aktif</div>
        </div>
        <div class="ref-job-card__lvl">LVL ${c.level}</div>
      </div>
      <div class="ref-job-stats">
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Günlük Gelir</span><span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily)}</span></div>
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Kıdem</span><span class="ref-job-stat__val">${c.seniorityYears} yıl</span></div>
        <div class="ref-job-stat"><span class="ref-job-stat__lbl">Sıradaki</span><span class="ref-job-stat__val">${c.nextRank}</span></div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Servet Hedefi</span><span>${c.xpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.xpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>Stres</span><span>${c.stress}%</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
        </div>
      </div>
      ${c.karma !== 0 ? `<div class="ref-karma-row"><span>${c.karma > 0 ? '😇' : '😈'} Karma:</span><span class="${c.karma > 0 ? 'ref-karma-good' : 'ref-karma-bad'}">${c.karma > 0 ? '+' : ''}${c.karma}</span></div>` : ''}
    `
    this.el.appendChild(job)

    // Bugünkü aksiyonlar
    this.el.appendChild(sectionTitle('Bugünkü Aksiyonlar <span class="ref-demo-tag">önizleme</span>', '3 hak'))
    const actions = document.createElement('div')
    actions.className = 'ref-action-grid'
    actions.innerHTML = ACTIONS.map(a => `
      <button class="ref-action-tile" type="button" disabled>
        <span class="ref-action-tile__ico">${a.ico}</span>
        <span class="ref-action-tile__lbl">${a.label}</span>
        <span class="ref-action-tile__eff">${a.effect}</span>
      </button>
    `).join('')
    this.el.appendChild(actions)
    const actNote = document.createElement('div')
    actNote.className = 'ref-preview-note'
    actNote.textContent = '🔒 Önizleme modu · aksiyonlar işlem yapmaz'
    this.el.appendChild(actNote)

    // İlk hedefler
    this.el.appendChild(sectionTitle('İlk Hedefler <span class="ref-demo-tag">örnek</span>'))
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
    this.el.appendChild(sectionTitle('Beceriler <span class="ref-demo-tag">demo</span>'))
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

  private buildHealthSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-health-card'
    const healthPct = c.health
    const healthColor = healthPct >= 80 ? 'high' : healthPct >= 40 ? 'medium' : 'low'
    wrap.innerHTML = `
      <div class="ref-health-card__header">${sectionTitle('Sağlık & Yaşam').outerHTML}</div>
      <div class="ref-health-row">
        <span class="ref-health-icon">❤️</span>
        <div class="ref-health-main">
          <div class="ref-health-head">
            <span>Sağlık</span>
            <span class="ref-health-val">${healthPct} — ${c.healthLabel}</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${healthColor}" style="width:${healthPct}%"></div></div>
        </div>
      </div>
    `
    if (c.diseases.length > 0) {
      const diseaseSection = document.createElement('div')
      diseaseSection.className = 'ref-disease-list'
      diseaseSection.innerHTML = c.diseases.map(d => `
        <div class="ref-disease-row" data-disease-id="${d.id}">
          <span class="ref-disease-ico">${d.emoji}</span>
          <div class="ref-disease-main">
            <div class="ref-disease-name">${d.name}</div>
            <div class="ref-disease-info">−${(d.dailyDamage).toFixed(2)} HP/gün ${d.surgery ? '· Ameliyat' : ''}</div>
          </div>
          <button class="ref-disease-treat-btn" data-treat="${d.id}" type="button">
            💊 ${fmtMoney(d.treatCost)}
          </button>
        </div>
      `).join('')
      wrap.appendChild(diseaseSection)
    } else {
      const ok = document.createElement('div')
      ok.className = 'ref-disease-ok'
      ok.textContent = '✅ Aktif hastalık yok'
      wrap.appendChild(ok)
    }
    return wrap
  }

  private buildFameSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-fame-section'
    const headerEl = sectionTitle('Şöhret Kariyeri')
    wrap.appendChild(headerEl)

    if (c.fameCareerName) {
      // Active fame career
      const active = document.createElement('div')
      active.className = 'ref-fame-active'
      active.innerHTML = `
        <div class="ref-fame-active__head">
          <span class="ref-fame-active__name">${c.fameCareerName}</span>
          <span class="ref-fame-active__label">${c.fameLabel}</span>
        </div>
        <div class="ref-fame-bar">
          <div class="ref-fame-bar__lbl"><span>Şöhret</span><span>${c.fame}/100</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.fame}%"></div></div>
        </div>
        <div class="ref-fame-actions">
          <button class="ref-fame-action-btn" data-action="fame_do" type="button">🎤 Aksiyon Al</button>
          <button class="ref-fame-quit-btn" data-action="fame_quit" type="button">✖ Bırak</button>
        </div>
      `
      wrap.appendChild(active)
    } else {
      // Pick career
      const pick = document.createElement('div')
      pick.className = 'ref-fame-pick-grid'
      pick.innerHTML = FAME_CAREERS.map(fc => `
        <button class="ref-fame-pick-card" data-action="fame_start" data-career="${fc.id}" type="button">
          <span class="ref-fame-pick-ico">${fc.emoji}</span>
          <span class="ref-fame-pick-name">${fc.name}</span>
        </button>
      `).join('')
      wrap.appendChild(pick)
    }
    return wrap
  }

  private handleClick(e: Event): void {
    const target = e.target as HTMLElement
    const treatBtn = target.closest('[data-treat]') as HTMLElement | null
    if (treatBtn && this.liveState) {
      const diseaseId = treatBtn.dataset.treat as string
      this.liveState.treatDisease(diseaseId as any)
      return
    }
    const actionBtn = target.closest('[data-action]') as HTMLElement | null
    if (actionBtn && this.liveState) {
      const action = actionBtn.dataset.action
      if (action === 'fame_do') {
        this.liveState.doFameAction()
      } else if (action === 'fame_quit') {
        this.liveState.quitFameCareer()
      } else if (action === 'fame_start') {
        const career = actionBtn.dataset.career as string
        this.liveState.startFameCareer(career as any)
      }
    }
  }
}
