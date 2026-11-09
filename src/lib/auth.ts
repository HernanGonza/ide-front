// Sesión propia contra GeoNode (OAuth2, grant "password"). GeoNode es solo el back:
// el usuario nunca ve su pantalla de login. El token se guarda en localStorage.
import { useSyncExternalStore } from 'react'
import { API, BASE, OAUTH_CLIENT_ID, OAUTH_REVOKE_URL, OAUTH_TOKEN_URL } from './config'

export interface SessionUser {
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

interface Stored {
  access: string
  refresh?: string
  expires: number // ms epoch
  user: SessionUser
}

const KEY = 'ide-session'
let state: Stored | null = read()
const listeners = new Set<() => void>()

function read(): Stored | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
function write(s: Stored | null) {
  state = s
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY) } catch { /* sin storage */ }
  listeners.forEach((l) => l())
}
// Sincroniza entre pestañas
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) { state = read(); listeners.forEach((l) => l()) } })

export function authHeaders(): Record<string, string> {
  return state ? { Authorization: `Bearer ${state.access}` } : {}
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: OAUTH_CLIENT_ID, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

/** Renueva el token con el refresh_token. false si no se pudo (la sesión se cierra). */
let refreshing: Promise<boolean> | null = null
export function refreshSession(): Promise<boolean> {
  if (!state?.refresh) return Promise.resolve(false)
  refreshing ??= (async () => {
    const cur = state!
    const { ok, data } = await tokenRequest({ grant_type: 'refresh_token', refresh_token: cur.refresh! })
    if (!ok) { write(null); return false }
    write({ ...cur, access: data.access_token, refresh: data.refresh_token ?? cur.refresh, expires: Date.now() + data.expires_in * 1000 })
    return true
  })().finally(() => { refreshing = null })
  return refreshing
}

export async function login(username: string, password: string): Promise<void> {
  if (!OAUTH_CLIENT_ID) throw new Error('Falta configurar VITE_OAUTH_CLIENT_ID')
  const { ok, data } = await tokenRequest({ grant_type: 'password', username, password })
  if (!ok) throw new Error(data.error === 'invalid_grant' ? 'Usuario o contraseña incorrectos' : 'No se pudo iniciar sesión')
  const access = data.access_token as string
  const r = await fetch(`${API}/users/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${access}` } })
  if (!r.ok) throw new Error('No se pudo leer el perfil del usuario')
  const j = await r.json()
  const user: SessionUser = j.user ?? j
  write({ access, refresh: data.refresh_token, expires: Date.now() + data.expires_in * 1000, user })
}

export interface RegisterResult { ok: boolean; errors?: Record<string, string[]>; error?: string }

/** Crea la cuenta (servicio ide-auth → formulario de alta de GeoNode). */
export async function register(data: Record<string, string>): Promise<RegisterResult> {
  const res = await fetch(`${BASE}/registro-api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const j = await res.json().catch(() => ({}))
  return res.ok ? { ok: true } : { ok: false, errors: j.errors, error: j.error ?? (j.errors ? '' : 'No se pudo crear la cuenta') }
}

export async function logout(): Promise<void> {
  const cur = state
  write(null)
  if (cur) {
    try {
      await fetch(OAUTH_REVOKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: OAUTH_CLIENT_ID, token: cur.access }) })
    } catch { /* ya está cerrada acá */ }
  }
}

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }

export function useSession(): { user: SessionUser | null } {
  const s = useSyncExternalStore(subscribe, () => state)
  return { user: s?.user ?? null }
}
