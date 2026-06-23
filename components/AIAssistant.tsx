'use client'
import { useState } from 'react'
import { Sparkles, X, Send, Loader2, Wand2, MessageSquarePlus } from 'lucide-react'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'

type Mode = 'draft' | 'suggest'

interface AIAssistantProps {
  documentTitle: string
  template: DocumentTemplate
  project: ProjectSummary | null
  /** Texto plano del contenido actual (para sugerencias) */
  currentText: string
  /** Callback cuando la IA genera contenido para insertar en el editor */
  onInsert: (markdown: string) => void
  onClose: () => void
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

  async function handleSubmit() {
    if (!prompt.trim() && mode === 'draft') return
    setLoading(true)
    setError('')
    setResult('')

    try {
      const endpoint = mode === 'draft' ? '/api/ai/draft' : '/api/ai/suggest'
      const body = mode === 'draft'
        ? {
            documentTitle,
            template,
            userPrompt: prompt,
            projectContext: project ? { projectName: project.name, tasks: [] } : undefined,
          }
        : {
            documentTitle,
            template,
            currentContent: currentText,
            userRequest: prompt,
            projectContext: project ? { projectName: project.name, tasks: [] } : undefined,
          }

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

  return (
    <div style={{
      width: '320px',
      flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
            Asistente IA
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
          <X size={14} />
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', padding: '0.75rem', gap: '0.375rem', flexShrink: 0 }}>
        {([
          { id: 'suggest', label: 'Sugerir', icon: <MessageSquarePlus size={12} /> },
          { id: 'draft',   label: 'Borrador completo', icon: <Wand2 size={12} /> },
        ] as { id: Mode; label: string; icon: React.ReactNode }[]).map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(''); setError('') }}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              padding: '0.4rem 0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.7rem',
              fontWeight: mode === m.id ? 600 : 400,
              background: mode === m.id ? 'var(--accent-dim)' : 'transparent',
              color: mode === m.id ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Hint text */}
      <p style={{ padding: '0 0.875rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, flexShrink: 0 }}>
        {mode === 'draft'
          ? 'Describe qué documento quieres generar. La IA creará un borrador completo listo para editar.'
          : 'Describe qué necesitas o deja vacío para que la IA sugiera cómo continuar según lo que ya escribiste.'}
      </p>

      {/* Input */}
      <div style={{ padding: '0 0.75rem 0.75rem', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={mode === 'draft'
              ? 'Ej: Informe de avance del sprint 3 con análisis de métricas…'
              : 'Ej: Agrega una sección de conclusiones… (o deja vacío)'}
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              color: 'var(--text)',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.75rem',
              padding: '0.625rem 0.75rem',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || (mode === 'draft' && !prompt.trim())}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: loading || (mode === 'draft' && !prompt.trim()) ? 'not-allowed' : 'pointer',
            background: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--border2)' : 'var(--accent)',
            color: loading || (mode === 'draft' && !prompt.trim()) ? 'var(--text-muted)' : '#000',
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          {loading
            ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
            : <><Send size={12} /> {mode === 'draft' ? 'Generar borrador' : 'Sugerir'} <span className="mono" style={{ fontSize: '0.6rem', opacity: 0.7 }}>⌘↵</span></>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 0.75rem 0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--red-text)' }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 0.75rem 0.75rem' }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '0.5rem',
          }}>
            <pre style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.72rem',
              color: 'var(--text)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}>
              {result}
            </pre>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => { onInsert(result); setResult(''); setPrompt('') }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--accent)',
                color: '#000',
                fontFamily: 'Syne, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              Insertar en el documento
            </button>
            <button
              onClick={() => { setResult(''); setPrompt('') }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontFamily: 'Syne, sans-serif',
                fontSize: '0.72rem',
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
