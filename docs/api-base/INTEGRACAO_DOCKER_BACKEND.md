# 🔗 Integração Docker + Backend

Guia completo sobre como Docker e Backend trabalham juntos no projeto Câmara na Mão.

---

## 📊 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    Desenvolvimento Local                 │
│                                                          │
│  ┌──────────────┐         ┌─────────────────────────┐  │
│  │   Frontend   │         │      Backend (API)       │  │
│  │              │         │                         │  │
│  │  Docker      │◄───────┤  Supabase Cloud         │  │
│  │  Container   │         │  (Edge Functions)       │  │
│  │              │         │                         │  │
│  │  Port: 8080  │         │  Port: HTTPS (443)      │  │
│  └──────────────┘         └─────────────────────────┘  │
│                                                          │
│  Variáveis:                                              │
│  - VITE_SUPABASE_URL                                     │
│  - VITE_SUPABASE_PUBLISHABLE_KEY                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Visão Geral

### Frontend (Docker)
- ✅ Roda em container Docker
- ✅ Hot-reload habilitado
- ✅ Porta: `8080`
- ✅ Conecta ao backend via variáveis de ambiente

### Backend (Supabase Cloud)
- ✅ Edge Functions rodam no Supabase Cloud
- ✅ Não roda em Docker (deploy direto no Supabase)
- ✅ Acessível via HTTPS
- ✅ Base URL: `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/`

---

## 🚀 Workflow de Desenvolvimento

### 1. Configuração Inicial

```bash
# 1. Configure variáveis de ambiente para o frontend
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 2. Configure Supabase CLI (fora do Docker)
supabase login
supabase link --project-ref vzkwkcypkfrpfhhsghwn
```

### 2. Desenvolvimento do Frontend

```bash
# Iniciar frontend em Docker
docker-compose up frontend

# Frontend disponível em http://localhost:8080
# Hot-reload funciona automaticamente
```

### 3. Desenvolvimento do Backend

```bash
# Fazer deploy das Edge Functions (fora do Docker)
supabase functions deploy api-router

# Ver logs
supabase functions logs api-router --follow

# Testar API diretamente
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

### 4. Desenvolvimento Integrado

```bash
# Terminal 1: Frontend em Docker
docker-compose up frontend

# Terminal 2: Backend (deploy quando necessário)
supabase functions deploy api-router

# Terminal 3: Testes da API
./scripts/test-api-rest.sh
```

---

## 🔧 Configuração

### Variáveis de Ambiente

#### Frontend (Docker - arquivo `.env`)

```bash
# .env
VITE_SUPABASE_URL=https://vzkwkcypkfrpfhhsghwn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key_aqui
NODE_ENV=development
```

**Onde encontrar:**
- Dashboard Supabase > Settings > API
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_PUBLISHABLE_KEY`

#### Backend (Supabase Dashboard)

As variáveis do backend são configuradas automaticamente pelo Supabase:
- `SUPABASE_URL` - Configurado automaticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Dashboard > Settings > API
- `SUPABASE_ANON_KEY` - Dashboard > Settings > API

**Não é necessário** configurar variáveis do backend no arquivo `.env` local.

---

## 📝 Comandos Úteis

### Frontend (Docker)

```bash
# Iniciar
docker-compose up frontend

# Ver logs
docker-compose logs -f frontend

# Rebuild
docker-compose build --no-cache frontend

# Parar
docker-compose down
```

### Backend (Supabase CLI)

```bash
# Deploy da função
supabase functions deploy api-router

# Ver logs
supabase functions logs api-router --follow

# Listar funções
supabase functions list

# Aplicar migrações
supabase db push
# ou (reset completo - CUIDADO: apaga dados!)
supabase db reset
```

### Testes Integrados

```bash
# Testar API diretamente
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores

# Testar com script automatizado (recomendado)
./scripts/test-api-rest.sh

# Testar do frontend (acessar http://localhost:8080 no navegador)
# O frontend em Docker pode fazer requisições para o backend no Supabase Cloud
```

