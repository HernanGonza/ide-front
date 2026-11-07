// Todo es same-origin: en producción el nginx del contenedor proxea /api, /geoserver, /catalogue y /uploaded
// hacia la IDE; en desarrollo, Vite. Si el front cuelga de un prefijo (ej. /ide/), las rutas lo incluyen.
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
export const API = `${BASE}/api/v2`
export const GEOSERVER = `${BASE}/geoserver`
export const OWS = `${GEOSERVER}/ows`
export const CSW = `${BASE}/catalogue/csw`

/** Servidor GeoNode (para ingresar a la gestión). */
export const GEONODE_ORIGIN = import.meta.env.VITE_GEONODE_ORIGIN || 'https://ide.ordenamientoterritorial.misiones.gob.ar'

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
