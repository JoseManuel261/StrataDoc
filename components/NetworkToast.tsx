'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function NetworkToast() {
  const [status, setStatus] = useState<'online' | 'offline' | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onOffline() { setStatus('offline'); setVisible(true) }
    function onOnline()  {
      setStatus('online')
      setVisible(true)
      // Ocultar el toast de "reconectado" después de 3s
      setTimeout(() => setVisible(false), 3000)
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  if (!visible || !status) return null

  const isOffline = status === 'offline'

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10001,
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      padding: '0.75rem 1rem',
      borderRadius: '0.75rem',
      background: 'var(--surface)',
      border: `1px solid ${isOffline ? 'rgba(255,68,68,0.4)' : 'rgba(200,240,74,0.4)'}`,
      boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.2s ease',
    }}>
      {isOffline
        ? <WifiOff  size={14} style={{ color: 'var(--red-text)', flexShrink: 0 }} />
        : <Wifi     size={14} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
      }
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {isOffline
          ? 'Sin conexión — los cambios se reanudarán al reconectarte'
          : 'Conexión restaurada'
        }
      </span>
      {isOffline && (
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', marginLeft: '0.25rem', padding: '0.1rem', lineHeight: 1 }}>
          ×
        </button>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  )
}
