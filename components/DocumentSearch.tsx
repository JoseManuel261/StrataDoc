'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, X, Clock } from 'lucide-react'
import Link from 'next/link'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { DocumentSummary } from '@/lib/types'

interface DocumentSearchProps {
  onClose: () => void
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

export default function DocumentSearch({ onClose }: DocumentSearchProps) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<DocumentSummary[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Cerrar con Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.docs ?? [])
      setSelected(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(val), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      window.location.href = `/documents/${results[selected].id}`
    }
  }

  const TEMPLATE_COLORS: Record<string, string> = {
    free:       'var(--accent)',
    apa:        'var(--blue)',
    scientific: '#a855f7',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        padding: '15vh 1rem 1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.875rem',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem',
          borderBottom: results.length > 0 || loading ? '1px solid var(--border)' : 'none',
        }}>
          <Search size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Buscar documentos…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '1rem',
            }}
          />
          {loading
            ? <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>…</div>
            : query && (
              <button onClick={() => { setQuery(''); setResults([]) }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', display: 'flex', padding: '0.2rem',
              }}>
                <X size={14} />
              </button>
            )
          }
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {results.map((doc, i) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  background: i === selected ? 'var(--surface2)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '0.375rem',
                  background: 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileText size={13} style={{ color: TEMPLATE_COLORS[doc.template] }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600,
                    color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.title}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      {TEMPLATE_LABELS[doc.template]}
                    </span>
                    <Clock size={9} style={{ color: 'var(--text-dim)' }} />
                    <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                      {timeAgo(doc.updated_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {query && !loading && results.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Sin resultados para <strong style={{ color: 'var(--text)' }}>"{query}"</strong>
            </p>
          </div>
        )}

        {/* Hint */}
        <div style={{
          padding: '0.5rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: '1rem',
        }}>
          {[['↑↓', 'Navegar'], ['↵', 'Abrir'], ['Esc', 'Cerrar']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <kbd className="mono" style={{
                fontSize: '0.55rem', padding: '0.15rem 0.3rem',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '0.25rem', color: 'var(--text-dim)',
              }}>{key}</kbd>
              <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
