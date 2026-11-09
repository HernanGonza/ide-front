import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Circle, UserPlus } from 'lucide-react'
import { register, useSession } from '../lib/auth'
import { Flor } from '../ui/brand'
import Captcha from '../ui/Captcha'

// Reglas del front (GeoNode exige como mínimo 6 caracteres y rechaza contraseñas comunes o solo numéricas)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USER_RE = /^[\w.@+-]+$/
const passRules = (p: string, p2: string) => [
  { ok: p.length >= 8, label: 'Al menos 8 caracteres' },
  { ok: /\d/.test(p), label: 'Algún número' },
  { ok: /[A-ZÁÉÍÓÚÑÜ]/.test(p), label: 'Alguna mayúscula' },
  { ok: /[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü\s]/.test(p), label: 'Algún carácter especial' },
  { ok: p.length > 0 && p === p2, label: 'Las contraseñas coinciden' },
]

const COMMON = /(password|contrase|qwerty|asdf|12345|abcde|misiones|admin|letmein)/i
const LEVELS = [
  { label: 'Muy débil', color: 'bg-red-600', text: 'text-red-700' },
  { label: 'Débil', color: 'bg-orange-500', text: 'text-orange-700' },
  { label: 'Media', color: 'bg-amarillo', text: 'text-yellow-800' },
  { label: 'Fuerte', color: 'bg-verde-700', text: 'text-verde-700' },
  { label: 'Muy fuerte', color: 'bg-verde-900', text: 'text-verde-900' },
]
/** Nivel 0-4 según largo y variedad; las claves típicas o con un solo carácter repetido quedan bajas. */
function strength(p: string): number {
  if (!p) return 0
  let pts = 0
  if (p.length >= 8) pts++
  if (p.length >= 12) pts++
  if (p.length >= 16) pts++
  if (/[a-záéíóúñü]/.test(p) && /[A-ZÁÉÍÓÚÑÜ]/.test(p)) pts++
  if (/\d/.test(p)) pts++
  if (/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü\s]/.test(p)) pts++
  let lvl = pts <= 1 ? 0 : pts === 2 ? 1 : pts <= 4 ? 2 : pts === 5 ? 3 : 4
  if (new Set(p).size <= 2) lvl = 0
  else if (COMMON.test(p)) lvl = Math.min(lvl, 1)
  return lvl
}

function validate(f: { email: string; username: string; password1: string; password2: string }) {
  const e: Record<string, string[]> = {}
  const email = f.email.trim(), user = f.username.trim()
  if (!EMAIL_RE.test(email)) e.email = ['Ingresá un correo válido.']
  else if (email.length > 254) e.email = ['El correo es demasiado largo.']
  if (user.length < 3) e.username = ['El usuario debe tener al menos 3 caracteres.']
  else if (user.length > 30) e.username = ['El usuario puede tener hasta 30 caracteres.']
  else if (!USER_RE.test(user)) e.username = ['Solo letras, números y . @ + - _ (sin espacios).']
  const bad = passRules(f.password1, f.password2).slice(0, 4).find((r) => !r.ok)
  if (bad) e.password1 = [bad.label + '.']
  if (f.password2 !== f.password1) e.password2 = ['Las contraseñas no coinciden.']
  return e
}

const input = 'mt-1 w-full rounded-xl border border-border bg-beige/60 px-3 py-2.5 text-sm outline-none focus:border-verde-700 focus:bg-white'

