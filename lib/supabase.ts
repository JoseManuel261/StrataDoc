import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en el navegador (Client Components).
 *
 * StrataDOC comparte el mismo proyecto de Supabase que Strata:
 * misma URL, misma base de datos, mismo Auth. Una cuenta creada en
 * Strata funciona sin cambios aquí, y viceversa.
 *
 * Usa el formato nuevo de claves publicables (sb_publishable_...),
 * no el legacy anon JWT.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
