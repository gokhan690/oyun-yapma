/** Pazartesi başlangıçlı takvim haftası (yyyy-mm-dd) */
export function calendarWeekKey(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Takvim ayı (yyyy-mm) — sezon geçişi */
export function calendarMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Bir sonraki Pazartesi'ye kalan gün (bugün dahil değil) */
export function daysUntilWeekReset(): number {
  const dow = new Date().getDay()
  if (dow === 0) return 1
  return 8 - dow
}

/** Yerel tarih anahtarı (UTC yerine) */
export function localDayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function yesterdayLocalKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isNightHour(hour: number): boolean {
  return hour >= 20 || hour < 6
}
