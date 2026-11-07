import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Info, Layers, Maximize2 } from 'lucide-react'
import MapView from './MapView'
import Switch from '../ui/Switch'
import { HOME_LAYERS } from '../lib/config'
import { getDatasetsByAlternate } from '../lib/geonode'
import { legendUrl } from '../lib/ogc'

/** Mapa embebido del inicio (carga OpenLayers aparte, vía lazy en Inicio). */
export default function HomeMap() {
  const nav = useNavigate()
  const [off, setOff] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState(true)
  const [legend, setLegend] = useState(false)

  const titles = useQuery({ queryKey: ['home-layers', HOME_LAYERS.join(',')], queryFn: () => getDatasetsByAlternate(HOME_LAYERS), enabled: HOME_LAYERS.length > 0 })
  const titleOf = (alt: string) => titles.data?.find((d) => d.alternate === alt)?.title ?? alt.split(':').pop()!.replace(/_/g, ' ')

  const layers = HOME_LAYERS.map((name) => ({ name, visible: !off.has(name), opacity: 1 }))
  const active = HOME_LAYERS.filter((n) => !off.has(n))
  const toggle = (n: string, v: boolean) => setOff((s) => { const x = new Set(s); v ? x.delete(n) : x.add(n); return x })
  const openVisor = () => nav(active.length ? `/visor?capas=${encodeURIComponent(active.join(','))}` : '/visor')

  return (
    <div className="card relative h-[460px] overflow-hidden lg:h-full lg:min-h-[480px]">
      <MapView
        className="h-full w-full"
        layers={layers}
        basemap="satelite"
        // TODO: imprimir con leyenda/escala. Por ahora abre la vista en el visor.
        tools={{ onPrint: openVisor }}
      >
        {/* Panel flotante: capas activas + leyenda */}
        <div className="absolute right-3 top-3 z-10 w-64 max-w-[calc(100%-5.5rem)] rounded-2xl border border-border bg-white/95 shadow-lg backdrop-blur">
          <button onClick={() => setPanel(!panel)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-verde-900">
            <Layers className="h-4 w-4" /> Capas activas
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${panel ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {panel && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="max-h-[300px] space-y-2.5 overflow-y-auto border-t border-border px-4 py-3">
                  {HOME_LAYERS.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin capas configuradas. Definí <code>VITE_HOME_LAYERS</code> en <code>.env</code>.</p>
                  )}
                  {HOME_LAYERS.map((n) => (
                    <div key={n} className="flex items-center gap-3 text-sm text-verde-900">
                      <span className="min-w-0 flex-1 truncate" title={n}>{titleOf(n)}</span>
                      <Switch checked={!off.has(n)} onChange={(v) => toggle(n, v)} label={titleOf(n)} />
                    </div>
                  ))}
                </div>
                {active.length > 0 && (
                  <div className="border-t border-border">
                    <button onClick={() => setLegend(!legend)} className="flex w-full items-center px-4 py-2.5 text-sm font-bold text-verde-900">
                      Leyenda <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${legend ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {legend && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="max-h-52 space-y-3 overflow-auto px-4 pb-3">
                            {active.map((n) => (
                              <div key={n}>
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">{titleOf(n)}</div>
                                <img src={legendUrl(n)} alt={`Leyenda de ${titleOf(n)}`} loading="lazy" className="max-w-full" />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={openVisor} className="btn btn-primary absolute bottom-3 left-1/2 z-10 -translate-x-1/2 shadow-lg">
          <Maximize2 className="h-4 w-4" /> Abrir en visor completo
        </button>
        <div className="absolute bottom-3 right-3 z-10 hidden items-center gap-1.5 rounded-lg border border-border bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-verde-900 shadow-sm sm:flex">
          <Layers className="h-3.5 w-3.5" /> Fuente: IDE Misiones <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </MapView>
      <Link to="/visor" className="sr-only">Ir al visor</Link>
    </div>
  )
}
