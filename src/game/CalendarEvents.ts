export type CalendarEventId =
  | 'new_year'
  | 'republic_day'
  | 'ramadan'
  | 'monday_market'
  | 'bayram'
  | 'summer'
  | 'winter'
  | 'labor_day'
  | 'childrens_day'

export interface CalendarEventDef {
  id: CalendarEventId
  name: string
  emoji: string
  headline: string
  passiveMult?: number
  clickMult?: number
  politicsMult?: number
  retailMult?: number
  tourismMult?: number
  textileMult?: number
  firstPurchaseDiscount?: number
  freeChest?: boolean
}

export function activeCalendarEvents(now = new Date()): CalendarEventDef[] {
  const out: CalendarEventDef[] = []
  const m = now.getMonth() + 1
  const d = now.getDate()
  const dow = now.getDay()

  // Yılbaşı
  if (m === 1 && d === 1) {
    out.push({
      id: 'new_year',
      name: 'Yılbaşı',
      emoji: '🎆',
      headline: 'Yılbaşı — tüm gelirler bugün 1.25 kat!',
      passiveMult: 1.25,
      clickMult: 1.25,
      freeChest: true,
    })
  }

  // 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı
  if (m === 4 && d === 23) {
    out.push({
      id: 'childrens_day',
      name: '23 Nisan',
      emoji: '🧒',
      headline: '23 Nisan — eğitim ve spor işletmeleri güçlü!',
      passiveMult: 1.2,
    })
  }

  // 1 Mayıs İşçi Bayramı
  if (m === 5 && d === 1) {
    out.push({
      id: 'labor_day',
      name: 'İşçi Bayramı',
      emoji: '✊',
      headline: '1 Mayıs — pasif gelirler x1.5, yönetici indirimi!',
      passiveMult: 1.5,
    })
  }

  // 29 Ekim Cumhuriyet Bayramı
  if (m === 10 && d === 29) {
    out.push({
      id: 'republic_day',
      name: 'Cumhuriyet Bayramı',
      emoji: '🇹🇷',
      headline: '29 Ekim — siyasi işletmeler x3 kazanıyor!',
      politicsMult: 3,
    })
  }

  // Ramazan yaklaşık Mart-Nisan
  if ((m === 3 && d >= 10) || (m === 4 && d <= 15)) {
    out.push({
      id: 'ramadan',
      name: 'Ramazan',
      emoji: '🌙',
      headline: 'Ramazan — restoran ve market zincirleri x1.5 güçlü',
      retailMult: 1.5,
    })
  }

  // Bayram (Nisan ortası 3 gün)
  if (m === 4 && d >= 10 && d <= 12) {
    out.push({
      id: 'bayram',
      name: 'Ramazan Bayramı',
      emoji: '🎉',
      headline: 'Bayram! Tüm işletmeler x2 kazanıyor + ücretsiz sandık!',
      passiveMult: 2,
      clickMult: 2,
      freeChest: true,
    })
  }

  // Yaz (Haziran-Ağustos): turizm güçlü
  if (m >= 6 && m <= 8) {
    out.push({
      id: 'summer',
      name: 'Yaz Sezonu',
      emoji: '☀️',
      headline: 'Yaz sezonu — turizm ve tatil işletmeleri x1.8!',
      tourismMult: 1.8,
    })
  }

  // Kış (Aralık-Şubat): tekstil ve ısınma güçlü
  if (m === 12 || m <= 2) {
    out.push({
      id: 'winter',
      name: 'Kış Sezonu',
      emoji: '❄️',
      headline: 'Kış sezonu — tekstil ve giyim x1.4 güçlü!',
      textileMult: 1.4,
    })
  }

  // Pazartesi borsa açılışı
  if (dow === 1) {
    out.push({
      id: 'monday_market',
      name: 'Borsa Açılışı',
      emoji: '📈',
      headline: 'Pazartesi — ilk işletme alımı %15 indirimli!',
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

export function calendarTourismMult(now = new Date()): number {
  let m = 1
  for (const e of activeCalendarEvents(now)) {
    if (e.tourismMult) m *= e.tourismMult
  }
  return m
}

export function calendarTextileMult(now = new Date()): number {
  let m = 1
  for (const e of activeCalendarEvents(now)) {
    if (e.textileMult) m *= e.textileMult
  }
  return m
}

export function hasFreeChestToday(now = new Date()): boolean {
  return activeCalendarEvents(now).some((e) => e.freeChest)
}
