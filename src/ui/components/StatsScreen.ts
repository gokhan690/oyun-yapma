import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS } from '../../game/Achievements'
import { currentRank } from '../../game/PlayerRank'
import { PRODUCERS, formatMoney } from '../../game/Economy'
import type { Leaderboard } from '../../game/Leaderboard'
import { CodexPanel } from './CodexPanel'
import { DynastyPanel } from './DynastyPanel'
import { BADGES, badgeDef } from '../../game/Badges'

export class StatsScreen {
  readonly layer: HTMLElement
  private state: GameState
  private leaderboard: Leaderboard
  private content!: HTMLElement
  private codex: CodexPanel
  private dynasty: DynastyPanel

  constructor(state: GameState, leaderboard: Leaderboard) {
    this.state = state
    this.leaderboard = leaderboard
    this.codex = new CodexPanel()
    this.dynasty = new DynastyPanel(state)
    this.layer = document.createElement('div')
    this.layer.className = 'slide-panel stats-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.textContent = 'İstatistikler'
    const settingsBtn = document.createElement('button')
    settingsBtn.type = 'button'
    settingsBtn.className = 'icon-btn'
    settingsBtn.dataset.action = 'open-settings'
    settingsBtn.textContent = '⚙️'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'icon-btn'
    close.dataset.action = 'nav-view'
    close.dataset.id = 'earn'
    close.textContent = '✕'
    header.append(title, settingsBtn, close)
    this.content = document.createElement('div')
    this.content.className = 'panel-body'
    this.layer.append(header, this.content)
  }

  render(): void {
    this.content.replaceChildren()
    this.dynasty.render()
    this.content.appendChild(this.dynasty.root)
    this.renderStats()
    this.renderAchievements()
    this.renderBadges()
    this.codex.render(this.state)
    this.content.appendChild(this.codex.root)
    this.renderIncomeSources()
    this.renderHistoryChart()
    this.renderFriendsSection()
    this.renderSubmitSection()
    void this.renderOnlineLeaderboard()
  }

  private renderBadges(): void {
    const section = document.createElement('div')
    section.className = 'stats-section badges-section'
    const title = document.createElement('h3')
    title.textContent = 'Rozetler'
    section.appendChild(title)
    const grid = document.createElement('div')
    grid.className = 'badges-grid'
    for (const b of BADGES) {
      const earned = this.state.earnedBadges.has(b.id)
      const cell = document.createElement('div')
      cell.className = `badge-cell${earned ? ' earned' : ''}`
      cell.title = b.description
      cell.innerHTML = `<span class="badge-emoji">${earned ? b.emoji : '🔒'}</span><small>${earned ? b.name : '???'}</small>`
      grid.appendChild(cell)
    }
    section.appendChild(grid)
    const earnedCount = [...this.state.earnedBadges].filter((id) => badgeDef(id)).length
    const meta = document.createElement('p')
    meta.className = 'badges-meta'
    meta.textContent = `${earnedCount}/${BADGES.length} rozet`
    section.appendChild(meta)
    this.content.appendChild(section)
  }

