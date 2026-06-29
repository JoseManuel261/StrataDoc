import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { draftBodySchema } from '@/lib/validators'
import { APP_URL } from '@/lib/constants'

export const runtime = 'nodejs'

// Rate limiting en memoria (válido para dev; en producción usa Upstash Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60_000

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

/** CSRF: verifica que la request viene de nuestro propio dominio */
function verifyCsrf(req: NextRequest): boolean {
  const origin  = req.headers.get('origin')  ?? ''
  const referer = req.headers.get('referer') ?? ''
  const allowed = [APP_URL, 'http://localhost:3000', 'http://localhost:3001']
  return allowed.some(u => origin.startsWith(u) || referer.startsWith(u))
}

export async function POST(req: NextRequest) {
  try {
    // CSRF check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }

    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })

    // Validación con Zod — rechaza cuerpos malformados o demasiado grandes
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const parsed = draftBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { documentTitle, template, userPrompt, projectContext } = parsed.data

    const templateInstructions: Record<string, string> = {
      apa:        'Usa formato APA: párrafos con sangría, citas entre paréntesis (Autor, año), secciones: Resumen, Introducción, Desarrollo, Conclusiones, Referencias.',
      scientific: 'Usa estructura de artículo científico: Abstract, Introducción, Metodología, Resultados, Discusión, Conclusión.',
      free:       'Usa formato libre. Organiza el contenido de la forma más clara y útil posible.',
    }

    let projectSection = ''
    if (projectContext) {
      const desc = projectContext.projectDescription
        ? `\nDescripción del proyecto: ${projectContext.projectDescription}`
        : ''

      const tasksBlock = projectContext.tasks.length > 0
        ? `\nTareas del equipo:\n${projectContext.tasks.map(t =>
            `  • [${t.status}] ${t.title}${t.assignee ? ` — ${t.assignee}` : ''}`
          ).join('\n')}`
        : '\n(Sin tareas registradas aún.)'

      const historyBlock = projectContext.recentHistory.length > 0
        ? `\nActividad reciente:\n${projectContext.recentHistory.map(h => `  · ${h}`).join('\n')}`
        : ''

      projectSection = `\n\nCONTEXTO DEL PROYECTO "${projectContext.projectName}" (desde Strata):${desc}${tasksBlock}${historyBlock}`
    }

    const systemPrompt = `Eres el asistente de escritura de StrataDOC, editor de documentos académicos y técnicos.
Genera un borrador completo, bien estructurado y listo para editar.

Instrucciones de formato: ${templateInstructions[template]}
${projectSection}

Reglas:
- Responde ÚNICAMENTE con el contenido del documento. Sin preámbulos ni explicaciones.
- Usa Markdown: # H1, ## H2, ### H3, **negrita**, *cursiva*, listas con -.
- Responde SIEMPRE en español colombiano con tono académico-profesional.
- El borrador debe ser EXTENSO: mínimo 6 secciones bien desarrolladas con párrafos completos.
- Si hay contexto del proyecto, úsalo activamente: menciona tareas específicas y la descripción.
- Si el proyecto tiene descripción, úsala como fuente principal del contenido.`

    const userMessage = `Título del documento: "${documentTitle}"

${userPrompt ? `Instrucciones adicionales: ${userPrompt}` : 'Genera un borrador completo y sustancial basado en el contexto disponible.'}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4096,
        temperature: 0.55,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq draft error:', errText)
      return NextResponse.json({ error: 'Error al contactar el servicio de IA' }, { status: 502 })
    }

    const data = await res.json()
    const draft = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('Draft route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
