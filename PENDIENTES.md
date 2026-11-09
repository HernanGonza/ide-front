# Pendientes — IDE Misiones (front)

Orden de trabajo: **primero funcionamiento y lógica** (empezando por "Mañana en la oficina"); **después diseño**, donde se esperan cambios solo estéticos que pidan los técnicos.

## Estado actual (funcionando en producción)

- **Layout:** nav flotante para anónimos, sidebar solo para logueados (`useSession()` en `src/lib/auth.ts` decide). El Catálogo queda marcado también en `/capa/:pk`.
- **Login propio** (`/ingresar`): OAuth2 grant `password` contra GeoNode, token en localStorage con refresh automático. Application `ide-front` creada en GeoNode (cliente público); su `CLIENT_ID` está en `.env` (`VITE_OAUTH_CLIENT_ID`).
- **Registro propio** (`/registro`): abierto y sin aprobación (decisión: sitio público con información pública). Validaciones en el front (8 caracteres, número, mayúscula, carácter especial, coinciden) y medidor de seguridad.
- **Captcha propio** (ALTCHA, prueba de trabajo, sin terceros) en login y registro, con clic explícito en "No soy un robot".
- **Servicio `ide-auth`** (Node, `deploy/auth/server.js`): puente entre el front y GeoNode. Es el único camino de login/registro: verifica el captcha, completa el alta de GeoNode y pide el token. Topes por IP (`MAX_SIGNUPS_PER_IP_HOUR` 10/h, `MAX_LOGINS_PER_IP_10MIN` 20) y campo trampa. Todo el proyecto es JS, sin Python.
- El front ya no publica `/o/` de GeoNode en su proxy, y se filtra el `Set-Cookie` de GeoNode para no pisar cookies de otras apps del dominio.
- Desarrollo: `npm run dev` y, en otra terminal, `npm run dev:auth`.

## Para preguntarle al jefe: qué es público y qué va con cuenta

Antes cualquiera podía publicar y ver todo. Hay que definir la reorganización antes de construir permisos, porque decide qué rutas exigen sesión y qué lleva la sidebar de los logueados.

- **Público sin cuenta:** ¿catálogo, visor, metadatos y geoservicios completos, o solo algunas capas marcadas como públicas? ¿La descarga de capas exige cuenta? ¿Los geoservicios OGC (WMS/WFS) siguen abiertos para QGIS y otros sistemas?
- **Qué suma tener cuenta:** además de las capas privadas, ¿guardar mapas propios, descargas, estilos, documentos? ¿Hay diferencia entre "usuario registrado" y "usuario de un organismo"?
- **Quién puede publicar:** ¿todos los registrados, solo ciertos roles (técnico, organismo, admin) o con aprobación previa de lo publicado? ¿Cómo se asigna ese rol? Hoy el registro es libre y no distingue nada.
- **Roles y organismos:** ¿qué roles hay y qué puede hacer cada uno (ver, subir, editar metadatos, administrar)? ¿Los organismos funcionan como grupos con permisos? Hoy `/organismos` muestra 0 porque no hay grupos cargados.
- **Datos de la cuenta:** ¿qué se pide al registrarse (nombre completo, DNI, organismo)? ¿Hay que verificar el correo?
- **Decisión técnica que depende de las respuestas:** manejar los permisos con los grupos y permisos de GeoNode, o con una capa propia en el servicio `ide-auth`.

## Mañana en la oficina (funcionamiento y lógica)

