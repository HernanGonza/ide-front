# Integración de sistemas: ingreso único y botonera central

Estado: **solo diseño, nada implementado ni tocado en producción.** Surgió el 2026-11-09 al evaluar que la IDE (GeoNode) use los mismos usuarios que Ecodatos. Se armó una presentación para definirlo con el ministro el 2026-11-10.

Material de respaldo (enlaces privados de claude.ai, hay que estar logueado):

- Presentación (16 láminas): https://claude.ai/artifact/Ct6pXJMSCiL7AawP7bbvU2
- Diagrama técnico con todas las figuras y tablas: https://claude.ai/artifact/9j6eH2kw3uzuPYs6TXvwyV

El PDF de la presentación se exporta desde el visor: Compartir › Exportar › PDF.

## Idea central

- **Identidad única:** el Supabase Auth de Ecodatos es la fuente de usuarios para todos los sistemas del Ministerio.
- **Portal central (botonera):** una pantalla con un botón por sistema. Cada persona ve solo los que le corresponden.
- **Tabla de permisos en Ecodatos** que define quién ve qué.
- **Todo por OIDC** (código + PKCE), porque los sistemas están en dominios distintos y no pueden compartir cookies ni localStorage.
- **El portal vive en la VM de ecodatos**, junto a Supabase. Si hace falta, el gestor de claves y la wiki se mueven a otra VM sin cambiar el diseño.

## Qué hay hoy y qué se decidió por sistema

| Sistema | Dónde corre | Decisión |
|---|---|---|
| Ecodatos, Wiki, Gestor de claves (Vaultwarden) | VM de ecodatos (`ecodatos.ecologia.misiones.gob.ar`, `/wiki`, `/claves`) | Wiki pasa a OIDC cuando convenga. **Gestor de claves queda fuera del SSO**: siempre pide la contraseña maestra, mantiene su registro y login; en el portal es solo un enlace. |
| Licencias de pesca y Registro de infractores | Misma VM, **mismo código con rutas distintas** | Dos sistemas en la tabla de permisos; la app comprueba `tiene_acceso` según la ruta. |
| registrojnr | VM propia | OIDC desde el diseño. |
| Sistema de personal | VM propia | OIDC desde el diseño (ya se iba a implementar SSO). |
| Alerta Temprana y Alertas Focos de Calor | VM propia (comparten) | Datos y tabla de usuarios en el Supabase de Ecodatos, **schema propio**. Acceso de emergencia directo en `sistema.alertatemprana.misiones.gob.ar` (hoy ese dominio no existe; sale cuando den el DNS). |
| IDE (GeoNode + GeoServer) | Server aparte (chico y viejo, no se usa para réplicas) | Técnicos entran con el usuario de Ecodatos; el **público sigue con cuentas locales** de GeoNode y nunca entra a Ecodatos. GeoServer sigue detrás de GeoNode. |
| Pagos (botonera de pagos) | **Sin desplegar**, sin lugar definido, pasarela sin implementar | Ver sección siguiente. Usa el Supabase de Ecodatos con schema `pagos` y rol `botonera`. |
| Ecoremitos | Por verificar (quizá una nube) | Se ve después. |

### Pagos: cuatro fronts, una API

- **Público** (`/`): sin login, va en la página de ecologia. No es sistema del portal (puede ser un enlace libre).
- **Recaudaciones** (`/admin`) → sistema `pagos-recaudaciones`. Hoy: admin, superadmin o área "recaudaciones".
- **Áreas** (`/paneles`) → `pagos-areas`. Hoy: quien tenga algún módulo con panel asignado, por formulario o área.
- **Administración** (`/sistema`) → `pagos-admin`. Hoy: solo admin o superadmin de Ecodatos.
- Cada panel ya tiene su login contra el Supabase de Ecodatos y sigue funcionando así.
- **Evitar dos fuentes de verdad:** `mis_sistemas()` debería calcular estas tres reglas con la misma lógica que usa la API de pagos (o la API consultar `tiene_acceso`). Si no, aparece un botón que luego responde 403.
- La API entra a la base con el rol `botonera` (solo schema `pagos`, sin DDL). La función de permisos tiene que ir en `public` con `security definer`.

## Modelo propuesto en Ecodatos (no creado)

Reutiliza `areas`, `roles`, `usuarios_areas`, `usuarios_rol` y agrega:

- `sistemas`: `key`, nombre, descripción, URL, ícono, orden, activo, tipo de acceso (`oidc`, `enlace`).
- `sistemas_areas`, `sistemas_roles`: acceso por área o por rol.
- `usuarios_sistemas`: excepciones por persona, con `rol_en_sistema`.
- Funciones `mis_sistemas()` y `tiene_acceso(key)`. Admin y superadmin ven todo.
- El botón visible **no es un permiso**: cada sistema valida del lado servidor.

## Flujo de ingreso

