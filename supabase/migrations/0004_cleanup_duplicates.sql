-- =====================================================================
-- StrataDOC · Limpieza de duplicados (triggers + políticas RLS redundantes)
-- Seguro de ejecutar: no cambia el comportamiento de seguridad, solo
-- elimina redundancia. documents_owner_all ya cubre todo lo necesario
-- para el dueño; documents_project_read cubre el caso de equipo via Strata.
-- =====================================================================

-- 1. Eliminar el trigger duplicado de updated_at (dejamos solo uno)
DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
-- Dejamos documents_set_updated_at activo

-- 2. Eliminar políticas redundantes en documents.
--    documents_owner_all (ALL, owner_id = auth.uid()) ya cubre:
--      - SELECT propio   (reemplaza documents_select para el caso owner)
--      - INSERT propio   (reemplaza documents_insert)
--      - UPDATE propio   (reemplaza documents_update)
--      - DELETE propio   (reemplaza documents_delete)
--    documents_project_read cubre el SELECT para miembros del proyecto
--    vinculado (caso no-owner), así que la conservamos.
--    documents_select hace lo mismo que owner_all + project_read juntas,
--    así que también es redundante y la eliminamos.

DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_update ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;

-- Resultado final esperado en documents: solo 2 políticas
--   documents_owner_all   (ALL)    — dueño tiene control total
--   documents_project_read (SELECT) — miembros del proyecto pueden leer

-- 3. document_versions ya está limpia (1 sola política, sin duplicados).
--    No se requiere acción.

-- =====================================================================
-- Verificación post-limpieza — ejecutar después para confirmar
-- =====================================================================
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'documents';
-- Debe devolver exactamente 2 filas: documents_owner_all, documents_project_read

-- SELECT trigger_name FROM information_schema.triggers
-- WHERE event_object_table = 'documents';
-- Debe devolver exactamente 1 fila: documents_set_updated_at
