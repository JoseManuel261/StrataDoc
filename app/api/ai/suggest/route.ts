import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { suggestBodySchema } from '@/lib/validators'
import { APP_URL } from '@/lib/constants'

export const runtime = 'nodejs'

const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
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

function verifyCsrf(req: NextRequest): boolean {
  const origin  = req.headers.get('origin')  ?? ''
  const referer = req.headers.get('referer') ?? ''
  const allowed = [APP_URL, 'http://localhost:3000', 'http://localhost:3001']
  return allowed.some(u => origin.startsWith(u) || referer.startsWith(u))
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const parsed = suggestBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { documentTitle, template, currentContent, userRequest, projectContext } = parsed.data

    let projectSection = ''
    if (projectContext) {
      const desc = projectContext.projectDescription
        ? `\nDescripción: ${projectContext.projectDescription}`
        : ''
      const tasksBlock = projectContext.tasks.length > 0
        ? `\nTareas: ${projectContext.tasks.map(t => `[${t.status}] ${t.title}`).join(' | ')}`
        : ''
      const historyBlock = projectContext.recentHistory.length > 0
        ? `\nActividad reciente: ${projectContext.recentHistory.slice(0, 8).join(' · ')}`
        : ''
      projectSection = `\n\nProyecto vinculado: "${projectContext.projectName}"${desc}${tasksBlock}${historyBlock}`
    }

    const systemPrompt = `Eres el asistente de escritura de StrataDOC.
El usuario está redactando un documento y necesita ayuda para continuar o mejorar una sección.

Documento: "${documentTitle}" (plantilla: ${template})${projectSection}

Contenido actual:
---
${currentContent || '(El documento está vacío — sugiere una introducción sólida)'}
---

Tu tarea:
- Si el usuario pide algo específico, hazlo exactamente.
- Si no pide nada, analiza lo escrito y sugiere la próxima sección lógica con contenido real.
- Si hay contexto de proyecto, úsalo activamente.
- Responde SOLO con el texto a insertar, en Markdown, sin explicaciones previas.
- Responde SIEMPRE en español.
- Genera entre 200 y 500 palabras — una sección completa, no solo un párrafo.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userRequest || 'Sugiere cómo continuar este documento con una sección nueva bien desarrollada.' },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq suggest error:', errText)
      return NextResponse.json({ error: 'Error al contactar el servicio de IA' }, { status: 502 })
    }

    const data = await res.json()
    const suggestion = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('Suggest route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
