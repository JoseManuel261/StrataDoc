'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, Pencil, ChevronRight, FolderOpen } from 'lucide-react'
import { getDocuments, createDocument, deleteDocument, renameDocument } from '@/lib/documents'
import { useToast } from '@/components/ToastProvider'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { DocumentSummary } from '@/lib/types'

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const router = useRouter()
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      setDocs(await getDocuments())
    } catch {
      toast.error('No se pudieron cargar los documentos')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setCreating(true)
    try {
      const id = await createDocument({ title: 'Sin título' })
      router.push(`/documents/${id}`)
    } catch {
      toast.error('No se pudo crear el documento')
      setCreating(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDocument(id)
      setDocs(prev => prev.filter(d => d.id !== id))
      toast.success('Documento eliminado')
    } catch {
      toast.error('No se pudo eliminar el documento')
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return
    try {
      await renameDocument(id, renameValue)
      setDocs(prev => prev.map(d => d.id === id ? { ...d, title: renameValue.trim() } : d))
      setRenamingId(null)
      toast.success('Documento renombrado')
    } catch {
      toast.error('No se pudo renombrar el documento')
    }
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <p className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>
            StrataDOC
          </p>
          <h1 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--text)', lineHeight: 1.1 }}>
            Mis documentos
          </h1>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            background: creating ? 'var(--border2)' : 'var(--accent)',
            color: creating ? 'var(--text-muted)' : '#000',
            fontWeight: 700,
            fontSize: '0.8rem',
            fontFamily: 'Syne, sans-serif',
            border: 'none',
            cursor: creating ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {creating ? 'Creando…' : '+ Nuevo documento'}
        </button>
      </div>

      {/* Estado vacío */}
      {!loading && docs.length === 0 && (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px dashed var(--border)',
          borderRadius: '0.75rem',
        }}>
          <FolderOpen size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
          <p className="font-display" style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            Aún no hay documentos
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Crea tu primer documento y empieza a documentar tus proyectos.
          </p>
          <button
            onClick={handleCreate}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: '0.5rem',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.8rem',
              fontFamily: 'Syne, sans-serif',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Crear documento
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      )}

      {/* Lista */}
      {!loading && docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {docs.map(doc => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
            >
              <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === doc.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(doc.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(doc.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--accent)',
                      color: 'var(--text)',
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                ) : (
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {TEMPLATE_LABELS[doc.template]}
                  </span>
                  {doc.project && (
                    <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                      · {doc.project.name}
                    </span>
                  )}
                  <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                    · {new Date(doc.updated_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  title="Renombrar"
                  onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title) }}
                  style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}
                >
                  <Pencil size={13} />
                </button>
                <button
                  title="Eliminar"
                  onClick={() => handleDelete(doc.id, doc.title)}
                  style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red-text)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}
                >
                  <Trash2 size={13} />
                </button>
                <Link
                  href={`/documents/${doc.id}`}
                  title="Abrir"
                  style={{ padding: '0.375rem', borderRadius: '0.375rem', color: 'var(--text-dim)', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}
                >
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
