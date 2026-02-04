# Arquitetura n8n-Cêntrica Robusta
## Para 200+ Acessos Simultâneos

**Data:** 2026-01-28  
**Versão:** 2.0 - Pós-Reunião

---

## 🎯 Mudança de Arquitetura

### Antes (Híbrida com Edge Functions)
- Supabase Edge Functions → vLLM direto
- n8n apenas para processamento assíncrono
- Separação de responsabilidades

### Agora (n8n-Cêntrica) ✅
- **Tudo passa pelo n8n**
- n8n orquestra todas as chamadas de IA
- Melhor manutenção e observabilidade
- Workflows visuais para todo o fluxo

---

## 🏗️ Arquitetura Proposta

```
┌─────────────┐
│   Usuário   │
│  (App/Web)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Supabase      │
│  (Edge Func)    │ ← Apenas proxy/autenticação
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         n8n Cloud Run                │
│    (Auto-scaling: 5-50 instâncias)  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Workflow Principal (Chat)   │  │
│  │  - Recebe requisição          │  │
│  │  - Chama vLLM (Llama/GPT)     │  │
│  │  - Processa resposta          │  │
│  │  - Retorna ao usuário         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Workflow Embeddings          │  │
│  │  - Busca semântica            │  │
│  │  - RAG                        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Workflow Assíncrono           │  │
│  │  - Enriquecimento de relatos   │  │
│  │  - Análise de sentimento       │  │
│  └───────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  vLLM    │   │Embeddings│   │  Fallback│
│ (Llama)  │   │   (TEI)  │   │  (GPT)   │
└──────────┘   └──────────┘   └──────────┘
```

---

## 📊 Dimensionamento para 200+ Acessos Simultâneos

### Requisitos de Performance

| Métrica | Requisito | Solução |
|---------|-----------|---------|
| **Acessos simultâneos** | 200+ | Auto-scaling (5-50 instâncias) |
| **Latência p95** | < 3s | vLLM otimizado + cache |
| **Throughput** | 1000+ req/min | Load balancer + múltiplas instâncias |
| **Disponibilidade** | 99.9% | Múltiplas zonas + health checks |
| **Escalabilidade** | Automática | Cloud Run auto-scaling |

### Configuração n8n Cloud Run (Robusta)

```bash
# Deploy n8n com alta capacidade
gcloud run deploy n8n-orchestrator \
  --image=n8nio/n8n:latest \
  --region=southamerica-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=4 \
  --min-instances=5 \
  --max-instances=50 \
  --timeout=3600 \
  --concurrency=40 \
  --port=5678 \
  --set-env-vars="N8N_BASIC_AUTH_ACTIVE=true,N8N_BASIC_AUTH_USER=admin" \
  --set-secrets="N8N_BASIC_AUTH_PASSWORD=n8n-admin-password:latest" \
  --set-env-vars="N8N_METRICS=true,N8N_LOG_LEVEL=info" \
  --vpc-connector=n8n-connector \
  --vpc-egress=all-traffic
```

**Parâmetros explicados:**
- `--min-instances=5`: Sempre 5 instâncias rodando (evita cold start)
- `--max-instances=50`: Até 50 instâncias (suporta picos)
- `--concurrency=40`: 40 requisições por instância = 2000 req simultâneas (50 × 40)
- `--memory=4Gi`: Mais memória para workflows complexos
- `--cpu=4`: Mais CPU para processamento paralelo

### Cálculo de Capacidade

**Cenário: 200 acessos simultâneos**
- Instâncias necessárias: `200 / 40 = 5 instâncias`
- Com margem de segurança (50%): `5 × 1.5 = 7-8 instâncias`
- **Configuração**: `min-instances=5`, `max-instances=50` ✅

**Cenário: Pico de 500 acessos simultâneos**
- Instâncias necessárias: `500 / 40 = 12-13 instâncias`
- **Auto-scaling**: Escala automaticamente até 50 instâncias ✅

---

## 🤖 Comparativo: Llama 3.1 8B vs GPT-4 para Contextualização

### Tabela Comparativa

| Aspecto | Llama 3.1 8B (Self-hosted) | GPT-4 (OpenAI) | Vencedor |
|---------|---------------------------|----------------|----------|
| **Contextualização** | ⭐⭐⭐⭐ Muito Boa | ⭐⭐⭐⭐⭐ Excelente | **GPT-4** |
| **Contexto Máximo** | 128K tokens | 128K tokens | **Empate** |
| **Português BR** | ⭐⭐⭐⭐ Muito Bom | ⭐⭐⭐⭐⭐ Excelente | **GPT-4** |
| **LGPD** | ✅ **100% Brasil** | ❌ EUA (não atende) | **Llama** |
| **Custo (alto volume)** | ~R$ 1.200/mês (fixo) | ~R$ 15-30k/mês (variável) | **Llama** |
| **Latência** | 1-3s (VPC interna) | 2-5s (internet) | **Llama** |
| **Privacidade** | ✅ Dados não saem | ❌ Dados enviados para OpenAI | **Llama** |
| **Customização** | ✅ Total | ❌ Limitada | **Llama** |
| **Disponibilidade** | ⚠️ Depende de você | ✅ 99.9% SLA | **GPT-4** |
| **Manutenção** | ⚠️ Você gerencia | ✅ Zero | **GPT-4** |

