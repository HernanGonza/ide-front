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
```

Vite proxea `/api`, `/geoserver`, `/uploaded`, `/static` y `/catalogue` al servidor real, así que se
trabaja con datos reales y sin CORS. Para apuntar a otro servidor (ej. por Tailscale):

```bash
IDE_ORIGIN=http://<ip-tailscale-srv-ide> npm run dev
```

## Deploy en srv-ide

1. Copiar el proyecto a `/home/ideadmin/ide-front`.
2. `cp deploy/docker-compose.override.yml ~/geonode/`
3. Rutas en el Nginx de GeoNode:
   ```bash
   # verificar que sites-enabled se incluya dentro del bloque server
   docker exec nginx4geonode grep -rn "sites-enabled" /etc/nginx/
   docker cp deploy/geonode-front.conf nginx4geonode:/etc/nginx/sites-enabled/ide-front.conf
   ```
4. Levantar:
   ```bash
   cd ~/geonode
   docker compose build front && docker compose up -d front
   docker exec nginx4geonode nginx -t && docker exec nginx4geonode nginx -s reload
   ```
5. Verificar: `/` muestra el portal nuevo; `/catalogue/#/`, `/api/v2/datasets` y `/geoserver/web` siguen andando.

**Rollback:** `docker exec nginx4geonode rm /etc/nginx/sites-enabled/ide-front.conf && docker exec nginx4geonode nginx -s reload`

**Actualizar:** `docker compose build front && docker compose up -d front` (sin tocar GeoNode).

`/etc/nginx` está en el volumen `geonode-nginxconfd`, así que el archivo persiste entre reinicios.
Igual conviene confirmarlo después del primer `docker compose restart geonode`.

## Pendiente (fase 2, requisitos IDERA del visor)

- [ ] Tabla de atributos (WFS) con filtro y exportación
- [ ] Impresión a PDF
- [ ] Importar capas (KML/GeoJSON/SHP local) y agregar WMS externos
- [ ] Coordenadas en POSGAR 2007 faja 7 (proj4)
- [ ] Búsqueda de lugares (localidades / parcelas)
- [ ] Capas privadas con login (OAuth2 de GeoNode)
- [ ] Textos institucionales, identidad visual definitiva (Duatx / EcoDatos)
- [ ] Rate limiting en `/api/v2` y `/geoserver` (`limit_req`)
