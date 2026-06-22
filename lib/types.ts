// Tipos compartidos de StrataDOC.
// Mantener alineados con lib/types.ts de Strata cuando haya solapamiento
// (ej. ProjectSummary se construye leyendo public.projects, misma BD).

export type DocumentTemplate = 'free' | 'apa' | 'scientific'

export interface Document {
  id: string
  owner_id: string
  title: string
  template: DocumentTemplate
  project_id: string | null
  content: Record<string, unknown> | null   // JSON de Tiptap
  created_at: string
  updated_at: string
}

// Vista enriquecida — resultado del join con profiles y projects
export interface DocumentWithMeta extends Document {
  owner?: {
    username: string
    full_name: string
    avatar_url: string | null
  }
  project?: {
    id: string
    name: string
  } | null
}

// Para el listado: no necesitamos el content (puede ser grande)
export type DocumentSummary = Omit<DocumentWithMeta, 'content'>

// Proyectos de Strata accesibles por el usuario (para el selector)
export interface ProjectSummary {
  id: string
  name: string
}

export const TEMPLATE_LABELS: Record<DocumentTemplate, string> = {
  free:       'Libre',
  apa:        'APA',
  scientific: 'Artículo científico',
}
