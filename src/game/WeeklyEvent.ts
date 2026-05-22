import { calendarWeekKey } from './dateUtils'

export type WeeklyModifierType =
  | 'logistics_boost'
  | 'click_marathon'
  | 'ecommerce_week'
  | 'research_sale'
  | 'synergy_week'

export interface WeeklyEventDef {
  id: WeeklyModifierType
  name: string
  description: string
  producerId?: string
  bonus?: number
  comboCapMult?: number
}

export const WEEKLY_EVENTS: WeeklyEventDef[] = [
  { id: 'logistics_boost', name: 'Lojistik Haftası', description: 'Lojistik geliri +50%', producerId: 'fabrika', bonus: 0.5 },
  { id: 'click_marathon', name: 'Tıklama Maratonu', description: 'Combo cap x2', comboCapMult: 2 },
  { id: 'ecommerce_week', name: 'E-ticaret Haftası', description: 'E-ticaret geliri +50%', producerId: 'robot', bonus: 0.5 },
  { id: 'research_sale', name: 'Ar-Ge Festivali', description: 'Ar-Ge maliyeti -30%', bonus: 0.3 },
  { id: 'synergy_week', name: 'Sinerji Zirvesi', description: 'Tüm sinerjiler x2', bonus: 1 },
]

export interface WeeklyEventState {
  weekKey: string
  eventId: WeeklyModifierType
  /** Bu hafta kazanılan para (hedefe doğru) */
  progress: number
  /** Para hedefi — hafta başında gelire göre ölçeklenir */
  target: number
  claimed: boolean
  adDoubled: boolean
}

export const WEEKLY_EARN_MIN = 250_000
/** ~7–15 dk pasif oynama süresine denk hedef */
export const WEEKLY_EARN_IPD_MULT = 400

export function scaledWeeklyTarget(incomePerDay: number): number {
  return Math.max(WEEKLY_EARN_MIN, Math.floor(incomePerDay * WEEKLY_EARN_IPD_MULT))
}

/** @deprecated calendarWeekKey kullan */
export function weekKey(): string {
  return calendarWeekKey()
}

export function pickWeeklyEvent(seed: string): WeeklyEventDef {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return WEEKLY_EVENTS[Math.abs(h) % WEEKLY_EVENTS.length]!
}

export function createWeeklyState(incomePerDay = 0): WeeklyEventState {
  const key = calendarWeekKey()
  const event = pickWeeklyEvent(key)
  return {
    weekKey: key,
    eventId: event.id,
    progress: 0,
    target: scaledWeeklyTarget(incomePerDay),
    claimed: false,
    adDoubled: false,
  }
}

export function getWeeklyDef(state: WeeklyEventState): WeeklyEventDef {
  return WEEKLY_EVENTS.find((e) => e.id === state.eventId) ?? WEEKLY_EVENTS[0]!
}

/** Eski oyun-haftası anahtarı (gw0, gw1…) — kayıt migrasyonu */
export function isLegacyGameWeekKey(key: string): boolean {
  return key.startsWith('gw')
}
