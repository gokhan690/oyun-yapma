function isNative(): boolean {
  return typeof window !== 'undefined'
    && 'Capacitor' in window
    && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
}

export interface NotificationPrefs {
  dailyReward: boolean
  passiveIncome: boolean
  goalNear: boolean
  webPush: boolean
}

const WEB_ALARM_KEY = 'is_imparatorlugu_web_push_alarms'

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const base = import.meta.env.BASE_URL ?? '/'
    const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
    return reg
  } catch {
    return null
  }
}

export async function requestWebPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export async function subscribeWebPush(prefs: NotificationPrefs): Promise<boolean> {
  if (!prefs.webPush) return false
  const perm = await requestWebPushPermission()
  if (perm !== 'granted') return false

  const reg = await registerServiceWorker()
  if (!reg) {
    scheduleWebAlarms(prefs)
    return true
  }

  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (vapid && 'pushManager' in reg) {
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      })
      localStorage.setItem('is_imparatorlugu_push_sub', JSON.stringify(sub))
    } catch {
      scheduleWebAlarms(prefs)
    }
  } else {
    scheduleWebAlarms(prefs)
  }
  return true
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Tarayıcı açıkken zamanlanmış web bildirimleri */
export function scheduleWebAlarms(prefs: NotificationPrefs): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const existing = window.localStorage.getItem(WEB_ALARM_KEY)
  if (existing) {
    try {
      const ids = JSON.parse(existing) as number[]
      ids.forEach((id) => window.clearTimeout(id))
    } catch {
      // ignore
    }
  }

  const timeoutIds: number[] = []
  const scheduleAt = (hour: number, title: string, body: string, enabled: boolean) => {
    if (!enabled) return
    const now = new Date()
    const target = new Date()
    target.setHours(hour, 0, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const ms = target.getTime() - now.getTime()
    const id = window.setTimeout(() => {
      try {
        void new Notification(title, { body, icon: `${import.meta.env.BASE_URL ?? '/'}icon-512.svg` })
      } catch {
        // ignore
      }
      scheduleAt(hour, title, body, enabled)
    }, ms)
    timeoutIds.push(id)
  }

  scheduleAt(10, 'İş İmparatorluğu 🏢', '🎁 Günlük ödülün seni bekliyor!', prefs.dailyReward)
  scheduleAt(20, 'İş İmparatorluğu 🏢', '💼 Pasif gelirin birikiyor — kontrol et.', prefs.passiveIncome)
  scheduleAt(14, 'İş İmparatorluğu 🎯', 'Günlük hedefe yaklaşıyorsun!', prefs.goalNear)
  window.localStorage.setItem(WEB_ALARM_KEY, JSON.stringify(timeoutIds))
}

export async function scheduleDailyReminder(prefs?: NotificationPrefs): Promise<void> {
  const p = prefs ?? { dailyReward: true, passiveIncome: true, goalNear: true, webPush: false }

  if (!isNative()) {
    if (p.webPush) void subscribeWebPush(p)
    return
  }

  try {
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }] })

    const notifications: { id: number; title: string; body: string; schedule: { at: Date }; smallIcon: string; channelId: string }[] = []

    if (p.dailyReward) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      notifications.push({
        id: 1001,
        title: 'İş İmparatorluğu 🏢',
        body: '🎁 Günlük ödülün seni bekliyor! Geri dön ve topla.',
        schedule: { at: tomorrow },
        smallIcon: 'ic_launcher',
        channelId: 'daily',
      })
    }

    if (p.passiveIncome) {
      const evening = new Date()
      evening.setDate(evening.getDate() + 1)
      evening.setHours(20, 0, 0, 0)
      notifications.push({
        id: 1002,
        title: 'İş İmparatorluğu 🏢',
        body: '💼 İşletmelerin gelir üretiyor! Kontrol et.',
        schedule: { at: evening },
        smallIcon: 'ic_launcher',
        channelId: 'daily',
      })
    }

    if (p.goalNear) {
      const noon = new Date()
      noon.setDate(noon.getDate() + 1)
      noon.setHours(14, 0, 0, 0)
      notifications.push({
        id: 1003,
        title: 'İş İmparatorluğu 🎯',
        body: 'Günlük hedefe yaklaşıyorsun — son sprint!',
        schedule: { at: noon },
        smallIcon: 'ic_launcher',
        channelId: 'daily',
      })
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch {
    // plugin yok veya izin verilmedi
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!isNative()) {
    scheduleWebAlarms({ dailyReward: false, passiveIncome: false, goalNear: false, webPush: false })
    return
  }
  try {
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }] })
  } catch {
    // ignore
  }
}

export async function rescheduleFromPrefs(prefs: NotificationPrefs): Promise<void> {
  await cancelAllReminders()
  if (prefs.dailyReward || prefs.passiveIncome || prefs.goalNear || prefs.webPush) {
    await scheduleDailyReminder(prefs)
  }
}

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function isNativePlatform(): boolean {
  return isNative()
}