  private renderStats(): void {
    const lb = this.leaderboard.getData()
    const rank = currentRank(this.state.lifetimeTotalEarned)
    const age = this.state.playerAge()
    const rows: [string, string][] = [
      ['Baron', this.state.playerName || 'Baron'],
      ['Yaş', `${age} · ~${this.state.estimatedYearsRemaining()} yıl`],
      ['Rütbe', `${rank.emoji} ${rank.name}`],
      ['Cüzdan', formatMoney(this.state.money)],
      ['Toplam kazanç (run)', formatMoney(this.state.totalEarned)],
      ['Yaşam boyu kazanç', formatMoney(this.state.lifetimeTotalEarned)],
      ['Tıklama', this.state.totalClicks.toLocaleString('tr-TR')],
      ['En iyi combo', String(this.state.comboBest)],
      ['IPO sayısı', String(this.state.ipoCount)],
      ['Hisse puanı', String(Math.floor(this.state.prestigePoints))],
      ['Oyun süresi', formatTime(this.state.playTimeMs)],
      ['Başarım', `${this.state.achievements.size}/${ACHIEVEMENTS.length}`],
      ['Rekor kazanç', formatMoney(lb.bestLifetimeEarned)],
      ['Rekor combo', String(lb.bestCombo)],
    ]

    const section = document.createElement('div')
    section.className = 'stats-section'
    for (const [label, val] of rows) {
      const row = document.createElement('div')
      row.className = 'stat-row'
      const l = document.createElement('span')
      l.textContent = label
      const v = document.createElement('strong')
      v.textContent = val
      row.append(l, v)
      section.appendChild(row)
    }

    // Başarım progress bar
    const achPct = Math.round((this.state.achievements.size / ACHIEVEMENTS.length) * 100)
    const achBar = document.createElement('div')
    achBar.className = 'stats-progress-wrap'
    achBar.innerHTML = `<div class="stats-progress-label">Başarım İlerlemesi <span>${achPct}%</span></div><div class="stats-progress-track"><div class="stats-progress-fill" style="width:${achPct}%"></div></div>`
    section.appendChild(achBar)

    this.content.appendChild(section)
  }

  private renderAchievements(): void {
    const section = document.createElement('div')
    section.className = 'stats-section achievements-section'
    const title = document.createElement('h3')
    title.textContent = 'Başarımlar'
    section.appendChild(title)
    const grid = document.createElement('div')
    grid.className = 'achieve-grid profile-achieve-grid'
    for (const a of ACHIEVEMENTS) {
      const done = this.state.achievements.has(a.id)
      const cell = document.createElement('div')
      cell.className = `achieve-cell achieve-cell-profile${done ? ' done' : ''}`
      cell.title = `${a.name}: ${a.description}${done ? ` · Ödül: ${formatMoney(a.reward)}` : ''}`
      cell.innerHTML = `
        <span class="achieve-cell-emoji">${done ? a.emoji : '🔒'}</span>
        <span class="achieve-cell-name">${done ? a.name : 'Gizli'}</span>
        <small class="achieve-cell-desc">${done ? a.description : '???'}</small>
      `
      grid.appendChild(cell)
    }
    section.appendChild(grid)
    this.content.appendChild(section)
  }

  private renderIncomeSources(): void {
    const total = this.state.incomePerDay()
    if (total <= 0) return

    const section = document.createElement('div')
    section.className = 'stats-section'
    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '💰 Gelir Kaynakları'
    section.appendChild(title)

    const items = PRODUCERS
      .map(def => ({ def, income: this.state.producerIncome(def) }))
      .filter(item => item.income > 0)
      .sort((a, b) => b.income - a.income)

    for (const { def, income } of items) {
      const pct = (income / total) * 100
      const row = document.createElement('div')
      row.className = 'income-source-row'
      const label = document.createElement('div')
      label.className = 'income-source-label'
      label.textContent = `${def.emoji} ${def.name}`
      const track = document.createElement('div')
      track.className = 'income-source-track'
      const fill = document.createElement('div')
      fill.className = 'income-source-fill'
      fill.style.width = `${pct}%`
      track.appendChild(fill)
      const pctEl = document.createElement('span')
      pctEl.className = 'income-source-pct'
      pctEl.textContent = `${pct.toFixed(1)}%`
      row.append(label, track, pctEl)
      section.appendChild(row)
    }
    this.content.appendChild(section)
  }

