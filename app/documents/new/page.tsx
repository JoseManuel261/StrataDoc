'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDocument } from '@/lib/documents'
import { CONTENT_TEMPLATES } from '@/lib/templates'
import { TEMPLATE_LABELS } from '@/lib/types'
import type { DocumentTemplate } from '@/lib/types'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'

export default function NewDocumentPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [title, setTitle]   = useState('')
  const [creating, setCreating] = useState(false)
  const router  = useRouter()
  const toast   = useToast()

  async function handleCreate() {
    setCreating(true)
    try {
      const tmpl = CONTENT_TEMPLATES.find(t => t.id === selectedTemplate) ?? CONTENT_TEMPLATES[0]
      const id = await createDocument({
        title:   title.trim() || tmpl.label,
        template: tmpl.template as DocumentTemplate,
        content: tmpl.content,
      })
      router.push(`/documents/${id}`)
    } catch {
      toast.error('No se pudo crear el documento')
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <Link href="/documents" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowLeft size={13} /> Volver
      </Link>

      <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        Nuevo documento
      </h1>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Elige una plantilla de contenido para empezar más rápido.
      </p>

      {/* Título */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
          Título (opcional)
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Mi nuevo documento…"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Grid de plantillas */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Plantilla de contenido
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {CONTENT_TEMPLATES.map(tmpl => {
            const active = selectedTemplate === tmpl.id
            return (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl.id)}
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-dim)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                {active && (
                  <div style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={10} style={{ color: '#000' }} />
                  </div>
                )}
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                  {tmpl.label}
                </p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  {tmpl.description}
                </p>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
                  {TEMPLATE_LABELS[tmpl.template]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={creating}
        style={{
          width: '100%', padding: '0.875rem', borderRadius: '0.75rem',
          border: 'none', background: creating ? 'var(--border2)' : 'var(--accent)',
          color: creating ? 'var(--text-muted)' : '#000',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem',
          cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
        }}
      >
        {creating ? 'Creando documento…' : 'Crear documento'}
      </button>
    </div>
  )
}
