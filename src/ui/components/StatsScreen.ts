import type { GameState } from '../../game/GameState'
import { ACHIEVEMENTS } from '../../game/Achievements'
import { currentRank } from '../../game/PlayerRank'
import { PRODUCERS, formatMoney } from '../../game/Economy'
import type { Leaderboard } from '../../game/Leaderboard'
import { CodexPanel } from './CodexPanel'
import { DynastyPanel } from './DynastyPanel'
import { WorldMetaPanel } from './WorldMetaPanel'
import { BADGES, badgeDef } from '../../game/Badges'
import { SYNERGIES } from '../../game/Synergies'
import type { BaronSection } from './BaronSections'
import { BARON_SECTION_TITLES } from './BaronSections'
import { RIVAL_FAMILY_DEFS } from '../../game/Rivals'
import { t } from '../../i18n'

export class StatsScreen {
  readonly layer: HTMLElement
  private state: GameState
  private leaderboard: Leaderboard
  private content!: HTMLElement
  private codex: CodexPanel
  private dynasty: DynastyPanel
  private worldMeta: WorldMetaPanel
  private activeSection: Exclude<BaronSection, 'events'> = 'profile'

  constructor(state: GameState, leaderboard: Leaderboard) {
    this.state = state
    this.leaderboard = leaderboard
    this.codex = new CodexPanel()
    this.dynasty = new DynastyPanel(state)
    this.worldMeta = new WorldMetaPanel(state)
    this.layer = document.createElement('div')
    this.layer.className = 'slide-panel stats-panel'
    this.build()
  }

