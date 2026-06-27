import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Maneja el retorno del proveedor OAuth (GitHub / Google).
// Supabase redirige aquí con ?code=... ; lo intercambiamos por una sesión
// y redirigimos a /documents (o a la ruta que venía en ?next=).
//
// IMPORTANTE: NEXT_PUBLIC_APP_URL debe estar configurada en Vercel para que
// el redirect apunte al dominio real de producción y no a localhost.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/documents'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // En producción usamos NEXT_PUBLIC_APP_URL para evitar que
      // x-forwarded-host o el origin del request apunten a localhost.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      if (appUrl) {
        return NextResponse.redirect(`${appUrl}${next}`)
      }
      // Fallback: en desarrollo o si no está configurada, usamos el origin
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
  return NextResponse.redirect(`${appUrl}/login?error=oauth`)
}
