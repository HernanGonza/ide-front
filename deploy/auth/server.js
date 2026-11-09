// Servicio de cuentas de la IDE Misiones (registro + login + captcha propio).
//
// GeoNode no tiene API para crear cuentas y su login es una pantalla que no usamos. Este servicio chico
// hace de puente entre el front propio y GeoNode, y es el único camino público para entrar o registrarse:
//
//   GET  /captcha   → desafío ALTCHA (prueba de trabajo firmada con HMAC; sin cookies ni terceros)
//   POST /registro  → verifica el captcha, completa el alta de GeoNode (token CSRF incluido) y abre sesión
//   POST /token     → grant "password" (exige captcha) o "refresh_token" contra /o/token/ de GeoNode
//   POST /revoke    → revoca un token
//
// Variables: IDE_ORIGIN, OAUTH_CLIENT_ID, CAPTCHA_SECRET, PORT. Única dependencia: altcha-lib.
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { createChallenge, verifySolution } from 'altcha-lib/v1'

const ORIGIN = (process.env.IDE_ORIGIN || 'https://ide.ordenamientoterritorial.misiones.gob.ar').replace(/\/$/, '')
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || process.env.VITE_OAUTH_CLIENT_ID || ''
const SIGNUP = `${ORIGIN}/account/signup/`
const FIELDS = ['email', 'username', 'password1', 'password2']

// Clave del captcha. Sin definir se genera una al arrancar (los desafíos viejos dejan de valer al reiniciar).
const SECRET = process.env.CAPTCHA_SECRET || randomBytes(32).toString('hex')
const MAX_NUMBER = 200_000 // dificultad: ~0,1-0,5 s en un navegador común
const CHALLENGE_TTL_MS = 5 * 60_000
const MAX_SIGNUPS_PER_HOUR = Number(process.env.MAX_SIGNUPS_PER_IP_HOUR || 10)
const MAX_LOGINS_PER_10MIN = Number(process.env.MAX_LOGINS_PER_IP_10MIN || 20)

// Mensajes de allauth/Django (en inglés) → castellano. Los desconocidos se devuelven tal cual.
const ES = {
  'Enter a valid email address.': 'Ingresá un correo válido.',
  'A user is already registered with this email address.': 'Ya hay una cuenta con ese correo.',
  'A user with that username already exists.': 'Ese nombre de usuario ya existe.',
  'You must type the same password each time.': 'Las contraseñas no coinciden.',
  'Password must be a minimum of 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'This password is too common.': 'Esa contraseña es muy común.',
  'This password is entirely numeric.': 'La contraseña no puede ser solo números.',
  'This field is required.': 'Campo obligatorio.',
}
const unescapeHtml = (s) => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[e])

// ───────── Límites ─────────
const hits = new Map()
function limited(bucket, ip, max, windowMs) {
  const key = `${bucket}:${ip}`, now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return true }
  arr.push(now); hits.set(key, arr)
  return false
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k) }, 600_000).unref()

// ───────── Captcha ─────────
const used = new Map() // firma → vencimiento: una solución sirve una sola vez
async function verifyCaptcha(payload) {
  if (typeof payload !== 'string' || !payload || payload.length > 2048) return false
  let sig
  try { sig = JSON.parse(Buffer.from(payload, 'base64').toString()).signature } catch { return false }
  if (typeof sig !== 'string') return false
  const now = Date.now()
  for (const [k, exp] of used) if (exp < now) used.delete(k)
  if (used.has(sig)) return false
  let ok = false
  try { ok = await verifySolution(payload, SECRET, true) } catch { ok = false }
  if (ok) used.set(sig, now + CHALLENGE_TTL_MS)
  return ok
}

// ───────── GeoNode ─────────
async function oauth(path, form) {
  const r = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': 'ide-auth' },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(20_000),
  })
  return [r.status, await r.json().catch(() => ({}))]
}

