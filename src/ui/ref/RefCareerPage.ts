import { sectionTitle, ua, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefCareerVM, RefDiseaseVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import { FAME_CAREERS, fameLevelLabel, fameDef, type FameCareerType } from '../../game/Fame'
import { healthStatusLabel } from '../../game/Health'
import { diseaseDef, type DiseaseId } from '../../game/Diseases'
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

/** Sağlık/şöhret/karma bölümlerinin ihtiyaç duyduğu canlı değerler. */
interface DynamicVitals {
  health: number
  healthLabel: string
  diseases: RefDiseaseVM[]
  fame: number
  fameLabel: string
  fameCareerName: string | null
  karma: number
}

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'KARİYER'
  private liveState?: GameState
  /** Canlı bölümlerin (sağlık+şöhret) konteyneri — refresh yalnız burayı günceller. */
  private dynWrap!: HTMLElement
  private lastDynSig = ''

  constructor(vm?: RefCareerVM) {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'
    this.renderAll(vm ?? MOCK_CAREER)
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /** RefApp tek aboneliğinden: sağlık/şöhret/karma bölümlerini state'ten tazeler. */
  refresh(state: GameState): void {
    this.liveState = state
    const vitals = this.vitalsFromState(state)
    const sig = [
      Math.round(vitals.health), vitals.diseases.map(d => d.id).join(','),
      Math.round(vitals.fame), vitals.fameCareerName ?? '', vitals.karma,
    ].join('|')
    if (sig === this.lastDynSig) return
    this.lastDynSig = sig
    this.renderDynamic(vitals)
  }

  private vitalsFromState(s: GameState): DynamicVitals {
    const diseases: RefDiseaseVM[] = (s.diseases ?? []).map((d) => {
      const def = diseaseDef(d.id)
      return { id: d.id, name: def.name, emoji: def.emoji, treatCost: def.treatCost, dailyDamage: def.dailyDamage, surgery: def.surgery }
    })
    const fame = s.fameState?.fame ?? 0
    const careerId = s.fameState?.activeCareer ?? null
    return {
      health: Math.round(s.health.health),
      healthLabel: healthStatusLabel(s.health.health),
      diseases,
      fame: Math.round(fame),
      fameLabel: fameLevelLabel(fame),
      fameCareerName: careerId ? fameDef(careerId).name : null,
      karma: s.karma ?? 0,
    }
  }

  private renderAll(c: RefCareerVM): void {
    this.el.innerHTML = ''

    // Canlı bölümler (sağlık + şöhret + karma) — refresh() yalnız burayı yeniler
    this.dynWrap = document.createElement('div')
    this.el.appendChild(this.dynWrap)
    this.renderDynamic({
      health: c.health, healthLabel: c.healthLabel, diseases: c.diseases,
      fame: c.fame, fameLabel: c.fameLabel, fameCareerName: c.fameCareerName, karma: c.karma,
    })

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

  private renderDynamic(v: DynamicVitals): void {
    this.dynWrap.innerHTML = ''
    this.dynWrap.appendChild(this.buildHealthSection(v))
    this.dynWrap.appendChild(this.buildFameSection(v))
  }

  private buildHealthSection(v: DynamicVitals): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-health-card'
    const healthPct = v.health
    const healthColor = healthPct >= 80 ? 'high' : healthPct >= 40 ? 'medium' : 'low'
    wrap.innerHTML = `
      <div class="ref-health-card__header">${sectionTitle('Sağlık & Yaşam').outerHTML}</div>
      <div class="ref-health-row">
        <span class="ref-health-icon">❤️</span>
        <div class="ref-health-main">
          <div class="ref-health-head">
            <span>Sağlık</span>
            <span class="ref-health-val">${healthPct} — ${v.healthLabel}</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${healthColor}" style="width:${healthPct}%"></div></div>
        </div>
      </div>
    `
    if (v.diseases.length > 0) {
      const diseaseSection = document.createElement('div')
      diseaseSection.className = 'ref-disease-list'
      diseaseSection.innerHTML = v.diseases.map(d => `
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
    if (v.karma !== 0) {
      const karmaRow = document.createElement('div')
      karmaRow.className = 'ref-karma-row'
      karmaRow.innerHTML = `<span>${v.karma > 0 ? '😇' : '😈'} Karma:</span><span class="${v.karma > 0 ? 'ref-karma-good' : 'ref-karma-bad'}">${v.karma > 0 ? '+' : ''}${v.karma}</span>`
      wrap.appendChild(karmaRow)
    }
    return wrap
  }

  private buildFameSection(v: DynamicVitals): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-fame-section'
    wrap.appendChild(sectionTitle('Şöhret Kariyeri'))

    if (v.fameCareerName) {
      const active = document.createElement('div')
      active.className = 'ref-fame-active'
      active.innerHTML = `
        <div class="ref-fame-active__head">
          <span class="ref-fame-active__name">${v.fameCareerName}</span>
          <span class="ref-fame-active__label">${v.fameLabel}</span>
        </div>
        <div class="ref-fame-bar">
          <div class="ref-fame-bar__lbl"><span>Şöhret</span><span>${v.fame}/100</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${v.fame}%"></div></div>
        </div>
        <div class="ref-fame-actions">
          <button class="ref-fame-action-btn" data-action="fame_do" type="button">🎤 Aksiyon Al</button>
          <button class="ref-fame-quit-btn" data-action="fame_quit" type="button">✖ Bırak</button>
        </div>
      `
      wrap.appendChild(active)
    } else {
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
    const st = this.liveState
    if (!st) return
    const treatBtn = target.closest('[data-treat]') as HTMLElement | null
    if (treatBtn) {
      const id = treatBtn.dataset.treat as DiseaseId
      const before = (st.diseases ?? []).length
      const paid = st.treatDisease(id)
      if (!paid) {
        refToast('Tedavi için yeterli para yok', 'err')
      } else if ((st.diseases ?? []).length < before) {
        refToast('💊 Tedavi başarılı — iyileştin!', 'ok')
      } else {
        refToast('Tedavi tutmadı — tekrar deneyebilirsin', 'err')
      }
      this.refresh(st)
      return
    }
    const actionBtn = target.closest('[data-action]') as HTMLElement | null
    if (!actionBtn) return
    const action = actionBtn.dataset.action
    if (action === 'fame_do') {
      const ok = st.doFameAction()
      refToast(ok ? '🌟 Şöhret aksiyonu başarılı!' : 'Aksiyon tutmadı (günde 1 hak)', ok ? 'ok' : 'err')
    } else if (action === 'fame_quit') {
      st.quitFameCareer()
      refToast('Şöhret kariyeri bırakıldı', 'ok')
    } else if (action === 'fame_start') {
      const career = actionBtn.dataset.career as FameCareerType
      if (st.startFameCareer(career)) refToast(`${fameDef(career).emoji} ${fameDef(career).name} kariyeri başladı`, 'ok')
    }
    this.refresh(st)
  }
}
