import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listCategories, listDatasets } from '../lib/geonode'
import DatasetCard from '../components/DatasetCard'
import Page, { PageTitle } from '../ui/Page'
import Reveal from '../ui/Reveal'

const PAGE = 12

export default function Catalogo() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const cat = sp.get('cat') ?? ''
  const sort = sp.get('orden') ?? '-date'
  const page = Number(sp.get('p') ?? 1)

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    v ? n.set(k, v) : n.delete(k)
    if (k !== 'p') n.delete('p')
    setSp(n)
  }

  const cats = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const res = useQuery({
    queryKey: ['datasets', q, cat, sort, page],
    queryFn: () => listDatasets({ search: q, category: cat, sort, page, pageSize: PAGE }),
    placeholderData: keepPreviousData,
  })
  const pages = res.data ? Math.max(1, Math.ceil(res.data.total / PAGE)) : 1

  return (
    <Page>
    <PageTitle title="Catálogo de datos" subtitle="Explorá, filtrá y descargá las capas publicadas." />
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-64">
        <input
          defaultValue={q}
          key={q}
          onKeyDown={(e) => e.key === 'Enter' && set('q', (e.target as HTMLInputElement).value)}
          placeholder="Buscar en el catálogo…"
          className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-verde-700 focus:shadow-[0_0_0_3px_rgb(62_108_81/0.15)]"
        />
        <div className="card p-3">
          <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Categorías</div>
          <button onClick={() => set('cat', '')} className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${!cat ? 'bg-verde-700 text-white' : 'hover:bg-beige'}`}>Todas</button>
          {cats.data?.filter((c) => c.count !== 0).map((c) => (
            <button key={c.identifier} onClick={() => set('cat', c.identifier)} className={`flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-sm ${cat === c.identifier ? 'bg-verde-700 text-white' : 'hover:bg-beige'}`}>
              <span>{c.gn_description || c.identifier}</span>
              {typeof c.count === 'number' && <span className="text-muted-foreground">{c.count}</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {res.data ? `${res.data.total} resultados` : 'Cargando…'}
            {q && <> para <b className="text-verde-900">“{q}”</b></>}
          </div>
          <select value={sort} onChange={(e) => set('orden', e.target.value)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm">
            <option value="-date">Más recientes</option>
            <option value="-last_updated">Última actualización</option>
            <option value="title">Título A–Z</option>
            <option value="-popular_count">Más vistas</option>
          </select>
        </div>
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${res.isFetching ? 'opacity-60' : ''}`}>
          {res.isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-64" />)}
          {res.data?.items.map((d, i) => <Reveal key={d.pk} i={i % 6}><DatasetCard d={d} /></Reveal>)}
        </div>
        {res.isError && <p className="text-sm text-rosa-fuerte">Error consultando el catálogo.</p>}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => set('p', String(page - 1))} className="btn btn-ghost disabled:opacity-40">Anterior</button>
            <span className="px-2 text-muted-foreground">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => set('p', String(page + 1))} className="btn btn-ghost disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </section>
    </div>
    </Page>
  )
}