### Análise Detalhada

#### Contextualização

**GPT-4:**
- ✅ Melhor compreensão de contexto complexo
- ✅ Melhor raciocínio multi-hop
- ✅ Melhor manutenção de contexto em conversas longas
- ✅ Melhor para português brasileiro (treinamento superior)

**Llama 3.1 8B:**
- ✅ Boa contextualização (8B parâmetros)
- ✅ 128K tokens de contexto (igual GPT-4)
- ⚠️ Ligeiramente inferior ao GPT-4 em raciocínio complexo
- ⚠️ Português bom, mas não tão refinado quanto GPT-4

**Veredito Contextualização:** GPT-4 é superior, mas diferença não é crítica para maioria dos casos.

#### LGPD e Privacidade

**GPT-4 (OpenAI):**
- ❌ **Dados processados nos EUA** (viola LGPD)
- ❌ Dados pessoais de cidadãos brasileiros saem do país
- ❌ Risco legal: multas de até R$ 50 milhões
- ❌ Sem controle sobre retenção de dados

**Llama 3.1 8B (Self-hosted):**
- ✅ **Dados processados no Brasil** (`southamerica-east1`)
- ✅ Dados não saem da infraestrutura
- ✅ Conformidade LGPD garantida
- ✅ Controle total sobre dados

**Veredito LGPD:** Llama é obrigatório se LGPD for requisito.

---

## 💡 Recomendação: Arquitetura Híbrida Inteligente

### Estratégia: Llama Principal + GPT Fallback Seletivo

```
┌─────────────────────────────────────┐
│         n8n (Orquestrador)          │
│                                     │
│  1. Tenta Llama 3.1 8B (Self)      │
│     ↓ (se falhar ou precisar GPT)  │
│  2. Fallback para GPT-4 (OpenAI)    │
│     ↓ (apenas se necessário)       │
│  3. Retorna resposta                │
└─────────────────────────────────────┘
```

### Regras de Fallback

**Usar Llama (Self-hosted):**
- ✅ Conversas normais (95% dos casos)
- ✅ Dados pessoais (LGPD obrigatório)
- ✅ Relatos de cidadãos
- ✅ Consultas gerais

**Usar GPT-4 (Fallback):**
- ⚠️ Apenas quando Llama falhar (timeout/erro)
- ⚠️ Apenas para análises complexas (sem dados pessoais)
- ⚠️ Apenas com consentimento explícito do usuário
- ⚠️ Logs e auditoria obrigatórios

### Implementação no n8n

```javascript
// Workflow n8n - Lógica de Fallback
const useLlama = true; // Sempre tentar Llama primeiro
const useGPTFallback = false; // Apenas se necessário

try {
  // Tentar Llama primeiro
  const llamaResponse = await fetch('http://10.158.0.X:8000/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'TheBloke/Llama-3.1-8B-Instruct-AWQ',
      messages: messages,
      max_tokens: 2000
    })
  });
  
  if (llamaResponse.ok) {
    return await llamaResponse.json();
  }
} catch (error) {
  console.log('Llama falhou, tentando GPT-4...');
}

// Fallback para GPT-4 (apenas se necessário e sem dados pessoais)
if (useGPTFallback && !containsPersonalData(messages)) {
  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      max_tokens: 2000
    })
  });
  
  return await gptResponse.json();
}
```

---

## 💰 Custos Atualizados (Arquitetura Robusta)

### Infraestrutura Self-hosted

| Componente | Especificação | Custo Mensal |
|------------|---------------|--------------|
| **n8n Cloud Run** | 5-50 instâncias (auto-scaling) | ~R$ 1.500-3.000 |
| **VM Chat (GPU)** | n1-standard-4 + T4 (preemptible) | ~R$ 1.200 |
| **VM Embeddings** | e2-standard-4 | ~R$ 200 |
| **Load Balancer** | Global HTTPS LB | ~R$ 200 |
| **Storage/Network** | 200GB SSD + tráfego | ~R$ 300 |
| **Subtotal Self-hosted** | | **~R$ 3.400-4.900** |

### Fallback GPT-4 (Opcional - Uso Mínimo)

| Uso | Custo Mensal |
|-----|--------------|
| **Fallback apenas** (5% das requisições) | ~R$ 500-1.000 |
| **Uso moderado** (10% das requisições) | ~R$ 1.500-3.000 |
| **Uso alto** (20% das requisições) | ~R$ 3.000-6.000 |

### **TOTAL ESTIMADO: R$ 3.900 - R$ 10.900/mês**

