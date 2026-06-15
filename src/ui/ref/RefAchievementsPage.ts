import { ua, ringSvg, demoBanner, fmtMoney } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS, type AchievementDef } from '../../game/Achievements'
import { BADGES, type BadgeDef } from '../../game/Badges'
import type { MissionProgress } from '../../game/Missions'

const A = REF_ASSETS_V2_GENERIC.achievements

type TabKey = 'gorevler' | 'hedefler' | 'basarilar' | 'rozetler'
const TABS: { id: TabKey; label: string }[] = [
  { id: 'gorevler',  label: 'Görevler' },
  { id: 'hedefler',  label: 'Hedefler' },
  { id: 'basarilar', label: 'Başarılar' },
  { id: 'rozetler',  label: 'Rozetler' },
]

/* ── Başarı kategorileri (id desenlerinden türetilir — Achievements.ts'e dokunmaz) ── */
type AchCat = 'para' | 'isletme' | 'borsa' | 'aktivite'
const CAT_CHIPS: { id: AchCat | 'tumu'; label: string }[] = [
  { id: 'tumu',     label: 'Tümü' },
  { id: 'para',     label: '💰 Para' },
  { id: 'isletme',  label: '🏢 İşletme' },
  { id: 'borsa',    label: '📊 Borsa' },
  { id: 'aktivite', label: '🎮 Aktivite' },
]
function achCategory(id: string): AchCat {
  if (/^first_|millionaire|^earn_|billion|lifetime/.test(id)) return 'para'
  if (/stock|hedge|tree_|prestige|^ipo_/.test(id)) return 'borsa'
  if (/^click_|^combo_|streak|comeback|dynasty|theme_|^night_|weekly|season_|advisor|underground|heat/.test(id)) return 'aktivite'
  return 'isletme'
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
const MOCK_TASKS: MockRow[] = [
  { ico: '🏭', name: '3 Firmayı Modernize Et', desc: 'Bugün 3 işletmeyi geliştir', pct: 66, prog: '2/3', reward: '+₺500K', state: 'active' },
  { ico: '⭐', name: 'İtibarı 9,0’a Çıkar',     desc: 'Saygın baron statüsü', pct: 88, prog: '8,7/9', reward: '+İtibar', state: 'active' },
  { ico: '👤', name: 'Yeni Yönetici Ata',       desc: 'Bir firmaya yönetici ata', pct: 0,  prog: '0/1', reward: '+XP',     state: 'locked' },
  { ico: '📦', name: 'Lojistik Rotasını Aç',    desc: 'Yeni kargo hattı kur', pct: 100, prog: '1/1', reward: '+₺200K', state: 'done' },
]
const MOCK_BADGES = [
  { asset: A.badgeCompleted, label: 'Kurucu',   on: true },
  { asset: A.badgeCompleted, label: 'Milyoner', on: true },
  { asset: A.badgeActive,    label: 'Yatırımcı', on: true },
  { asset: A.badgeLocked,    label: 'Tekel',    on: false },
]
const MOCK_MILESTONES = [
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
  readonly title = 'BAŞARILAR'

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
      <button class="ref-back-btn" type="button">‹ Geri</button>
      <span class="ref-ach-count">${doneCount} / ${total} tamamlandı</span>
    `
    top.querySelector('.ref-back-btn')!.addEventListener('click', () => this.onBack?.())
    this.el.appendChild(top)
    this.countEl = top.querySelector('.ref-ach-count') as HTMLElement

    if (!state) this.el.appendChild(demoBanner('görev/başarı ilerlemesi önizleme — gerçek oyun verisi yok'))

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
      <div class="ref-ach-milestone__lbl">Başarı Kupası Yolu</div>
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

  /** Sayfa yeniden görünür olduğunda canlı sayıları tazele. */
  refresh(state: GameState): void {
    this.state = state
    const doneCount = state.achievements.size
    const total = ACHIEVEMENTS.length
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
    this.countEl.textContent = `${doneCount} / ${total} tamamlandı`
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
      this.contentEl.innerHTML = `<div class="ref-trow-list">${MOCK_TASKS.map(mockRowHtml).join('')}</div>`
      return
    }
    const missions = s.missions ?? []
    if (missions.length === 0) {
      this.contentEl.innerHTML = this.emptyHtml('🗓️', 'Bugün için görev yok', 'Yeni günlük görevler her gün yenilenir.')
      return
    }
    this.contentEl.innerHTML = `<div class="ref-trow-list">${missions.map(m => this.missionRowHtml(m)).join('')}</div>`
  }

  private missionRowHtml(m: MissionProgress): string {
    const pct = Math.max(0, Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100)))
    const st: 'done' | 'active' | 'locked' = m.claimed || pct >= 100 ? 'done' : 'active'
    const tierIco = m.tier === 'risky' ? '🔥' : m.tier === 'strategic' ? '🎯' : '✅'
    const reward = m.rewardMoney > 0 ? fmtMoney(m.rewardMoney) : m.rewardBoostMinutes > 0 ? `${m.rewardBoostMinutes}dk boost` : '+XP'
    return `
      <div class="ref-trow ${st}">
        <span class="ref-trow__ico">${tierIco}</span>
        <div class="ref-trow__main">
          <div class="ref-trow__head"><span class="ref-trow__name">${m.label}</span>${statusBadge(st)}</div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${pct >= 70 ? 'high' : pct > 0 ? 'medium' : 'low'}" style="width:${pct}%"></div></div>
          <div class="ref-trow__foot"><span class="ref-trow__prog">${Math.min(m.progress, m.target)}/${m.target}</span><span class="ref-trow__reward">🎁 ${reward}</span></div>
        </div>
      </div>`
  }

  /* ── Hedefler: sıradaki en yakın kilitli başarılar (ödüle göre artan) ── */
  private renderHedefler(): void {
    const s = this.state
    if (!s) {
      this.contentEl.innerHTML = this.emptyHtml('🎯', 'Hedefler önizlemede', 'Gerçek oyunda bir sonraki büyük hedeflerin burada listelenir.')
      return
    }
    const locked = ACHIEVEMENTS.filter(a => !s.achievements.has(a.id)).sort((a, b) => a.reward - b.reward).slice(0, 8)
    if (locked.length === 0) {
      this.contentEl.innerHTML = this.emptyHtml('🏆', 'Tüm başarılar tamam!', 'Her başarımın kilidini açtın — efsanesin.')
      return
    }
    this.contentEl.innerHTML = `
      <div class="ref-ach-cat-hint">🎯 Sıradaki büyük hedeflerin — ödüle göre en yakından uzağa</div>
      <div class="ref-trow-list">${locked.map(a => `
        <div class="ref-trow active ref-ach-clickable" data-ach="${a.id}">
          <span class="ref-trow__ico">${a.emoji}</span>
          <div class="ref-trow__main">
            <div class="ref-trow__head"><span class="ref-trow__name">${a.name}</span><span class="ref-tstatus locked">🔒 Hedef</span></div>
            <div class="ref-trow__desc">${a.description}</div>
            <div class="ref-trow__foot"><span class="ref-trow__prog">${achCategory(a.id) === 'para' ? '💰 Para' : achCategory(a.id) === 'borsa' ? '📊 Borsa' : achCategory(a.id) === 'aktivite' ? '🎮 Aktivite' : '🏢 İşletme'}</span><span class="ref-trow__reward">🎁 ${fmtMoney(a.reward)}</span></div>
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

    const chips = CAT_CHIPS.map(c => {
      const n = c.id === 'tumu' ? ACHIEVEMENTS.length : ACHIEVEMENTS.filter(a => achCategory(a.id) === c.id).length
      return `<button class="ref-ach-chip ${c.id === this.activeCat ? 'active' : ''}" type="button" data-cat="${c.id}">${c.label} <b>${n}</b></button>`
    }).join('')

    const catDone = sorted.filter(a => done.has(a.id)).length
    this.contentEl.innerHTML = `
      <div class="ref-ach-chips">${chips}</div>
      <div class="ref-ach-cat-hint">${this.activeCat === 'tumu' ? 'Tüm başarılar' : CAT_CHIPS.find(c => c.id === this.activeCat)?.label} · ${catDone}/${sorted.length} açık</div>
      <div class="ref-ach-grid">${sorted.map(a => {
        const isDone = done.has(a.id)
        return `
          <div class="ref-ach-card ${isDone ? 'done' : 'locked'} ref-ach-clickable" data-ach="${a.id}">
            <img src="${ua(isDone ? cupForReward(a.reward) : A.cupLocked)}" alt="" class="ref-ach-cup">
            <div class="ref-ach-emoji-badge">${a.emoji}</div>
            <div class="ref-ach-name">${a.name}</div>
            <div class="ref-ach-desc">${a.description}</div>
            <div class="ref-ach-flag ${isDone ? 'done' : 'locked'}">${isDone ? '✓ Açık · ' + fmtMoney(a.reward) : '🔒 Kilitli'}</div>
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
      this.contentEl.innerHTML = `<div class="ref-badge-grid">${MOCK_BADGES.map(bd => `
        <div class="ref-badge-tile ${bd.on ? '' : 'off'}">
          <img src="${ua(bd.asset)}" alt="" class="ref-badge-img">
          <span class="ref-badge-lbl">${bd.label}</span>
        </div>`).join('')}</div>`
      return
    }
    const earned = s.earnedBadges
    const sorted = [...BADGES].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)))
    const earnedCount = sorted.filter(b => earned.has(b.id)).length
    this.contentEl.innerHTML = `
      <div class="ref-ach-cat-hint">🎖️ ${earnedCount}/${BADGES.length} rozet kazanıldı</div>
      <div class="ref-badge-grid">${sorted.map((bd: BadgeDef) => {
        const on = earned.has(bd.id)
        return `
          <div class="ref-badge-tile ${on ? '' : 'off'} ref-ach-clickable" data-badge="${bd.id}">
            <img src="${ua(on ? A.badgeCompleted : A.badgeLocked)}" alt="" class="ref-badge-img">
            <span class="ref-badge-emoji">${bd.emoji}</span>
            <span class="ref-badge-lbl">${bd.name}</span>
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
    const cat = achCategory(def.id)
    const catLbl = cat === 'para' ? '💰 Para' : cat === 'borsa' ? '📊 Borsa' : cat === 'aktivite' ? '🎮 Aktivite' : '🏢 İşletme'
    this.openDetail(`
      <div class="ref-ach-detail__head">
        <span class="ref-ach-detail__emoji">${def.emoji}</span>
        <div class="ref-ach-detail__title">
          <div class="ref-ach-detail__name">${def.name}</div>
          <div class="ref-ach-detail__cat">${catLbl}</div>
        </div>
        <button class="ref-ach-detail__close" type="button">✕</button>
      </div>
      <div class="ref-ach-detail__desc">${def.description}</div>
      <div class="ref-ach-detail__rows">
        <div class="ref-ach-detail__row"><span>🎁 Ödül</span><b>${fmtMoney(def.reward)}</b></div>
        <div class="ref-ach-detail__row"><span>Durum</span><b class="${isDone ? 'ok' : 'lock'}">${isDone ? '✓ Açıldı' : '🔒 Henüz kilitli'}</b></div>
      </div>`)
  }

  private showBadgeDetail(bd: BadgeDef, on: boolean): void {
    this.openDetail(`
      <div class="ref-ach-detail__head">
        <span class="ref-ach-detail__emoji">${bd.emoji}</span>
        <div class="ref-ach-detail__title">
          <div class="ref-ach-detail__name">${bd.name}</div>
          <div class="ref-ach-detail__cat">🎖️ Rozet</div>
        </div>
        <button class="ref-ach-detail__close" type="button">✕</button>
      </div>
      <div class="ref-ach-detail__desc">${bd.description}</div>
      <div class="ref-ach-detail__rows">
        <div class="ref-ach-detail__row"><span>Durum</span><b class="${on ? 'ok' : 'lock'}">${on ? '✓ Kazanıldı' : '🔒 Henüz yok'}</b></div>
      </div>`)
  }

  private openDetail(html: string): void {
    this.closeDetail()
    const overlay = document.createElement('div')
    overlay.className = 'ref-ach-detail-scrim'
    const panel = document.createElement('div')
    panel.className = 'ref-ach-detail'
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
