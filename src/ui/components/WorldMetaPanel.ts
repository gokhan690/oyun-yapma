import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { t } from '../../i18n'
import { EXPANSION_CITIES, canUnlockCity } from '../../game/ExpansionMap'
import { TORPIL_CONTACTS, torpilRelationScore } from '../../game/TorpilNetwork'
import { gameDay } from '../../game/GameClock'
import {
  attitudeLabel,
  isRivalUnlocked,
  mergeRivalCost,
  nextLockedRivalDef,
  personalityLabel,
  playerSectorShare,
  rivalSectorPressure,
  sectorConflict,
  type RivalFamilyDef,
  type RivalFamilyState,
} from '../../game/Rivals'
import { mechanicForVictory } from '../../game/VictoryUnlocks'
import { reputationLabel } from '../../game/Reputation'
import { currentWorldStage, nextWorldStage, worldStageProgress } from '../../game/WorldStage'
import { VICTORY_DEFS, victoryProgress } from '../../game/VictoryConditions'
import type { ChronicleEntry } from '../../game/Chronicle'

export class WorldMetaPanel {
  readonly root: HTMLElement
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-section world-meta-section'
  }

  render(): void {
    this.root.replaceChildren()
    this.renderReputation()
    this.renderTorpilNetwork()
    this.renderVictories()
    this.renderExpansionMap()
    this.renderRivals()
    this.renderGazette()
    this.renderWorldStage()
    this.renderPlayerTitle()
    this.renderBaronHistory()
    this.renderChronicle()
  }

  private renderReputation(): void {
    const block = document.createElement('div')
    block.className = 'meta-block reputation-block'
    const rep = this.state.reputation
    block.innerHTML = `
      <h3>${t('world_reputation')} · ${reputationLabel(rep)}</h3>
      <div class="reputation-bar-wrap">
        <div class="reputation-bar"><div class="reputation-fill" style="width:${rep}%"></div></div>
        <span>${rep}/100</span>
      </div>
      <p class="meta-hint">${t('world_rep_hint')}</p>
    `
    this.root.appendChild(block)
  }

  private renderGazette(): void {
    const headlines = this.state.latestGazetteHeadlines(8)
    if (headlines.length === 0) return
    const block = document.createElement('div')
    block.className = 'meta-block gazette-block'
    block.innerHTML = `<h3>${t('world_gazette')}</h3>`
    const list = document.createElement('ul')
    list.className = 'gazette-list'
    const categoryIcons: Record<string, string> = {
      player: '👑', rival: '⚔️', market: '📈', politics: '🎖️', crisis: '⚠️', calendar: '📅',
    }
    for (const h of headlines) {
      const li = document.createElement('li')
      li.className = `gazette-item gazette-${h.category}`
      const icon = document.createElement('span')
      icon.className = 'gazette-icon'
      icon.textContent = categoryIcons[h.category] ?? '📰'
      const text = document.createElement('span')
      text.textContent = h.headline
      li.append(icon, text)
      list.appendChild(li)
    }
    block.appendChild(list)
    this.root.appendChild(block)
  }

  private renderPlayerTitle(): void {
    const title = this.state.playerTitle()
    const block = document.createElement('div')
    block.className = 'meta-block title-block'
    block.innerHTML = `<h3>${title.emoji} ${t('world_title_label')} ${title.label}</h3><p class="meta-hint">${t('world_gazette_style')}</p>`
    this.root.appendChild(block)
  }

  private renderWorldStage(): void {
    const nw = this.state.financeNetWorth()
    const stage = currentWorldStage(nw)
    const next = nextWorldStage(nw)
    const pct = worldStageProgress(nw)
    const block = document.createElement('div')
    block.className = 'meta-block world-stage-block'
    block.innerHTML = `
      <h3>${stage.emoji} Dünya · ${stage.name}</h3>
      <p class="meta-headline">${stage.headline}</p>
      <p class="meta-threat">${t('world_threat')}: ${stage.threat}</p>
      ${next ? `<div class="progress-bar meta-progress"><div class="progress-fill" style="width:${pct}%"></div></div><small>${t('world_next_rival').replace('{val}', next.name + ' · ' + formatMoney(next.minNetWorth))}</small>` : `<small>${t('rank_max')}</small>`}
    `
    this.root.appendChild(block)
  }

  private renderVictories(): void {
    const block = document.createElement('div')
    block.className = 'meta-block victories-block'
    const h = document.createElement('h3')
    h.textContent = t('world_victory')
    block.appendChild(h)
    const grid = document.createElement('div')
    grid.className = 'victory-grid'
    const ctx = this.state.victoryContext()
    for (const v of VICTORY_DEFS) {
      const done = this.state.victoriesUnlocked.includes(v.id)
      const pct = victoryProgress(ctx, v.id)
      const card = document.createElement('div')
      card.className = `victory-card${done ? ' victory-done' : ''}`
      card.innerHTML = `
        <span class="victory-emoji">${v.emoji}</span>
        <strong>${v.name}</strong>
        <small>${v.description}</small>
        <div class="progress-bar victory-progress"><div class="progress-fill" style="width:${done ? 100 : pct}%"></div></div>
        <span class="victory-pct">${done ? `✓ ${mechanicForVictory(v.id).title} açık` : `%${Math.floor(pct)}`}</span>
      `
      grid.appendChild(card)
    }
    block.appendChild(grid)
    this.root.appendChild(block)
  }

  private renderRivals(): void {
    const block = document.createElement('div')
    block.className = 'meta-block rivals-block'
    const h = document.createElement('h3')
    h.textContent = t('world_rivals')
    block.appendChild(h)
    const list = document.createElement('div')
    list.className = 'rival-list'
    for (const rival of this.state.rivals.filter((r) => isRivalUnlocked(r.id, this.state.totalEarned))) {
      list.appendChild(this.rivalCard(rival))
    }
    const next = nextLockedRivalDef(this.state.totalEarned)
    if (next) list.appendChild(this.lockedRivalCard(next))
    block.appendChild(list)
    this.root.appendChild(block)
  }

  private lockedRivalCard(def: RivalFamilyDef): HTMLElement {
    const card = document.createElement('div')
    card.className = 'rival-card rival-locked'
    card.innerHTML = `
      <div class="rival-head">
        <span>${def.emoji}</span>
        <strong>${def.name}</strong>
        <span class="rival-attitude">Kilitli</span>
      </div>
      <small>${def.stageLabel} · ${formatMoney(def.minPlayerEarned)} toplam kazançta açılır</small>
    `
    return card
  }

  private rivalCard(rival: RivalFamilyState): HTMLElement {
    const card = document.createElement('div')
    card.className = `rival-card rival-${rival.relation}`
    const sectors = rival.sectorFocus.map((s) => {
      const share = playerSectorShare(this.state.producers, s)
      const pressure = rivalSectorPressure(rival, s)
      const conflict = sectorConflict(share, pressure)
      return `${s}${conflict !== 'none' ? ' ⚡' : ''}`
    }).join(', ')
    card.innerHTML = `
      <div class="rival-head">
        <span>${rival.emoji}</span>
        <strong>${rival.name}</strong>
        <span class="rival-attitude">${attitudeLabel(rival.attitude)}</span>
      </div>
      <small>${t('world_value_label')} ${formatMoney(rival.netWorth)} · ${personalityLabel(rival.personality)}</small>
      <small>${t('world_sectors_label')} ${sectors}</small>
    `
    if (rival.relation !== 'merged') {
      const actions = document.createElement('div')
      actions.className = 'rival-actions'
      const lobby = document.createElement('button')
      lobby.type = 'button'
      lobby.className = 'btn-sm btn-secondary'
      lobby.dataset.action = 'rival-lobby'
      lobby.dataset.id = rival.id
      lobby.textContent = t('world_lobby')
      const coop = document.createElement('button')
      coop.type = 'button'
      coop.className = 'btn-sm btn-secondary'
      coop.dataset.action = 'rival-coop'
      coop.dataset.id = rival.id
      coop.textContent = t('world_cooperate')
      const merge = document.createElement('button')
      merge.type = 'button'
      merge.className = 'btn-sm btn-primary'
      merge.dataset.action = 'rival-merge'
      merge.dataset.id = rival.id
      merge.textContent = `🛒 Satın Al (${formatMoney(mergeRivalCost(rival))})`
      merge.disabled = !this.state.canAfford(mergeRivalCost(rival))
      actions.append(lobby, coop, merge)
      card.appendChild(actions)
    } else {
      const badge = document.createElement('span')
      badge.className = 'rival-merged-badge'
      badge.textContent = t('world_merged')
      card.appendChild(badge)
    }
    return card
  }

  private cityPreview: string | null = null

  private getCityPerks(id: string): string[] {
    const perks: Record<string, string[]> = {
      istanbul: ['🏠 Tüm işletmeler aktif', '🎯 Başlangıç şehri', '🌉 Türkiye merkezi'],
      ankara: ['🏛️ Siyaset işletmeleri +15%', '⚖️ Hukuk bürosu bonusu', '🤝 Yeni rakip: Sabanoğlu ailesi', '🗺️ Türkiye geneli ağ'],
      izmir: ['🌊 Turizm & liman işletmeleri +20%', '✈️ Havayolu bağlantıları', '🤝 Yeni rakip: Koçak ailesi', '🏖️ Tatil köyü bonusu'],
      dubai: ['💎 Lüks işletmeler +35%', '🏨 Otel & resort bonusu', '🌍 Uluslararası ağ', '💰 Offshore fırsatları'],
      london: ['🏦 Finans & borsa +40%', '🌐 Global franchise', '📈 Hedge fon premium', '👑 En prestijli adres'],
    }
    return perks[id] ?? []
  }

  private renderExpansionMap(): void {
    const block = document.createElement('div')
    block.className = 'meta-block expansion-block'
    block.innerHTML = `<h3>${t('world_expansion')}</h3>`
    const list = document.createElement('div')
    list.className = 'expansion-city-list'

    for (const c of EXPANSION_CITIES) {
      const unlocked = this.state.cities.unlocked.includes(c.id)
      const active = this.state.cities.activeCity === c.id
      const previewing = this.cityPreview === c.id

      const card = document.createElement('div')
      card.className = `expansion-city-card${active ? ' city-active' : ''}${unlocked ? ' city-unlocked' : ' city-locked'}`

      const row = document.createElement('div')
      row.className = 'expansion-city-row'
      let statusIcon = unlocked ? (active ? '✅' : '🔓') : '🔒'
      const costLabel = unlocked ? (active ? t('world_expansion_active') : '') : formatMoney(c.unlockCost)
      row.innerHTML = `<span class="city-row-name">${c.emoji} <strong>${c.label}</strong></span><span class="city-row-status">${statusIcon} ${costLabel}</span>`

      const previewBtn = document.createElement('button')
      previewBtn.type = 'button'
      previewBtn.className = 'btn-city-preview'
      previewBtn.textContent = previewing ? '▲' : 'ℹ️'
      previewBtn.title = 'Şehir detayları'
      previewBtn.addEventListener('click', () => {
        this.cityPreview = previewing ? null : c.id
        this.render()
        this.root.closest('.meta-panel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      })
      row.appendChild(previewBtn)

      if (unlocked && !active) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-sm btn-secondary'
        btn.dataset.action = 'set-active-city'
        btn.dataset.id = c.id
        btn.textContent = t('world_go')
        row.appendChild(btn)
      } else if (!unlocked) {
        const check = canUnlockCity(c.id, this.state.cities, this.state.money, this.state.reputation, this.state.ipoCount)
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `btn-sm ${check.ok ? 'btn-primary' : 'btn-secondary city-unlock-locked'}`
        btn.dataset.action = 'unlock-city'
        btn.dataset.id = c.id
        btn.textContent = check.ok ? t('world_open') : `🔒 ${t('world_open')}`
        btn.title = check.reason ?? ''
        row.appendChild(btn)
      }

      card.appendChild(row)

      if (previewing) {
        const preview = document.createElement('div')
        preview.className = 'city-preview-panel'
        const perks = this.getCityPerks(c.id)
        const reqParts: string[] = []
        if (c.unlockCost > 0) reqParts.push(`💰 ${formatMoney(c.unlockCost)}`)
        if (c.repReq > 0) reqParts.push(`⭐ İtibar min ${c.repReq}`)
        if (c.ipoReq > 0) reqParts.push(`🏦 ${c.ipoReq}+ IPO`)
        preview.innerHTML = `
          <div class="city-preview-title">${c.emoji} ${c.label} — ${unlocked ? '✅ Açık' : '🔒 Kilitli'}</div>
          ${reqParts.length ? `<div class="city-preview-req"><strong>Gereksinimler:</strong> ${reqParts.join(' · ')}</div>` : ''}
          <div class="city-preview-perks">
            ${perks.map((p) => `<div class="city-perk-row">${p}</div>`).join('')}
          </div>
        `
        card.appendChild(preview)
      }

      list.appendChild(card)
    }
    block.appendChild(list)
    this.root.appendChild(block)
  }

  private renderTorpilNetwork(): void {
    const block = document.createElement('div')
    block.className = 'meta-block torpil-block'
    block.innerHTML = `<h3>${t('world_torpil')}</h3>`
    const currentDay = gameDay(this.state.gameTimeMs)
    for (const def of TORPIL_CONTACTS) {
      const st = this.state.torpil.find((tp) => tp.id === def.id)
      const card = document.createElement('div')
      card.className = 'torpil-contact-card'
      const header = document.createElement('div')
      header.className = 'torpil-contact-header'
      header.innerHTML = `<span class="torpil-contact-emoji">${def.emoji}</span><div class="torpil-contact-info"><strong>${def.name}</strong><small>${def.role}</small></div>`
      card.appendChild(header)
      const desc = document.createElement('p')
      desc.className = 'torpil-contact-desc'
      desc.textContent = def.description
      card.appendChild(desc)
      if (st?.active) {
        const score = torpilRelationScore(st, def, currentDay)
        const daysLeft = st.giftDue
          ? 0
          : Math.max(0, Math.round((score - 10) / 90 * def.giftIntervalDays))

        const relationRow = document.createElement('div')
        relationRow.className = 'torpil-relation-row'
        const label = document.createElement('small')
        label.className = 'torpil-relation-label'
        label.textContent = t('world_torpil_relation').replace('{pct}', String(score))
        const bar = document.createElement('div')
        bar.className = 'torpil-relation-bar torpil-relation-bar-enhanced'
        const fill = document.createElement('div')
        fill.className = 'torpil-relation-fill'
        fill.style.width = `${score}%`
        fill.style.background = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--accent)' : '#ef4444'
        bar.appendChild(fill)
        for (const tick of [40, 70]) {
          const t2 = document.createElement('div')
          t2.className = 'torpil-bar-tick'
          t2.style.left = `${tick}%`
          bar.appendChild(t2)
        }
        relationRow.append(label, bar)
        card.appendChild(relationRow)

        const bonusMap: Record<string, string> = {
          amca_rifat: t('torpil_bonus_rifat'),
          sinan_bank: t('torpil_bonus_sinan'),
          siyaset_tanidik: t('torpil_bonus_siyaset'),
          medya_partner: t('torpil_bonus_medya'),
        }
        const bonusLabel = bonusMap[def.id] ?? t('world_torpil_active')
        const statusRow = document.createElement('div')
        statusRow.className = 'torpil-status-row'
        if (!st.giftDue && score >= 40) {
          const bonus = document.createElement('span')
          bonus.className = 'torpil-bonus-active'
          bonus.textContent = `✅ ${bonusLabel}`
          statusRow.appendChild(bonus)
        } else if (!st.giftDue) {
          const warn = document.createElement('span')
          warn.className = 'torpil-bonus-pending'
          warn.textContent = `⏳ ${bonusLabel} — ilişki zayıf`
          statusRow.appendChild(warn)
        }
        if (daysLeft > 0 && !st.giftDue) {
          const nextGift = document.createElement('span')
          nextGift.className = 'torpil-next-gift'
          nextGift.textContent = `🎁 ~${daysLeft} gün sonra hediye`
          statusRow.appendChild(nextGift)
        }
        card.appendChild(statusRow)
        if (st.giftDue) {
          const giftWarn = document.createElement('p')
          giftWarn.className = 'torpil-gift-warn'
          giftWarn.textContent = t('world_torpil_late')
          card.appendChild(giftWarn)
          const gift = document.createElement('button')
          gift.type = 'button'
          gift.className = 'btn-sm btn-secondary'
          gift.dataset.action = 'pay-torpil-gift'
          gift.dataset.id = def.id
          gift.textContent = `${t('world_torpil_gift')} ${formatMoney(def.giftCost)}`
          card.appendChild(gift)
        } else {
          const ok = document.createElement('span')
          ok.className = 'torpil-active'
          ok.textContent = t('world_torpil_active')
          card.appendChild(ok)
        }
      } else {
        const hire = document.createElement('button')
        hire.type = 'button'
        hire.className = 'btn-sm btn-primary'
        hire.dataset.action = 'hire-torpil'
        hire.dataset.id = def.id
        hire.textContent = `${t('world_torpil_meet')} ${formatMoney(def.hireCost)}`
        hire.disabled = !this.state.canAfford(def.hireCost)
        card.appendChild(hire)
      }
      block.appendChild(card)
    }
    this.root.appendChild(block)
  }

  private renderBaronHistory(): void {
    const summary = this.state.baronDynastySummary()
    const block = document.createElement('div')
    block.className = 'meta-block baron-history-block'
    const h = document.createElement('h3')
    h.textContent = t('world_dynasty_history')
    block.appendChild(h)
    const intro = document.createElement('p')
    intro.className = 'meta-hint'
    intro.textContent = summary.baronCount > 0
      ? t('world_baron_history_intro')
          .replace('{generations}', String(summary.generations))
          .replace('{baronCount}', String(summary.baronCount))
          .replace('{totalEarned}', formatMoney(summary.totalEarned))
      : t('dynasty_no_history')
    block.appendChild(intro)
    if (this.state.baronHistory.length > 0) {
      const scroll = document.createElement('div')
      scroll.className = 'baron-history-scroll'
      for (const b of [...this.state.baronHistory].reverse()) {
        const card = document.createElement('div')
        card.className = 'baron-history-card'
        const ach = b.achievements.slice(0, 3).map((a) => `<li>${a}</li>`).join('')
        const weak = b.weaknesses.slice(0, 2).map((w) => `<li class="baron-history-weak">${w}</li>`).join('')
        card.innerHTML = `
          <div class="baron-history-card-head">
            <strong>#${b.baronNumber} ${b.name}</strong>
            <small>${b.birthYear}–${b.deathYear} · ${b.yearsRuled} yıl · ${b.causeEmoji} ${b.causeLabel}</small>
          </div>
          <p class="baron-history-peak">Zirve: ${formatMoney(b.peakNetWorth)} · Kazanç: ${formatMoney(b.totalEarnedLife)}</p>
          <p class="baron-history-quote">"${b.epitaph}"</p>
          ${ach ? `<ul class="baron-history-ach">${ach}</ul>` : ''}
          ${weak ? `<ul class="baron-history-weak-list">${weak}</ul>` : ''}
        `
        scroll.appendChild(card)
      }
      block.appendChild(scroll)
    }
    this.root.appendChild(block)
  }

  private renderChronicle(): void {
    const block = document.createElement('div')
    block.className = 'meta-block chronicle-block'
    const h = document.createElement('h3')
    h.textContent = t('world_empire_history')
    block.appendChild(h)
    if (this.state.chronicle.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'meta-hint'
      empty.textContent = t('world_no_history')
      block.appendChild(empty)
    } else {
      const timeline = document.createElement('div')
      timeline.className = 'chronicle-timeline'
      for (const e of this.state.chronicle.slice(0, 20)) {
        timeline.appendChild(this.chronicleRow(e))
      }
      block.appendChild(timeline)
    }
    if (this.state.legacyMonuments.length > 0) {
      const mon = document.createElement('div')
      mon.className = 'legacy-monuments'
      mon.innerHTML = `<h4>🏙️ ${t('dynasty_monuments')} (${this.state.legacyMonuments.length})</h4>`
      const chips = document.createElement('div')
      chips.className = 'legacy-monument-chips'
      for (const m of this.state.legacyMonuments) {
        const chip = document.createElement('span')
        chip.className = 'legacy-chip'
        chip.textContent = `${m.emoji} ${m.producerName} · G${m.generation}`
        chips.appendChild(chip)
      }
      mon.appendChild(chips)
      block.appendChild(mon)
    }
    this.root.appendChild(block)
  }

  private chronicleRow(e: ChronicleEntry): HTMLElement {
    const row = document.createElement('div')
    row.className = `chronicle-row chronicle-${e.category}`
    row.innerHTML = `
      <span class="chronicle-emoji">${e.emoji}</span>
      <div>
        <strong>G${e.generation} · IPO ${e.ipoEra} · Gün ${e.gameDay}</strong>
        <p>${e.text}</p>
      </div>
    `
    return row
  }
}
