import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: { default: 'StrataDOC', template: '%s | StrataDOC' },
  description: 'Editor de documentos con IA para equipos. Redacta informes y documentación con asistencia contextual, vinculado a tus proyectos de Strata.',
  keywords: ['editor de documentos', 'documentación con IA', 'informes', 'redacción colaborativa'],
  authors: [{ name: 'StrataDOC' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'StrataDOC — Documentos con IA',
    description: 'Editor de documentos con IA para equipos, vinculado a tus proyectos de Strata.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'StrataDOC',
  },
  twitter: {
    card: 'summary',
    title: 'StrataDOC — Documentos con IA',
    description: 'Editor de documentos con IA para equipos, vinculado a tus proyectos de Strata.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Evita el flash: aplica el tema guardado antes de hidratar.
            Mismo script que Strata — misma clave 'theme' en localStorage,
            así que si el usuario configuró modo claro en Strata, StrataDOC
            respeta esa preferencia desde la primera carga. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})();`,
          }}
        />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
