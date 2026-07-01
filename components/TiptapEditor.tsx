'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'

// Extiende TextStyle para añadir el atributo fontSize
const TextStyleExtended = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: el => el.style.fontSize || null,
        renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    }
  },
})
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import FontFamily from '@tiptap/extension-font-family'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Underline as UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListTodo, Quote, Code,
  Minus, Undo, Redo,
  Sparkles, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Target, Highlighter, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Save, ChevronDown, Maximize2, Minimize2,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Search, X,
} from 'lucide-react'
import { saveDocumentContent } from '@/lib/documents'
import AIAssistant from '@/components/AIAssistant'
import TableOfContents from '@/components/TableOfContents'
import type { DocumentTemplate, ProjectSummary } from '@/lib/types'
import { SAVE_DEBOUNCE_MS } from '@/lib/constants'

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  documentId:    string
  documentTitle: string
  template:      DocumentTemplate
  project:       ProjectSummary | null
  initialContent: Record<string, unknown> | null
  onSaveStatus:  (status: 'saved' | 'saving' | 'unsaved') => void
  onContentChange?: (content: Record<string, unknown>, wordCount: number) => void
}

const TEMPLATE_STYLES: Record<DocumentTemplate, React.CSSProperties> = {
  free:       { fontFamily: 'Fenix, serif',        fontSize: '1.05rem', lineHeight: '1.85' },
  apa:        { fontFamily: 'Fenix, serif',        fontSize: '1rem',    lineHeight: '2'    },
  scientific: { fontFamily: 'Syne, sans-serif',    fontSize: '0.9375rem', lineHeight: '1.7' },
}

