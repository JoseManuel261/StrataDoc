'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Underline as UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Minus, Undo, Redo,
  Sparkles, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Target, Highlighter, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Save, ChevronDown,
} from 'lucide-react'
import { saveDocumentContent } from '@/lib/documents'
import AIAssistant from '@/components/AIAssistant'
import TableOfContents from '@/components/TableOfContents'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'
import { SAVE_DEBOUNCE_MS } from '@/lib/constants'

interface TiptapEditorProps {
  documentId: string
  documentTitle: string
  template: DocumentTemplate
  project: ProjectSummary | null
  initialContent: Record<string, unknown> | null
  onSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void
  onContentChange?: (content: Record<string, unknown>, wordCount: number) => void
}

const TEMPLATE_STYLES: Record<DocumentTemplate, React.CSSProperties> = {
  free:       { fontFamily: 'Fenix, serif',  fontSize: '1.05rem', lineHeight: '1.85' },
  apa:        { fontFamily: 'Fenix, serif',  fontSize: '1rem',    lineHeight: '2'    },
  scientific: { fontFamily: 'Syne, sans-serif', fontSize: '0.9375rem', lineHeight: '1.7' },
}

function inlineToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/_(.+?)_/g,       '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
}

// Colores de texto predefinidos
const TEXT_COLORS = [
  { label: 'Default',  value: '' },
  { label: 'Lima',     value: '#c8f04a' },
  { label: 'Azul',     value: '#60a5fa' },
  { label: 'Rojo',     value: '#f87171' },
  { label: 'Naranja',  value: '#fb923c' },
  { label: 'Morado',   value: '#c084fc' },
  { label: 'Gris',     value: '#9ca3af' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Lima',    value: '#c8f04a33' },
  { label: 'Azul',   value: '#60a5fa33' },
  { label: 'Rojo',   value: '#f8717133' },
  { label: 'Naranja', value: '#fb923c33' },
]

export default function TiptapEditor({
  documentId,
  documentTitle,
  template,
  project,
  initialContent,
  onSaveStatus,
  onContentChange,
}: TiptapEditorProps) {
  const [showAI, setShowAI]               = useState(false)
  const [showTOC, setShowTOC]             = useState(false)
  const [wordTarget, setWordTarget]        = useState<number | null>(null)
  const [showTargetInput, setShowTargetInput] = useState(false)
  const [targetInputVal, setTargetInputVal]   = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [saving, setSaving]               = useState(false)
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colorRef     = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Cerrar pickers al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false)
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setShowHighlightPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Empieza a escribir, o usa el asistente IA para generar un borrador…' }),
      CharacterCount,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: { class: 'stratadoc-editor', spellcheck: 'true' },
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
      }, SAVE_DEBOUNCE_MS)
    },
  })

  useEffect(() => () => { if (saveDebounce.current) clearTimeout(saveDebounce.current) }, [])

  // Guardado manual inmediato
  const handleManualSave = useCallback(async () => {
    if (!editor || saving) return
    if (saveDebounce.current) clearTimeout(saveDebounce.current)
    setSaving(true)
    onSaveStatus('saving')
    try {
      const wc      = editor.storage.characterCount.words() as number
      const content = editor.getJSON() as Record<string, unknown>
      await saveDocumentContent(documentId, content, wc)
      onContentChange?.(content, wc)
      onSaveStatus('saved')
    } catch {
      onSaveStatus('unsaved')
    } finally {
      setSaving(false)
    }
  }, [editor, saving, documentId, onSaveStatus, onContentChange])

  // Ctrl+S para guardar
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleManualSave])

  // Insertar link
  const handleSetLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string || ''
    const url  = window.prompt('URL del enlace:', prev)
    if (url === null) return
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  // Insertar imagen por URL
  const handleInsertImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL de la imagen:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  // Insertar tabla 3×3
  const handleInsertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  // Parser markdown → Tiptap
  const handleInsert = useCallback((markdown: string) => {
    if (!editor) return
    const isEmpty = editor.state.doc.textContent.trim() === ''
    if (isEmpty) editor.commands.clearContent()
    editor.chain().focus().run()
    editor.commands.setTextSelection(editor.state.doc.content.size)

    let pendingList: { type: 'ul' | 'ol'; items: string[] } | null = null

    function flushList() {
      if (!pendingList) return
      const tag  = pendingList.type === 'ul' ? 'ul' : 'ol'
      const html = `<${tag}>${pendingList.items.map(i => `<li><p>${i}</p></li>`).join('')}</${tag}>`
      editor!.commands.insertContent(html)
      pendingList = null
    }

    for (const line of markdown.split('\n')) {
      const t = line.trim()
      if (t.startsWith('- ') || t.startsWith('* ')) {
        const text = inlineToHtml(t.slice(2))
        if (pendingList?.type === 'ul') pendingList.items.push(text)
        else { flushList(); pendingList = { type: 'ul', items: [text] } }
        continue
      }
      if (/^\d+\.\s/.test(t)) {
        const text = inlineToHtml(t.replace(/^\d+\.\s/, ''))
        if (pendingList?.type === 'ol') pendingList.items.push(text)
        else { flushList(); pendingList = { type: 'ol', items: [text] } }
        continue
      }
      flushList()
      if (!t)                     editor.commands.insertContent('<p></p>')
      else if (t.startsWith('### ')) editor.commands.insertContent(`<h3>${inlineToHtml(t.slice(4))}</h3>`)
      else if (t.startsWith('## ')) editor.commands.insertContent(`<h2>${inlineToHtml(t.slice(3))}</h2>`)
      else if (t.startsWith('# '))  editor.commands.insertContent(`<h1>${inlineToHtml(t.slice(2))}</h1>`)
      else if (t.startsWith('> '))  editor.commands.insertContent(`<blockquote><p>${inlineToHtml(t.slice(2))}</p></blockquote>`)
      else if (t === '---' || t === '***') editor.commands.insertContent('<hr />')
      else editor.commands.insertContent(`<p>${inlineToHtml(t)}</p>`)
    }
    flushList()
    setShowAI(false)
  }, [editor])

  const getCurrentText = useCallback(() => editor?.getText() ?? '', [editor])

  const charCount  = editor?.storage.characterCount.characters() ?? 0
  const wordCount  = editor?.storage.characterCount.words()      ?? 0

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {showTOC && <TableOfContents editor={editor} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOOLBAR ROW 1: Headings + formato básico + guardar ── */}
        <div className="editor-toolbar" style={{
          display: 'flex', alignItems: 'center', gap: '0.125rem',
          padding: '0.375rem 1rem', borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap', flexShrink: 0, background: 'var(--surface)',
        }}>
          {/* Headings */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1 (H1)"><Heading1 size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2 (H2)"><Heading2 size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3 (H3)"><Heading3 size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Formato inline */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}       active={editor.isActive('bold')}      title="Negrita (Ctrl+B)"><Bold size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}     active={editor.isActive('italic')}    title="Cursiva (Ctrl+I)"><Italic size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()}  active={editor.isActive('underline')} title="Subrayado (Ctrl+U)"><UnderlineIcon size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()}     active={editor.isActive('strike')}    title="Tachado"><Strikethrough size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Color de texto */}
          <div ref={colorRef} style={{ position: 'relative' }}>
            <button
              title="Color de texto"
              onClick={() => { setShowColorPicker(v => !v); setShowHighlightPicker(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.15rem',
                height: '28px', padding: '0 0.375rem',
                borderRadius: '0.25rem', border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'Syne', fontSize: '0.8rem', fontWeight: 700, color: editor.getAttributes('textStyle').color || 'var(--text)' }}>A</span>
              <ChevronDown size={9} style={{ color: 'var(--text-dim)' }} />
            </button>
            {showColorPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: '120px' }}>
                {TEXT_COLORS.map(c => (
                  <button key={c.value} onClick={() => {
                    if (!c.value) editor.chain().focus().unsetColor().run()
                    else editor.chain().focus().setColor(c.value).run()
                    setShowColorPicker(false)
                  }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.value || 'var(--text)', border: '1px solid var(--border)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Syne', fontSize: '0.72rem', color: 'var(--text)' }}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resaltado */}
          <div ref={highlightRef} style={{ position: 'relative' }}>
            <button
              title="Resaltar texto"
              onClick={() => { setShowHighlightPicker(v => !v); setShowColorPicker(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.15rem',
                height: '28px', padding: '0 0.375rem',
                borderRadius: '0.25rem', border: 'none', background: 'transparent',
                cursor: 'pointer', transition: 'all 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Highlighter size={13} style={{ color: editor.isActive('highlight') ? 'var(--accent)' : 'var(--text-muted)' }} />
              <ChevronDown size={9} style={{ color: 'var(--text-dim)' }} />
            </button>
            {showHighlightPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem', display: 'flex', gap: '0.375rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false) }}
                  style={{ width: '20px', height: '20px', borderRadius: '0.25rem', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} title="Sin resaltado"
                >✕</button>
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.value} onClick={() => { editor.chain().focus().setHighlight({ color: c.value }).run(); setShowHighlightPicker(false) }}
                    style={{ width: '20px', height: '20px', borderRadius: '0.25rem', border: '1px solid var(--border)', background: c.value, cursor: 'pointer' }} title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* Alineación */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({ textAlign: 'left' })}    title="Alinear izquierda"><AlignLeft    size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({ textAlign: 'center' })}  title="Centrar"><AlignCenter  size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({ textAlign: 'right' })}   title="Alinear derecha"><AlignRight   size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar"><AlignJustify size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Listas y bloques */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Lista con viñetas"><List         size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered   size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Cita"><Quote        size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Línea divisoria"><Minus        size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Insertar: link, imagen, tabla */}
          <ToolGroup>
            <ToolBtn onClick={handleSetLink}      active={editor.isActive('link')} title="Insertar / editar enlace"><LinkIcon  size={13} /></ToolBtn>
            <ToolBtn onClick={handleInsertImage}  active={false}                   title="Insertar imagen por URL"><ImageIcon size={13} /></ToolBtn>
            <ToolBtn onClick={handleInsertTable}  active={editor.isActive('table')} title="Insertar tabla 3×3"><TableIcon size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Undo / Redo */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Deshacer (Ctrl+Z)"    disabled={!editor.can().undo()}><Undo  size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Rehacer (Ctrl+Shift+Z)" disabled={!editor.can().redo()}><Redo  size={13} /></ToolBtn>
          </ToolGroup>

          <div style={{ flex: 1 }} />

          {/* Objetivo de palabras */}
          {showTargetInput ? (
            <input autoFocus type="number" value={targetInputVal}
              onChange={e => setTargetInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { const n = parseInt(targetInputVal); setWordTarget(n > 0 ? n : null); setShowTargetInput(false); setTargetInputVal('') }
                if (e.key === 'Escape') { setShowTargetInput(false); setTargetInputVal('') }
              }}
              onBlur={() => { setShowTargetInput(false); setTargetInputVal('') }}
              placeholder="ej. 2000"
              style={{ width: '80px', padding: '0.25rem 0.5rem', background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: '0.3rem', color: 'var(--text)', fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', outline: 'none' }}
            />
          ) : (
            <button onClick={() => setShowTargetInput(true)} title={wordTarget ? `Objetivo: ${wordTarget} palabras` : 'Meta de palabras'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: '1px solid var(--border)', background: 'transparent', color: wordTarget ? 'var(--accent-text)' : 'var(--text-dim)', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', transition: 'all 0.1s' }}>
              <Target size={11} />
              {wordTarget ? `${Math.min(wordCount, wordTarget)}/${wordTarget}` : 'Meta'}
            </button>
          )}

          {/* TOC toggle */}
          <button onClick={() => setShowTOC(v => !v)} title="Tabla de contenidos"
            style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: showTOC ? '1px solid var(--accent)' : '1px solid var(--border)', background: showTOC ? 'var(--accent-dim)' : 'transparent', color: showTOC ? 'var(--accent-text)' : 'var(--text-dim)', cursor: 'pointer', fontSize: '0.6rem', transition: 'all 0.1s' }}>
            <AlignLeft size={11} />
          </button>

          {/* Botón guardar manual */}
          <button
            onClick={handleManualSave}
            disabled={saving}
            title="Guardar ahora (Ctrl+S)"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.625rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border)',
              background: saving ? 'var(--surface2)' : 'transparent',
              color: saving ? 'var(--text-dim)' : 'var(--text-muted)',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            <Save size={12} />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>

          {/* IA */}
          <button onClick={() => setShowAI(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: showAI ? '1px solid var(--accent)' : '1px solid var(--border)', background: showAI ? 'var(--accent-dim)' : 'transparent', color: showAI ? 'var(--accent-text)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s' }}>
            <Sparkles size={12} />
            IA
          </button>
        </div>

        {/* Área editable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <EditorContent editor={editor} style={TEMPLATE_STYLES[template]} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1.5rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            {wordCount} palabras · {charCount} caracteres
          </span>
          {wordTarget && wordTarget > 0 && (
            <>
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '2px', transition: 'width 0.4s', background: wordCount >= wordTarget ? 'var(--accent)' : 'var(--blue)', width: `${Math.min((wordCount / wordTarget) * 100, 100)}%` }} />
              </div>
              <span className="mono" style={{ fontSize: '0.6rem', color: wordCount >= wordTarget ? 'var(--accent-text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {wordCount >= wordTarget ? '✓ Meta alcanzada' : `${wordTarget - wordCount} palabras restantes`}
              </span>
            </>
          )}
        </div>
      </div>

      {showAI && (
        <AIAssistant documentTitle={documentTitle} template={template} project={project} getCurrentText={getCurrentText} onInsert={handleInsert} onClose={() => setShowAI(false)} />
      )}

      <style>{`
        .stratadoc-editor { outline: none; min-height: 60vh; color: var(--text); }
        .stratadoc-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-dim); float: left; pointer-events: none; height: 0; }
        .stratadoc-editor h1 { font-family: Fenix, serif; font-size: 2rem; font-weight: 400; color: var(--text); margin: 1.5rem 0 0.75rem; letter-spacing: -0.02em; line-height: 1.15; }
        .stratadoc-editor h2 { font-family: Fenix, serif; font-size: 1.4rem; font-weight: 400; color: var(--text); margin: 1.25rem 0 0.6rem; letter-spacing: -0.01em; }
        .stratadoc-editor h3 { font-family: Syne, sans-serif; font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 1rem 0 0.5rem; }
        .stratadoc-editor p { margin: 0.5rem 0; color: var(--text); }
        .stratadoc-editor strong { color: var(--text); }
        .stratadoc-editor em { color: var(--text); }
        .stratadoc-editor u { text-decoration: underline; }
        .stratadoc-editor s { text-decoration: line-through; }
        .stratadoc-editor blockquote { border-left: 3px solid var(--accent); margin: 1rem 0; padding: 0.5rem 1rem; color: var(--text-muted); background: var(--accent-dim); border-radius: 0 0.375rem 0.375rem 0; }
        .stratadoc-editor ul, .stratadoc-editor ol { padding-left: 1.5rem; margin: 0.5rem 0; color: var(--text); }
        .stratadoc-editor li { margin: 0.25rem 0; }
        .stratadoc-editor hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
        .stratadoc-editor code { font-family: 'DM Mono', monospace; font-size: 0.85em; background: var(--surface2); border: 1px solid var(--border); border-radius: 0.25rem; padding: 0.1em 0.35em; color: var(--accent); }
        .stratadoc-editor pre { background: var(--surface2); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
        .stratadoc-editor pre code { background: none; border: none; padding: 0; color: var(--text); }
        .stratadoc-editor ::selection { background: var(--accent); color: #000; }
        .editor-link { color: var(--blue); text-decoration: underline; cursor: pointer; }
        /* Tablas */
        .stratadoc-editor table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .stratadoc-editor th, .stratadoc-editor td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
        .stratadoc-editor th { background: var(--surface2); font-family: Syne, sans-serif; font-size: 0.8rem; font-weight: 600; color: var(--text); }
        .stratadoc-editor td { color: var(--text); font-size: 0.9rem; }
        .selectedCell { background: var(--accent-dim) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '0.0625rem' }}>{children}</div>
}

function Divider() {
  return <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 0.2rem', flexShrink: 0 }} />
}

function ToolBtn({ onClick, active, title, disabled, children }: {
  onClick: () => void; active: boolean; title: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '28px', height: '28px', borderRadius: '0.25rem', border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: active ? 'var(--accent-dim)' : 'transparent',
      color: active ? 'var(--accent)' : disabled ? 'var(--text-dim)' : 'var(--text-muted)',
      transition: 'all 0.1s', opacity: disabled ? 0.4 : 1, flexShrink: 0,
    }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
