'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Loader2, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

interface ExportMenuProps {
  documentId:    string
  documentTitle: string
  editorRef?:    React.RefObject<HTMLDivElement | null>
}

export default function ExportMenu({ documentId, documentTitle, editorRef }: ExportMenuProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const toast   = useToast()

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleExportDocx() {
    setLoading('docx')
    setOpen(false)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, format: 'docx' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al exportar')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${documentTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Documento exportado como DOCX')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setLoading(null)
    }
  }

  async function handleExportPDF() {
    setLoading('pdf')
    setOpen(false)
    try {
      // Importación dinámica para no bloquear el bundle inicial
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      // Buscamos el área editable de Tiptap
      const editorEl = editorRef?.current
        ?? document.querySelector('.stratadoc-editor') as HTMLElement | null

      if (!editorEl) throw new Error('No se encontró el área del editor')

      toast.info?.('Generando PDF…')

      const canvas = await html2canvas(editorEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--bg').trim() || '#0a0a0a',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW  = pdf.internal.pageSize.getWidth()
      const pageH  = pdf.internal.pageSize.getHeight()
      const margin = 20
      const imgW   = pageW - margin * 2
      const imgH   = (canvas.height * imgW) / canvas.width

      let yPos  = margin
      let yLeft = imgH

      while (yLeft > 0) {
        pdf.addImage(imgData, 'PNG', margin, yPos, imgW, imgH)
        yLeft -= pageH - margin * 2
        if (yLeft > 0) {
          pdf.addPage()
          yPos = margin - (imgH - yLeft)
        }
      }

      pdf.save(`${documentTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.pdf`)
      toast.success('Documento exportado como PDF')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar PDF')
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.625rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--border)',
          background: open ? 'var(--surface2)' : 'transparent',
          color: 'var(--text-muted)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 500,
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
      >
        {isLoading
          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          : <Download size={12} />
        }
        Exportar
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          width: '160px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <button
            onClick={handleExportDocx}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem',
              textAlign: 'left', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <FileText size={13} style={{ color: 'var(--blue)' }} />
            Word (.docx)
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem',
              textAlign: 'left', transition: 'background 0.1s',
              borderTop: '1px solid var(--border)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <FileText size={13} style={{ color: 'var(--red-text)' }} />
            PDF
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
