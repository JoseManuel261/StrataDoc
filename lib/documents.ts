import { createClient } from '@/lib/supabase'
import type { Document, DocumentSummary, DocumentTemplate, ProjectSummary } from '@/lib/types'

// ─── Listado ────────────────────────────────────────────────────────────────

/**
 * Devuelve todos los documentos del usuario autenticado, ordenados por
 * updated_at DESC. Sin content (puede ser grande); solo metadata.
 */
export async function getDocuments(): Promise<DocumentSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id, owner_id, title, template, project_id, created_at, updated_at,
      owner:profiles!owner_id ( username, full_name, avatar_url ),
      project:projects!project_id ( id, name )
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as DocumentSummary[]
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

/**
 * Trae un documento completo (incluido content) por id.
 * RLS garantiza que solo el owner o miembros del proyecto pueden verlo.
 */
export async function getDocument(id: string): Promise<Document | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null   // not found
    throw error
  }
  return data as Document
}

// ─── Crear ───────────────────────────────────────────────────────────────────

/**
 * Crea un documento nuevo y devuelve su id.
 * owner_id lo resuelve RLS del lado del servidor (auth.uid()).
 */
export async function createDocument(params: {
  title?: string
  template?: DocumentTemplate
  project_id?: string | null
}): Promise<string> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id:   user.id,
      title:      params.title      ?? 'Sin título',
      template:   params.template   ?? 'free',
      project_id: params.project_id ?? null,
      content:    null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// ─── Actualizar ──────────────────────────────────────────────────────────────

/**
 * Actualiza título, plantilla o proyecto de un documento.
 * updated_at se actualiza automáticamente vía trigger.
 */
export async function updateDocumentMeta(
  id: string,
  patch: Partial<Pick<Document, 'title' | 'template' | 'project_id'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)

  if (error) throw error
}

/**
 * Guarda el contenido Tiptap (JSON) del documento.
 * Llamado por el autoguardado del editor (con debounce).
 */
export async function saveDocumentContent(
  id: string,
  content: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('documents')
    .update({ content })
    .eq('id', id)

  if (error) throw error
}

// ─── Eliminar ────────────────────────────────────────────────────────────────

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Renombrar (atajo) ───────────────────────────────────────────────────────

export async function renameDocument(id: string, title: string): Promise<void> {
  return updateDocumentMeta(id, { title: title.trim() || 'Sin título' })
}

// ─── Proyectos de Strata accesibles (para el selector) ───────────────────────

/**
 * Lista los proyectos a los que el usuario tiene acceso en Strata,
 * para poder vincular un documento. Reutiliza RLS de projects.
 */
export async function getAccessibleProjects(): Promise<ProjectSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  if (error) throw error
  return (data ?? []) as ProjectSummary[]
}
