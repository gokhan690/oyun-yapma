import type { GameState, GameEvent } from '../../game/GameState'
import { crisisDef, crisisTitle, crisisDesc, crisisChoiceLabel, crisisChoiceDesc } from '../../game/CrisisEvents'
import { LIFE_EVENTS, lifeEventTitle, lifeEventDesc, lifeChoiceLabel } from '../../game/LifeEvents'
import type { LifeEventChoice } from '../../game/LifeEvents'
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

interface QueuedToast {
  msg: string
  kind: 'ok' | 'err'
  key?: string
}

export class RefNotificationBridge {
  private readonly state: GameState
  /** Başarılı karar sonrası: aktif sayfayı tazele + kaydet. */
  private readonly onResolved: () => void
  private queue: GameEvent[] = []
  private overlay: HTMLElement | null = null
  private toastQueue: QueuedToast[] = []
  private toastDrainTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(state: GameState, onResolved: () => void) {
    this.state = state
    this.onResolved = onResolved
  }

  /**
   * Reload sonrası yeniden gösterim. Bootstrap'ta bir kez çağrılır (reward
   * kuyruğu boşaldıktan sonra → tek modal kuralı korunur).
   *
   * Sıra:
   *  1. Aktif kriz (activeCrisis)
   *  2. Aktif rakip saldırıları (activeRivalEvents[0])
   *  3. Bekleyen geri alma (pendingUndo, süresi dolmamışsa)
   *  4. Çözümlenmemiş yaşam olayları (lifeEvents − eventChoiceHistory)
   *  5. pendingDecisions (marriage_crisis / annual_summary / age_milestone)
   */
  start(): void {
    if (this.destroyed) return
    const s = this.state

    if (s.activeCrisis && !s.activeCrisis.resolved) {
      this.enqueueCritical({ type: 'crisis_started', crisisId: s.activeCrisis.crisisId, title: crisisTitle(crisisDef(s.activeCrisis.crisisId)) })
    }
    if (s.activeRivalEvents.length > 0) {
      this.enqueueCritical({ type: 'rival_event', event: s.activeRivalEvents[0]! })
    }
    const u = s.pendingUndo
    if (u && Date.now() <= u.expiresAt) {
      this.enqueueCritical({ type: 'undo_available', label: u.label, cost: u.cost, undoId: u.id })
    }

    // Çözümlenmemiş yaşam olayları: lifeEvents içinde olup eventChoiceHistory'de seçim
    // yapılmamış (latestChoice < latestSeen). Aynı definition ID'li tekrarlayan event'ler
    // için her occurrence'ın en güncel seenAtGameDay'i ile en güncel choiceGameDay'i karşılaştırılır.
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
        // Definition bulunamazsa sessizce atla — uygulama kilitlenmez
        if (def) this.enqueueCritical({ type: 'life_event_triggered', eventDef: def })
      }
    }

    // Serialize edilmiş bekleyen karar olayları (marriage/annual/age).
    // marriage_crisis: spouseId kontrolü — evlilik bitmişse veya eş değişmişse atla.
    for (const pd of s.pendingDecisions) {
      if (pd.type === 'marriage_crisis') {
        if (!s.dynasty.spouseId || pd.spouseId !== s.dynasty.spouseId) continue
      }
      this.enqueueCritical(pd as GameEvent)
    }
  }

  /** RefApp aboneliğinden her event için çağrılır; köprü yalnız ilgili olanlara tepki verir. */
  handle(ev: GameEvent): void {
    if (this.destroyed) return
    if (this.isCritical(ev.type)) {
      this.enqueueCritical(ev)
      return
    }
    const p = this.toastParams(ev)
    if (!p) return
    if (this.overlay) {
      // Modal açık → kuyruğa al (dedup key + sınır 8)
      if (p.key && this.toastQueue.some(t => t.key === p.key)) return
      if (this.toastQueue.length < 8) this.toastQueue.push(p)
      return
    }
    refToast(p.msg, p.kind)
  }

  // ─────────── Toast parametreleri ───────────
  private toastParams(ev: GameEvent): QueuedToast | null {
    switch (ev.type) {
      case 'achievement':
        return { msg: `${ev.def.emoji} ${achievementName(ev.def)}`, kind: 'ok', key: `ach:${ev.def.id}` }
      case 'milestone_reached':
        return { msg: fmt('ref_toast_milestone', { amount: fmtMoney(ev.amount) }), kind: 'ok', key: `ms:${ev.amount}` }
      case 'reputation_changed':
        if (ev.delta <= -5) return { msg: fmt('ref_toast_rep_down', { delta: ev.delta }), kind: 'err' }
        if (ev.delta >= 5) return { msg: fmt('ref_toast_rep_up', { delta: ev.delta }), kind: 'ok' }
        return null
      case 'illegal_raid':
        return { msg: fmt('ref_toast_raid', { fine: fmtMoney(ev.fine) }), kind: 'err' }
      case 'disease_diagnosed': {
        const dname = diseaseName(diseaseDef(ev.diseaseId))
        return { msg: fmt('ref_toast_disease_diag', { emoji: ev.emoji, name: dname }), kind: 'err', key: `dis:${ev.diseaseId}` }
      }
      case 'disease_treated': {
        const dname = diseaseName(diseaseDef(ev.diseaseId))
        return { msg: fmt('ref_toast_disease_treated', { name: dname }), kind: 'ok', key: `cured:${ev.diseaseId}` }
      }
      case 'dynasty_update':
        return ev.name ? { msg: fmt('ref_toast_dynasty', { name: ev.name }), kind: 'ok' } : null
      default:
        return null
    }
  }

  private drainToastQueue(): void {
    if (this.toastQueue.length === 0) return
    const drainNext = () => {
      this.toastDrainTimer = null
      if (this.destroyed || this.overlay || this.toastQueue.length === 0) return
      const item = this.toastQueue.shift()!
      refToast(item.msg, item.kind)
      if (this.toastQueue.length > 0) {
        this.toastDrainTimer = setTimeout(drainNext, 1950)
      }
    }
    drainNext()
  }

  // ─────────── Kritik / karar modalı ───────────
  private isCritical(type: GameEvent['type']): boolean {
    return type === 'crisis_started'
      || type === 'life_event_triggered'
      || type === 'marriage_crisis'
      || type === 'annual_summary'
      || type === 'age_milestone'
      || type === 'rival_event'
      || type === 'undo_available'
  }

  private enqueueCritical(ev: GameEvent): void {
    this.queue.push(ev)
    this.pump()
  }

  private pump(): void {
    if (this.destroyed || this.overlay) return
    const ev = this.queue.shift()
    if (!ev) return
    const spec = this.specFor(ev)
    // specFor null döndürürse (guard fail, expired, definition yok) → event atlanır, app kilitlenmez
    if (!spec) { this.pump(); return }
    this.render(spec)
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

  /** annual_summary ve age_milestone ortak odak seçenekleri (applyAnnualFocus). */
  private focusOptions(): DecisionOption[] {
    const s = this.state
    return [
      { label: i18n.t('ref_focus_work_label'), sub: i18n.t('ref_focus_work_sub'), resolve: () => { s.applyAnnualFocus('work'); return true } },
      { label: i18n.t('ref_focus_family_label'), sub: i18n.t('ref_focus_family_sub'), resolve: () => { s.applyAnnualFocus('family'); return true } },
      { label: i18n.t('ref_focus_health_label'), sub: i18n.t('ref_focus_health_sub'), resolve: () => { s.applyAnnualFocus('health'); return true } },
      { label: i18n.t('ref_focus_social_label'), sub: i18n.t('ref_focus_social_sub'), resolve: () => { s.applyAnnualFocus('social'); return true } },
    ]
  }

  /**
   * Event → modal spec. State mutation YOK — options.resolve mevcut GameState
   * resolve metotlarını çağırır. Tüm karar modalları dismissable:false → kullanıcı
   * seçim yapmadan kapatamaz.
   *
   * Guard'lar: specFor null döndürürse pump() bu event'i sessizce atlar → app kilitlenmez.
   */
  private specFor(ev: GameEvent): DecisionSpec | null {
    const s = this.state
    switch (ev.type) {
      case 'crisis_started': {
        if (!s.activeCrisis || s.activeCrisis.resolved) return null
        const def = crisisDef(ev.crisisId)
        return {
          emoji: def.emoji, title: crisisTitle(def), body: crisisDesc(def), dismissable: false,
          options: def.choices.map((c) => ({ label: crisisChoiceLabel(def.id, c), sub: crisisChoiceDesc(def.id, c), resolve: () => s.resolveCrisis(c.id) })),
        }
      }
      case 'life_event_triggered': {
        const def = ev.eventDef
        // Guard: eğer modalı göstermeden önce zaten çözümlenmiş ise (seçim >= en son görülme),
        // tekrar gösterme. Definition kaynaklı, not null here.
        const lastSeen = s.lifeEvents
          .filter(e => e.eventId === def.id)
          .reduce((max, e) => Math.max(max, e.seenAtGameDay), -1)
        const lastChoice = s.eventChoiceHistory
          .filter(r => r.eventId === def.id)
          .reduce((max, r) => Math.max(max, r.gameDay), -1)
        if (lastSeen >= 0 && lastChoice >= lastSeen) return null
        return {
          emoji: def.emoji, title: lifeEventTitle(def), body: lifeEventDesc(def), dismissable: false,
          options: def.choices.map((c) => ({
            label: `${c.emoji} ${lifeChoiceLabel(def.id, c)}`, sub: this.lifePreview(c),
            resolve: () => { s.resolveLifeEventChoice(def.id, c.id); return true },
          })),
        }
      }
      case 'marriage_crisis': {
        if (!s.dynasty.spouseId) return null
        const name = s.dynasty.spouseName ?? i18n.t('ref_marriage_crisis_spouse_fallback')
        return {
          emoji: '💔', title: i18n.t('ref_marriage_crisis_title'), body: fmt('ref_marriage_crisis_body', { name }), dismissable: false,
          options: [
            { label: i18n.t('ref_marriage_crisis_gift_label'), sub: i18n.t('ref_marriage_crisis_gift_sub'), resolve: () => { s.resolveMarriageCrisis(true); return true } },
            { label: i18n.t('ref_marriage_crisis_time_label'), sub: i18n.t('ref_marriage_crisis_time_sub'), resolve: () => { s.resolveMarriageCrisis(false); return true } },
          ],
        }
      }
      case 'annual_summary':
        return {
          emoji: '📅', title: fmt('ref_annual_title', { year: ev.year }),
          body: fmt('ref_annual_body', { age: ev.playerAge, biz: ev.businessCount, income: fmtMoney(ev.incomePerDay) }),
          dismissable: false, options: this.focusOptions(),
        }
      case 'age_milestone':
        return { emoji: '🎂', title: `${ev.age} ${i18n.t('ref_age_suffix')}`, body: ev.question, dismissable: false, options: this.focusOptions() }
      case 'rival_event': {
        const e = ev.event
        return {
          emoji: '⚔️', title: e.rivalName,
          body: `${e.headline} — ${e.description}<br><b>${i18n.t('ref_rival_risk_label')}</b> ${fmt('ref_rival_rep_damage', { amount: e.reputationDamage })} · ${fmtMoney(e.moneyDamage)}`,
          dismissable: false,
          options: e.responses.map((r) => ({
            label: `${r.emoji} ${r.label}`,
            sub: [r.cost > 0 ? fmtMoney(r.cost) : null, r.reputationDelta !== 0 ? `${i18n.t('ref_preview_rep')} ${r.reputationDelta > 0 ? '+' : ''}${r.reputationDelta}` : null].filter(Boolean).join(' · '),
            resolve: () => { s.resolveRivalEvent(e.id, r.id); return true },
          })),
        }
      }
      case 'undo_available': {
        if (!s.pendingUndo || Date.now() > s.pendingUndo.expiresAt) return null
        return {
          emoji: '↩️', title: i18n.t('ref_undo_modal_title'), body: ev.label, dismissable: false,
          options: [
            { label: `${i18n.t('ref_undo_confirm_label')} — ${fmtMoney(ev.cost)}`, resolve: () => s.executeUndo() },
            { label: i18n.t('ref_undo_dismiss_label'), resolve: () => { s.dismissUndo(); return true } },
          ],
        }
      }
    }
    return null
  }

  private render(spec: DecisionSpec): void {
    const overlay = document.createElement('div')
    overlay.className = 'ref-decision-overlay'
    overlay.innerHTML = `
      <div class="ref-decision-card" role="dialog" aria-modal="true">
        ${spec.dismissable ? `<button class="ref-decision-close" type="button" aria-label="${i18n.t('ref_decision_close')}">✕</button>` : ''}
        <div class="ref-decision-emoji">${spec.emoji}</div>
        <h2 class="ref-decision-title">${spec.title}</h2>
        <p class="ref-decision-body">${spec.body}</p>
        <div class="ref-decision-options"></div>
      </div>
    `
    const optWrap = overlay.querySelector('.ref-decision-options')!
    spec.options.forEach((opt) => {
      const b = document.createElement('button')
      b.className = 'ref-decision-opt'
      b.type = 'button'
      b.innerHTML = `<span>${opt.label}</span>${opt.sub ? `<span class="ref-decision-opt__sub">${opt.sub}</span>` : ''}`
      b.addEventListener('click', () => {
        const ok = opt.resolve()
        if (ok) {
          this.onResolved()
          this.close()
        } else {
          refToast(i18n.t('ref_action_failed'), 'err')
        }
      })
      optWrap.appendChild(b)
    })
    overlay.querySelector('.ref-decision-close')?.addEventListener('click', () => this.close())
    this.overlay = overlay
    document.body.appendChild(overlay)
  }

  private close(): void {
    this.overlay?.remove()
    this.overlay = null
    this.drainToastQueue()
    this.pump()
  }

  destroy(): void {
    this.destroyed = true
    if (this.toastDrainTimer !== null) {
      clearTimeout(this.toastDrainTimer)
      this.toastDrainTimer = null
    }
    this.overlay?.remove()
    this.overlay = null
    this.queue = []
    this.toastQueue = []
  }
}
