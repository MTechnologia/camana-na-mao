# Arquitetura IA - Câmara na Mão
## Documento Executivo para Reunião

**Data:** 2026-01-28  
**Versão:** 1.0

---

## 🎯 Resumo Executivo

**Arquitetura Híbrida Recomendada:**
- ✅ **vLLM Self-hosted** (GCP) - Chat em tempo real
- ✅ **n8n Cloud Run** (GCP) - Processamento assíncrono
- ✅ **Embeddings Self-hosted** (GCP) - Busca semântica
- ✅ **Provedor LLM** configurável (vLLM / OpenAI-compatible)

**Por que Híbrido?**
- **LGPD**: Dados processados no Brasil (southamerica-east1)
- **Custo**: 60-70% mais barato que SaaS puro
- **Performance**: Latência baixa (VPC interna)
- **Controle**: Total sobre infraestrutura e dados
- **Escalabilidade**: Auto-scaling automático

---

## 💰 Estimativa de Custos Mensais

### Infraestrutura Self-hosted (GCP)

| Componente | Especificação | Custo Mensal |
|------------|---------------|--------------|
| **VM Chat (GPU)** | n1-standard-4 + T4 (preemptible) | ~R$ 1.200 |
| **VM Embeddings (CPU)** | e2-standard-4 | ~R$ 200 |
| **n8n Cloud Run** | Auto-scaling (1-10 instâncias) | ~R$ 300 |
| **Disco/Storage** | 200GB SSD + 50GB | ~R$ 100 |
| **Tráfego de Rede** | Primeiros 1GB grátis | ~R$ 50 |
| **Subtotal Self-hosted** | | **~R$ 1.850** |

### Fallback SaaS (Opcional)

| Serviço | Uso Estimado | Custo Mensal |
|---------|--------------|--------------|
| **Provedor SaaS alternativo** | Contingência (se configurado) | Variável |
| **Subtotal Fallback** | | **~R$ 200-500** |

### **TOTAL ESTIMADO: R$ 2.050 - R$ 2.350/mês**

### Comparativo com SaaS Puro

| Abordagem | Custo Mensal | Economia |
|-----------|--------------|----------|
| **SaaS Puro** (n8n Cloud + OpenAI) | ~R$ 6.000-8.000 | - |
| **Híbrido (Recomendado)** | ~R$ 2.050-2.350 | **65-70%** |

**Economia anual estimada: R$ 45.000 - R$ 68.000**

---

## 🏗️ Arquitetura Híbrida - Por que é Melhor?

### ✅ Vantagens da Abordagem Híbrida

#### 1. **Conformidade LGPD**
- ✅ Dados processados em `southamerica-east1` (Brasil)
- ✅ Comunicação via VPC interna (não exposta)
- ✅ Controle total sobre localização dos dados
- ✅ Sem transferência internacional de dados pessoais

#### 2. **Custo-Benefício**
- ✅ Custo fixo previsível (independente de volume)
- ✅ Economia de 60-70% vs SaaS puro
- ✅ Sem custos por requisição (após infraestrutura)
- ✅ Ideal para alto volume (1000+ conversas/dia)

#### 3. **Performance**
- ✅ Latência baixa (VPC interna entre serviços)
- ✅ Sem limitações de rate limiting externo
- ✅ Controle total sobre recursos (GPU dedicada)
- ✅ Escalabilidade automática (Cloud Run)

#### 4. **Confiabilidade**
- ✅ Fallback automático para SaaS em caso de falha
- ✅ Redundância geográfica (múltiplas zonas)
- ✅ Alta disponibilidade (auto-restart, health checks)
- ✅ Zero downtime em atualizações (rolling updates)

#### 5. **Controle e Flexibilidade**
- ✅ Modelos customizáveis (Llama 3.1 8B, Qwen, etc.)
- ✅ Workflows personalizados (n8n)
- ✅ Integração direta com infraestrutura existente
- ✅ Sem dependência de terceiros para operação crítica

