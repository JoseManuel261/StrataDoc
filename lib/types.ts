// Tipos compartidos de StrataDOC.
// Mantener alineados con lib/types.ts de Strata cuando haya solapamiento.

export type DocumentTemplate = 'free' | 'apa' | 'scientific'

export interface Document {
  id:         string
  owner_id:   string
  title:      string
  template:   DocumentTemplate
  project_id: string | null
  content:    Record<string, unknown> | null   // JSON de Tiptap
  word_count: number
  created_at: string
  updated_at: string
}

// Para el listado: sin content (puede ser grande), con project opcional
export interface DocumentSummary {
  id:         string
  owner_id:   string
  title:      string
  template:   DocumentTemplate
  project_id: string | null
  word_count: number
  created_at: string
  updated_at: string
  project?:   { id: string; name: string } | null
}

// Proyectos de Strata accesibles por el usuario (para el selector)
export interface ProjectSummary {
  id:          string
  name:        string
  description?: string | null
}

export const TEMPLATE_LABELS: Record<DocumentTemplate, string> = {
  free:       'Libre',
  apa:        'APA',
  scientific: 'Artículo científico',
}
