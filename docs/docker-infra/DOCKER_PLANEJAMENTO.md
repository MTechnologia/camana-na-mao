# Planejamento Docker e Docker Compose - Câmara na Mão

## 📋 Análise do Projeto Atual

### Stack Tecnológica Identificada

1. **Frontend**
   - React 18.3.1
   - Vite 5.4.19
   - TypeScript 5.8.3
   - Tailwind CSS
   - Porta: 8080

2. **Backend/Infraestrutura**
   - Supabase (PostgreSQL + Edge Functions)
   - Edge Functions (Deno)
   - Migrações SQL
   - API REST versionada (`/api/v1/`) - Veja [docs/api-rest-mobile/](../api-rest-mobile/)

3. **Ferramentas de Desenvolvimento**
   - Supabase CLI
   - Playwright (testes E2E)
   - ESLint

### Dependências Externas

- Node.js (versão LTS recomendada)
- npm
- Supabase CLI (para desenvolvimento local)
- Docker e Docker Compose

---

## 🎯 Objetivos da Dockerização

1. **Ambiente de Desenvolvimento Consistente**
   - Eliminar problemas de "funciona na minha máquina"
   - Padronizar versões de Node.js e dependências
   - Facilitar onboarding de novos desenvolvedores

2. **Isolamento de Serviços**
   - Frontend isolado em container
   - Supabase local em container
   - Fácil gerenciamento de dependências

3. **Facilidade de Deploy**
   - Preparar para CI/CD
   - Facilitar deploy em diferentes ambientes
   - Versionamento de infraestrutura

4. **Produtividade**
   - Inicialização rápida do ambiente
   - Hot-reload mantido
   - Integração com ferramentas existentes

---

## 🏗️ Arquitetura Proposta

### Estrutura de Containers

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Supabase   │  │
│  │  (React/Vite)│◄───┤  (Local Dev) │  │
│  │   Port: 8080 │    │  Port: 54321 │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐                       │
│  │   Volumes    │                       │
│  │  - node_modules│                     │
│  │  - supabase_db│                      │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

### Serviços Planejados

1. **frontend** (React/Vite)
   - Base: Node.js LTS
   - Hot-reload habilitado
   - Volume para código fonte
   - Volume para node_modules (cache)

2. **supabase** (Opcional - para desenvolvimento local completo)
   - Usar Supabase CLI via Docker
   - Ou usar imagem oficial do Supabase
   - Banco de dados PostgreSQL
   - Edge Functions
   - Studio (interface web)

---

## 📁 Arquivos a Criar

### 1. `Dockerfile`
- Multi-stage build para otimização
- Stage de desenvolvimento
- Stage de produção (build estático)

### 2. `docker-compose.yml`
- Configuração de serviços
- Networks
- Volumes
- Variáveis de ambiente

### 3. `docker-compose.dev.yml` (Opcional)
- Override para desenvolvimento
- Hot-reload
- Debugging

### 4. `docker-compose.prod.yml` (Opcional)
- Override para produção
- Otimizações
- Nginx para servir build estático

### 5. `.dockerignore`
- Excluir arquivos desnecessários
- Reduzir tamanho do contexto

### 6. `.env.example`
- Template de variáveis de ambiente
- Documentação de configurações

---

## 🔧 Estratégias de Implementação

### Fase 1: Frontend Básico (Prioritário)

**Objetivo**: Dockerizar apenas o frontend para desenvolvimento

**Arquivos**:
- `Dockerfile` (multi-stage)
- `docker-compose.yml` (serviço frontend)
- `.dockerignore`

**Comandos**:
```bash
docker-compose up frontend
```

**Benefícios**:
- Ambiente isolado
- Versão de Node.js controlada
- Fácil de compartilhar

### Fase 2: Integração com Supabase Local (Opcional)

**Objetivo**: Incluir Supabase local no Docker Compose

**Considerações**:
- Supabase CLI pode ser usado via Docker
- Ou usar imagem oficial: `supabase/postgres`
- Configurar volumes para persistência

**Desafios**:
- Supabase CLI requer Docker (Docker-in-Docker pode ser necessário)
- Migrações precisam ser aplicadas
- Edge Functions precisam ser servidas

**Alternativa**:
- Manter Supabase remoto e apenas dockerizar frontend
- Ou usar Supabase CLI localmente e apenas frontend no Docker

### Fase 3: Otimizações e Produção

**Objetivo**: Preparar para deploy em produção

**Melhorias**:
- Build otimizado
- Nginx para servir assets estáticos
- Health checks
- Logging estruturado

---

## 🚀 Comandos Planejados

### Desenvolvimento

```bash
# Iniciar ambiente completo
docker-compose up

# Iniciar apenas frontend
docker-compose up frontend

# Rebuild após mudanças no Dockerfile
docker-compose build --no-cache

# Ver logs
docker-compose logs -f frontend

# Parar serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v
```

### Build e Deploy

```bash
# Build de produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Executar em produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## ⚙️ Configurações Necessárias

### Variáveis de Ambiente

**Frontend** (usado no Docker):
- `VITE_SUPABASE_URL` - URL do Supabase (ex: `https://vzkwkcypkfrpfhhsghwn.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Chave pública do Supabase (anon key)
- `NODE_ENV` - Ambiente (development/production)

**Backend** (Edge Functions - configurado no Supabase Dashboard):
- `SUPABASE_URL` - URL do Supabase (já configurado automaticamente)
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (para operações privilegiadas)
- `SUPABASE_ANON_KEY` - Chave anônima (para operações públicas)

**Nota**: O backend não usa variáveis do arquivo `.env` local. As variáveis são configuradas no Supabase Dashboard ou via CLI.

