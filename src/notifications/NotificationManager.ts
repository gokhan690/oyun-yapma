function isNative(): boolean {
  return typeof window !== 'undefined' &&
    'Capacitor' in window &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.() === true
}

export async function scheduleDailyReminder(): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] })

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const evening = new Date()
    evening.setDate(evening.getDate() + 1)
    evening.setHours(20, 0, 0, 0)

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1001,
          title: 'İş İmparatorluğu 🏢',
          body: '🎁 Günlük ödülün seni bekliyor! Geri dön ve topla.',
          schedule: { at: tomorrow },
          smallIcon: 'ic_launcher',
          channelId: 'daily',
        },
        {
          id: 1002,
          title: 'İş İmparatorluğu 🏢',
          body: '💼 İşletmelerin gelir üretiyor! Kontrol et.',
          schedule: { at: evening },
          smallIcon: 'ic_launcher',
          channelId: 'daily',
        },
      ],
    })
  } catch {
    // plugin yok veya izin verilmedi
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] })
  } catch {
    // ignore
  }
}
