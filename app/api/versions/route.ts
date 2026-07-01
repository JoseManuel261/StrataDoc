import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createVersionSchema = z.object({
  documentId: z.string().uuid(),
  content:    z.record(z.string(), z.unknown()),
  wordCount:  z.number().int().min(0).default(0),
  label:      z.string().max(80).optional().default(''),
})

const deleteVersionSchema = z.object({
  versionId: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const documentId = req.nextUrl.searchParams.get('documentId')
    if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })

    const { data, error } = await supabase
      .from('document_versions')
      .select('id, document_id, content, word_count, label, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ versions: data ?? [] })
  } catch (err) {
    console.error('Versions GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let rawBody: unknown
    try { rawBody = await req.json() } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const parsed = createVersionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
    }

    const { documentId, content, wordCount, label } = parsed.data

    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('document_versions')
      .insert({ document_id: documentId, content, word_count: wordCount, label: label || null })
      .select('id, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ version: data }, { status: 201 })
  } catch (err) {
    console.error('Versions POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let rawBody: unknown
    try { rawBody = await req.json() } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const parsed = deleteVersionSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    const { error } = await supabase
      .from('document_versions')
      .delete()
      .eq('id', parsed.data.versionId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Versions DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
