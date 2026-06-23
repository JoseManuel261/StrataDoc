'use client'
import Modal from '@/components/Modal'

interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  return (
    <Modal title="¿Confirmar acción?" onClose={onCancel}>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
          Cancelar
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: danger ? 'rgba(255,68,68,0.15)' : 'var(--accent)',
            color: danger ? 'var(--red-text)' : '#000',
            border: danger ? '1px solid rgba(255,68,68,0.3)' : 'none',
          }}
          onMouseEnter={e => {
            if (danger) (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.25)'
            else (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={e => {
            if (danger) (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.15)'
            else (e.currentTarget as HTMLElement).style.background = 'var(--accent)'
          }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
