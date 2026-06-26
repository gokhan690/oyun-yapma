import { ua, ringSvg, demoBanner, fmtMoney } from './refShared'
import { i18n, fmt } from '../../i18n'
import type { Translations } from '../../i18n/keys'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS, achievementName, achievementDesc, type AchievementDef } from '../../game/Achievements'
import { BADGES, badgeName, badgeDesc, type BadgeDef } from '../../game/Badges'
import { missionProgressLabel, type MissionProgress } from '../../game/Missions'

const A = REF_ASSETS_V2_GENERIC.achievements

type TabKey = 'gorevler' | 'hedefler' | 'basarilar' | 'rozetler'
const TABS: { id: TabKey; labelKey: keyof Translations }[] = [
  { id: 'gorevler',  labelKey: 'ref_ach_tab_missions' },
  { id: 'hedefler',  labelKey: 'ref_ach_tab_goals' },
  { id: 'basarilar', labelKey: 'ref_achievements_tab' },
  { id: 'rozetler',  labelKey: 'ref_ach_tab_badges' },
]

/* ── Başarı kategorileri (id desenlerinden türetilir — Achievements.ts'e dokunmaz) ── */
type AchCat = 'para' | 'isletme' | 'borsa' | 'aktivite'
type CatId = AchCat | 'tumu'
const CAT_IDS: CatId[] = ['tumu', 'para', 'isletme', 'borsa', 'aktivite']
const CAT_LABEL_KEYS: Record<CatId, keyof Translations> = {
  tumu:     'ref_ach_cat_all',
  para:     'ref_ach_cat_money',
  isletme:  'ref_ach_cat_business',
  borsa:    'ref_ach_cat_stock',
  aktivite: 'ref_ach_cat_activity',
}
function achCategory(id: string): AchCat {
  if (/^first_|millionaire|^earn_|billion|lifetime/.test(id)) return 'para'
  if (/stock|hedge|tree_|prestige|^ipo_/.test(id)) return 'borsa'
  if (/^click_|^combo_|streak|comeback|dynasty|theme_|^night_|weekly|season_|advisor|underground|heat/.test(id)) return 'aktivite'
  return 'isletme'
}
function catLabel(id: string): string {
  return i18n.t(CAT_LABEL_KEYS[achCategory(id)])
}

/* ── Kupa görseli: ödül büyüklüğüne göre kademe ── */
function cupForReward(reward: number): string {
  if (reward >= 1_000_000) return A.cupBlue
  if (reward >= 100_000) return A.cupGold
  if (reward >= 10_000) return A.cupSilver
  return A.cupBronze
}

/* ── MOCK (standalone önizleme — gerçek state yokken) ── */
interface MockRow { ico: string; name: string; desc: string; pct: number; prog: string; reward: string; state: 'done' | 'active' | 'locked' }
function buildMockTasks(): MockRow[] {
  const biz = i18n.t('ref_ach_cat_business')
  const act = i18n.t('ref_ach_cat_activity')
  return [
    { ico: '🏭', name: biz, desc: biz, pct: 66,  prog: '2/3',    reward: '+₺500K', state: 'active' },
    { ico: '⭐', name: act, desc: act, pct: 88,  prog: '8.7/9',  reward: '+XP',    state: 'active' },
    { ico: '👤', name: biz, desc: biz, pct: 0,   prog: '0/1',    reward: '+XP',    state: 'locked' },
    { ico: '📦', name: act, desc: act, pct: 100, prog: '1/1',    reward: '+₺200K', state: 'done' },
  ]
}
function buildMockBadges() {
  return [
    { asset: A.badgeCompleted, labelKey: 'ref_ach_cat_business' as const, on: true },
    { asset: A.badgeCompleted, labelKey: 'ref_ach_cat_money'    as const, on: true },
    { asset: A.badgeActive,    labelKey: 'ref_ach_cat_stock'    as const, on: true },
    { asset: A.badgeLocked,    labelKey: 'ref_ach_cat_activity' as const, on: false },
  ]
}
const MOCK_MILESTONES = [
  { cup: A.cupBronze, label: '10', reached: true },
  { cup: A.cupSilver, label: '25', reached: false },
  { cup: A.cupGold,   label: '40', reached: false },
  { cup: A.cupBlue,   label: '46', reached: false },
]

