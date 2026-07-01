'use client'
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  documentId: string
}

interface State {
  hasError: boolean
}

/**
 * Captura excepciones del editor Tiptap (ej. JSON de contenido corrupto)
 * para que un documento dañado no tumbe toda la app — solo esa vista.
 */
export default class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Editor crash:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', gap: '1rem',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '1rem',
            background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={22} style={{ color: 'var(--red-text)' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Fenix, serif', fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
              Este documento no pudo cargarse
            </h2>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.6 }}>
              El contenido guardado parece estar dañado. Puedes restaurar una versión anterior desde el historial, o volver a la lista de documentos.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif',
                fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} /> Reintentar
            </button>
            <a
              href="/documents"
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: 'none', background: 'var(--accent)',
                color: '#000', fontFamily: 'Syne, sans-serif',
                fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
              }}
            >
              Volver a documentos
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
