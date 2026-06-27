'use client'
import { useState, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, Wand2, MessageSquarePlus, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'

type Mode = 'draft' | 'suggest'

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
  currentText: string
  onInsert: (markdown: string) => void
  onClose: () => void
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
  return data.map((t: any) => ({
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
  const ids = taskIds.map((t: any) => t.id)
  const { data } = await supabase
    .from('task_history')
    .select('field, old_value, new_value, task:tasks(title)')
    .in('task_id', ids)
    .order('created_at', { ascending: false })
    .limit(20)
  if (!data) return []
  return data.map((h: any) =>
    `${h.task?.title}: ${h.field} cambió de ${h.old_value || 'ninguno'} a ${h.new_value || 'ninguno'}`
  )
}

export default function AIAssistant({
  documentTitle,
  template,
  project,
  currentText,
  onInsert,
  onClose,
}: AIAssistantProps) {
  const [mode, setMode] = useState<Mode>('suggest')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<TaskContext[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [showContext, setShowContext] = useState(false)

  // Carga contexto real cuando cambia el proyecto vinculado
  useEffect(() => {
    if (!project?.id) { setTasks([]); setHistory([]); return }
    setLoadingContext(true)
    Promise.all([
      fetchProjectTasks(project.id),
      fetchProjectHistory(project.id),
    ]).then(([t, h]) => {
      setTasks(t)
      setHistory(h)
    }).catch(() => {}).finally(() => setLoadingContext(false))
  }, [project?.id])

  async function handleSubmit() {
    if (!prompt.trim() && mode === 'draft') return
    setLoading(true)
    setError('')
    setResult('')

    try {
      const projectContext = project
        ? {
            projectName: project.name,
            tasks: tasks.map(t => ({
              title: t.title,
              status: t.status === 'COMPLETED' ? 'Completada' : t.status === 'IN_PROGRESS' ? 'En progreso' : 'Pendiente',
              priority: t.priority === 'HIGH' ? 'Alta' : t.priority === 'MEDIUM' ? 'Media' : 'Baja',
              assignee: t.assignee,
            })),
            recentHistory: history,
          }
        : undefined

      const endpoint = mode === 'draft' ? '/api/ai/draft' : '/api/ai/suggest'
      const body = mode === 'draft'
        ? { documentTitle, template, userPrompt: prompt, projectContext }
        : { documentTitle, template, currentContent: currentText, userRequest: prompt, projectContext }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al generar contenido'); return }
      setResult(mode === 'draft' ? data.draft : data.suggestion)
    } catch {
      setError('Error de red. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const panel: React.CSSProperties = {
    width: '300px',
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  }

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-text)' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
            Asistente IA
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem' }}>
          <X size={14} />
        </button>
      </div>

      {/* Contexto del proyecto */}
      {project && (
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => setShowContext(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.5rem',
              padding: '0.4rem 0.625rem', cursor: 'pointer', color: 'var(--text-muted)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: loadingContext ? 'var(--amber)' : 'var(--accent)' }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                {loadingContext ? 'Cargando contexto…' : `${project.name} · ${tasks.length} tareas`}
              </span>
            </div>
            <ChevronDown size={11} style={{ transform: showContext ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showContext && !loadingContext && tasks.length > 0 && (
            <div style={{ marginTop: '0.375rem', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {tasks.slice(0, 8).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', borderRadius: '0.3rem', background: 'var(--surface2)' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: t.completed ? 'var(--accent)' : t.status === 'IN_PROGRESS' ? 'var(--blue)' : 'var(--border2)' }} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                </div>
              ))}
              {tasks.length > 8 && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'var(--text-dim)', padding: '0.1rem 0.5rem' }}>
                  +{tasks.length - 8} más
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modo */}
      <div style={{ display: 'flex', padding: '0.625rem 0.75rem', gap: '0.375rem', flexShrink: 0 }}>
        {([
          { id: 'suggest' as Mode, label: 'Sugerir', icon: <MessageSquarePlus size={11} /> },
          { id: 'draft' as Mode, label: 'Borrador', icon: <Wand2 size={11} /> },
        ]).map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(''); setError('') }}
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

      {/* Hint */}
      <p style={{ padding: '0 0.875rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5, flexShrink: 0 }}>
        {mode === 'draft'
          ? project && tasks.length > 0
            ? `La IA usará las ${tasks.length} tareas de "${project.name}" para generar el borrador.`
            : 'Describe qué documento quieres generar y la IA creará un borrador completo.'
          : 'Describe qué necesitas o deja vacío para que la IA sugiera cómo continuar.'}
      </p>

      {/* Input */}
      <div style={{ padding: '0 0.75rem 0.75rem', flexShrink: 0 }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={mode === 'draft'
            ? 'Ej: Informe de avance del sprint con análisis de métricas…'
            : 'Ej: Agrega una sección de conclusiones… (o deja vacío)'}
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
          style={{
            width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', color: 'var(--text)', fontFamily: 'Syne, sans-serif',
            fontSize: '0.75rem', padding: '0.625rem', resize: 'none', outline: 'none',
            lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || (mode === 'draft' && !prompt.trim())}
          style={{
            marginTop: '0.5rem', width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.375rem', padding: '0.5rem', borderRadius: '0.375rem',
            border: 'none', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', fontWeight: 600,
            cursor: loading || (mode === 'draft' && !prompt.trim()) ? 'not-allowed' : 'pointer',
            background: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--border2)' : 'var(--accent)',
            color: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--text-muted)' : '#000',
            transition: 'all 0.15s',
          }}>
          {loading
            ? <><Loader2 size={12} className="animate-spin" /> Generando…</>
            : <><Send size={12} /> {mode === 'draft' ? 'Generar borrador' : 'Sugerir'}</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 0.75rem 0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--red-text)', fontFamily: 'Syne, sans-serif' }}>{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 0.75rem 0.75rem' }}>
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.5rem' }}>
            <pre style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {result}
            </pre>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => { onInsert(result); setResult(''); setPrompt('') }}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#000', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 600 }}>
              Insertar en documento
            </button>
            <button
              onClick={() => { setResult(''); setPrompt('') }}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem' }}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