**Nota sobre o script de teste:**
- O script `test-api-rest.sh` testa todos os endpoints disponíveis
- Requer `curl` e `jq` instalados
- Mostra resultados coloridos (✅/❌) para cada teste

---

## 🔍 Fluxo de Dados

### Requisição do Frontend para Backend

```
1. Usuário acessa http://localhost:8080
   ↓
2. Frontend (React) faz requisição
   ↓
3. Requisição vai para Supabase Cloud
   URL: https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
   ↓
4. Edge Function processa requisição
   ↓
5. Resposta retorna para o frontend
   ↓
6. Frontend renderiza dados
```

### Variáveis Usadas

- **Frontend → Backend**: Usa `VITE_SUPABASE_URL` do arquivo `.env`
- **Backend**: Usa variáveis configuradas no Supabase Dashboard

---

## 🐛 Solução de Problemas

### Frontend não conecta ao backend

**Sintoma**: Erro de CORS ou "Network Error"

**Solução**:
```bash
# 1. Verificar variáveis no .env
cat .env | grep SUPABASE

# 2. Verificar se as URLs estão corretas
# VITE_SUPABASE_URL deve ser: https://vzkwkcypkfrpfhhsghwn.supabase.co

# 3. Recriar container
docker-compose down
docker-compose up --build frontend
```

### Backend não responde

**Sintoma**: 404 ou "Function not found" ou `{"code":"NOT_FOUND","message":"Requested function was not found"}`

**Solução**:
```bash
# 1. Verificar se a função está deployada
supabase functions list

# 2. Se não estiver, fazer deploy
supabase functions deploy api-router

# 3. Verificar logs
supabase functions logs api-router --follow
```

**📖 Guia completo:** Veja [SOLUCAO_PROBLEMAS.md](../api-rest-mobile/SOLUCAO_PROBLEMAS.md) para mais detalhes sobre este e outros problemas.

### CORS Error

**Sintoma**: Erro de CORS no navegador

**Solução**:
- Verificar se os headers CORS estão configurados na Edge Function
- Verificar `supabase/config.toml` - função deve ter `verify_jwt = false` se for pública

### Variáveis de ambiente não funcionam

**Sintoma**: Frontend não encontra variáveis

**Solução**:
```bash
# 1. Verificar se .env existe
ls -la .env

# 2. Verificar se variáveis começam com VITE_
# Variáveis do Vite precisam do prefixo VITE_

# 3. Recriar container
docker-compose down
docker-compose up --build
```

---

## 📚 Documentação Relacionada

### Docker
- [README.md](../docker-infra/README.md) - Índice da documentação Docker
- [DOCKER_GUIA_RAPIDO.md](../docker-infra/DOCKER_GUIA_RAPIDO.md) - Guia rápido de Docker
- [DOCKER_PLANEJAMENTO.md](../docker-infra/DOCKER_PLANEJAMENTO.md) - Planejamento completo
- [DOCKER_RESUMO.md](../docker-infra/DOCKER_RESUMO.md) - Resumo do que foi implementado

### Backend/API
- [README.md](../api-rest-mobile/README.md) - Índice da documentação da API
- [GUIA_TESTES.md](../api-rest-mobile/GUIA_TESTES.md) - Guia de testes da API
- [TESTE_RAPIDO.md](../api-rest-mobile/TESTE_RAPIDO.md) - Teste rápido da API
- [IMPLEMENTACAO_STATUS.md](../api-rest-mobile/IMPLEMENTACAO_STATUS.md) - Status da implementação
- [SOLUCAO_PROBLEMAS.md](../api-rest-mobile/SOLUCAO_PROBLEMAS.md) - Solução de problemas comuns

