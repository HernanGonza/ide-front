import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { bboxOf, getDataset, plainAbstract } from '../lib/geonode'
import { isoMetadataUrl, legendUrl, wcsDownload, wfsDownloads } from '../lib/ogc'
import { OWS, PUBLIC_ORIGIN } from '../lib/config'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import Page from '../ui/Page'

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v) return null
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="col-span-2 break-words text-foreground">{v}</dd>
    </div>
  )
}

export default function Capa() {
  const { pk = '' } = useParams()
  const nav = useNavigate()
  const { data: d, isLoading, isError } = useQuery({ queryKey: ['dataset', pk], queryFn: () => getDataset(pk) })

  if (isLoading) return <Page><div className="skeleton h-96" /></Page>
  if (isError || !d) return <Page><p className="text-rosa-fuerte">No se encontró la capa.</p></Page>

  const isRaster = d.subtype === 'raster'
  const downloads = isRaster ? [wcsDownload(d.alternate)] : wfsDownloads(d.alternate)
  const fecha = d.date ? new Date(d.date).toLocaleDateString('es-AR') : undefined

  return (
    <Page className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <Link to="/catalogo" className="hover:underline">Catálogo</Link> / {d.category?.gn_description ?? 'Capa'}
      </div>
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-verde-900 md:text-3xl">{d.title}</h1>
          <div className="mt-2 font-mono text-xs text-muted-foreground">{d.alternate}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/visor?capas=${encodeURIComponent(d.alternate)}`} className="btn btn-primary">Abrir en visor</Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MapView className="card h-[420px] overflow-hidden" layers={[{ name: d.alternate, visible: true, opacity: 1 }]} fitExtent={bboxOf(d)} basemap="gris" showCoords tools={{ onPrint: () => nav(`/visor?capas=${encodeURIComponent(d.alternate)}`) }} /> {/* TODO: imprimir */}
          <section className="card p-5">
            <h2 className="mb-2 font-bold text-verde-900">Descripción</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{plainAbstract(d) || 'Sin resumen.'}</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-2 font-bold text-verde-900">Metadatos</h2>
            <dl>
              <Row k="Categoría" v={d.category?.gn_description} />
              <Row k="Tipo" v={isRaster ? 'Ráster' : 'Vectorial'} />
              <Row k="Fecha" v={fecha} />
              <Row k="Sistema de referencia" v={d.srid} />
              <Row k="Palabras clave" v={d.keywords?.length ? d.keywords.map((k) => k.name).join(', ') : undefined} />
              <Row k="Atribución" v={d.attribution} />
              <Row k="Licencia" v={d.license?.name || d.license?.identifier} />
              <Row k="Restricciones" v={d.constraints_other} />
            </dl>
            {d.uuid && <a href={isoMetadataUrl(d.uuid)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-verde-700 hover:underline">Metadato ISO 19139 (XML) ↗</a>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-verde-900">Leyenda</h2>
            <img src={legendUrl(d.alternate)} alt={`Leyenda de ${d.title}`} className="max-w-full" />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-verde-900">Descargas</h2>
            <div className="space-y-2">
              {downloads.map((x) => (
                <a key={x.key} href={x.url} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-verde-700 hover:bg-beige">
                  {x.label} <span className="text-muted-foreground">↓</span>
                </a>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-verde-900">Usar en QGIS / otro SIG</h2>
            <p className="mb-2 text-xs text-muted-foreground">URL del servicio y nombre de capa:</p>
            <code className="block break-all rounded-lg bg-muted p-2 text-xs">{PUBLIC_ORIGIN}{OWS}</code>
            <code className="mt-2 block break-all rounded-lg bg-muted p-2 text-xs">{d.alternate}</code>
          </section>
        </aside>
      </div>
    </Page>
  )
}
