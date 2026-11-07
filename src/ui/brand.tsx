import { useId } from 'react'

/** Flor del Lapacho (Brandbook 2024): 5 pétalos con degradé rosa. */
export function Flor({ className, mono = false }: { className?: string; mono?: boolean }) {
  const id = useId().replace(/:/g, '')
  const petal = 'M50 50 C37 41 28 22 36 11 C41 5 47 8 50 12 C53 8 59 5 64 11 C72 22 63 41 50 50Z'
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="55%">
          <stop offset="0" stopColor="#C9346C" />
          <stop offset="0.55" stopColor="#E9709A" />
          <stop offset="1" stopColor="#F5A5BF" />
        </radialGradient>
      </defs>
      {[0, 72, 144, 216, 288].map((r) => (
        <g key={r} transform={`rotate(${r} 50 50)`}>
          <path d={petal} fill={mono ? 'currentColor' : `url(#g${id})`} />
          {!mono && <path d="M50 46 L50 15 M47 44 L41 20 M53 44 L59 20" stroke="#fff" strokeOpacity="0.38" strokeWidth="0.9" strokeLinecap="round" fill="none" />}
        </g>
      ))}
      <circle cx="50" cy="50" r="5.2" fill={mono ? 'currentColor' : '#fff'} />
    </svg>
  )
}

/** Patrón de flores del Key Visual, con desvanecido. Usa currentColor. */
export function PatronFlores({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div className={`pointer-events-none select-none ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 700 330" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
        <defs>
          <linearGradient id={`f${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.65" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id={`m${id}`}><rect width="700" height="330" fill={`url(#f${id})`} /></mask>
          <symbol id={`s${id}`} viewBox="0 0 100 100">
            {[0, 72, 144, 216, 288].map((r) => (
              <path key={r} transform={`rotate(${r} 50 50)`} d="M50 50 C37 41 28 22 36 11 C41 5 47 8 50 12 C53 8 59 5 64 11 C72 22 63 41 50 50Z" />
            ))}
          </symbol>
        </defs>
        <g mask={`url(#m${id})`} fill="currentColor">
          {Array.from({ length: 7 }).flatMap((_, y) =>
            Array.from({ length: 14 }).map((__, x) => <use key={`${x}-${y}`} href={`#s${id}`} x={x * 50 + (y % 2 ? 25 : 0)} y={y * 46} width="40" height="40" />),
          )}
        </g>
      </svg>
    </div>
  )
}
