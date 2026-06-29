'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Minus, Undo, Redo,
  Sparkles, AlignLeft, Target,
} from 'lucide-react'
import { saveDocumentContent } from '@/lib/documents'
import AIAssistant from '@/components/AIAssistant'
import TableOfContents from '@/components/TableOfContents'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'

interface TiptapEditorProps {
  documentId: string
  documentTitle: string
  template: DocumentTemplate
  project: ProjectSummary | null
  initialContent: Record<string, unknown> | null
  onSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void
  onContentChange?: (content: Record<string, unknown>, wordCount: number) => void
}

// Estilos tipográficos por plantilla — solo afectan el área de edición
const TEMPLATE_STYLES: Record<DocumentTemplate, React.CSSProperties> = {
  free: {
    fontFamily: 'Fenix, serif',
    fontSize: '1.05rem',
    lineHeight: '1.85',
  },
  apa: {
    fontFamily: 'Fenix, serif',
    fontSize: '1rem',
    lineHeight: '2',
  },
  scientific: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '0.9375rem',
    lineHeight: '1.7',
  },
}


// Convierte marcado inline de markdown a HTML — **bold**, *italic*, `code`
function inlineToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

export default function TiptapEditor({
  documentId,
  documentTitle,
  template,
  project,
  initialContent,
  onSaveStatus,
  onContentChange,
}: TiptapEditorProps) {
  const [showAI, setShowAI] = useState(false)
  const [showTOC, setShowTOC] = useState(true)
  const [wordTarget, setWordTarget] = useState<number | null>(null)
  const [showTargetInput, setShowTargetInput] = useState(false)
  const [targetInputVal, setTargetInputVal] = useState('')
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir, o usa el asistente IA para generar un borrador…',
      }),
      CharacterCount,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class: 'stratadoc-editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      onSaveStatus('unsaved')
      if (saveDebounce.current) clearTimeout(saveDebounce.current)
      saveDebounce.current = setTimeout(async () => {
        try {
          onSaveStatus('saving')
          const wc      = editor.storage.characterCount.words() as number
          const content = editor.getJSON() as Record<string, unknown>
          await saveDocumentContent(documentId, content, wc)
          onContentChange?.(content, wc)
          onSaveStatus('saved')
        } catch {
          onSaveStatus('unsaved')
        }
      }, 1200)
    },
  })

  // Cleanup debounce on unmount
  useEffect(() => () => { if (saveDebounce.current) clearTimeout(saveDebounce.current) }, [])

  // Convierte markdown a nodos Tiptap reales para que el contenido
  // generado por la IA aparezca con formato en el editor (headings,
  // bold, listas) en vez de los símbolos crudos de markdown.
  const handleInsert = useCallback((markdown: string) => {
    if (!editor) return

    // Si el documento está vacío (solo un párrafo vacío), lo limpiamos
    // antes de insertar para no dejar un párrafo huérfano al inicio.
    const isEmpty = editor.state.doc.textContent.trim() === ''
    if (isEmpty) {
      editor.commands.clearContent()
    }

    editor.chain().focus().run()

    // Ir al final del documento
    editor.commands.setTextSelection(editor.state.doc.content.size)

    // Acumulamos ítems de lista consecutivos para insertarlos como
    // un solo nodo <ul>/<ol> y evitar el problema de anidamiento.
    let pendingList: { type: 'ul' | 'ol'; items: string[] } | null = null

    function flushList() {
      if (!pendingList) return
      if (pendingList.type === 'ul') {
        const html = `<ul>${pendingList.items.map(i => `<li><p>${i}</p></li>`).join('')}</ul>`
        editor!.commands.insertContent(html)
      } else {
        const html = `<ol>${pendingList.items.map(i => `<li><p>${i}</p></li>`).join('')}</ol>`
        editor!.commands.insertContent(html)
      }
      pendingList = null
    }

    const lines = markdown.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()

      // Detectar ítems de lista y acumularlos
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = inlineToHtml(trimmed.slice(2))
        if (pendingList?.type === 'ul') {
          pendingList.items.push(text)
        } else {
          flushList()
          pendingList = { type: 'ul', items: [text] }
        }
        continue
      }
      if (/^\d+\.\s/.test(trimmed)) {
        const text = inlineToHtml(trimmed.replace(/^\d+\.\s/, ''))
        if (pendingList?.type === 'ol') {
          pendingList.items.push(text)
        } else {
          flushList()
          pendingList = { type: 'ol', items: [text] }
        }
        continue
      }

      // Cualquier otro nodo cierra la lista pendiente
      flushList()

      if (!trimmed) {
        editor.commands.insertContent('<p></p>')
      } else if (trimmed.startsWith('### ')) {
        editor.commands.insertContent(`<h3>${inlineToHtml(trimmed.slice(4))}</h3>`)
      } else if (trimmed.startsWith('## ')) {
        editor.commands.insertContent(`<h2>${inlineToHtml(trimmed.slice(3))}</h2>`)
      } else if (trimmed.startsWith('# ')) {
        editor.commands.insertContent(`<h1>${inlineToHtml(trimmed.slice(2))}</h1>`)
      } else if (trimmed.startsWith('> ')) {
        editor.commands.insertContent(`<blockquote><p>${inlineToHtml(trimmed.slice(2))}</p></blockquote>`)
      } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        editor.commands.insertContent('<hr />')
      } else {
        editor.commands.insertContent(`<p>${inlineToHtml(trimmed)}</p>`)
      }
    }

    // Volcar cualquier lista pendiente al final
    flushList()

    setShowAI(false)
  }, [editor])

  // Texto plano para enviar a la IA de sugerencias
  const getCurrentText = useCallback(() => {
    return editor?.getText() ?? ''
  }, [editor])

  const charCount = editor?.storage.characterCount.characters() ?? 0
  const wordCount = editor?.storage.characterCount.words() ?? 0

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Tabla de contenidos — panel izquierdo */}
      {showTOC && <TableOfContents editor={editor} />}

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.125rem',
          padding: '0.5rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <ToolGroup>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Título 1">
              <Heading1 size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Título 2">
              <Heading2 size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Título 3">
              <Heading3 size={14} />
            </ToolBtn>
          </ToolGroup>

          <Divider />

          <ToolGroup>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Negrita (⌘B)">
              <Bold size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Cursiva (⌘I)">
              <Italic size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Tachado">
              <Strikethrough size={14} />
            </ToolBtn>
          </ToolGroup>

          <Divider />

          <ToolGroup>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Lista con viñetas">
              <List size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Lista numerada">
              <ListOrdered size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Cita">
              <Quote size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              active={false}
              title="Línea divisoria">
              <Minus size={14} />
            </ToolBtn>
          </ToolGroup>

          <Divider />

          <ToolGroup>
            <ToolBtn
              onClick={() => editor.chain().focus().undo().run()}
              active={false}
              title="Deshacer (⌘Z)"
              disabled={!editor.can().undo()}>
              <Undo size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().redo().run()}
              active={false}
              title="Rehacer (⌘⇧Z)"
              disabled={!editor.can().redo()}>
              <Redo size={14} />
            </ToolBtn>
          </ToolGroup>

          <div style={{ flex: 1 }} />

          {/* Objetivo de palabras */}
          {showTargetInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                autoFocus
                type="number"
                value={targetInputVal}
                onChange={e => setTargetInputVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const n = parseInt(targetInputVal)
                    setWordTarget(n > 0 ? n : null)
                    setShowTargetInput(false)
                    setTargetInputVal('')
                  }
                  if (e.key === 'Escape') { setShowTargetInput(false); setTargetInputVal('') }
                }}
                onBlur={() => { setShowTargetInput(false); setTargetInputVal('') }}
                placeholder="ej. 2000"
                style={{
                  width: '80px', padding: '0.25rem 0.5rem',
                  background: 'var(--surface2)', border: '1px solid var(--accent)',
                  borderRadius: '0.3rem', color: 'var(--text)',
                  fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', outline: 'none',
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowTargetInput(true)}
              title={wordTarget ? `Objetivo: ${wordTarget} palabras` : 'Establecer objetivo de palabras'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.3rem 0.5rem', borderRadius: '0.3rem',
                border: '1px solid var(--border)', background: 'transparent',
                color: wordTarget ? 'var(--accent-text)' : 'var(--text-dim)',
                cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
                transition: 'all 0.1s',
              }}>
              <Target size={11} />
              {wordTarget ? `${Math.min(wordCount, wordTarget)}/${wordTarget}` : 'Meta'}
            </button>
          )}

          {/* TOC toggle */}
          <button
            onClick={() => setShowTOC(v => !v)}
            title="Tabla de contenidos"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.5rem', borderRadius: '0.3rem',
              border: showTOC ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: showTOC ? 'var(--accent-dim)' : 'transparent',
              color: showTOC ? 'var(--accent-text)' : 'var(--text-dim)',
              cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
              transition: 'all 0.1s',
            }}>
            <AlignLeft size={11} />
          </button>

          {/* Botón de IA */}
          <button
            onClick={() => setShowAI(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: showAI ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: showAI ? 'var(--accent-dim)' : 'transparent',
              color: showAI ? 'var(--accent-text)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
            }}>
            <Sparkles size={12} />
            IA
          </button>
        </div>

        {/* Editable area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <EditorContent
              editor={editor}
              style={TEMPLATE_STYLES[template]}
            />
          </div>
        </div>

        {/* Footer: word/char count + barra de progreso */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.5rem 1.5rem', borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            {wordCount} palabras · {charCount} caracteres
          </span>
          {wordTarget && wordTarget > 0 && (
            <>
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px', transition: 'width 0.4s',
                  background: wordCount >= wordTarget ? 'var(--accent)' : 'var(--blue)',
                  width: `${Math.min((wordCount / wordTarget) * 100, 100)}%`,
                }} />
              </div>
              <span className="mono" style={{ fontSize: '0.6rem', color: wordCount >= wordTarget ? 'var(--accent-text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {wordCount >= wordTarget ? '✓ Meta alcanzada' : `${wordTarget - wordCount} palabras restantes`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* AI sidebar (derecha) */}
      {showAI && (
        <AIAssistant
          documentTitle={documentTitle}
          template={template}
          project={project}
          getCurrentText={getCurrentText}
          onInsert={handleInsert}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* Tiptap editor styles */}
      <style>{`
        .stratadoc-editor {
          outline: none;
          min-height: 60vh;
          color: var(--text);
        }
        .stratadoc-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--text-dim);
          float: left;
          pointer-events: none;
          height: 0;
        }
        .stratadoc-editor h1 {
          font-family: Fenix, serif;
          font-size: 2rem;
          font-weight: 400;
          color: var(--text);
          margin: 1.5rem 0 0.75rem;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .stratadoc-editor h2 {
          font-family: Fenix, serif;
          font-size: 1.4rem;
          font-weight: 400;
          color: var(--text);
          margin: 1.25rem 0 0.6rem;
          letter-spacing: -0.01em;
        }
        .stratadoc-editor h3 {
          font-family: Syne, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text);
          margin: 1rem 0 0.5rem;
        }
        .stratadoc-editor p { margin: 0.5rem 0; color: var(--text); }
        .stratadoc-editor strong { color: var(--text); }
        .stratadoc-editor em { color: var(--text); }
        .stratadoc-editor blockquote {
          border-left: 3px solid var(--accent);
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          color: var(--text-muted);
          background: var(--accent-dim);
          border-radius: 0 0.375rem 0.375rem 0;
        }
        .stratadoc-editor ul, .stratadoc-editor ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          color: var(--text);
        }
        .stratadoc-editor li { margin: 0.25rem 0; }
        .stratadoc-editor hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.5rem 0;
        }
        .stratadoc-editor code {
          font-family: 'DM Mono', monospace;
          font-size: 0.85em;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 0.25rem;
          padding: 0.1em 0.35em;
          color: var(--accent);
        }
        .stratadoc-editor pre {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        .stratadoc-editor pre code {
          background: none;
          border: none;
          padding: 0;
          color: var(--text);
        }
        .stratadoc-editor ::selection { background: var(--accent); color: #000; }
      `}</style>
    </div>
  )
}

// ── Toolbar helpers ──────────────────────────────────────────────────────────

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '0.125rem' }}>{children}</div>
}

function Divider() {
  return <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 0.25rem' }} />
}

function ToolBtn({ onClick, active, title, disabled, children }: {
  onClick: () => void
  active: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px',
        borderRadius: '0.25rem',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : disabled ? 'var(--text-dim)' : 'var(--text-muted)',
        transition: 'all 0.1s',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
