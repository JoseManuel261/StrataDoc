'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import OAuthButtons from '@/components/OAuthButtons'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username, full_name: form.full_name }
      }
    })
    if (error) {
      setError(
        error.message.includes('already registered')
          ? 'Ya existe una cuenta con este email. Inicia sesión.'
          : error.message
      )
      setLoading(false)
      return
    }

    // Si Supabase tiene confirmación de email activada, signUp no devuelve
    // sesión hasta que el usuario haga clic en el link del correo.
    // Mostramos una pantalla de "revisa tu correo" en vez de redirigir
    // a /documents (donde el middleware lo rebotaría de vuelta a /login).
    if (!data.session) {
      setPendingConfirm(true)
      setLoading(false)
      return
    }

    const nextParam = new URLSearchParams(window.location.search).get('next')
    window.location.href = nextParam && nextParam.startsWith('/') ? nextParam : '/documents'
    router.refresh()
  }

  if (pendingConfirm) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <MailCheck size={24} style={{ color: 'var(--accent-text)' }} />
          </div>
          <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
            Revisa tu correo
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Enviamos un enlace de confirmación a <strong style={{ color: 'var(--text)' }}>{form.email}</strong>.
            Haz clic en él para activar tu cuenta y entrar a StrataDOC.
          </p>
          <Link href="/login" style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none' }}>
            ← Volver a inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Panel izquierdo — identidad visual StrataDOC */}
      <div
        className="doc-panel"
        style={{
          display: 'none',
          flex: '0 0 45%',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '3rem',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15em', marginBottom: '3rem' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Strata
            </span>
            <span style={{ fontFamily: 'Fenix, serif', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '-0.01em' }}>
              DOC
            </span>
          </div>

          {/* Vista previa simulada */}
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              {['H1','H2','B','I','—'].map(t => (
                <div key={t} style={{
                  width: t === '—' ? '32px' : '24px',
                  height: '24px',
                  borderRadius: '0.25rem',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: 'var(--text-dim)',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 600,
                }}>
                  {t}
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.2rem 0.5rem', borderRadius: '0.25rem',
                background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                fontSize: '0.55rem', fontFamily: 'Syne, sans-serif', color: 'var(--accent-text)', fontWeight: 600,
              }}>
                ✦ IA
              </div>
            </div>
            <div style={{ fontFamily: 'Fenix, serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Tesis de grado — Capítulo 3
            </div>
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '85%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '60%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '90%', marginBottom: '1rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '75%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '50%' }} />
          </div>

          <p className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Exportable como
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['PDF', 'DOCX', 'APA'].map(f => (
              <div key={f} style={{
                padding: '0.25rem 0.625rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
              }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { icon: '✦', label: 'IA genera borradores desde el historial de tu equipo' },
            { icon: '◈', label: 'Misma cuenta que Strata — sin registro adicional' },
            { icon: '⟳', label: 'Autoguardado continuo mientras escribes' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.05rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Logo mobile */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1em', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.35rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Strata
            </span>
            <span style={{ fontFamily: 'Fenix, serif', fontSize: '1.35rem', color: 'var(--accent)', letterSpacing: '-0.01em' }}>
              DOC
            </span>
          </div>

          <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.4rem', lineHeight: 1.15 }}>
            Crea tu cuenta
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
            Si ya tienes cuenta en Strata, entra directamente con OAuth.
          </p>

          <OAuthButtons />

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            margin: '1.5rem 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              o con email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(255,68,68,0.06)',
              border: '1px solid rgba(255,68,68,0.2)',
              color: 'var(--red-text)',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.8rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: 'username',  label: 'Usuario',         placeholder: 'tu_usuario',    type: 'text'     },
              { key: 'full_name', label: 'Nombre completo', placeholder: 'Tu nombre',      type: 'text'     },
              { key: 'email',     label: 'Email',           placeholder: 'tu@email.com',   type: 'email'    },
              { key: 'password',  label: 'Contraseña',      placeholder: '••••••••',       type: 'password' },
            ].map(field => (
              <div key={field.key}>
                <label style={{
                  display: 'block',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-dim)',
                  marginBottom: '0.375rem',
                }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: loading ? 'var(--border2)' : 'var(--accent)',
                color: loading ? 'var(--text-muted)' : '#000',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="hover-underline"
              style={{ color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none' }}
            >
              Inicia sesión
            </Link>
          </p>

          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
          }}>
            Si ya usas Strata, entra con la misma cuenta.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .doc-panel { display: flex !important; }
        }
        .hover-underline:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  )
}
