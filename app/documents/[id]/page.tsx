'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Link2, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  getDocument,
  updateDocumentMeta,
  saveDocumentContent,
  getAccessibleProjects,
} from '@/lib/documents'
import { useToast } from '@/components/ToastProvider'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { Document, DocumentTemplate, ProjectSummary } from '@/lib/types'

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

  // Ref para el debounce de autoguardado del título
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Carga inicial ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [docData, projectsData] = await Promise.all([
          getDocument(id),
          getAccessibleProjects(),
        ])
        if (!docData) { router.push('/documents'); return }
        setDoc(docData)
        setTitle(docData.title)
        setProjects(projectsData)
      } catch {
        toast.error('No se pudo cargar el documento')
        router.push('/documents')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, toast])

  // ─── Autoguardado del título con debounce ───────────────────────────
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

  // ─── Cambio de plantilla ────────────────────────────────────────────
  async function handleTemplateChange(template: DocumentTemplate) {
    if (!doc) return
    try {
      await updateDocumentMeta(id, { template })
      setDoc(prev => prev ? { ...prev, template } : prev)
      toast.success(`Plantilla cambiada a ${TEMPLATE_LABELS[template]}`)
    } catch {
      toast.error('No se pudo cambiar la plantilla')
    }
  }

  // ─── Cambio de proyecto vinculado ───────────────────────────────────
  async function handleProjectChange(project_id: string | null) {
    if (!doc) return
    try {
      await updateDocumentMeta(id, { project_id })
      setDoc(prev => prev ? { ...prev, project_id } : prev)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(8px)',
      }}>
        <Link href="/documents" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={12} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
              <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guardando</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
              <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guardado</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sin guardar</span>
          )}
        </div>

        {/* Selector de plantilla */}
        <select
          value={doc.template}
          onChange={e => handleTemplateChange(e.target.value as DocumentTemplate)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: '0.375rem',
            padding: '0.3rem 0.5rem',
            fontSize: '0.75rem',
            fontFamily: 'DM Mono, monospace',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {(Object.entries(TEMPLATE_LABELS) as [DocumentTemplate, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Selector de proyecto */}
        <select
          value={doc.project_id ?? ''}
          onChange={e => handleProjectChange(e.target.value || null)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: doc.project_id ? 'var(--text)' : 'var(--text-dim)',
            borderRadius: '0.375rem',
            padding: '0.3rem 0.5rem',
            fontSize: '0.75rem',
            fontFamily: 'DM Mono, monospace',
            outline: 'none',
            cursor: 'pointer',
            maxWidth: '180px',
          }}
        >
          <option value="">Sin proyecto</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Indicador de proyecto vinculado */}
        {doc.project_id && (
          <span title="Vinculado a un proyecto de Strata" style={{ display: 'flex', alignItems: 'center' }}>
            <Link2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          </span>
        )}
      </div>

      {/* Área del editor — placeholder hasta Fase 2 (Tiptap) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '720px',
        }}>
          {/* Placeholder visual del editor */}
          <div style={{
            minHeight: '60vh',
            padding: '3rem',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}>
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              El editor llegará en la Fase 2
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
              Aquí irá el editor Tiptap con autoguardado, barra de formato, plantillas visuales y asistente de IA.
            </p>
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(200,240,74,0.2)',
            }}>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Guardado en Supabase · ID: {id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
