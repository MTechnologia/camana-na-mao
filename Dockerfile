# Multi-stage Dockerfile para Câmara na Mão
# Suporta desenvolvimento (hot-reload) e produção (Cloud Run friendly)

# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Instalar dependências do sistema necessárias
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Build da aplicação
# Suporta variáveis CAMARA_* (novas), VITE_SUPABASE_* (legado) e VITE_GOOGLE_MAPS_API_KEY (mapa)
ARG NODE_ENV=production
ARG CAMARA_URL
ARG CAMARA_PUBLISHABLE_KEY
ARG CAMARA_PROJECT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_MAPBOX_ACCESS_TOKEN

ENV NODE_ENV=${NODE_ENV}
ENV CAMARA_URL=${CAMARA_URL}
ENV CAMARA_PUBLISHABLE_KEY=${CAMARA_PUBLISHABLE_KEY}
ENV CAMARA_PROJECT_ID=${CAMARA_PROJECT_ID}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN}

RUN npm run build

# Stage 3: Development (para hot-reload)
FROM node:20-alpine AS development

WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Expor porta do Vite
EXPOSE 8080

# Comando para desenvolvimento com hot-reload
CMD ["npm", "run", "dev"]

# Stage 4: Production (servir build estático com Nginx)
# Usa nginx-unprivileged para Cloud Run (porta 8080)
FROM nginxinc/nginx-unprivileged:1.25-alpine AS production

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build do stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 8080 (padrão do Cloud Run)
EXPOSE 8080