- [ ] **Datos del perfil:** GeoNode solo guarda usuario y correo; hoy la sesión muestra el nombre de usuario. Decidir qué datos hay que pedir (nombre completo, DNI, organismo, etc.) y dónde guardarlos: campos extra en GeoNode, o una tabla propia junto al servicio `ide-auth`.
- [ ] **Correo:** GeoNode tiene `EMAIL_ENABLE=False` y SMTP en localhost, así que no se verifica el mail ni hay "olvidé mi contraseña". Configurar un SMTP real y armar la recuperación de contraseña y, si se quiere, la verificación del correo.
- [ ] **Perfil de usuario en el front:** ver/editar datos y cambiar contraseña. No existe `/api/v2/users/me` (da 404): el usuario se busca con `/api/v2/users?filter{username}=…`. Confirmar que ese listado devuelva al propio usuario; si no, la sesión usa el nombre escrito.
- [ ] **Bloquear lo de GeoNode que se saltea el captcha:** `ide.ordenamientoterritorial…/o/token/`, `/account/login/` y `/account/signup/` siguen abiertos directo. Bloquearlos (o limitarlos) en el nginx de GeoNode ahora que el front propio funciona.
- [ ] **`CAPTCHA_SECRET`:** definirla en el `.env` de la VM (`openssl rand -hex 32`). Sin eso se genera una en cada arranque y los desafíos pendientes se pierden al reiniciar. Si hay mucho spam, subir `MAX_NUMBER` en `server.js`.
- [ ] **Capas privadas:** verificar con un usuario con permisos sobre una capa privada que se vean al ingresar (las consultas van con Bearer y el caché se limpia al loguear).
- [ ] **Estructura de páginas y navegación:** "Datos abiertos" y "Descargas" de Accesos rápidos apuntan los dos a `/catalogo`; unificarlos o separarlos.

## Funcionalidad que GeoNode tiene y el front nuevo no

| Tema | Estado hoy | Notas |
|---|---|---|
| Subir/administrar capas, editar metadatos, permisos | Sigue en GeoNode (`/catalogue/`) | Con el token propio se puede ir trayendo al front de a poco. |
| Estilos permanentes | El visor cambia el estilo solo para esa vista (SLD_BODY, no se guarda) | Guardar en GeoServer requiere login + API REST. |
| Mapas guardados | Solo se muestra la cantidad en Inicio | Falta página para listarlos/abrirlos y guardar mapas propios. |
| Documentos | No se muestran | GeoNode tiene `/api/v2/documents`. |
| Filtros avanzados del catálogo | Solo categoría y orden | Faltan fecha, palabra clave, organismo. |
| Edición de entidades | No | |

## Contenido y datos

- [ ] `VITE_HOME_LAYERS` en el `.env` de la VM (alternates `workspace:capa`, coma). Hoy el mapa de Inicio sale sin capas. Requiere `docker compose up -d --build`.
- [ ] `/organismos` muestra 0: `/api/v2/groups` devuelve vacío. Cargar grupos en GeoNode (o definir otra fuente).
- [ ] Tarjeta "Descargas este mes": no hay fuente de datos (`SHOW_DOWNLOAD_STATS=false` en `src/lib/config.ts`).
- [ ] Textos `[Completar]` en `src/pages/Documentacion.tsx` y `src/pages/Institucional.tsx`.
- [ ] Probar `/metadatos` (búsqueda CSW) con datos reales: se armó según el estándar pero no se validó contra el servidor.

## Técnico / limpieza

- [ ] Borrar archivos de deploy del plan anterior: `deploy/geonode-front.conf`, `deploy/front-nginx.conf`, `deploy/docker-compose.override.yml`.
- [ ] El estilo dinámico del visor es lento con capas grandes (cada tile sin caché de GeoServer).
- [ ] Imprimir: la composición usa la captura del mapa; revisar con los técnicos si falta algo (norte, cuadrícula, tamaño de papel).
- [ ] Opcional: caché de teselas WMS en el nginx del contenedor si hay mucho tráfico.

## Diseño (después de lo funcional)

Se esperan cambios estéticos de los técnicos. Material a reemplazar e ideas:

- [ ] Logo del header: hoy es la flor del Lapacho (`src/ui/Logo.tsx`). Si hay logo propio de la IDE o la silueta real de Misiones, pasar el archivo.
- [ ] `src/assets/hero.svg` (placeholder; idealmente foto de paisaje `hero.jpg` + cambiar el import en `Inicio.tsx`).
- [ ] `src/assets/card-doc.svg` (imagen de la tarjeta Documentación técnica).
- Ideas de la wiki: modo oscuro con toggle, paleta de comandos Ctrl+K para el buscador, barra de progreso de scroll y footer.

## Deploy (referencia)

Producción: https://ecodatos.ecologia.misiones.gob.ar/ide/ — contenedores `ide-web` e `ide-auth`.
Actualizar en la VM: `git pull && docker compose up -d --build`. Detalle en el `README.md`.