function statusBadge(state: 'done' | 'active' | 'locked'): string {
  if (state === 'done') return `<span class="ref-tstatus done">${i18n.t('ref_ach_status_done')}</span>`
  if (state === 'active') return `<span class="ref-tstatus active">${i18n.t('ref_ach_status_active')}</span>`
  return `<span class="ref-tstatus locked">${i18n.t('ref_ach_status_locked')}</span>`
}
function mockRowHtml(t: MockRow): string {
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
  get title(): string { return i18n.t('ref_achievements_title') }

  onBack?: () => void

  private state?: GameState
  private contentEl!: HTMLElement
  private countEl!: HTMLElement
  private ringWrap!: HTMLElement
  private activeTab: TabKey = 'gorevler'
  private activeCat: AchCat | 'tumu' = 'tumu'
  private tabBtns = new Map<TabKey, HTMLButtonElement>()
  private detailEl?: HTMLElement

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-ach-page'

    const doneCount = state ? state.achievements.size : 12
    const total = state ? ACHIEVEMENTS.length : 46
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

    // Geri + özet
    const top = document.createElement('div')
    top.className = 'ref-ach-top'
    top.innerHTML = `
      <button class="ref-back-btn" type="button">${i18n.t('ref_back')}</button>
      <span class="ref-ach-count">${fmt('ref_ach_completed_fmt', { done: String(doneCount), total: String(total) })}</span>
    `
    top.querySelector('.ref-back-btn')!.addEventListener('click', () => this.onBack?.())
    this.el.appendChild(top)
    this.countEl = top.querySelector('.ref-ach-count') as HTMLElement

    if (!state) this.el.appendChild(demoBanner(i18n.t('ref_ach_demo_banner')))

    // Tamamlanma halkası + milestone çizgisi
    const summary = document.createElement('div')
    summary.className = 'ref-ach-summary'
    this.ringWrap = document.createElement('div')
    this.ringWrap.className = 'ref-ach-ring'
    this.ringWrap.innerHTML = ringSvg(pct, `%${pct}`, `${doneCount} / ${total}`, 104, 10, '#F6A609')
    summary.appendChild(this.ringWrap)
    const milestones = this.buildMilestones(doneCount, total)
    const mil = document.createElement('div')
    mil.className = 'ref-ach-milestone'
    mil.innerHTML = `
      <div class="ref-ach-milestone__lbl">${i18n.t('ref_ach_milestone_title')}</div>
      <div class="ref-milestone-track">
        <div class="ref-milestone-line"><div class="ref-milestone-fill" style="width:${pct}%"></div></div>
        ${milestones.map(m => `
          <div class="ref-milestone-node ${m.reached ? 'on' : ''}">
            <img src="${ua(m.cup)}" alt="">
            <span>${m.label}</span>
          </div>`).join('')}
      </div>`
    summary.appendChild(mil)
    this.el.appendChild(summary)

    // Tablar
    const tabs = document.createElement('div')
    tabs.className = 'ref-ach-tabs'
    for (const tab of TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-ach-tab' + (tab.id === this.activeTab ? ' active' : '')
      btn.textContent = i18n.t(tab.labelKey)
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

  /** Sayfa yeniden görünür olduğunda canlı sayıları tazele. */
  refresh(state: GameState): void {
    this.state = state
    const doneCount = state.achievements.size
    const total = ACHIEVEMENTS.length
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
    this.countEl.textContent = fmt('ref_ach_completed_fmt', { done: String(doneCount), total: String(total) })
    this.ringWrap.innerHTML = ringSvg(pct, `%${pct}`, `${doneCount} / ${total}`, 104, 10, '#F6A609')
    this.renderTab()
  }

  private buildMilestones(done: number, total: number): { cup: string; label: string; reached: boolean }[] {
    if (!this.state) return MOCK_MILESTONES
    const steps = [
      { cup: A.cupBronze, n: Math.round(total * 0.2) },
      { cup: A.cupSilver, n: Math.round(total * 0.45) },
      { cup: A.cupGold,   n: Math.round(total * 0.7) },
      { cup: A.cupBlue,   n: total },
    ]
    return steps.map(s => ({ cup: s.cup, label: String(s.n), reached: done >= s.n }))
  }

  private setTab(id: TabKey): void {
    this.activeTab = id
    this.tabBtns.forEach((b, k) => b.classList.toggle('active', k === id))
    this.closeDetail()
    this.renderTab()
  }

  private renderTab(): void {
    if (this.activeTab === 'gorevler')       this.renderGorevler()
    else if (this.activeTab === 'hedefler')  this.renderHedefler()
    else if (this.activeTab === 'basarilar') this.renderBasarilar()
    else                                     this.renderRozetler()
  }

  /* ── Görevler: gerçek günlük görevler (state.missions) ── */
  private renderGorevler(): void {
    const s = this.state
    if (!s) {
      this.contentEl.innerHTML = `<div class="ref-trow-list">${buildMockTasks().map(mockRowHtml).join('')}</div>`
      return
    }
    const missions = s.missions ?? []
    if (missions.length === 0) {
      this.contentEl.innerHTML = this.emptyHtml('🗓️', i18n.t('ref_ach_no_missions_title'), i18n.t('ref_ach_no_missions_desc'))
      return
    }
    this.contentEl.innerHTML = `<div class="ref-trow-list">${missions.map(m => this.missionRowHtml(m)).join('')}</div>`
  }

  private missionRowHtml(m: MissionProgress): string {
    const pct = Math.max(0, Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100)))
    const stClass: 'done' | 'active' = m.claimed || pct >= 100 ? 'done' : 'active'
    const statusHtml = m.claimed
      ? `<span class="ref-tstatus done">${i18n.t('ref_ach_claimed_status')}</span>`
      : statusBadge(pct >= 100 ? 'done' : 'active')
    const tierIco = m.tier === 'risky' ? '🔥' : m.tier === 'strategic' ? '🎯' : '✅'
    const reward = m.rewardMoney > 0 ? fmtMoney(m.rewardMoney) : m.rewardBoostMinutes > 0 ? fmt('ref_ach_boost_reward_fmt', { min: String(m.rewardBoostMinutes) }) : '+XP'
    return `
      <div class="ref-trow ${stClass}">
        <span class="ref-trow__ico">${tierIco}</span>
        <div class="ref-trow__main">
          <div class="ref-trow__head"><span class="ref-trow__name">${missionProgressLabel(m)}</span>${statusHtml}</div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${pct >= 70 ? 'high' : pct > 0 ? 'medium' : 'low'}" style="width:${pct}%"></div></div>
          <div class="ref-trow__foot"><span class="ref-trow__prog">${Math.min(m.progress, m.target)}/${m.target}</span><span class="ref-trow__reward">🎁 ${reward}</span></div>
        </div>
      </div>`
  }

  /* ── Hedefler: sıradaki en yakın kilitli başarılar (ödüle göre artan) ── */
  private renderHedefler(): void {
    const s = this.state
    if (!s) {
      this.contentEl.innerHTML = this.emptyHtml('🎯', i18n.t('ref_ach_goals_preview_title'), i18n.t('ref_ach_goals_preview_desc'))
      return
    }
    const locked = ACHIEVEMENTS.filter(a => !s.achievements.has(a.id)).sort((a, b) => a.reward - b.reward).slice(0, 8)
    if (locked.length === 0) {
      this.contentEl.innerHTML = this.emptyHtml('🏆', i18n.t('ref_ach_all_done_title'), i18n.t('ref_ach_all_done_desc'))
      return
    }
    this.contentEl.innerHTML = `
      <div class="ref-ach-cat-hint">${i18n.t('ref_ach_next_goals_hint')}</div>
      <div class="ref-trow-list">${locked.map(a => `
        <div class="ref-trow ref-ach-clickable" data-ach="${a.id}">
          <span class="ref-trow__ico">${a.emoji}</span>
          <div class="ref-trow__main">
            <div class="ref-trow__head"><span class="ref-trow__name">${achievementName(a)}</span><span class="ref-tstatus locked">${i18n.t('ref_ach_goal_badge')}</span></div>
            <div class="ref-trow__desc">${achievementDesc(a)}</div>
            <div class="ref-trow__foot"><span class="ref-trow__prog">${catLabel(a.id)}</span><span class="ref-trow__reward">🎁 ${fmtMoney(a.reward)}</span></div>
          </div>
        </div>`).join('')}</div>`
    this.wireAchClicks()
  }

  /* ── Başarılar: kategori filtreli, kilit/açık, tıkla-detay ── */
  private renderBasarilar(): void {
    const s = this.state
    const done = s ? s.achievements : new Set<string>(['first_100', 'first_1k', 'click_100'])
    const list = this.activeCat === 'tumu'
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter(a => achCategory(a.id) === this.activeCat)
    // Açıklar önce
    const sorted = [...list].sort((a, b) => Number(done.has(b.id)) - Number(done.has(a.id)))

    const chips = CAT_IDS.map(cid => {
      const all = cid === 'tumu' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => achCategory(a.id) === cid)
      const total = all.length
      const doneN = all.filter(a => done.has(a.id)).length
      const chipLabel = i18n.t(CAT_LABEL_KEYS[cid])
      return `<button class="ref-ach-chip ${cid === this.activeCat ? 'active' : ''}" type="button" data-cat="${cid}">${chipLabel} <b>${doneN}/${total}</b></button>`
    }).join('')

    const catDone = sorted.filter(a => done.has(a.id)).length
    const catHintLabel = this.activeCat === 'tumu' ? i18n.t('ref_ach_cat_all_label') : i18n.t(CAT_LABEL_KEYS[this.activeCat])
    this.contentEl.innerHTML = `
      <div class="ref-ach-chips">${chips}</div>
      <div class="ref-ach-cat-hint">${catHintLabel} · ${fmt('ref_ach_open_count_fmt', { done: String(catDone), total: String(sorted.length) })}</div>
      <div class="ref-ach-grid">${sorted.map(a => {
        const isDone = done.has(a.id)
        return `
          <div class="ref-ach-card ${isDone ? 'done' : 'locked'} ref-ach-clickable" data-ach="${a.id}">
            <img src="${ua(isDone ? cupForReward(a.reward) : A.cupLocked)}" alt="" class="ref-ach-cup">
            <div class="ref-ach-emoji-badge">${a.emoji}</div>
            <div class="ref-ach-name">${achievementName(a)}</div>
            <div class="ref-ach-desc">${achievementDesc(a)}</div>
            <div class="ref-ach-flag ${isDone ? 'done' : 'locked'}">${isDone ? fmt('ref_ach_flag_open_fmt', { reward: fmtMoney(a.reward) }) : i18n.t('ref_ach_flag_locked')}</div>
          </div>`
      }).join('')}</div>`

    this.contentEl.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => { this.activeCat = btn.dataset.cat as AchCat | 'tumu'; this.closeDetail(); this.renderBasarilar() })
    })
    this.wireAchClicks()
  }

  /* ── Rozetler: gerçek earnedBadges ── */
  private renderRozetler(): void {
    const s = this.state
    if (!s) {
      this.contentEl.innerHTML = `<div class="ref-badge-grid">${buildMockBadges().map(bd => `
        <div class="ref-badge-tile ${bd.on ? '' : 'off'}">
          <img src="${ua(bd.asset)}" alt="" class="ref-badge-img">
          <span class="ref-badge-lbl">${i18n.t(bd.labelKey)}</span>
        </div>`).join('')}</div>`
      return
    }
    const earned = s.earnedBadges
    const sorted = [...BADGES].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)))
    const earnedCount = sorted.filter(b => earned.has(b.id)).length
    this.contentEl.innerHTML = `
      <div class="ref-ach-cat-hint">${fmt('ref_ach_badge_count_fmt', { done: String(earnedCount), total: String(BADGES.length) })}</div>
      <div class="ref-badge-grid">${sorted.map((bd: BadgeDef) => {
        const on = earned.has(bd.id)
        return `
          <div class="ref-badge-tile ${on ? '' : 'off'} ref-ach-clickable" data-badge="${bd.id}">
            <img src="${ua(on ? A.badgeCompleted : A.badgeLocked)}" alt="" class="ref-badge-img">
            <span class="ref-badge-emoji">${bd.emoji}</span>
            <span class="ref-badge-lbl">${badgeName(bd)}</span>
          </div>`
      }).join('')}</div>`
    this.contentEl.querySelectorAll<HTMLElement>('[data-badge]').forEach(tile => {
      tile.addEventListener('click', () => {
        const bd = BADGES.find(b => b.id === tile.dataset.badge)
        if (bd) this.showBadgeDetail(bd, earned.has(bd.id))
      })
    })
  }

  /* ── Detay paneli ── */
  private wireAchClicks(): void {
    this.contentEl.querySelectorAll<HTMLElement>('[data-ach]').forEach(card => {
      card.addEventListener('click', () => {
        const def = ACHIEVEMENTS.find(a => a.id === card.dataset.ach)
        if (def) this.showAchDetail(def)
      })
    })
  }

  private showAchDetail(def: AchievementDef): void {
    const isDone = this.state ? this.state.achievements.has(def.id) : false
    this.openDetail(`
      <div class="ref-ach-detail__head">
        <span class="ref-ach-detail__emoji">${def.emoji}</span>
        <div class="ref-ach-detail__title">
          <div class="ref-ach-detail__name">${achievementName(def)}</div>
          <div class="ref-ach-detail__cat">${catLabel(def.id)}</div>
        </div>
        <button class="ref-ach-detail__close" type="button">✕</button>
      </div>
      <div class="ref-ach-detail__desc">${achievementDesc(def)}</div>
      <div class="ref-ach-detail__rows">
        <div class="ref-ach-detail__row"><span>${i18n.t('ref_ach_detail_reward_label')}</span><b>${fmtMoney(def.reward)}</b></div>
        <div class="ref-ach-detail__row"><span>${i18n.t('ref_ach_detail_status_label')}</span><b class="${isDone ? 'ok' : 'lock'}">${isDone ? i18n.t('ref_ach_detail_status_open') : i18n.t('ref_ach_detail_status_locked')}</b></div>
      </div>`, isDone)
  }

  private showBadgeDetail(bd: BadgeDef, on: boolean): void {
    this.openDetail(`
      <div class="ref-ach-detail__head">
        <span class="ref-ach-detail__emoji">${bd.emoji}</span>
        <div class="ref-ach-detail__title">
          <div class="ref-ach-detail__name">${badgeName(bd)}</div>
          <div class="ref-ach-detail__cat">${i18n.t('ref_ach_badge_detail_cat')}</div>
        </div>
        <button class="ref-ach-detail__close" type="button">✕</button>
      </div>
      <div class="ref-ach-detail__desc">${badgeDesc(bd)}</div>
      <div class="ref-ach-detail__rows">
        <div class="ref-ach-detail__row"><span>${i18n.t('ref_ach_detail_status_label')}</span><b class="${on ? 'ok' : 'lock'}">${on ? i18n.t('ref_ach_badge_status_earned') : i18n.t('ref_ach_badge_status_not_yet')}</b></div>
      </div>`)
  }

  private openDetail(html: string, done = false): void {
    this.closeDetail()
    const overlay = document.createElement('div')
    overlay.className = 'ref-ach-detail-scrim'
    const panel = document.createElement('div')
    panel.className = 'ref-ach-detail' + (done ? ' ref-ach-detail--done' : '')
    panel.innerHTML = html
    overlay.appendChild(panel)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeDetail() })
    panel.querySelector('.ref-ach-detail__close')?.addEventListener('click', () => this.closeDetail())
    this.el.appendChild(overlay)
    this.detailEl = overlay
  }

  private closeDetail(): void {
    this.detailEl?.remove()
    this.detailEl = undefined
  }

  private emptyHtml(ico: string, title: string, desc: string): string {
    return `
      <div class="ref-ach-empty">
        <span class="ref-ach-empty__ico">${ico}</span>
        <div class="ref-ach-empty__title">${title}</div>
        <div class="ref-ach-empty__desc">${desc}</div>
      </div>`
  }

  destroy(): void {
    this.closeDetail()
  }
}
