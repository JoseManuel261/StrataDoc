'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const ICONS: Record<ToastType, any> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const COLORS: Record<ToastType, string> = {
  success: 'var(--accent)',
  error: 'var(--red)',
  info: 'var(--blue)',
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
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center w-full px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          const color = COLORS[t.type]
          return (
            <div key={t.id}
              className="toast-slide flex items-center gap-2.5 px-4 py-3 rounded-xl pointer-events-auto max-w-sm"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${color}55`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
              }}>
              <Icon size={16} style={{ color }} className="shrink-0"/>
              <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0" style={{ color: 'var(--text-dim)' }}>
                <X size={13}/>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