**Supabase Local** (se implementado):
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`

### Portas

- `8080` - Frontend (Vite dev server)
- `54321` - Supabase API (se local)
- `54322` - Supabase DB (se local)
- `54323` - Supabase Studio (se local)

### Volumes

- `./src` - Código fonte (bind mount para hot-reload)
- `./node_modules` - Dependências (named volume para cache)
- `./supabase` - Configuração Supabase
- `supabase_db_data` - Dados do PostgreSQL (se local)

---

## 🔄 Workflow de Desenvolvimento

### Cenário 1: Apenas Frontend Dockerizado (Implementado)

1. Desenvolvedor clona repositório
2. Cria arquivo `.env` com variáveis do Supabase
3. Executa `docker-compose up frontend`
4. Frontend roda em container com hot-reload
5. Supabase continua sendo usado remotamente
6. Backend (Edge Functions) é deployado no Supabase Cloud usando `supabase functions deploy`

**Vantagens**:
- Simples de implementar
- Não requer Docker-in-Docker
- Mantém Supabase remoto (mais próximo de produção)
- Backend e frontend podem ser desenvolvidos independentemente

**Nota**: Este é o cenário atual implementado. Para desenvolver o backend, use o Supabase CLI localmente (fora do Docker) para fazer deploy das Edge Functions.

### Cenário 2: Stack Completa Dockerizada

1. Desenvolvedor clona repositório
2. Executa `docker-compose up`
3. Frontend e Supabase local iniciam
4. Migrações são aplicadas automaticamente
5. Ambiente 100% isolado

**Vantagens**:
- Ambiente completamente isolado
- Não depende de serviços externos
- Testes offline

**Desvantagens**:
- Mais complexo de configurar
- Pode requerer Docker-in-Docker
- Mais recursos do sistema

---

## 📊 Decisões de Design

### 1. Multi-stage Dockerfile

**Decisão**: Usar multi-stage build

**Razão**:
- Otimiza tamanho da imagem final
- Separa dependências de dev e produção
- Facilita CI/CD

### 2. Volume para node_modules

**Decisão**: Usar named volume para node_modules

**Razão**:
- Evita problemas de permissão
- Cache entre rebuilds
- Melhor performance

### 3. Bind Mount para Código

**Decisão**: Usar bind mount para código fonte

**Razão**:
- Hot-reload funciona
- Mudanças refletem imediatamente
- Facilita debugging

### 4. Supabase Local (Opcional)

**Decisão**: Implementar como opcional

**Razão**:
- Supabase remoto é mais simples
- Docker-in-Docker adiciona complexidade
- Pode ser adicionado depois se necessário

---

## 🧪 Testes e Validação

### Checklist de Implementação

- [ ] Dockerfile criado e testado
- [ ] docker-compose.yml funcional
- [ ] Hot-reload funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] .dockerignore configurado
- [ ] Documentação atualizada
- [ ] Testes E2E funcionando (se aplicável)

### Testes a Realizar

1. **Build da Imagem**
   ```bash
   docker build -t camana-na-mao:test .
   ```

2. **Execução do Container**
   ```bash
   docker run -p 8080:8080 camana-na-mao:test
   ```

3. **Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Hot-reload**
   - Fazer mudança no código
   - Verificar se reflete no navegador

5. **Conexão com Supabase**
   - Verificar se frontend conecta
   - Testar autenticação
   - Testar queries

---

## 📝 Próximos Passos

1. **Implementar Fase 1** (Frontend básico)
   - Criar Dockerfile
   - Criar docker-compose.yml
   - Criar .dockerignore
   - Testar localmente

2. **Documentar Uso**
   - Atualizar README.md
   - Criar guia de início rápido
   - Documentar variáveis de ambiente

3. **Integrar com CI/CD** (Futuro)
   - GitHub Actions
   - Build automático
   - Deploy automatizado

4. **Otimizações** (Futuro)
   - Multi-stage otimizado
   - Cache layers
   - Build paralelo

---

## ⚠️ Considerações Importantes

### Limitações Conhecidas

1. **Supabase CLI no Docker**
   - Pode requerer Docker-in-Docker
   - Alternativa: usar Supabase remoto

2. **Playwright no Docker**
   - Requer dependências adicionais
   - Pode precisar de imagem específica

3. **Performance**
   - Bind mounts podem ser mais lentos em alguns sistemas
   - Considerar usar volumes para node_modules

### Boas Práticas

1. **Não commitar .env**
   - Usar .env.example
   - Documentar variáveis necessárias

2. **Versionar Dockerfiles**
   - Manter histórico
   - Tagar versões

3. **Otimizar Layers**
   - Ordem de comandos no Dockerfile
   - Cache de layers

4. **Segurança**
   - Não expor credenciais
   - Usar secrets do Docker
   - Scans de vulnerabilidades

---

## 📚 Referências

### Documentação Interna

- [Integração Docker + Backend](../api-base/INTEGRACAO_DOCKER_BACKEND.md) - Como Docker e Backend trabalham juntos
- [Documentação da API](../api-rest-mobile/) - Guias sobre o backend e API REST

### Documentação Externa

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Vite Docker Guide](https://vitejs.dev/guide/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## ✅ Resumo Executivo

**Objetivo**: Dockerizar o projeto Câmara na Mão para facilitar desenvolvimento e deploy.

**Abordagem**: Implementação incremental, começando pelo frontend e expandindo conforme necessário.

**Prioridade**: Fase 1 (Frontend básico) é suficiente para a maioria dos casos de uso.

**Complexidade**: Baixa a Média (dependendo se Supabase local é incluído).

**Tempo Estimado**: 2-4 horas para implementação completa da Fase 1.
