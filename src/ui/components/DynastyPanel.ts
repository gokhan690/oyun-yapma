import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { gameDay } from '../../game/GameClock'
import { spouseOptionsForPlayer, PLAYER_LIFESPAN, CHILD_CAREERS, childCareerDef, type ChildRecord } from '../../game/Dynasty'
import { t } from '../../i18n'

function traitLabel(trait: string): string {
  const map: Record<string, string> = {
    merchant: t('dynasty_trait_merchant'),
    diplomat: t('dynasty_trait_diplomat'),
    innovator: t('dynasty_trait_innovator'),
    risk_taker: t('dynasty_trait_risktaker'),
  }
  return map[trait] ?? trait
}

export class DynastyPanel {
  readonly root: HTMLElement
  private state: GameState

  constructor(state: GameState) {
    this.state = state
    this.root = document.createElement('div')
    this.root.className = 'stats-section dynasty-section'
  }

  render(): void {
    this.root.replaceChildren()

    if (this.state.dynasty.generation > 1 || this.state.dynasty.children.length > 0) {
      const legacy = document.createElement('div')
      legacy.className = 'dynasty-legacy-banner'
      legacy.innerHTML = `
        <strong>${t('dynasty_gen_banner').replace('{n}', String(this.state.dynasty.generation))}</strong>
        <p>${t('dynasty_gen_desc')}</p>
      `
      this.root.appendChild(legacy)
    }

    const title = document.createElement('h3')
    title.textContent = t('dynasty_family_title').replace('{n}', String(this.state.dynasty.generation))
    this.root.appendChild(title)

    const age = this.state.playerAge()
    const estYears = this.state.estimatedYearsRemaining()
    const ageBar = document.createElement('div')
    ageBar.className = 'dynasty-age-bar'
    const pct = Math.min(100, (age / PLAYER_LIFESPAN) * 100)
    const estLabel = estYears < 99 ? `~${estYears} yıl tahmini` : t('dynasty_long_life')
    ageBar.innerHTML = `
      <label><span>${this.state.playerName} · ${age} yaş</span><span>${estLabel}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${pct}%"></div></div>
    `
    this.root.appendChild(ageBar)

    this.renderMortalityRisks()

    const crises = this.state.childCrises
    if (crises.length > 0) {
      const warn = document.createElement('div')
      warn.className = 'dynasty-crisis-banner'
      warn.innerHTML = `<strong>${t('dynasty_crisis_title')}</strong>`
      const list = document.createElement('ul')
      for (const c of crises) {
        const child = this.state.dynasty.children.find((ch) => ch.id === c.childId)
        if (!child) continue
        const li = document.createElement('li')
        const labels: Record<string, string> = {
          gambler: t('dynasty_crisis_gambler'),
          illegal: t('dynasty_crisis_illegal'),
          scandal: t('dynasty_crisis_scandal'),
        }
        li.textContent = `${child.name}: ${labels[c.type]}`
        list.appendChild(li)
      }
      warn.appendChild(list)
      this.root.appendChild(warn)
    }

    if (this.state.hasPendingDeath()) {
      const death = this.state.dynasty.pendingDeath!
      const warn = document.createElement('p')
      warn.className = 'dynasty-lifespan-warn'
      const suffix = this.state.dynasty.children.length > 0
        ? t('dynasty_death_warn_heir')
        : t('dynasty_death_warn_continue')
      warn.textContent = `💀 Vefat: ${death.message} — ${suffix}`
      this.root.appendChild(warn)
    }

    const d = this.state.dynasty
    if (!d.spouseName) {
      this.renderMarriage()
    } else {
      this.renderFamily()
    }
  }

