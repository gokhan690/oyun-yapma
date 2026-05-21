const SESSION_KEY = 'ii_owner_session'
const SESSION_TS = 'ii_owner_session_ts'
const SESSION_MAX_MS = 8 * 60 * 60 * 1000

function configuredPin(): string {
  const pin = import.meta.env.VITE_OWNER_PIN as string | undefined
  if (pin && pin.trim().length >= 4) return pin.trim()
  if (import.meta.env.DEV) return 'baron2026'
  return ''
}

/** Gizli panel her zaman açılabilir; PIN ayrı kontrol edilir. */
export function isOwnerPanelEnabled(): boolean {
  return true
}

export function isOwnerPinConfigured(): boolean {
  return configuredPin().length >= 4
}

export function verifyOwnerPin(pin: string): boolean {
  const expected = configuredPin()
  if (!expected) return false
  return pin.trim() === expected
}

export function isOwnerSession(): boolean {
  if (!isOwnerPinConfigured()) return false
  const ok = sessionStorage.getItem(SESSION_KEY) === '1'
  if (!ok) return false
  const ts = Number(sessionStorage.getItem(SESSION_TS) ?? 0)
  if (Date.now() - ts > SESSION_MAX_MS) {
    clearOwnerSession()
    return false
  }
  return true
}

export function startOwnerSession(): void {
  sessionStorage.setItem(SESSION_KEY, '1')
  sessionStorage.setItem(SESSION_TS, String(Date.now()))
}

export function clearOwnerSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_TS)
}

export function refreshOwnerSession(): void {
  if (isOwnerSession()) {
    sessionStorage.setItem(SESSION_TS, String(Date.now()))
  }
}