**Cenário Conservador (95% Llama, 5% GPT):** ~R$ 3.900-4.900/mês  
**Cenário Moderado (90% Llama, 10% GPT):** ~R$ 4.900-7.900/mês

---

## 🚀 Implementação: n8n-Cêntrica Robusta

### Passo 1: Atualizar n8n Cloud Run

```bash
# Atualizar para configuração robusta
gcloud run services update n8n-orchestrator \
  --region=southamerica-east1 \
  --memory=4Gi \
  --cpu=4 \
  --min-instances=5 \
  --max-instances=50 \
  --concurrency=40
```

### Passo 2: Criar Workflow Principal no n8n

**Estrutura do Workflow:**

```
[Webhook] → [Validar Auth] → [Extrair Dados] → [IF: Tem dados pessoais?]
                                                      │
                    ┌─────────────────────────────────┴─────────────────────┐
                    │                                                       │
                    ▼                                                       ▼
            [Chamar Llama]                                          [Chamar Llama]
                    │                                                       │
                    ├── [Se falhar] ──→ [IF: Pode usar GPT?] ──→ [Chamar GPT-4]
                    │                                                       │
                    └───────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                            [Processar Resposta]
                                                      │
                                                      ▼
                                            [Retornar ao Usuário]
```

### Passo 3: Configurar Variáveis de Ambiente

```bash
# Adicionar variáveis no Cloud Run
gcloud run services update n8n-orchestrator \
  --region=southamerica-east1 \
  --update-env-vars="LLAMA_BASE_URL=http://10.158.0.X:8000/v1,LLAMA_MODEL=TheBloke/Llama-3.1-8B-Instruct-AWQ,OPENAI_API_KEY=sk-...,USE_GPT_FALLBACK=false"
```

---

## 📊 Monitoramento e Observabilidade

### Métricas Críticas

1. **Latência p50/p95/p99**
2. **Taxa de erro (4xx/5xx)**
3. **Número de instâncias ativas**
4. **Uso de CPU/memória**
5. **Taxa de fallback (Llama → GPT)**
6. **Custo por requisição**

### Alertas Configurados

- ⚠️ Latência p95 > 5s
- ⚠️ Taxa de erro > 1%
- ⚠️ Instâncias > 40 (próximo do limite)
- ⚠️ Fallback rate > 10% (investigar Llama)

---

## ✅ Vantagens da Arquitetura n8n-Cêntrica

### 1. Manutenção
- ✅ **Workflows visuais**: Fácil entender e modificar
- ✅ **Versionamento**: Histórico de mudanças
- ✅ **Testes**: Executar workflows isoladamente
- ✅ **Debug**: Logs detalhados por node

### 2. Escalabilidade
- ✅ **Auto-scaling**: 5-50 instâncias automaticamente
- ✅ **Load balancing**: Distribuição automática
- ✅ **Health checks**: Remoção de instâncias degradadas

### 3. Observabilidade
- ✅ **Logs centralizados**: Todos os workflows
- ✅ **Métricas**: Performance por workflow
- ✅ **Rastreabilidade**: End-to-end tracking

### 4. Flexibilidade
- ✅ **Mudanças rápidas**: Sem deploy de código
- ✅ **A/B testing**: Testar diferentes modelos
- ✅ **Feature flags**: Ativar/desativar funcionalidades

---

## 🎯 Recomendação Final

### Modelo Principal: **Llama 3.1 8B (Self-hosted)**

**Razões:**
1. ✅ **LGPD**: Obrigatório para dados pessoais
2. ✅ **Custo**: 10-20x mais barato que GPT-4
3. ✅ **Privacidade**: Dados não saem do Brasil
4. ✅ **Performance**: Latência baixa (VPC interna)
5. ✅ **Contextualização**: Boa o suficiente (8B parâmetros, 128K tokens)

### Fallback: **GPT-4 (Apenas quando necessário)**

**Quando usar:**
- ⚠️ Llama falhou (timeout/erro)
- ⚠️ Análise muito complexa (sem dados pessoais)
- ⚠️ Com consentimento explícito do usuário

### Arquitetura: **n8n-Cêntrica**

**Configuração:**
- **n8n Cloud Run**: 5-50 instâncias (auto-scaling)
- **Concorrência**: 40 req/instância = 2000 req simultâneas
- **Capacidade**: Suporta 200+ acessos simultâneos com folga

---

## 📋 Próximos Passos

1. **Aprovar arquitetura n8n-cêntrica**
2. **Aprovar orçamento**: R$ 3.900-4.900/mês (conservador)
3. **Configurar n8n robusto**: 5-50 instâncias
4. **Implementar workflows**: Chat, Embeddings, Assíncrono
5. **Configurar fallback**: Llama → GPT-4 (seletivo)
6. **Monitoramento**: Métricas e alertas

---

**Última atualização:** 2026-01-28  
**Versão:** 2.0 - Pós-Reunião
