-- =====================================================================
-- StrataDOC · Tabla documents + RLS
-- ---------------------------------------------------------------------
-- Comparte el mismo proyecto Supabase que Strata. Reutiliza:
--   · auth.uid()          → identidad del usuario logueado
--   · public.profiles     → para joins de autor
--   · public.projects     → FK opcional (vínculo con proyecto de Strata)
--   · public.has_project_access(_project_id, _user_id) → función SECURITY
--     DEFINER ya existente en Strata (0002_rls_membership_policies.sql)
--     que devuelve true si el usuario es owner del proyecto o miembro
--     del grupo al que pertenece.
--
-- Reglas de acceso:
--   · El owner (owner_id) puede hacer todo sobre su documento.
--   · Si el documento tiene project_id, cualquier usuario con acceso al
--     proyecto en Strata puede leerlo (SELECT).
--   · Nadie más puede ver ni tocar documentos ajenos.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor.  Es idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla principal
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Sin título',
  template     text NOT NULL DEFAULT 'free'
                 CHECK (template IN ('free', 'apa', 'scientific')),
  -- FK opcional al proyecto de Strata. NULL = documento standalone.
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  -- Contenido Tiptap en JSON. NULL hasta que el usuario empiece a escribir.
  content      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices para las queries más comunes
CREATE INDEX IF NOT EXISTS documents_owner_id_idx    ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS documents_project_id_idx  ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS documents_updated_at_idx  ON public.documents(updated_at DESC);

-- ---------------------------------------------------------------------
-- 2. Trigger updated_at (mismo patrón que Strata usa en tasks)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- SELECT: owner siempre ve sus docs.
--         Si tiene project_id, cualquier miembro del proyecto también.
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT
  USING (
    owner_id = auth.uid()
    OR (
      project_id IS NOT NULL
      AND public.has_project_access(project_id, auth.uid())
    )
  );

-- INSERT: solo puedes crear documentos como tú mismo.
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: solo el owner edita. Los colaboradores del proyecto solo leen.
DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents FOR UPDATE
  USING (owner_id = auth.uid());

-- DELETE: solo el owner.
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents FOR DELETE
  USING (owner_id = auth.uid());
