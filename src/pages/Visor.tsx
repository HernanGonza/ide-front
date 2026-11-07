import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check, ChevronDown, Download, FileText, Layers, Palette, Plus, Table2, X } from 'lucide-react'
import type Map from 'ol/Map'
import PrintDialog from '../components/PrintDialog'
import AttributeTable from '../components/AttributeTable'
import StyleEditor from '../components/StyleEditor'
import MapView, { type FeatureInfo, type MapLayer } from '../components/MapView'
import Switch from '../ui/Switch'
import { listDatasets, bboxOf } from '../lib/geonode'
import { buildSld, legendUrl, wcsDownload, wfsDownloads, type GeomKind, type StyleOpts } from '../lib/ogc'
import { BASEMAPS, type BasemapId } from '../lib/basemaps'

interface Active extends MapLayer { title: string; legend: boolean; pk?: number | string; raster?: boolean; style?: StyleOpts; geom?: GeomKind }

export default function Visor() {
  const [sp, setSp] = useSearchParams()
  const initial = useMemo(() => (sp.get('capas') ?? '').split(',').filter(Boolean), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [layers, setLayers] = useState<Active[]>(() => initial.map((n) => ({ name: n, title: n.split(':').pop()!.replace(/_/g, ' '), visible: true, opacity: 1, legend: true })))
  const [basemap, setBasemap] = useState<BasemapId>('argenmap')
  const [tab, setTab] = useState<'activas' | 'agregar'>(initial.length ? 'activas' : 'agregar')
  const [q, setQ] = useState('')
  const [info, setInfo] = useState<FeatureInfo | null>(null)
  const [fit, setFit] = useState<[number, number, number, number] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false) // drawer en mobile
  const [map, setMap] = useState<Map | null>(null)
  const [printing, setPrinting] = useState(false)
  const [dl, setDl] = useState<string | null>(null) // capa con menú de descarga abierto
  const [styling, setStyling] = useState<string | null>(null) // capa con editor de estilo abierto
  const [table, setTable] = useState<string | null>(null) // capa con tabla de atributos abierta

  const search = useQuery({ queryKey: ['visor-search', q], queryFn: () => listDatasets({ search: q, pageSize: 20 }) })

  const commit = (next: Active[]) => {
    setLayers(next)
    const n = new URLSearchParams(sp)
    next.length ? n.set('capas', next.map((l) => l.name).join(',')) : n.delete('capas')
    setSp(n, { replace: true })
  }
  const patch = (name: string, p: Partial<Active>) => commit(layers.map((l) => (l.name === name ? { ...l, ...p } : l)))
  const move = (i: number, dir: 1 | -1) => {
    const j = i + dir
    if (j < 0 || j >= layers.length) return
    const n = [...layers]
    ;[n[i], n[j]] = [n[j], n[i]]
    commit(n)
  }

  const mapLayers = useMemo(() => layers.map((l) => ({ ...l, sld: l.style && l.geom ? buildSld(l.name, l.geom, l.style) : undefined })), [layers])
  const legendOf = (l: Active) => (l.style && l.geom ? `${legendUrl(l.name)}&SLD_BODY=${encodeURIComponent(buildSld(l.name, l.geom, l.style))}` : legendUrl(l.name))

  // Panel muestra la de arriba primero; el array va de abajo hacia arriba.
  const ordered = [...layers].map((l, i) => ({ l, i })).reverse()

  const panel = (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex border-b border-border text-sm">
        {(['activas', 'agregar'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative flex-1 py-3 font-semibold ${tab === t ? 'text-verde-700' : 'text-muted-foreground'}`}>
            {t === 'activas' ? `Capas (${layers.length})` : 'Agregar capas'}
            {tab === t && <motion.span layoutId="visor-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-verde-700" />}
          </button>
        ))}
      </div>

      {tab === 'agregar' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar capa…" className="m-3 rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-verde-700" />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {search.data?.items.map((d) => {
              const on = layers.some((l) => l.name === d.alternate)
              return (
                <button
                  key={d.pk}
                  disabled={on}
                  onClick={() => {
                    commit([...layers, { name: d.alternate, title: d.title, visible: true, opacity: 1, legend: true, pk: d.pk, raster: d.subtype === 'raster' }])
                    setFit(bboxOf(d))
                  }}
                  className="mb-1 flex w-full items-start gap-2 rounded-xl p-2 text-left text-sm transition hover:bg-beige disabled:opacity-50"
                >
                  <span className="mt-0.5 text-verde-700">{on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
                  <span><span className="block text-verde-900">{d.title}</span><span className="text-xs text-muted-foreground">{d.category?.gn_description}</span></span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {!layers.length && <p className="p-2 text-sm text-muted-foreground">No hay capas cargadas.</p>}
          <AnimatePresence initial={false}>
            {ordered.map(({ l, i }) => (
              <motion.div key={l.name} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="rounded-2xl border border-border p-3">
                <div className="flex items-start gap-2.5">
                  <div className="pt-0.5"><Switch checked={l.visible} onChange={(v) => patch(l.name, { visible: v })} label={`Mostrar ${l.title}`} /></div>
                  <div className="min-w-0 flex-1 text-sm font-semibold leading-snug text-verde-900">{l.title}</div>
                  <div className="flex shrink-0 gap-0.5 text-muted-foreground">
                    <button title="Subir" onClick={() => move(i, 1)} className="rounded p-0.5 hover:text-verde-900"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button title="Bajar" onClick={() => move(i, -1)} className="rounded p-0.5 hover:text-verde-900"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button title="Quitar" onClick={() => commit(layers.filter((x) => x.name !== l.name))} className="rounded p-0.5 hover:text-rosa-fuerte"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="range" min={0} max={1} step={0.05} value={l.opacity} onChange={(e) => patch(l.name, { opacity: +e.target.value })} className="flex-1 accent-verde-700" aria-label="Opacidad" />
                  <button onClick={() => patch(l.name, { legend: !l.legend })} className="flex items-center gap-0.5 text-xs font-semibold text-verde-700">
                    Leyenda <ChevronDown className={`h-3 w-3 transition-transform ${l.legend ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-verde-700">
                  {l.pk && <Link to={`/capa/${l.pk}`} className="inline-flex items-center gap-1 hover:underline"><FileText className="h-3.5 w-3.5" /> Ficha</Link>}
                  <button onClick={() => setDl(dl === l.name ? null : l.name)} className="inline-flex items-center gap-1 hover:underline"><Download className="h-3.5 w-3.5" /> Descargar</button>
                  {!l.raster && <button onClick={() => setTable(table === l.name ? null : l.name)} className="inline-flex items-center gap-1 hover:underline"><Table2 className="h-3.5 w-3.5" /> Tabla</button>}
                  {!l.raster && <button onClick={() => setStyling(styling === l.name ? null : l.name)} className="inline-flex items-center gap-1 hover:underline"><Palette className="h-3.5 w-3.5" /> Estilo</button>}
                </div>
                {dl === l.name && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(l.raster ? [wcsDownload(l.name)] : wfsDownloads(l.name)).map((x) => (
                      <a key={x.key} href={x.url} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-verde-900 hover:bg-verde-200/60">{x.label}</a>
                    ))}
                  </div>
                )}
                {styling === l.name && <StyleEditor layer={l.name} style={l.style} onChange={(style, geom) => patch(l.name, { style, geom })} />}
                {l.legend && <img src={legendOf(l)} alt={`Leyenda de ${l.title}`} loading="lazy" className="mt-2 max-w-full" />}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="border-t border-border p-3">
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Mapa base</div>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((b) => (
            <button key={b} onClick={() => setBasemap(b)} className={`rounded-full px-2 py-1.5 text-xs font-medium transition ${basemap === b ? 'bg-verde-700 text-white' : 'bg-muted text-verde-900 hover:bg-verde-200/60'}`}>
              {BASEMAPS[b].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="absolute inset-0 flex">
      {/* Panel de capas: fijo en desktop, drawer en mobile */}
      <div className="z-10 hidden w-80 shrink-0 border-r border-border md:block">{panel}</div>
      <AnimatePresence>
        {panelOpen && (
          <div className="absolute inset-0 z-30 md:hidden">
            <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanelOpen(false)} />
            <motion.div className="absolute inset-y-0 left-0 w-[85%] max-w-sm shadow-xl" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>{panel}</motion.div>
          </div>
        )}
      </AnimatePresence>

      <MapView
        className="min-w-0 flex-1"
        layers={mapLayers}
        basemap={basemap}
        fitExtent={fit}
        onFeatureInfo={setInfo}
        showCoords
        onMap={setMap}
        tools={{ measureArea: true, onPrint: () => setPrinting(true) }}
      >
        <button onClick={() => setPanelOpen(true)} className="btn btn-primary absolute right-3 top-3 z-10 shadow md:hidden"><Layers className="h-4 w-4" /> Capas</button>
      </MapView>

      {table && <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 md:left-80"><div className="pointer-events-auto relative h-full"><AttributeTable map={map} layer={table} title={layers.find((l) => l.name === table)?.title ?? table} onClose={() => setTable(null)} /></div></div>}

      {printing && map && <PrintDialog map={map} layers={layers.filter((l) => l.visible)} onClose={() => setPrinting(false)} />}

      {/* Consulta de atributos (GetFeatureInfo) */}
      <AnimatePresence>
        {info && (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="absolute right-3 top-14 z-20 max-h-[70%] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-lg md:top-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-verde-900">Consulta</div>
              <button onClick={() => setInfo(null)} aria-label="Cerrar" className="text-muted-foreground hover:text-verde-900"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-3 font-mono text-[11px] text-muted-foreground">{info.coordinate[1].toFixed(5)}, {info.coordinate[0].toFixed(5)}</div>
            {info.results.map((r, k) => (
              <div key={k} className="mb-3">
                <div className="mb-1 text-xs font-semibold text-verde-700">{layers.find((l) => l.name === r.layer)?.title ?? r.layer}</div>
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(r.properties).map(([key, v]) => (
                      <tr key={key} className="border-b border-border last:border-0">
                        <td className="py-1 pr-2 align-top text-muted-foreground">{key}</td>
                        <td className="break-all py-1">{String(v ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
