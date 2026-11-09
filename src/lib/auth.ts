// Sesión propia contra GeoNode (OAuth2, grant "password"). GeoNode es solo el back:
// el usuario nunca ve su pantalla de login. El token se guarda en localStorage.
import { useSyncExternalStore } from 'react'
import { API, AUTH_API } from './config'

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

/** Todo pasa por ide-auth (captcha, límites de intentos); el navegador no habla directo con /o/token/. */
async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${AUTH_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
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

/** GeoNode 4.3 no tiene /users/me: se busca al usuario por nombre o correo. Si falla, la sesión igual se abre. */
async function fetchUser(access: string, typed: string): Promise<SessionUser> {
  const key = typed.includes('@') ? 'filter{email}' : 'filter{username}'
  try {
    const r = await fetch(`${API}/users?${new URLSearchParams({ [key]: typed, page_size: '1' })}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${access}` },
    })
    if (r.ok) {
      const u = (await r.json()).users?.[0]
      if (u?.username) return u as SessionUser
    }
  } catch { /* se usa lo escrito */ }
  return { username: typed }
}

interface TokenData { access_token: string; refresh_token?: string; expires_in: number }

async function openSession(token: TokenData, typed: string) {
  const user = await fetchUser(token.access_token, typed)
  write({ access: token.access_token, refresh: token.refresh_token, expires: Date.now() + token.expires_in * 1000, user })
}

/** `captcha` es el payload que entrega el widget al resolver el desafío (vale una sola vez). */
export async function login(username: string, password: string, captcha: string): Promise<void> {
  const { ok, data } = await tokenRequest({ grant_type: 'password', username, password, captcha })
  if (!ok) {
    if (data.error === 'invalid_grant') throw new Error('Usuario o contraseña incorrectos')
    throw new Error(data.error_description || 'No se pudo iniciar sesión')
  }
  await openSession(data, username)
}

export interface RegisterResult { ok: boolean; loggedIn?: boolean; errors?: Record<string, string[]>; error?: string }

/** Crea la cuenta (ide-auth → alta de GeoNode) y, si sale bien, deja la sesión iniciada. */
export async function register(data: Record<string, string>): Promise<RegisterResult> {
  const res = await fetch(`${AUTH_API}/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, errors: j.errors, error: j.error ?? (j.errors ? '' : 'No se pudo crear la cuenta') }
  if (j.token) await openSession(j.token, data.username)
  return { ok: true, loggedIn: !!j.token }
}

export async function logout(): Promise<void> {
  const cur = state
  write(null)
  if (cur) {
    try {
      await fetch(`${AUTH_API}/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: cur.access }) })
    } catch { /* ya está cerrada acá */ }
  }
}

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }

export function useSession(): { user: SessionUser | null } {
  const s = useSyncExternalStore(subscribe, () => state)
  return { user: s?.user ?? null }
}
