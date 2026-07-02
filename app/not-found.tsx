import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem', textAlign: 'center',
    }}>
      <p className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '1rem' }}>
        404
      </p>
      <h1 style={{ fontFamily: 'Fenix, serif', fontSize: '2rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
        Página no encontrada
      </h1>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '320px', lineHeight: 1.6 }}>
        La página que buscas no existe o fue movida.
      </p>
      <Link href="/documents" style={{
        padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
        background: 'var(--accent)', color: '#000',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem',
        textDecoration: 'none',
      }}>
        Ir a mis documentos
      </Link>
    </div>
  )
}
