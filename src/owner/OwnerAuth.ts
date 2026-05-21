import {
  configuredPinHash,
  isOwnerPinConfigured,
  verifyOwnerPin as verifyPin,
} from './OwnerSecrets'

const SESSION_KEY = 'ii_owner_session'
const SESSION_TS = 'ii_owner_session_ts'
const SESSION_PIN_HASH = 'ii_owner_session_pin'
const FAIL_KEY = 'ii_owner_fails'
const LOCK_KEY = 'ii_owner_lock'
const SESSION_MAX_MS = 8 * 60 * 60 * 1000
const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000

export { isOwnerPinConfigured, verifyOwnerPin } from './OwnerSecrets'

export function isOwnerPanelEnabled(): boolean {
  return true
}

export function isOwnerLocked(): boolean {
  const lock = Number(sessionStorage.getItem(LOCK_KEY) ?? 0)
  return lock > Date.now()
}

export function ownerLockRemainingMs(): number {
  const lock = Number(sessionStorage.getItem(LOCK_KEY) ?? 0)
  return Math.max(0, lock - Date.now())
}

export function recordOwnerFail(): void {
  const fails = Number(sessionStorage.getItem(FAIL_KEY) ?? 0) + 1
  sessionStorage.setItem(FAIL_KEY, String(fails))
  if (fails >= MAX_FAILS) {
    sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS))
    sessionStorage.removeItem(FAIL_KEY)
  }
}

function clearOwnerFails(): void {
  sessionStorage.removeItem(FAIL_KEY)
}

export function isOwnerSession(): boolean {
  if (!isOwnerPinConfigured()) return false
  const ok = sessionStorage.getItem(SESSION_KEY) === '1'
  if (!ok) return false
  const pinHash = sessionStorage.getItem(SESSION_PIN_HASH)
  if (pinHash !== configuredPinHash()) {
    clearOwnerSession()
    return false
  }
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
  sessionStorage.setItem(SESSION_PIN_HASH, configuredPinHash())
  clearOwnerFails()
}

export function clearOwnerSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_TS)
  sessionStorage.removeItem(SESSION_PIN_HASH)
}

export function refreshOwnerSession(): void {
  if (isOwnerSession()) {
    sessionStorage.setItem(SESSION_TS, String(Date.now()))
  }
}

export function tryOwnerLogin(pin: string): boolean {
  if (isOwnerLocked()) return false
  if (verifyPin(pin)) {
    startOwnerSession()
    return true
  }
  recordOwnerFail()
  return false
}
