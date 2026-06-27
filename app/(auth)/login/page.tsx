import Link from 'next/link'
import { Metadata } from 'next'
import OAuthButtons from '@/components/OAuthButtons'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Panel izquierdo — identidad visual StrataDOC */}
      <div style={{
        display: 'none',
        flex: '0 0 45%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '3rem',
        flexDirection: 'column',
        justifyContent: 'space-between',
        // Solo visible en pantallas medianas+
      }}
        className="doc-panel"
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

          {/* Vista previa de documento simulada */}
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            {/* Barra del editor simulada */}
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
            {/* Contenido simulado */}
            <div style={{ fontFamily: 'Fenix, serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Informe de avance — Sprint 3
            </div>
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '80%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '65%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '90%', marginBottom: '1rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '70%', marginBottom: '0.375rem' }} />
            <div style={{ height: '0.5rem', background: 'var(--border)', borderRadius: '0.25rem', width: '55%' }} />
          </div>

          <p className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Vinculado a
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            width: 'fit-content',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Proyecto Tesis — Strata
            </span>
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { icon: '✦', label: 'IA genera borradores desde tu historial de Strata' },
            { icon: '◈', label: 'Plantillas APA, artículo científico y formato libre' },
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1em', marginBottom: '2.5rem' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.35rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Strata
            </span>
            <span style={{ fontFamily: 'Fenix, serif', fontSize: '1.35rem', color: 'var(--accent)', letterSpacing: '-0.01em' }}>
              DOC
            </span>
          </div>

          <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.4rem', lineHeight: 1.15 }}>
            Bienvenido de vuelta
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
            Usa la misma cuenta de Strata para acceder a tus documentos.
          </p>

          <OAuthButtons />

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            margin: '1.5rem 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              o
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <p style={{ textAlign: 'center', fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link 
              href="/register" 
              className="hover-underline"
              style={{ color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none' }}
            >
              Regístrate gratis
            </Link>
          </p>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
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