const FONT_FAMILIES = [
  { label: 'Predeterminada', value: '' },
  { label: 'Fenix (Serif)',  value: 'Fenix, serif' },
  { label: 'Syne',          value: 'Syne, sans-serif' },
  { label: 'DM Mono',       value: 'DM Mono, monospace' },
  { label: 'Georgia',       value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Arial',         value: 'Arial, sans-serif' },
  { label: 'Courier New',   value: 'Courier New, monospace' },
]

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Lima',    value: '#c8f04a' },
  { label: 'Azul',    value: '#60a5fa' },
  { label: 'Rojo',    value: '#f87171' },
  { label: 'Naranja', value: '#fb923c' },
  { label: 'Morado',  value: '#c084fc' },
  { label: 'Gris',    value: '#9ca3af' },
  { label: 'Negro',   value: '#000000' },
  { label: 'Blanco',  value: '#ffffff' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Lima',    value: '#c8f04a55' },
  { label: 'Azul',    value: '#60a5fa44' },
  { label: 'Rojo',    value: '#f8717144' },
  { label: 'Naranja', value: '#fb923c44' },
  { label: 'Amarillo', value: '#fde04788' },
]

function inlineToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

export default function TiptapEditor({
  documentId, documentTitle, template, project,
  initialContent, onSaveStatus, onContentChange,
}: TiptapEditorProps) {
  const [showAI, setShowAI]                   = useState(false)
  const [showTOC, setShowTOC]                 = useState(false)
  const [zenMode, setZenMode]                 = useState(false)
  const [wordTarget, setWordTarget]            = useState<number | null>(null)
  const [showTargetInput, setShowTargetInput] = useState(false)
  const [targetInputVal, setTargetInputVal]   = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontFamily, setShowFontFamily]   = useState(false)
  const [showFontSize, setShowFontSize]       = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [lastSaved, setLastSaved]             = useState<Date | null>(null)
  // Buscar y reemplazar
  const [showSearch, setShowSearch]           = useState(false)
  const [searchTerm, setSearchTerm]           = useState('')
  const [replaceTerm, setReplaceTerm]         = useState('')
  const [searchCount, setSearchCount]         = useState(0)

  const saveDebounce    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colorRef        = useRef<HTMLDivElement>(null)
  const highlightRef    = useRef<HTMLDivElement>(null)
  const fontFamilyRef   = useRef<HTMLDivElement>(null)
  const fontSizeRef     = useRef<HTMLDivElement>(null)

  // Cerrar dropdowns al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colorRef.current      && !colorRef.current.contains(e.target as Node))      setShowColorPicker(false)
      if (highlightRef.current  && !highlightRef.current.contains(e.target as Node))  setShowHighlightPicker(false)
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) setShowFontFamily(false)
      if (fontSizeRef.current   && !fontSizeRef.current.contains(e.target as Node))   setShowFontSize(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const editor = useEditor({
    extensions: [
      // StarterKit v3 ya incluye: Bold, Italic, Strike, Code, CodeBlock,
      // Heading, BulletList, OrderedList, Blockquote, HorizontalRule,
      // Link, Underline, History, Dropcursor, Gapcursor, Text, Document, Paragraph.
      // Los desactivamos individualmente para sustituir con versiones configuradas.
      StarterKit.configure({
        heading:    { levels: [1, 2, 3] },
        link:       false,   // usamos Link configurado abajo
        underline:  false,   // usamos Underline abajo
        codeBlock:  false,   // usamos CodeBlockLowlight
      }),
      Placeholder.configure({ placeholder: 'Empieza a escribir, o usa el asistente IA…' }),
      CharacterCount,
      Underline,
      TextStyleExtended,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
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
          setLastSaved(new Date())
          onSaveStatus('saved')
        } catch {
          onSaveStatus('unsaved')
        }
      }, SAVE_DEBOUNCE_MS)
    },
  })

  useEffect(() => () => { if (saveDebounce.current) clearTimeout(saveDebounce.current) }, [])

  // Guardado manual
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
      setLastSaved(new Date())
      onSaveStatus('saved')
    } catch {
      onSaveStatus('unsaved')
    } finally {
      setSaving(false)
    }
  }, [editor, saving, documentId, onSaveStatus, onContentChange])

  // Ctrl+S
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowSearch(v => !v) }
      if (e.key === 'Escape') { setZenMode(false); setShowSearch(false) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') { e.preventDefault(); setShowAI(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleManualSave])

  // Buscar y reemplazar en el texto del editor
  const handleSearch = useCallback(() => {
    if (!editor || !searchTerm) return
    const text = editor.getText()
    const count = (text.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) ?? []).length
    setSearchCount(count)
  }, [editor, searchTerm])

  const handleReplace = useCallback(() => {
    if (!editor || !searchTerm) return
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)
    if (selectedText.toLowerCase() === searchTerm.toLowerCase()) {
      editor.chain().focus().insertContent(replaceTerm).run()
    }
  }, [editor, searchTerm, replaceTerm])

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchTerm) return
    // Implementación simple: reemplaza en el HTML serializado
    const html = editor.getHTML()
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const replaced = html.replace(new RegExp(escaped, 'gi'), replaceTerm)
    editor.commands.setContent(replaced)
    setSearchCount(0)
  }, [editor, searchTerm, replaceTerm])

  const handleSetLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string || ''
    const url  = window.prompt('URL del enlace:', prev)
    if (url === null) return
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const handleInsertImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL de la imagen:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const handleInsertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  // Insertar desde IA
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
      if (t.startsWith('- [ ] ') || t.startsWith('- [x] ')) {
        flushList()
        editor.commands.insertContent(`<ul data-type="taskList"><li data-type="taskItem" data-checked="${t.startsWith('- [x]')}">${inlineToHtml(t.slice(6))}</li></ul>`)
        continue
      }
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
      if (!t)               editor.commands.insertContent('<p></p>')
      else if (t.startsWith('### ')) editor.commands.insertContent(`<h3>${inlineToHtml(t.slice(4))}</h3>`)
      else if (t.startsWith('## '))  editor.commands.insertContent(`<h2>${inlineToHtml(t.slice(3))}</h2>`)
      else if (t.startsWith('# '))   editor.commands.insertContent(`<h1>${inlineToHtml(t.slice(2))}</h1>`)
      else if (t.startsWith('> '))   editor.commands.insertContent(`<blockquote><p>${inlineToHtml(t.slice(2))}</p></blockquote>`)
      else if (t.startsWith('```'))  editor.commands.insertContent(`<pre><code>${t.slice(3)}</code></pre>`)
      else if (t === '---' || t === '***') editor.commands.insertContent('<hr />')
      else editor.commands.insertContent(`<p>${inlineToHtml(t)}</p>`)
    }
    flushList()
    setShowAI(false)
  }, [editor])

  const getCurrentText = useCallback(() => editor?.getText() ?? '', [editor])

  const charCount = editor?.storage.characterCount.characters() ?? 0
  const wordCount = editor?.storage.characterCount.words()      ?? 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  if (!editor) return null

  // Modo zen: oculta todo excepto el área de escritura
  if (zenMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <button onClick={() => setZenMode(false)} title="Salir del modo zen (Esc)"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem' }}>
            <Minimize2 size={12} /> Salir del modo zen
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4rem 2rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <EditorContent editor={editor} style={TEMPLATE_STYLES[template]} />
          </div>
        </div>
        <div style={{ padding: '0.5rem 1.5rem', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem' }}>
          {wordCount} palabras · {charCount} caracteres · ~{readingTime} min lectura
        </div>
        <style>{EDITOR_CSS}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {showTOC && <TableOfContents editor={editor} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOOLBAR ── */}
        <div className="editor-toolbar" style={{
          display: 'flex', alignItems: 'center', gap: '0.125rem',
          padding: '0.375rem 0.75rem', borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap', flexShrink: 0, background: 'var(--surface)',
        }}>

          {/* Headings */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Familia de fuente */}
          <div ref={fontFamilyRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowFontFamily(v => !v); setShowFontSize(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', height: '28px', padding: '0 0.4rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', transition: 'all 0.1s' }}
              title="Familia de fuente"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {FONT_FAMILIES.find(f => f.value === editor.getAttributes('textStyle').fontFamily)?.label ?? 'Fuente'}
              </span>
              <ChevronDown size={9} />
            </button>
            {showFontFamily && (
              <DropdownMenu items={FONT_FAMILIES.map(f => ({
                label: f.label,
                active: editor.getAttributes('textStyle').fontFamily === f.value,
                onClick: () => {
                  if (!f.value) editor.chain().focus().unsetFontFamily().run()
                  else editor.chain().focus().setFontFamily(f.value).run()
                  setShowFontFamily(false)
                },
                style: { fontFamily: f.value || 'inherit' },
              }))} />
            )}
          </div>

          {/* Tamaño de fuente */}
          <div ref={fontSizeRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowFontSize(v => !v); setShowFontFamily(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', height: '28px', padding: '0 0.4rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'DM Mono, monospace', transition: 'all 0.1s' }}
              title="Tamaño de fuente"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {editor.getAttributes('textStyle').fontSize ?? '—'}
              <ChevronDown size={9} />
            </button>
            {showFontSize && (
              <DropdownMenu items={FONT_SIZES.map(s => ({
                label: s,
                active: editor.getAttributes('textStyle').fontSize === s,
                onClick: () => {
                  editor.chain().focus().setMark('textStyle', { fontSize: s }).run()
                  setShowFontSize(false)
                },
              }))} />
            )}
          </div>

          <Divider />

          {/* Formato inline */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Negrita (Ctrl+B)"><Bold size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Cursiva (Ctrl+I)"><Italic size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado (Ctrl+U)"><UnderlineIcon size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Tachado"><Strikethrough size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()}   active={editor.isActive('subscript')}   title="Subíndice"><SubscriptIcon size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superíndice"><SuperscriptIcon size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline"><Code size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Color texto */}
          <div ref={colorRef} style={{ position: 'relative' }}>
            <button title="Color de texto" onClick={() => { setShowColorPicker(v => !v); setShowHighlightPicker(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', height: '28px', padding: '0 0.375rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'Syne', fontSize: '0.8rem', fontWeight: 700, color: editor.getAttributes('textStyle').color || 'var(--text)', textDecoration: 'underline', textDecorationColor: editor.getAttributes('textStyle').color || 'var(--accent)' }}>A</span>
              <ChevronDown size={9} style={{ color: 'var(--text-dim)' }} />
            </button>
            {showColorPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: '130px' }}>
                {TEXT_COLORS.map(c => (
                  <button key={c.value} onClick={() => { if (!c.value) editor.chain().focus().unsetColor().run(); else editor.chain().focus().setColor(c.value).run(); setShowColorPicker(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%' }}
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
            <button title="Resaltar" onClick={() => { setShowHighlightPicker(v => !v); setShowColorPicker(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', height: '28px', padding: '0 0.375rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Highlighter size={13} style={{ color: editor.isActive('highlight') ? 'var(--accent)' : 'var(--text-muted)' }} />
              <ChevronDown size={9} style={{ color: 'var(--text-dim)' }} />
            </button>
            {showHighlightPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem', display: 'flex', gap: '0.375rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false) }}
                  style={{ width: '20px', height: '20px', borderRadius: '0.25rem', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)' }}>✕</button>
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.value} onClick={() => { editor.chain().focus().setHighlight({ color: c.value }).run(); setShowHighlightPicker(false) }}
                    style={{ width: '20px', height: '20px', borderRadius: '0.25rem', border: '1px solid var(--border)', background: c.value, cursor: 'pointer' }} title={c.label} />
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* Alineación */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({ textAlign: 'left' })}    title="Izquierda"><AlignLeft    size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({ textAlign: 'center' })}  title="Centrar"><AlignCenter  size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({ textAlign: 'right' })}   title="Derecha"><AlignRight   size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar"><AlignJustify size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Listas y bloques */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Lista con viñetas"><List      size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()}    active={editor.isActive('taskList')}    title="Lista de tareas"><ListTodo   size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Cita"><Quote      size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()}   active={editor.isActive('codeBlock')}   title="Bloque de código"><Code      size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Línea divisoria"><Minus      size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Insertar */}
          <ToolGroup>
            <ToolBtn onClick={handleSetLink}     active={editor.isActive('link')}  title="Enlace"><LinkIcon  size={13} /></ToolBtn>
            <ToolBtn onClick={handleInsertImage} active={false}                    title="Imagen por URL"><ImageIcon size={13} /></ToolBtn>
            <ToolBtn onClick={handleInsertTable} active={editor.isActive('table')} title="Tabla 3×3"><TableIcon size={13} /></ToolBtn>
          </ToolGroup>

          <Divider />

          {/* Deshacer/Rehacer */}
          <ToolGroup>
            <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Deshacer" disabled={!editor.can().undo()}><Undo size={13} /></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Rehacer"  disabled={!editor.can().redo()}><Redo size={13} /></ToolBtn>
          </ToolGroup>

          <div style={{ flex: 1 }} />

          {/* Meta de palabras */}
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

          {/* TOC */}
          <button onClick={() => setShowTOC(v => !v)} title="Tabla de contenidos"
            style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: showTOC ? '1px solid var(--accent)' : '1px solid var(--border)', background: showTOC ? 'var(--accent-dim)' : 'transparent', color: showTOC ? 'var(--accent-text)' : 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.1s' }}>
            <AlignLeft size={11} />
          </button>

          {/* Buscar */}
          <button onClick={() => setShowSearch(v => !v)} title="Buscar y reemplazar (Ctrl+F)"
            style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: showSearch ? '1px solid var(--accent)' : '1px solid var(--border)', background: showSearch ? 'var(--accent-dim)' : 'transparent', color: showSearch ? 'var(--accent-text)' : 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.1s' }}>
            <Search size={11} />
          </button>

          {/* Modo Zen */}
          <button onClick={() => setZenMode(true)} title="Modo zen — escritura sin distracciones"
            style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
            <Maximize2 size={11} />
          </button>

          {/* Guardar manual */}
          <button onClick={handleManualSave} disabled={saving} title="Guardar (Ctrl+S)"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: saving ? 'var(--surface2)' : 'transparent', color: saving ? 'var(--text-dim)' : 'var(--text-muted)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 500, transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>
            <Save size={12} />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>

          {/* IA */}
          <button onClick={() => setShowAI(v => !v)} title="Asistente IA (Ctrl+Shift+A)"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: showAI ? '1px solid var(--accent)' : '1px solid var(--border)', background: showAI ? 'var(--accent-dim)' : 'transparent', color: showAI ? 'var(--accent-text)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s' }}>
            <Sparkles size={12} /> IA
          </button>
        </div>

        {/* Buscar y reemplazar */}
        {showSearch && (
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <Search size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSearchCount(0) }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar…"
              style={{ padding: '0.25rem 0.5rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.3rem', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none', width: '140px' }} />
            <input value={replaceTerm} onChange={e => setReplaceTerm(e.target.value)}
              placeholder="Reemplazar por…"
              style={{ padding: '0.25rem 0.5rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0.3rem', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none', width: '160px' }} />
            <button onClick={handleSearch} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.3rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', cursor: 'pointer' }}>Buscar</button>
            <button onClick={handleReplace} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.3rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', cursor: 'pointer' }}>Reemplazar</button>
            <button onClick={handleReplaceAll} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.3rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', cursor: 'pointer' }}>Reemplazar todo</button>
            {searchCount > 0 && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--text-dim)' }}>{searchCount} encontrado{searchCount !== 1 ? 's' : ''}</span>}
            {searchCount === 0 && searchTerm && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--text-dim)' }}>Sin resultados</span>}
            <button onClick={() => { setShowSearch(false); setSearchTerm(''); setReplaceTerm(''); setSearchCount(0) }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Área editable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <EditorContent editor={editor} style={TEMPLATE_STYLES[template]} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.375rem 1.5rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {wordCount} palabras · {charCount} caracteres · ~{readingTime} min
          </span>
          {lastSaved && (
            <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              · guardado {lastSaved.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {wordTarget && wordTarget > 0 && (
            <>
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '2px', transition: 'width 0.4s', background: wordCount >= wordTarget ? 'var(--accent)' : 'var(--blue)', width: `${Math.min((wordCount / wordTarget) * 100, 100)}%` }} />
              </div>
              <span className="mono" style={{ fontSize: '0.6rem', color: wordCount >= wordTarget ? 'var(--accent-text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {wordCount >= wordTarget ? '✓ Meta alcanzada' : `${wordTarget - wordCount} restantes`}
              </span>
            </>
          )}
        </div>
      </div>

      {showAI && (
        <AIAssistant documentTitle={documentTitle} template={template} project={project}
          getCurrentText={getCurrentText} onInsert={handleInsert} onClose={() => setShowAI(false)} />
      )}

      <style>{EDITOR_CSS}</style>
    </div>
  )
}

const EDITOR_CSS = `
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
  .stratadoc-editor ul[data-type="taskList"] { list-style: none; padding-left: 0.25rem; }
  .stratadoc-editor li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.25rem 0; }
  .stratadoc-editor li[data-type="taskItem"] > label { flex-shrink: 0; margin-top: 0.2rem; }
  .stratadoc-editor li[data-type="taskItem"] > label input[type="checkbox"] { accent-color: var(--accent); width: 14px; height: 14px; cursor: pointer; }
  .stratadoc-editor li[data-type="taskItem"][data-checked="true"] > div { text-decoration: line-through; color: var(--text-muted); }
  .stratadoc-editor hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
  .stratadoc-editor code { font-family: 'DM Mono', monospace; font-size: 0.85em; background: var(--surface2); border: 1px solid var(--border); border-radius: 0.25rem; padding: 0.1em 0.35em; color: var(--accent); }
  .stratadoc-editor pre { background: #0d1117; border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
  .stratadoc-editor pre code { background: none; border: none; padding: 0; color: #e6edf3; font-size: 0.85rem; }
  .stratadoc-editor ::selection { background: var(--accent); color: #000; }
  .editor-link { color: var(--blue); text-decoration: underline; cursor: pointer; }
  .stratadoc-editor table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  .stratadoc-editor th, .stratadoc-editor td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
  .stratadoc-editor th { background: var(--surface2); font-family: Syne, sans-serif; font-size: 0.8rem; font-weight: 600; color: var(--text); }
  .stratadoc-editor td { color: var(--text); font-size: 0.9rem; }
  .selectedCell { background: var(--accent-dim) !important; }
  .stratadoc-editor img { max-width: 100%; border-radius: 0.375rem; margin: 0.5rem 0; }
  /* Sintaxis de código */
  .hljs-keyword { color: #ff7b72; } .hljs-string { color: #a5d6ff; }
  .hljs-comment { color: #8b949e; font-style: italic; } .hljs-number { color: #79c0ff; }
  .hljs-function { color: #d2a8ff; } .hljs-variable { color: #ffa657; }
  @keyframes spin { to { transform: rotate(360deg); } }
`

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '0.0625rem' }}>{children}</div>
}

function Divider() {
  return <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 0.25rem', flexShrink: 0 }} />
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
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      {children}
    </button>
  )
}

interface DropdownItem {
  label: string
  active: boolean
  onClick: () => void
  style?: React.CSSProperties
}

function DropdownMenu({ items }: { items: DropdownItem[] }) {
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.375rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: '150px', maxHeight: '200px', overflowY: 'auto' }}>
      {items.map((item, i) => (
        <button key={i} onClick={item.onClick}
          style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', border: 'none', background: item.active ? 'var(--accent-dim)' : 'transparent', color: item.active ? 'var(--accent-text)' : 'var(--text)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', textAlign: 'left', ...item.style }}
          onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
          onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          {item.label}
        </button>
      ))}
    </div>
  )
}
