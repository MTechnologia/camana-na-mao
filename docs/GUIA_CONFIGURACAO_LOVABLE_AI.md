# Guia de Configuração Lovable AI Gateway

Este guia explica como configurar o Lovable AI Gateway como fallback no sistema Câmara na Mão.

---

## Visão Geral

O sistema suporta múltiplos provedores de IA:

1. **Lovable AI Gateway** (fallback padrão) - `https://ai.gateway.lovable.dev/v1`
2. **vLLM self-hosted** - Configurado via `AI_CHAT_BASE_URL`
3. **OpenAI-compatible providers** - Qualquer API compatível com OpenAI

A ordem de prioridade é:
1. `AI_CHAT_BASE_URL` + `AI_CHAT_API_KEY` (provider próprio)
2. `AI_BASE_URL` + `AI_API_KEY` (provider único)
3. `LOVABLE_API_KEY` (Lovable Cloud)
4. Fallback para `https://ai.gateway.lovable.dev/v1` (requer `LOVABLE_API_KEY`)

---

## Como Obter a Chave do Lovable AI

### Opção 1: Se você tem acesso ao projeto Lovable original

1. Acesse o projeto no Lovable: https://lovable.dev
2. Vá em **Settings** > **Environment Variables**
3. Procure por `LOVABLE_API_KEY` ou crie uma nova
4. Copie a chave (formato: `lv_...`)

### Opção 2: Criar nova chave no Lovable

1. Acesse https://lovable.dev
2. Crie um novo projeto ou acesse um existente
3. Vá em **Settings** > **API Keys**
4. Gere uma nova chave
5. Copie a chave gerada

### Opção 3: Usar sem chave (não recomendado)

Se você não tiver acesso ao Lovable, pode:
- Usar apenas o vLLM self-hosted (configurar `AI_CHAT_BASE_URL`)
- Usar outro provedor OpenAI-compatible
- Solicitar acesso ao projeto Lovable original

---

## Configuração no Supabase

### Passo 1: Acessar Secrets do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**

### Passo 2: Adicionar LOVABLE_API_KEY

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Cole a chave do Lovable (formato: `lv_...`)
3. Clique em **Save**

### Passo 3: Verificar Configuração

O sistema já está configurado para usar o Lovable AI como fallback. Após adicionar o secret, o fluxo será:

1. **Primeira tentativa**: Usa `AI_CHAT_BASE_URL` + `AI_CHAT_API_KEY` (se configurado)
2. **Segunda tentativa**: Usa `AI_BASE_URL` + `AI_API_KEY` (se configurado)
3. **Terceira tentativa**: Usa `LOVABLE_API_KEY` com `https://ai.gateway.lovable.dev/v1`
4. **Fallback final**: Se nenhum estiver configurado, retorna erro

---

## Configuração Completa (Recomendada)

Para ter redundância e fallback automático, configure:

### Secrets no Supabase:

```bash
# Provider principal (vLLM self-hosted)
AI_CHAT_BASE_URL=https://seu-vllm.com/v1
AI_CHAT_API_KEY=sua-chave-vllm

# Fallback (Lovable AI)
LOVABLE_API_KEY=lv_sua_chave_lovable

# Modelo (opcional, padrão: google/gemini-2.5-flash)
AI_CHAT_MODEL=google/gemini-2.5-flash
```

### Ordem de Uso:

1. **vLLM self-hosted** (se `AI_CHAT_BASE_URL` estiver configurado)
2. **Lovable AI Gateway** (se `LOVABLE_API_KEY` estiver configurado)
3. **Erro** (se nenhum estiver configurado)

---

## Testando a Configuração

### 1. Verificar se o secret está configurado

No Supabase Dashboard:
- **Project Settings** > **Edge Functions** > **Secrets**
- Verifique se `LOVABLE_API_KEY` está listado

### 2. Testar no app/web

1. Faça login no app/web
2. Abra o chat do Assistente IA
3. Envie uma mensagem de teste
4. Verifique se recebe resposta (não deve aparecer erro de configuração)

### 3. Verificar logs

