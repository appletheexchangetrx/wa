import { useEffect, useState } from 'react'
import { Bell, BellOff, LoaderCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function decodeBase64Url(value: string): Uint8Array {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(available)
    if (!available) return
    setMessage(Notification.permission === 'denied' ? 'Izin notifikasi diblokir di browser.' : '')
    void navigator.serviceWorker.ready.then(async registration => {
      setEnabled(Boolean(await registration.pushManager.getSubscription()))
    }).catch(() => undefined)
  }, [])

  const toggle = async () => {
    if (!supported || busy) return
    setBusy(true); setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        const { error } = await supabase.functions.invoke('trx-push-unsubscribe', { body: { endpoint: existing.endpoint } })
        if (error) throw error
        await existing.unsubscribe()
        setEnabled(false); setMessage('Notifikasi dinonaktifkan pada perangkat ini.')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage(permission === 'denied' ? 'Izin ditolak. Ubah izin melalui pengaturan browser.' : 'Izin notifikasi belum diberikan.')
        return
      }
      const { data, error } = await supabase.functions.invoke('trx-push-config', { body: {} })
      if (error) throw error
      if (!data?.publicKey) throw new Error('VAPID public key belum dikonfigurasi pada Supabase.')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(data.publicKey) as BufferSource,
      })
      const saved = await supabase.functions.invoke('trx-push-subscribe', {
        body: { subscription: subscription.toJSON(), deviceLabel: navigator.userAgent.slice(0, 120) },
      })
      if (saved.error) { await subscription.unsubscribe(); throw saved.error }
      setEnabled(true); setMessage('Notifikasi aktif pada perangkat ini.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengatur notifikasi.')
    } finally { setBusy(false) }
  }
  if (!supported) return <div className="notification-settings"><small>Push notification tidak didukung browser ini.</small></div>
  return <div className="notification-settings">
    <button className="notification-toggle" onClick={() => void toggle()} disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={17} /> : enabled ? <Bell size={17} /> : <BellOff size={17} />}
      <span>{enabled ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}</span>
    </button>
    {message && <small role="status">{message}</small>}
  </div>
}
