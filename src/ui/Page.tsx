import type { ReactNode } from 'react'

export default function Page({ children, narrow, className = '' }: { children: ReactNode; narrow?: boolean; className?: string }) {
  return <div className={`mx-auto w-full ${narrow ? 'max-w-4xl' : 'max-w-7xl'} p-4 md:p-8 ${className}`}>{children}</div>
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 flex gap-3">
      <span className="w-1.5 shrink-0 rounded-full bg-verde-700" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-verde-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  )
}