  private renderHistoryChart(): void {
    const history = this.leaderboard.getData().history
    if (history.length < 2) return

    const section = document.createElement('div')
    section.className = 'stats-section'
    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '📈 Kişisel Rekor Geçmişi'
    section.appendChild(title)

    const values = [...history].reverse().map(e => e.lifetimeEarned)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const w = 280
    const h = 60
    const step = w / (values.length - 1)

    const points = values
      .map((v, i) => {
        const x = i * step
        const y = h - ((v - min) / range) * (h - 8) - 4
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

    const areaPoints = `${points} L${w},${h} L0,${h} Z`

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute('class', 'stats-sparkline')

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    grad.id = 'stats-grad'
    grad.setAttribute('x1', '0')
    grad.setAttribute('y1', '0')
    grad.setAttribute('x2', '0')
    grad.setAttribute('y2', '1')
    grad.innerHTML = `<stop offset="0%" stop-color="#fbbf24" stop-opacity="0.4"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>`
    defs.appendChild(grad)
    svg.appendChild(defs)

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    area.setAttribute('d', areaPoints)
    area.setAttribute('fill', 'url(#stats-grad)')
    svg.appendChild(area)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    line.setAttribute('d', points)
    line.setAttribute('class', 'stats-sparkline-path')
    svg.appendChild(line)

    // Nokta işaretçiler
    values.forEach((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * (h - 8) - 4
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      dot.setAttribute('cx', x.toFixed(1))
      dot.setAttribute('cy', y.toFixed(1))
      dot.setAttribute('r', '3')
      dot.setAttribute('class', 'stats-sparkline-dot')
      svg.appendChild(dot)
    })

    const labels = document.createElement('div')
    labels.className = 'stats-chart-labels'
    labels.innerHTML = `<span>${formatMoney(min)}</span><span>${formatMoney(max)}</span>`

    section.append(svg, labels)
    this.content.appendChild(section)
  }

  private renderFriendsSection(): void {
    const section = document.createElement('div')
    section.className = 'stats-section stats-friends-section'

    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '👥 Arkadaş Sıralaması'

    const codeRow = document.createElement('div')
    codeRow.className = 'stats-friend-code-row'
    codeRow.innerHTML = `
      <div><small>Senin kodun</small><strong>${this.leaderboard.getFriendCode()}</strong></div>
      <button type="button" class="btn-secondary btn-sm" data-copy-friend-code>Kopyala</button>
    `
    codeRow.querySelector('[data-copy-friend-code]')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.leaderboard.getFriendCode())
      } catch {
        // ignore
      }
    })

    const addRow = document.createElement('div')
    addRow.className = 'stats-submit-row'
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 8
    input.placeholder = 'Arkadaş kodu'
    input.className = 'stats-name-input'
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'btn-primary stats-submit-btn'
    addBtn.textContent = 'Ekle'
    addBtn.addEventListener('click', async () => {
      const code = input.value.trim()
      if (!code) return
      const lookup = await this.leaderboard.lookupFriendCode(code)
      const result = this.leaderboard.addFriendByCode(code)
      addBtn.textContent = result.ok ? '✓' : '✗'
      if (result.ok && lookup) {
        input.value = ''
        const list = section.querySelector('.stats-friends-list')
        if (list) list.remove()
        void this.renderFriendsList(section)
      }
      window.setTimeout(() => { addBtn.textContent = 'Ekle' }, 1200)
    })
    addRow.append(input, addBtn)

    section.append(title, codeRow, addRow)
    this.content.appendChild(section)
    void this.renderFriendsList(section)
  }

  private async renderFriendsList(section: HTMLElement): Promise<void> {
    section.querySelector('.stats-friends-list')?.remove()
    const friends = this.leaderboard.getFriends()
    const list = document.createElement('div')
    list.className = 'stats-friends-list'

    if (friends.length === 0) {
      list.innerHTML = '<p class="stats-empty">Arkadaş kodu ekle — birlikte yarışın!</p>'
      section.appendChild(list)
      return
    }

    const scores = await this.leaderboard.fetchFriendScores()
    const scoreMap = new Map(scores.map((s) => [s.friend_code?.toUpperCase(), s]))

    for (const code of friends) {
      const row = document.createElement('div')
      row.className = 'lb-row'
      const score = scoreMap.get(code.toUpperCase())
      row.innerHTML = `
        <span class="lb-rank">👤</span>
        <span class="lb-name">${score?.player_name ?? code}</span>
        <span class="lb-val">${score ? formatMoney(score.lifetime_earned) : '—'}</span>
        <button type="button" class="icon-btn btn-sm" data-remove-friend="${code}">✕</button>
      `
      row.querySelector('[data-remove-friend]')?.addEventListener('click', () => {
        this.leaderboard.removeFriend(code)
        void this.renderFriendsList(section)
      })
      list.appendChild(row)
    }
    section.appendChild(list)
  }

  private renderSubmitSection(): void {
    const section = document.createElement('div')
    section.className = 'stats-section stats-submit-section'

    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '🌍 Global Sıralamaya Katıl'

    const row = document.createElement('div')
    row.className = 'stats-submit-row'

    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 20
    input.placeholder = 'İsmin'
    input.className = 'stats-name-input'
    input.value = this.leaderboard.getPlayerName()

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-primary stats-submit-btn'
    btn.textContent = 'Gönder'

    btn.addEventListener('click', async () => {
      const name = input.value.trim() || 'Anonim'
      this.leaderboard.setPlayerName(name)
      this.leaderboard.update({
        lifetimeEarned: this.state.lifetimeTotalEarned,
        comboBest: this.state.comboBest,
        ipoCount: this.state.ipoCount,
      })
      btn.disabled = true
      btn.textContent = '⏳'
      const ok = await this.leaderboard.submitScore({
        lifetimeEarned: this.state.lifetimeTotalEarned,
        comboBest: this.state.comboBest,
        ipoCount: this.state.ipoCount,
      })
      btn.textContent = ok ? '✅ Gönderildi!' : '❌ Hata'
      if (ok) {
        window.setTimeout(() => {
          const lb = this.content.querySelector('.stats-online-section')
          if (lb) lb.remove()
          void this.renderOnlineLeaderboard()
        }, 800)
      }
    })

    row.append(input, btn)
    section.append(title, row)
    this.content.appendChild(section)
  }

  private async renderOnlineLeaderboard(): Promise<void> {
    const section = document.createElement('div')
    section.className = 'stats-section stats-online-section'

    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '🏆 Top 10 Global'

    const loading = document.createElement('div')
    loading.className = 'stats-loading'
    loading.textContent = 'Yükleniyor...'

    section.append(title, loading)
    this.content.appendChild(section)

    const scores = await this.leaderboard.fetchOnlineScores(10)
    loading.remove()

    if (scores.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'stats-empty'
      empty.textContent = 'Henüz skor yok — ilk sen ol!'
      section.appendChild(empty)
      return
    }

    const myName = this.leaderboard.getPlayerName()
    for (const [i, score] of scores.entries()) {
      const row = document.createElement('div')
      const isMe = score.player_name === myName
      row.className = `lb-row${isMe ? ' lb-row-me' : ''}`

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      const rank = document.createElement('span')
      rank.className = 'lb-rank'
      rank.textContent = medal

      const name = document.createElement('span')
      name.className = 'lb-name'
      name.textContent = score.player_name

      const val = document.createElement('span')
      val.className = 'lb-val'
      val.textContent = formatMoney(score.lifetime_earned)

      const sub = document.createElement('span')
      sub.className = 'lb-sub'
      sub.textContent = `${score.ipo_count} IPO`

      row.append(rank, name, val, sub)
      section.appendChild(row)
    }
  }

  show(): void {
    this.render()
    this.layer.classList.add('is-open')
  }

  hide(): void {
    this.layer.classList.remove('is-open')
  }

  toggle(): void {
    if (this.layer.classList.contains('is-open')) this.hide()
    else this.show()
  }
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}s ${m % 60}dk`
  return `${m}dk ${sec % 60}sn`
}
