import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

/**
 * Ruta de acción: crea un documento en blanco y redirige al editor.
 * Se usa como destino del botón "Nuevo documento" en el sidebar.
 * Así la creación ocurre server-side (más fiable que client-side para
 * el redirect inmediato al editor).
 */
export default async function NewDocumentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      title:    'Sin título',
      template: 'free',
      content:  null,
    })
    .select('id')
    .single()

  if (error || !data) {
    // Si algo falla, vuelve al listado en vez de quedarse en blanco
    redirect('/documents')
  }

  redirect(`/documents/${data.id}`)
}
