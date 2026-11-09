import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import { login, useSession } from '../lib/auth'
import { Flor } from '../ui/brand'

export default function Ingresar() {
  const { user } = useSession()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await login(u.trim(), p)
      qc.clear() // los datos cambian según permisos (capas privadas)
      nav('/', { replace: true })
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Error al iniciar sesión')
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center p-4">
      <form onSubmit={submit} className="card w-full space-y-4 p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Flor className="h-14 w-14" />
          <h1 className="text-2xl font-bold tracking-tight text-verde-900">Ingresar</h1>
          <p className="text-sm text-muted-foreground">Accedé con tu usuario de la IDE Misiones</p>
        </div>
        <label className="block text-sm font-medium text-verde-900">Usuario o correo
          <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required autoFocus className="mt-1 w-full rounded-xl border border-border bg-beige/60 px-3 py-2.5 text-sm outline-none focus:border-verde-700 focus:bg-white" />
        </label>
        <label className="block text-sm font-medium text-verde-900">Contraseña
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded-xl border border-border bg-beige/60 px-3 py-2.5 text-sm outline-none focus:border-verde-700 focus:bg-white" />
        </label>
        {err && <p role="alert" className="rounded-xl bg-rosa/30 px-3 py-2 text-sm text-verde-900">{err}</p>}
        <button disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60"><LogIn className="h-4 w-4" /> {busy ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="text-center text-sm text-muted-foreground">¿No tenés cuenta? <Link to="/registro" className="font-medium text-verde-700 hover:underline">Crear cuenta</Link></p>
      </form>
    </div>
  )
}
