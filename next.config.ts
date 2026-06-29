import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Límite de cuerpo de request para las rutas de API.
  // Protege contra payloads excesivamente grandes en /api/ai/* y /api/export.
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
