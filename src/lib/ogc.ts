// URLs de servicios OGC servidos por GeoServer / CSW de GeoNode
import { CSW, OWS, GEOSERVER, PUBLIC_ORIGIN } from './config'

export function legendUrl(layer: string) {
  const p = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetLegendGraphic',
    format: 'image/png',
    layer,
    legend_options: 'fontAntiAliasing:true;fontSize:11;dpi:110',
  })
  return `${OWS}?${p}`
}

export type VectorFormat = 'shp' | 'geojson' | 'csv' | 'kml' | 'gpkg'
const WFS_FORMATS: Record<VectorFormat, { label: string; outputFormat: string }> = {
  shp: { label: 'Shapefile (ZIP)', outputFormat: 'SHAPE-ZIP' },
  geojson: { label: 'GeoJSON', outputFormat: 'application/json' },
  csv: { label: 'CSV', outputFormat: 'csv' },
  kml: { label: 'KML', outputFormat: 'application/vnd.google-earth.kml+xml' },
  gpkg: { label: 'GeoPackage', outputFormat: 'application/geopackage+sqlite3' },
}

export function wfsDownloads(layer: string) {
  return (Object.keys(WFS_FORMATS) as VectorFormat[]).map((k) => {
    const p = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: layer,
      outputFormat: WFS_FORMATS[k].outputFormat,
      srsName: 'EPSG:4326',
    })
    return { key: k, label: WFS_FORMATS[k].label, url: `${OWS}?${p}` }
  })
}

export function wcsDownload(layer: string) {
  const p = new URLSearchParams({
    service: 'WCS',
    version: '2.0.1',
    request: 'GetCoverage',
    coverageId: layer.replace(':', '__'),
    format: 'image/tiff',
  })
  return { key: 'geotiff', label: 'GeoTIFF (WCS)', url: `${OWS}?${p}` }
}

/** Ficha ISO 19139 vía CSW (requisito IDERA: metadatos accesibles). */
export function isoMetadataUrl(uuid: string) {
  const p = new URLSearchParams({
    service: 'CSW',
    version: '2.0.2',
    request: 'GetRecordById',
    id: uuid,
    elementSetName: 'full',
    outputSchema: 'http://www.isotc211.org/2005/gmd',
  })
  return `${CSW}?${p}`
}

/** Endpoints públicos para la página de servicios (URLs absolutas, para copiar). */
export const SERVICES = [
  { id: 'WMS', name: 'Web Map Service', desc: 'Mapas como imagen. Para QGIS, ArcGIS, visores web.', url: `${PUBLIC_ORIGIN}${OWS}?service=WMS&request=GetCapabilities` },
  { id: 'WMTS', name: 'Web Map Tile Service', desc: 'Teselas cacheadas (GeoWebCache). Más rápido para visualizar.', url: `${PUBLIC_ORIGIN}${GEOSERVER}/gwc/service/wmts?request=GetCapabilities` },
  { id: 'WFS', name: 'Web Feature Service', desc: 'Datos vectoriales con atributos. Consulta y descarga.', url: `${PUBLIC_ORIGIN}${OWS}?service=WFS&request=GetCapabilities` },
  { id: 'WCS', name: 'Web Coverage Service', desc: 'Datos ráster (coberturas). Descarga de valores.', url: `${PUBLIC_ORIGIN}${OWS}?service=WCS&request=GetCapabilities` },
  { id: 'CSW', name: 'Catalogue Service for the Web', desc: 'Catálogo de metadatos ISO 19115/19139.', url: `${PUBLIC_ORIGIN}${CSW}?service=CSW&version=2.0.2&request=GetCapabilities` },
]

// ───────── Búsqueda de metadatos vía CSW ─────────

export interface CswRecord {
  id: string
  title: string
  abstract: string
}

