# Apresentação Rápida - Arquitetura IA
## Slides para Reunião

**Data:** 2026-01-28

---

## 📊 Slide 1: Resumo Executivo

**Arquitetura Híbrida Recomendada:**
- ✅ vLLM Self-hosted (GCP) - Chat em tempo real
- ✅ automacao Cloud Run (GCP) - Processamento assíncrono
- ✅ Embeddings Self-hosted (GCP) - Busca semântica
- ✅ Provedor de IA configurável (vLLM / OpenAI-compatible)

**Por que Híbrido?**
- LGPD: Dados no Brasil (southamerica-east1)
- Custo: 65-70% mais barato que SaaS
- Performance: Latência baixa (VPC interna)
- Controle: Total sobre infraestrutura

---

## 💰 Slide 2: Custos

| Item | Custo Mensal |
|------|--------------|
| VM Chat (GPU) | R$ 1.200 |
| VM Embeddings | R$ 200 |
| automacao Cloud Run | R$ 300 |
| Storage/Network | R$ 150 |
| Fallback (opcional) | R$ 200-500 |
| **TOTAL** | **R$ 2.050-2.350** |

**vs SaaS Puro: R$ 6.000-8.000/mês**  
**Economia: R$ 45-68k/ano (65-70%)**

---

## 🤖 Slide 3: RAG (Retrieval Augmented Generation)

**O que é?**
Combina **busca de informações** + **geração de texto** para respostas precisas.

**Como funciona:**
1. Busca informações na base de conhecimento
2. Adiciona ao contexto da IA
3. IA gera resposta baseada no contexto

**Exemplo:**
- Pergunta: "Horário da Câmara?"
- RAG busca: Base de conhecimento
- Resposta: "Segunda a sexta, 8h-18h" (baseado em dados reais)

**Benefício:** Respostas precisas, sem "alucinações"

---

## 🔍 Slide 4: Embeddings

**O que é?**
Representações numéricas (vetores) que capturam o **significado** do texto.

**Como funciona:**
- Texto → Modelo → Vetor numérico
- Textos similares = vetores próximos
- Busca por similaridade encontra relacionamentos

**Exemplo:**
- "Buraco na rua" ≈ "Via pública com cratera" (mesmo significado)

**Aplicação:**
- Busca semântica de relatos
- Classificação automática
- Recomendações inteligentes

---

## 🏗️ Slide 5: Arquitetura

```
Usuário → Supabase → vLLM (Chat) + automacao (Workflow) + Embeddings (Busca)
                    ↓
              Resposta ao Usuário
```

**Componentes:**
- **vLLM**: Chat em tempo real (Llama 3.1 8B, 128K tokens)
- **automacao**: Processamento assíncrono (auto-scaling)
- **Embeddings**: Busca semântica (BAAI/bge-m3)

**Tudo em `southamerica-east1` (Brasil - LGPD)**

---

## ✅ Slide 6: Benefícios

| Área | Benefício |
|------|-----------|
| **Legal** | ✅ Conformidade LGPD |
| **Financeiro** | ✅ Economia 65-70% |
| **Técnico** | ✅ Performance (1-3s) |
| **Operacional** | ✅ Auto-scaling |
| **Estratégico** | ✅ Controle total |

---

## ⚠️ Slide 7: Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Falha de VM | ✅ Fallback automático |
| Custo alto | ✅ Preemptible (80% desconto) |
| Alta demanda | ✅ Auto-scaling |
| Manutenção | ✅ Rolling updates (zero downtime) |

---

## 📋 Slide 8: Próximos Passos

1. **Aprovação**: Orçamento R$ 2.050-2.350/mês
2. **Timeline**: 4-6 semanas para produção
3. **Recursos**: 1 DevOps + 1 Backend (part-time)

**Status Atual:**
- ✅ automacao: Deployado
- ✅ vLLM: Configurado
- ⏳ Migração Llama 3.1 8B: Em andamento

---

## 💡 Slide 9: Recomendação

**✅ APROVAR ARQUITETURA HÍBRIDA**

**Razões:**
1. LGPD (obrigatório)
2. Economia (65-70%)
3. Performance (1-3s)
4. Escalabilidade (automática)
5. Controle (total)

**ROI Estimado:**
- Investimento: R$ 2.350/mês
- Economia: R$ 45-68k/ano
- Payback: Imediato

---

**Documento completo:** `docs/APRESENTACAO_ARQUITETURA_IA_EXECUTIVA.md`
