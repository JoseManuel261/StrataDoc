-- =====================================================================
-- StrataDOC · Índice de búsqueda de texto completo en documentos
-- Permite búsquedas rápidas por título usando pg_trgm (trigramas).
-- Complementa el ILIKE que ya usa la API de búsqueda.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================

-- Habilitar la extensión pg_trgm si no está activa
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN trigrama en title para búsquedas ILIKE eficientes
CREATE INDEX IF NOT EXISTS documents_title_trgm_idx
  ON public.documents USING GIN (title gin_trgm_ops);

-- Índice compuesto para el listado paginado por owner (ya existe parcialmente,
-- pero este es más específico para la query exacta del listado)
CREATE INDEX IF NOT EXISTS documents_owner_updated_idx
  ON public.documents (owner_id, updated_at DESC);
