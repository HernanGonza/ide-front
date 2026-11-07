import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Catalogo from './pages/Catalogo'
import Geoservicios from './pages/Geoservicios'
import Metadatos from './pages/Metadatos'
import Documentacion from './pages/Documentacion'
import Organismos from './pages/Organismos'
import Institucional from './pages/Institucional'

// Las páginas con mapa cargan OpenLayers aparte
const Capa = lazy(() => import('./pages/Capa'))
const Visor = lazy(() => import('./pages/Visor'))
const wait = (el: React.ReactNode) => <Suspense fallback={<div className="p-8"><div className="skeleton h-64" /></div>}>{el}</Suspense>

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false } } })

// Rutas en castellano: no chocan con las de GeoNode (/catalogue, /datasets, /maps, /api, /static…)
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/catalogo', element: <Catalogo /> },
      { path: '/capa/:pk', element: wait(<Capa />) },
      { path: '/visor', element: wait(<Visor />) },
      { path: '/geoservicios', element: <Geoservicios /> },
      { path: '/servicios', element: <Navigate to="/geoservicios" replace /> },
      { path: '/metadatos', element: <Metadatos /> },
      { path: '/documentacion', element: <Documentacion /> },
      { path: '/organismos', element: <Organismos /> },
      { path: '/institucional', element: <Institucional /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
