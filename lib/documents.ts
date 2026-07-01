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

  // No usamos join embebido (project:projects(...)) porque la relación
  // puede no estar declarada como FK en el schema cache de PostgREST,
  // lo que produce 400 Bad Request. En su lugar resolvemos los nombres
  // de proyecto con una segunda query liviana.
  let query = supabase
    .from('documents')
    .select(
      'id, owner_id, title, template, project_id, word_count, created_at, updated_at',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (opts.search?.trim()) {
    query = query.ilike('title', `%${opts.search.trim()}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const docs = (data ?? []) as unknown as DocumentSummary[]

  // Resolver nombres de proyecto para los documentos vinculados
  const projectIds = [...new Set(docs.map(d => d.project_id).filter((id): id is string => !!id))]
  if (projectIds.length > 0) {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)

    const projectMap = new Map((projectsData ?? []).map(p => [p.id, p.name]))
    for (const doc of docs) {
      if (doc.project_id && projectMap.has(doc.project_id)) {
        doc.project = { id: doc.project_id, name: projectMap.get(doc.project_id)! }
      }
    }
  }

  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / DOCS_PAGE_SIZE))

  return { docs, total, totalPages, page }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida que el contenido tenga la forma mínima esperada de un doc Tiptap
 * (objeto con type: 'doc'). Si está corrupto, devuelve null en vez de
 * dejar pasar basura que tumbaría el editor al montar.
 */
function sanitizeContent(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj.type !== 'doc' || !Array.isArray(obj.content)) return null
  return obj
}

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

  const doc = data as Document
  doc.content = sanitizeContent(doc.content)
  return doc
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
