/**
 * Funciones de acceso a datos de StrataDOC.
 * Todas usan el cliente de Supabase del lado del servidor (cookies).
 * La seguridad de filas (RLS) garantiza que cada usuario solo accede
 * a sus propios documentos.
 */
import { createClient } from '@/lib/supabase'
import type { Document, DocumentSummary, DocumentTemplate, ProjectSummary } from '@/lib/types'
import { DOCS_PAGE_SIZE } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────────────────────
// LISTADO
// ─────────────────────────────────────────────────────────────────────────────

export interface GetDocumentsOptions {
  page?:   number   // 1-indexed, default 1
  search?: string   // filtro por título
}

export interface PaginatedDocuments {
  docs:       DocumentSummary[]
  total:      number
  totalPages: number
  page:       number
}

/**
 * Trae los documentos del usuario con paginación y búsqueda opcional.
 * Si no se pasa `search`, devuelve todos ordenados por updated_at DESC.
 */
export async function getDocuments(
  opts: GetDocumentsOptions = {}
): Promise<PaginatedDocuments> {
  const supabase = createClient()
  const page = Math.max(1, opts.page ?? 1)
  const from = (page - 1) * DOCS_PAGE_SIZE
  const to   = from + DOCS_PAGE_SIZE - 1

  let query = supabase
    .from('documents')
    .select(
      'id, owner_id, title, template, project_id, word_count, created_at, updated_at, project:projects(id,name)',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (opts.search?.trim()) {
    query = query.ilike('title', `%${opts.search.trim()}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / DOCS_PAGE_SIZE))

  return {
    docs: (data ?? []) as unknown as DocumentSummary[],
    total,
    totalPages,
    page,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CREAR / ACTUALIZAR / ELIMINAR
// ─────────────────────────────────────────────────────────────────────────────

export async function createDocument(fields: {
  title?:      string
  template?:   DocumentTemplate
  project_id?: string | null
}): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id:   user.id,
      title:      fields.title ?? 'Sin título',
      template:   fields.template ?? 'free',
      project_id: fields.project_id ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

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
 * Guarda el contenido Tiptap (JSON) y actualiza word_count.
 * También crea una versión automática si han pasado más de 5 minutos
 * desde la última versión (autoversioning pasivo).
 */
export async function saveDocumentContent(
  id: string,
  content: Record<string, unknown>,
  wordCount?: number
): Promise<void> {
  const supabase = createClient()

  const patch: Record<string, unknown> = { content }
  if (typeof wordCount === 'number') patch.word_count = wordCount

  const { error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)

  if (error) throw error

  // Autoversioning: crea un snapshot silencioso cada 5 min de edición activa.
  // Solo si la última versión tiene más de 5 min de antigüedad.
  try {
    const { data: lastVersion } = await supabase
      .from('document_versions')
      .select('created_at')
      .eq('document_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    const lastTs = lastVersion ? new Date(lastVersion.created_at).getTime() : 0

    if (lastTs < fiveMinAgo) {
      await supabase.from('document_versions').insert({
        document_id: id,
        content,
        word_count:  wordCount ?? 0,
        label:       null,   // versión automática sin etiqueta
      })
    }
  } catch {
    // El autoversioning es silencioso — no falla el guardado principal
  }
}

export async function renameDocument(id: string, title: string): Promise<void> {
  return updateDocumentMeta(id, { title: title.trim() || 'Sin título' })
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentVersion {
  id:         string
  document_id: string
  content:    Record<string, unknown>
  word_count: number
  label:      string | null
  created_at: string
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as DocumentVersion[]
}

export async function createManualVersion(
  documentId: string,
  content: Record<string, unknown>,
  wordCount: number,
  label: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('document_versions').insert({
    document_id: documentId,
    content,
    word_count:  wordCount,
    label:       label.trim() || null,
  })
  if (error) throw error
}

export async function deleteVersion(versionId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('document_versions')
    .delete()
    .eq('id', versionId)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// PROYECTOS DE STRATA (para el selector)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccessibleProjects(): Promise<ProjectSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description')
    .order('name')

  if (error) throw error
  return (data ?? []) as ProjectSummary[]
}
