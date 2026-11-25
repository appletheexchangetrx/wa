/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string | null }> }
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {}
  try { payload = event.data?.json() ?? {} }
  catch { payload = { title: 'WhatsApp', body: 'Anda menerima pesan baru.' } }
  event.waitUntil(self.registration.showNotification(payload.title || 'WhatsApp', {
    body: payload.body || 'Anda menerima pesan baru.',
    icon: '/wa/icons/pwa-192.png',
    badge: '/wa/icons/pwa-192.png',
    tag: 'wa-inbox-new-message',
    renotify: true,
    data: { url: payload.url || '/wa/' },
  }))
})
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/wa/', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) { await client.focus(); if ('navigate' in client) await client.navigate(target); return }
    }
    await self.clients.openWindow(target)
  })())
})