---

## 🤖 Conceitos Técnicos - Definições Breves

### RAG (Retrieval Augmented Generation)

**O que é?**
RAG é uma técnica que combina **busca de informações** com **geração de texto** para criar respostas mais precisas e contextualizadas.

**Como funciona?**
1. **Busca**: Sistema busca informações relevantes em base de conhecimento
2. **Contextualização**: Informações encontradas são adicionadas ao contexto
3. **Geração**: IA gera resposta baseada no contexto enriquecido

**Exemplo prático:**
- **Usuário pergunta**: "Qual o horário de funcionamento da Câmara?"
- **RAG busca**: Informações sobre horários na base de conhecimento
- **RAG retorna**: "A Câmara funciona de segunda a sexta, das 8h às 18h..."

**Benefícios:**
- ✅ Respostas mais precisas (baseadas em dados reais)
- ✅ Reduz alucinações da IA
- ✅ Atualização fácil (apenas atualizar base de conhecimento)
- ✅ Rastreabilidade (sabe de onde veio a informação)

---

### Embeddings (Representações Vetoriais)

**O que é?**
Embeddings são representações numéricas (vetores) de texto que capturam o **significado semântico** das palavras e frases.

**Como funciona?**
1. **Texto** → Modelo de Embedding → **Vetor numérico** (ex: [0.2, -0.5, 0.8, ...])
2. Textos similares geram vetores próximos no espaço vetorial
3. Busca por similaridade encontra textos relacionados

**Exemplo prático:**
- **Texto 1**: "Buraco na rua"
- **Texto 2**: "Via pública com cratera"
- **Embeddings**: Vetores muito próximos (mesmo significado)

**Aplicação no projeto:**
- ✅ **Busca semântica**: Encontrar relatos similares
- ✅ **Classificação automática**: Agrupar problemas relacionados
- ✅ **RAG**: Buscar informações relevantes para contexto
- ✅ **Recomendações**: Sugerir serviços baseado em histórico

**Tecnologia:**
- Modelo: `BAAI/bge-m3` (multilingual, otimizado para português)
- Infraestrutura: VM dedicada (e2-standard-4) em `southamerica-east1`
- Performance: ~100 embeddings/segundo

---

### vLLM (Very Large Language Model)

**O que é?**
vLLM é um servidor otimizado para servir modelos de linguagem grandes (LLMs) com alta performance e baixa latência.

**Características:**
- ✅ **API compatível com OpenAI**: Fácil integração
- ✅ **Streaming**: Respostas em tempo real
- ✅ **Tool Calling**: Suporte a funções/ferramentas
- ✅ **Alta performance**: Otimizado para GPU

**Modelo utilizado:**
- **Llama 3.1 8B Instruct** (quantizado AWQ)
- **Contexto**: 128.000 tokens (vs 4.096 do modelo anterior)
- **Qualidade**: Excelente para português brasileiro

**Infraestrutura:**
- VM: `n1-standard-4` + NVIDIA T4 (16GB)
- Região: `southamerica-east1` (LGPD)
- Latência: 1-3 segundos por resposta

---

### n8n (Workflow Automation)

**O que é?**
n8n é uma plataforma de automação de workflows que permite criar fluxos de trabalho visuais sem código.

**Aplicação no projeto:**
- ✅ **Processamento assíncrono**: Enriquecimento de relatos
- ✅ **Integrações**: APIs externas, bancos de dados
- ✅ **Orquestração**: Coordenar múltiplos serviços
- ✅ **Notificações**: Alertas e comunicações

**Deploy:**
- **Cloud Run**: Auto-scaling (1-10 instâncias)
- **Região**: `southamerica-east1` (LGPD)
- **Custo**: ~R$ 300/mês

---

## 📊 Fluxo de Dados Simplificado

