import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, CircleHelp, Cloud, Download, FileText, Layers, Leaf, Map as MapIcon, Building2, Mail, BarChart3, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { countResource, listGroups } from '../lib/geonode'
import { SHOW_DOWNLOAD_STATS } from '../lib/config'
import Reveal from '../ui/Reveal'
import Page from '../ui/Page'
import { PatronFlores } from '../ui/brand'
import hero from '../assets/hero.svg'
import cardDoc from '../assets/card-doc.svg'

// OpenLayers solo se carga cuando se muestra el mapa
const HomeMap = lazy(() => import('../components/HomeMap'))

function Stat({ icon: Icon, color, value, loading, label, to }: { icon: LucideIcon; color: string; value?: number; loading: boolean; label: string; to?: string }) {
  const body = (
    <div className="card card-hover group flex items-center gap-4 p-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${color}`}><Icon className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        {loading ? <div className="skeleton h-7 w-14" /> : <div className="text-3xl font-bold leading-none text-verde-900">{value ?? '—'}</div>}
        <div className="mt-1 truncate text-sm text-muted-foreground">{label}</div>
      </div>
      {to && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

const QUICK = [
  { to: '/catalogo', label: 'Datos abiertos', icon: BarChart3, color: 'text-verde-700' },
  { to: '/catalogo', label: 'Descargas', icon: Download, color: 'text-verde-700' },
  { to: '/metadatos', label: 'Metadatos', icon: FileText, color: 'text-verde-700' },
  { to: '/documentacion#faq', label: 'Preguntas frecuentes', icon: CircleHelp, color: 'text-verde-700' },
  { to: '/institucional#contacto', label: 'Contacto', icon: Mail, color: 'text-verde-700' },
]

export default function Inicio() {
  const ds = useQuery({ queryKey: ['count', 'datasets'], queryFn: () => countResource('datasets') })
  const maps = useQuery({ queryKey: ['count', 'maps'], queryFn: () => countResource('maps') })
  const groups = useQuery({ queryKey: ['groups'], queryFn: listGroups })

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-verde-900" style={{ backgroundImage: `linear-gradient(90deg, rgb(31 51 41 / .85), rgb(31 51 41 / .15)), url(${hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-8 md:px-8 md:py-10">
          <span className="h-14 w-1.5 shrink-0 rounded-full bg-verde-200 md:h-16" />
          <div className="text-white">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Visor geográfico</h1>
            <p className="mt-1 text-lg text-white/90 md:text-xl">Explorá la información territorial de Misiones</p>
          </div>
        </div>
      </section>

      <Page className="space-y-5">
        {/* Estadísticas reales */}
        <div className={`grid gap-4 sm:grid-cols-2 ${SHOW_DOWNLOAD_STATS ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          <Reveal i={0}><Stat icon={Layers} color="bg-verde-200/60 text-verde-700" value={ds.data} loading={ds.isLoading} label="Capas disponibles" to="/catalogo" /></Reveal>
          <Reveal i={1}><Stat icon={MapIcon} color="bg-sky-100 text-sky-700" value={maps.data} loading={maps.isLoading} label="Mapas publicados" /></Reveal>
          {SHOW_DOWNLOAD_STATS && (
            <Reveal i={2}><Stat icon={Download} color="bg-rosa/30 text-rosa-fuerte" value={undefined} loading={false} label="Descargas este mes" /></Reveal>
          )}
          <Reveal i={3}><Stat icon={Building2} color="bg-amber-100 text-amber-700" value={groups.data?.total} loading={groups.isLoading} label="Organismos" to="/organismos" /></Reveal>
        </div>

        {/* Mapa + tarjetas */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Suspense fallback={<div className="card skeleton h-[460px]" />}><HomeMap /></Suspense>
          </Reveal>
          <div className="flex flex-col gap-4">
            <Reveal i={1}>
              <Link to="/documentacion" className="card card-hover group block overflow-hidden">
                <img src={cardDoc} alt="" className="h-28 w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="flex gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-verde-700 text-white"><BookOpen className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-bold text-verde-900">Documentación técnica</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">Consultá manuales, guías y recursos para el uso de la IDE.</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-verde-700">Ver documentación <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            </Reveal>
            <Reveal i={2}>
              <Link to="/geoservicios" className="card card-hover group flex gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-verde-700 text-white"><Cloud className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-bold text-verde-900">Servicios OGC</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">Accedé a los servicios geográficos de la IDE.</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-verde-700">Explorar servicios <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            </Reveal>
            <Reveal i={3} className="flex-1">
              <div className="relative h-full overflow-hidden rounded-2xl border border-verde-200 bg-gradient-to-br from-verde-200/70 to-verde-200/20 p-5">
                <PatronFlores className="absolute inset-0 text-verde-700/10" />
                <div className="relative flex gap-3">
                  <Leaf className="h-8 w-8 shrink-0 text-verde-700" />
                  <div>
                    <h3 className="font-bold text-verde-900">Misiones, un territorio para cuidar</h3>
                    <p className="mt-1 text-sm text-verde-900/80">Información geoespacial al servicio del desarrollo sostenible.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Accesos rápidos */}
        <Reveal>
          <nav className="card flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-0" aria-label="Accesos rápidos">
            <div className="px-3 text-lg font-bold text-verde-900 md:w-52 md:shrink-0">Accesos rápidos</div>
            <div className="grid flex-1 grid-cols-2 gap-1 sm:grid-cols-3 md:flex md:divide-x md:divide-border">
              {QUICK.map((q) => (
                <Link key={q.label} to={q.to} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-verde-900 transition hover:bg-beige md:rounded-none">
                  <q.icon className={`h-5 w-5 ${q.color}`} /> {q.label}
                </Link>
              ))}
            </div>
          </nav>
        </Reveal>
      </Page>
    </div>
  )
}

