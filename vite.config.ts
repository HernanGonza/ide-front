import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En desarrollo, todo lo que es back (GeoNode / GeoServer) se proxea al servidor real.
// Así no hay CORS y se trabaja con datos de verdad.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.IDE_ORIGIN || 'https://ide.ordenamientoterritorial.misiones.gob.ar'
  const proxy: Record<string, { target: string; changeOrigin: boolean; secure?: boolean; rewrite?: (p: string) => string }> = Object.fromEntries(
    ['/api', '/geoserver', '/uploaded', '/static', '/catalogue'].map((p) => [p, { target, changeOrigin: true, secure: true }]),
  )
  // Cuentas en desarrollo: python3 deploy/auth/server.py (puerto 8000, con OAUTH_CLIENT_ID definido)
  proxy['/auth-api'] = { target: env.AUTH_ORIGIN || 'http://localhost:8000', changeOrigin: true, rewrite: (p) => p.replace(/^\/auth-api/, '') }
  return {
    // Ruta donde cuelga el front (ej. /ide/). En desarrollo y en la raíz del dominio queda '/'.
    base: process.env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
    // Los assets van en /portal-assets/ para no chocar con /static/ de GeoNode.
    build: { assetsDir: 'portal-assets' },
    server: { proxy },
  }
})
