self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {}
  const title = data.title ?? 'İş İmparatorluğu'
  const body = data.body ?? 'Geri dön ve imparatorluğunu büyüt!'
  event.waitUntil(self.registration.showNotification(title, { body, icon: './icon-512.svg' }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('./')
    }),
  )
})
