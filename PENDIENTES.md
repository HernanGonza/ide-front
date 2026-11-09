# Pendientes — IDE Misiones (front)

Para revisar con los técnicos (martes). Primero opinan sobre diseño y uso; después se prioriza lo de abajo.

## Funcionalidad que GeoNode tiene y el front nuevo no

| Tema | Estado hoy | Notas |
|---|---|---|
| Login / sesión | Hecho (sin probar en producción): pantalla propia `/ingresar`, OAuth2 grant `password` contra `/o/token/`, token en localStorage con refresh. Layout: nav flotante para anónimos, sidebar para logueados | Application `ide-front` creada en GeoNode (cliente público); su `CLIENT_ID` está en `.env` (`VITE_OAUTH_CLIENT_ID`). Registro y token probados en producción. `/api/v2/users/me` no existe en GeoNode 4.3 (da 404): el usuario se busca con `/api/v2/users?filter{username}=…`; falta confirmar que ese listado devuelva al propio usuario (si no, la sesión usa el nombre escrito). |
| Registro | Hecho (sin probar un alta real): `/registro` propio, abierto y sin aprobación | Lo hace el servicio `ide-auth` (`deploy/auth/server.py`), que completa el alta de GeoNode del lado del servidor. Protecciones: campo trampa y tope por IP (`MAX_SIGNUPS_PER_IP_HOUR`, 10/h). |
| Capas privadas | Deberían verse al ingresar (las consultas van con Bearer y el caché se limpia al loguear) | Verificar con un usuario que tenga permisos sobre una capa privada. |
| Subir/administrar capas, editar metadatos, permisos | Sigue en GeoNode (`/catalogue/`) | |
| Estilos permanentes | El visor cambia el estilo solo para esa vista (SLD_BODY, no se guarda) | Guardar en GeoServer requiere login + API REST. |
| Mapas guardados | Solo se muestra la cantidad en Inicio | Falta página para listarlos/abrirlos y guardar mapas propios. |
| Documentos | No se muestran | GeoNode tiene `/api/v2/documents`. |
| Filtros avanzados del catálogo | Solo categoría y orden | Faltan fecha, palabra clave, organismo. |
| Edición de entidades | No | |

## Login y cuentas (siguiente)

- [ ] Probar en la VM: `git pull && docker compose up -d --build` (ahora construye `ide-web` e `ide-auth`), crear una cuenta en `/ide/registro` y entrar en `/ide/ingresar`.
- [ ] Correo: GeoNode tiene `EMAIL_ENABLE=False` y SMTP en localhost, así que no se verifica el mail ni hay "olvidé mi contraseña". Configurar un SMTP real y armar la recuperación de contraseña en el front.
- [ ] Perfil de usuario: ver/editar datos y cambiar contraseña (por `/api/v2/users/<pk>`, no hay `/me`).
- [ ] Anti-bots más fuerte si hace falta (hoy: campo trampa + tope por IP; sin captcha por decisión de dejar el registro libre).
- [ ] Decidir si el `/account/login/` y `/account/signup/` de GeoNode se bloquean desde el nginx de la IDE una vez que el front propio esté probado.

## Contenido y datos

- [ ] `VITE_HOME_LAYERS` en el `.env` de la VM (alternates `workspace:capa`, coma). Hoy el mapa de Inicio sale sin capas. Requiere `docker compose up -d --build`.
- [ ] `/organismos` muestra 0: `/api/v2/groups` devuelve vacío. Cargar grupos en GeoNode (o definir otra fuente).
- [ ] Tarjeta "Descargas este mes": no hay fuente de datos (`SHOW_DOWNLOAD_STATS=false` en `src/lib/config.ts`).
- [ ] Textos `[Completar]` en `src/pages/Documentacion.tsx` y `src/pages/Institucional.tsx`.
- [ ] Probar `/metadatos` (búsqueda CSW) con datos reales: se armó según el estándar pero no se validó contra el servidor.

## Material gráfico a reemplazar

- [ ] Logo del header: hoy es la flor del Lapacho (`src/ui/Logo.tsx`). Si hay logo propio de la IDE o la silueta real de Misiones, pasar el archivo.
- [ ] `src/assets/hero.svg` (placeholder; idealmente foto de paisaje `hero.jpg` + cambiar el import en `Inicio.tsx`).
- [ ] `src/assets/card-doc.svg` (imagen de la tarjeta Documentación técnica).

## Ideas de la wiki que se pueden traer

- Modo oscuro con toggle (los tokens `.dark` ya existen en la wiki).
- Paleta de comandos Ctrl+K para el buscador.
- Barra de progreso de scroll y footer.

## Técnico / limpieza

- [ ] Borrar archivos de deploy del plan anterior: `deploy/geonode-front.conf`, `deploy/front-nginx.conf`, `deploy/docker-compose.override.yml`.
- [ ] El estilo dinámico del visor es lento con capas grandes (cada tile sin caché de GeoServer).
- [ ] Imprimir: la composición usa la captura del mapa; revisar con los técnicos si falta algo (norte, cuadrícula, tamaño de papel).
- [ ] Opcional: caché de teselas WMS en el nginx del contenedor si hay mucho tráfico.

## Deploy (referencia)

Producción: https://ecodatos.ecologia.misiones.gob.ar/ide/ — contenedor `ide-web`.
Actualizar en la VM: `git pull && docker compose up -d --build`. Detalle en el `README.md`.
