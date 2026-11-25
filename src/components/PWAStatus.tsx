import { useEffect, useState } from 'react'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })
  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
  if (!online) return <div className="pwa-status pwa-offline" role="status"><WifiOff size={15} /> Offline — riwayat pesan tersimpan tersedia di perangkat.</div>
  if (needRefresh) return <div className="pwa-status pwa-update" role="status"><span>Pembaruan aplikasi tersedia.</span><button onClick={() => void updateServiceWorker(true)}><RefreshCw size={14} /> Perbarui</button><button aria-label="Tutup" onClick={() => setNeedRefresh(false)}><X size={14} /></button></div>
  if (offlineReady) return <div className="pwa-status pwa-ready" role="status">Aplikasi siap digunakan offline.<button aria-label="Tutup" onClick={() => setOfflineReady(false)}><X size={14} /></button></div>
  return null
}
