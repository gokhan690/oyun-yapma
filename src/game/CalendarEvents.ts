export type CalendarEventId = 'new_year' | 'republic_day' | 'ramadan' | 'monday_market'

export interface CalendarEventDef {
  id: CalendarEventId
  name: string
  emoji: string
  headline: string
  passiveMult?: number
  clickMult?: number
  politicsMult?: number
  retailMult?: number
  firstPurchaseDiscount?: number
}

export function activeCalendarEvents(now = new Date()): CalendarEventDef[] {
  const out: CalendarEventDef[] = []
  const m = now.getMonth() + 1
  const d = now.getDate()
  const dow = now.getDay()

  if (m === 1 && d === 1) {
    out.push({
      id: 'new_year',
      name: 'Yılbaşı',
      emoji: '🎆',
      headline: 'Yılbaşı — tüm gelirler bugün 2 kat!',
      passiveMult: 2,
      clickMult: 2,
    })
  }
  if (m === 10 && d === 29) {
    out.push({
      id: 'republic_day',
      name: 'Cumhuriyet Bayramı',
      emoji: '🇹🇷',
      headline: '29 Ekim — siyasi işletmeler güçlü!',
      politicsMult: 1.5,
    })
  }
  // Ramazan yaklaşık Mart-Nisan (basit pencere)
  if ((m === 3 && d >= 10) || (m === 4 && d <= 15)) {
    out.push({
      id: 'ramadan',
      name: 'Ramazan',
      emoji: '🌙',
      headline: 'Ramazan — restoran ve market zincirleri güçlü',
      retailMult: 1.35,
    })
  }
  if (dow === 1) {
    out.push({
      id: 'monday_market',
      name: 'Borsa Açılışı',
      emoji: '📈',
      headline: 'Pazartesi — ilk işletme alımı indirimli!',
      firstPurchaseDiscount: 0.15,
    })
  }
  return out
}

export function calendarPassiveMult(now = new Date()): number {
  let m = 1
  for (const e of activeCalendarEvents(now)) {
    if (e.passiveMult) m *= e.passiveMult
  }
  return m
}

export function calendarClickMult(now = new Date()): number {
  let m = 1
  for (const e of activeCalendarEvents(now)) {
    if (e.clickMult) m *= e.clickMult
  }
  return m
}