No Supabase Dashboard:
- **Edge Functions** > **ai-orchestrator** > **Logs**
- Procure por mensagens como:
  - `[ai-orchestrator] Using Lovable AI Gateway`
  - `[ai-orchestrator] Using AI_CHAT_BASE_URL`

---

## Troubleshooting

### Erro: "Assistente IA indisponível neste ambiente"

**Causa**: Nenhum provider de IA está configurado.

**Solução**:
1. Configure pelo menos um dos seguintes:
   - `LOVABLE_API_KEY` (Lovable AI)
   - `AI_CHAT_BASE_URL` + `AI_CHAT_API_KEY` (vLLM)
   - `AI_BASE_URL` + `AI_API_KEY` (provider genérico)

### Erro: "401 Unauthorized" do Lovable

**Causa**: Chave do Lovable inválida ou expirada.

**Solução**:
1. Verifique se a chave está correta no Supabase Secrets
2. Gere uma nova chave no Lovable se necessário
3. Atualize o secret no Supabase

### Erro: "Network timeout" ou "Connection failed"

**Causa**: Problema de conectividade ou vLLM offline.

**Solução**:
1. O sistema deve fazer fallback automático para Lovable AI
2. Verifique se `LOVABLE_API_KEY` está configurado
3. Se o vLLM estiver offline, o Lovable deve funcionar como fallback

---

## Edge Functions que Usam Lovable AI

As seguintes Edge Functions suportam Lovable AI como fallback:

1. **`ai-orchestrator`** - Chat principal com tool calling
2. **`recommend-services`** - Recomendação de serviços
3. **`analyze-sentiment`** - Análise de sentimento
4. **`generate-embeddings`** - Geração de embeddings (usa `AI_EMBEDDING_BASE_URL`)

---

## Modelos Disponíveis no Lovable AI Gateway

O Lovable AI Gateway suporta vários modelos. O padrão é:

- **Chat**: `google/gemini-2.5-flash` (padrão)
- **Chat Lite**: `google/gemini-2.5-flash-lite` (para operações rápidas)
- **Embeddings**: `text-embedding-3-small` (padrão)

Para usar um modelo diferente, configure `AI_CHAT_MODEL` no Supabase Secrets.

---

## Exemplo de Configuração Mínima

Para usar apenas o Lovable AI (sem vLLM):

```bash
# No Supabase Dashboard > Edge Functions > Secrets
LOVABLE_API_KEY=lv_sua_chave_aqui
```

Isso é suficiente para o sistema funcionar com o Lovable AI Gateway.

---

## Exemplo de Configuração Completa (com Fallback)

Para ter redundância com fallback automático:

```bash
# Provider principal (vLLM)
AI_CHAT_BASE_URL=http://35.193.16.137:8000/v1
AI_CHAT_API_KEY=opcional-se-vllm-requerer

# Fallback (Lovable AI)
LOVABLE_API_KEY=lv_sua_chave_lovable

# Modelo
AI_CHAT_MODEL=google/gemini-2.5-flash
```

Nesta configuração:
- O sistema tenta primeiro o vLLM
- Se falhar, faz fallback automático para Lovable AI
- Se ambos falharem, retorna erro

---

## Notas Importantes

1. **Segurança**: Nunca commite a `LOVABLE_API_KEY` no Git. Use apenas Supabase Secrets.

2. **Custos**: O Lovable AI Gateway pode ter custos associados. Verifique o plano do seu projeto Lovable.

3. **Rate Limits**: O Lovable AI Gateway pode ter limites de taxa. Se exceder, o sistema tentará usar o vLLM (se configurado).

4. **Fallback Automático**: O sistema faz fallback automático apenas se o provider principal falhar. Não há retry automático.

---

## Referências

- [Documentação do Lovable AI Gateway](https://docs.lovable.dev)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Documento de Arquitetura](./DOCUMENTO_ARQUITETURA.md)
- [Diagrama de Integrações](./DIAGRAMA_INTEGRACOES.md)

---

**Última atualização:** 2026-01-27  
**Mantido por:** Equipe de Desenvolvimento Câmara na Mão
