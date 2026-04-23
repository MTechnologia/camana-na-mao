# Guia Rápido para Trocar o Modelo no Vertex

Este documento explica como trocar a versão do modelo usado pelo chatbot quando houver substituição futura no Vertex AI.

## Onde alterar

No **Supabase Dashboard**:

1. Acesse **Project Settings**.
2. Abra **Edge Functions**.
3. Entre em **Secrets**.
4. Revise principalmente estes dois secrets:
   - `AI_CHAT_MODEL`
   - `AI_CHAT_BASE_URL`

## Regra principal

- `AI_CHAT_MODEL` deve usar o **ID curto** do modelo, sem prefixo `google/`.
- Exemplos:
  - `gemini-2.5-flash`
  - `gemini-3.1-flash-lite-preview`
  - `gemini-3.1-pro-preview`

## Quando trocar só o `AI_CHAT_MODEL`

Troque apenas o `AI_CHAT_MODEL` quando o novo modelo estiver disponível na **mesma região** já usada no `AI_CHAT_BASE_URL`.

Exemplo:

```txt
AI_CHAT_BASE_URL=https://southamerica-east1-aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/southamerica-east1/endpoints/openapi
AI_CHAT_MODEL=gemini-2.5-flash
```

Se o substituto também existir em `southamerica-east1`, basta alterar o `AI_CHAT_MODEL`.

## Quando trocar também o `AI_CHAT_BASE_URL`

Troque o `AI_CHAT_BASE_URL` também quando o novo modelo estiver disponível apenas em outro endpoint, por exemplo `global`.

Exemplo para modelo disponível só em `global`:

```txt
AI_CHAT_BASE_URL=https://aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/global/endpoints/openapi
AI_CHAT_MODEL=gemini-3.1-flash-lite-preview
```

## Procedimento recomendado

1. Confirme no GCP o **ID exato** do novo modelo.
2. Confirme em quais regiões ou endpoints esse modelo está disponível.
3. Atualize `AI_CHAT_MODEL`.
4. Se necessário, atualize também `AI_CHAT_BASE_URL`.
5. Salve os secrets.
6. Rode smoke tests do chatbot:
   - chat simples
   - chat com tool calling
   - chat com RAG
   - continuação de conversa
   - fluxo estruturado

## Como validar nos logs

Procure no log do `ai-orchestrator` por estas evidências:

```txt
[ai-orchestrator] Environment check: { ..., aiChatModel: 'gemini-3.1-flash-lite-preview', ... }
```

```txt
[ai-orchestrator] Calling AI API: https://aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/global/endpoints/openapi/chat/completions model: google/gemini-3.1-flash-lite-preview
```

Essas duas linhas mostram, respectivamente:

- o modelo lido do secret;
- o modelo efetivamente enviado para a API.

## Rollback

Se o novo modelo falhar:

1. volte `AI_CHAT_MODEL` para o valor anterior;
2. se tiver alterado o endpoint, volte também o `AI_CHAT_BASE_URL`;
3. repita os smoke tests básicos.

## Erros mais comuns

- `404` no `ai-orchestrator`:
  normalmente indica modelo inexistente naquele endpoint ou região.

- `400` com menção a `thought signature`:
  indica incompatibilidade do fluxo atual com exigências adicionais do modelo.

- resposta vazia ou tool calling estranho:
  revisar logs do `ai-orchestrator` antes de manter a troca.
