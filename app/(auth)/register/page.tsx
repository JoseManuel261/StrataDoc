'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OAuthButtons from '@/components/OAuthButtons'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username, full_name: form.full_name }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const nextParam = new URLSearchParams(window.location.search).get('next')
      window.location.href = nextParam && nextParam.startsWith('/') ? nextParam : '/documents'
      router.refresh()
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background: 'var(--bg)'}}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-10">
          <span className="mono text-xs tracking-widest uppercase" style={{color: 'var(--accent)'}}>StrataDOC</span>
          <h1 className="text-3xl font-bold mt-2" style={{color: 'var(--text)'}}>Crea tu cuenta</h1>
          <p className="mt-1 text-sm" style={{color: 'var(--text-muted)'}}>Empieza a documentar tus proyectos</p>
        </div>

        <OAuthButtons />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>o con tu email</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg border" style={{color: 'var(--red-text)', borderColor: 'rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)'}}>
              {error}
            </div>
          )}

          {[
            { key: 'username', label: 'Usuario', placeholder: 'tu_usuario', type: 'text' },
            { key: 'full_name', label: 'Nombre completo', placeholder: 'Tu nombre', type: 'text' },
            { key: 'email', label: 'Email', placeholder: 'tu@email.com', type: 'email' },
            { key: 'password', label: 'Contraseña', placeholder: '••••••••', type: 'password' },
          ].map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>{field.label}</label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}

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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{color: 'var(--text-muted)'}}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{color: 'var(--accent)'}} className="hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