export default function Registro() {
  const { user } = useSession()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [f, setF] = useState({ email: '', username: '', password1: '', password2: '', website: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [ck, setCk] = useState(0)

  if (user) return <Navigate to="/" replace />
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const nf = { ...f, [k]: e.target.value }
    setF(nf)
    // si el campo ya tenía error, se revalida mientras escribe
    if (errors[k]) setErrors((cur) => { const v = validate(nf)[k]; const { [k]: _, ...rest } = cur; return v ? { ...rest, [k]: v } : rest })
  }
  const blur = (k: 'email' | 'username' | 'password1' | 'password2') => () => {
    if (!f[k]) return
    const v = validate(f)[k]
    setErrors((cur) => { const { [k]: _, ...rest } = cur; return v ? { ...rest, [k]: v } : rest })
  }
  const rules = passRules(f.password1, f.password2)
  const lvl = strength(f.password1)
  const level = LEVELS[lvl]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(''); setErrors({})
    const v = validate(f)
    if (Object.keys(v).length) { setErrors(v); setBusy(false); return }
    try {
      const r = await register({ ...f, email: f.email.trim(), username: f.username.trim(), captcha: captcha! })
      if (!r.ok) { setErrors(r.errors ?? {}); setErr(r.error ?? ''); setCaptcha(null); setCk((k) => k + 1); return }
      qc.clear()
      nav(r.loggedIn ? '/' : '/ingresar', { replace: true })
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'No se pudo crear la cuenta')
      setCaptcha(null); setCk((k) => k + 1)
    } finally { setBusy(false) }
  }

  const field = (k: 'email' | 'username' | 'password1' | 'password2', label: string, type: string, auto: string) => (
    <label className="block text-sm font-medium text-verde-900">{label}
      <input type={type} value={f[k]} onChange={set(k)} onBlur={blur(k)} autoComplete={auto} required maxLength={k === 'email' ? 254 : k === 'username' ? 30 : undefined} className={input} aria-invalid={!!errors[k]} />
      {errors[k]?.map((m) => <span key={m} className="mt-1 block text-xs font-normal text-red-700">{m}</span>)}
    </label>
  )

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center p-4">
      <form onSubmit={submit} noValidate className="card w-full space-y-4 p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Flor className="h-14 w-14" />
          <h1 className="text-2xl font-bold tracking-tight text-verde-900">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">Registrate para guardar mapas y acceder a más funciones</p>
        </div>
        {field('email', 'Correo electrónico', 'email', 'email')}
        {field('username', 'Nombre de usuario', 'text', 'username')}
        {field('password1', 'Contraseña', 'password', 'new-password')}
        {(f.password1 || f.password2) && (
          <div className="-mt-2 space-y-3 rounded-xl bg-beige/50 p-3">
            {f.password1 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-verde-900">Seguridad de la contraseña</span>
                  <span className={`font-semibold ${level.text}`}>{level.label}</span>
                </div>
                <div className="flex gap-1" role="meter" aria-label="Seguridad de la contraseña" aria-valuemin={0} aria-valuemax={4} aria-valuenow={lvl} aria-valuetext={level.label}>
                  {LEVELS.map((_, i) => <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i <= lvl ? level.color : 'bg-border'}`} />)}
                </div>
              </div>
            )}
            <ul className="space-y-1.5 text-sm" aria-live="polite">
              {rules.map((r) => (
                <li key={r.label} className={`flex items-center gap-2 transition-colors ${r.ok ? 'font-medium text-verde-700' : 'text-verde-900/70'}`}>
                  {r.ok
                    ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-verde-700 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                    : <Circle className="h-5 w-5 shrink-0 text-verde-900/30" strokeWidth={1.5} />}
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {field('password2', 'Repetir contraseña', 'password', 'new-password')}
        {/* honeypot: invisible para personas */}
        <input name="website" value={f.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <Captcha onChange={setCaptcha} resetKey={ck} />
        {err && <p role="alert" className="rounded-xl bg-rosa/30 px-3 py-2 text-sm text-verde-900">{err}</p>}
        <button disabled={busy || !captcha} className="btn btn-primary w-full justify-center disabled:opacity-60"><UserPlus className="h-4 w-4" /> {busy ? 'Creando…' : 'Crear cuenta'}</button>
        <p className="text-center text-sm text-muted-foreground">¿Ya tenés cuenta? <Link to="/ingresar" className="font-medium text-verde-700 hover:underline">Ingresar</Link></p>
      </form>
    </div>
  )
}
