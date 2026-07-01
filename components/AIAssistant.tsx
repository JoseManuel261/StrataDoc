'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, Loader2, Wand2, MessageSquarePlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'

type Mode = 'draft' | 'suggest'

interface HistoryEntry {
  role:    'user' | 'assistant'
  content: string
  mode:    Mode
}

interface TaskContext {
  title: string
  status: string
  priority: string
  assignee?: string
  completed: boolean
}

interface AIAssistantProps {
  documentTitle: string
  template: DocumentTemplate
  project: ProjectSummary | null
  getCurrentText: () => string
  onInsert: (markdown: string) => void
  onClose: () => void
}

// Shapes de respuesta raw de Supabase (tablas de Strata)
interface RawTask {
  title: string
  status: string
  priority: string
  assignee: { username: string } | null
}

interface RawTaskId {
  id: string
}

interface RawHistory {
  field: string
  old_value: string | null
  new_value: string | null
  task: { title: string } | null
}

// Carga las tareas reales del proyecto vinculado desde la misma
// base de Supabase que usa Strata — RLS garantiza acceso correcto.
async function fetchProjectTasks(projectId: string): Promise<TaskContext[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tasks')
    .select('title, status, priority, assigned_to, assignee:profiles!tasks_assigned_to_fkey(username)')
    .eq('project_id', projectId)
    .limit(30)
  if (!data) return []
  return (data as unknown as RawTask[]).map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee?.username,
    completed: t.status === 'COMPLETED',
  }))
}

async function fetchProjectHistory(projectId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: taskIds } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
  if (!taskIds?.length) return []
  const ids = (taskIds as unknown as RawTaskId[]).map((t) => t.id)
  const { data } = await supabase
    .from('task_history')
    .select('field, old_value, new_value, task:tasks(title)')
    .in('task_id', ids)
    .order('created_at', { ascending: false })
    .limit(20)
  if (!data) return []
  return (data as unknown as RawHistory[]).map((h) =>
    `${h.task?.title}: ${h.field} cambió de ${h.old_value || 'ninguno'} a ${h.new_value || 'ninguno'}`
  )
}

