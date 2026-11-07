import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { DEFAULT_STYLE, describeLayer, type GeomKind, type StyleOpts } from '../lib/ogc'

interface Props {
  layer: string
  style?: StyleOpts
  onChange: (style: StyleOpts | undefined, geom: GeomKind | undefined) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex items-center gap-2 text-xs text-verde-900"><span className="w-20 shrink-0 text-muted-foreground">{label}</span>{children}</label>
}

/** Estilo temporal de la capa en este visor (se envía como SLD_BODY; no modifica GeoServer). */
export default function StyleEditor({ layer, style, onChange }: Props) {
  const d = useQuery({ queryKey: ['describe', layer], queryFn: () => describeLayer(layer), staleTime: Infinity, retry: false })
  // Borrador local: el mapa se actualiza 400 ms después del último cambio (cada pedido con estilo dinámico es costoso)
  const [draft, setDraft] = useState<StyleOpts | undefined>(style)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  const s = draft ?? DEFAULT_STYLE
  const set = (p: Partial<StyleOpts>) => {
    const n = { ...s, ...p }
    setDraft(n)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(n, d.data?.geom), 400)
  }
  const reset = () => { clearTimeout(timer.current); setDraft(undefined); onChange(undefined, undefined) }

  if (d.isLoading) return <div className="skeleton mt-2 h-20" />
  if (d.isError || !d.data) return <p className="mt-2 text-xs text-muted-foreground">El estilo se puede cambiar solo en capas vectoriales.</p>
  const { geom } = d.data

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-beige p-3">
      {geom !== 'line' && <Row label="Relleno"><input type="color" value={s.fill} onChange={(e) => set({ fill: e.target.value })} className="h-6 w-10 cursor-pointer rounded border border-border bg-white" /></Row>}
      <Row label={geom === 'line' ? 'Color' : 'Borde'}><input type="color" value={s.stroke} onChange={(e) => set({ stroke: e.target.value })} className="h-6 w-10 cursor-pointer rounded border border-border bg-white" /></Row>
      <Row label="Grosor"><input type="range" min={0.5} max={6} step={0.5} value={s.width} onChange={(e) => set({ width: +e.target.value })} className="flex-1 accent-verde-700" /></Row>
      {geom === 'point' && <Row label="Tamaño"><input type="range" min={4} max={24} step={1} value={s.size} onChange={(e) => set({ size: +e.target.value })} className="flex-1 accent-verde-700" /></Row>}
      {geom !== 'line' && <Row label="Transparencia"><input type="range" min={0} max={1} step={0.05} value={s.fillOpacity} onChange={(e) => set({ fillOpacity: +e.target.value })} className="flex-1 accent-verde-700" /></Row>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">Estilo solo para esta vista</span>
        {draft && <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-verde-700 hover:underline"><RotateCcw className="h-3 w-3" /> Restablecer</button>}
      </div>
    </div>
  )
}
