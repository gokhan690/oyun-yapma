import type { GameState, GameEvent } from '../../game/GameState'
import { crisisDef, crisisTitle, crisisDesc, crisisChoiceLabel, crisisChoiceDesc } from '../../game/CrisisEvents'
import { LIFE_EVENTS, lifeEventTitle, lifeEventDesc, lifeChoiceLabel } from '../../game/LifeEvents'
import type { LifeEventChoice } from '../../game/LifeEvents'
import { gameDay } from '../../game/GameClock'
import {
  canConsumePacedEvent,
  consumePacedEvent,
  createRuntimeToastPacingState,
  EVENT_TOAST_DEDUPE_MS,
  EVENT_TOAST_MIN_INTERVAL_MS,
  getEventPacingMeta,
  isCriticalInputRequiredEvent,
  isNormalSeriousDecision,
  type EventPacingMeta,
} from '../../game/EventPacing'
import { fmtMoney, refToast } from './refShared'
import { i18n, fmt } from '../../i18n'
import { achievementName } from '../../game/Achievements'
import { diseaseDef, diseaseName } from '../../game/Diseases'

/**
 * RefApp bildirim köprüsü — legacy HUD'un pasif toast bildirimlerini VE bloklayan
 * karar modallarını integration RefApp'e taşır. RefApp'in TEK GameState
 * aboneliğinden beslenir (ayrı abonelik AÇMAZ → duplicate listener riski yok).
 *
 * Kurallar:
 *  - State mutation YALNIZ mevcut GameState resolve metotlarında olur; UI yalnız
 *    kullanıcının seçimini toplar ve doğru metodu BİR kez çağırır.
 *  - Aynı anda tek karar modalı; sonraki kritik olay kuyruğa girer.
 *  - Karar modalı açıkken gelen toastlar kaybolmaz — sıraya girer, kapandıktan
 *    sonra gösterilir (max 8, dedup key ile).
 *  - gazette_headline burada ELE ALINMAZ (RefApp badge + Notifs feed zaten var).
 */
interface DecisionOption {
  label: string
  sub?: string
  /** GameState resolve metodunu çağırır; başarı döndürür. UI etki UYGULAMAZ. */
  resolve: () => boolean
}
interface DecisionSpec {
  emoji: string
  title: string
  body: string
  options: DecisionOption[]
  /** X ile kapatılabilir mi? false → kullanıcı seçim yapmadan kapatamaz. */
  dismissable: boolean
}

interface QueuedDecision {
  ev: GameEvent
  key: string
  meta: EventPacingMeta
  sequence: number
}

interface QueuedToast {
  msg: string
  kind: 'ok' | 'err'
  key: string
  meta: EventPacingMeta
  sequence: number
}

type FocusDecisionIdentity =
  | { type: 'annual_summary'; year: number }
  | { type: 'age_milestone'; age: number }

const MAX_TOAST_QUEUE = 8
const MAX_DECISION_QUEUE = 1
const MAX_SERIOUS_DECISIONS_PER_SESSION = 2
const SESSION_START_DECISION_SUPPRESS_MS = 90_000
const DECISION_CLOSE_GAP_MS = 15_000
const DECISION_INPUT_LOCK_MS = 1_000

export interface RefDecisionGateOptions {
  canShowDecision?: () => boolean
  now?: () => number
}

export class RefNotificationBridge {
  private readonly state: GameState
  /** Başarılı karar sonrası: aktif sayfayı tazele + kaydet. */
  private readonly onResolved: () => void
  private readonly canShowDecision: () => boolean
  private readonly now: () => number
  private readonly sessionStartedAt: number
  private queue: QueuedDecision[] = []
  private queuedDecisionKeys = new Set<string>()
  private currentDecisionKey: string | null = null
  private nextDecisionSequence = 0
  private overlay: HTMLElement | null = null
  private toastQueue: QueuedToast[] = []
  private queuedToastKeys = new Set<string>()
  private nextToastSequence = 0
  private toastDrainTimer: ReturnType<typeof setTimeout> | null = null
  private runtimeToast = createRuntimeToastPacingState()
  private undoBanner: HTMLElement | null = null
  private undoBannerKey: string | null = null
  private undoBannerTimer: ReturnType<typeof setTimeout> | null = null
  private lastSeenGameDay = -1
  private lastDecisionClosedAtMs = 0
  private lastExternalModalClosedAtMs = 0
  private seriousDecisionsShownThisSession = 0
  private decisionUnlockTimer: ReturnType<typeof setTimeout> | null = null
  private decisionInputLockedUntilMs = 0
  private decisionBusy = false
  private destroyed = false

