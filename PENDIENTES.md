# Pendientes — IDE Misiones (front)

Para revisar con los técnicos (martes). Primero opinan sobre diseño y uso; después se prioriza lo de abajo.

## Funcionalidad que GeoNode tiene y el front nuevo no

| Tema | Estado hoy | Notas |
|---|---|---|
| Login / sesión | No hay. "Ingresar" lleva al login de GeoNode | Ver si la sesión de GeoNode se puede compartir entre dominios (`ide.ordenamientoterritorial…` vs `ecodatos…`). Hay que probarlo. |
| Capas privadas | No se ven (el front consulta como anónimo) | Depende del punto anterior. |
| Subir/administrar capas, editar metadatos, permisos | Sigue en GeoNode (`/catalogue/`) | |
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
