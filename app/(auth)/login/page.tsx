'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import OAuthButtons from '@/components/OAuthButtons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      setError('No se pudo completar el inicio de sesión externo. Inténtalo de nuevo.')
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      const nextParam = new URLSearchParams(window.location.search).get('next')
      // Strict validation: must start with / and not contain // or protocol
      const isSafeRedirect = nextParam &&
        nextParam.startsWith('/') &&
        !nextParam.startsWith('//') &&
        !nextParam.includes('://') &&
        /^[\/a-zA-Z0-9\-_?=&%]+$/.test(nextParam)
      window.location.href = isSafeRedirect ? nextParam : '/documents'
    } else {
      setError('No se pudo iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-10">
          <span className="mono text-xs tracking-widest uppercase" style={{ color: 'var(--accent)' }}>StrataDOC</span>
          <h1 className="text-3xl font-bold mt-2" style={{ color: 'var(--text)' }}>Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Inicia sesión para continuar</p>
        </div>

        <OAuthButtons />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>o con tu email</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg border" style={{ color: 'var(--red-text)', borderColor: 'rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)' }}>
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all mt-2"
            style={{
              background: loading ? 'var(--border2)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#000',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: 'var(--accent)' }} className="hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
