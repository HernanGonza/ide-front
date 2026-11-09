# IDE Misiones — Front

Portal público de la IDE Misiones. GeoNode 4.3.1 y GeoServer 2.24.4 quedan como back.

| Ruta | Qué es | Fuente de datos |
|---|---|---|
| `/` | Inicio: hero, totales, mapa embebido con capas activas, accesos rápidos | API v2 (datasets, maps, groups) + WMS |
| `/visor` | Visor OpenLayers: capas con switches, opacidad, orden, leyenda, consulta, medir distancia/área, ubicarme | WMS (GeoServer) |
| `/catalogo` | Buscador con filtros por categoría, orden y paginado | `/api/v2/datasets`, `/api/v2/categories` |
| `/capa/:pk` | Ficha: mapa, metadatos, leyenda, descargas, link ISO 19139 | API v2 + WMS/WFS/WCS + CSW |
| `/metadatos` | Buscador de metadatos (CSW GetRecords, `csw:AnyText`) | CSW |
| `/geoservicios` | Endpoints WMS/WMTS/WFS/WCS/CSW para copiar (`/servicios` redirige) | — |
| `/documentacion` | Guías y FAQ (`#faq`). Textos `[Completar]` | — |
| `/organismos` | Grilla de organismos | `/api/v2/groups` |
| `/institucional` | Contenido institucional IDERA (`#contacto`) | — |

## Estilo

Brandbook 2024 del Ministerio (mismos tokens que la wiki): verde `#3e6c51`, beige, rosa Lapacho, tipografía
Oak Sans (local, `src/assets/fonts`), íconos `lucide-react`, animaciones con `motion`. Sidebar colapsable
(botón o Ctrl+B) y drawer en mobile.

## Configuración

- `VITE_HOME_LAYERS` (`.env`): alternates `workspace:capa` separados por coma; son las capas iniciales del mapa de Inicio.
- `SHOW_DOWNLOAD_STATS` (`src/lib/config.ts`): `false` oculta la tarjeta "Descargas este mes" (no hay fuente de datos).

## Placeholders a reemplazar

- Logo del header del sidebar: hoy es la flor del Lapacho (`src/ui/Logo.tsx`); si hay un logo propio de la IDE, reemplazarlo ahí
- Hero: `src/assets/hero.svg` (idealmente `hero.jpg`; cambiar el import en `Inicio.tsx`)
- Imagen de tarjeta Documentación: `src/assets/card-doc.svg`
- Textos `[Completar]` en `Documentacion.tsx` e `Institucional.tsx`
- Imprimir en Inicio y en la ficha: abre el visor (`/visor`), que tiene impresión real (título, escala, leyendas, fecha).

El visor acepta `?capas=ws:capa1,ws:capa2`, así cualquier vista se puede compartir por link.
La UI de GeoNode sigue disponible en `/catalogue/#/` para gestión (subir capas, metadatos, permisos)
pero el portal ya no depende de ella para visualizar: el visor propio (`/visor`) incluye impresión, medición, consulta, leyendas, descargas, tabla de atributos y estilo temporal por capa (SLD_BODY; no se guarda en GeoServer).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:auth   # en otra terminal: servicio de cuentas (login, registro, captcha) en el puerto 8000
```

Vite proxea `/api`, `/geoserver`, `/uploaded`, `/static` y `/catalogue` al servidor real, así que se
trabaja con datos reales y sin CORS. Para apuntar a otro servidor (ej. por Tailscale):

```bash
IDE_ORIGIN=http://<ip-tailscale-srv-ide> npm run dev
```

## Deploy (VM de la oficina, Docker)

Mismo esquema que la wiki: un contenedor (`ide-web`) en la red externa `supabase`, que el nginx de ecodatos
publica en **https://ecodatos.ecologia.misiones.gob.ar/ide/**.

- `ide-web` sirve el front (compilado con base `/ide/`) y reenvía `/api`, `/geoserver`, `/catalogue` y `/uploaded`
  a la IDE (`ide.ordenamientoterritorial.misiones.gob.ar`), así el navegador habla siempre con un solo dominio (sin CORS).
- Los pedidos del navegador van a `/ide/api/...`, `/ide/geoserver/...`, etc. No chocan con el `/api/` que ya usa ecodatos.

### Primera vez (una sola)

```bash
git clone https://github.com/HernanGonza/ide-front.git && cd ide-front
cp .env.example .env            # opcional; poner VITE_HOME_LAYERS (capas del mapa de Inicio)
docker compose up -d --build
docker compose ps               # ide-web debe quedar "healthy"
curl -I http://localhost:8091/ide/        # prueba directa, sin el nginx de ecodatos
```

Después pegar `deploy/ecodatos-nginx-ide.conf` dentro del `server { }` del nginx de ecodatos (junto al bloque de `/wiki/`) y recargar:

```bash
docker exec app-formularios-nginx nginx -t && docker exec app-formularios-nginx nginx -s reload
```

### Actualizar

```bash
git pull && docker compose up -d --build
```

### Variables (`.env`, todas opcionales)

| Variable | Default | Uso |
|---|---|---|
| `VITE_HOME_LAYERS` | vacío | Capas del mapa de Inicio (alternates separados por coma). **Se incrusta al compilar**: cambiarla requiere `--build`. |
| `IDE_BASE_PATH` | `/ide/` | Ruta donde cuelga el front. |
| `PUBLIC_ORIGIN` | `https://ecodatos.ecologia.misiones.gob.ar` | Dominio que se muestra en las URLs de Geoservicios. |
| `GEONODE_ORIGIN` | `https://ide.ordenamientoterritorial.misiones.gob.ar` | Destino del botón "Ingresar". |
| `IDE_ORIGIN` / `IDE_HOST` | dominio de la IDE | A dónde reenvía los datos el contenedor, y `Host` que envía. Si la VM llega a la IDE por IP interna: `IDE_ORIGIN=http://10.0.0.x` con el mismo `IDE_HOST`. |
| `IDE_PORT` | `8091` | Puerto de acceso directo para pruebas. |

**Rollback:** quitar el bloque `/ide/` del nginx de ecodatos y recargar; `docker compose down` baja el contenedor.

## Pendiente (fase 2, requisitos IDERA del visor)

- [ ] Tabla de atributos (WFS) con filtro y exportación
- [ ] Impresión a PDF
- [ ] Importar capas (KML/GeoJSON/SHP local) y agregar WMS externos
- [ ] Coordenadas en POSGAR 2007 faja 7 (proj4)
- [ ] Búsqueda de lugares (localidades / parcelas)
- [ ] Capas privadas con login (OAuth2 de GeoNode)
- [ ] Textos institucionales, identidad visual definitiva (Duatx / EcoDatos)
- [ ] Rate limiting en `/api/v2` y `/geoserver` (`limit_req`)
