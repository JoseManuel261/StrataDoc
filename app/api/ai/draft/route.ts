import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Rate limiting en memoria — mismo patrón que Strata
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10   // borradores son caros en tokens
const RATE_WINDOW = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

/**
 * POST /api/ai/draft
 * Genera un borrador completo del documento usando el contexto opcional
 * de un proyecto de Strata (tareas, historial) y las instrucciones del usuario.
 *
 * Body: {
 *   documentTitle: string
 *   template: 'free' | 'apa' | 'scientific'
 *   userPrompt: string          // qué quiere generar el usuario
 *   projectContext?: {          // opcional, si el doc está vinculado a Strata
 *     projectName: string
 *     tasks: { title: string; status: string; priority: string }[]
 *   }
 * }
 * Response: { draft: string }   // markdown que el editor convierte a Tiptap JSON
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })

    const body = await req.json()
    const sanitize = (s: unknown, max = 500) => String(s ?? '').slice(0, max)

    const documentTitle = sanitize(body.documentTitle, 200)
    const template      = sanitize(body.template, 20)
    const userPrompt    = sanitize(body.userPrompt, 1000)
    const projectCtx    = body.projectContext

    const templateInstructions: Record<string, string> = {
      apa:        'Usa formato APA: párrafos con sangría, citas entre paréntesis (Autor, año), secciones: Resumen, Introducción, Desarrollo, Conclusiones, Referencias.',
      scientific: 'Usa estructura de artículo científico: Abstract, Introducción, Metodología, Resultados, Discusión, Conclusión.',
      free:       'Usa formato libre. Organiza el contenido de la forma más clara posible para el lector.',
    }

    const projectSection = projectCtx
      ? `\nCONTEXTO DEL PROYECTO EN STRATA:
Proyecto: ${sanitize(projectCtx.projectName, 100)}
Tareas del equipo:
${Array.isArray(projectCtx.tasks)
  ? projectCtx.tasks.slice(0, 15).map((t: { title: string; status: string; priority: string }) =>
      `  • [${sanitize(t.status, 15)}] ${sanitize(t.title, 100)}`
    ).join('\n')
  : 'Sin tareas disponibles.'
}`
      : ''

    const systemPrompt = `Eres el asistente de escritura de StrataDOC, un editor de documentos para equipos.
Tu tarea es generar un borrador completo, bien estructurado y listo para editar.

Instrucciones de formato: ${templateInstructions[template] ?? templateInstructions.free}
${projectSection}

Reglas:
- Responde ÚNICAMENTE con el contenido del documento, sin preámbulos ni explicaciones fuera del texto.
- Usa Markdown: # para títulos, ## para secciones, **negrita**, listas con -.
- Responde SIEMPRE en español.
- El borrador debe ser sustancial: mínimo 4 secciones bien desarrolladas.
- No incluyas notas al margen ni comentarios sobre el documento.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 2048,
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Título del documento: "${documentTitle}"\n\nInstrucciones: ${userPrompt}` },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Error al contactar Groq' }, { status: 502 })

    const data = await res.json()
    const draft = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ draft })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
