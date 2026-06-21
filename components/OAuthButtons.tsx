'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Provider = 'github' | 'google'

// lucide-react quitó los íconos de marca (Github, Twitter, etc.) a partir
// de la v1 — ver https://lucide.dev/guide/react/migration. En vez de
// agregar una dependencia nueva solo para un ícono, se usa el SVG oficial
// de GitHub inline.
function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.805 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.29 0 .322.216.696.825.578C20.565 21.795 24 17.296 24 12c0-6.63-5.37-12-12-12Z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

export default function OAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function signIn(provider: Provider) {
    setLoading(provider)
    setError('')
    const nextParam = new URLSearchParams(window.location.search).get('next')
    const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : null
    const callback = `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback },
    })
    if (error) {
      setError(error.message)
      setLoading(null)
    }
    // En éxito el navegador se redirige al proveedor; no reseteamos loading.
  }

  const btnCls = 'w-full flex items-center justify-center gap-2.5 py-3 rounded-lg text-sm font-medium transition-all'
  const btnStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }

  function hoverOn(e: React.MouseEvent<HTMLButtonElement>) {
    if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
  }
  function hoverOff(e: React.MouseEvent<HTMLButtonElement>) {
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg border" style={{ color: 'var(--red-text)', borderColor: 'rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)' }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => signIn('github')}
        disabled={!!loading}
        className={btnCls}
        style={{ ...btnStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && loading !== 'github' ? 0.5 : 1 }}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
      >
        <GithubIcon />
        {loading === 'github' ? 'Conectando…' : 'Continuar con GitHub'}
      </button>

      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={!!loading}
        className={btnCls}
        style={{ ...btnStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && loading !== 'google' ? 0.5 : 1 }}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
      >
        <GoogleIcon />
        {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
      </button>
    </div>
  )
}
