import type { GameEvent } from './GameState'
import type { CrisisId } from './CrisisEvents'
import type { RivalEventKind } from './Rivals'

export type EventCategory =
  | 'critical_decision'
  | 'financial'
  | 'career'
  | 'health'
  | 'rival'
  | 'war'
  | 'price_war'
  | 'lawsuit'
  | 'firm'
  | 'informational'

export interface EventPacingMeta {
  category: EventCategory
  // Lower number means higher priority.
  priority: EventPriority
  dedupeKey: string
  cooldownDays: number
  requiresInput: boolean
  mayInterrupt: boolean
  showInRecentActivities: boolean
  majorFamily?: string
  actionable?: boolean
}

export interface EventPacingState {
  lastByDedupeKey: Record<string, number>
  lastByFamily: Record<string, number>
  majorByDay: Record<string, number>
}

export interface RuntimeToastPacingState {
  lastToastAtMs: number
  dedupeUntilMs: Record<string, number>
}

export const EVENT_TOAST_MIN_INTERVAL_MS = 1800
export const EVENT_TOAST_DEDUPE_MS = 6000
export const EVENT_MAJOR_PER_DAY_LIMIT = 1
export const EVENT_PACING_RETENTION_DAYS = 90
export const EVENT_MAJOR_BY_DAY_COUNT_CAP = 8
export const EVENT_MAJOR_FINANCIAL_CRISIS_COOLDOWN_DAYS = 3

export const EVENT_PRIORITY = {
  immediateDecision: 1,
  majorDecision: 2,
  importantDecision: 3,
  optionalAction: 4,
  importantToast: 5,
  ordinaryToast: 6,
  activityOnly: 7,
  informational: 8,
  silent: 9,
} as const

export type EventPriority = typeof EVENT_PRIORITY[keyof typeof EVENT_PRIORITY]

export const EVENT_CATEGORY_COOLDOWNS: Record<EventCategory, number> = {
  critical_decision: 1,
  financial: 0,
  career: 0,
  health: 2,
  rival: 3,
  war: 5,
  price_war: 4,
  lawsuit: 6,
  firm: 0,
  informational: 0,
}

const MAJOR_CATEGORIES: EventCategory[] = [
  'critical_decision',
  'financial',
  'health',
  'rival',
  'war',
  'price_war',
  'lawsuit',
]

export function createEventPacingState(): EventPacingState {
  return {
    lastByDedupeKey: {},
    lastByFamily: {},
    majorByDay: {},
  }
}

export function createRuntimeToastPacingState(): RuntimeToastPacingState {
  return {
    lastToastAtMs: 0,
    dedupeUntilMs: {},
  }
}

export function sanitizeEventPacingState(
  data: Partial<EventPacingState> | null | undefined,
  currentDay: number,
): EventPacingState {
  const state: EventPacingState = {
    lastByDedupeKey: sanitizeDayValueMap(data?.lastByDedupeKey),
    lastByFamily: sanitizeDayValueMap(data?.lastByFamily),
    majorByDay: sanitizeMajorByDayMap(data?.majorByDay),
  }

  if (isValidGameDay(currentDay)) {
    pruneEventPacingState(state, currentDay)
  }

  return state
}

export function pruneEventPacingState(state: EventPacingState, currentDay: number): void {
  if (!isValidGameDay(currentDay)) return

  const minDay = currentDay - EVENT_PACING_RETENTION_DAYS
  pruneDayValueMap(state.lastByDedupeKey, minDay)
  pruneDayValueMap(state.lastByFamily, minDay)
  pruneMajorByDayMap(state.majorByDay, minDay)
}

function isValidGameDay(day: number): boolean {
  return Number.isFinite(day) && Number.isInteger(day) && day >= 0
}

function sanitizeDayValueMap(map: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!map) return out
  for (const [key, day] of Object.entries(map)) {
    if (isValidGameDay(day)) out[key] = day
  }
  return out
}