```
┌─────────────┐
│   Usuário   │
│  (App/Web)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Supabase      │
│  (Edge Func)    │
└──────┬──────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   vLLM      │   │     n8n     │
│  (Chat)     │   │ (Workflow)  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 ▼
       │          ┌─────────────┐
       │          │ Embeddings  │
       │          │  (Busca)    │
       │          └─────────────┘
       │
       ▼
┌─────────────┐
│  Resposta   │
│  ao Usuário │
└─────────────┘
```

---

## 🎯 Benefícios da Arquitetura Híbrida

### Para o Negócio

| Benefício | Impacto |
|-----------|---------|
| **Conformidade LGPD** | ✅ Reduz risco legal e multas |
| **Economia de Custos** | ✅ R$ 45-68k/ano economizados |
| **Escalabilidade** | ✅ Suporta crescimento sem limitações |
| **Controle de Dados** | ✅ Dados não saem da infraestrutura |
| **Performance** | ✅ Respostas rápidas (1-3s) |

### Para a Tecnologia

| Benefício | Impacto |
|-----------|---------|
| **Flexibilidade** | ✅ Modelos customizáveis |
| **Integração** | ✅ VPC interna (baixa latência) |
| **Confiabilidade** | ✅ Fallback automático |
| **Manutenibilidade** | ✅ Infraestrutura como código |
| **Observabilidade** | ✅ Logs e métricas completas |

---

## ⚠️ Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| **Falha de VM GPU** | ✅ Trocar `AI_CHAT_BASE_URL` para provedor de contingência |
| **Custo inesperado** | ✅ Preemptible VMs (80% desconto) |
| **Alta demanda** | ✅ Auto-scaling (Cloud Run) |
| **Manutenção** | ✅ Rolling updates (zero downtime) |
| **Conformidade** | ✅ Tudo em `southamerica-east1` (Brasil) |

---

## 📈 Roadmap de Implementação

### Fase 1: Infraestrutura Base (Semana 1-2)
- [x] VM Chat (vLLM) em `southamerica-east1`
- [x] VM Embeddings em `southamerica-east1`
- [x] n8n Cloud Run deployado
- [ ] Integração e testes

### Fase 2: Modelos e Otimização (Semana 3-4)
- [ ] Migração para Llama 3.1 8B (128K tokens)
- [ ] Otimização de embeddings
- [ ] Configuração de fallback

### Fase 3: Produção (Semana 5-6)
- [ ] Monitoramento e alertas
- [ ] Backup e disaster recovery
- [ ] Documentação operacional

---

## 💡 Recomendações Finais

### ✅ Aprovar Arquitetura Híbrida

**Razões:**
1. **LGPD**: Conformidade legal obrigatória
2. **Custo**: Economia de 65-70% vs SaaS
3. **Performance**: Latência baixa e alta disponibilidade
4. **Escalabilidade**: Auto-scaling automático
5. **Controle**: Total sobre infraestrutura e dados

### 📋 Próximos Passos

1. **Aprovação de orçamento**: R$ 2.050-2.350/mês
2. **Aprovação de arquitetura**: Híbrida (self-hosted + fallback)
3. **Timeline**: 4-6 semanas para produção
4. **Recursos**: 1 DevOps + 1 Backend (part-time)

---

## 📞 Contatos e Suporte

**Documentação Técnica:**
- Arquitetura completa: `docs/DOCUMENTO_ARQUITETURA.md`
- Deploy n8n: `docs/DEPLOY_N8N_CLOUD_RUN.md`
- Migração Llama: `docs/MIGRACAO_LLAMA_3.1_8B.md`

**Status Atual:**
- ✅ n8n Cloud Run: Deployado e funcionando
- ✅ vLLM: Configurado (aguardando migração para Llama 3.1 8B)
- ⏳ Embeddings: VM criada, aguardando configuração

---

**Última atualização:** 2026-01-28  
**Versão:** 1.0
