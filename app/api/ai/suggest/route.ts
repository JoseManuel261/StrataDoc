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
 * Sugerencias incrementales para continuar el documento.
 * Usa descripción + tareas + historial del proyecto si están disponibles.
 *
 * Body: {
 *   documentTitle: string
 *   template: string
 *   currentContent: string
 *   userRequest: string        // puede estar vacío
 *   projectContext?: {
 *     projectName: string
 *     projectDescription?: string
 *     tasks: { title: string; status: string }[]
 *     recentHistory?: string[]
 *   }
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
    const currentContent = sanitize(body.currentContent, 4000)
    const userRequest    = sanitize(body.userRequest, 800)
    const projectCtx     = body.projectContext

    let projectSection = ''
    if (projectCtx) {
      const projectName = sanitize(projectCtx.projectName, 100)
      const desc = projectCtx.projectDescription
        ? `\nDescripción: ${sanitize(projectCtx.projectDescription, 600)}`
        : ''

      const tasksBlock = Array.isArray(projectCtx.tasks) && projectCtx.tasks.length > 0
        ? `\nTareas: ${projectCtx.tasks.slice(0, 12).map((t: { title: string; status: string }) =>
            `[${sanitize(t.status, 15)}] ${sanitize(t.title, 100)}`
          ).join(' | ')}`
        : ''

      const historyBlock = Array.isArray(projectCtx.recentHistory) && projectCtx.recentHistory.length > 0
        ? `\nActividad reciente: ${projectCtx.recentHistory.slice(0, 8).map((h: string) => sanitize(h, 120)).join(' · ')}`
        : ''

      projectSection = `\n\nProyecto vinculado: "${projectName}"${desc}${tasksBlock}${historyBlock}`
    }

    const systemPrompt = `Eres el asistente de escritura de StrataDOC.
El usuario está redactando un documento y necesita ayuda para continuar o mejorar una sección.

Documento: "${documentTitle}" (plantilla: ${template})${projectSection}

Contenido actual del documento:
---
${currentContent || '(El documento está vacío — sugiere una introducción sólida)'}
---

Tu tarea:
- Si el usuario pide algo específico, hazlo exactamente.
- Si no pide nada, analiza lo escrito y sugiere la próxima sección lógica con contenido real y desarrollado.
- Si hay contexto de proyecto, úsalo activamente en la sugerencia.
- Responde SOLO con el texto a insertar, en Markdown, sin explicaciones previas ni frases introductorias.
- Responde SIEMPRE en español.
- Genera entre 200 y 500 palabras — suficiente para una sección completa, no solo un párrafo.`

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
          { role: 'user', content: userRequest || 'Sugiere cómo continuar este documento con una sección nueva bien desarrollada.' },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq suggest error:', errText)
      return NextResponse.json({ error: 'Error al contactar Groq' }, { status: 502 })
    }

    const data = await res.json()
    const suggestion = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('Suggest route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