export async function searchCsw(text: string, max = 20): Promise<CswRecord[]> {
  const term = text.trim().replace(/[<>&"']/g, '')
  const filter = term
    ? `<ogc:Filter><ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\"><ogc:PropertyName>csw:AnyText</ogc:PropertyName><ogc:Literal>%${term}%</ogc:Literal></ogc:PropertyIsLike></ogc:Filter>`
    : ''
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" xmlns:ogc="http://www.opengis.net/ogc" service="CSW" version="2.0.2" resultType="results" maxRecords="${max}">
  <csw:Query typeNames="csw:Record">
    <csw:ElementSetName>summary</csw:ElementSetName>
    ${filter ? `<csw:Constraint version="1.1.0">${filter}</csw:Constraint>` : ''}
  </csw:Query>
</csw:GetRecords>`
  const res = await fetch(CSW, { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body })
  if (!res.ok) throw new Error(`CSW ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml')
  const text1 = (el: Element, tag: string) => el.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? ''
  return Array.from(doc.getElementsByTagNameNS('*', 'SummaryRecord'))
    .concat(Array.from(doc.getElementsByTagNameNS('*', 'Record')))
    .map((el) => ({ id: text1(el, 'identifier'), title: text1(el, 'title'), abstract: text1(el, 'abstract') }))
    .filter((r) => r.id)
}

// ───────── Tabla de atributos y estilo dinámico (visor) ─────────

export type GeomKind = 'point' | 'line' | 'polygon' | 'unknown'
export interface LayerField { name: string; type: string }
export interface LayerDescription { geom: GeomKind; fields: LayerField[] }

/** Campos y tipo de geometría de una capa vectorial (WFS DescribeFeatureType). Falla en rásters. */
export async function describeLayer(layer: string): Promise<LayerDescription> {
  const p = new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'DescribeFeatureType', typeNames: layer, outputFormat: 'application/json' })
  const res = await fetch(`${OWS}?${p}`)
  if (!res.ok) throw new Error(`WFS ${res.status}`)
  const j = await res.json()
  const props: { name: string; type: string; localType?: string }[] = j.featureTypes?.[0]?.properties ?? []
  const g = props.find((x) => x.type?.startsWith('gml:'))
  const lt = (g?.localType ?? g?.type ?? '').toLowerCase()
  const geom: GeomKind = lt.includes('point') ? 'point' : lt.includes('line') ? 'line' : lt.includes('polygon') || lt.includes('surface') ? 'polygon' : 'unknown'
  return { geom, fields: props.filter((x) => x !== g).map((x) => ({ name: x.name, type: x.localType ?? x.type })) }
}

export interface GeoJsonFeature { id?: string; geometry: unknown; properties: Record<string, unknown> }

/** Una página de entidades (WFS 2.0, GeoJSON en EPSG:3857 para usar directo en el mapa). */
export async function getFeaturesPage(
  layer: string,
  o: { start: number; count: number; sortBy?: string; desc?: boolean; cql?: string },
): Promise<{ features: GeoJsonFeature[]; total: number }> {
  const p = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: layer, outputFormat: 'application/json',
    srsName: 'EPSG:3857', count: String(o.count), startIndex: String(o.start),
  })
  if (o.sortBy) p.set('sortBy', `${o.sortBy} ${o.desc ? 'D' : 'A'}`)
  if (o.cql) p.set('cql_filter', o.cql)
  const res = await fetch(`${OWS}?${p}`)
  if (!res.ok) throw new Error(`WFS ${res.status}`)
  const j = await res.json()
  const n = Number(j.numberMatched ?? j.totalFeatures)
  return { features: j.features ?? [], total: Number.isFinite(n) ? n : (j.features?.length ?? 0) }
}

/** Filtro CQL "contiene" sobre todos los campos de texto. */
export function cqlContains(fields: LayerField[], text: string): string | undefined {
  const t = text.trim().replace(/'/g, "''")
  const cols = fields.filter((f) => /string/i.test(f.type))
  return t && cols.length ? cols.map((f) => `"${f.name}" ILIKE '%${t}%'`).join(' OR ') : undefined
}

export interface StyleOpts { fill: string; stroke: string; width: number; size: number; fillOpacity: number }
export const DEFAULT_STYLE: StyleOpts = { fill: '#3e6c51', stroke: '#1f3329', width: 1.5, size: 8, fillOpacity: 0.6 }

const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)

/** SLD 1.0 con un único símbolo, para pasar como SLD_BODY en WMS (estilo temporal, no se guarda en el servidor). */
export function buildSld(layer: string, geom: GeomKind, s: StyleOpts): string {
  const css = (n: string, v: string | number) => `<CssParameter name="${n}">${v}</CssParameter>`
  const stroke = `<Stroke>${css('stroke', s.stroke)}${css('stroke-width', s.width)}</Stroke>`
  const fill = `<Fill>${css('fill', s.fill)}${css('fill-opacity', s.fillOpacity)}</Fill>`
  const sym =
    geom === 'line'
      ? `<LineSymbolizer>${stroke}</LineSymbolizer>`
      : geom === 'point'
        ? `<PointSymbolizer><Graphic><Mark><WellKnownName>circle</WellKnownName>${fill}${stroke}</Mark><Size>${s.size}</Size></Graphic></PointSymbolizer>`
        : `<PolygonSymbolizer>${fill}${stroke}</PolygonSymbolizer>`
  return `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>${xml(layer)}</Name><UserStyle><FeatureTypeStyle><Rule>${sym}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`
}
