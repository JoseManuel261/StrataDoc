'use client'
import Modal from '@/components/Modal'

interface ConfirmModalProps {
  message:       string
  confirmLabel?: string
  onConfirm:     () => void
  onCancel:      () => void
  danger?:       boolean
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
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onCancel}
          style={{
            flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
            background: 'var(--surface2)', color: 'var(--text)',
            border: '1px solid var(--border)', transition: 'border-color 0.15s',
            fontFamily: 'Syne, sans-serif',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
        >
          Cancelar
        </button>
        <button onClick={onConfirm}
          style={{
            flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            background: danger ? 'rgba(255,68,68,0.12)' : 'var(--accent)',
            color: danger ? 'var(--red-text)' : '#000',
            border: danger ? '1px solid rgba(255,68,68,0.3)' : 'none',
            transition: 'background 0.15s', fontFamily: 'Syne, sans-serif',
          }}
          onMouseEnter={e => {
            if (danger) (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.22)'
            else (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={e => {
            if (danger) (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.12)'
            else (e.currentTarget as HTMLElement).style.background = 'var(--accent)'
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
