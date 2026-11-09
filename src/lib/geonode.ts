// Cliente mínimo de la API REST v2 de GeoNode 4.3.x
import { API } from './config'
import { authHeaders, refreshSession } from './auth'

export interface Link {
  extension?: string
  link_type?: string
  name?: string
  mime?: string
  url: string
}

export interface Category {
  identifier: string
  gn_description?: string
  description?: string
  fa_class?: string
  count?: number
}

export interface Dataset {
  pk: number | string
  uuid?: string
  title: string
  abstract?: string
  raw_abstract?: string
  alternate: string // workspace:capa → nombre en GeoServer
  subtype?: 'vector' | 'raster' | 'remote' | string
  thumbnail_url?: string | null
  category?: Category | null
  keywords?: { name: string; slug: string }[]
  date?: string
  last_updated?: string
  srid?: string
  ll_bbox_polygon?: { type: 'Polygon'; coordinates: number[][][] }
  detail_url?: string
  owner?: { username: string; first_name?: string; last_name?: string }
  poc?: unknown
  attribution?: string | null
  constraints_other?: string | null
  license?: { identifier?: string; name?: string } | null
  links?: Link[]
}

export interface Paged<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([k, v]) => v !== undefined && v !== '' && qs.append(k, String(v)))
  const url = `${API}${path}${qs.size ? `?${qs}` : ''}`
  const doFetch = () => fetch(url, { headers: { Accept: 'application/json', ...authHeaders() } })
  let res = await doFetch()
  if (res.status === 401 && (await refreshSession())) res = await doFetch()
  if (!res.ok) throw new Error(`GeoNode ${res.status} en ${path}`)
  return res.json()
}

export interface DatasetQuery {
  search?: string
  category?: string
  page?: number
  pageSize?: number
  sort?: string // ej: '-date', 'title'
}

export async function listDatasets(q: DatasetQuery = {}): Promise<Paged<Dataset>> {
  const r = await get<{ total: number; page: number; page_size: number; datasets: Dataset[] }>('/datasets', {
    search: q.search,
    'filter{category.identifier}': q.category,
    page: q.page ?? 1,
    page_size: q.pageSize ?? 12,
    'sort[]': q.sort ?? '-date',
  })
  return { total: r.total, page: r.page, page_size: r.page_size, items: r.datasets }
}

export async function getDataset(pk: string | number): Promise<Dataset> {
  const r = await get<{ dataset: Dataset }>(`/datasets/${pk}`)
  return r.dataset
}

export async function listCategories(): Promise<Category[]> {
  const r = await get<{ categories: Category[] }>('/categories', { page_size: 100 })
  return r.categories
}

/** Totales para tarjetas del inicio (page_size=1 → solo interesa `total`). */
export async function countResource(kind: 'datasets' | 'maps' | 'documents'): Promise<number> {
  const r = await get<{ total: number }>(`/${kind}`, { page_size: 1 })
  return r.total
}

/** Extent [minx, miny, maxx, maxy] en EPSG:4326 a partir del ll_bbox_polygon. */
export function bboxOf(d: Dataset): [number, number, number, number] | null {
  const ring = d.ll_bbox_polygon?.coordinates?.[0]
  if (!ring?.length) return null
  const xs = ring.map((c) => c[0])
  const ys = ring.map((c) => c[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

export function plainAbstract(d: Dataset): string {
  const html = d.raw_abstract || d.abstract || ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').trim()
}

// ───────── Agregados para el rediseño ─────────

export interface Group {
  pk?: number | string
  name?: string
  title: string
  slug?: string
  description?: string
  logo?: string | null
  logo_url?: string | null
  email?: string | null
  resource_counts?: number
  [k: string]: unknown
}

/** Grupos (organismos) de GeoNode. */
export async function listGroups(): Promise<{ total: number; items: Group[] }> {
  const r = await get<{ total: number; group_profiles?: Group[]; groups?: Group[] }>('/groups', { page_size: 100 })
  return { total: r.total, items: r.group_profiles ?? r.groups ?? [] }
}

/** Resuelve títulos de capas a partir de sus alternates (workspace:capa). */
export async function getDatasetsByAlternate(alternates: string[]): Promise<Dataset[]> {
  const out = await Promise.all(
    alternates.map(async (alt) => {
      try {
        const r = await get<{ datasets: Dataset[] }>('/datasets', { 'filter{alternate}': alt, page_size: 1 })
        return r.datasets[0]
      } catch {
        return undefined
      }
    }),
  )
  return out.filter((d): d is Dataset => !!d)
}