function sanitizeMajorByDayMap(map: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!map) return out
  for (const [key, count] of Object.entries(map)) {
    const recordedDay = Number(key)
    if (!isValidGameDay(recordedDay)) continue
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) continue
    out[String(recordedDay)] = Math.min(count, EVENT_MAJOR_BY_DAY_COUNT_CAP)
  }
  return out
}

function pruneDayValueMap(map: Record<string, number>, minDay: number): void {
  for (const [key, day] of Object.entries(map)) {
    if (!isValidGameDay(day) || day < minDay) delete map[key]
  }
}

function pruneMajorByDayMap(map: Record<string, number>, minDay: number): void {
  for (const key of Object.keys(map)) {
    const recordedDay = Number(key)
    if (!isValidGameDay(recordedDay) || recordedDay < minDay) {
      delete map[key]
    }
  }
}

export function isMajorEventCategory(category: EventCategory): boolean {
  return MAJOR_CATEGORIES.includes(category)
}

function consumesMajorDailyQuota(meta: EventPacingMeta): boolean {
  return meta.requiresInput
    && meta.mayInterrupt
    && isMajorEventCategory(meta.category)
    && meta.majorFamily != null
}

export function crisisEventCategory(id: CrisisId): EventCategory {
  if (id === 'rival_attack') return 'war'
  if (id === 'economic') return 'financial'
  // CrisisEvents.ts defines scandal as a political/media scandal with lobby,
  // fine, or denial choices. It is not a legal proceeding/lawsuit event.
  if (id === 'scandal') return 'critical_decision'
  return 'critical_decision'
}

export function rivalEventCategory(kind: RivalEventKind): EventCategory {
  switch (kind) {
    case 'market_manipulation':
      return 'financial'
    case 'business_competition':
    case 'media_scandal':
    case 'political_lobbying':
      return 'rival'
  }
}

