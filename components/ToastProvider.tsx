'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id:      string
  type:    ToastType
  message: string
}

interface ToastContextType {
  success: (message: string) => void
  error:   (message: string) => void
  info?:   (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'rgba(200,240,74,0.35)',
  error:   'rgba(255,68,68,0.35)',
  info:    'rgba(96,165,250,0.35)',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'var(--accent)',
  error:   'var(--red-text)',
  info:    'var(--blue)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const value: ToastContextType = {
    success: (m: string) => push('success', m),
    error:   (m: string) => push('error',   m),
    info:    (m: string) => push('info',    m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Contenedor de toasts — 100% inline styles, sin Tailwind */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center',
        width: '100%',
        maxWidth: '420px',
        padding: '0 1rem',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}>
        {toasts.map(t => {
          const Icon  = ICONS[t.type]
          const borderColor = BORDER_COLORS[t.type]
          const iconColor   = ICON_COLORS[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              pointerEvents: 'auto',
              width: '100%',
              background: 'var(--surface)',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
              animation: 'toastSlideUp 0.2s ease',
            }}>
              <Icon size={15} style={{ color: iconColor, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontSize: '0.825rem', color: 'var(--text)', lineHeight: 1.45 }}>
                {t.message}
              </span>
              <button onClick={() => dismiss(t.id)} style={{
                flexShrink: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-dim)', display: 'flex',
                padding: '0.15rem', transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
