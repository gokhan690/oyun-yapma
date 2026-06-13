import { sectionTitle, fmtMoney, refToast } from './refShared'
import { RefSubTabs } from './RefSubTabs'
import type { RefCareerVM } from './refAppDataAdapter'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import type { DiseaseId } from '../../game/Diseases'
import { FAME_CAREERS, fameLevelLabel } from '../../game/Fame'
import type { FameCareerType } from '../../game/Fame'
import { diseaseDef } from '../../game/Diseases'
import { PLAYER_RANKS, rankProgress } from '../../game/PlayerRank'
import { JOB_DEFS, EDUCATION_DEFS, LIFESTYLE_DEFS } from '../../game/CharacterProfile'

const MOCK_CAREER: RefCareerVM = {
  jobTitle: 'Holding YK Başkanı', level: 24, salaryDaily: 48_000, stress: 48,
  xpPct: 64, xpText: '₺248M / ₺1Mr', nextRank: 'Sektör Lideri', seniorityYears: 6,
  health: 72, healthLabel: 'İyi', diseases: [], fame: 0, fameLabel: 'Yeni Başlayan',
  fameCareerName: null, fameCareerType: null, fameIsActive: false, karma: 0, siblingCount: 0,
}

export class RefCareerPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'KARİYER'

  private tabs: RefSubTabs
  private jobCard!: HTMLElement
  private profileCard!: HTMLElement
  private vm: RefCareerVM
  private state?: GameState
  private lastDynSig = ''
  private lastJobSig = ''

  constructor(vm?: RefCareerVM, state?: GameState) {
    this.vm = vm ?? MOCK_CAREER
    this.state = state

    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-career-page'

    this.tabs = new RefSubTabs([
      { id: 'job',    label: 'İş',     icon: '💼' },
      { id: 'health', label: 'Sağlık', icon: '❤️' },
      { id: 'fame',   label: 'Şöhret', icon: '⭐' },
    ])
    this.el.appendChild(this.tabs.tabsEl)
    const secJob = this.tabs.section('job')
    this.el.appendChild(secJob)
    this.el.appendChild(this.tabs.section('health'))
    this.el.appendChild(this.tabs.section('fame'))

    this.jobCard = document.createElement('div')
    this.jobCard.className = 'ref-job-card'
    this.jobCard.innerHTML = this.jobCardHtml(this.vm)
    secJob.appendChild(this.jobCard)

    // Karakter profili (onboarding seçimleri) — İş sekmesinde
    this.profileCard = document.createElement('div')
    this.profileCard.className = 'ref-career-profile'
    this.profileCard.innerHTML = this.profileHtml()
    secJob.appendChild(this.profileCard)

    this.renderDyn(this.vm)
    this.el.addEventListener('click', (e) => this.handleClick(e))
  }

  /** Onboarding'de seçilen meslek/eğitim/yaşam tarzı çipleri. */
  private profileHtml(): string {
    const p = this.state?.characterProfile
    if (!p) return ''
    const job = JOB_DEFS[p.jobId]
    const edu = EDUCATION_DEFS[p.educationLevel]
    const life = LIFESTYLE_DEFS[p.lifestyleType]
    return `
      <div class="ref-career-profile__title">Karakter Profili</div>
      <div class="ref-career-profile__chips">
        <span class="ref-member-chip">${job.emoji} ${job.label}${job.incomeDailyBonus > 0 ? ` · +${fmtMoney(job.incomeDailyBonus)}/g` : ''}</span>
        <span class="ref-member-chip">${edu.emoji} ${edu.label}</span>
        <span class="ref-member-chip">${life.emoji} ${life.label} yaşam</span>
      </div>`
  }

  private jobCardHtml(c: RefCareerVM): string {
    const rankColor = c.level >= 20 ? '#7c3aed' : c.level >= 10 ? '#0369a1' : '#475569'
    return `
      <div class="ref-job-card__banner" style="background:linear-gradient(135deg,${rankColor}22,${rankColor}08)">
        <div class="ref-job-card__banner-left">
          <div class="ref-job-card__title">${c.jobTitle}</div>
          <div class="ref-job-card__company">Kariyer Seviyesi ${c.level} · ${c.seniorityYears} yıl kıdem</div>
        </div>
        <div class="ref-job-card__lvl-pill" style="background:${rankColor}">LVL ${c.level}</div>
      </div>
      <div class="ref-job-stats">
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">💰 Günlük Gelir</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily)}</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">📅 Aylık Tahmini</span>
          <span class="ref-job-stat__val income">${fmtMoney(c.salaryDaily * 30)}</span>
        </div>
        <div class="ref-job-stat">
          <span class="ref-job-stat__lbl">🏆 Sıradaki Rütbe</span>
          <span class="ref-job-stat__val">${c.nextRank}</span>
        </div>
      </div>
      <div class="ref-job-bars">
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl"><span>📈 Kariyer İlerlemesi</span><span>${c.xpText}</span></div>
          <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.xpPct}%"></div></div>
        </div>
        <div class="ref-job-bar">
          <div class="ref-job-bar__lbl">
            <span>😤 Stres ${c.stress >= 70 ? '⚠️' : ''}</span>
            <span>${c.stress}%</span>
          </div>
          <div class="ref-perf-track"><div class="ref-perf-fill ${c.stress >= 70 ? 'low' : c.stress >= 45 ? 'medium' : 'high'}" style="width:${c.stress}%"></div></div>
        </div>
      </div>
      <div class="ref-career-tips">
        ${c.stress >= 70 ? '<div class="ref-career-tip ref-career-tip--warn">⚠️ Stres çok yüksek — sağlık riske girdi</div>' : ''}
        ${c.xpPct >= 80 ? '<div class="ref-career-tip ref-career-tip--good">🚀 Rütbe atlamaya yakın!</div>' : ''}
      </div>
    `
  }

  private renderDyn(c: RefCareerVM): void {
    const secHealth = this.tabs.section('health')
    secHealth.innerHTML = ''
    secHealth.appendChild(this.buildHealthSection(c))
    const secFame = this.tabs.section('fame')
    secFame.innerHTML = ''
    secFame.appendChild(this.buildFameSection(c))
    secFame.appendChild(this.buildKarmaRow(c))
  }

  private buildHealthSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    const hClass = c.health >= 70 ? 'high' : c.health >= 40 ? 'medium' : 'low'
    wrap.appendChild(sectionTitle('Sağlık', `${c.health}% · ${c.healthLabel}`))

    const card = document.createElement('div')
    card.className = 'ref-health-card'
    card.innerHTML = `
      <div class="ref-health-row">
        <span>💚 Sağlık Puanı</span><span class="ref-health-val">${c.health}%</span>
      </div>
      <div class="ref-perf-track"><div class="ref-perf-fill ${hClass}" style="width:${c.health}%"></div></div>
    `

    if (c.diseases.length > 0) {
      const dTitle = document.createElement('div')
      dTitle.className = 'ref-disease-list-title'
      dTitle.textContent = '🏥 Aktif Hastalıklar'
      card.appendChild(dTitle)
      const list = document.createElement('div')
      list.className = 'ref-disease-list'
      for (const d of c.diseases) {
        const row = document.createElement('div')
        row.className = 'ref-disease-row'
        row.innerHTML = `
          <span class="ref-disease-emoji">${d.emoji}</span>
          <div class="ref-disease-info">
            <div class="ref-disease-name">${d.name}</div>
            <div class="ref-disease-dmg">−${d.dailyDamage} sağlık/gün</div>
          </div>
          <button class="ref-disease-treat-btn" type="button" data-disease="${d.id}">
            Tedavi · ${fmtMoney(d.treatCost)}
          </button>
        `
        list.appendChild(row)
      }
      card.appendChild(list)
    } else {
      const ok = document.createElement('div')
      ok.className = 'ref-disease-ok'
      ok.textContent = '✅ Aktif hastalık yok'
      card.appendChild(ok)
    }
    wrap.appendChild(card)
    return wrap
  }

  private buildFameSection(c: RefCareerVM): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ref-fame-section'
    wrap.appendChild(sectionTitle('Şöhret Kariyeri', c.fameIsActive ? (c.fameCareerName ?? '') : 'Pasif'))

    if (c.fameIsActive && c.fameCareerType) {
      const career = FAME_CAREERS.find((f) => f.id === c.fameCareerType)
      const active = document.createElement('div')
      active.className = 'ref-fame-active'
      active.innerHTML = `
        <div class="ref-fame-active__head">
          <span>${career?.emoji ?? '⭐'} ${c.fameCareerName}</span>
          <span class="ref-fame-level">${c.fameLabel} · ${c.fame}%</span>
        </div>
        <div class="ref-perf-track"><div class="ref-perf-fill high" style="width:${c.fame}%"></div></div>
        <div class="ref-fame-income">📈 Şöhret geliri: ${fmtMoney(c.fame * c.fame * 12 + (career?.baseDailyIncome ?? 0))}/gün</div>
        <button class="ref-fame-quit-btn" type="button" data-action="quit_fame">Kariyeri Bırak</button>
      `
      if (career) {
        const actWrap = document.createElement('div')
        actWrap.className = 'ref-fame-actions'
        for (const act of career.actions) {
          const btn = document.createElement('button')
          btn.className = 'ref-fame-action-btn'
          btn.type = 'button'
          btn.dataset.action = `fame_action:${act.id}`
          btn.innerHTML = `${act.emoji} ${act.label}${act.cost > 0 ? ` · ${fmtMoney(act.cost)}` : ''}`
          actWrap.appendChild(btn)
        }
        active.appendChild(actWrap)
      }
      wrap.appendChild(active)
    } else {
      const note = document.createElement('div')
      note.className = 'ref-fame-inactive'
      note.textContent = 'Şöhret kariyeri başlatmak için bir alan seç:'
      wrap.appendChild(note)
      const grid = document.createElement('div')
      grid.className = 'ref-fame-pick-grid'
      for (const career of FAME_CAREERS) {
        const card = document.createElement('button')
        card.className = 'ref-fame-pick-card'
        card.type = 'button'
        card.dataset.action = `start_fame:${career.id}`
        card.innerHTML = `
          <div class="ref-fame-pick-emoji">${career.emoji}</div>
          <div class="ref-fame-pick-name">${career.name}</div>
          <div class="ref-fame-pick-income">${fmtMoney(career.baseDailyIncome)}/gün</div>
        `
        grid.appendChild(card)
      }
      wrap.appendChild(grid)
    }
    return wrap
  }

  private buildKarmaRow(c: RefCareerVM): HTMLElement {
    const row = document.createElement('div')
    row.className = `ref-karma-row ${c.karma >= 0 ? 'ref-karma-good' : 'ref-karma-bad'}`
    row.innerHTML = `
      <span>${c.karma >= 0 ? '😇' : '😈'} Karma</span>
      <span class="ref-karma-val">${c.karma >= 0 ? '+' : ''}${c.karma}</span>
    `
    return row
  }

  private dynSig(c: RefCareerVM): string {
    return `${c.health}|${c.diseases.map((d) => d.id).join(',')}|${c.fame}|${c.fameIsActive}|${c.fameCareerType}|${c.karma}`
  }

  private jobSig(c: RefCareerVM): string {
    return `${c.jobTitle}|${c.level}|${Math.round(c.salaryDaily)}|${c.stress}|${c.xpPct}|${c.nextRank}`
  }

  refresh(state: GameState): void {
    this.state = state
    const vm = this.buildVMFromState(state)

    const jSig = this.jobSig(vm)
    if (jSig !== this.lastJobSig) {
      this.lastJobSig = jSig
      this.jobCard.innerHTML = this.jobCardHtml(vm)
    }

    // Profil onboarding'de bir kez seçilir — boşsa ve artık varsa doldur
    if (!this.profileCard.innerHTML && state.characterProfile) {
      this.profileCard.innerHTML = this.profileHtml()
    }

    const sig = this.dynSig(vm)
    if (sig === this.lastDynSig) return
    this.lastDynSig = sig
    this.renderDyn(vm)
  }

  private buildVMFromState(state: GameState): RefCareerVM {
    const st = state as unknown as {
      fameState?: { careerType: string | null; fameLevel: number; isActive: boolean }
      diseases?: { id: DiseaseId; diagnosedDay: number }[]
      karma?: number
    }
    const fs = st.fameState
    const diseases = st.diseases ?? []
    const karma = st.karma ?? 0
    const health = Math.round(state.health?.health ?? 100)
    const fameCareerDef = fs?.careerType
      ? FAME_CAREERS.find((c) => c.id === fs.careerType)
      : undefined

    // Gerçek kariyer basamağı: PlayerRank (totalEarned tabanlı) — TEK KAYNAK
    const rp = rankProgress(state.totalEarned)
    const age = state.playerAge()

    return {
      ...this.vm,
      jobTitle: `${rp.current.emoji} ${rp.current.name}`,
      level: PLAYER_RANKS.indexOf(rp.current) + 1,
      salaryDaily: Math.round(state.incomePerDay()),
      stress: Math.round(state.lifestyle.stress),
      xpPct: Math.round(rp.pct),
      xpText: rp.next ? `${fmtMoney(Math.round(state.totalEarned))} / ${fmtMoney(rp.next.minEarned)}` : 'ZİRVE 🏆',
      nextRank: rp.next ? `${rp.next.emoji} ${rp.next.name}` : '🏆 Zirvede',
      seniorityYears: Math.max(0, age - 18),
      health,
      healthLabel: health >= 80 ? 'İyi' : health >= 50 ? 'Orta' : health >= 20 ? 'Kötü' : 'Kritik',
      diseases: diseases.map((d) => {
        const def = diseaseDef(d.id)
        return { id: d.id, name: def.name, emoji: def.emoji, treatCost: def.treatCost, dailyDamage: def.dailyHealthDamage }
      }),
      fame: Math.round(fs?.fameLevel ?? 0),
      fameLabel: fameLevelLabel(fs?.fameLevel ?? 0),
      fameCareerName: fameCareerDef?.name ?? null,
      fameCareerType: fs?.careerType ?? null,
      fameIsActive: fs?.isActive ?? false,
      karma,
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action],[data-disease]')
    if (!btn) return

    const diseaseId = btn.dataset.disease as DiseaseId | undefined
    if (diseaseId) {
      const ok = (this.state as unknown as { treatDisease: (id: DiseaseId) => boolean }).treatDisease(diseaseId)
      refToast(ok ? '💊 Tedavi tamamlandı' : '💸 Para yetersiz', ok ? 'ok' : 'err')
      return
    }

    const action = btn.dataset.action
    if (!action) return

    if (action === 'quit_fame') {
      ;(this.state as unknown as { quitFameCareer: () => void }).quitFameCareer()
      refToast('Şöhret kariyeri bırakıldı', 'ok')
      return
    }
    if (action.startsWith('start_fame:')) {
      const type = action.split(':')[1] as FameCareerType
      const ok = (this.state as unknown as { startFameCareer: (t: FameCareerType) => boolean }).startFameCareer(type)
      refToast(ok ? '🌟 Kariyer başladı!' : 'Zaten aktif bir kariyer var', ok ? 'ok' : 'err')
      return
    }
    if (action.startsWith('fame_action:')) {
      const actionId = action.split(':')[1]!
      const ok = (this.state as unknown as { doFameAction: (id: string) => boolean }).doFameAction(actionId)
      refToast(ok ? '⭐ Aksiyon tamamlandı!' : '💸 Para yetersiz', ok ? 'ok' : 'err')
    }
  }
}
