function isNative(): boolean {
  return typeof window !== 'undefined' &&
    'Capacitor' in window &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.() === true
}

export interface NotificationPrefs {
  dailyReward: boolean
  passiveIncome: boolean
  goalNear: boolean
}

export async function scheduleDailyReminder(prefs?: NotificationPrefs): Promise<void> {
  if (!isNative()) return
  const p = prefs ?? { dailyReward: true, passiveIncome: true, goalNear: true }
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
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }] })
  } catch {
    // ignore
  }
}

export async function rescheduleFromPrefs(prefs: NotificationPrefs): Promise<void> {
  await cancelAllReminders()
  if (prefs.dailyReward || prefs.passiveIncome || prefs.goalNear) {
    await scheduleDailyReminder(prefs)
  }
}
