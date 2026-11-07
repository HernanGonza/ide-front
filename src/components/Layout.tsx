import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, ChevronLeft, ChevronRight, Building2, CircleHelp, Cloud, FileText, Layers, LogIn, MapPin, Map as MapIcon, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { GEONODE_ORIGIN } from '../lib/config'
import Logo from '../ui/Logo'
import { Flor, PatronFlores } from '../ui/brand'

const NAV = [
  { to: '/', label: 'Inicio', icon: MapIcon, end: true },
  { to: '/visor', label: 'Visor geográfico', icon: MapPin },
  { to: '/catalogo', label: 'Catálogo de datos', icon: Layers },
  { to: '/metadatos', label: 'Metadatos', icon: FileText },
  { to: '/geoservicios', label: 'Geoservicios', icon: Cloud },
  { to: '/documentacion', label: 'Documentación', icon: BookOpen },
  { to: '/organismos', label: 'Organismos', icon: Building2 },
]

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-verde-900 text-white/80">
      <PatronFlores className="absolute -bottom-6 -left-10 h-56 w-80 text-white/[0.05]" />
      <div className={`relative pb-6 pt-6 ${collapsed ? 'px-3' : 'px-5'}`}>
        <Link to="/" onClick={onNavigate} title="IDE Misiones"><Logo compact={collapsed} /></Link>
      </div>
      <nav className="relative flex-1 space-y-1 px-3" aria-label="Principal">
        {NAV.map((n, i) => (
          <motion.div key={n.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }}>
            <NavLink
              to={n.to}
              end={n.end}
              onClick={onNavigate}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-verde-700 text-white' : 'hover:bg-white/10 hover:text-white'}`
              }
            >
              <n.icon className="h-5 w-5 shrink-0" strokeWidth={1.8} /> {!collapsed && <span className="truncate">{n.label}</span>}
            </NavLink>
          </motion.div>
        ))}
      </nav>
      <div className={`relative mb-5 border-t border-white/15 pt-5 ${collapsed ? 'mx-3' : 'mx-5'}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <Flor className="h-9 w-9 shrink-0 drop-shadow" />
          {!collapsed && <div className="leading-tight"><div className="text-[1.05rem] font-medium tracking-wide text-white">ECOLOGÍA</div><div className="text-[0.6rem] font-semibold tracking-[0.32em] text-white/80">MISIONES</div></div>}
        </div>
        {!collapsed && <p className="mt-3 text-xs leading-snug text-white/70">Ordenamiento Territorial<br />para un desarrollo sostenible</p>}
      </div>
    </div>
  )
}

export default function Layout() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ide-sidebar') === '1' } catch { return false }
  })
  const toggle = () => setCollapsed((c) => {
    try { localStorage.setItem('ide-sidebar', c ? '0' : '1') } catch { /* sin storage */ }
    return !c
  })
  // Ctrl+B, como en la wiki
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggle() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const nav = useNavigate()
  const { pathname, hash } = useLocation()
  const fullBleed = pathname.startsWith('/visor')

  useEffect(() => setOpen(false), [pathname])
  // main es el contenedor con scroll: anclas (#faq, #contacto) y scroll al tope
  useEffect(() => {
    const t = setTimeout(() => {
      const el = hash ? document.getElementById(hash.slice(1)) : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else document.querySelector('main')?.scrollTo({ top: 0 })
    }, 60)
    return () => clearTimeout(t)
  }, [pathname, hash])

  return (
    <div className="flex h-full">
      <motion.aside className="relative z-20 hidden shrink-0 md:block" initial={false} animate={{ width: collapsed ? 76 : 256 }} transition={{ type: 'spring', stiffness: 400, damping: 40 }}><SidebarContent collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú (Ctrl+B)' : 'Colapsar menú (Ctrl+B)'}
          className="absolute -right-3.5 top-[5.5rem] grid h-7 w-7 place-items-center rounded-full border border-border bg-white text-verde-900 shadow-md transition hover:scale-110 hover:bg-beige"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </motion.aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
              <SidebarContent onNavigate={() => setOpen(false)} />
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute right-3 top-4 rounded-full p-1.5 text-white/80 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 md:px-6">
          <button onClick={toggle} aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} title="Colapsar menú (Ctrl+B)" className="hidden rounded-full p-2 text-verde-900 hover:bg-muted md:block">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
          <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-full p-2 text-verde-900 hover:bg-muted md:hidden"><Menu className="h-5 w-5" /></button>
          <form
            className="relative min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              nav(`/catalogo?q=${encodeURIComponent(q)}`)
            }}
          >
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar capas, mapas o lugares…"
              className="w-full rounded-full border border-border bg-beige/60 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-verde-700 focus:bg-white focus:shadow-[0_0_0_3px_rgb(62_108_81/0.15)]"
            />
          </form>
          <Link to="/documentacion" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-verde-900 hover:bg-muted sm:flex"><CircleHelp className="h-[18px] w-[18px]" /> Ayuda</Link>
          <a href={`${GEONODE_ORIGIN}/account/login/`} className="btn btn-primary shrink-0"><LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Ingresar</span></a>
        </header>

        <main className={fullBleed ? 'relative min-h-0 flex-1' : 'min-h-0 flex-1 overflow-y-auto'}>
          {fullBleed ? (
            <Outlet />
          ) : (
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