### Supabase
- [Documentação Oficial do Supabase CLI](https://supabase.com/docs/guides/cli) - Instalação e uso do Supabase CLI

---

## ✅ Checklist de Integração

### Primeira Vez

- [ ] Docker instalado e funcionando
- [ ] Supabase CLI instalado e configurado (veja [documentação oficial](https://supabase.com/docs/guides/cli))
- [ ] Arquivo `.env` criado com variáveis do Supabase (copiar de `.env.example`)
- [ ] Projeto linkado ao Supabase (`supabase link --project-ref vzkwkcypkfrpfhhsghwn`)
- [ ] Migrações aplicadas (`supabase db push` ou `supabase db reset`)
- [ ] Edge Functions deployadas (`supabase functions deploy api-router`)
- [ ] Frontend inicia em Docker (`docker-compose up frontend`)
- [ ] Frontend conecta ao backend (verificar no navegador em http://localhost:8080)
- [ ] API responde corretamente (testar com `curl` ou `./scripts/test-api-rest.sh`)

### Desenvolvimento Diário

- [ ] Frontend em Docker (`docker-compose up frontend`)
- [ ] Mudanças no frontend refletem automaticamente (hot-reload)
- [ ] Mudanças no backend requerem deploy (`supabase functions deploy`)
- [ ] Testes da API funcionam (`./scripts/test-api-rest.sh`)

---

## 🎓 Conceitos Importantes

### Por que Backend não está em Docker?

1. **Edge Functions do Supabase** rodam no Supabase Cloud
2. **Deploy direto** via `supabase functions deploy`
3. **Não requer Docker** - Supabase gerencia a infraestrutura
4. **Mais próximo de produção** - Ambiente idêntico ao deploy

### Por que Frontend está em Docker?

1. **Consistência** - Mesmo ambiente para todos os desenvolvedores
2. **Isolamento** - Não interfere com outras instalações locais
3. **Facilidade** - Um comando para iniciar tudo
4. **Hot-reload** - Funciona perfeitamente com volumes

### Quando usar cada ferramenta?

- **Docker**: Frontend (React/Vite)
- **Supabase CLI**: Backend (Edge Functions), Migrações, Banco de dados
- **Navegador**: Testes do frontend
- **curl/scripts**: Testes da API

---

## 📝 Notas Técnicas

### Estrutura do Dockerfile

O Dockerfile usa **multi-stage build** com 4 stages:

1. **`deps`** - Instala dependências do npm
2. **`builder`** - Build da aplicação para produção
3. **`development`** - Ambiente de desenvolvimento com hot-reload (porta 8080)
4. **`production`** - Serve build estático com Nginx (porta 80)

### Volumes no Docker Compose

**Bind mounts (read-only):**
- `./src` - Código fonte (hot-reload)
- `./public` - Arquivos públicos
- Arquivos de configuração (tsconfig, tailwind, etc.)

**Named volume:**
- `node_modules` - Cache de dependências (melhor performance)

### Variáveis de Ambiente

**Frontend (Docker - arquivo `.env`):**
- Lê do arquivo `.env` na raiz do projeto
- Variáveis precisam ter prefixo `VITE_` para serem expostas ao código
- Exemplo: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Onde encontrar:** Supabase Dashboard > Settings > API

**Backend (Supabase Dashboard):**
- Configuradas automaticamente pelo Supabase
- Não precisam ser definidas no `.env` local
- Acessíveis via `Deno.env.get()` nas Edge Functions
- Variáveis disponíveis:
  - `SUPABASE_URL` - Configurado automaticamente
  - `SUPABASE_SERVICE_ROLE_KEY` - Dashboard > Settings > API
  - `SUPABASE_ANON_KEY` - Dashboard > Settings > API

### Healthcheck

O `docker-compose.yml` inclui um healthcheck que usa `wget`:
- O healthcheck verifica se o servidor está respondendo na porta 8080
- `wget` está disponível na imagem `node:20-alpine` (não precisa instalar)
- Intervalo: 30 segundos
- Timeout: 10 segundos
- Retries: 3
- Start period: 40 segundos (tempo para o servidor iniciar)

---

**Última atualização:** Janeiro 2026