1. El sistema redirige al portal (`/authorize`, código + PKCE).
2. El portal comprueba la sesión de Supabase (login solo la primera vez).
3. Consulta `tiene_acceso`; si la persona no figura, no se emite código.
4. Vuelve al sistema con el código; el sistema lo canjea servidor a servidor por un `id_token` (sub, email, rol).
5. El sistema busca o crea el usuario local y abre su propia sesión.

Los sistemas con tabla propia de usuarios (Alerta) se vinculan por el `id` de `auth.users`, no por correo (falta confirmar que su tabla lo referencia así).

## Disponibilidad y respaldo

Problema: si cae la VM de ecodatos, los demás sistemas siguen vivos pero nadie puede iniciar sesión.

- **Réplica selectiva en otra VM del mismo server** (la base completa es grande, no se copia): `auth.users`, `auth.identities`, factores de doble factor, tablas de roles, áreas y permisos. Opcional: schemas de Alerta y Pagos si pesan poco; opcional `auth.sessions` y `auth.refresh_tokens` para que las sesiones sigan vivas. En esa VM: GoTrue, portal y servidor OIDC, con las mismas claves de firma.
- **Respaldo de la base completa y del Storage al NAS**, con archivado continuo (WAL) para volver a un momento exacto. **Segunda copia en la PC del gabinete**, que es un disco público de la oficina: tiene que ir **cifrada y en una carpeta de acceso restringido** (incluye hashes de contraseñas y datos personales).
- Si cae el server físico entero, los sistemas caen igual: ahí lo que importa es restaurar, no la disponibilidad.
- La replicación lógica **no pasa por Supavisor**: necesita acceso directo al Postgres. La VM de réplica necesita IP fija. Los cambios de estructura (DDL) no se replican solos.

## Dominio del portal (sin elegir)

Opciones: `sistemas.`, `acceso.`, `ingreso.`, `cuenta.`, `inicio.`, `id.` más `ecologia.misiones.gob.ar`. Recomendación: `sistemas.ecologia.misiones.gob.ar` si queda un solo host; si se separan, `acceso.` para el login y `sistemas.` para la botonera. **Hay que fijarlo antes de conectar el primer sistema**: queda grabado como emisor (issuer) en los tokens y en la configuración de cada sistema.

## Sin confirmar

- Supabase como servidor OIDC figura como **beta** en su documentación. Con `GoTrue v2.184.0` (el de `ecodatos/infra`) técnicamente existe, pero falta leer la guía de autoalojamiento (`self-hosted-oauth`).
- Para entregar `id_token` exige **claves de firma asimétricas**; Ecodatos hoy firma con `JWT_SECRET` (HS256). Cambiarlo puede afectar a lo que verifica con el secreto: probar primero en una copia.
- Que el allauth de GeoNode acepte un OIDC genérico (alternativa: backend de autenticación propio en GeoNode).
- `DISABLE_SIGNUP` real de Ecodatos: en `ecodatos/infra/.env.fixed` figura en `false`. Como esa cuenta pasa a ser la llave de todo, conviene cerrarlo y exigir doble factor al menos a las cuentas de administración.
- Que los tres paneles de pagos compartan la sesión de Supabase (mismo host, rutas distintas).
- Versión de Postgres (15 o más para publicar schemas enteros) y `wal_level = logical`.

## Datos que faltan para decidir la réplica

Correr en el Postgres de Ecodatos:

```sql
SELECT n.nspname, pg_size_pretty(sum(pg_total_relation_size(c.oid)))
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' GROUP BY 1 ORDER BY sum(pg_total_relation_size(c.oid)) DESC;

SHOW wal_level;
SELECT version();
```

Y averiguar: espacio libre en el NAS, y si Alerta entra en la réplica o solo el ingreso (depende del peso de su schema).

## Orden de trabajo propuesto (sin fechas)

1. Tabla de sistemas y permisos en Ecodatos + portal con botones que abren cada sistema (no afecta lo que funciona hoy). En paralelo, la VM de réplica y el respaldo al NAS.
2. Sistemas propios: personal, registrojnr, pesca e infractores, y Pagos cuando se despliegue.
3. IDE y Alertas, probado antes en una copia de Ecodatos.
4. Ecoremitos cuando se sepa dónde está. El gestor de claves sigue con login propio.

## Pedidos y dependencias

- Acceso al **DNS** de `ecologia.misiones.gob.ar` y de `alertatemprana.misiones.gob.ar` (esta semana). Sin eso no se pueden crear los dominios nuevos.
- Decisiones para el ministro (lámina 15 de la presentación): camino de integración, dirección del portal, DNS, quién asigna permisos, réplica y respaldo, doble factor.

## Relación con el login propio de la IDE

El login/registro propio de la IDE (`ide-auth`, OAuth2 grant `password` contra GeoNode) **sigue como está** y es lo que usa el público. La integración con Ecodatos afecta a los técnicos: el camino más simple para la IDE es que GeoNode valide contra Supabase (backend de autenticación en GeoNode) o que consuma OIDC; el detalle se define cuando se llegue al paso 3.