export default function AIAssistant({
  documentTitle,
  template,
  project,
  getCurrentText,
  onInsert,
  onClose,
}: AIAssistantProps) {
  const [mode, setMode]           = useState<Mode>('draft')
  const [prompt, setPrompt]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [chatHistory, setChatHistory] = useState<HistoryEntry[]>([])
  const [tasks, setTasks]         = useState<TaskContext[]>([])
  const [projectHistory, setProjectHistory] = useState<string[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const historyEndRef = useRef<HTMLDivElement>(null)

  // Carga contexto real cuando cambia el proyecto vinculado
  useEffect(() => {
    if (!project?.id) { setTasks([]); setProjectHistory([]); return }
    setLoadingContext(true)
    Promise.all([
      fetchProjectTasks(project.id),
      fetchProjectHistory(project.id),
    ]).then(([t, h]) => {
      setTasks(t)
      setProjectHistory(h)
    }).catch(() => {}).finally(() => setLoadingContext(false))
  }, [project?.id])

  // Auto-scroll al final del historial cuando hay nuevos mensajes
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function handleSubmit() {
    if (!prompt.trim() && mode === 'draft') return
    const userPrompt = prompt.trim()
    setLoading(true)
    setError('')
    setPrompt('')

    // Agregar mensaje del usuario al historial
    setChatHistory(prev => [...prev, { role: 'user', content: userPrompt, mode }])

    try {
      const projectContext = project
        ? {
            projectName: project.name,
            projectDescription: project.description ?? undefined,
            tasks: tasks.map(t => ({
              title: t.title,
              status: t.status === 'COMPLETED' ? 'Completada' : t.status === 'IN_PROGRESS' ? 'En progreso' : 'Pendiente',
              priority: t.priority === 'HIGH' ? 'Alta' : t.priority === 'MEDIUM' ? 'Media' : 'Baja',
              assignee: t.assignee,
            })),
            recentHistory: projectHistory,
          }
        : undefined

      const endpoint = mode === 'draft' ? '/api/ai/draft' : '/api/ai/suggest'
      const body = mode === 'draft'
        ? { documentTitle, template, userPrompt, projectContext }
        : { documentTitle, template, currentContent: getCurrentText(), userRequest: userPrompt, projectContext }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al generar contenido'); return }

      const result = mode === 'draft' ? data.draft : data.suggestion
      setChatHistory(prev => [...prev, { role: 'assistant', content: result, mode }])
    } catch {
      setError('Error de red. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }


  const panel: React.CSSProperties = {
    width: '300px', flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    background: 'var(--surface)',
    display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden',
  }

  const lastAssistantMsg = [...chatHistory].reverse().find(m => m.role === 'assistant')

  return (
    <div className="ai-panel" style={panel}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-text)' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
            Asistente IA
          </span>
          {project && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: loadingContext ? 'var(--text-dim)' : 'var(--accent-text)', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '0.25rem', padding: '0.1rem 0.375rem' }}>
              {loadingContext ? '…' : project.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {chatHistory.length > 0 && (
            <button onClick={() => setChatHistory([])} title="Limpiar historial"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: '0.25rem' }}>
              <Trash2 size={12} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Modo */}
      <div style={{ display: 'flex', padding: '0.5rem 0.75rem', gap: '0.375rem', flexShrink: 0 }}>
        {([
          { id: 'draft' as Mode, label: 'Borrador', icon: <Wand2 size={11} /> },
          { id: 'suggest' as Mode, label: 'Sugerir', icon: <MessageSquarePlus size={11} /> },
        ]).map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setError('') }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              padding: '0.375rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: '0.7rem', fontWeight: mode === m.id ? 600 : 400,
              background: mode === m.id ? 'var(--accent-dim)' : 'transparent',
              color: mode === m.id ? 'var(--accent-text)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Historial de conversación */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {chatHistory.length === 0 && (
          <div style={{ padding: '1rem 0', textAlign: 'center' }}>
            <Sparkles size={20} style={{ color: 'var(--text-dim)', margin: '0 auto 0.5rem' }} />
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {mode === 'draft'
                ? 'Describe el documento y la IA generará un borrador completo.'
                : 'Pide una sugerencia o deja vacío para que la IA proponga cómo continuar.'}
            </p>
          </div>
        )}

        {chatHistory.map((entry, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {/* Etiqueta de rol */}
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: entry.role === 'user' ? 'var(--text-dim)' : 'var(--accent-text)' }}>
              {entry.role === 'user' ? 'Tú' : 'IA'}
            </span>

            {entry.role === 'user' ? (
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {entry.content}
              </p>
            ) : (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <MarkdownPreview content={entry.content} />
                <button
                  onClick={() => onInsert(entry.content)}
                  style={{ marginTop: '0.625rem', width: '100%', padding: '0.375rem', borderRadius: '0.3rem', border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#000', fontFamily: 'Syne, sans-serif', fontSize: '0.68rem', fontWeight: 600 }}>
                  Insertar en documento
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Indicador de carga */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <Loader2 size={13} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generando…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--red-text)', fontFamily: 'Syne, sans-serif', margin: 0 }}>{error}</p>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0.625rem 0.75rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-end' }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={mode === 'draft'
              ? 'Informe de sprint, análisis de métricas…'
              : 'Agrega conclusiones… (o deja vacío)'}
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
            style={{
              flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '0.5rem', color: 'var(--text)', fontFamily: 'Syne, sans-serif',
              fontSize: '0.75rem', padding: '0.5rem', resize: 'none', outline: 'none',
              lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || (mode === 'draft' && !prompt.trim())}
            title="Enviar (Ctrl+Enter)"
            style={{
              padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
              cursor: loading || (mode === 'draft' && !prompt.trim()) ? 'not-allowed' : 'pointer',
              background: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--border2)' : 'var(--accent)',
              color: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--text-muted)' : '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.15s',
            }}>
            <Send size={14} />
          </button>
        </div>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '0.375rem', letterSpacing: '0.06em' }}>
          Ctrl+Enter para enviar
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/** Renderiza markdown básico de la IA con formato visual */
function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', lineHeight: 1.65, color: 'var(--text)' }}>
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} style={{ height: '0.5rem' }} />
        if (t.startsWith('### ')) return <h3 key={i} style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', margin: '0.625rem 0 0.25rem' }}>{t.slice(4)}</h3>
        if (t.startsWith('## '))  return <h2 key={i} style={{ fontFamily: 'Fenix, serif', fontSize: '0.88rem', fontWeight: 400, color: 'var(--text)', margin: '0.75rem 0 0.25rem', letterSpacing: '-0.01em' }}>{t.slice(3)}</h2>
        if (t.startsWith('# '))   return <h1 key={i} style={{ fontFamily: 'Fenix, serif', fontSize: '1rem', fontWeight: 400, color: 'var(--text)', margin: '0.75rem 0 0.375rem', letterSpacing: '-0.02em' }}>{t.slice(2)}</h1>
        if (t.startsWith('- ') || t.startsWith('* ')) return <div key={i} style={{ display: 'flex', gap: '0.375rem', margin: '0.15rem 0' }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span><span dangerouslySetInnerHTML={{ __html: renderInline(t.slice(2)) }} /></div>
        if (/^\d+\.\s/.test(t)) {
          const num = t.match(/^(\d+)\./)![1]
          return <div key={i} style={{ display: 'flex', gap: '0.375rem', margin: '0.15rem 0' }}><span style={{ color: 'var(--accent)', flexShrink: 0, minWidth: '1rem' }}>{num}.</span><span dangerouslySetInnerHTML={{ __html: renderInline(t.replace(/^\d+\.\s/, '')) }} /></div>
        }
        if (t.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '0.625rem', color: 'var(--text-muted)', margin: '0.375rem 0' }}>{t.slice(2)}</blockquote>
        return <p key={i} style={{ margin: '0.15rem 0' }} dangerouslySetInnerHTML={{ __html: renderInline(t) }} />
      })}
    </div>
  )
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:DM Mono,monospace;font-size:0.8em;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:0.05em 0.3em">$1</code>')
}
