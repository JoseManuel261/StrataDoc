'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import NetworkToast from '@/components/NetworkToast'
import { FileText, Plus, LogOut, ExternalLink, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { STRATA_URL } from '@/lib/constants'

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.username ||
          user.email?.split('@')[0] ||
          null
        setUsername(name)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // En la página del editor el sidebar no aplica — usamos layout full
  // pero sí mostramos el ThemeToggle en la barra superior del editor
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
      <aside className="app-sidebar" style={{
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
        {/* Logo + ThemeToggle */}
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

        {/* Usuario actual */}
        {username && (
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent-text)' }}>
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {username}
            </span>
          </div>
        )}

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

        {/* Volver a Strata */}
        <div style={{ padding: '0 0.75rem', paddingBottom: '0.375rem' }}>
          <a
            href={STRATA_URL}
            target="_blank"
            rel="noopener noreferrer"
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
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent-text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <ExternalLink size={13} />
            Ir a Strata
          </a>
        </div>

        {/* Sign out */}
        <div style={{ padding: '0 0.75rem', paddingBottom: '0.75rem' }}>
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

      <main className="app-main" style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
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
