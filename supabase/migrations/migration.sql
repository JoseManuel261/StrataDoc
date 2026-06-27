-- =====================================================================
-- STRATADOC — Migración completa
-- Ejecuta esto en Supabase → SQL Editor (idempotente)
-- Comparte el mismo proyecto de Supabase que Strata.
-- =====================================================================

-- 1. TABLA PRINCIPAL DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Sin título',
  template     text NOT NULL DEFAULT 'free'
                 CHECK (template IN ('free', 'apa', 'scientific')),
  -- FK opcional a proyectos de Strata. NULL = documento standalone.
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  content      jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}',
  word_count   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices para listados frecuentes
CREATE INDEX IF NOT EXISTS documents_owner_idx
  ON public.documents (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS documents_project_idx
  ON public.documents (project_id)
  WHERE project_id IS NOT NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- El dueño ve y gestiona sus propios documentos
DROP POLICY IF EXISTS documents_owner_all ON public.documents;
CREATE POLICY documents_owner_all ON public.documents
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Miembros del proyecto vinculado pueden VER el documento (no editar)
-- Reutiliza has_project_access() que ya existe en Strata.
DROP POLICY IF EXISTS documents_project_read ON public.documents;
CREATE POLICY documents_project_read ON public.documents
  FOR SELECT USING (
    project_id IS NOT NULL
    AND public.has_project_access(project_id, auth.uid())
  );

-- 3. VERSIONES DE DOCUMENTOS (snapshots manuales)
--    Permite guardar checkpoints del documento para ver el historial.
CREATE TABLE IF NOT EXISTS public.document_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content      jsonb NOT NULL,
  word_count   int  NOT NULL DEFAULT 0,
  label        text,          -- etiqueta opcional: 'v1', 'Entrega final', etc.
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_versions_doc_idx
  ON public.document_versions (document_id, created_at DESC);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del documento puede ver/crear versiones
DROP POLICY IF EXISTS versions_owner ON public.document_versions;
CREATE POLICY versions_owner ON public.document_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND d.owner_id = auth.uid()
    )
  );
