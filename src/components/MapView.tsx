import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import ScaleLine from 'ol/control/ScaleLine'
import { defaults as defaultControls } from 'ol/control/defaults'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import { OWS, MISIONES_CENTER, MISIONES_ZOOM } from '../lib/config'
import { basemapLayer, type BasemapId } from '../lib/basemaps'
import MapTools from './MapTools'

export interface MapLayer {
  name: string // alternate de GeoServer (workspace:capa)
  visible: boolean
  opacity: number
  sld?: string // estilo temporal (SLD_BODY)
}

export interface FeatureInfo {
  coordinate: [number, number] // lon/lat
  results: { layer: string; properties: Record<string, unknown> }[]
}

interface Props {
  layers: MapLayer[]
  basemap?: BasemapId
  fitExtent?: [number, number, number, number] | null // EPSG:4326
  onFeatureInfo?: (info: FeatureInfo | null) => void
  showCoords?: boolean
  tools?: { measureArea?: boolean; onPrint: () => void } // controles: zoom, ubicarme, medir, imprimir
  onMap?: (m: Map) => void
  children?: React.ReactNode // overlays sobre el mapa
  className?: string
}

export default function MapView({ layers, basemap = 'argenmap', fitExtent, onFeatureInfo, showCoords, className, tools, onMap, children }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const wms = useRef(new globalThis.Map<string, TileLayer<TileWMS>>())
  const [coords, setCoords] = useState<string>('')
  const [mapInst, setMapInst] = useState<Map | null>(null)
  const layersRef = useRef(layers)
  layersRef.current = layers
  const infoRef = useRef(onFeatureInfo)
  infoRef.current = onFeatureInfo

  // Crear mapa una sola vez
  useEffect(() => {
    if (!el.current) return
    const m = new Map({
      target: el.current,
      layers: [basemapLayer(basemap)],
      view: new View({ center: fromLonLat(MISIONES_CENTER), zoom: MISIONES_ZOOM, maxZoom: 20 }),
      controls: defaultControls({ zoom: false, attributionOptions: { collapsible: true } }).extend([new ScaleLine({ units: 'metric' })]),
    })
    m.on('pointermove', (e) => {
      const [lon, lat] = toLonLat(e.coordinate)
      setCoords(`${lat.toFixed(5)}, ${lon.toFixed(5)}`)
    })
    m.on('singleclick', async (e) => {
      if (!infoRef.current) return
      const view = m.getView()
      const visibles = layersRef.current.filter((l) => l.visible).reverse()
      const results: FeatureInfo['results'] = []
      await Promise.all(
        visibles.map(async (l) => {
          const src = wms.current.get(l.name)?.getSource()
          const url = src?.getFeatureInfoUrl(e.coordinate, view.getResolution()!, view.getProjection(), {
            INFO_FORMAT: 'application/json',
            FEATURE_COUNT: 5,
          })
          if (!url) return
          try {
            const r = await fetch(url).then((x) => x.json())
            for (const f of r.features ?? []) results.push({ layer: l.name, properties: f.properties ?? {} })
          } catch { /* capa sin consulta habilitada */ }
        }),
      )
      const [lon, lat] = toLonLat(e.coordinate)
      infoRef.current(results.length ? { coordinate: [lon, lat], results } : null)
    })
    map.current = m
    setMapInst(m)
    onMap?.(m)
    return () => {
      // StrictMode monta/desmonta dos veces: las capas WMS cacheadas pertenecían al mapa anterior
      wms.current.clear()
      m.setTarget(undefined)
      setMapInst(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mapa base
  useEffect(() => {
    const m = map.current
    if (!m) return
    const old = m.getLayers().getArray().find((l) => l.get('basemap'))
    if (old) m.removeLayer(old)
    m.getLayers().insertAt(0, basemapLayer(basemap))
  }, [basemap])

  // Sincronizar capas WMS (orden, visibilidad, opacidad)
  useEffect(() => {
    const m = map.current
    if (!m) return
    const wanted = new Set(layers.map((l) => l.name))
    for (const [name, lyr] of wms.current) {
      if (!wanted.has(name)) {
        m.removeLayer(lyr)
        wms.current.delete(name)
      }
    }
    layers.forEach((l, i) => {
      let lyr = wms.current.get(l.name)
      if (!lyr) {
        lyr = new TileLayer({
          source: new TileWMS({
            url: OWS,
            params: { LAYERS: l.name, TILED: true, FORMAT: 'image/png', TRANSPARENT: true },
            serverType: 'geoserver',
            transition: 0,
          }),
        })
        wms.current.set(l.name, lyr)
        m.addLayer(lyr)
      }
      if (lyr.get('sld') !== l.sld) {
        lyr.set('sld', l.sld)
        // Con TILED=true GeoServer ignora el SLD (usa su caché de teselas): hay que desactivarlo
        lyr.getSource()!.updateParams({ SLD_BODY: l.sld, TILED: !l.sld })
      }
      lyr.setVisible(l.visible)
      lyr.setOpacity(l.opacity)
      lyr.setZIndex(10 + i)
    })
  }, [layers])

  // Encuadre
  useEffect(() => {
    if (!map.current || !fitExtent) return
    const ext = transformExtent(fitExtent, 'EPSG:4326', 'EPSG:3857')
    map.current.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 300 })
  }, [fitExtent?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={el} className="absolute inset-0" />
      {tools && <MapTools map={mapInst} measureArea={tools.measureArea} onPrint={tools.onPrint} />}
      {children}
      {showCoords && coords && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-verde-900/85 px-2 py-0.5 font-mono text-[11px] text-white">
          {coords} · WGS84
        </div>
      )}
    </div>
  )
}
