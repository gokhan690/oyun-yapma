import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { gameDay, gameCalendarDate, lifeGameDay } from '../../game/GameClock'
import { cityDef } from '../../game/ExpansionMap'
import { spouseOptionsForPlayer, PLAYER_LIFESPAN, childCareerDef, childAgeYears, DYNASTY_LEGACY_ITEMS, CHILD_EDUCATION_PATHS, HEIR_ROLES, heirRoleDef, type ChildRecord, spouseBonusLabel, legacyItemLabel, legacyItemBonusLabel, heirRoleName, heirRoleDesc, heirRoleBonusLabel, eduPathName, eduPathDesc, childCareerName, childCareerBonusLabel } from '../../game/Dynasty'
import { FRIEND_TYPES, friendName, friendBonus } from '../../game/Friendships'
import { MENTORS, ENEMIES, mentorName, mentorTitle, mentorBackstory, mentorQuestLabel, mentorQuestDesc, mentorQuestReward, enemyName, enemyTitle, enemyBackstory, enemyResolveLabel } from '../../game/MentorEnemy'
import { HOBBIES, hobbyName, hobbyBonus } from '../../game/Hobby'
import { TRAVEL_DESTINATIONS, availableDestinations, travelName, travelBonus } from '../../game/Travel'
import { HOME_ROOMS, homeRoomName, homeRoomBonus } from '../../game/Lifestyle'
import { t, i18n, fmt } from '../../i18n'

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
    const estLabel = estYears < 99 ? fmt('dynasty_est_years', { n: estYears }) : t('dynasty_long_life')
    ageBar.innerHTML = `
      <label><span>${this.state.playerName} · ${age} ${t('ref_age_suffix')}</span><span>${estLabel}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${pct}%"></div></div>
    `
    this.root.appendChild(ageBar)

    this.renderLifeTimeline(age)
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
      warn.textContent = `${t('dynasty_death_prefix')} ${death.message} — ${suffix}`
      this.root.appendChild(warn)
    }

    const d = this.state.dynasty
    if (!d.spouseName) {
      this.renderMarriage()
    } else {
      this.renderFamily()
    }

    this.renderHobby()
    this.renderTravel()
    this.renderFamilyTree()
    this.renderSocialStatus()
  }

  /** Aile sistemi yaş kapısı (Aşama 11 — ~25 yaş civarı açılır) */
  private static readonly FAMILY_UNLOCK_AGE = 25

  private renderMarriage(): void {
    const age = this.state.playerAge()
    if (age < DynastyPanel.FAMILY_UNLOCK_AGE) {
      const locked = document.createElement('div')
      locked.className = 'family-locked-banner'
      locked.innerHTML = `
        <span class="family-locked-emoji">💍</span>
        <strong>${fmt('dynasty_family_locked_title', { age: DynastyPanel.FAMILY_UNLOCK_AGE })}</strong>
        <p>${fmt('dynasty_family_locked_desc', { age })}</p>
      `
      this.root.appendChild(locked)
      return
    }
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
        <small>${spouseBonusLabel(s)}</small>
        <small class="dynasty-cost">${formatMoney(s.cost)}</small>
      `
      card.disabled = !this.state.canAfford(s.cost)
      grid.appendChild(card)
    }
    this.root.appendChild(grid)
  }

  private renderFamily(): void {
    const d = this.state.dynasty
    const sat = Math.round(d.spouseSatisfaction ?? 70)

    // ——— Aile özet kartı: eş + arma + nüfuz/birlik (referans düzen) ———
    const childHappinessAvg = d.children.length > 0
      ? Math.round(d.children.reduce((s, c) => s + (c.happiness ?? 60), 0) / d.children.length)
      : 70
    const familyUnity = Math.round((sat + childHappinessAvg) / 2)
    const familyInfluence = Math.min(100, this.state.dynasty.generation * 12 + d.children.length * 6 + Math.round(this.state.reputation / 3))
    const summary = document.createElement('div')
    summary.className = 'game-card family-summary-card'
    summary.innerHTML = `
      <div class="fam-summary-grid">
        <div class="fam-spouse">
          <div class="fam-spouse-avatar">${d.spouseTrait ? '💞' : '💍'}</div>
          <div class="fam-spouse-name">${d.spouseName}</div>
          <div class="fam-spouse-trait">${traitLabel(d.spouseTrait ?? '')}</div>
        </div>
        <div class="fam-crest">
          <div class="fam-crest-emoji">👑</div>
          <div class="fam-crest-name">${fmt('dynasty_family_surname', { name: this.state.playerName })}</div>
          <div class="fam-crest-gen">${fmt('dynasty_gen_label', { n: this.state.dynasty.generation })}</div>
        </div>
        <div class="fam-meters">
          <div class="fam-meter">
            <span class="fam-meter-label">${t('dynasty_family_influence')}</span>
            <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${familyInfluence}%;background:#13b8a6"></div></div>
            <span class="fam-meter-val">%${familyInfluence}</span>
          </div>
          <div class="fam-meter">
            <span class="fam-meter-label">${t('dynasty_family_unity')}</span>
            <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${familyUnity}%;background:#28c76f"></div></div>
            <span class="fam-meter-val">%${familyUnity}</span>
          </div>
        </div>
      </div>
    `
    this.root.appendChild(summary)

    // Eş memnuniyeti barı + hediye butonu
    const satRow = document.createElement('div')
    satRow.className = 'spouse-satisfaction-row'
    const satColor = sat >= 80 ? '#5ee0a0' : sat >= 50 ? '#72b7ff' : sat >= 30 ? '#f8b84e' : '#f87171'
    const satLabel = sat >= 80 ? t('dynasty_sat_very_happy') : sat >= 50 ? t('dynasty_sat_happy') : sat >= 30 ? t('dynasty_sat_uneasy') : t('dynasty_sat_critical')
    satRow.innerHTML = `
      <label><span>${t('dynasty_spouse_satisfaction_title')}</span><span>${satLabel} · %${sat}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${sat}%;background:${satColor}"></div></div>
    `
    this.root.appendChild(satRow)
    const giftBtn = document.createElement('button')
    giftBtn.type = 'button'
    giftBtn.className = 'btn-sm btn-secondary spouse-gift-btn'
    giftBtn.dataset.action = 'spouse-gift'
    giftBtn.textContent = fmt('dynasty_spouse_gift_btn', { cost: formatMoney(50_000) })
    giftBtn.disabled = !this.state.canAfford(50_000)
    this.root.appendChild(giftBtn)

    const kidsTitle = document.createElement('h4')
    kidsTitle.textContent = `${t('dynasty_children_label')} (${d.children.length}/3)`
    this.root.appendChild(kidsTitle)

    if (d.children.length === 0) {
      const wait = document.createElement('p')
      wait.className = 'dynasty-desc'
      // Evlilikten sonra 1 hayat yılı geçtiyse çocuk yakın (Düzeltme 4)
      const lifeDay = lifeGameDay(this.state.gameTimeMs)
      const marriedLife = d.marriedLifeDay ?? lifeDay
      wait.textContent = lifeDay - marriedLife < 365
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

    this.renderLegacyItems()
    this.renderInheritancePlan()
    this.renderHomeRooms()
    this.renderFriends()
    this.renderMentorEnemy()
  }

  /** Miras planı paneli — vasiyet, trust, aile anayasası (Aşama 15-16) */
  private renderInheritancePlan(): void {
    const d = this.state.dynasty
    const age = this.state.playerAge()
    // 50+ yaş veya çocuk varsa göster
    if (age < 50 && d.children.length === 0) return

    const section = document.createElement('div')
    section.className = 'inheritance-section'
    const title = document.createElement('h4')
    title.textContent = t('dynasty_inheritance_title')
    section.appendChild(title)

    const preview = this.state.inheritancePreview()
    const pctEl = document.createElement('div')
    pctEl.className = 'inheritance-preview'
    const pct = Math.round(preview.transferPct * 100)
    const color = pct >= 85 ? '#5ee0a0' : pct >= 70 ? '#72b7ff' : '#f8b84e'
    pctEl.innerHTML = `
      <label><span>${t('dynasty_inheritance_transfer_label')}</span><span style="color:${color};font-weight:700">%${pct}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${pct}%;background:${color}"></div></div>
    `
    section.appendChild(pctEl)

    // Servet aktarım görseli — korunacak vs kayıp (Aşama 11 görsel)
    const nw = this.state.financeNetWorth()
    if (nw > 0) {
      const transfer = Math.floor(nw * preview.transferPct)
      const loss = nw - transfer
      const wealthBar = document.createElement('div')
      wealthBar.className = 'inheritance-wealth-bar'
      wealthBar.innerHTML = `
        <div class="iw-stacked">
          <div class="iw-seg iw-keep" style="width:${pct}%" title="Varise geçecek"></div>
          <div class="iw-seg iw-loss" style="width:${100 - pct}%" title="Vergi/kayıp"></div>
        </div>
        <div class="iw-legend">
          <span class="iw-legend-item"><span class="iw-dot iw-dot-keep"></span>${fmt('dynasty_iw_heir', { amount: formatMoney(transfer) })}</span>
          <span class="iw-legend-item"><span class="iw-dot iw-dot-loss"></span>${fmt('dynasty_iw_loss', { amount: formatMoney(loss) })}</span>
        </div>
      `
      section.appendChild(wealthBar)
    }

    const reasons = document.createElement('ul')
    reasons.className = 'inheritance-reasons'
    for (const r of preview.reason) {
      const li = document.createElement('li')
      li.textContent = r
      reasons.appendChild(li)
    }
    section.appendChild(reasons)

    const grid = document.createElement('div')
    grid.className = 'inheritance-plan-grid'

    const willBtn = document.createElement('button')
    willBtn.type = 'button'
    willBtn.className = `btn-sm btn-secondary inheritance-btn${d.hasWill ? ' plan-done' : ''}`
    willBtn.dataset.action = 'prepare-will'
    willBtn.disabled = d.hasWill || !this.state.canAfford(100_000)
    if (d.hasWill) {
      willBtn.textContent = t('dynasty_will_done')
    } else {
      willBtn.textContent = t('dynasty_will_btn_label')
      const willSmall = document.createElement('small')
      willSmall.textContent = `${formatMoney(100_000)} · ${t('dynasty_will_btn_hint')}`
      willBtn.appendChild(willSmall)
    }
    grid.appendChild(willBtn)

    const trustBtn = document.createElement('button')
    trustBtn.type = 'button'
    trustBtn.className = `btn-sm btn-secondary inheritance-btn${d.hasTrust ? ' plan-done' : ''}`
    trustBtn.dataset.action = 'create-trust'
    trustBtn.disabled = d.hasTrust || !this.state.canAfford(500_000)
    if (d.hasTrust) {
      trustBtn.textContent = t('dynasty_trust_done')
    } else {
      trustBtn.textContent = t('dynasty_trust_btn_label')
      const trustSmall = document.createElement('small')
      trustSmall.textContent = `${formatMoney(500_000)} · ${t('dynasty_trust_btn_hint')}`
      trustBtn.appendChild(trustSmall)
    }
    grid.appendChild(trustBtn)

    const constBtn = document.createElement('button')
    constBtn.type = 'button'
    constBtn.className = `btn-sm btn-secondary inheritance-btn${d.hasFamilyConstitution ? ' plan-done' : ''}`
    constBtn.dataset.action = 'write-constitution'
    constBtn.disabled = d.hasFamilyConstitution || !this.state.canAfford(250_000)
    if (d.hasFamilyConstitution) {
      constBtn.textContent = t('dynasty_const_done')
    } else {
      constBtn.textContent = t('dynasty_const_btn_label')
      const constSmall = document.createElement('small')
      constSmall.textContent = `${formatMoney(250_000)} · ${t('dynasty_const_btn_hint')}`
      constBtn.appendChild(constSmall)
    }
    grid.appendChild(constBtn)

    section.appendChild(grid)
    this.root.appendChild(section)
  }

  private renderHomeRooms(): void {
    const ls = this.state.lifestyle
    const owned = ls.homeRooms ?? []
    if (owned.length === HOME_ROOMS.length) return // All rooms owned — skip section
    const section = document.createElement('div')
    section.className = 'home-rooms-section'
    const h4 = document.createElement('h4')
    h4.textContent = t('dynasty_home_rooms_title')
    section.appendChild(h4)
    const desc = document.createElement('p')
    desc.className = 'dynasty-desc'
    desc.textContent = t('dynasty_home_rooms_desc')
    section.appendChild(desc)
    const grid = document.createElement('div')
    grid.className = 'home-rooms-grid'
    for (const room of HOME_ROOMS) {
      const isOwned = owned.includes(room.id)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `home-room-btn${isOwned ? ' home-room-owned' : ''}`
      btn.dataset.action = 'buy-home-room'
      btn.dataset.id = room.id
      btn.disabled = isOwned || !this.state.canAfford(room.cost)
      btn.innerHTML = `
        <span>${room.emoji}</span>
        <span>${homeRoomName(room)}</span>
        <small>${isOwned ? t('dynasty_home_room_owned') : formatMoney(room.cost)}</small>
        <small>${homeRoomBonus(room)}</small>
      `
      grid.appendChild(btn)
    }
    section.appendChild(grid)
    this.root.appendChild(section)
  }

  private renderLegacyItems(): void {
    const d = this.state.dynasty
    const section = document.createElement('div')
    section.className = 'legacy-section'
    const title = document.createElement('h4')
    title.textContent = t('dynasty_legacy_title')
    section.appendChild(title)
    const desc = document.createElement('p')
    desc.className = 'dynasty-desc'
    desc.textContent = t('dynasty_legacy_desc')
    section.appendChild(desc)
    const grid = document.createElement('div')
    grid.className = 'legacy-items-grid'
    const selected = d.legacyItems ?? []
    for (const item of DYNASTY_LEGACY_ITEMS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `legacy-item-btn${selected.includes(item.id) ? ' legacy-item-selected' : ''}`
      btn.dataset.action = 'toggle-legacy-item'
      btn.dataset.id = item.id
      btn.innerHTML = `<span>${item.emoji} ${legacyItemLabel(item)}</span><small>${legacyItemBonusLabel(item)}</small>`
      grid.appendChild(btn)
    }
    section.appendChild(grid)
    this.root.appendChild(section)
  }

  private renderFriends(): void {
    const state = this.state
    const friends = state.friendships.friends
    if (friends.length === 0) return
    const section = document.createElement('div')
    section.className = 'friends-section'
    const title = document.createElement('h4')
    title.textContent = t('dynasty_friends_title')
    section.appendChild(title)
    for (const f of friends) {
      const def = FRIEND_TYPES.find((t) => t.id === f.typeId)
      if (!def) continue
      const rel = Math.round(f.relationship)
      const relColor = rel >= 80 ? '#5ee0a0' : rel >= 50 ? '#72b7ff' : '#f8b84e'
      const card = document.createElement('div')
      card.className = 'friend-card'
      card.innerHTML = `
        <div class="friend-card-header">
          <span class="friend-emoji">${def.emoji}</span>
          <div>
            <strong>${f.name}</strong>
            <small>${friendName(def)}</small>
          </div>
          <span class="friend-rel-pct" style="color:${relColor}">${rel}%</span>
        </div>
        <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${rel}%;background:${relColor}"></div></div>
        ${rel >= 80 ? `<small class="friend-bonus">${friendBonus(def)}</small>` : ''}
      `
      const btnRow = document.createElement('div')
      btnRow.className = 'friend-card-actions'
      const timeBtn = document.createElement('button')
      timeBtn.type = 'button'
      timeBtn.className = 'btn-sm btn-secondary'
      timeBtn.dataset.action = 'friend-time'
      timeBtn.dataset.id = f.typeId
      timeBtn.textContent = t('dynasty_friend_time_btn')
      const moneyBtn = document.createElement('button')
      moneyBtn.type = 'button'
      moneyBtn.className = 'btn-sm btn-secondary'
      moneyBtn.dataset.action = 'friend-money'
      moneyBtn.dataset.id = f.typeId
      moneyBtn.textContent = fmt('dynasty_friend_money_btn', { cost: formatMoney(10_000) })
      moneyBtn.disabled = !this.state.canAfford(10_000)
      btnRow.append(timeBtn, moneyBtn)
      card.appendChild(btnRow)
      section.appendChild(card)
    }
    this.root.appendChild(section)
  }

  private renderMentorEnemy(): void {
    const me = this.state.mentorEnemy
    const section = document.createElement('div')
    section.className = 'mentor-enemy-section'

    if (me.mentorId) {
      const mDef = MENTORS.find((m) => m.id === me.mentorId)
      if (mDef) {
        const mTitle = document.createElement('h4')
        mTitle.textContent = `🧓 ${i18n.t('mentor_section_title')}`
        section.appendChild(mTitle)
        const mCard = document.createElement('div')
        mCard.className = 'mentor-card'
        const completedCount = me.completedQuests.length
        const totalCount = mDef.quests.length
        const mNameEl = document.createElement('strong')
        mNameEl.textContent = `${mDef.emoji} ${mentorName(mDef)} — ${mentorTitle(mDef)}`
        const mBackstoryEl = document.createElement('small')
        mBackstoryEl.textContent = mentorBackstory(mDef)
        const mProgressEl = document.createElement('small')
        mProgressEl.textContent = fmt('mentor_quest_progress', { completed: completedCount, total: totalCount })
        mCard.appendChild(mNameEl)
        mCard.appendChild(mBackstoryEl)
        mCard.appendChild(mProgressEl)
        // Show active quests
        for (const q of mDef.quests) {
          const done = me.completedQuests.includes(q.id)
          const qEl = document.createElement('div')
          qEl.className = `mentor-quest${done ? ' mentor-quest-done' : ''}`
          const label = mentorQuestLabel(mDef.id, q)
          const desc = mentorQuestDesc(mDef.id, q)
          const reward = mentorQuestReward(mDef.id, q)
          const checkEl = document.createTextNode(`${done ? '✅' : '⬜'} `)
          const boldEl = document.createElement('strong')
          boldEl.textContent = label
          qEl.appendChild(checkEl)
          qEl.appendChild(boldEl)
          qEl.appendChild(document.createTextNode(`: ${desc} → ${reward}`))
          mCard.appendChild(qEl)
        }
        section.appendChild(mCard)
      }
    }

    if (me.enemyId && !me.enemyResolved) {
      const eDef = ENEMIES.find((e) => e.id === me.enemyId)
      if (eDef) {
        const eTitle = document.createElement('h4')
        eTitle.textContent = `😈 ${i18n.t('enemy_section_title')}`
        section.appendChild(eTitle)
        const eCard = document.createElement('div')
        eCard.className = 'enemy-card'
        const penalty = Math.round(eDef.dailyIncomePenalty * 100)
        const eNameEl = document.createElement('strong')
        eNameEl.textContent = `${eDef.emoji} ${enemyName(eDef)} — ${enemyTitle(eDef)}`
        const eBackstoryEl = document.createElement('small')
        eBackstoryEl.textContent = enemyBackstory(eDef)
        const ePenaltyEl = document.createElement('small')
        ePenaltyEl.className = 'enemy-penalty'
        ePenaltyEl.textContent = `⚠️ ${fmt('enemy_daily_penalty', { penalty })}`
        eCard.appendChild(eNameEl)
        eCard.appendChild(eBackstoryEl)
        eCard.appendChild(ePenaltyEl)
        const resolveTitle = document.createElement('small')
        resolveTitle.textContent = i18n.t('enemy_resolve_methods_title')
        eCard.appendChild(resolveTitle)
        const resolveBtns = document.createElement('div')
        resolveBtns.className = 'enemy-resolve-btns'
        for (const opt of eDef.resolveMethods) {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'btn-sm btn-secondary'
          btn.dataset.action = 'resolve-enemy'
          btn.dataset.id = opt.method
          btn.disabled = !this.state.canAfford(opt.moneyCost)
          const optLabel = enemyResolveLabel(eDef.id, opt)
          btn.textContent = `${opt.emoji} ${optLabel} (${formatMoney(opt.moneyCost)})`
          resolveBtns.appendChild(btn)
        }
        eCard.appendChild(resolveBtns)
        section.appendChild(eCard)
      }
    } else if (me.enemyId && me.enemyResolved) {
      const done = document.createElement('p')
      done.className = 'dynasty-desc'
      done.textContent = i18n.t('enemy_defeated')
      section.appendChild(done)
    }

    if (section.children.length > 0) this.root.appendChild(section)
  }

  private childCard(c: ChildRecord): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dynasty-child-card'
    const isHeir = this.state.dynasty.dynastyBonusId === c.id
    const bornLabel = t('dynasty_child_born').replace('{day}', String(c.bornGameDay))
    const happiness = Math.round(c.happiness ?? 60)
    const ageYears = childAgeYears(this.state.gameTimeMs, c.bornGameDay)
    const careerInfo = childCareerDef(c.career)
    const eduPathDef = c.educationPath ? CHILD_EDUCATION_PATHS.find((p) => p.id === c.educationPath) : null
    const roleDef = heirRoleDef(c.heirRole)
    // Büyüme timeline: 0 → 5 → 10 → 15 → 18 (Aşama 7)
    const growthPct = Math.min(100, (Math.min(ageYears, 18) / 18) * 100)
    const eduXp = Math.floor(c.educationXp ?? 0)
    card.innerHTML = `
      <span class="dynasty-child-emoji">${isHeir ? '👑' : '🧒'}</span>
      <div class="child-card-body">
        <strong>${c.name} · ${ageYears} ${t('ref_age_suffix')}</strong>
        <small>${traitLabel(c.trait)}</small>
        <small class="child-risk-warn">${c.riskLabel ?? ''}</small>
        <small>${bornLabel} · 😊 %${happiness}</small>
        <div class="child-growth-timeline">
          <div class="child-growth-track"><div class="child-growth-fill" style="width:${growthPct}%"></div></div>
          <div class="child-growth-marks"><span>0</span><span>5</span><span>10</span><span>15</span><span>18</span></div>
        </div>
        ${eduPathDef ? `
          <div class="child-edu-row">
            <small>📚 ${eduPathDef.emoji} ${eduPathName(eduPathDef)}: %${eduXp}</small>
            <div class="chart-progress" style="height:6px"><div class="chart-progress-fill" style="width:${eduXp}%;background:#60a5fa"></div></div>
          </div>` : ''}
        ${roleDef ? `<small class="child-role-line">👔 ${roleDef.emoji} ${heirRoleName(roleDef)} — ${heirRoleBonusLabel(roleDef)}</small>` : ''}
        ${careerInfo && !roleDef ? `<small>🎓 ${careerInfo.emoji} ${childCareerName(careerInfo)} — ${childCareerBonusLabel(careerInfo)}</small>` : ''}
      </div>
    `
    const actions = document.createElement('div')
    actions.className = 'child-card-actions'

    // Eğitim yolu seçimi (10+ yaş ve henüz seçilmemişse — Aşama 13)
    if (ageYears >= 10 && !c.educationPath) {
      const eduLabel = document.createElement('small')
      eduLabel.className = 'child-career-prompt'
      eduLabel.textContent = t('dynasty_child_edu_prompt')
      actions.appendChild(eduLabel)
      for (const path of CHILD_EDUCATION_PATHS) {
        const eb = document.createElement('button')
        eb.type = 'button'
        eb.className = 'btn-sm btn-secondary'
        eb.dataset.action = 'child-education-path'
        eb.dataset.id = `${c.id}:${path.id}`
        eb.title = eduPathDesc(path)
        eb.textContent = `${path.emoji} ${eduPathName(path)}`
        actions.appendChild(eb)
      }
    }

    // Varis rolü atama (18+ yaş ve henüz rol almamışsa — Aşama 14)
    if (ageYears >= 18 && !c.heirRole) {
      const roleLabel = document.createElement('small')
      roleLabel.className = 'child-career-prompt'
      roleLabel.textContent = t('dynasty_child_role_prompt')
      actions.appendChild(roleLabel)
      // Eğitim yoluna uygun rolü öne çıkar
      const suggestedRole = c.educationPath
        ? CHILD_EDUCATION_PATHS.find((p) => p.id === c.educationPath)?.leadsToRole
        : null
      for (const role of HEIR_ROLES) {
        const rb = document.createElement('button')
        rb.type = 'button'
        rb.className = `btn-sm btn-secondary${role.id === suggestedRole ? ' role-suggested' : ''}`
        rb.dataset.action = 'heir-role'
        rb.dataset.id = `${c.id}:${role.id}`
        rb.title = `${heirRoleDesc(role)} · ${heirRoleBonusLabel(role)}`
        rb.textContent = `${role.emoji} ${heirRoleName(role)}${role.id === suggestedRole ? ' ⭐' : ''}`
        actions.appendChild(rb)
      }
    }

    // Vakit geçir
    const timeBtn = document.createElement('button')
    timeBtn.type = 'button'
    timeBtn.className = 'btn-sm btn-secondary'
    timeBtn.dataset.action = 'child-time'
    timeBtn.dataset.id = c.id
    timeBtn.textContent = t('dynasty_child_time_btn')
    actions.appendChild(timeBtn)

    // Yetiştirme tarzı (sadece henüz seçilmemişse)
    if (!c.parentingStyle) {
      const strictBtn = document.createElement('button')
      strictBtn.type = 'button'
      strictBtn.className = 'btn-sm btn-secondary'
      strictBtn.dataset.action = 'child-parenting'
      strictBtn.dataset.id = `${c.id}:strict`
      strictBtn.textContent = t('dynasty_parenting_strict')
      const freeBtn = document.createElement('button')
      freeBtn.type = 'button'
      freeBtn.className = 'btn-sm btn-secondary'
      freeBtn.dataset.action = 'child-parenting'
      freeBtn.dataset.id = `${c.id}:free`
      freeBtn.textContent = t('dynasty_parenting_free')
      actions.append(strictBtn, freeBtn)
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

  private renderHobby(): void {
    const hobby = this.state.hobby
    const section = document.createElement('div')
    section.className = 'hobby-section'
    const title = document.createElement('h4')
    title.textContent = t('dynasty_hobby_title')
    section.appendChild(title)

    if (!hobby.hobbyId) {
      const desc = document.createElement('p')
      desc.className = 'dynasty-desc'
      desc.textContent = t('dynasty_hobby_desc')
      section.appendChild(desc)
      const grid = document.createElement('div')
      grid.className = 'hobby-grid'
      for (const h of HOBBIES) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-secondary hobby-btn'
        btn.dataset.action = 'set-hobby'
        btn.dataset.id = h.id
        btn.innerHTML = `<span>${h.emoji} ${hobbyName(h)}</span><small>${hobbyBonus(h)}</small><small>${fmt('dynasty_hobby_monthly', { cost: formatMoney(h.monthlyCost) })}</small>`
        grid.appendChild(btn)
      }
      section.appendChild(grid)
    } else {
      const def = HOBBIES.find((h) => h.id === hobby.hobbyId)
      if (def) {
        const card = document.createElement('div')
        card.className = 'hobby-active-card'
        const active = hobby.bonusActive
        card.innerHTML = `
          <strong>${def.emoji} ${hobbyName(def)}</strong>
          <small>${hobbyBonus(def)}</small>
          <small>${fmt('dynasty_hobby_monthly_cost', { cost: formatMoney(def.monthlyCost) })}</small>
          <small>${active ? t('dynasty_hobby_bonus_active') : fmt('dynasty_hobby_bonus_soon', { n: 3 - hobby.monthsActive })}</small>
        `
        section.appendChild(card)
      }
    }
    this.root.appendChild(section)
  }

  private renderSocialStatus(): void {
    const score = this.state.socialStatusScore()
    const { title, emoji } = this.state.socialStatusTitle()
    const section = document.createElement('div')
    section.className = 'social-status-section'
    const h4 = document.createElement('h4')
    h4.textContent = t('dynasty_social_status_title')
    section.appendChild(h4)
    const bar = document.createElement('div')
    bar.className = 'social-status-row'
    const fill = Math.min(100, (score / 200) * 100)
    bar.innerHTML = `
      <label><span>${emoji} ${title}</span><span>${fmt('dynasty_social_score', { n: score })}</span></label>
      <div class="dynasty-age-track"><div class="dynasty-age-fill" style="width:${fill}%;background:var(--accent,#d4af37)"></div></div>
    `
    section.appendChild(bar)
    this.root.appendChild(section)
  }

  private renderTravel(): void {
    const section = document.createElement('div')
    section.className = 'travel-section'
    const h4 = document.createElement('h4')
    h4.textContent = t('dynasty_travel_title')
    section.appendChild(h4)

    const available = availableDestinations(this.state.totalEarned)
    const travelState = this.state.travel
    const day = gameDay(this.state.gameTimeMs)
    const bonusActive = travelState.travelBonusUntilDay > day

    if (travelState.lastDestinationId) {
      const lastDef = TRAVEL_DESTINATIONS.find((d) => d.id === travelState.lastDestinationId)
      if (lastDef) {
        const badge = document.createElement('p')
        badge.className = 'dynasty-desc'
        const baseTravelText = fmt('dynasty_last_travel', { emoji: lastDef.emoji, name: travelName(lastDef), trips: travelState.totalTrips })
        badge.textContent = bonusActive ? `${baseTravelText} ${fmt('dynasty_travel_bonus_suffix', { bonus: travelBonus(lastDef) })}` : baseTravelText
        section.appendChild(badge)
      }
    }

    if (available.length === 0) {
      const hint = document.createElement('p')
      hint.className = 'dynasty-desc'
      hint.textContent = fmt('dynasty_travel_unlock_hint', { amount: formatMoney(TRAVEL_DESTINATIONS[0]!.unlockAt) })
      section.appendChild(hint)
    } else {
      const grid = document.createElement('div')
      grid.className = 'travel-grid'
      for (const dest of available) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-secondary travel-btn'
        btn.dataset.action = 'go-travel'
        btn.dataset.id = dest.id
        btn.disabled = !this.state.canAfford(dest.cost)
        btn.innerHTML = `
          <span class="travel-emoji">${dest.emoji}</span>
          <span class="travel-name">${travelName(dest)}</span>
          <small>${fmt('dynasty_travel_duration', { days: dest.durationDays, cost: formatMoney(dest.cost) })}</small>
          <small>${travelBonus(dest)}</small>
        `
        grid.appendChild(btn)
      }
      section.appendChild(grid)
    }
    this.root.appendChild(section)
  }

  private renderFamilyTree(): void {
    const history = this.state.baronHistory
    if (!history || history.length === 0) return
    const section = document.createElement('div')
    section.className = 'family-tree-section'
    const h4 = document.createElement('h4')
    h4.textContent = t('dynasty_family_tree_title')
    section.appendChild(h4)
    const tree = document.createElement('div')
    tree.className = 'family-tree'
    for (let i = history.length - 1; i >= 0; i--) {
      const rec = history[i]!
      const node = document.createElement('div')
      node.className = 'family-tree-node'
      const peakFmt = formatMoney(rec.peakNetWorth)
      node.innerHTML = `
        <span class="tree-gen">${fmt('dynasty_gen_label', { n: rec.generation })}</span>
        <span class="tree-name">${rec.name ?? 'Baron'}</span>
        <span class="tree-years">${fmt('dynasty_tree_years', { birth: rec.birthYear, death: rec.deathYear, age: rec.ageAtDeath })}</span>
        <span class="tree-peak">💰 ${peakFmt}</span>
        ${rec.achievements.length > 0 ? `<small>${rec.achievements[0]}</small>` : ''}
      `
      tree.appendChild(node)
    }
    section.appendChild(tree)
    this.root.appendChild(section)
  }

  /** Yaşam çizgisi + oyuncu bilgi kartı (Section 9 — Zaman ve yaş görseli) */
  private renderLifeTimeline(age: number): void {
    const s = this.state
    const cal = gameCalendarDate(s.gameTimeMs)
    const months = [t('month_jan'), t('month_feb'), t('month_mar'), t('month_apr'), t('month_may'), t('month_jun'), t('month_jul'), t('month_aug'), t('month_sep'), t('month_oct'), t('month_nov'), t('month_dec')]
    const dateLabel = `${months[cal.getUTCMonth()]} ${cal.getUTCFullYear()}`
    const city = cityDef(s.activeCityId())
    const d = s.dynasty
    const familyLabel = d.spouseName
      ? `${t('dynasty_married')}${d.children.length > 0 ? ` · ${fmt('dynasty_children_count', { n: d.children.length })}` : ''}`
      : t('dynasty_single')

    const section = document.createElement('div')
    section.className = 'life-timeline-section'

    // Oyuncu bilgi kartı
    const info = document.createElement('div')
    info.className = 'life-info-card'
    info.innerHTML = `
      <div class="life-info-row"><span>👤 ${s.playerName}</span><span>${age} ${t('ref_age_suffix')}</span></div>
      <div class="life-info-row life-info-sub"><span>📅 ${dateLabel}</span><span>${city.emoji} ${city.label}</span></div>
      <div class="life-info-row life-info-sub"><span>👨‍👩‍👧 ${familyLabel}</span><span>${fmt('dynasty_gen_label', { n: d.generation })}</span></div>
    `
    section.appendChild(info)

    // Yaşam çizgisi: 22 Başlangıç → 30 Aile → 50 Miras → 60 Emeklilik → 70 Risk
    const milestones = [
      { age: 25, label: t('dynasty_milestone_family'), emoji: '💍' },
      { age: 40, label: t('dynasty_milestone_maturity'), emoji: '🏢' },
      { age: 50, label: t('dynasty_milestone_legacy'), emoji: '📜' },
      { age: 60, label: t('dynasty_milestone_retirement'), emoji: '🌅' },
      { age: 70, label: t('dynasty_milestone_risk'), emoji: '⚠️' },
    ]
    const minAge = 18
    const maxAge = 80
    const agePct = Math.min(100, Math.max(0, ((age - minAge) / (maxAge - minAge)) * 100))
    const marks = milestones.map((m) => {
      const pct = Math.min(100, Math.max(0, ((m.age - minAge) / (maxAge - minAge)) * 100))
      const reached = age >= m.age
      return `<div class="life-mark${reached ? ' reached' : ''}" style="left:${pct}%">
        <span class="life-mark-dot"></span>
        <span class="life-mark-label">${m.emoji} ${m.label}</span>
        <span class="life-mark-age">${m.age}</span>
      </div>`
    }).join('')

    const timeline = document.createElement('div')
    timeline.className = 'life-timeline'
    timeline.innerHTML = `
      <div class="life-timeline-track">
        <div class="life-timeline-fill" style="width:${agePct}%"></div>
        <div class="life-timeline-now" style="left:${agePct}%" title="${age} ${t('ref_age_suffix')}">🧍</div>
      </div>
      <div class="life-timeline-marks">${marks}</div>
    `
    section.appendChild(timeline)
    this.root.appendChild(section)
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
      chip.title = fmt('dynasty_daily_risk_tooltip', { pct: r.dailyPct.toFixed(3) })
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
