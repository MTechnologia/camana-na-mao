# Critérios de Aceite - Integrações

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Critérios de aceite para integrações externas

---

## 📋 Índice

1. [Portal CMSP](#1-portal-cmsp)
2. [SP Legis](#2-sp-legis)
3. [Audiências Públicas](#3-audiências-públicas)
4. [Google Maps Places API](#4-google-maps-places-api)
5. [N8N Workflows](#5-n8n-workflows)
6. [Knowledge Base (RAG)](#6-knowledge-base-rag)

---

## 1. Portal CMSP

### 1.1 Sincronização de Notícias

**Descrição:** Sistema sincroniza notícias do Portal CMSP

**Critérios:**
- ✅ Edge Function `fetch-noticias` funciona
- ✅ Busca notícias do WordPress/Portal CMSP
- ✅ Armazena em cache (`news_cache`)
- ✅ Atualização a cada 15 minutos (ou configurável)
- ✅ Tratamento de erros funciona
- ✅ Notícias são exibidas no frontend
- ✅ Cache evita requisições excessivas

**Como Validar:**
1. Verificar logs da função `fetch-noticias`
2. Verificar tabela `news_cache` no banco
3. Verificar que notícias aparecem no frontend
4. Verificar frequência de atualização
5. Simular erro → verificar tratamento

**Evidências:**
- Logs da Edge Function
- Query SQL: `SELECT * FROM news_cache ORDER BY created_at DESC LIMIT 10`
- Screenshot do frontend
- Arquivo: `supabase/functions/fetch-noticias/index.ts`

**Status:** ✅ Aprovado

---

### 1.2 Sincronização de Agenda

**Descrição:** Sistema sincroniza agenda do Portal CMSP

**Critérios:**
- ✅ Edge Function `fetch-agenda` funciona
- ✅ Busca eventos da agenda
- ✅ Armazena em cache (`agenda_cache`)
- ✅ Atualização a cada 15 minutos
- ✅ Eventos são exibidos no frontend
- ✅ Filtros por data funcionam

**Como Validar:**
1. Verificar logs da função `fetch-agenda`
2. Verificar tabela `agenda_cache`
3. Verificar que eventos aparecem no frontend
4. Testar filtros

**Evidências:**
- Logs da Edge Function
- Query SQL: `SELECT * FROM agenda_cache ORDER BY date DESC`
- Screenshot do frontend
- Arquivo: `supabase/functions/fetch-agenda/index.ts`

**Status:** ✅ Aprovado

---

## 2. SP Legis

### 2.1 Sincronização de Vereadores

**Descrição:** Sistema sincroniza dados de vereadores do SP Legis

**Critérios:**
- ✅ Edge Function `fetch-vereadores` funciona
- ✅ Busca dados de vereadores da API SP Legis
- ✅ Armazena em cache (`council_members_cache`)
- ✅ Atualização diária (ou configurável)
- ✅ Dados incluem: nome, partido, foto, comissões
- ✅ Vereadores são exibidos no frontend
- ✅ Busca de vereadores funciona

**Como Validar:**
1. Verificar logs da função `fetch-vereadores`
2. Verificar tabela `council_members_cache`
3. Verificar que vereadores aparecem no frontend
4. Testar busca de vereadores
5. Verificar frequência de atualização

**Evidências:**
- Logs da Edge Function
- Query SQL: `SELECT * FROM council_members_cache LIMIT 10`
- Screenshot do frontend
- Arquivo: `supabase/functions/fetch-vereadores/index.ts`

**Status:** ✅ Aprovado

---

### 2.2 Sugestão de Vereadores

**Descrição:** Sistema sugere vereadores relevantes para relatos

**Critérios:**
- ✅ Edge Function `suggest-council-members` funciona
- ✅ Analisa conteúdo do relato
- ✅ Sugere vereadores por região/tema
- ✅ Retorna dados completos do vereador
- ✅ Autenticação JWT funciona
- ✅ Tratamento de erros funciona

**Como Validar:**
1. Criar relato urbano
2. Clicar em "Encaminhar para vereador"
3. Verificar que sugestões aparecem
4. Verificar logs da função
5. Testar com relato sem localização → deve tratar erro

**Evidências:**
- Logs da Edge Function
- Screenshot das sugestões
- Arquivo: `supabase/functions/suggest-council-members/index.ts`

**Status:** ✅ Aprovado

---

## 3. Audiências Públicas

### 3.1 Busca de Audiências

**Descrição:** Sistema busca audiências do Portal CMSP

**Critérios:**
- ✅ Integração com Portal CMSP funciona
- ✅ Busca audiências disponíveis
- ✅ Filtros por tema funcionam
- ✅ Filtros por data funcionam
- ✅ Busca textual funciona
- ✅ Dados são exibidos no frontend

**Como Validar:**
1. Acessar `/audiencias`
2. Verificar lista de audiências
3. Testar filtros
4. Testar busca
5. Verificar que dados estão atualizados

**Evidências:**
- Screenshot da lista
- Logs de busca
- Arquivo: `src/pages/audiencias/`

**Status:** ✅ Aprovado

---

### 3.2 Inscrição em Audiências

**Descrição:** Sistema permite inscrição em audiências

**Critérios:**
- ✅ Inscrição é salva no banco
- ✅ Confirmação é exibida
- ✅ Status é atualizado
- ✅ Cancelamento funciona
- ✅ Notificação é enviada (se configurado)

**Como Validar:**
1. Clicar em "Inscrever-se"
2. Verificar confirmação
3. Verificar registro no banco
4. Testar cancelamento

**Evidências:**
- Registro na tabela `audiencia_participations`
- Screenshot da confirmação

**Status:** ✅ Aprovado

---

## 4. Google Maps Places API

### 4.1 Busca de Serviços Próximos

**Descrição:** Sistema encontra serviços públicos próximos usando Google Maps

**Critérios:**
- ✅ Integração com Google Places API funciona
- ✅ Busca por tipo de serviço funciona
- ✅ Geolocalização funciona (com permissão)
- ✅ Resultados são exibidos no mapa
- ✅ Distância é calculada
- ✅ Detalhes do serviço são exibidos
- ✅ Tratamento de erro de permissão funciona

**Como Validar:**
1. Acessar `/servicos-proximos`
2. Permitir localização
3. Verificar serviços no mapa
4. Testar filtros por tipo
5. Clicar em serviço → ver detalhes
6. Testar sem permissão → deve tratar erro

**Evidências:**
- Screenshot do mapa
- Logs da API
- Arquivo: `src/pages/NearbyServicesPage.tsx`
- Arquivo: `supabase/functions/google-places-autocomplete/index.ts`

**Status:** ✅ Aprovado

---

### 4.2 Autocomplete de Endereços

**Descrição:** Sistema oferece autocomplete de endereços

**Critérios:**
- ✅ Edge Function `google-places-autocomplete` funciona
- ✅ Sugestões aparecem enquanto digita
- ✅ Seleção preenche campos automaticamente
- ✅ Validação de endereço funciona
- ✅ Tratamento de erros funciona

**Como Validar:**
1. Digitar endereço em campo de localização
2. Verificar sugestões
3. Selecionar sugestão
4. Verificar que campos são preenchidos

**Evidências:**
- Screenshot do autocomplete
- Logs da função
- Arquivo: `supabase/functions/google-places-autocomplete/index.ts`

**Status:** ✅ Aprovado

---

## 5. N8N Workflows

### 5.1 Notificação de Relatos

**Descrição:** Sistema notifica N8N sobre novos relatos

**Critérios:**
- ✅ Edge Function `notify-n8n` funciona
- ✅ Notifica quando relato é criado
- ✅ Payload contém dados completos
- ✅ Tratamento de erro funciona
- ✅ Retry funciona (se configurado)
- ✅ Webhook do N8N recebe dados

**Como Validar:**
1. Criar relato urbano
2. Verificar logs da função `notify-n8n`
3. Verificar que N8N recebeu dados
4. Simular erro → verificar tratamento

**Evidências:**
- Logs da Edge Function
- Logs do N8N
- Arquivo: `supabase/functions/notify-n8n/index.ts`

**Status:** ✅ Aprovado

---

### 5.2 Callback do N8N

**Descrição:** N8N pode fazer callback para atualizar status

**Critérios:**
- ✅ Edge Function `n8n-callback` funciona
- ✅ Recebe atualizações de status
- ✅ Atualiza relato no banco
- ✅ Validação de dados funciona
- ✅ Autenticação funciona (se configurada)

**Como Validar:**
1. Simular callback do N8N
2. Verificar que status é atualizado
3. Verificar validações
4. Testar com dados inválidos → deve tratar erro

**Evidências:**
- Logs da Edge Function
- Query SQL verificando atualização
- Arquivo: `supabase/functions/n8n-callback/index.ts`

**Status:** ✅ Aprovado

---

## 6. Knowledge Base (RAG)

### 6.1 Geração de Embeddings

**Descrição:** Sistema gera embeddings para busca semântica

**Critérios:**
- ✅ Edge Function `generate-embeddings` funciona
- ✅ Gera embeddings de documentos
- ✅ Armazena embeddings no banco
- ✅ Integração com modelo de embeddings funciona
- ✅ Tratamento de erros funciona

**Como Validar:**
1. Executar função de geração
2. Verificar que embeddings são gerados
3. Verificar armazenamento no banco
4. Testar com documento inválido → deve tratar erro

**Evidências:**
- Logs da Edge Function
- Query SQL verificando embeddings
- Arquivo: `supabase/functions/generate-embeddings/index.ts`

**Status:** ✅ Aprovado

---

### 6.2 Busca Semântica (RAG)

**Descrição:** Sistema usa RAG para buscar informações relevantes

**Critérios:**
- ✅ Busca semântica funciona
- ✅ Retorna documentos relevantes
- ✅ Usa embeddings para busca
- ✅ Limita resultados (top K)
- ✅ Resposta da IA usa contexto encontrado

**Como Validar:**
1. Fazer pergunta no chat
2. Verificar que busca semântica é executada
3. Verificar que documentos relevantes são encontrados
4. Verificar que resposta usa contexto

**Evidências:**
- Logs mostrando busca
- Documentos retornados
- Resposta da IA com contexto

**Status:** ✅ Aprovado

---

## 📊 Resumo

| Integração | Critérios | Status |
|------------|-----------|--------|
| Portal CMSP | 2 | ✅ |
| SP Legis | 2 | ✅ |
| Audiências | 2 | ✅ |
| Google Maps | 2 | ✅ |
| N8N | 2 | ✅ |
| Knowledge Base | 2 | ✅ |
| **TOTAL** | **12** | **✅ 100%** |

---

## 🔧 Tratamento de Erros

### Critérios Gerais

**Descrição:** Todas as integrações devem tratar erros adequadamente

**Critérios:**
- ✅ Erros de rede são tratados
- ✅ Erros de autenticação são tratados
- ✅ Erros de validação são tratados
- ✅ Timeouts são tratados
- ✅ Mensagens de erro são claras
- ✅ Logs de erro são registrados
- ✅ Retry funciona (quando aplicável)
- ✅ Fallback funciona (quando aplicável)

**Como Validar:**
1. Simular cada tipo de erro
2. Verificar tratamento
3. Verificar mensagens
4. Verificar logs

**Evidências:**
- Logs de erros
- Mensagens de erro no frontend

**Status:** ✅ Aprovado

---

## ⏱️ Performance de Integrações

### Critérios Gerais

**Descrição:** Integrações devem ter performance adequada

**Critérios:**
- ✅ Tempo de resposta <5s para APIs externas
- ✅ Cache reduz requisições desnecessárias
- ✅ Timeout configurado adequadamente
- ✅ Rate limiting respeitado

**Como Validar:**
1. Medir tempo de resposta
2. Verificar uso de cache
3. Verificar timeouts
4. Verificar rate limits

**Evidências:**
- Logs de performance
- Métricas de tempo de resposta

**Status:** ✅ Aprovado

---

**Última atualização:** 2026-01-31
