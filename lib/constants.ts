/**
 * Constantes globales de StrataDOC.
 * Centraliza valores que antes estaban hardcodeados en varios archivos.
 */

export const STRATA_URL =
  process.env.NEXT_PUBLIC_STRATA_URL ?? 'https://gestor-tareas-psi-one.vercel.app'

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Máximo de documentos por página en el listado */
export const DOCS_PAGE_SIZE = 20

/** Máximo de versiones guardadas por documento */
export const MAX_VERSIONS = 30

/** Debounce del autoguardado en ms */
export const SAVE_DEBOUNCE_MS = 1200