  constructor(state: GameState, onResolved: () => void, opts: RefDecisionGateOptions = {}) {
    this.state = state
    this.onResolved = onResolved
    this.canShowDecision = opts.canShowDecision ?? (() => true)
    this.now = opts.now ?? (() => Date.now())
    this.sessionStartedAt = this.now()
  }

  start(): void {
    if (this.destroyed) return
    this.lastSeenGameDay = this.currentGameDay()
    this.syncPersistentDecisions()
    this.pump()
  }

  notifyExternalModalClosed(): void {
    if (this.destroyed) return
    this.lastExternalModalClosedAtMs = this.now()
    this.pump()
  }

  handle(ev: GameEvent): void {
    if (this.destroyed) return
    if (ev.type === 'game_time') {
      const day = this.currentGameDay()
      if (this.lastSeenGameDay !== day) {
        this.lastSeenGameDay = day
        this.syncPersistentDecisions()
      }
      this.pump()
    }
    this.routeEvent(ev)
  }

  private syncPersistentDecisions(): void {
    const s = this.state
    const day = this.currentGameDay()

    if (s.activeCrisis && !s.activeCrisis.resolved) {
      this.routeEvent({ type: 'crisis_started', crisisId: s.activeCrisis.crisisId, title: crisisTitle(crisisDef(s.activeCrisis.crisisId)) })
    }

    for (const event of s.activeRivalEvents) {
      if (event.expiresAtDay > day) this.routeEvent({ type: 'rival_event', event })
    }

    const latestSeen = new Map<string, number>()
    for (const e of s.lifeEvents) {
      const prev = latestSeen.get(e.eventId) ?? 0
      if (e.seenAtGameDay > prev) latestSeen.set(e.eventId, e.seenAtGameDay)
    }
    const latestChoice = new Map<string, number>()
    for (const r of s.eventChoiceHistory) {
      const prev = latestChoice.get(r.eventId) ?? -1
      if (r.gameDay > prev) latestChoice.set(r.eventId, r.gameDay)
    }
    for (const [eventId, seenDay] of latestSeen) {
      if ((latestChoice.get(eventId) ?? -1) < seenDay) {
        const def = LIFE_EVENTS.find(e => e.id === eventId)
        if (def) this.routeEvent({ type: 'life_event_triggered', eventDef: def })
      }
    }

    for (const pd of s.pendingDecisions) {
      if (pd.type === 'marriage_crisis') {
        if (s.dynasty.spouseId && pd.spouseId === s.dynasty.spouseId) {
          this.routeEvent({ type: 'marriage_crisis' })
        }
      } else if (pd.type === 'annual_summary') {
        this.routeEvent({
          type: 'annual_summary',
          year: pd.year,
          playerAge: pd.playerAge,
          totalEarned: pd.totalEarned,
          businessCount: pd.businessCount,
          incomePerDay: pd.incomePerDay,
        })
      } else if (pd.type === 'age_milestone') {
        this.routeEvent({ type: 'age_milestone', age: pd.age, question: pd.question })
      }
    }

    const u = s.pendingUndo
    if (u && Date.now() <= u.expiresAt) {
      this.routeEvent({ type: 'undo_available', label: u.label, cost: u.cost, undoId: u.id })
    }
  }

  private routeEvent(ev: GameEvent): void {
    const meta = getEventPacingMeta(ev)
    if (meta.requiresInput && meta.mayInterrupt) {
      this.enqueueDecision(ev, meta)
      return
    }
    if (meta.actionable && !meta.mayInterrupt) {
      this.showActionable(ev, meta)
      return
    }
    const toast = this.toastParams(ev, meta)
    if (toast) this.enqueueToast(toast)
  }

