import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!q) return NextResponse.json({ docs: [] })

    // Sin join embebido — mismo motivo que en lib/documents.ts (evitar 400
    // cuando la FK no está declarada como relación en el schema cache).
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, template, word_count, project_id, updated_at')
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) throw error

    const docs = data ?? []
    const projectIds = [...new Set(docs.map(d => d.project_id).filter(Boolean))]

    let projectMap = new Map<string, string>()
    if (projectIds.length > 0) {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds as string[])
      projectMap = new Map((projectsData ?? []).map(p => [p.id, p.name]))
    }

    const enriched = docs.map(d => ({
      ...d,
      project: d.project_id && projectMap.has(d.project_id)
        ? { id: d.project_id, name: projectMap.get(d.project_id) }
        : null,
    }))

    return NextResponse.json({ docs: enriched })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
