'use client'
import { useEffect, useState, useCallback } from 'react'
import { History, Tag, Trash2, RotateCcw, Plus, Loader2, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

interface Version {
  id:          string
  document_id: string
  content:     Record<string, unknown> | null
  word_count:  number
  label:       string | null
  created_at:  string
}

interface VersionHistoryProps {
  documentId:  string
  currentContent: Record<string, unknown>
  currentWordCount: number
  onRestore:   (content: Record<string, unknown>) => void
  onClose:     () => void
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function VersionHistory({
  documentId,
  currentContent,
  currentWordCount,
  onRestore,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const toast = useToast()

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/versions?documentId=${documentId}`)
      const data = await res.json()
      if (res.ok) setVersions(data.versions ?? [])
    } catch {
      toast.error('No se pudo cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  useEffect(() => { loadVersions() }, [loadVersions])

  async function handleSaveVersion() {
    setSaving(true)
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          content:   currentContent,
          wordCount: currentWordCount,
          label:     labelInput.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Versión guardada')
      setLabelInput('')
      setShowLabelInput(false)
      loadVersions()
    } catch {
      toast.error('No se pudo guardar la versión')
    } finally {
      setSaving(false)
    }
  }

  async function handleRestore(version: Version) {
    if (!version.content) {
      toast.error('Esta versión no tiene contenido guardado')
      return
    }
    setRestoringId(version.id)
    try {
      // Guardar snapshot del estado actual antes de restaurar
      await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          content:   currentContent,
          wordCount: currentWordCount,
          label:     `Respaldo antes de restaurar ${timeAgo(version.created_at)}`,
        }),
      })
      onRestore(version.content)
      toast.success('Versión restaurada — se guardó un respaldo del estado actual')
      onClose()
    } catch {
      toast.error('No se pudo restaurar la versión')
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDelete(versionId: string) {
    try {
      const res = await fetch('/api/versions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      if (!res.ok) throw new Error()
      setVersions(prev => prev.filter(v => v.id !== versionId))
      toast.success('Versión eliminada')
    } catch {
      toast.error('No se pudo eliminar la versión')
    }
  }

  const panel: React.CSSProperties = {
    width:       '280px',
    flexShrink:  0,
    borderLeft:  '1px solid var(--border)',
    background:  'var(--surface)',
    display:     'flex',
    flexDirection: 'column',
    height:      '100%',
    overflow:    'hidden',
  }

  return (
    <div className="version-panel" style={panel}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={14} style={{ color: 'var(--blue)' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
            Historial
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1, padding: '0.25rem',
        }}>×</button>
      </div>

      {/* Guardar versión manual */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {showLabelInput ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              autoFocus
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveVersion()
                if (e.key === 'Escape') { setShowLabelInput(false); setLabelInput('') }
              }}
              placeholder="Ej: Entrega final, v1.2…"
              style={{
                width: '100%', padding: '0.5rem 0.625rem',
                background: 'var(--surface2)', border: '1px solid var(--accent)',
                borderRadius: '0.375rem', color: 'var(--text)',
                fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={handleSaveVersion}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.375rem',
                  background: 'var(--accent)', border: 'none', borderRadius: '0.375rem',
                  color: '#000', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem',
                  fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setShowLabelInput(false); setLabelInput('') }}
                style={{
                  padding: '0.375rem 0.625rem',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '0.375rem', color: 'var(--text-muted)',
                  fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLabelInput(true)}
            style={{
              width: '100%', padding: '0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '0.375rem', color: 'var(--text-muted)',
              fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            }}
          >
            <Plus size={12} /> Guardar versión ahora
          </button>
        )}
      </div>

      {/* Lista de versiones */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 size={16} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <History size={24} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sin versiones guardadas aún. El autoguardado crea versiones cada 5 minutos mientras editas.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {versions.map(v => (
              <div key={v.id} style={{
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}>
                {/* Fila principal */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    background: expandedId === v.id ? 'var(--surface2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  {v.label
                    ? <Tag size={11} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
                    : <History size={11} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'Syne, sans-serif', fontSize: '0.72rem',
                      color: v.label ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: v.label ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {v.label ?? 'Autoguardado'}
                    </p>
                    <p className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                      {timeAgo(v.created_at)} · {v.word_count} palabras
                    </p>
                  </div>
                  <ChevronDown size={11} style={{
                    color: 'var(--text-dim)', flexShrink: 0,
                    transform: expandedId === v.id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                  }} />
                </div>

                {/* Acciones expandidas */}
                {expandedId === v.id && (
                  <div style={{
                    display: 'flex', gap: '0.375rem',
                    padding: '0.375rem 0.625rem',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface2)',
                  }}>
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoringId === v.id}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.25rem',
                        padding: '0.375rem',
                        background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                        borderRadius: '0.375rem', color: 'var(--accent-text)',
                        fontFamily: 'Syne, sans-serif', fontSize: '0.68rem',
                        fontWeight: 600, cursor: restoringId ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {restoringId === v.id
                        ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                        : <RotateCcw size={10} />
                      }
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      style={{
                        padding: '0.375rem 0.5rem',
                        background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: '0.375rem', color: 'var(--text-dim)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--red-text)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,68,68,0.3)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
