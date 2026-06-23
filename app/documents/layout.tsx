'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import NetworkToast from '@/components/NetworkToast'
import { FileText, Plus, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // En la página del editor el sidebar no aplica — usamos layout full
  const isEditor = /^\/documents\/[^/]+$/.test(pathname) && pathname !== '/documents/new'

  if (isEditor) {
    return (
      <>
        <NetworkToast />
        {children}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <NetworkToast />

      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        background: 'var(--surface)',
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/documents" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Fenix, serif', fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Strata<span style={{ color: 'var(--accent)' }}>DOC</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          <NavItem
            href="/documents"
            label="Mis documentos"
            icon={<FileText size={14} />}
            active={pathname === '/documents'}
          />
        </nav>

        {/* Nuevo documento */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <Link href="/documents/new" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            borderRadius: '0.5rem',
            background: 'var(--accent)',
            color: '#000',
            fontWeight: 600,
            fontSize: '0.8rem',
            textDecoration: 'none',
            fontFamily: 'Syne, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}>
            <Plus size={14} />
            Nuevo documento
          </Link>
        </div>

        {/* Sign out */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontFamily: 'Syne, sans-serif',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red-text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, label, icon, active }: {
  href: string; label: string; icon: React.ReactNode; active: boolean
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '0.375rem',
      textDecoration: 'none',
      fontSize: '0.8rem',
      fontFamily: 'Syne, sans-serif',
      fontWeight: active ? 600 : 400,
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      background: active ? 'var(--accent-dim)' : 'transparent',
      transition: 'all 0.15s',
    }}>
      {icon}{label}
    </Link>
  )
}
