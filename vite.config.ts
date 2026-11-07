import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En desarrollo, todo lo que es back (GeoNode / GeoServer) se proxea al servidor real.
// Así no hay CORS y se trabaja con datos de verdad.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.IDE_ORIGIN || 'https://ide.ordenamientoterritorial.misiones.gob.ar'
  const proxy = Object.fromEntries(
    ['/api', '/geoserver', '/uploaded', '/static', '/catalogue'].map((p) => [
      p,
      { target, changeOrigin: true, secure: true },
    ]),
  )
  return {
    plugins: [react(), tailwindcss()],
    // Los assets van en /portal-assets/ para no chocar con /static/ de GeoNode.
    build: { assetsDir: 'portal-assets' },
    server: { proxy },
  }
})