async function createAccount(d) {
  const page = await fetch(SIGNUP, { headers: { 'User-Agent': 'ide-auth' }, signal: AbortSignal.timeout(20_000) })
  const html = await page.text()
  const token = /name="csrfmiddlewaretoken" value="([^"]+)"/.exec(html)?.[1]
  const csrf = page.headers.getSetCookie().map((c) => /^csrftoken=([^;]+)/.exec(c)?.[1]).find(Boolean)
  if (!token || !csrf) return [502, { ok: false, error: 'No se pudo iniciar el registro.' }]
  const form = new URLSearchParams({ csrfmiddlewaretoken: token })
  for (const f of FIELDS) form.set(f, String(d[f] ?? ''))
  const r = await fetch(SIGNUP, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN, Referer: SIGNUP, Cookie: `csrftoken=${csrf}`, 'User-Agent': 'ide-auth' },
    body: form,
    signal: AbortSignal.timeout(20_000),
  })
  if (r.status >= 300 && r.status < 400) return [200, { ok: true }] // allauth redirige cuando creó la cuenta
  const body = await r.text()
  const errors = {}
  for (const [, fld, msg] of body.matchAll(/id="error_id_(\w+?)_\d+"[^>]*>([^<]+)</g)) {
    const m = unescapeHtml(msg).trim()
    ;(errors[fld] ||= []).push(ES[m] ?? m)
  }
  if (Object.keys(errors).length) return [400, { ok: false, errors }]
  return [502, { ok: false, error: 'No se pudo crear la cuenta. Probá de nuevo más tarde.' }]
}

// ───────── HTTP ─────────
const NO_CAPTCHA = 'No se pudo verificar que sos una persona. Probá de nuevo.'

async function handle(req, res, send) {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || '?'
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && path === '/captcha') {
    if (limited('chal', ip, 60, 600_000)) return send(429, { error: 'Demasiados pedidos.' })
    return send(200, await createChallenge({ hmacKey: SECRET, maxnumber: MAX_NUMBER, expires: new Date(Date.now() + CHALLENGE_TTL_MS) }))
  }
  if (req.method !== 'POST') return send(404, { error: 'No existe.' })

  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > 4096) return send(413, { ok: false, error: 'Pedido demasiado grande.' }) }
  let d
  try { d = JSON.parse(raw || '{}') } catch { d = null }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return send(400, { ok: false, error: 'Pedido inválido.' })

  if (path === '/registro') {
    if (d.website) return send(200, { ok: true }) // honeypot: las personas no ven ese campo
    if (limited('signup', ip, MAX_SIGNUPS_PER_HOUR, 3600_000)) return send(429, { ok: false, error: 'Demasiados registros desde esta conexión. Probá más tarde.' })
    if (!(await verifyCaptcha(d.captcha))) return send(400, { ok: false, captcha: false, error: NO_CAPTCHA })
    const [code, out] = await createAccount(d)
    if (code === 200) { // la cuenta existe: se abre la sesión acá mismo, sin pedir otro captcha
      const [tc, token] = await oauth('/o/token/', { grant_type: 'password', client_id: CLIENT_ID, username: String(d.username ?? ''), password: String(d.password1 ?? '') })
      if (tc === 200) out.token = token
    }
    return send(code, out)
  }

  if (path === '/token') {
    if (d.grant_type === 'refresh_token') {
      const [c, o] = await oauth('/o/token/', { grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: String(d.refresh_token ?? '') })
      return send(c, o)
    }
    if (d.grant_type !== 'password') return send(400, { error: 'unsupported_grant_type' })
    if (limited('login', ip, MAX_LOGINS_PER_10MIN, 600_000)) return send(429, { error: 'too_many', error_description: 'Demasiados intentos. Probá en unos minutos.' })
    if (!(await verifyCaptcha(d.captcha))) return send(400, { error: 'captcha', error_description: NO_CAPTCHA })
    const [c, o] = await oauth('/o/token/', { grant_type: 'password', client_id: CLIENT_ID, username: String(d.username ?? ''), password: String(d.password ?? '') })
    return send(c, o)
  }

  if (path === '/revoke') {
    const [c, o] = await oauth('/o/revoke_token/', { client_id: CLIENT_ID, token: String(d.token ?? '') })
    return send(c < 400 ? 200 : c, o)
  }
  return send(404, { error: 'No existe.' })
}

http.createServer((req, res) => {
  const send = (code, obj) => {
    const b = JSON.stringify(obj)
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(b) })
    res.end(b)
  }
  handle(req, res, send).catch(() => send(502, { ok: false, error: 'El servidor de la IDE no responde.' }))
}).listen(Number(process.env.PORT || 8000), '0.0.0.0', () => {
  if (!process.env.CAPTCHA_SECRET) console.log('Aviso: CAPTCHA_SECRET no definido, se usa una clave temporal.')
})
