'use client'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: '3.5rem',
        display: 'flex', alignItems: 'center',
        padding: '0 2rem',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          fontFamily: 'Fenix, serif',
          fontSize: '1.25rem',
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>
          Strata<span style={{ color: 'var(--accent)' }}>DOC</span>
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ThemeToggle />
          <Link href="/login" style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
            Entrar
          </Link>
          <Link href="/register" style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#000',
            background: 'var(--accent)',
            padding: '0.375rem 1rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}>
            Crear cuenta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '9rem 2rem 4rem' }}>

        {/* Eyebrow */}
        <p style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: '1.75rem',
        }}>
          Documentación con IA para equipos
        </p>

        {/* Headline en Fenix */}
        <h1 style={{
          fontFamily: 'Fenix, serif',
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: '1.75rem',
          position: 'relative',
        }}>
          El trabajo de tu equipo,
          <br/>
          <span style={{ color: 'var(--accent)' }}>por escrito.</span>
        </h1>

        {/* Descripción */}
        <p style={{
          fontFamily: 'Fenix, serif',
          fontSize: '1.125rem',
          lineHeight: 1.7,
          color: 'var(--text-muted)',
          maxWidth: '520px',
          marginBottom: '2.5rem',
        }}>
          StrataDOC es el editor de documentos de Strata. Redacta informes,
          actas y documentación técnica con ayuda de IA — vinculado a tus
          proyectos, o completamente aparte.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '5rem' }}>
          <Link href="/register" style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#000',
            background: 'var(--accent)',
            padding: '0.875rem 2rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            transition: 'background 0.15s, transform 0.15s',
            display: 'inline-block',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--accent)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}>
            Empezar gratis
          </Link>
          <Link href="/login" style={{
            fontFamily: 'Fenix, serif',
            fontSize: '1rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.15s',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1px',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          }}>
            Ya tengo cuenta
          </Link>
        </div>

        {/* Divisor */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          marginBottom: '3.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}/>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>Qué incluye</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}/>
        </div>

        {/* Features como lista — estilo índice con Fenix */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            {
              n: '01',
              title: 'Editor de documentos',
              body: 'Redacta con un editor de texto enriquecido, sin fricción. Encabezados, listas, citas y formato — todo con lienzo libre.',
            },
            {
              n: '02',
              title: 'Plantillas de estilo',
              body: 'Elige entre APA, artículo científico o libre. Son solo estilo visual — tipografía y márgenes — nunca te obligan a una estructura.',
            },
            {
              n: '03',
              title: 'Vinculado a tus proyectos',
              body: 'Conecta un documento a un proyecto real de Strata e importa contexto: tareas, historial y comentarios del equipo.',
            },
            {
              n: '04',
              title: 'Asistente de IA integrado',
              body: 'Pide un borrador completo o recibe sugerencias mientras escribes, sección por sección, sin perder el control del texto.',
            },
          ].map(({ n, title, body }) => (
            <div key={n} style={{
              display: 'grid',
              gridTemplateColumns: '3rem 1fr',
              gap: '0 1.5rem',
              padding: '1.75rem 0',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{
                fontFamily: 'Fenix, serif',
                fontSize: '1.5rem',
                color: 'var(--accent)',
                lineHeight: 1,
                paddingTop: '0.1rem',
                opacity: 0.5,
              }}>{n}</span>
              <div>
                <p style={{
                  fontFamily: 'Fenix, serif',
                  fontSize: '1.05rem',
                  color: 'var(--text)',
                  marginBottom: '0.5rem',
                  fontWeight: 400,
                }}>
                  {title}
                </p>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: 400,
                  lineHeight: 1.65,
                  color: 'var(--text-muted)',
                }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Nota de integración con Strata */}
        <div style={{
          marginTop: '3.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
        }}>
          <span style={{
            fontFamily: 'Fenix, serif',
            fontSize: '1.1rem',
            color: 'var(--accent)',
          }}>
            ⎌
          </span>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            color: 'var(--text-muted)',
          }}>
            ¿Ya tienes cuenta en{' '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>Strata</span>?
            {' '}Es la misma cuenta aquí — no necesitas registrarte de nuevo.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'Fenix, serif', fontSize: '1rem', color: 'var(--text-dim)' }}>
          StrataDOC.
        </span>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>
          Documentación para equipos pequeños
        </span>
      </footer>
    </div>
  )
}
