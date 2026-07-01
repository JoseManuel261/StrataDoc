'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [ready, setReady]         = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // Supabase intercambia el token del link de recuperación por una sesión
  // temporal automáticamente al cargar la página (vía el hash de la URL).
  // Esperamos a que esa sesión exista antes de permitir el submit.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => { router.push('/documents'); router.refresh() }, 1500)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--accent-text)' }} />
            </div>
            <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Contraseña actualizada
            </h1>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Entrando a tu cuenta…
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
              Nueva contraseña
            </h1>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
              Elige una contraseña segura para tu cuenta.
            </p>

            {!ready && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem' }}>
                Verificando enlace…
              </div>
            )}

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', color: 'var(--red-text)', fontFamily: 'Syne, sans-serif', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { key: 'password', label: 'Nueva contraseña', value: password, set: setPassword },
                { key: 'confirm',  label: 'Confirmar contraseña', value: confirm, set: setConfirm },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.375rem' }}>
                    {f.label}
                  </label>
                  <input
                    type="password"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading || !ready}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.625rem', border: 'none', background: (loading || !ready) ? 'var(--border2)' : 'var(--accent)', color: (loading || !ready) ? 'var(--text-muted)' : '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem', cursor: (loading || !ready) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
