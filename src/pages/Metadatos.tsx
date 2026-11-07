import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExternalLink, FileCode2, Search } from 'lucide-react'
import { searchCsw, isoMetadataUrl } from '../lib/ogc'
import { API } from '../lib/config'
import Page, { PageTitle } from '../ui/Page'
import Reveal from '../ui/Reveal'

/** Resuelve uuid → pk de la ficha /capa/:pk (null si no hay capa con ese uuid). */
async function pkByUuid(uuid: string): Promise<number | string | null> {
  try {
    const r = await fetch(`${API}/datasets?filter{uuid}=${encodeURIComponent(uuid)}&page_size=1`, { headers: { Accept: 'application/json' } })
    const j = await r.json()
    return j.datasets?.[0]?.pk ?? null
  } catch {
    return null
  }
}

function Ficha({ id }: { id: string }) {
  const { data: pk } = useQuery({ queryKey: ['pk-uuid', id], queryFn: () => pkByUuid(id), staleTime: Infinity })
  return pk ? <Link to={`/capa/${pk}`} className="btn btn-primary py-1.5 text-xs">Ver ficha de la capa</Link> : null
}

export default function Metadatos() {
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const res = useQuery({ queryKey: ['csw', term], queryFn: () => searchCsw(term) })

  return (
    <Page narrow>
      <PageTitle title="Metadatos" subtitle="Buscá en el catálogo de metadatos (CSW) y accedé a la ficha ISO 19139." />
      <form onSubmit={(e) => { e.preventDefault(); setTerm(input) }} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Buscar en título, resumen, palabras clave…"
          className="w-full rounded-full border border-border bg-white py-3 pl-11 pr-28 text-sm outline-none focus:border-verde-700 focus:shadow-[0_0_0_3px_rgb(62_108_81/0.15)]" />
        <button className="btn btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 py-1.5">Buscar</button>
      </form>

      {res.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>}
      {res.isError && <p className="text-sm text-rosa-fuerte">No se pudo consultar el servicio CSW.</p>}
      {res.data && <p className="mb-3 text-sm text-muted-foreground">{res.data.length} resultado{res.data.length === 1 ? '' : 's'}{term && <> para <b className="text-verde-900">“{term}”</b></>}</p>}
      <div className="space-y-3">
        {res.data?.map((r, i) => (
          <Reveal key={r.id} i={i} className="card p-5">
            <h3 className="font-semibold text-verde-900">{r.title || r.id}</h3>
            {r.abstract && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{r.abstract}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={isoMetadataUrl(r.id)} target="_blank" rel="noreferrer" className="btn btn-ghost py-1.5 text-xs"><FileCode2 className="h-3.5 w-3.5" /> ISO 19139 <ExternalLink className="h-3 w-3" /></a>
              <Ficha id={r.id} />
            </div>
          </Reveal>
        ))}
      </div>
    </Page>
  )
}
