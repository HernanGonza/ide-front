import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { listGroups } from '../lib/geonode'
import Page, { PageTitle } from '../ui/Page'
import Reveal from '../ui/Reveal'

export default function Organismos() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['groups'], queryFn: listGroups })
  return (
    <Page>
      <PageTitle title="Organismos" subtitle="Instituciones que producen y publican información en la IDE." />
      {isError && <p className="text-sm text-rosa-fuerte">No se pudo obtener el listado de organismos.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}
        {data?.items.map((g, i) => {
          const logo = g.logo_url || g.logo
          const count = g.resource_counts
          return (
            <Reveal key={String(g.pk ?? g.slug ?? i)} i={i} className="card card-hover flex gap-4 p-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-verde-200/50 text-verde-700">
                {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <Building2 className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-verde-900">{g.title || g.name}</h3>
                {g.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>}
                {typeof count === 'number' && <span className="chip chip-brand mt-2">{count} recurso{count === 1 ? '' : 's'}</span>}
              </div>
            </Reveal>
          )
        })}
      </div>
      {data && data.items.length === 0 && <p className="text-muted-foreground">No hay organismos publicados.</p>}
    </Page>
  )
}
