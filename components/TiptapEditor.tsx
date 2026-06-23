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
  Sparkles, AlignLeft,
} from 'lucide-react'
import { saveDocumentContent } from '@/lib/documents'
import AIAssistant from '@/components/AIAssistant'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'

interface TiptapEditorProps {
  documentId: string
  documentTitle: string
  template: DocumentTemplate
  project: ProjectSummary | null
  initialContent: Record<string, unknown> | null
  onSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void
}

// Estilos tipográficos por plantilla — solo afectan el área de edición
const TEMPLATE_STYLES: Record<DocumentTemplate, React.CSSProperties> = {
  free: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '1rem',
    lineHeight: '1.75',
  },
  apa: {
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
    lineHeight: '2',        // doble espacio APA
    textIndent: '2em',      // sangría de primera línea
  },
  scientific: {
    fontFamily: 'Georgia, serif',
    fontSize: '0.9375rem',
    lineHeight: '1.8',
    columnCount: 1,
  },
}

export default function TiptapEditor({
  documentId,
  documentTitle,
  template,
  project,
  initialContent,
  onSaveStatus,
}: TiptapEditorProps) {
  const [showAI, setShowAI] = useState(false)
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
          await saveDocumentContent(documentId, editor.getJSON() as Record<string, unknown>)
          onSaveStatus('saved')
        } catch {
          onSaveStatus('unsaved')
        }
      }, 1200)
    },
  })

  // Cleanup debounce on unmount
  useEffect(() => () => { if (saveDebounce.current) clearTimeout(saveDebounce.current) }, [])

  // Insertar markdown de la IA convirtiendo a texto plano (Tiptap lo parsea)
  const handleInsert = useCallback((markdown: string) => {
    if (!editor) return
    // Insertamos al final del documento como texto. En Fase 3 se puede
    // mejorar con un parseador de markdown a JSON de Tiptap.
    editor.chain().focus().insertContent(markdown).run()
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

          {/* Botón de IA */}
          <button
            onClick={() => setShowAI(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: showAI ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: showAI ? 'var(--accent-dim)' : 'transparent',
              color: showAI ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.72rem',
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
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

        {/* Footer: word/char count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.5rem 1.5rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <AlignLeft size={11} style={{ color: 'var(--text-dim)' }} />
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            {wordCount} palabras · {charCount} caracteres
          </span>
        </div>
      </div>

      {/* AI sidebar */}
      {showAI && (
        <AIAssistant
          documentTitle={documentTitle}
          template={template}
          project={project}
          currentText={getCurrentText()}
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
