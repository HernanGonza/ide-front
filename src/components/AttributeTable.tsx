import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type Map from 'ol/Map'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { cqlContains, describeLayer, getFeaturesPage, wfsDownloads, type GeoJsonFeature } from '../lib/ogc'

const PAGE = 25
const hl = new Style({
  stroke: new Stroke({ color: '#f0e868', width: 4 }),
  fill: new Fill({ color: 'rgb(240 232 104 / 0.3)' }),
  image: new CircleStyle({ radius: 9, fill: new Fill({ color: 'rgb(240 232 104 / 0.6)' }), stroke: new Stroke({ color: '#c9346c', width: 3 }) }),
})

interface Props { map: Map | null; layer: string; title: string; onClose: () => void }

/** Tabla de atributos paginada (WFS) con orden, búsqueda y zoom a la entidad. */
export default function AttributeTable({ map, layer, title, onClose }: Props) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ by?: string; desc: boolean }>({ desc: false })
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const src = useRef(new VectorSource())

  const d = useQuery({ queryKey: ['describe', layer], queryFn: () => describeLayer(layer), staleTime: Infinity, retry: false })
  const cql = useMemo(() => (d.data ? cqlContains(d.data.fields, term) : undefined), [d.data, term])
  const by = sort.by ?? d.data?.fields[0]?.name
  const rows = useQuery({
    queryKey: ['features', layer, page, by, sort.desc, cql],
    queryFn: () => getFeaturesPage(layer, { start: page * PAGE, count: PAGE, sortBy: by, desc: sort.desc, cql }),
    enabled: !!d.data,
    placeholderData: keepPreviousData,
  })

  // Capa de resaltado sobre el mapa
  useEffect(() => {
    if (!map) return
    const l = new VectorLayer({ source: src.current, style: hl, zIndex: 999 })
    map.addLayer(l)
    return () => { map.removeLayer(l); src.current.clear() }
  }, [map])
  useEffect(() => { setPage(0); setSelected(null); src.current.clear() }, [layer, term])

  const zoomTo = (f: GeoJsonFeature, key: string) => {
    setSelected(key)
    src.current.clear()
    if (!map || !f.geometry) return
    const feats = new GeoJSON().readFeatures({ type: 'Feature', geometry: f.geometry, properties: {} } as never)
    src.current.addFeatures(feats)
    const ext = src.current.getExtent()
    if (ext && isFinite(ext[0]!)) map.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 })
  }

  const total = rows.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const cols = d.data?.fields ?? []
  const csv = wfsDownloads(layer).find((x) => x.key === 'csv')

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[45%] flex-col border-t border-border bg-white shadow-[0_-8px_24px_-12px_rgb(31_51_41/0.3)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <div className="min-w-0 flex-1 truncate text-sm font-bold text-verde-900">Tabla de atributos · {title}</div>
        <form onSubmit={(e) => { e.preventDefault(); setTerm(input) }} className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Buscar en la tabla…" className="w-48 rounded-full border border-border py-1.5 pl-8 pr-3 text-xs outline-none focus:border-verde-700" />
        </form>
        {csv && <a href={csv.url} className="btn btn-ghost py-1 text-xs"><Download className="h-3.5 w-3.5" /> CSV</a>}
        <button onClick={onClose} aria-label="Cerrar tabla" className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {d.isError && <p className="p-4 text-sm text-muted-foreground">Esta capa no tiene tabla de atributos (es ráster o no permite WFS).</p>}
        {(d.isLoading || (rows.isLoading && d.data)) && <div className="skeleton m-4 h-24" />}
        {rows.isError && <p className="p-4 text-sm text-rosa-fuerte">No se pudieron leer las entidades.</p>}
        {rows.data && (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-beige">
              <tr>
                {cols.map((c) => (
                  <th key={c.name} className="whitespace-nowrap border-b border-border px-3 py-2 text-left font-semibold text-verde-900">
                    <button onClick={() => setSort({ by: c.name, desc: by === c.name ? !sort.desc : false })} className="inline-flex items-center gap-1 hover:text-verde-700">
                      {c.name}
                      {by === c.name && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.data.features.map((f, i) => {
                const key = f.id ?? String(i)
                return (
                  <tr key={key} onClick={() => zoomTo(f, key)} className={`cursor-pointer border-b border-border transition-colors ${selected === key ? 'bg-amarillo/40' : 'hover:bg-beige'}`}>
                    {cols.map((c) => <td key={c.name} className="max-w-[16rem] truncate px-3 py-1.5" title={String(f.properties[c.name] ?? '')}>{String(f.properties[c.name] ?? '')}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {rows.data && rows.data.features.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sin resultados.</p>}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
        <span>{total} entidades · clic en una fila para ubicarla en el mapa</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 0} onClick={() => setPage(page - 1)} aria-label="Página anterior" className="rounded-full p-1 hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Página siguiente" className="rounded-full p-1 hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}