  private build(): void {
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.textContent = t('stats_title')
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

  renderSection(section: Exclude<BaronSection, 'events'> = this.activeSection): void {
    this.activeSection = section
    this.content.replaceChildren()
    const title = this.layer.querySelector('.panel-header h2')
    if (title) title.textContent = BARON_SECTION_TITLES[section]

    if (section === 'profile') {
      this.renderProfileHero()
      this.renderStats()
      this.renderAchievements()
      this.renderRivals()
      this.renderBadges()
      this.renderSynergyGuide()
      this.codex.render(this.state)
      this.content.appendChild(this.codex.root)
      this.renderIncomeSources()
      this.renderHistoryChart()
      this.renderFriendsSection()
      this.renderSubmitSection()
      void this.renderOnlineLeaderboard()
      return
    }

    if (section === 'dynasty') {
      this.dynasty.render()
      this.content.appendChild(this.dynasty.root)
      return
    }

    this.worldMeta.render()
    this.content.appendChild(this.worldMeta.root)
  }

  render(): void {
    this.renderSection(this.activeSection)
  }

  private renderProfileHero(): void {
    const rank = currentRank(this.state.lifetimeTotalEarned)
    const title = this.state.playerTitle()
    const hero = document.createElement('div')
    hero.className = 'baron-profile-hero'
    hero.innerHTML = `
      <div class="baron-profile-hero-top">
        <span class="baron-profile-hero-emoji">${title.emoji}</span>
        <div>
          <strong>${this.state.playerName.trim() || 'Baron'}</strong>
          <small>${title.label} · ${rank.emoji} ${rank.name}</small>
        </div>
      </div>
      <p class="baron-profile-hero-meta">Nesil ${this.state.dynasty.generation} · ${this.state.playerAge()} yaş · IPO ${this.state.ipoCount}</p>
    `
    const actions = document.createElement('div')
    actions.className = 'baron-profile-hero-actions'
    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.className = 'btn-secondary btn-sm'
    editBtn.dataset.action = 'open-settings'
    editBtn.textContent = t('stats_edit_profile')
    const dynastyBtn = document.createElement('button')
    dynastyBtn.type = 'button'
    dynastyBtn.className = 'btn-secondary btn-sm'
    dynastyBtn.dataset.action = 'baron-tab'
    dynastyBtn.dataset.id = 'dynasty'
    dynastyBtn.textContent = '👑 Hanedan'
    const shareBtn = document.createElement('button')
    shareBtn.type = 'button'
    shareBtn.className = 'btn-secondary btn-sm'
    shareBtn.textContent = '📤 Paylaş'
    shareBtn.addEventListener('click', () => {
      const { playerName, ipoCount, lifetimeTotalEarned, dynasty } = this.state
      const name = playerName.trim() || 'Baron'
      const text = [
        `🏆 İş İmparatorluğu`,
        `👤 ${name} — ${title.emoji} ${title.label}`,
        `💰 Ömür boyu kazanç: ${formatMoney(lifetimeTotalEarned)}`,
        `👑 ${rank.emoji} ${rank.name} · ${ipoCount} IPO · Nesil ${dynasty.generation}`,
        `📱 Kendi imparatorluğunu kur!`,
      ].join('\n')
      if (navigator.share) {
        void navigator.share({ text })
      } else {
        void navigator.clipboard.writeText(text).then(() => {
          shareBtn.textContent = '✅ Kopyalandı!'
          window.setTimeout(() => { shareBtn.textContent = '📤 Paylaş' }, 2000)
        })
      }
    })
    actions.append(editBtn, dynastyBtn, shareBtn)
    hero.appendChild(actions)
    this.content.appendChild(hero)
  }

  private renderSynergyGuide(): void {
    const section = document.createElement('div')
    section.className = 'stats-section synergy-guide-section'
    const h = document.createElement('h3')
    h.textContent = t('stats_synergy_guide')
    section.appendChild(h)
    const active = SYNERGIES.filter((s) => s.requires.every((id) => (this.state.producers[id] ?? 0) > 0))
    const meta = document.createElement('p')
    meta.className = 'meta-hint'
    meta.textContent = t('stats_synergy_count').replace('{active}', String(active.length)).replace('{total}', String(SYNERGIES.length))
    section.appendChild(meta)
    const list = document.createElement('div')
    list.className = 'synergy-guide-list'
    for (const s of SYNERGIES) {
      const ok = s.requires.every((id) => (this.state.producers[id] ?? 0) > 0)
      const row = document.createElement('div')
      row.className = `synergy-guide-row${ok ? ' synergy-active' : ''}`
      const names = s.requires.map((id) => {
        const p = PRODUCERS.find((x) => x.id === id)
        const owned = (this.state.producers[id] ?? 0) > 0
        return `${owned ? '✓' : '○'} ${p?.emoji ?? ''} ${p?.name ?? id}`
      }).join(' + ')
      row.innerHTML = `<strong>${s.name}</strong><small>${names}</small><span>+${Math.round(s.bonus * 100)}%</span>`
      list.appendChild(row)
    }
    section.appendChild(list)
    this.content.appendChild(section)
  }

  private renderBadges(): void {
    const section = document.createElement('div')
    section.className = 'stats-section badges-section'
    const title = document.createElement('h3')
    title.textContent = t('stats_badges')
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
    meta.textContent = t('stats_badge_count').replace('{earned}', String(earnedCount)).replace('{total}', String(BADGES.length))
    section.appendChild(meta)
    this.content.appendChild(section)
  }

  private renderStats(): void {
    const lb = this.leaderboard.getData()
    const rank = currentRank(this.state.lifetimeTotalEarned)
    const age = this.state.playerAge()
    const rows: [string, string][] = [
      [t('stats_baron'), this.state.playerName || 'Baron'],
      [t('stats_age'), `${age} · ~${this.state.estimatedYearsRemaining()} yıl`],
      [t('stats_rank'), `${rank.emoji} ${rank.name}`],
      [t('stats_wallet'), formatMoney(this.state.money)],
      [t('stats_run_earned'), formatMoney(this.state.totalEarned)],
      [t('stats_lifetime'), formatMoney(this.state.lifetimeTotalEarned)],
      [t('stats_clicks'), this.state.totalClicks.toLocaleString('tr-TR')],
      [t('stats_best_combo'), String(this.state.comboBest)],
      [t('stats_ipo_count'), String(this.state.ipoCount)],
      [t('stats_share_score'), String(Math.floor(this.state.prestigePoints))],
      [t('stats_playtime'), formatTime(this.state.playTimeMs)],
      [t('stats_achievements'), `${this.state.achievements.size}/${ACHIEVEMENTS.length}`],
      [t('stats_record_earn'), formatMoney(lb.bestLifetimeEarned)],
      [t('stats_record_combo'), String(lb.bestCombo)],
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
    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px'
    const title = document.createElement('h3')
    title.style.margin = '0'
    title.textContent = '🏆 Başarımlar'
    const countBadge = document.createElement('span')
    countBadge.style.cssText = 'font-size:0.75rem;color:var(--muted);font-weight:700'
    countBadge.textContent = `${this.state.achievements.size}/${ACHIEVEMENTS.length}`
    header.append(title, countBadge)
    section.appendChild(header)

    // Tamamlananlar önce, kilitliler sonra
    const allCategorized = new Set<string>()
    const gallery = document.createElement('div')
    gallery.className = 'achievements-gallery'

    // Tümünü düz göster — tamamlananlar önce
    const sorted = [...ACHIEVEMENTS].sort((a, b) => {
      const da = this.state.achievements.has(a.id) ? 1 : 0
      const db = this.state.achievements.has(b.id) ? 1 : 0
      return db - da
    })

    for (const a of sorted) {
      const done = this.state.achievements.has(a.id)
      const badge = document.createElement('div')
      badge.className = `ach-badge${done ? ' earned' : ''}`
      badge.title = `${a.name}: ${a.description}${done ? ` · Ödül: ${formatMoney(a.reward)}` : ''}`
      badge.innerHTML = `
        <span class="ach-badge-emoji">${done ? a.emoji : '🔒'}</span>
        <span class="ach-badge-name">${done ? a.name : '???'}</span>
        ${!done ? '<span class="ach-badge-lock">🔒</span>' : ''}
      `
      gallery.appendChild(badge)
      allCategorized.add(a.id)
    }

    section.appendChild(gallery)
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

  private renderRivals(): void {
    const rivalStates = this.state.rivals ?? []
    if (rivalStates.length === 0) return
    const section = document.createElement('div')
    section.className = 'stats-section'
    const title = document.createElement('div')
    title.className = 'stats-section-title'
    title.textContent = '⚔️ Rakip Aileler'
    section.appendChild(title)
    const panel = document.createElement('div')
    panel.className = 'rivals-panel'
    for (const rs of rivalStates) {
      const def = RIVAL_FAMILY_DEFS.find(d => d.id === rs.id)
      if (!def) continue
      const playerWorth = this.state.financeNetWorth()
      const diff = rs.netWorth - playerWorth
      const threatLevel = diff > 2_000_000 ? 'high' : diff > 0 ? 'med' : 'low'
      const threatPct = Math.min(100, Math.max(0, 50 + (diff / Math.max(1, playerWorth)) * 50))
      const card = document.createElement('div')
      card.className = `rival-card threat-${threatLevel}`

      // Relation badges
      const relationBadge = rs.relation === 'merged'
        ? '<span class="rival-relation-badge merged">🤝 Birleşme</span>'
        : rs.relation === 'bankrupt'
          ? '<span class="rival-relation-badge bankrupt">💀 İflas</span>'
          : ''

      // NetWorth warning badge
      const aheadBadge = rs.netWorth > playerWorth
        ? '<span class="rival-ahead-badge">⚠️</span>'
        : ''

      const sectorTags = def.sectorFocus
        .map(s => `<span class="rival-sector-tag">${s}</span>`)
        .join('')

      card.innerHTML = `
        <span class="rival-emoji">🏦</span>
        <div class="rival-info">
          <div class="rival-name-row">
            <span class="rival-name">${def.name}</span>
            ${relationBadge}
            ${aheadBadge}
          </div>
          <div class="rival-worth">💰 ${formatMoney(rs.netWorth)}</div>
          <div class="rival-sector-tags">${sectorTags}</div>
          <div class="rival-threat-bar-wrap">
            <div class="rival-threat-bar">
              <div class="rival-threat-bar-fill threat-${threatLevel}" style="width:${threatPct.toFixed(0)}%"></div>
            </div>
            <span class="rival-threat-label">${threatLevel === 'high' ? 'Tehlikeli' : threatLevel === 'med' ? 'Rekabetçi' : 'Geride'}</span>
          </div>
        </div>
      `
      if (rs.relation === 'bankrupt') {
        const acquireCost = Math.max(50_000, Math.floor(rs.netWorth * 0.4))
        const acquireBtn = document.createElement('button')
        acquireBtn.type = 'button'
        acquireBtn.className = 'btn-sm btn-primary rival-acquire-btn'
        acquireBtn.dataset.action = 'rival-acquire'
        acquireBtn.dataset.id = rs.id
        acquireBtn.textContent = `🏴 Satın Al · ${formatMoney(acquireCost)}`
        acquireBtn.disabled = !this.state.canAfford(acquireCost)
        acquireBtn.title = 'İflas eden rakibin varlıklarını ucuza al — itibar +10'
        card.appendChild(acquireBtn)
      }
      panel.appendChild(card)
    }
    section.appendChild(panel)
    this.content.appendChild(section)
  }

  private embedded = false

  embedIn(parent: HTMLElement): void {
    this.embedded = true
    this.layer.classList.add('stats-embedded')
    parent.appendChild(this.layer)
    const title = this.layer.querySelector('.panel-header h2')
    if (title) title.textContent = 'Baron Profili'
    const close = this.layer.querySelector('[data-action="nav-view"]') as HTMLButtonElement | null
    if (close) close.hidden = true
  }

  setEmbeddedVisible(visible: boolean): void {
    if (!this.embedded) return
    this.layer.hidden = !visible
    if (visible) this.layer.classList.remove('is-open')
  }

  isEmbedded(): boolean {
    return this.embedded
  }

  show(section?: Exclude<BaronSection, 'events'>): void {
    if (section) this.activeSection = section
    this.renderSection(this.activeSection)
    if (this.embedded) {
      this.layer.hidden = false
    } else {
      this.layer.classList.add('is-open')
    }
  }

  hide(): void {
    if (this.embedded) {
      this.layer.hidden = true
    } else {
      this.layer.classList.remove('is-open')
    }
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
