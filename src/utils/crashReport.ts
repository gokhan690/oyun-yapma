/**
 * Minimal crash reporter — boot/runtime hatalarını localStorage'a yazar.
 * Faz 3: Firebase Crashlytics veya Sentry plugin ile değiştirilebilir.
 */

const CRASH_KEY = 'ii_crash_log'
const MAX_ENTRIES = 20

export interface CrashEntry {
  at: string
  message: string
  stack?: string
  context?: string
}

export function reportCrash(error: unknown, context?: string): void {
  try {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    const entry: CrashEntry = { at: new Date().toISOString(), message, stack, context }
    const prev = JSON.parse(localStorage.getItem(CRASH_KEY) ?? '[]') as CrashEntry[]
    prev.unshift(entry)
    localStorage.setItem(CRASH_KEY, JSON.stringify(prev.slice(0, MAX_ENTRIES)))
    console.error('[crashReport]', context ?? 'error', error)
  } catch {
    // ignore storage failures
  }
}

export function getCrashLog(): CrashEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CRASH_KEY) ?? '[]') as CrashEntry[]
  } catch {
    return []
  }
}

export function installGlobalCrashHandlers(): void {
  window.addEventListener('error', (ev) => {
    reportCrash(ev.error ?? ev.message, 'window.error')
  })
  window.addEventListener('unhandledrejection', (ev) => {
    reportCrash(ev.reason, 'unhandledrejection')
  })
}
