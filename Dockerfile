# Multi-stage Dockerfile para Câmara na Mão
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
# Usar --mode development para hot-reload em dev
ARG NODE_ENV=production
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV NODE_ENV=${NODE_ENV}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

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

# Stage 4: Production (servir build estático)
FROM nginx:alpine AS production

# Copiar build do stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Comando padrão do nginx
CMD ["nginx", "-g", "daemon off;"]
