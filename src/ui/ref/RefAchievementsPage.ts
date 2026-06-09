import { ua, ringSvg, fmtMoney, refToast } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS } from '../../game/Achievements'
import type { MissionProgress } from '../../game/Missions'
import { SaveManager } from '../../security/SaveManager'

type TabKey = 'gorevler' | 'basarilar'
const TABS: { id: TabKey; label: string }[] = [
  { id: 'gorevler',  label: 'Görevler' },
  { id: 'basarilar', label: 'Başarılar' },
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
  private activeTab: TabKey = 'gorevler'
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
    // Geri + özet
    const top = document.createElement('div')
    top.className = 'ref-ach-top'
    this.countEl = document.createElement('span')
    this.countEl.className = 'ref-ach-count'
    this.countEl.textContent = this.achievementCountText()
    const backBtn = document.createElement('button')
    backBtn.className = 'ref-back-btn'
    backBtn.type = 'button'
    backBtn.textContent = '‹ Geri'
    backBtn.addEventListener('click', () => this.onBack?.())
    top.appendChild(backBtn)
    top.appendChild(this.countEl)
    this.el.appendChild(top)

    // Tamamlanma halkası
    const summary = document.createElement('div')
    summary.className = 'ref-ach-summary'
    this.ringEl = document.createElement('div')
    this.ringEl.className = 'ref-ach-ring'
    this.updateRing()
    summary.appendChild(this.ringEl)
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
    this.countEl.textContent = this.achievementCountText()
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
    if (this.activeTab === 'gorevler') {
      this.contentEl.innerHTML = this.renderMissions()
    } else {
      this.contentEl.innerHTML = this.renderAchievements()
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
    const cups: Record<string, string> = {
      done:   A.cupGold,
      active: A.cupSilver,
      locked: A.cupLocked,
    }
    return `<div class="ref-ach-grid">${ACHIEVEMENTS.map((a) => {
      const done = earned.has(a.id)
      const cup = done ? cups.done : cups.locked
      return `
        <div class="ref-ach-card ${done ? 'done' : 'locked'}">
          <img src="${ua(cup)}" alt="" class="ref-ach-cup">
          <div class="ref-ach-emoji">${a.emoji}</div>
          <div class="ref-ach-name">${a.name}</div>
          <div class="ref-ach-desc">${a.description}</div>
          <div class="ref-ach-reward">${done ? '✓' : `🎁 ${fmtMoney(a.reward)}`}</div>
          ${done ? '<div class="ref-ach-flag done">Kazanıldı</div>' : '<div class="ref-ach-flag locked">🔒</div>'}
        </div>`
    }).join('')}</div>`
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
