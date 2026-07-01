-- =====================================================================
-- StrataDOC · Script de AUDITORÍA (solo lectura, no modifica nada)
-- Ejecutar en Supabase Dashboard → SQL Editor para ver el estado real
-- de las tablas y políticas tras aplicar 0001 y migration.sql ambas.
-- =====================================================================

-- 1. ¿Qué columnas tiene realmente la tabla documents?
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;

-- 2. ¿Qué políticas RLS existen sobre documents? (pueden estar duplicadas)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'documents';

-- 3. ¿Qué políticas RLS existen sobre document_versions?
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'document_versions';

-- 4. ¿RLS está habilitado en ambas tablas?
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('documents', 'document_versions');

-- 5. ¿Existe la función has_project_access que ambas migraciones asumen?
SELECT proname FROM pg_proc WHERE proname = 'has_project_access';

-- 6. ¿Existen ambos triggers de updated_at duplicados?
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'documents';
