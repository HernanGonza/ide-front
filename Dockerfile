# ── Build ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
# Valores que Vite incrusta en el front (los define docker-compose.yml)
ARG VITE_BASE=/ide/
ARG VITE_PUBLIC_ORIGIN=
ARG VITE_GEONODE_ORIGIN=
ARG VITE_HOME_LAYERS=
ENV VITE_BASE=$VITE_BASE \
    VITE_PUBLIC_ORIGIN=$VITE_PUBLIC_ORIGIN \
    VITE_GEONODE_ORIGIN=$VITE_GEONODE_ORIGIN \
    VITE_HOME_LAYERS=$VITE_HOME_LAYERS
COPY . .
RUN npm run build

# ── Runtime: nginx sirviendo el front y proxeando a GeoNode/GeoServer ──
FROM nginx:1.27-alpine
ENV IDE_ORIGIN=https://ide.ordenamientoterritorial.misiones.gob.ar \
    IDE_HOST=ide.ordenamientoterritorial.misiones.gob.ar
# La imagen de nginx reemplaza ${IDE_ORIGIN} / ${IDE_HOST} al arrancar
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
