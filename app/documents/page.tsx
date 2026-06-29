'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, Trash2, Pencil, ChevronRight, Plus,
  Search, BookOpen, ChevronLeft,
} from 'lucide-react'
import { getDocuments, createDocument, deleteDocument, renameDocument } from '@/lib/documents'
import { useToast } from '@/components/ToastProvider'
import ConfirmModal from '@/components/ConfirmModal'
import DocumentSearch from '@/components/DocumentSearch'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { DocumentSummary } from '@/lib/types'

const TEMPLATE_COLORS: Record<string, string> = {
  free:       'var(--accent)',
  apa:        'var(--blue)',
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
  const [docs, setDocs]           = useState<DocumentSummary[]>([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const router  = useRouter()
  const toast   = useToast()

  // Ctrl+K / ⌘+K para abrir búsqueda
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const result = await getDocuments({ page: p })
      setDocs(result.docs)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setPage(result.page)
    } catch {
      toast.error('No se pudieron cargar los documentos')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load(1) }, [load])

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
      setTotal(t => t - 1)
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
      await renameDocument(id, renameValue)
      setDocs(prev => prev.map(d => d.id === id ? { ...d, title: renameValue.trim() } : d))
    } catch {
      toast.error('No se pudo renombrar')
    } finally {
      setRenamingId(null)
    }
  }

  const recent = docs.slice(0, 3)
  const rest   = docs.slice(3)

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.75rem', color: 'var(--text)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Mis documentos
          </h1>
          <p className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {total > 0 ? `${total} documento${total !== 1 ? 's' : ''}` : 'Sin documentos aún'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Búsqueda */}
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              border: '1px solid var(--border)', borderRadius: '0.5rem',
              background: 'var(--surface)', color: 'var(--text-muted)',
              fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', cursor: 'pointer',
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
            <Search size={13} />
            Buscar
            <kbd className="mono" style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.2rem', color: 'var(--text-dim)' }}>
              ⌘K
            </kbd>
          </button>

          {/* Nuevo */}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem', border: 'none',
              background: creating ? 'var(--border2)' : 'var(--accent)',
              color: creating ? 'var(--text-muted)' : '#000',
              fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}
          >
            <Plus size={14} />
            {creating ? 'Creando…' : 'Nuevo'}
          </button>
        </div>
      </div>

      {/* Skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '60px', borderRadius: '0.625rem', background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease infinite', opacity: 0.6 }} />
          ))}
        </div>
      ) : docs.length === 0 ? (

        /* Estado vacío */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: '1rem',
        }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BookOpen size={24} style={{ color: 'var(--text-dim)' }} />
          </div>
          <h2 style={{ fontFamily: 'Fenix, serif', fontSize: '1.25rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.5rem' }}>
            Tu biblioteca está vacía
          </h2>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Crea tu primer documento y usa la IA para generar un borrador a partir de tus proyectos en Strata.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.625rem', border: 'none',
              background: 'var(--accent)', color: '#000',
              fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Crear primer documento
          </button>
        </div>

      ) : (
        <>
          {/* Recientes */}
          {recent.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <SectionLabel icon="◷" label="Recientes" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {recent.map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    setRenamingId={setRenamingId}
                    setRenameValue={setRenameValue}
                    onRename={handleRename}
                    onDelete={() => setConfirmDelete({ id: doc.id, title: doc.title })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resto */}
          {rest.length > 0 && (
            <div>
              <SectionLabel icon="◫" label="Todos los documentos" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {rest.map(doc => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    setRenamingId={setRenamingId}
                    setRenameValue={setRenameValue}
                    onRename={handleRename}
                    onDelete={() => setConfirmDelete({ id: doc.id, title: doc.title })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text-dim)' : 'var(--text-muted)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem' }}
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: page >= totalPages ? 'var(--text-dim)' : 'var(--text-muted)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem' }}
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar documento'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}

      {showSearch && <DocumentSearch onClose={() => setShowSearch(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }
        .doc-row:hover .doc-actions { opacity: 1 !important; }
        @media (max-width: 640px) { .doc-actions { opacity: 1 !important; } }
      `}</style>
    </div>
  )
}

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{icon}</span>
      <span className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}

interface DocActionProps {
  doc: DocumentSummary
  renamingId: string | null
  renameValue: string
  setRenamingId: (id: string | null) => void
  setRenameValue: (v: string) => void
  onRename: (id: string) => void
  onDelete: () => void
}

function DocCard({ doc, renamingId, renameValue, setRenamingId, setRenameValue, onRename, onDelete }: DocActionProps) {
  return (
    <div style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', transition: 'border-color 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TEMPLATE_COLORS[doc.template], marginTop: '0.35rem' }} />
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          <IconBtn title="Renombrar" onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title) }}>
            <Pencil size={11} />
          </IconBtn>
          <IconBtn title="Eliminar" onClick={onDelete} danger>
            <Trash2 size={11} />
          </IconBtn>
        </div>
      </div>

      {renamingId === doc.id ? (
        <input autoFocus value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={() => onRename(doc.id)}
          onKeyDown={e => { if (e.key === 'Enter') onRename(doc.id); if (e.key === 'Escape') setRenamingId(null) }}
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 600, outline: 'none', width: '100%', marginBottom: '0.5rem' }}
        />
      ) : (
        <Link href={`/documents/${doc.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <p style={{ fontFamily: 'Fenix, serif', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
            {doc.title}
          </p>
        </Link>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: '0.56rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{TEMPLATE_LABELS[doc.template]}</span>
        {doc.project && <span className="mono" style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>· {(doc.project as { name: string }).name}</span>}
        <span className="mono" style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>· {timeAgo(doc.updated_at)}</span>
      </div>
    </div>
  )
}

function DocRow({ doc, renamingId, renameValue, setRenamingId, setRenameValue, onRename, onDelete }: DocActionProps) {
  return (
    <div className="doc-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid transparent', transition: 'all 0.1s', cursor: 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
    >
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: TEMPLATE_COLORS[doc.template] }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {renamingId === doc.id ? (
          <input autoFocus value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => onRename(doc.id)}
            onKeyDown={e => { if (e.key === 'Enter') onRename(doc.id); if (e.key === 'Escape') setRenamingId(null) }}
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, outline: 'none', width: '100%' }}
          />
        ) : (
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
        )}
        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.1rem' }}>
          <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{TEMPLATE_LABELS[doc.template]}</span>
          {doc.project && <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>· {(doc.project as { name: string }).name}</span>}
          <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>· {timeAgo(doc.updated_at)}</span>
        </div>
      </div>
      <div className="doc-actions" style={{ display: 'flex', gap: '0.125rem', flexShrink: 0, opacity: 0, transition: 'opacity 0.15s' }}>
        <IconBtn title="Renombrar" onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title) }}><Pencil size={12} /></IconBtn>
        <IconBtn title="Eliminar" onClick={onDelete} danger><Trash2 size={12} /></IconBtn>
        <Link href={`/documents/${doc.id}`} style={{ padding: '0.375rem', borderRadius: '0.375rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  )
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = danger ? 'var(--red-text)' : 'var(--text)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
      {children}
    </button>
  )
}
