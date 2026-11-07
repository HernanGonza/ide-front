import { useEffect, useRef, useState } from 'react'
import type Map from 'ol/Map'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Draw from 'ol/interaction/Draw'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { LineString, Polygon } from 'ol/geom'
import { getArea, getLength } from 'ol/sphere'
import { fromLonLat } from 'ol/proj'
import { Circle, Fill, Stroke, Style } from 'ol/style'
import { Locate, Minus, Plus, Printer, Ruler, SquareDashed, Trash2 } from 'lucide-react'

type Mode = 'none' | 'length' | 'area'

const style = new Style({
  stroke: new Stroke({ color: '#c9346c', width: 3 }),
  fill: new Fill({ color: 'rgb(201 52 108 / 0.15)' }),
  image: new Circle({ radius: 6, fill: new Fill({ color: '#3e6c51' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
})

const fmtLen = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`)
const fmtArea = (m2: number) => (m2 >= 1e6 ? `${(m2 / 1e6).toFixed(2)} km²` : `${(m2 / 1e4).toFixed(2)} ha`)

interface Props {
  map: Map | null
  measureArea?: boolean
  onPrint: () => void
}

function Btn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg transition active:scale-95 ${active ? 'bg-verde-700 text-white' : 'text-verde-900 hover:bg-beige'}`}
    >
      {children}
    </button>
  )
}

export default function MapTools({ map, measureArea, onPrint }: Props) {
  const [mode, setMode] = useState<Mode>('none')
  const [result, setResult] = useState('')
  const [geoError, setGeoError] = useState('')
  const src = useRef(new VectorSource())
  const layer = useRef(new VectorLayer({ source: src.current, style, zIndex: 1000 }))

  useEffect(() => {
    if (!map) return
    const l = layer.current
    map.addLayer(l)
    return () => { map.removeLayer(l) }
  }, [map])

  useEffect(() => {
    if (!map || mode === 'none') return
    const draw = new Draw({ source: src.current, type: mode === 'length' ? 'LineString' : 'Polygon', style })
    draw.on('drawstart', () => {
      src.current.getFeatures().filter((f) => !f.get('gps')).forEach((f) => src.current.removeFeature(f))
      setResult('')
    })
    draw.on('drawend', (e) => {
      const g = e.feature.getGeometry()
      if (g instanceof LineString) setResult(fmtLen(getLength(g)))
      else if (g instanceof Polygon) setResult(fmtArea(getArea(g)))
      setMode('none')
    })
    map.addInteraction(draw)
    return () => { map.removeInteraction(draw) }
  }, [map, mode])

  const zoom = (d: number) => {
    const v = map?.getView()
    if (v) v.animate({ zoom: (v.getZoom() ?? 7) + d, duration: 200 })
  }
  const locate = () => {
    setGeoError('')
    if (!navigator.geolocation) return setGeoError('Tu navegador no permite geolocalización')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = fromLonLat([p.coords.longitude, p.coords.latitude])
        src.current.getFeatures().filter((f) => f.get('gps')).forEach((f) => src.current.removeFeature(f))
        const f = new Feature(new Point(c))
        f.set('gps', true)
        src.current.addFeature(f)
        map?.getView().animate({ center: c, zoom: 14, duration: 600 })
      },
      () => setGeoError('No se pudo obtener tu ubicación'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const clear = () => { src.current.clear(); setResult(''); setMode('none') }

  return (
    <>
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-0.5 rounded-xl border border-border bg-white/95 p-1 shadow-sm backdrop-blur">
        <Btn title="Acercar" onClick={() => zoom(1)}><Plus className="h-4 w-4" /></Btn>
        <Btn title="Alejar" onClick={() => zoom(-1)}><Minus className="h-4 w-4" /></Btn>
      </div>
      <div className="absolute left-3 top-[5.5rem] z-10 flex flex-col gap-0.5 rounded-xl border border-border bg-white/95 p-1 shadow-sm backdrop-blur">
        <Btn title="Ubicarme" onClick={locate}><Locate className="h-4 w-4" /></Btn>
        <Btn title="Medir distancia" active={mode === 'length'} onClick={() => setMode(mode === 'length' ? 'none' : 'length')}><Ruler className="h-4 w-4" /></Btn>
        {measureArea && <Btn title="Medir área" active={mode === 'area'} onClick={() => setMode(mode === 'area' ? 'none' : 'area')}><SquareDashed className="h-4 w-4" /></Btn>}
        {(result || src.current.getFeatures().length > 0) && <Btn title="Borrar mediciones" onClick={clear}><Trash2 className="h-4 w-4" /></Btn>}
        <Btn title="Imprimir" onClick={onPrint}><Printer className="h-4 w-4" /></Btn>
      </div>
      {(result || mode !== 'none' || geoError) && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-verde-900 px-4 py-1.5 text-xs font-semibold text-white shadow">
          {geoError || (result ? `Medición: ${result}` : mode === 'length' ? 'Clic para trazar · doble clic para terminar' : 'Clic para dibujar · doble clic para terminar')}
        </div>
      )}
    </>
  )
}
