import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { SERVICES } from '../lib/ogc'
import Page, { PageTitle } from '../ui/Page'
import Reveal from '../ui/Reveal'

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500) })}
      className="btn btn-ghost shrink-0 py-1.5 text-xs"
    >
      {ok ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
    </button>
  )
}

export default function Geoservicios() {
  return (
    <Page narrow>
      <PageTitle title="Geoservicios" subtitle="Servicios estándar OGC para consumir la información desde cualquier SIG o aplicación." />
      <div className="space-y-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.id} i={i} className="card p-5">
            <div className="flex items-baseline gap-3">
              <span className="rounded-md bg-verde-700 px-2 py-0.5 font-mono text-xs font-semibold text-white">{s.id}</span>
              <span className="font-semibold text-verde-900">{s.name}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{s.url}</code>
              <CopyBtn text={s.url} />
            </div>
          </Reveal>
        ))}
      </div>
      <section className="card mt-6 p-5 text-sm leading-relaxed">
        <h2 className="mb-2 font-bold text-verde-900">Cómo agregar en QGIS</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Capa → Administrador de fuentes de datos → WMS/WMTS (o WFS).</li>
          <li>Nueva conexión: pegá la URL del servicio sin parámetros (hasta <code>/ows</code>).</li>
          <li>Conectar, elegir la capa y Añadir.</li>
        </ol>
      </section>
    </Page>
  )
}
