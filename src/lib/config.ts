// Todo es same-origin: en producción el Nginx de GeoNode sirve front y back bajo el mismo dominio;
// en desarrollo, Vite proxea. Por eso las rutas son relativas.
export const API = '/api/v2'
export const GEOSERVER = '/geoserver'
export const OWS = `${GEOSERVER}/ows`
export const CSW = '/catalogue/csw'

/** Origen público, para mostrar URLs completas de servicios (para copiar en QGIS, etc.). */
export const PUBLIC_ORIGIN =
  import.meta.env.VITE_PUBLIC_ORIGIN || 'https://ide.ordenamientoterritorial.misiones.gob.ar'

/** Centro y zoom inicial: Misiones */
export const MISIONES_CENTER: [number, number] = [-54.65, -26.9]
export const MISIONES_ZOOM = 7.6

/** Tarjeta "Descargas este mes": todavía no hay fuente de datos → oculta. */
export const SHOW_DOWNLOAD_STATS = false

/** Capas iniciales del mapa de inicio: alternates separados por coma (VITE_HOME_LAYERS). */
export const HOME_LAYERS: string[] = (import.meta.env.VITE_HOME_LAYERS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)
