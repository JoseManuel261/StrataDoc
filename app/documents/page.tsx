'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, Pencil, ChevronRight, FolderOpen, Plus, Clock, BookOpen } from 'lucide-react'
import { getDocuments, createDocument, deleteDocument, renameDocument } from '@/lib/documents'
import { useToast } from '@/components/ToastProvider'
import ConfirmModal from '@/components/ConfirmModal'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { DocumentSummary } from '@/lib/types'

const TEMPLATE_COLORS: Record<string, string> = {
  free: 'var(--accent)',
  apa: 'var(--blue)',
  scientific: '#a855f7',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteDocument(confirmDelete.id)
      setDocs(prev => prev.filter(d => d.id !== confirmDelete.id))
      toast.success('Documento eliminado')
      setConfirmDelete(null)
    } catch {
      toast.error('No se pudo eliminar el documento')
    } finally {
      setDeleting(false)
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return }
    try {
      await renameDocument(id, renameValue.trim())
      setDocs(prev => prev.map(d => d.id === id ? { ...d, title: renameValue.trim() } : d))
      setRenamingId(null)
      toast.success('Documento renombrado')
    } catch {
      toast.error('No se pudo renombrar el documento')
    }
  }

  const recent = docs.slice(0, 3)
  const all = docs

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Mis documentos
            </span>
          </div>
          <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1 }}>
            Biblioteca de documentos
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {docs.length === 0 ? 'Crea tu primer documento' : `${docs.length} documento${docs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.625rem',
            background: creating ? 'var(--border2)' : 'var(--accent)',
            color: creating ? 'var(--text-muted)' : '#000',
            fontWeight: 700, fontSize: '0.8rem',
            fontFamily: 'Syne, sans-serif',
            border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Plus size={14} />
          {creating ? 'Creando…' : 'Nuevo documento'}
        </button>
      </div>

      {/* Estado vacío */}
      {!loading && docs.length === 0 && (
        <div style={{
          padding: '5rem 2rem', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: '1rem',
          background: 'var(--surface)',
        }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <BookOpen size={24} style={{ color: 'var(--text-dim)' }} />
          </div>
          <h2 style={{ fontFamily: 'Fenix, serif', fontSize: '1.2rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            Aún no hay documentos
          </h2>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.75rem', maxWidth: '320px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
            Crea tu primer documento y deja que la IA te ayude a redactar informes, tesis y artículos basados en el historial de tus proyectos de Strata.
          </p>
          <button
            onClick={handleCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.7rem 1.75rem', borderRadius: '0.625rem',
              background: 'var(--accent)', color: '#000',
              fontWeight: 700, fontSize: '0.85rem',
              fontFamily: 'Syne, sans-serif', border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Crear documento
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      )}

      {/* Recientes */}
      {!loading && docs.length > 0 && (
        <>
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={12} style={{ color: 'var(--text-dim)' }} />
            <span className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Recientes
            </span>
          </div>

          {/* Grid de recientes — tarjetas más grandes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {recent.map(doc => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                style={{
                  display: 'block', padding: '1.25rem',
                  borderRadius: '0.875rem', border: '1px solid var(--border)',
                  background: 'var(--surface)', textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: TEMPLATE_COLORS[doc.template] + '18', border: `1px solid ${TEMPLATE_COLORS[doc.template]}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} style={{ color: TEMPLATE_COLORS[doc.template] }} />
                  </div>
                  <span className="mono" style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', background: 'var(--surface2)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                    {TEMPLATE_LABELS[doc.template]}
                  </span>
                </div>
                <p style={{ fontFamily: 'Fenix, serif', fontSize: '0.95rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.375rem' }}>
                  {doc.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {doc.project && (
                    <>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />
                      <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {doc.project.name}
                      </span>
                    </>
                  )}
                  <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: doc.project ? 'auto' : '0' }}>
                    {timeAgo(doc.updated_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Lista completa */}
          {all.length > 0 && (
            <>
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={12} style={{ color: 'var(--text-dim)' }} />
                <span className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  Todos los documentos
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {all.map(doc => (
                  <div key={doc.id} className="doc-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                  >
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: TEMPLATE_COLORS[doc.template] }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === doc.id ? (
                        <input autoFocus value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(doc.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(doc.id); if (e.key === 'Escape') setRenamingId(null) }}
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, outline: 'none', width: '100%' }}
                        />
                      ) : (
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.title}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.15rem', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {TEMPLATE_LABELS[doc.template]}
                        </span>
                        {doc.project && (
                          <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                            · {doc.project.name}
                          </span>
                        )}
                        <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                          · {timeAgo(doc.updated_at)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.125rem', flexShrink: 0, opacity: 0 }} className="doc-actions">
                      <button title="Renombrar"
                        onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title) }}
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
                        <Pencil size={12} />
                      </button>
                      <button title="Eliminar"
                        onClick={() => setConfirmDelete({ id: doc.id, title: doc.title })}
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red-text)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
                        <Trash2 size={12} />
                      </button>
                      <Link href={`/documents/${doc.id}`}
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar documento'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}

      <style>{`
        .doc-row:hover .doc-actions { opacity: 1 !important; }
        @media (max-width: 640px) {
          .doc-actions { opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}
