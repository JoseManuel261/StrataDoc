'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  // Start with null to avoid hydration mismatch
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null)

  useEffect(() => {
    // Read after mount to avoid SSR mismatch
    const stored = (localStorage.getItem('theme') as 'dark' | 'light' | null) || 'dark'
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    setTheme(current)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    try { localStorage.setItem('theme', next) } catch {}
  }

  // Don't render until we know the theme (avoids icon flash)
  if (theme === null) return <div className="w-6 h-6"/>

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      className="p-1.5 rounded-md transition-all"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
      {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
    </button>
  )
}
