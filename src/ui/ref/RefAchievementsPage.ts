import { ua, ringSvg, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS } from '../../game/Achievements'
import type { MissionProgress } from '../../game/Missions'
import { SaveManager } from '../../security/SaveManager'

type TabKey = 'gunluk' | 'buyuk' | 'basarilar' | 'rozetler'
const TABS: { id: TabKey; label: string; icon: string }[] = [
  { id: 'gunluk',    label: 'Günlük',   icon: '📋' },
  { id: 'buyuk',     label: 'Büyük',    icon: '🏆' },
  { id: 'basarilar', label: 'Başarılar', icon: '⭐' },
  { id: 'rozetler',  label: 'Rozetler', icon: '🎖️' },
]

const TROPHY_TIERS = [
  { pct: 10, label: 'Bronz', color: '#CD7F32' },
  { pct: 25, label: 'Gümüş', color: '#C0C0C0' },
  { pct: 50, label: 'Altın', color: '#F6C84C' },
  { pct: 75, label: 'Platin', color: '#B9F2FF' },
  { pct: 100, label: 'Efsane', color: '#13B8A6' },
]

const BIG_GOALS = [
  { id: 'first_million', label: '1 Milyon Kazanç', desc: 'Toplam 1M₺ kazan', icon: '💰', targetKey: 'totalEarned' as const, target: 1_000_000 },
  { id: 'ten_businesses', label: '10 İşletme', desc: '10 farklı tür işletme aç', icon: '🏢', targetKey: 'businesses' as const, target: 10 },
  { id: 'first_ipo', label: 'İlk Halka Arz', desc: 'İlk IPO\'yu tamamla', icon: '📈', targetKey: 'ipoCount' as const, target: 1 },
  { id: 'reputation_50', label: 'Tanınan İsim', desc: '50 itibar puanı kazan', icon: '⭐', targetKey: 'reputation' as const, target: 50 },
  { id: 'second_city', label: 'Çift Şehir', desc: '2. şehri fethet', icon: '🌍', targetKey: 'cities' as const, target: 2 },
]

const A = REF_ASSETS_V2_GENERIC.achievements

function tierIco(tier: string): string {
  return tier === 'easy' ? '🟢' : tier === 'strategic' ? '🔵' : '🔴'
}

function statusBadge(state: 'done' | 'active' | 'locked' | 'claim'): string {
  if (state === 'done')   return '<span class="ref-tstatus done">✓ Tamamlandı</span>'
  if (state === 'active') return '<span class="ref-tstatus active">● Devam</span>'
  if (state === 'claim')  return '<span class="ref-tstatus claim">🎁 Topla!</span>'
  return '<span class="ref-tstatus locked">🔒 Kilitli</span>'
}

