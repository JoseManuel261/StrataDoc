'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function NetworkToast() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const onOffline = () => setOffline(true)
    const onOnline  = () => setOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="toast-slide fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2.5 px-4 py-3 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255,68,68,0.4)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
      }}>
      <WifiOff size={14} style={{ color: 'var(--red-text)' }} />
      <span className="text-sm" style={{ color: 'var(--text)' }}>Sin conexión — los cambios se reanudarán al reconectarte</span>
    </div>
  )
}
