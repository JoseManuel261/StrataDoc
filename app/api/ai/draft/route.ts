import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Rate limiting en memoria — funciona en dev; en Vercel se puede sustituir
// por Upstash Redis, pero para v1 esto es suficiente como throttle básico.
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
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
 * Genera un borrador completo alimentado por:
 *   - título y plantilla del documento
 *   - instrucciones libres del usuario
 *   - descripción del proyecto (si existe)
 *   - tareas + historial del proyecto en Strata (si existen)
 *
 * Body: {
 *   documentTitle: string
 *   template: 'free' | 'apa' | 'scientific'
 *   userPrompt: string
 *   projectContext?: {
 *     projectName: string
 *     projectDescription?: string
 *     tasks: { title: string; status: string; priority: string; assignee?: string }[]
 *     recentHistory?: string[]
 *   }
 * }
 * Response: { draft: string }  — markdown que el editor convierte a Tiptap JSON
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
    const userPrompt    = sanitize(body.userPrompt, 1500)
    const projectCtx    = body.projectContext

    const templateInstructions: Record<string, string> = {
      apa:        'Usa formato APA: párrafos con sangría, citas entre paréntesis (Autor, año), secciones: Resumen, Introducción, Desarrollo, Conclusiones, Referencias.',
      scientific: 'Usa estructura de artículo científico: Abstract, Introducción, Metodología, Resultados, Discusión, Conclusión.',
      free:       'Usa formato libre. Organiza el contenido de la forma más clara y útil posible para el lector.',
    }

    // Construye el bloque de contexto del proyecto con descripción + tareas + historial
    let projectSection = ''
    if (projectCtx) {
      const projectName = sanitize(projectCtx.projectName, 100)
      const desc = projectCtx.projectDescription
        ? `\nDescripción del proyecto: ${sanitize(projectCtx.projectDescription, 800)}`
        : ''

      const tasksBlock = Array.isArray(projectCtx.tasks) && projectCtx.tasks.length > 0
        ? `\nTareas del equipo:\n${projectCtx.tasks.slice(0, 20).map((t: { title: string; status: string; priority: string; assignee?: string }) =>
            `  • [${sanitize(t.status, 15)}] ${sanitize(t.title, 120)}${t.assignee ? ` — ${t.assignee}` : ''}`
          ).join('\n')}`
        : '\n(Sin tareas registradas aún.)'

      const historyBlock = Array.isArray(projectCtx.recentHistory) && projectCtx.recentHistory.length > 0
        ? `\nActividad reciente del equipo:\n${projectCtx.recentHistory.slice(0, 15).map((h: string) => `  · ${sanitize(h, 150)}`).join('\n')}`
        : ''

      projectSection = `\n\nCONTEXTO DEL PROYECTO "${projectName}" (desde Strata):${desc}${tasksBlock}${historyBlock}`
    }

    const systemPrompt = `Eres el asistente de escritura de StrataDOC, un editor de documentos académicos y técnicos para equipos de software.
Tu tarea es generar un borrador completo, bien estructurado, detallado y listo para editar.

Instrucciones de formato: ${templateInstructions[template] ?? templateInstructions.free}
${projectSection}

Reglas estrictas:
- Responde ÚNICAMENTE con el contenido del documento, sin preámbulos, sin frases como "Aquí está el borrador" ni explicaciones fuera del texto.
- Usa Markdown: # para H1, ## para H2, ### para H3, **negrita**, *cursiva*, listas con -.
- Responde SIEMPRE en español colombiano, con tono académico-profesional.
- El borrador debe ser EXTENSO y SUSTANCIAL: mínimo 6 secciones bien desarrolladas con párrafos completos (no solo listas).
- Si hay contexto del proyecto, úsalo activamente: menciona tareas específicas, el nombre del proyecto, y construye el documento sobre esa base real.
- Si el proyecto tiene descripción, úsala como fuente principal del contenido.
- No incluyas notas al margen, meta-comentarios ni aclaraciones sobre el documento generado.`

    const userMessage = `Título del documento: "${documentTitle}"

${userPrompt ? `Instrucciones adicionales: ${userPrompt}` : 'Genera un borrador completo y sustancial basado en el contexto disponible.'}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',   // modelo más capaz para borradores largos
        max_tokens: 4096,
        temperature: 0.55,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq draft error:', errText)
      return NextResponse.json({ error: 'Error al contactar Groq' }, { status: 502 })
    }

    const data = await res.json()
    const draft = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('Draft route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