export class RefAchievementsPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'BAŞARILAR'

  onBack?: () => void
  private state?: GameState
  private contentEl!: HTMLElement
  private activeTab: TabKey = 'gunluk'
  private tabBtns = new Map<TabKey, HTMLButtonElement>()
  private countEl!: HTMLElement
  private ringEl!: HTMLElement

  constructor(state?: GameState) {
    this.state = state
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-ach-page'
    this.el.addEventListener('click', (e) => this.handleClick(e))
    this.build()
  }

  refresh(st: GameState): void {
    this.state = st
    this.updateSummary()
    this.renderTab()
  }

  private build(): void {
    // Başarı Kupası + halka
    const summary = document.createElement('div')
    summary.className = 'ref-ach-summary'
    this.ringEl = document.createElement('div')
    this.ringEl.className = 'ref-ach-ring'
    this.updateRing()
    summary.appendChild(this.ringEl)

    // Kupa kademe track
    const trophyTrack = document.createElement('div')
    trophyTrack.className = 'ref-trophy-track'
    trophyTrack.innerHTML = TROPHY_TIERS.map((t) => `
      <div class="ref-trophy-tier">
        <div class="ref-trophy-tier__icon" style="color:${t.color}">🏆</div>
        <div class="ref-trophy-tier__label">${t.label}</div>
        <div class="ref-trophy-tier__pct">%${t.pct}</div>
      </div>
    `).join('')
    summary.appendChild(trophyTrack)
    this.el.appendChild(summary)

    // 4 tab
    const tabs = document.createElement('div')
    tabs.className = 'ref-ach-tabs ref-ach-tabs--4'
    for (const tab of TABS) {
      const btn = document.createElement('button')
      btn.className = 'ref-ach-tab' + (tab.id === this.activeTab ? ' active' : '')
      btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`
      btn.addEventListener('click', () => this.setTab(tab.id))
      this.tabBtns.set(tab.id, btn)
      tabs.appendChild(btn)
    }
    this.el.appendChild(tabs)

    // Sayaç
    this.countEl = document.createElement('div')
    this.countEl.className = 'ref-ach-count'
    this.countEl.textContent = this.achievementCountText()
    this.el.appendChild(this.countEl)

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ref-ach-content'
    this.el.appendChild(this.contentEl)
    this.renderTab()
  }

  private achievementCount(): { earned: number; total: number } {
    const s = this.state
    const total = ACHIEVEMENTS.length
    const earned = s ? s.achievements.size : 0
    return { earned, total }
  }

  private achievementCountText(): string {
    const { earned, total } = this.achievementCount()
    return `${earned} / ${total} tamamlandı`
  }

  private updateSummary(): void {
    if (this.countEl) this.countEl.textContent = this.achievementCountText()
    this.updateRing()
  }

  private updateRing(): void {
    const { earned, total } = this.achievementCount()
    const pct = total > 0 ? Math.round((earned / total) * 100) : 0
    this.ringEl.innerHTML = ringSvg(pct, `%${pct}`, `${earned}/${total}`, 104, 10, '#F6A609')
  }

  private setTab(id: TabKey): void {
    this.activeTab = id
    this.tabBtns.forEach((b, k) => b.classList.toggle('active', k === id))
    this.renderTab()
  }

  private renderTab(): void {
    if (this.activeTab === 'gunluk') {
      this.contentEl.innerHTML = this.renderMissions()
    } else if (this.activeTab === 'buyuk') {
      this.contentEl.innerHTML = this.renderBigGoals()
    } else if (this.activeTab === 'basarilar') {
      this.contentEl.innerHTML = this.renderAchievements()
    } else {
      this.contentEl.innerHTML = this.renderBadges()
    }
  }

  // ── Görevler (gerçek missions) ────────────────────────────────────────
  private renderMissions(): string {
    const s = this.state
    if (!s || s.missions.length === 0) {
      return `<div class="ref-ach-empty">📋 Günlük görevler henüz oluşturulmadı<br><small>Oyun başladıkça görevler otomatik gelir.</small></div>`
    }
    return `<div class="ref-trow-list">${s.missions.map((m) => this.missionRowHtml(m)).join('')}</div>`
  }

  private missionRowHtml(m: MissionProgress): string {
    const pct = Math.min(100, Math.round((m.progress / m.target) * 100))
    const claimable = m.progress >= m.target && !m.claimed
    const state: 'done' | 'active' | 'locked' | 'claim' = m.claimed ? 'done' : claimable ? 'claim' : m.progress > 0 ? 'active' : 'locked'
    const rewardText = m.rewardMoney > 0 ? `+${fmtMoney(m.rewardMoney)}` : `+${m.rewardBoostMinutes}dk boost`
    return `
      <div class="ref-trow ${m.claimed ? 'done' : claimable ? 'active' : m.progress > 0 ? 'active' : 'locked'}">
        <span class="ref-trow__ico">${tierIco(m.tier)}</span>
        <div class="ref-trow__main">
          <div class="ref-trow__head">
            <span class="ref-trow__name">${m.target} ${m.label}</span>
            ${statusBadge(state)}
          </div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${pct >= 70 ? 'high' : pct > 0 ? 'medium' : 'low'}" style="width:${pct}%"></div></div>
          <div class="ref-trow__foot">
            <span class="ref-trow__prog">${m.progress}/${m.target}</span>
            ${claimable
              ? `<button type="button" class="ref-claim-btn" data-claim-mission="${m.id}">🎁 ${rewardText} Topla</button>`
              : `<span class="ref-trow__reward">🎁 ${rewardText}</span>`}
          </div>
        </div>
      </div>`
  }

  // ── Başarılar (gerçek achievement listesi) ────────────────────────────
  private renderAchievements(): string {
    const s = this.state
    const earned = s ? s.achievements : new Set<string>()
    return `<div class="ref-trow-list">${ACHIEVEMENTS.map((a) => {
      const done = earned.has(a.id)
      const state: 'done' | 'locked' = done ? 'done' : 'locked'
      const cupSrc = done ? A.cupGold : A.cupLocked
      return `
        <div class="ref-trow ${state}">
          <div class="ref-ach-trow-icon">
            <img src="${ua(cupSrc)}" alt="" class="ref-ach-cup-sm">
            <span class="ref-ach-trow-emoji">${a.emoji}</span>
          </div>
          <div class="ref-trow__main">
            <div class="ref-trow__head">
              <span class="ref-trow__name">${a.name}</span>
              ${statusBadge(state)}
            </div>
            <div class="ref-trow__desc">${a.description}</div>
            <div class="ref-trow__foot">
              <span class="ref-trow__reward">${done ? '✓ Kazanıldı' : `🎁 ${fmtMoney(a.reward)}`}</span>
            </div>
          </div>
        </div>`
    }).join('')}</div>`
  }

  // ── Büyük Hedefler ────────────────────────────────────────────────────
  private renderBigGoals(): string {
    const s = this.state
    const rows = BIG_GOALS.map((goal) => {
      let current = 0
      if (s) {
        if (goal.targetKey === 'totalEarned') current = Math.round(s.totalEarned ?? 0)
        else if (goal.targetKey === 'ipoCount') current = s.ipoCount ?? 0
        else if (goal.targetKey === 'reputation') current = Math.round(s.reputation ?? 0)
        else if (goal.targetKey === 'cities') current = s.cities?.unlocked.length ?? 0
        else if (goal.targetKey === 'businesses') current = Object.values(s.producers ?? {}).filter((c) => c > 0).length
      }
      const pct = Math.min(100, Math.round((current / goal.target) * 100))
      const done = pct >= 100
      const state: 'done' | 'active' | 'locked' = done ? 'done' : pct > 0 ? 'active' : 'locked'
      return `
        <div class="ref-trow ${state}">
          <span class="ref-trow__ico">${goal.icon}</span>
          <div class="ref-trow__main">
            <div class="ref-trow__head">
              <span class="ref-trow__name">${goal.label}</span>
              ${statusBadge(state)}
            </div>
            <div class="ref-trow__desc">${goal.desc}</div>
            <div class="ref-perf-track sm"><div class="ref-perf-fill ${done ? 'high' : pct > 0 ? 'medium' : 'low'}" style="width:${pct}%"></div></div>
            <div class="ref-trow__foot">
              <span class="ref-trow__prog">${current >= goal.target ? goal.target : current}/${goal.target}</span>
              <span class="ref-trow__reward">${done ? '✓ Tamamlandı' : `%${pct} ilerleme`}</span>
            </div>
          </div>
        </div>`
    })
    return `<div class="ref-trow-list">${rows.join('')}</div>`
  }

  // ── Rozetler ───────────────────────────────────────────────────────────
  private renderBadges(): string {
    const s = this.state
    const earned = s ? [...s.earnedBadges] : []
    if (earned.length === 0) {
      return `<div class="ref-ach-empty">🎖️ Henüz rozet kazanılmadı<br><small>Oyunda başarılar elde ettikçe rozetler açılır.</small></div>`
    }
    const badgeLabels: Record<string, { label: string; icon: string }> = {
      codex_legal: { label: 'Yasal Kodeks', icon: '📚' },
      codex_all:   { label: 'Tüm Kodeks',   icon: '📖' },
      season_10:   { label: 'Sezon 10',      icon: '🏅' },
      season_20:   { label: 'Sezon 20',      icon: '🥈' },
      season_30:   { label: 'Sezon 30',      icon: '🥇' },
      comeback:    { label: 'Geri Dönüş',    icon: '💪' },
      underground_lawyer: { label: 'Yeraltı Avukat', icon: '⚖️' },
    }
    const rows = earned.map((badgeId) => {
      const meta = badgeLabels[badgeId] ?? { label: badgeId, icon: '🎖️' }
      return `
        <div class="ref-badge-row">
          <span class="ref-badge-icon">${meta.icon}</span>
          <span class="ref-badge-label">${meta.label}</span>
          <span class="ref-tstatus done">✓ Kazanıldı</span>
        </div>`
    })
    return `<div class="ref-badge-list">${rows.join('')}</div>`
  }

  // ── Click handler: mission claim ──────────────────────────────────────
  private handleClick(e: Event): void {
    const s = this.state
    if (!s) return
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-claim-mission]')
    if (!btn || btn.disabled) return
    const id = btn.dataset.claimMission!
    const result = s.claimMission(id)
    if (result.money > 0 || result.boostMinutes > 0) {
      new SaveManager().save(s)
      const parts = [
        result.money > 0 ? `+${fmtMoney(result.money)}` : '',
        result.boostMinutes > 0 ? `${result.boostMinutes}dk boost` : '',
      ].filter(Boolean)
      refToast(`Görev ödülü: ${parts.join(' · ')}`, 'ok')
      this.renderTab()
    } else {
      refToast('Görev henüz tamamlanmadı', 'err')
    }
  }
}
