# Documentação - Docker e Infraestrutura

Documentação completa sobre Docker e infraestrutura do projeto Câmara na Mão.

---

## 📚 Índice

### 📖 Documentos Principais

1. **[DOCKER_GUIA_RAPIDO.md](./DOCKER_GUIA_RAPIDO.md)** ⭐
   - Guia rápido de uso
   - Comandos essenciais
   - Solução de problemas
   - **Comece por aqui se quiser usar Docker**

2. **[DOCKER_PLANEJAMENTO.md](./DOCKER_PLANEJAMENTO.md)**
   - Planejamento completo
   - Arquitetura proposta
   - Decisões de design
   - Estratégias de implementação

3. **[DOCKER_RESUMO.md](./DOCKER_RESUMO.md)**
   - Resumo do que foi implementado
   - Estrutura de arquivos
   - Características implementadas

---

## 🚀 Início Rápido

### 1. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais do Supabase
# VITE_SUPABASE_URL=https://vzkwkcypkfrpfhhsghwn.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_aqui
```

### 2. Iniciar Docker

```bash
# Desenvolvimento (com hot-reload)
docker-compose up

# Ou em background
docker-compose up -d
```

### 3. Acessar Aplicação

Abra seu navegador em: **http://localhost:8080**

---

## 📊 Estado Atual

### ✅ Implementado

- ✅ Dockerfile multi-stage
- ✅ Docker Compose para desenvolvimento
- ✅ Docker Compose para produção
- ✅ Hot-reload funcionando
- ✅ Volumes configurados
- ✅ Health checks
- ✅ Network isolada

### 📝 Notas Importantes

1. **Backend não roda em Docker**
   - O backend (Edge Functions) roda no Supabase Cloud
   - Deploy via `supabase functions deploy`
   - Frontend em Docker se conecta ao backend remoto

2. **Variáveis de Ambiente**
   - Frontend usa `.env` (VITE_SUPABASE_URL, etc.)
   - Backend usa variáveis do Supabase Dashboard

3. **Integração**
   - Veja [INTEGRACAO_DOCKER_BACKEND.md](../api-base/INTEGRACAO_DOCKER_BACKEND.md) para entender como tudo funciona junto

---

## 🔗 Links Relacionados

- [Integração Docker + Backend](../api-base/INTEGRACAO_DOCKER_BACKEND.md) - Como Docker e Backend trabalham juntos
- [Documentação da API](../api-rest-mobile/) - Guias sobre o backend e API REST
- [Análise da Documentação](../arquivo/2026-01-20_ANALISE_DOCUMENTACAO.md) - Análise completa da documentação

---

## 📝 Comandos Úteis

```bash
# Ver logs
docker-compose logs -f frontend

# Rebuild
docker-compose build --no-cache

# Parar e limpar
docker-compose down -v

# Produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

**Última atualização:** Janeiro 2026
