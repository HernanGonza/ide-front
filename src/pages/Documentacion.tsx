import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Page, { PageTitle } from '../ui/Page'
import Reveal from '../ui/Reveal'

const TODO = '[Completar]'

const FAQ = [
  { q: '¿Cómo descargo una capa?', a: `${TODO} Pasos para descargar desde la ficha de cada capa.` },
  { q: '¿Qué sistema de referencia usan los datos?', a: `${TODO} Indicar el sistema de referencia oficial.` },
  { q: '¿Cómo cito la información?', a: `${TODO} Fórmula de citado y licencia.` },
]

function Section({ id, title, children, i }: { id?: string; title: string; children: React.ReactNode; i: number }) {
  return (
    <Reveal i={i} className="card scroll-mt-6 p-6">
      <h2 id={id} className="mb-2 scroll-mt-6 text-lg font-bold text-verde-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </Reveal>
  )
}

export default function Documentacion() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Page narrow>
      <PageTitle title="Documentación" subtitle="Guías y recursos para usar la IDE Misiones." />
      <div className="space-y-4">
        <Section i={0} title="Guía de uso del visor"><p>{TODO} Cómo agregar capas, consultar atributos, medir y compartir una vista.</p></Section>
        <Section i={1} title="Cómo consumir servicios en QGIS"><p>{TODO} Paso a paso para conectar WMS/WFS. Las URLs están en <Link className="font-semibold text-verde-700 underline" to="/geoservicios">Geoservicios</Link>.</p></Section>
        <Section i={2} title="Catálogo de objetos"><p>{TODO} Listado y descripción de los objetos geográficos.</p></Section>
        <Section i={3} id="faq" title="Preguntas frecuentes">
          {FAQ.map((f, k) => (
            <div key={f.q} className="border-b border-border last:border-0">
              <button onClick={() => setOpen(open === k ? null : k)} className="flex w-full items-center justify-between py-3 text-left font-semibold text-verde-900">
                {f.q} <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === k ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {open === k && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-3 text-muted-foreground">{f.a}</motion.p>}
              </AnimatePresence>
            </div>
          ))}
        </Section>
      </div>
    </Page>
  )
}
