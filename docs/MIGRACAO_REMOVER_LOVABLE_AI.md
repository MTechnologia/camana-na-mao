# Migração: Remover Lovable AI

**Data:** 2026-01-30  
**Status:** ✅ Concluído

---

## 📋 Resumo das Mudanças

Todas as referências ao **Lovable AI Gateway** foram removidas do código. O sistema agora usa exclusivamente o provider configurado via `AI_CHAT_BASE_URL` ou `AI_BASE_URL`.

---

## 🔧 Arquivos Modificados

### 1. `supabase/functions/ai-orchestrator/index.ts`
- ✅ Removido uso de `LOVABLE_API_KEY`
- ✅ Substituído por `AI_CHAT_BASE_URL` / `AI_BASE_URL`
- ✅ Adicionado tratamento para conteúdo vazio no stream
- ✅ Adicionados logs de diagnóstico

### 2. `supabase/functions/recommend-services/index.ts`
- ✅ Removido uso de `LOVABLE_API_KEY`
- ✅ Substituído por `AI_CHAT_BASE_URL` / `AI_BASE_URL`

### 3. `supabase/functions/generate-embeddings/index.ts`
- ✅ Removido uso de `LOVABLE_API_KEY`
- ✅ Substituído por `AI_CHAT_BASE_URL` / `AI_BASE_URL`

### 4. `supabase/functions/analyze-sentiment/index.ts`
- ✅ Removido uso de `LOVABLE_API_KEY`
- ✅ Substituído por `AI_CHAT_BASE_URL` / `AI_BASE_URL`

---

## ⚙️ Configuração Necessária no Supabase

### Secrets Obrigatórios

Configure os seguintes secrets no Supabase Dashboard:

1. **AI_CHAT_BASE_URL** (ou **AI_BASE_URL**)
   - **Valor:** `http://34.71.221.107:8000/v1` (URL do vLLM)
   - **Descrição:** URL base do provider de IA (vLLM)

2. **AI_CHAT_API_KEY** (ou **AI_API_KEY**) - Opcional
   - **Valor:** `dummy` (ou qualquer string - vLLM não requer autenticação)
   - **Descrição:** Chave de API (se o provider exigir)

3. **AI_CHAT_MODEL** - Opcional
   - **Valor:** `meta-llama/Meta-Llama-3.1-8B-Instruct`
   - **Descrição:** Modelo a ser usado (padrão: Llama 3.1 8B)

### Como Configurar

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**
4. Adicione os secrets acima

### Secrets que Podem ser Removidos

- ❌ **LOVABLE_API_KEY** - Não é mais necessário

---

## 🔄 Ordem de Prioridade

O sistema usa a seguinte ordem para determinar qual provider usar:

1. **AI_CHAT_BASE_URL** + **AI_CHAT_API_KEY** (prioridade mais alta)
2. **AI_BASE_URL** + **AI_API_KEY** (fallback)
3. **Erro** (se nenhum estiver configurado)

---

## ✅ Verificação

### 1. Verificar se os Secrets Estão Configurados

No Supabase Dashboard:
- **Project Settings** > **Edge Functions** > **Secrets**
- Verifique se `AI_CHAT_BASE_URL` está listado

### 2. Testar no Chat

1. Faça login no app/web
2. Abra o chat do Assistente IA
3. Envie uma mensagem de teste
4. Verifique se recebe resposta do vLLM

### 3. Verificar Logs

No Supabase Dashboard:
- **Edge Functions** > **ai-orchestrator** > **Logs**
- Procure por:
  - `[ai-orchestrator] Calling AI API: http://34.71.221.107:8000/v1/chat/completions`
  - `[ai-orchestrator] Stream parsing stats:` (novos logs de diagnóstico)

---

## 🐛 Troubleshooting

### Erro: "Assistente IA indisponível neste ambiente"

**Causa:** `AI_CHAT_BASE_URL` não está configurado.

**Solução:**
1. Configure `AI_CHAT_BASE_URL` no Supabase
2. Aguarde 1-2 minutos para o Supabase recarregar os secrets
3. Teste novamente

### Erro: "Connection refused" ou timeout

**Causa:** vLLM não está acessível ou está offline.

**Solução:**
1. Verifique se a VM `llm-chat-gpu-l4` está rodando:
   ```bash
   gcloud compute instances describe llm-chat-gpu-l4 --zone=us-central1-a --format="get(status)"
   ```
2. Verifique se o container vLLM está rodando:
   ```bash
   gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap --command="docker ps | grep vllm"
   ```
3. Verifique se o firewall está configurado corretamente

### Erro: "Empty content received from LLM"

**Causa:** vLLM retornou resposta vazia.

**Solução:**
- O sistema agora trata esse caso automaticamente
- Verifique os logs para entender por que o vLLM retornou vazio
- Pode ser necessário ajustar parâmetros do modelo ou verificar se há problemas no vLLM

---

## 📝 Notas Importantes

1. **vLLM não requer autenticação**: Se o vLLM não usar autenticação, você pode usar qualquer valor para `AI_CHAT_API_KEY` (ex: `dummy`)

2. **Modelo padrão**: Se `AI_CHAT_MODEL` não estiver configurado, o sistema usa `meta-llama/Meta-Llama-3.1-8B-Instruct`

3. **URL sem barra final**: O código remove automaticamente a barra final da URL, mas é recomendado não incluí-la

4. **Timeout**: O sistema tem timeout de 45 segundos para requisições de IA

---

## 🚀 Próximos Passos

1. ✅ Configurar `AI_CHAT_BASE_URL` no Supabase
2. ✅ Remover `LOVABLE_API_KEY` (opcional, mas recomendado)
3. ✅ Testar o chat
4. ✅ Monitorar logs para garantir que está funcionando

---

**Última atualização:** 2026-01-30  
**Status:** ✅ Migração concluída
