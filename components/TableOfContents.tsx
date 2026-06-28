'use client'
import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { List } from 'lucide-react'

interface Heading {
  level: number
  text: string
  id: string
}

interface TableOfContentsProps {
  editor: Editor | null
}

// Genera un ID slug simple para anclar headings
function slugify(text: string, index: number): string {
  return `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
}

export default function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (!editor) return

    function extractHeadings() {
      const items: Heading[] = []
      editor!.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          const text = node.textContent
          const level = node.attrs.level as number
          items.push({ level, text, id: slugify(text, items.length) })
        }
      })
      setHeadings(items)
    }

    extractHeadings()
    editor.on('update', extractHeadings)
    return () => { editor.off('update', extractHeadings) }
  }, [editor])

  function scrollToHeading(id: string, text: string) {
    setActiveId(id)
    // Busca en el DOM del editor el heading con ese texto y hace scroll
    const editorEl = document.querySelector('.stratadoc-editor')
    if (!editorEl) return
    const allHeadings = editorEl.querySelectorAll('h1, h2, h3')
    for (const el of allHeadings) {
      if (el.textContent?.trim() === text.trim()) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  if (headings.length === 0) return null

  return (
    <div className="toc-panel" style={{
      width: '200px',
      flexShrink: 0,
      borderRight: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '1rem 0',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0 0.875rem', marginBottom: '0.75rem' }}>
        <List size={11} style={{ color: 'var(--text-dim)' }} />
        <span className="mono" style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)' }}>
          Contenido
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {headings.map((h, i) => (
          <button key={i}
            onClick={() => scrollToHeading(h.id, h.text)}
            style={{
              textAlign: 'left',
              padding: `0.25rem ${h.level === 1 ? '0.875rem' : h.level === 2 ? '1.25rem' : '1.625rem'}`,
              background: activeId === h.id ? 'var(--surface2)' : 'transparent',
              border: 'none',
              borderLeft: activeId === h.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: h.level === 1 ? 'Fenix, serif' : 'Syne, sans-serif',
              fontSize: h.level === 1 ? '0.72rem' : h.level === 2 ? '0.67rem' : '0.62rem',
              fontWeight: h.level === 1 ? 600 : 400,
              color: activeId === h.id ? 'var(--accent-text)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              transition: 'all 0.1s',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (activeId !== h.id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--text)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
              }
            }}
            onMouseLeave={e => {
              if (activeId !== h.id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }
            }}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  )
}