  private enqueueDecision(ev: GameEvent, meta: EventPacingMeta): void {
    const key = meta.dedupeKey
    if (this.currentDecisionKey === key || this.queuedDecisionKeys.has(key)) return
    if (isNormalSeriousDecision(meta) && this.queue.filter(item => isNormalSeriousDecision(item.meta)).length >= MAX_DECISION_QUEUE) return
    this.queue.push({ ev, key, meta, sequence: this.nextDecisionSequence++ })
    this.queuedDecisionKeys.add(key)
    this.queue.sort((a, b) => a.meta.priority - b.meta.priority || a.sequence - b.sequence)
    this.pump()
  }

  private pump(): void {
    if (this.destroyed || this.overlay) return
    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      this.queuedDecisionKeys.delete(item.key)
      const spec = this.specFor(item.ev)
      if (!spec) continue
      const day = this.currentGameDay()
      if (!this.canShowDecision()) {
        this.requeueDecisionFront(item)
        return
      }
      if (isNormalSeriousDecision(item.meta)) {
        if (this.seriousDecisionsShownThisSession >= MAX_SERIOUS_DECISIONS_PER_SESSION) continue
        if (!this.canOpenNormalDecisionNow()) {
          this.requeueDecisionFront(item)
          return
        }
      }
      const pacingOpts = this.decisionPacingOptions(item)
      if (!canConsumePacedEvent(this.state.eventPacing, item.meta, day, pacingOpts)) {
        if (isCriticalInputRequiredEvent(item.meta)) {
          this.requeueDecisionFront(item)
          return
        }
        continue
      }
      consumePacedEvent(this.state.eventPacing, item.meta, day, pacingOpts)
      if (isNormalSeriousDecision(item.meta)) this.seriousDecisionsShownThisSession++
      this.render(spec, item.key)
      return
    }
  }

  private requeueDecisionFront(item: QueuedDecision): void {
    if (this.currentDecisionKey === item.key || this.queuedDecisionKeys.has(item.key)) return
    this.queue.unshift(item)
    this.queuedDecisionKeys.add(item.key)
  }

  private canOpenNormalDecisionNow(): boolean {
    const now = this.now()
    if (now - this.sessionStartedAt < SESSION_START_DECISION_SUPPRESS_MS) return false
    const lastModalClosedAt = Math.max(this.lastDecisionClosedAtMs, this.lastExternalModalClosedAtMs)
    if (now - lastModalClosedAt < DECISION_CLOSE_GAP_MS) return false
    return this.canShowDecision()
  }

  private decisionPacingOptions(item: QueuedDecision): { firmLevel: number; seedKey: string } {
    return {
      firmLevel: this.state.highestOwnedFirmLevel(),
      seedKey: `${item.key}:${this.currentGameDay()}:${this.state.highestOwnedFirmLevel()}`,
    }
  }

  private currentGameDay(): number {
    return gameDay(this.state.gameTimeMs)
  }
  private toastParams(ev: GameEvent, meta: EventPacingMeta): QueuedToast | null {
    switch (ev.type) {
      case 'achievement':
        return { msg: `${ev.def.emoji} ${achievementName(ev.def)}`, kind: 'ok', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
      case 'milestone_reached':
        return { msg: fmt('ref_toast_milestone', { amount: fmtMoney(ev.amount) }), kind: 'ok', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
      case 'reputation_changed':
        if (ev.delta <= -5) return { msg: fmt('ref_toast_rep_down', { delta: ev.delta }), kind: 'err', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
        if (ev.delta >= 5) return { msg: fmt('ref_toast_rep_up', { delta: ev.delta }), kind: 'ok', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
        return null
      case 'illegal_raid':
        return { msg: fmt('ref_toast_raid', { fine: fmtMoney(ev.fine) }), kind: 'err', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
      case 'disease_diagnosed': {
        const dname = diseaseName(diseaseDef(ev.diseaseId))
        return { msg: fmt('ref_toast_disease_diag', { emoji: ev.emoji, name: dname }), kind: 'err', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
      }
      case 'disease_treated': {
        const dname = diseaseName(diseaseDef(ev.diseaseId))
        return { msg: fmt('ref_toast_disease_treated', { name: dname }), kind: 'ok', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ }
      }
      case 'dynasty_update':
        return ev.name ? { msg: fmt('ref_toast_dynasty', { name: ev.name }), kind: 'ok', key: meta.dedupeKey, meta, sequence: this.nextToastSequence++ } : null
      default:
        return null
    }
  }

  private enqueueToast(item: QueuedToast): void {
    const now = Date.now()
    this.pruneRuntimeToastDedupe(now)
    if (this.queuedToastKeys.has(item.key)) return
    if ((this.runtimeToast.dedupeUntilMs[item.key] ?? 0) > now) return
    this.toastQueue.push(item)
    this.queuedToastKeys.add(item.key)
    this.toastQueue.sort((a, b) => a.meta.priority - b.meta.priority || a.sequence - b.sequence)
    if (this.toastQueue.length > MAX_TOAST_QUEUE) {
      const dropped = this.toastQueue.pop()!
      this.queuedToastKeys.delete(dropped.key)
    }
    this.drainToastQueue()
  }

  private drainToastQueue(): void {
    if (this.toastDrainTimer !== null) return
    if (this.destroyed || this.overlay || this.toastQueue.length === 0) return
    const now = Date.now()
    const waitMs = Math.max(0, EVENT_TOAST_MIN_INTERVAL_MS - (now - this.runtimeToast.lastToastAtMs))
    this.toastDrainTimer = setTimeout(() => {
      this.toastDrainTimer = null
      if (this.destroyed || this.overlay || this.toastQueue.length === 0) return
      const item = this.toastQueue.shift()!
      this.queuedToastKeys.delete(item.key)
      const day = this.currentGameDay()
      if (canConsumePacedEvent(this.state.eventPacing, item.meta, day)) {
        consumePacedEvent(this.state.eventPacing, item.meta, day)
        const shownAt = Date.now()
        this.runtimeToast.lastToastAtMs = shownAt
        this.runtimeToast.dedupeUntilMs[item.key] = shownAt + EVENT_TOAST_DEDUPE_MS
        refToast(item.msg, item.kind)
      }
      this.pruneRuntimeToastDedupe(Date.now())
      this.drainToastQueue()
    }, waitMs)
  }

  private pruneRuntimeToastDedupe(now = Date.now()): void {
    for (const [key, until] of Object.entries(this.runtimeToast.dedupeUntilMs)) {
      if (!Number.isFinite(until) || until <= now) delete this.runtimeToast.dedupeUntilMs[key]
    }
  }
  /** Yaşam olayı seçeneğinin etki önizlemesi (HUD ile aynı kalemler). */
  private lifePreview(c: LifeEventChoice): string {
    const parts: string[] = []
    if (c.moneyDelta) parts.push(fmtMoney(c.moneyDelta))
    if (c.reputationDelta) parts.push(`${i18n.t('ref_preview_rep')} ${c.reputationDelta > 0 ? '+' : ''}${c.reputationDelta}`)
    if (c.stressDelta) parts.push(`${i18n.t('ref_preview_stress')} ${c.stressDelta > 0 ? '+' : ''}${c.stressDelta}`)
    if (c.healthDelta) parts.push(`${i18n.t('ref_preview_health')} ${c.healthDelta > 0 ? '+' : ''}${c.healthDelta}`)
    return parts.join(' · ')
  }

  private focusOptions(decision: FocusDecisionIdentity): DecisionOption[] {
    const s = this.state
    return [
      { label: i18n.t('ref_focus_work_label'), sub: i18n.t('ref_focus_work_sub'), resolve: () => s.applyAnnualFocus('work', decision) },
      { label: i18n.t('ref_focus_family_label'), sub: i18n.t('ref_focus_family_sub'), resolve: () => s.applyAnnualFocus('family', decision) },
      { label: i18n.t('ref_focus_health_label'), sub: i18n.t('ref_focus_health_sub'), resolve: () => s.applyAnnualFocus('health', decision) },
      { label: i18n.t('ref_focus_social_label'), sub: i18n.t('ref_focus_social_sub'), resolve: () => s.applyAnnualFocus('social', decision) },
    ]
  }

  private isLatestLifeEventUnresolved(eventId: string): boolean {
    const s = this.state
    const lastSeen = s.lifeEvents
      .filter(e => e.eventId === eventId)
      .reduce((max, e) => Math.max(max, e.seenAtGameDay), -1)
    const lastChoice = s.eventChoiceHistory
      .filter(r => r.eventId === eventId)
      .reduce((max, r) => Math.max(max, r.gameDay), -1)
    return lastSeen >= 0 && lastChoice < lastSeen
  }

  private pendingFocusDecisionExists(decision: FocusDecisionIdentity): boolean {
    return this.state.pendingDecisions.some((d) => (
      decision.type === 'annual_summary'
        ? d.type === 'annual_summary' && d.year === decision.year
        : d.type === 'age_milestone' && d.age === decision.age
    ))
  }
  private specFor(ev: GameEvent): DecisionSpec | null {
    const s = this.state
    switch (ev.type) {
      case 'crisis_started': {
        if (!s.activeCrisis || s.activeCrisis.resolved || s.activeCrisis.crisisId !== ev.crisisId) return null
        const def = crisisDef(ev.crisisId)
        return {
          emoji: def.emoji,
          title: crisisTitle(def),
          body: crisisDesc(def),
          dismissable: false,
          options: def.choices.map((choice) => ({
            label: crisisChoiceLabel(def.id, choice),
            sub: crisisChoiceDesc(def.id, choice),
            resolve: () => {
              const live = s.activeCrisis
              if (!live || live.resolved || live.crisisId !== ev.crisisId) return false
              const liveDef = crisisDef(live.crisisId)
              if (!liveDef.choices.some(candidate => candidate.id === choice.id)) return false
              return s.resolveCrisis(choice.id)
            },
          })),
        }
      }
      case 'life_event_triggered': {
        const def = ev.eventDef
        if (!this.isLatestLifeEventUnresolved(def.id)) return null
        return {
          emoji: def.emoji,
          title: lifeEventTitle(def),
          body: lifeEventDesc(def),
          dismissable: false,
          options: def.choices.map((c) => ({
            label: `${c.emoji} ${lifeChoiceLabel(def.id, c)}`,
            sub: this.lifePreview(c),
            resolve: () => {
              const choice = def.choices.find((candidate) => candidate.id === c.id)
              if (!choice || !this.isLatestLifeEventUnresolved(def.id)) return false
              s.resolveLifeEventChoice(def.id, choice.id)
              return true
            },
          })),
        }
      }
      case 'marriage_crisis': {
        const renderedSpouseId = s.dynasty.spouseId
        if (!renderedSpouseId || !s.pendingDecisions.some(d => d.type === 'marriage_crisis' && d.spouseId === renderedSpouseId)) return null
        const canResolveRenderedMarriage = (): boolean =>
          s.dynasty.spouseId === renderedSpouseId
          && s.pendingDecisions.some(
            decision =>
              decision.type === 'marriage_crisis'
              && decision.spouseId === renderedSpouseId,
          )
        const name = s.dynasty.spouseName ?? i18n.t('ref_marriage_crisis_spouse_fallback')
        return {
          emoji: '💔',
          title: i18n.t('ref_marriage_crisis_title'),
          body: fmt('ref_marriage_crisis_body', { name }),
          dismissable: false,
          options: [
            {
              label: i18n.t('ref_marriage_crisis_gift_label'),
              sub: i18n.t('ref_marriage_crisis_gift_sub'),
              resolve: () => {
                if (!canResolveRenderedMarriage()) return false
                s.resolveMarriageCrisis(true)
                return true
              },
            },
            {
              label: i18n.t('ref_marriage_crisis_time_label'),
              sub: i18n.t('ref_marriage_crisis_time_sub'),
              resolve: () => {
                if (!canResolveRenderedMarriage()) return false
                s.resolveMarriageCrisis(false)
                return true
              },
            },
          ],
        }
      }
      case 'annual_summary': {
        const decision = { type: 'annual_summary' as const, year: ev.year }
        if (!this.pendingFocusDecisionExists(decision)) return null
        return {
          emoji: '📅',
          title: fmt('ref_annual_title', { year: ev.year }),
          body: fmt('ref_annual_body', { age: ev.playerAge, biz: ev.businessCount, income: fmtMoney(ev.incomePerDay) }),
          dismissable: false,
          options: this.focusOptions(decision),
        }
      }
      case 'age_milestone': {
        const decision = { type: 'age_milestone' as const, age: ev.age }
        if (!this.pendingFocusDecisionExists(decision)) return null
        return {
          emoji: '🎂',
          title: `${ev.age} ${i18n.t('ref_age_suffix')}`,
          body: ev.question,
          dismissable: false,
          options: this.focusOptions(decision),
        }
      }
      case 'rival_event': {
        const e = s.activeRivalEvents.find((event) => event.id === ev.event.id)
        if (!e || e.expiresAtDay <= this.currentGameDay()) return null
        return {
          emoji: '⚔️',
          title: e.rivalName,
          body: `${e.headline} — ${e.description}<br><b>${i18n.t('ref_rival_risk_label')}</b> ${fmt('ref_rival_rep_damage', { amount: e.reputationDamage })} · ${fmtMoney(e.moneyDamage)}`,
          dismissable: false,
          options: e.responses.map((r) => ({
            label: `${r.emoji} ${r.label}`,
            sub: [r.cost > 0 ? fmtMoney(r.cost) : null, r.reputationDelta !== 0 ? `${i18n.t('ref_preview_rep')} ${r.reputationDelta > 0 ? '+' : ''}${r.reputationDelta}` : null].filter(Boolean).join(' · '),
            resolve: () => {
              const live = s.activeRivalEvents.find((event) => event.id === e.id)
              if (!live || live.expiresAtDay <= this.currentGameDay()) return false
              if (!live.responses.some((response) => response.id === r.id)) return false
              s.resolveRivalEvent(live.id, r.id)
              return true
            },
          })),
        }
      }
    }
    return null
  }
  private showActionable(ev: GameEvent, meta: EventPacingMeta): void {
    if (ev.type !== 'undo_available') return
    const u = this.state.pendingUndo
    if (!u || u.id !== ev.undoId || Date.now() > u.expiresAt) return
    if (this.undoBannerKey === meta.dedupeKey && this.undoBanner) return
    const day = this.currentGameDay()
    if (!canConsumePacedEvent(this.state.eventPacing, meta, day)) return
    consumePacedEvent(this.state.eventPacing, meta, day)
    this.renderUndoBanner(ev, meta.dedupeKey)
  }

  private renderUndoBanner(ev: Extract<GameEvent, { type: 'undo_available' }>, key: string): void {
    this.clearUndoBanner()
    const banner = document.createElement('div')
    banner.className = 'ref-rival-offer-banner'
    banner.style.position = 'fixed'
    banner.style.left = '50%'
    banner.style.bottom = 'calc(78px + env(safe-area-inset-bottom))'
    banner.style.width = 'min(420px, calc(100vw - 28px))'
    banner.style.margin = '0'
    banner.style.transform = 'translateX(-50%)'
    banner.style.zIndex = '3200'
    banner.innerHTML = `
      <div class="ref-rival-offer-banner__head">↩️ ${i18n.t('ref_undo_modal_title')}</div>
      <div class="ref-rival-offer-banner__msg">${ev.label}</div>
      <div class="ref-rival-offer-banner__actions">
        <button class="ref-world-btn" type="button" data-action="undo_exec">${fmt('ref_undo_confirm_label', { cost: fmtMoney(ev.cost) })}</button>
        <button class="ref-world-btn danger" type="button" data-action="undo_dismiss">${i18n.t('ref_undo_dismiss_label')}</button>
      </div>`
    banner.querySelector<HTMLButtonElement>('[data-action="undo_exec"]')?.addEventListener('click', () => {
      const pending = this.state.pendingUndo
      if (!pending || pending.id !== ev.undoId || Date.now() > pending.expiresAt) {
        this.clearUndoBanner()
        return
      }
      const ok = this.state.executeUndo()
      if (ok) {
        this.onResolved()
        refToast(fmt('ref_undo_confirm_label', { cost: fmtMoney(ev.cost) }), 'ok')
        this.clearUndoBanner()
      } else {
        refToast(i18n.t('ref_action_failed'), 'err')
      }
    })
    banner.querySelector<HTMLButtonElement>('[data-action="undo_dismiss"]')?.addEventListener('click', () => {
      const pending = this.state.pendingUndo
      if (!pending || pending.id !== ev.undoId || Date.now() > pending.expiresAt) {
        this.clearUndoBanner()
        return
      }
      this.state.dismissUndo()
      this.onResolved()
      this.clearUndoBanner()
    })
    this.undoBanner = banner
    this.undoBannerKey = key
    document.body.appendChild(banner)
    const ttl = Math.max(0, (this.state.pendingUndo?.expiresAt ?? Date.now()) - Date.now())
    this.undoBannerTimer = setTimeout(() => this.clearUndoBanner(), ttl)
  }

  private clearUndoBanner(): void {
    if (this.undoBannerTimer !== null) {
      clearTimeout(this.undoBannerTimer)
      this.undoBannerTimer = null
    }
    this.undoBanner?.remove()
    this.undoBanner = null
    this.undoBannerKey = null
  }
  private render(spec: DecisionSpec, key: string): void {
    const overlay = document.createElement('div')
    overlay.className = 'ref-decision-overlay'
    this.decisionBusy = false
    this.decisionInputLockedUntilMs = this.now() + DECISION_INPUT_LOCK_MS
    overlay.innerHTML = `
      <div class="ref-decision-card" role="dialog" aria-modal="true">
        ${spec.dismissable ? `<button class="ref-decision-close" type="button" aria-label="${i18n.t('ref_decision_close')}">✕</button>` : ''}
        <div class="ref-decision-emoji">${spec.emoji}</div>
        <h2 class="ref-decision-title">${spec.title}</h2>
        <p class="ref-decision-body">${spec.body}</p>
        <div class="ref-decision-options"></div>
      </div>
    `
    for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'] as const) {
      overlay.addEventListener(type, (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
      })
    }
    const optWrap = overlay.querySelector('.ref-decision-options')!
    spec.options.forEach((opt) => {
      const b = document.createElement('button')
      b.className = 'ref-decision-opt'
      b.type = 'button'
      b.disabled = true
      b.innerHTML = `<span>${opt.label}</span>${opt.sub ? `<span class="ref-decision-opt__sub">${opt.sub}</span>` : ''}`
      b.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        if (this.decisionBusy || this.now() < this.decisionInputLockedUntilMs) return
        this.decisionBusy = true
        this.setDecisionOptionsDisabled(true)
        let ok = false
        try {
          ok = opt.resolve()
        } catch (err) {
          console.error('Ref decision resolve failed:', err)
        }
        if (ok) {
          this.onResolved()
          this.close(true)
        } else {
          this.decisionBusy = false
          this.setDecisionOptionsDisabled(false)
          refToast(i18n.t('ref_action_failed'), 'err')
        }
      })
      optWrap.appendChild(b)
    })
    overlay.querySelector('.ref-decision-close')?.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.decisionBusy || this.now() < this.decisionInputLockedUntilMs) return
      this.close(false)
    })
    this.currentDecisionKey = key
    this.overlay = overlay
    document.body.appendChild(overlay)
    this.decisionUnlockTimer = setTimeout(() => {
      this.decisionUnlockTimer = null
      if (!this.overlay || this.decisionBusy) return
      this.setDecisionOptionsDisabled(false)
    }, DECISION_INPUT_LOCK_MS)
  }

  private close(syncPersistent: boolean): void {
    if (this.decisionUnlockTimer !== null) {
      clearTimeout(this.decisionUnlockTimer)
      this.decisionUnlockTimer = null
    }
    this.overlay?.remove()
    this.overlay = null
    this.currentDecisionKey = null
    this.decisionBusy = false
    this.decisionInputLockedUntilMs = 0
    this.lastDecisionClosedAtMs = this.now()
    if (syncPersistent) this.syncPersistentDecisions()
    this.drainToastQueue()
    this.pump()
  }

  private setDecisionOptionsDisabled(disabled: boolean): void {
    this.overlay?.querySelectorAll<HTMLButtonElement>('.ref-decision-opt, .ref-decision-close')
      .forEach((btn) => { btn.disabled = disabled })
  }

  destroy(): void {
    this.destroyed = true
    if (this.toastDrainTimer !== null) {
      clearTimeout(this.toastDrainTimer)
      this.toastDrainTimer = null
    }
    if (this.decisionUnlockTimer !== null) {
      clearTimeout(this.decisionUnlockTimer)
      this.decisionUnlockTimer = null
    }
    this.clearUndoBanner()
    this.overlay?.remove()
    this.overlay = null
    this.currentDecisionKey = null
    this.queue = []
    this.queuedDecisionKeys.clear()
    this.toastQueue = []
    this.queuedToastKeys.clear()
  }
}
