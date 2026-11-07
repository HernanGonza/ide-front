import { Flor } from './brand'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'justify-center' : ''}`}>
      <Flor className={compact ? 'h-10 w-10 shrink-0' : 'h-12 w-12 shrink-0'} />
      {!compact && (
        <div className="leading-tight text-white">
          <div className="text-xl font-bold tracking-tight">IDE<br />Misiones</div>
          <div className="mt-1 text-[10px] leading-snug text-white/70">Infraestructura de Datos<br />Espaciales</div>
        </div>
      )}
    </div>
  )
}