export function getEventPacingMeta(ev: GameEvent): EventPacingMeta {
  switch (ev.type) {
    case 'crisis_started': {
      const category = crisisEventCategory(ev.crisisId)
      return {
        category,
        priority: EVENT_PRIORITY.immediateDecision,
        dedupeKey: `crisis:${ev.crisisId}`,
        cooldownDays: ev.crisisId === 'economic'
          ? EVENT_MAJOR_FINANCIAL_CRISIS_COOLDOWN_DAYS
          : EVENT_CATEGORY_COOLDOWNS[category],
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: category === 'war'
          ? 'war'
          : category === 'financial'
            ? 'major_financial_crisis'
            : 'major_crisis',
      }
    }

    case 'rival_event': {
      const category = rivalEventCategory(ev.event.kind)
      return {
        category,
        priority: EVENT_PRIORITY.majorDecision,
        dedupeKey: `rival:${ev.event.id}`,
        cooldownDays: category === 'financial'
          ? EVENT_CATEGORY_COOLDOWNS.rival
          : EVENT_CATEGORY_COOLDOWNS[category],
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: category === 'financial' ? 'rival_financial' : 'rival',
      }
    }

    case 'life_event_triggered':
      return {
        category: 'critical_decision',
        priority: EVENT_PRIORITY.majorDecision,
        dedupeKey: `life:${ev.eventDef.id}`,
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.critical_decision,
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: 'life_decision',
      }

    case 'marriage_crisis':
      return {
        category: 'critical_decision',
        priority: EVENT_PRIORITY.majorDecision,
        dedupeKey: 'decision:marriage_crisis',
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.critical_decision,
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: 'family_decision',
      }

    case 'annual_summary':
      return {
        category: 'critical_decision',
        priority: EVENT_PRIORITY.importantDecision,
        dedupeKey: `annual:${ev.year}`,
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.critical_decision,
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: 'annual_focus',
      }

    case 'age_milestone':
      return {
        category: 'critical_decision',
        priority: EVENT_PRIORITY.importantDecision,
        dedupeKey: `age:${ev.age}`,
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.critical_decision,
        requiresInput: true,
        mayInterrupt: true,
        showInRecentActivities: true,
        majorFamily: 'age_decision',
      }

    case 'undo_available':
      return {
        category: 'firm',
        priority: EVENT_PRIORITY.optionalAction,
        dedupeKey: `undo:${ev.undoId}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: false,
        actionable: true,
      }

    case 'illegal_raid':
      return {
        category: 'financial',
        priority: EVENT_PRIORITY.importantToast,
        dedupeKey: `raid:${ev.producerId}`,
        cooldownDays: 1,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'disease_diagnosed':
      return {
        category: 'health',
        priority: EVENT_PRIORITY.importantToast,
        dedupeKey: `disease:${ev.diseaseId}`,
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.health,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
        majorFamily: 'health',
      }

    case 'disease_treated':
      return {
        category: 'health',
        priority: EVENT_PRIORITY.ordinaryToast,
        dedupeKey: `disease_treated:${ev.diseaseId}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'achievement':
      return {
        category: 'informational',
        priority: EVENT_PRIORITY.importantToast,
        dedupeKey: `achievement:${ev.def.id}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'milestone_reached':
      return {
        category: 'informational',
        priority: EVENT_PRIORITY.importantToast,
        dedupeKey: `milestone:${ev.amount}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'reputation_changed':
      return {
        category: 'informational',
        priority: EVENT_PRIORITY.ordinaryToast,
        dedupeKey: `reputation:${ev.delta > 0 ? 'up' : 'down'}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'dynasty_update':
      return {
        category: 'informational',
        priority: EVENT_PRIORITY.ordinaryToast,
        dedupeKey: `dynasty:${ev.kind}:${ev.name ?? ''}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }
    case 'career_action':
    case 'career_wage':
    case 'career_day_reset':
      return {
        category: 'career',
        priority: EVENT_PRIORITY.ordinaryToast,
        dedupeKey: ev.type,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: ev.type !== 'career_day_reset',
      }

    case 'manager_hired':
      return {
        category: 'firm',
        priority: EVENT_PRIORITY.ordinaryToast,
        dedupeKey: `manager:${ev.producerId}`,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: true,
      }

    case 'day_settled':
    case 'passive_income':
    case 'money_changed':
    case 'finance_tick':
      return {
        category: 'financial',
        priority: EVENT_PRIORITY.activityOnly,
        dedupeKey: ev.type,
        cooldownDays: 0,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: ev.type === 'day_settled',
      }

    default:
      return {
        category: 'informational',
        priority: EVENT_PRIORITY.informational,
        dedupeKey: ev.type,
        cooldownDays: EVENT_CATEGORY_COOLDOWNS.informational,
        requiresInput: false,
        mayInterrupt: false,
        showInRecentActivities: false,
      }
  }
}

/**
 * For input-required events, false means defer/queue the unresolved decision.
 * It must never be silently discarded.
 * Non-critical informational events may instead be collapsed or summarized.
 */
export function canConsumePacedEvent(
  state: EventPacingState,
  meta: EventPacingMeta,
  day: number,
): boolean {
  pruneEventPacingState(state, day)
  if (!isValidGameDay(day)) return true

  const lastKeyDay = state.lastByDedupeKey[meta.dedupeKey]
  if (lastKeyDay != null && day - lastKeyDay < meta.cooldownDays) return false

  if (meta.majorFamily) {
    const lastFamilyDay = state.lastByFamily[meta.majorFamily]
    if (lastFamilyDay != null && day - lastFamilyDay < meta.cooldownDays) return false
  }

  if (consumesMajorDailyQuota(meta)) {
    const todayCount = state.majorByDay[String(day)] ?? 0
    if (todayCount >= EVENT_MAJOR_PER_DAY_LIMIT) return false
  }

  return true
}

export function consumePacedEvent(state: EventPacingState, meta: EventPacingMeta, day: number): void {
  pruneEventPacingState(state, day)
  if (!isValidGameDay(day)) return

  state.lastByDedupeKey[meta.dedupeKey] = day
  if (meta.majorFamily) state.lastByFamily[meta.majorFamily] = day

  if (consumesMajorDailyQuota(meta)) {
    const key = String(day)
    const nextCount = (state.majorByDay[key] ?? 0) + 1
    state.majorByDay[key] = Math.min(nextCount, EVENT_MAJOR_BY_DAY_COUNT_CAP)
  }
}
