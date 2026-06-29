import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  Document as DocxDocument, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType, BorderStyle,
} from 'docx'
import { z } from 'zod'

export const runtime = 'nodejs'

const exportSchema = z.object({
  documentId: z.string().uuid(),
  format:     z.enum(['docx']),
})

/** Convierte el JSON de Tiptap a nodos docx */
function tiptapToDocx(node: Record<string, unknown>): Paragraph[] {
  const paragraphs: Paragraph[] = []

  function processNode(n: Record<string, unknown>) {
    const type = n.type as string
    const content = (n.content ?? []) as Record<string, unknown>[]

    // Extrae runs de texto de nodos inline
    function getRuns(nodes: Record<string, unknown>[]): TextRun[] {
      return nodes.map(child => {
        const marks = ((child.marks ?? []) as Record<string, unknown>[]).map(m => m.type)
        return new TextRun({
          text:   String(child.text ?? ''),
          bold:   marks.includes('bold'),
          italics: marks.includes('italic'),
          strike: marks.includes('strike'),
          font:   'Georgia',
        })
      })
    }

    switch (type) {
      case 'doc':
        content.forEach(child => processNode(child))
        break

      case 'heading': {
        const levelMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
        }
        const level = (n.attrs as Record<string, number>)?.level ?? 1
        paragraphs.push(new Paragraph({
          heading: levelMap[level] ?? HeadingLevel.HEADING_1,
          children: getRuns(content),
          spacing: { before: 240, after: 120 },
        }))
        break
      }

      case 'paragraph':
        paragraphs.push(new Paragraph({
          children: content.length > 0 ? getRuns(content) : [new TextRun('')],
          spacing: { after: 160 },
          alignment: AlignmentType.JUSTIFIED,
        }))
        break

      case 'bulletList':
      case 'orderedList':
        content.forEach(item => {
          const itemContent = ((item.content ?? []) as Record<string, unknown>[])
          itemContent.forEach(p => {
            const pContent = ((p.content ?? []) as Record<string, unknown>[])
            paragraphs.push(new Paragraph({
              children: getRuns(pContent),
              bullet: type === 'bulletList' ? { level: 0 } : undefined,
              numbering: type === 'orderedList' ? { reference: 'default-numbering', level: 0 } : undefined,
              spacing: { after: 80 },
            }))
          })
        })
        break

      case 'blockquote':
        content.forEach(child => {
          const cContent = ((child.content ?? []) as Record<string, unknown>[])
          paragraphs.push(new Paragraph({
            children: getRuns(cContent),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: 'C8F04A', space: 8 },
            },
            spacing: { before: 120, after: 120 },
          }))
        })
        break

      case 'horizontalRule':
        paragraphs.push(new Paragraph({
          children: [],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          },
          spacing: { before: 240, after: 240 },
        }))
        break

      default:
        // Nodo no reconocido — lo ignoramos silenciosamente
        break
    }
  }

  processNode(node)
  return paragraphs
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let rawBody: unknown
    try { rawBody = await req.json() } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const parsed = exportSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
    }

    const { documentId, format } = parsed.data

    // Cargar el documento (RLS garantiza que solo el owner puede acceder)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('title, content, template')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    if (format === 'docx') {
      const paragraphs = tiptapToDocx((doc.content ?? { type: 'doc', content: [] }) as Record<string, unknown>)

      const docx = new DocxDocument({
        styles: {
          default: {
            document: {
              run: { font: 'Georgia', size: 24 },    // 12pt
              paragraph: { spacing: { line: 480 } },  // doble espacio (APA)
            },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 }, // 1" margen (APA)
            },
          },
          children: paragraphs,
        }],
      })

      const buffer = await Packer.toBuffer(docx)
      const uint8  = new Uint8Array(buffer)

      const filename = `${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.docx`
      return new NextResponse(uint8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': uint8.byteLength.toString(),
        },
      })
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
  } catch (err) {
    console.error('Export route error:', err)
    return NextResponse.json({ error: 'Error al generar el archivo' }, { status: 500 })
  }
}
