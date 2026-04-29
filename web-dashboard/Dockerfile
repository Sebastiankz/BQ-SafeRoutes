# ─── ETAPA 1: BUILD ──────────────────────────────────────────────────────────
# Usamos Node solo para instalar dependencias y compilar el bundle estático.
# Esta etapa se descarta al final; no llega a la imagen de producción.
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos primero los manifiestos para aprovechar el caché de capas:
# si package.json no cambia, Docker reutiliza el "npm ci" previo.
COPY package.json package-lock.json* ./

# "npm ci" es más estricto y reproducible que "npm install":
# instala exactamente lo que dice package-lock.json y falla si hay desajustes.
RUN npm ci

# Ahora copiamos el resto del código fuente.
COPY . .

# Vite genera los archivos estáticos en /app/dist
RUN npm run build

# ─── ETAPA 2: SERVE ──────────────────────────────────────────────────────────
# Imagen mínima (~25 MB) que sirve los archivos estáticos por HTTP.
FROM nginx:1.27-alpine AS serve

# Configuración personalizada: SPA fallback + proxy /api hacia el backend.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos solo el resultado del build, nada de node_modules ni código fuente.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck: nginx responde 200 en "/" cuando el sitio está servido.
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
