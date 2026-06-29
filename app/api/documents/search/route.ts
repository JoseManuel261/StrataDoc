import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!q) return NextResponse.json({ docs: [] })

    const { data, error } = await supabase
      .from('documents')
      .select('id, title, template, word_count, updated_at, project:projects(id,name)')
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return NextResponse.json({ docs: data ?? [] })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
