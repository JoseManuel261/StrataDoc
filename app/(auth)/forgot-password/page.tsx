'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <MailCheck size={24} style={{ color: 'var(--accent-text)' }} />
            </div>
            <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
              Revisa tu correo
            </h1>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Si <strong style={{ color: 'var(--text)' }}>{email}</strong> tiene una cuenta, enviamos un enlace para restablecer tu contraseña.
            </p>
            <Link href="/login" style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none' }}>
              ← Volver a inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
              <ArrowLeft size={13} /> Volver
            </Link>

            <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
              ¿Olvidaste tu contraseña?
            </h1>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
              Te enviaremos un enlace para crear una nueva.
            </p>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', color: 'var(--red-text)', fontFamily: 'Syne, sans-serif', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.375rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.625rem', border: 'none', background: loading ? 'var(--border2)' : 'var(--accent)', color: loading ? 'var(--text-muted)' : '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
