"""Registro de usuarios para la IDE Misiones.

GeoNode no tiene API para crear cuentas, solo el formulario de django-allauth. Este servicio chico
hace de puente: recibe el registro del front propio (JSON), completa ese formulario del lado del
servidor (token CSRF incluido) y devuelve ok / errores por campo. El usuario nunca ve GeoNode.
Solo biblioteca estándar. Variables: IDE_ORIGIN (https://ide...), PORT.
"""
import json, os, re, time, threading, html
import urllib.request, urllib.parse, urllib.error, http.cookiejar
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ORIGIN = os.environ.get('IDE_ORIGIN', 'https://ide.ordenamientoterritorial.misiones.gob.ar').rstrip('/')
SIGNUP = f'{ORIGIN}/account/signup/'
FIELDS = ('email', 'username', 'password1', 'password2')
MAX_PER_HOUR = int(os.environ.get('MAX_SIGNUPS_PER_IP_HOUR', '10'))

# Mensajes de allauth/Django (en inglés) → castellano. Los desconocidos se devuelven tal cual.
ES = {
    'Enter a valid email address.': 'Ingresá un correo válido.',
    'A user is already registered with this email address.': 'Ya hay una cuenta con ese correo.',
    'A user with that username already exists.': 'Ese nombre de usuario ya existe.',
    'You must type the same password each time.': 'Las contraseñas no coinciden.',
    'Password must be a minimum of 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
    'This password is too common.': 'Esa contraseña es muy común.',
    'This password is entirely numeric.': 'La contraseña no puede ser solo números.',
    'This field is required.': 'Campo obligatorio.',
}

_hits: dict[str, list[float]] = {}
_lock = threading.Lock()


def limited(ip: str) -> bool:
    now = time.time()
    with _lock:
        hits = [t for t in _hits.get(ip, []) if now - t < 3600]
        if len(hits) >= MAX_PER_HOUR:
            _hits[ip] = hits
            return True
        hits.append(now)
        _hits[ip] = hits
        return False


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def register(data: dict) -> tuple[int, dict]:
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect)
    page = op.open(urllib.request.Request(SIGNUP, headers={'User-Agent': 'ide-auth'}), timeout=20).read().decode('utf-8', 'replace')
    m = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page)
    if not m:
        return 502, {'ok': False, 'error': 'No se pudo iniciar el registro.'}
    form = {'csrfmiddlewaretoken': m.group(1), **{f: str(data.get(f, '')) for f in FIELDS}}
    req = urllib.request.Request(
        SIGNUP, data=urllib.parse.urlencode(form).encode(),
        headers={'Origin': ORIGIN, 'Referer': SIGNUP, 'User-Agent': 'ide-auth', 'Content-Type': 'application/x-www-form-urlencoded'},
    )
    try:
        body = op.open(req, timeout=20).read().decode('utf-8', 'replace')
        status = 200
    except urllib.error.HTTPError as e:
        status, body = e.code, e.read().decode('utf-8', 'replace')
    if status in (301, 302, 303):  # allauth redirige cuando creó la cuenta
        return 200, {'ok': True}
    errors: dict[str, list[str]] = {}
    for fld, msg in re.findall(r'id="error_id_(\w+?)_\d+"[^>]*>([^<]+)<', body):
        errors.setdefault(fld, []).append(ES.get(html.unescape(msg).strip(), html.unescape(msg).strip()))
    if errors:
        return 400, {'ok': False, 'errors': errors}
    return 502, {'ok': False, 'error': 'No se pudo crear la cuenta. Probá de nuevo más tarde.'}


class H(BaseHTTPRequestHandler):
    def _send(self, code: int, obj: dict):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        try:
            data = json.loads(self.rfile.read(min(int(self.headers.get('Content-Length', 0)), 4096)) or b'{}')
        except Exception:
            return self._send(400, {'ok': False, 'error': 'Pedido inválido.'})
        if data.get('website'):  # honeypot: los humanos no ven ese campo
            return self._send(200, {'ok': True})
        if limited(ip):
            return self._send(429, {'ok': False, 'error': 'Demasiados registros desde esta conexión. Probá más tarde.'})
        try:
            code, out = register(data)
        except Exception:
            code, out = 502, {'ok': False, 'error': 'El servidor de la IDE no responde.'}
        self._send(code, out)

    def log_message(self, *a):  # sin datos personales en los logs
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '8000'))), H).serve_forever()
