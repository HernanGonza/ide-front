import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'

// Argenmap (IGN) es el mapa base recomendado por IDERA.
const IGN = 'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0'

export const BASEMAPS = {
  argenmap: { label: 'Argenmap', make: () => new XYZ({ url: `${IGN}/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png`, attributions: '© Instituto Geográfico Nacional', crossOrigin: 'anonymous' }) },
  gris: { label: 'Argenmap gris', make: () => new XYZ({ url: `${IGN}/mapabase_gris@EPSG%3A3857@png/{z}/{x}/{-y}.png`, attributions: '© Instituto Geográfico Nacional', crossOrigin: 'anonymous' }) },
  satelite: { label: 'Satelital', make: () => new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attributions: 'Imágenes © Esri', maxZoom: 19, crossOrigin: 'anonymous' }) },
  osm: { label: 'OpenStreetMap', make: () => new OSM() },
} as const

export type BasemapId = keyof typeof BASEMAPS

export function basemapLayer(id: BasemapId) {
  return new TileLayer({ source: BASEMAPS[id].make(), properties: { basemap: true } })
}
