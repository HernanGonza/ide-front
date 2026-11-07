import Page, { PageTitle } from '../ui/Page'
// Contenido institucional requerido por IDERA para geoportales.
// TODO: completar textos reales (organismo, responsables, contacto, normativa).
export default function Institucional() {
  return (
    <Page narrow className="space-y-6">
      <PageTitle title="Institucional" subtitle="IDE de la Provincia de Misiones" />

      <section className="card p-6">
        <h2 className="mb-2 font-bold text-verde-900">Organismo responsable</h2>
        <p className="text-sm ">
          Subsecretaría de Ordenamiento Territorial — Ministerio de Ecología y Recursos Naturales Renovables, Provincia de Misiones.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-2 font-bold text-verde-900">Adhesión a IDERA</h2>
        <p className="text-sm ">
          La IDE Misiones es nodo de la Infraestructura de Datos Espaciales de la República Argentina (IDERA) y publica su información
          mediante servicios estándar OGC (WMS, WFS, WCS, WMTS, CSW).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn btn-ghost" href="https://www.idera.gob.ar" target="_blank" rel="noreferrer">IDERA ↗</a>
          {/* TODO: agregar enlace a la página de nodos de IDERA */}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-2 font-bold text-verde-900">Organismos productores de datos</h2>
        <p className="text-sm text-muted-foreground">[Completar listado de organismos provinciales que aportan información]</p>
      </section>

      <section id="contacto" className="card scroll-mt-6 p-6">
        <h2 className="mb-2 font-bold text-verde-900">Contacto</h2>
        <p className="text-sm text-muted-foreground">[Completar: correo, teléfono, dirección]</p>
      </section>

      <section className="card p-6">
        <h2 className="mb-2 font-bold text-verde-900">Documentación técnica</h2>
        <p className="text-sm text-muted-foreground">[Catálogo de objetos, perfil de metadatos, guías para desarrolladores]</p>
      </section>
    </Page>
  )
}
