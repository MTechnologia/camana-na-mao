# Documentação - API REST Mobile

Documentação completa sobre a implementação da API REST para aplicativos mobile do projeto Câmara na Mão.

---

## 📚 Índice

### 📖 Documentos Principais

1. **[IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md)** ⭐
   - Status atual da implementação
   - O que foi implementado
   - Próximos passos
   - **Comece por aqui se quiser saber o estado atual**

2. **[GUIA_TESTES.md](./GUIA_TESTES.md)**
   - Guia completo de testes
   - Como testar cada endpoint
   - Verificação de funcionalidades
   - Troubleshooting

3. **[TESTE_RAPIDO.md](./TESTE_RAPIDO.md)**
   - Guia rápido de testes (5 minutos)
   - Comandos essenciais
   - Verificações básicas

### 📋 Documentos de Referência

4. **[SOLUCAO_PROBLEMAS.md](./SOLUCAO_PROBLEMAS.md)** 🔧
   - Guia completo de solução de problemas
   - Erros comuns e soluções
   - Comandos de diagnóstico
   - Checklist de verificação

5. **[PLANO_IMPLEMENTACAO_API_MOBILE.md](./PLANO_IMPLEMENTACAO_API_MOBILE.md)**
   - Plano completo de implementação
   - Arquitetura proposta
   - Fases de desenvolvimento
   - Checklist de implementação

6. **[ANALISE_BACKEND_API_MOBILE.md](./ANALISE_BACKEND_API_MOBILE.md)**
   - Análise inicial do backend
   - Recomendações (muitas já implementadas)
   - Estado atual vs. análise original

7. **[ENDPOINTS_APLICACAO_MOBILE.md](./ENDPOINTS_APLICACAO_MOBILE.md)**
   - Documentação de endpoints das APIs externas (SP LEG, SPLEGIS, SISGV)
   - Nossa API REST (recomendado para mobile)
   - Exemplos de código
   - Boas práticas

---

## 🚀 Início Rápido

### 1. Verificar Status Atual

```bash
# Leia o status da implementação
cat docs/api-rest-mobile/IMPLEMENTACAO_STATUS.md
```

### 2. Testar API

```bash
# Teste rápido (5 minutos)
cat docs/api-rest-mobile/TESTE_RAPIDO.md

# Ou teste completo
cat docs/api-rest-mobile/GUIA_TESTES.md
```

### 3. Endpoint Disponível

**Base URL:** `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/`

**Endpoints:**
- `GET /vereadores` - Lista de vereadores (com paginação, filtros, busca)
- `GET /vereadores/:id` - Detalhes de um vereador

**Exemplo:**
```bash
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

---

## 📊 Estado Atual

### ✅ Implementado

- ✅ Router central (`api-router`)
- ✅ Estrutura REST (`/api/v1/`)
- ✅ Rate limiting
- ✅ Sistema de cache
- ✅ Validação com Zod
- ✅ Respostas padronizadas
- ✅ Endpoint de vereadores
- ✅ Paginação, filtros e busca

### ⏳ Pendente

- ⏳ Outros endpoints (projetos, sessões, notícias, etc.)
- ⏳ Documentação OpenAPI/Swagger
- ⏳ Testes automatizados completos
- ⏳ Logging centralizado

---

## 🔗 Links Relacionados

- [Documentação Docker](../docker-infra/) - Como usar Docker no projeto
- [Integração Docker + Backend](../api-base/INTEGRACAO_DOCKER_BACKEND.md) - Como Docker e Backend trabalham juntos
- [Análise da Documentação](../arquivo/2026-01-20_ANALISE_DOCUMENTACAO.md) - Análise completa da documentação

---

## 📝 Notas

- A API REST está em desenvolvimento ativo
- Endpoints adicionais serão adicionados conforme necessário
- Para sugestões ou problemas, consulte a documentação específica

---

**Última atualização:** Janeiro 2026
