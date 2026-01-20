##
## Web (Vite) → Static build served by Nginx (Cloud Run friendly)
##
## Notes:
## - Vite env vars are baked at build-time. If you need CAMARA_* values in the bundle,
##   pass them as build args (or configure them in Cloud Build trigger).
##

# --- Build stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Optional build-time envs (Vite reads process env during build)
ARG CAMARA_URL
ARG CAMARA_PUBLISHABLE_KEY
ARG CAMARA_PROJECT_ID

ENV CAMARA_URL=$CAMARA_URL
ENV CAMARA_PUBLISHABLE_KEY=$CAMARA_PUBLISHABLE_KEY
ENV CAMARA_PROJECT_ID=$CAMARA_PROJECT_ID

RUN npm run build

# --- Runtime stage ---
# Unprivileged Nginx listens on 8080 by default (Cloud Run expects $PORT, default 8080).
FROM nginxinc/nginx-unprivileged:1.25-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

