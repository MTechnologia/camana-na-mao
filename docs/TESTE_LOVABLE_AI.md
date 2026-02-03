# Como Testar se LOVABLE_API_KEY está Funcionando

**Data:** 2026-01-27  
**Projeto:** Câmara na Mão

---

## Situação Atual

O `LOVABLE_API_KEY` já está configurado no Supabase (criado em Nov 26, 2025), mas o valor está mascarado por segurança (comportamento normal do Supabase).

---

## Método 1: Testar no App/Web

### Passo 1: Verificar se o Assistente IA está funcionando

1. Acesse o app ou web
2. Faça login
3. Abra o chat do Assistente IA
4. Envie uma mensagem de teste (ex: "Olá")

### Resultados Possíveis:

#### ✅ Se funcionar:
- Você receberá uma resposta do assistente
- **Conclusão**: A `LOVABLE_API_KEY` está funcionando ou o vLLM está configurado

#### ❌ Se não funcionar:
- Aparecerá erro: "Assistente IA indisponível neste ambiente"
- **Conclusão**: Precisa configurar `AI_CHAT_BASE_URL` ou verificar `LOVABLE_API_KEY`

---

## Método 2: Verificar Logs do Supabase

### Passo 1: Acessar Logs

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Edge Functions** > **ai-orchestrator** > **Logs**

### Passo 2: Procurar por Mensagens

Procure por estas mensagens nos logs:

#### ✅ Se estiver funcionando:
```
[ai-orchestrator] Using Lovable AI Gateway
[ai-orchestrator] Request to https://ai.gateway.lovable.dev/v1
```

#### ❌ Se não estiver funcionando:
```
[ai-orchestrator] Missing env vars: LOVABLE_API_KEY
[ai-orchestrator] Missing AI credentials
```

---

## Método 3: Configurar Apenas vLLM (Sem Lovable)

Se você não tem acesso ao Lovable para ver/gerar a chave, pode usar apenas o vLLM:

### Secrets Necessários no Supabase:

1. Acesse **Project Settings** > **Edge Functions** > **Secrets**
2. Adicione/verifique:

```bash
# Provider principal (vLLM self-hosted)
AI_CHAT_BASE_URL=http://35.193.16.137:8000/v1
AI_CHAT_API_KEY=opcional-se-vllm-requerer

# Modelo
AI_CHAT_MODEL=Qwen/Qwen2.5-7B-Instruct
```

### Ordem de Prioridade:

Com essa configuração, o sistema usará:
1. **vLLM** (se `AI_CHAT_BASE_URL` estiver configurado)
2. **Lovable AI** (se `LOVABLE_API_KEY` estiver configurado e vLLM falhar)
3. **Erro** (se ambos falharem)

---

## Método 4: Gerar Nova Chave no Lovable (Se Tiver Acesso)

Se você tem acesso ao projeto Lovable original:

### Passo 1: Acessar Lovable

1. Acesse https://lovable.dev
2. Faça login
3. Acesse o projeto original

### Passo 2: Gerar Nova Chave

1. Vá em **Settings** > **API Keys** ou **Environment Variables**
2. Procure por `LOVABLE_API_KEY`
3. Se não existir, crie uma nova
4. Copie a chave (formato: `lv_...`)

### Passo 3: Atualizar no Supabase

1. No Supabase Dashboard, vá em **Edge Functions** > **Secrets**
2. Clique no ícone de lixeira ao lado de `LOVABLE_API_KEY` (para deletar a antiga)
3. Clique em **Add new secret**
4. Configure:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Cole a nova chave
5. Clique em **Save**

---

## Recomendação Atual

Como você já tem:
- ✅ `LOVABLE_API_KEY` configurado (Nov 26, 2025)
- ✅ vLLM self-hosted rodando (`http://35.193.16.137:8000`)

**Recomendação**: Configure o vLLM como principal e mantenha Lovable como fallback:

### Secrets no Supabase:

```bash
# Provider principal (vLLM)
AI_CHAT_BASE_URL=http://35.193.16.137:8000/v1
AI_CHAT_MODEL=Qwen/Qwen2.5-7B-Instruct

# Fallback (Lovable - já configurado)
LOVABLE_API_KEY=lv_... (já existe, não precisa ver)
```

Com isso:
- ✅ Sistema usa vLLM primeiro (mais rápido, self-hosted)
- ✅ Se vLLM falhar, usa Lovable automaticamente
- ✅ Não precisa ver/gerar nova chave do Lovable

---

## Teste Rápido

Para testar se está tudo funcionando:

1. **Configure `AI_CHAT_BASE_URL`** no Supabase (se ainda não estiver)
2. **Teste no app/web** enviando uma mensagem
3. **Verifique os logs** do `ai-orchestrator` no Supabase

Se funcionar, está tudo OK! Não precisa ver a chave do Lovable.

---

## Troubleshooting

### Erro: "Assistente IA indisponível"

**Causa**: Nenhum provider configurado.

**Solução**: Configure pelo menos um:
- `AI_CHAT_BASE_URL` (vLLM) OU
- `LOVABLE_API_KEY` (já existe, mas pode estar inválida)

### Erro: "Network timeout" ou "Connection failed"

**Causa**: vLLM offline ou firewall bloqueando.

**Solução**: 
- Verifique se vLLM está rodando: `docker ps` na VM
- Verifique firewall do GCP (porta 8000 aberta)
- O sistema deve fazer fallback para Lovable automaticamente

---

**Última atualização:** 2026-01-27
