import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
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
 * POST /api/ai/suggest
 * Sugerencias incrementales: dado lo que el usuario ya escribió,
 * sugiere cómo continuar la sección actual o qué sección agregar.
 *
 * Body: {
 *   documentTitle: string
 *   template: string
 *   currentContent: string   // texto plano del documento hasta ahora
 *   userRequest: string      // qué quiere el usuario (opcional, puede ser vacío)
 *   projectContext?: { projectName: string; tasks: {...}[] }
 * }
 * Response: { suggestion: string }
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

    const documentTitle  = sanitize(body.documentTitle, 200)
    const template       = sanitize(body.template, 20)
    const currentContent = sanitize(body.currentContent, 3000)
    const userRequest    = sanitize(body.userRequest, 500)
    const projectCtx     = body.projectContext

    const projectSection = projectCtx
      ? `\nProyecto vinculado: ${sanitize(projectCtx.projectName, 100)}
Tareas del equipo: ${Array.isArray(projectCtx.tasks)
  ? projectCtx.tasks.slice(0, 10).map((t: { title: string; status: string }) =>
      `[${sanitize(t.status, 15)}] ${sanitize(t.title, 80)}`
    ).join(' | ')
  : 'N/D'}`
      : ''

    const systemPrompt = `Eres el asistente de escritura de StrataDOC.
El usuario está redactando un documento y necesita ayuda para continuar.

Documento: "${documentTitle}" (plantilla: ${template})${projectSection}

Contenido actual del documento:
---
${currentContent || '(El documento está vacío)'}
---

Tu tarea: sugerir cómo continuar o mejorar el documento.
- Si el usuario pide algo específico, hazlo.
- Si no, analiza lo escrito y sugiere la próxima sección lógica con contenido desarrollado.
- Responde SOLO con el texto a insertar, en Markdown, sin explicaciones previas.
- Responde SIEMPRE en español.
- Máximo 300 palabras por sugerencia.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 512,
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userRequest || 'Sugiere cómo continuar este documento.' },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Error al contactar Groq' }, { status: 502 })

    const data = await res.json()
    const suggestion = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ suggestion })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
