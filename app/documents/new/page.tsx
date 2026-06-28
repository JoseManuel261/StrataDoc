import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { DocumentTemplate } from '@/lib/types'

interface Props {
  searchParams: Promise<{ project_id?: string; project_name?: string; template?: string }>
}

/**
 * Crea un documento nuevo y redirige al editor.
 *
 * Si viene desde Strata con ?project_id=...&project_name=..., lo vincula
 * automáticamente al proyecto para que el asistente de IA tenga contexto
 * real desde el primer momento.
 *
 * Si viene con ?template=apa|scientific, aplica esa plantilla.
 */
export default async function NewDocumentPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const projectId = params.project_id || null
  const projectName = params.project_name ? decodeURIComponent(params.project_name) : null
  const validTemplates: DocumentTemplate[] = ['apa', 'scientific', 'free']
  const template: DocumentTemplate = validTemplates.includes(params.template as DocumentTemplate)
    ? (params.template as DocumentTemplate)
    : 'free'

  // Si viene con project_id, verificamos que el usuario tenga acceso
  // a ese proyecto antes de vincularlo (RLS lo haría de todas formas,
  // pero verificar aquí da un mejor mensaje de error).
  if (projectId) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .maybeSingle()
    if (!proj) redirect('/documents') // sin acceso → listado normal
  }

  const title = projectName
    ? `Documentación — ${projectName}`
    : 'Sin título'

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id:   user.id,
      title,
      template,
      project_id: projectId,
      content:    { type: 'doc', content: [] },
    })
    .select('id')
    .single()

  if (error || !data) redirect('/documents')
  redirect(`/documents/${data.id}`)
}
