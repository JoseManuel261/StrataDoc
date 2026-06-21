import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Devuelve un color de texto legible a partir de un color elegido por el
 * usuario (paleta libre, ej. en una etiqueta de documento). En modo oscuro
 * el color original ya es legible sobre fondos oscuros, así que se usa tal
 * cual. En modo claro se oscurece para mantener contraste AA sobre fondo
 * blanco, conservando el punto de color original como referencia visual.
 *
 * Copiado tal cual de Strata (lib/utils.ts) para mantener el mismo
 * comportamiento si StrataDOC termina usando etiquetas de color en
 * documentos o plantillas.
 */
export function tagTextColor(hex: string): string {
  if (typeof document === 'undefined') return hex
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  if (!isLight) return hex

  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hh = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) hh = ((b - r) / d + 2) / 6
    else hh = ((r - g) / d + 4) / 6
  }

  // Oscurece progresivamente hasta pasar contraste AA (4.5:1) sobre blanco
  let newL = Math.min(l, 0.42)
  for (let i = 0; i < 6; i++) {
    const rgb = hslToRgb(hh, s, newL)
    if (contrastRatio(rgb, [255, 255, 255]) >= 4.5) break
    newL -= 0.08
  }
  const [nr, ng, nb] = hslToRgb(hh, s, Math.max(newL, 0.08))
  return `#${[nr, ng, nb].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255]
}

function relLuminance([r, g, b]: number[]): number {
  const chan = (c: number) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}

function contrastRatio(rgb1: number[], rgb2: number[]): number {
  const l1 = relLuminance(rgb1)
  const l2 = relLuminance(rgb2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