  private renderMarriage(): void {
    const p = document.createElement('p')
    p.className = 'dynasty-desc'
    p.textContent = this.state.playerGender === 'female'
      ? t('dynasty_marry_female')
      : t('dynasty_marry_male')
    this.root.appendChild(p)
    const grid = document.createElement('div')
    grid.className = 'dynasty-spouse-grid'
    for (const s of spouseOptionsForPlayer(this.state.playerGender)) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'dynasty-spouse-card'
      card.dataset.action = 'dynasty-marry'
      card.dataset.id = s.id
      card.innerHTML = `
        <span class="dynasty-spouse-emoji">${s.emoji}</span>
        <strong>${s.name}</strong>
        <small>${s.bonusLabel}</small>
        <small class="dynasty-cost">${formatMoney(s.cost)}</small>
      `
      card.disabled = !this.state.canAfford(s.cost)
      grid.appendChild(card)
    }
    this.root.appendChild(grid)
  }

  private renderFamily(): void {
    const d = this.state.dynasty
    const spouse = document.createElement('p')
    spouse.className = 'dynasty-spouse-line'
    spouse.textContent = `${t('dynasty_spouse_label')} ${d.spouseName} · ${traitLabel(d.spouseTrait ?? '')}`
    this.root.appendChild(spouse)

    // Eş memnuniyeti barı + hediye butonu
    const sat = Math.round(d.spouseSatisfaction ?? 70)
    const satRow = document.createElement('div')
    satRow.className = 'spouse-satisfaction-row'
    const satColor = sat >= 80 ? '#5ee0a0' : sat >= 50 ? '#72b7ff' : sat >= 30 ? '#f8b84e' : '#f87171'
    const satLabel = sat >= 80 ? 'Çok Mutlu (+%50 trait bonusu)' : sat >= 50 ? 'Mutlu' : sat >= 30 ? 'Huzursuz' : 'Kritik!'
    satRow.innerHTML = `
      <label><span>💕 Eş Memnuniyeti</span><span>${satLabel} · %${sat}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${sat}%;background:${satColor}"></div></div>
    `
    this.root.appendChild(satRow)
    const giftBtn = document.createElement('button')
    giftBtn.type = 'button'
    giftBtn.className = 'btn-sm btn-secondary spouse-gift-btn'
    giftBtn.dataset.action = 'spouse-gift'
    giftBtn.textContent = `🎁 Hediye ver (${formatMoney(50_000)}) · +20 memnuniyet`
    giftBtn.disabled = !this.state.canAfford(50_000)
    this.root.appendChild(giftBtn)

    const kidsTitle = document.createElement('h4')
    kidsTitle.textContent = `${t('dynasty_children_label')} (${d.children.length}/3)`
    this.root.appendChild(kidsTitle)

    if (d.children.length === 0) {
      const wait = document.createElement('p')
      wait.className = 'dynasty-desc'
      const day = gameDay(this.state.gameTimeMs)
      const married = d.marriedGameDay ?? day
      wait.textContent = day - married < 5
        ? t('dynasty_wait_early')
        : t('dynasty_wait_soon')
      this.root.appendChild(wait)
    } else {
      const list = document.createElement('div')
      list.className = 'dynasty-children'
      for (const c of d.children) {
        list.appendChild(this.childCard(c))
      }
      this.root.appendChild(list)
    }

    if (d.children.length > 0) {
      const hint = document.createElement('p')
      hint.className = 'dynasty-desc'
      hint.textContent = this.state.needsSuccession()
        ? t('dynasty_death_choose')
        : t('dynasty_heir_hint')
      this.root.appendChild(hint)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `btn-primary dynasty-succession-btn${this.state.needsSuccession() ? ' btn-urgent' : ''}`
      btn.dataset.action = 'dynasty-succession-open'
      btn.textContent = this.state.needsSuccession() ? t('dynasty_succession_required') : t('dynasty_succession_btn')
      this.root.appendChild(btn)
    }

    if (d.dynastyBonusId) {
      const active = d.children.find((c) => c.id === d.dynastyBonusId)
      if (active) {
        const badge = document.createElement('p')
        badge.className = 'dynasty-active-heir'
        badge.textContent = `${t('dynasty_active_heir')} ${active.name} (${traitLabel(active.trait)})`
        this.root.appendChild(badge)
      }
    }
  }

  private childCard(c: ChildRecord): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dynasty-child-card'
    const isHeir = this.state.dynasty.dynastyBonusId === c.id
    const bornLabel = t('dynasty_child_born').replace('{day}', String(c.bornGameDay))
    const happiness = Math.round(c.happiness ?? 60)
    const ageYears = Math.floor((gameDay(this.state.gameTimeMs) - c.bornGameDay) / 365)
    const careerInfo = childCareerDef(c.career)
    card.innerHTML = `
      <span class="dynasty-child-emoji">${isHeir ? '👑' : '🧒'}</span>
      <div>
        <strong>${c.name} · ${ageYears} yaş</strong>
        <small>${traitLabel(c.trait)}</small>
        <small class="child-risk-warn">${c.riskLabel ?? ''}</small>
        <small>${bornLabel} Eğitim ${Math.floor(c.educationXp ?? 0)}% · 😊 %${happiness}</small>
        ${careerInfo ? `<small>🎓 ${careerInfo.emoji} ${careerInfo.name} — ${careerInfo.bonusLabel}</small>` : ''}
      </div>
    `
    const actions = document.createElement('div')
    actions.className = 'child-card-actions'

    // Vakit geçir
    const timeBtn = document.createElement('button')
    timeBtn.type = 'button'
    timeBtn.className = 'btn-sm btn-secondary'
    timeBtn.dataset.action = 'child-time'
    timeBtn.dataset.id = c.id
    timeBtn.textContent = '👨‍👧 Vakit geç'
    actions.appendChild(timeBtn)

    // Yetiştirme tarzı (sadece henüz seçilmemişse)
    if (!c.parentingStyle) {
      const strictBtn = document.createElement('button')
      strictBtn.type = 'button'
      strictBtn.className = 'btn-sm btn-secondary'
      strictBtn.dataset.action = 'child-parenting'
      strictBtn.dataset.id = `${c.id}:strict`
      strictBtn.textContent = '📚 Katı'
      const freeBtn = document.createElement('button')
      freeBtn.type = 'button'
      freeBtn.className = 'btn-sm btn-secondary'
      freeBtn.dataset.action = 'child-parenting'
      freeBtn.dataset.id = `${c.id}:free`
      freeBtn.textContent = '🎈 Serbest'
      actions.append(strictBtn, freeBtn)
    }

    // Kariyer seçimi (18+ ve henüz seçilmemişse)
    if (ageYears >= 18 && !c.career) {
      const careerLabel = document.createElement('small')
      careerLabel.className = 'child-career-prompt'
      careerLabel.textContent = '🎯 Kariyer seç:'
      actions.appendChild(careerLabel)
      for (const career of CHILD_CAREERS) {
        const cb = document.createElement('button')
        cb.type = 'button'
        cb.className = 'btn-sm btn-secondary'
        cb.dataset.action = 'child-career'
        cb.dataset.id = `${c.id}:${career.id}`
        cb.textContent = `${career.emoji} ${career.name}`
        actions.appendChild(cb)
      }
    }

    const pick = document.createElement('button')
    pick.type = 'button'
    pick.className = 'btn-sm btn-secondary'
    pick.dataset.action = 'dynasty-succession'
    pick.dataset.id = c.id
    pick.textContent = isHeir ? t('dynasty_heir_btn') : t('dynasty_inherit_btn')
    actions.appendChild(pick)
    card.appendChild(actions)
    return card
  }

  private renderMortalityRisks(): void {
    const risks = this.state.activeMortalityRisks()
    if (risks.length === 0) return

    const title = document.createElement('h4')
    title.className = 'mortality-risks-title'
    title.textContent = t('dynasty_death_risks_title')
    this.root.appendChild(title)

    const list = document.createElement('div')
    list.className = 'mortality-risks'
    for (const r of risks) {
      const chip = document.createElement('span')
      chip.className = `mortality-risk mortality-risk-${r.level}`
      chip.title = `Günlük risk: ~${r.dailyPct.toFixed(3)}%`
      chip.textContent = `${r.emoji} ${r.label}`
      list.appendChild(chip)
    }
    this.root.appendChild(list)

    const note = document.createElement('p')
    note.className = 'dynasty-desc mortality-note'
    note.textContent = t('dynasty_risk_note')
    this.root.appendChild(note)
  }
}
