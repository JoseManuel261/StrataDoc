'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, Link2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ThemeToggle from '@/components/ThemeToggle'
import {
  getDocument,
  updateDocumentMeta,
  getAccessibleProjects,
} from '@/lib/documents'
import { useToast } from '@/components/ToastProvider'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { Document, DocumentTemplate, ProjectSummary } from '@/lib/types'

// Tiptap debe cargarse solo en el cliente (usa APIs del DOM)
const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={18} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()

  const [doc, setDoc] = useState<Document | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Proyecto activo — se recalcula cuando cambia doc.project_id o la lista de proyectos
  const activeProject = projects.find(p => p.id === doc?.project_id) ?? null

  useEffect(() => {
    async function load() {
      try {
        // Cargamos en paralelo; cuando ambos resuelven seteamos el estado juntos
        // para evitar la race condition donde activeProject queda null un frame.
        const [docData, projectsData] = await Promise.all([
          getDocument(id),
          getAccessibleProjects(),
        ])
        if (!docData) { router.push('/documents'); return }
        setProjects(projectsData)
        setDoc(docData)
        setTitle(docData.title)
      } catch {
        toast.error('No se pudo cargar el documento')
        router.push('/documents')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, toast])

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
    setSaveStatus('unsaved')
    if (titleDebounce.current) clearTimeout(titleDebounce.current)
    titleDebounce.current = setTimeout(async () => {
      try {
        setSaveStatus('saving')
        await updateDocumentMeta(id, { title: value.trim() || 'Sin título' })
        setSaveStatus('saved')
      } catch {
        toast.error('Error al guardar el título')
        setSaveStatus('unsaved')
      }
    }, 800)
  }, [id, toast])

  async function handleTemplateChange(template: DocumentTemplate) {
    if (!doc) return
    try {
      await updateDocumentMeta(id, { template })
      setDoc(prev => prev ? { ...prev, template } : prev)
      toast.success(`Plantilla: ${TEMPLATE_LABELS[template]}`)
    } catch {
      toast.error('No se pudo cambiar la plantilla')
    }
  }

  async function handleProjectChange(project_id: string | null) {
    if (!doc) return
    try {
      await updateDocumentMeta(id, { project_id })
      setDoc(prev => prev ? { ...prev, project_id } : prev)
      toast.success(project_id ? 'Proyecto vinculado' : 'Proyecto desvinculado')
    } catch {
      toast.error('No se pudo vincular el proyecto')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Loader2 size={20} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!doc) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>

      {/* Toolbar superior */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
        flexWrap: 'wrap',
        minWidth: 0,
      }}>
        {/* Volver */}
        <Link href="/documents"
          style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
          <ArrowLeft size={16} />
        </Link>

        {/* Título editable */}
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Sin título"
          style={{
            flex: 1,
            minWidth: '120px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontFamily: 'Fenix, serif',
            fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}
        />

        {/* Save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={11} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
              <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guardando</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 size={11} style={{ color: 'var(--accent)' }} />
              <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guardado</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sin guardar</span>
          )}
        </div>

        {/* Plantilla — con value correcto para que sea controlado */}
        <select
          value={doc.template}
          onChange={e => handleTemplateChange(e.target.value as DocumentTemplate)}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.5rem',
            fontSize: '0.72rem',
            fontFamily: 'DM Mono, monospace',
            outline: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {(Object.entries(TEMPLATE_LABELS) as [DocumentTemplate, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Proyecto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
          {doc.project_id && (
            <span title="Vinculado a proyecto de Strata">
              <Link2 size={13} style={{ color: 'var(--accent)' }} />
            </span>
          )}
          <select
            value={doc.project_id ?? ''}
            onChange={e => handleProjectChange(e.target.value || null)}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: doc.project_id ? 'var(--text)' : 'var(--text-dim)',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.72rem',
              fontFamily: 'DM Mono, monospace',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '150px',
            }}
          >
            <option value="">Sin proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* ThemeToggle en el editor */}
        <ThemeToggle />
      </div>

      {/* Editor Tiptap */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minWidth: 0 }}>
        <TiptapEditor
          documentId={id}
          documentTitle={title}
          template={doc.template}
          project={activeProject}
          initialContent={doc.content}
          onSaveStatus={setSaveStatus}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
