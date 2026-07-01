'use client'
import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { List } from 'lucide-react'

interface Heading {
  level: number
  text:  string
  pos:   number   // posición en el documento Tiptap para scroll preciso
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
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    if (!editor) return

    function extractHeadings() {
      const items: Heading[] = []
      let pos = 0
      editor!.state.doc.descendants((node, nodePos) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level as number,
            text:  node.textContent,
            pos:   nodePos,
          })
        }
        pos = nodePos
        return true
      })
      setHeadings(items)
    }

    extractHeadings()
    editor.on('update', extractHeadings)
    return () => { editor.off('update', extractHeadings) }
  }, [editor])

  function scrollToHeading(h: Heading) {
    setActiveId(h.pos)
    // Usamos la posición exacta en el doc de Tiptap para navegar
    // al heading correcto incluso si hay texto duplicado.
    editor?.commands.setTextSelection(h.pos)
    const domNode = editor?.view.domAtPos(h.pos + 1)?.node as HTMLElement | null
    domNode?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
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
            onClick={() => scrollToHeading(h)}
            style={{
              textAlign: 'left',
              padding: `0.25rem ${h.level === 1 ? '0.875rem' : h.level === 2 ? '1.25rem' : '1.625rem'}`,
              background: activeId === h.pos ? 'var(--surface2)' : 'transparent',
              border: 'none',
              borderLeft: activeId === h.pos ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: h.level === 1 ? 'Fenix, serif' : 'Syne, sans-serif',
              fontSize: h.level === 1 ? '0.72rem' : h.level === 2 ? '0.67rem' : '0.62rem',
              fontWeight: h.level === 1 ? 600 : 400,
              color: activeId === h.pos ? 'var(--accent-text)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              transition: 'all 0.1s',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (activeId !== h.pos) {
                (e.currentTarget as HTMLElement).style.color = 'var(--text)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
              }
            }}
            onMouseLeave={e => {
              if (activeId !== h.pos) {
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
