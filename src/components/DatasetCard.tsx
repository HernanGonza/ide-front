import { Link } from 'react-router-dom'
import { plainAbstract, type Dataset } from '../lib/geonode'

export default function DatasetCard({ d }: { d: Dataset }) {
  return (
    <Link to={`/capa/${d.pk}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        {d.thumbnail_url ? (
          <img src={d.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">Sin vista previa</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex gap-1.5">
          {d.category && <span className="chip chip-brand">{d.category.gn_description || d.category.identifier}</span>}
          {d.subtype && <span className="chip">{d.subtype === 'raster' ? 'Ráster' : 'Vectorial'}</span>}
        </div>
        <h3 className="line-clamp-2 font-medium text-verde-900">{d.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{plainAbstract(d)}</p>
      </div>
    </Link>
  )
}
