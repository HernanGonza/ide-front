import { useEffect, useMemo, useState } from 'react'
import type Map from 'ol/Map'
import { Printer, X } from 'lucide-react'
import { legendUrl } from '../lib/ogc'

interface Props {
  map: Map
  layers: { name: string; title: string }[]
  onClose: () => void
}

/** Compone el mapa actual en una imagen y la imprime con título, leyendas, escala y fecha. */
function snapshot(map: Map): string {
  const size = map.getSize() ?? [0, 0]
  if (!size[0] || !size[1]) throw new Error('Mapa sin tamaño')
  map.renderSync()
  const out = document.createElement('canvas')
  out.width = size[0]
  out.height = size[1]
  const ctx = out.getContext('2d') as CanvasRenderingContext2D
  (map.getViewport() as HTMLElement).querySelectorAll<HTMLCanvasElement>('.ol-layer canvas, canvas.ol-layer').forEach((c) => {
    if (c.width === 0) return
    const op = (c.parentNode as HTMLElement).style.opacity || c.style.opacity
    ctx.globalAlpha = op === '' ? 1 : Number(op)
    const m = c.style.transform.match(/^matrix\(([^)]*)\)$/)?.[1].split(',').map(Number)
    if (m && m.length === 6) ctx.setTransform(m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!)
    else ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(c, 0, 0)
  })
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  return out.toDataURL('image/png')
}

export default function PrintDialog({ map, layers, onClose }: Props) {
  const [title, setTitle] = useState('Mapa de la IDE Misiones')
  const [error, setError] = useState('')
  const img = useMemo(() => {
    try { return snapshot(map) } catch { return '' }
  }, [map])
  const scale = useMemo(() => {
    const el = (map.getTargetElement() as HTMLElement).querySelector<HTMLElement>('.ol-scale-line-inner')
    return el ? { text: el.textContent ?? '', width: el.style.width } : null
  }, [map])
  const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!img) setError('No se pudo capturar el mapa (el mapa base bloquea la exportación). Probá con otro mapa base.')
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [img, onClose])

  return (
    <div className="print-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-full w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex items-center gap-3 border-b border-border p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título del mapa" className="min-w-0 flex-1 rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-verde-700" />
          <button onClick={() => window.print()} disabled={!img} className="btn btn-primary disabled:opacity-50"><Printer className="h-4 w-4" /> Imprimir / PDF</button>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="no-print p-4 text-sm text-rosa-fuerte">{error}</p>}
        <div id="print-sheet" className="min-h-0 flex-1 overflow-auto p-6 text-verde-900">
          <h2 className="mb-3 text-2xl font-bold">{title}</h2>
          {img && <img src={img} alt="Vista del mapa" className="w-full rounded-lg border border-border" />}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 text-xs">
            {scale && (
              <div>
                <div className="border-x-2 border-b-2 border-verde-900" style={{ width: scale.width, height: 6 }} />
                <div className="mt-0.5 font-semibold">{scale.text}</div>
              </div>
            )}
            <div className="text-muted-foreground">Fuente: IDE Misiones · {fecha}</div>
          </div>
          {layers.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {layers.map((l) => (
                <div key={l.name} className="break-inside-avoid">
                  <div className="mb-1 text-sm font-bold">{l.title}</div>
                  <img src={legendUrl(l.name)} alt={`Leyenda de ${l.title}`} className="max-w-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
