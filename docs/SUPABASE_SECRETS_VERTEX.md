# Configurar secrets do Supabase para Vertex AI (Gemini)

Siga estes passos no **Supabase Dashboard** para o assistente usar o Gemini 2.5 Flash via Vertex.

---

## Onde configurar

1. Acesse o projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Menu lateral: **Project Settings** (ícone de engrenagem).
3. Aba **Edge Functions**.
4. Seção **Secrets** (ou **Environment variables** para Edge Functions).

Adicione ou edite os secrets abaixo. Use **Add new secret** para cada um.

---

## Secrets obrigatórios

### 1. `AI_CHAT_BASE_URL`

**Valor (copie e cole):**

```
https://southamerica-east1-aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/southamerica-east1/endpoints/openapi
```

- Não adicione barra no final.
- Não inclua `/chat/completions` (o código adiciona automaticamente).

---

### 2. `AI_CHAT_MODEL`

**Valor:**

```
gemini-2.5-flash
```

- Nome do modelo no Vertex para Gemini 2.5 Flash.

---

### 3. `VERTEX_TOKEN_URL`

**Valor:** URL da sua **Cloud Function** que devolve o token.

Exemplo (substitua pela URL real que apareceu após o deploy):

```
https://southamerica-east1-arcane-atom-480020-f6.cloudfunctions.net/vertex-token
```

- No GCP: **Cloud Functions** → clique na função **vertex-token** → aba **Trigger** → copie a URL.

---

### 4. `VERTEX_TOKEN_SECRET`

**Valor:** o mesmo **TOKEN_SECRET** que você definiu ao fazer o deploy da Cloud Function.

- Deve ser **idêntico** ao `TOKEN_SECRET` da função (ex.: a string que você gerou com `openssl rand -base64 32`).
- A Edge Function envia esse valor no header `X-Token-Secret` ao chamar a `VERTEX_TOKEN_URL`; a Cloud Function só devolve o token se o header bater.

---

## Secrets opcionais (RAG no Vertex – Opção B)

Para usar **RAG no Vertex** em perguntas de dúvidas gerais sobre a Câmara, configure **um** dos dois (não ambos ao mesmo tempo):

### `VERTEX_RAG_DATASTORE` (Vertex AI Search)

**Valor:** path completo do data store **ou** apenas o **Data store ID**.

**Opção 1 – Só o ID (recomendado):** use o ID que aparece no GCP (ex.: `camara-na-mao-rag_1770999938229`). O ai-orchestrator monta o path com o projeto da URL e `locations/global/collections/default_collection/dataStores/<ID>`.

```
camara-na-mao-rag_1770999938229
```

**Opção 2 – Path completo:** use se o data store estiver em outra região (ex.: `us`, `eu`) ou quiser fixar projeto/local:

```
projects/SEU_PROJECT_ID/locations/global/collections/default_collection/dataStores/SEU_DATASTORE_ID
```

- **Data store em `global`:** `locations/global`.
- **Data store em multi-region:** `locations/us` ou `locations/eu` (conforme criado no AI Applications).
- Obtenha o Data store ID em: **GCP Console** → **AI Applications** → **Data stores** → abra o data store → aba **Data** (ou na URL do data store).
- Se aparecer *Invalid Vertex AI datastore resource name* (400), confira: projeto correto, `locations/global` (ou `us`/`eu`) igual ao do data store, e ID sem espaços/aspas.

### `VERTEX_RAG_CORPUS` (RAG Engine)

**Valor:** path completo do RAG corpus no Vertex AI RAG Engine.

Exemplo:

```
projects/arcane-atom-480020-f6/locations/southamerica-east1/ragCorpora/SEU_CORPUS_ID
```

- Use se você criou um corpus via RAG Engine API e importou arquivos.
- Quando definido (e `VERTEX_RAG_DATASTORE` não estiver definido), o ai-orchestrator usa o RAG Engine para perguntas **general**.

Se nenhum dos dois estiver configurado, o assistente continua usando apenas a ferramenta **search_knowledge_base** (tabela no Supabase) para dúvidas gerais. Detalhes: [RAG_VERTEX_CONFIGURACAO.md](./RAG_VERTEX_CONFIGURACAO.md).

---

## O que NÃO configurar

- **Não** defina `AI_CHAT_API_KEY` quando estiver usando Vertex com a Cloud Function. O token é obtido dinamicamente via `VERTEX_TOKEN_URL` + `VERTEX_TOKEN_SECRET`.

Se você tinha `AI_CHAT_API_KEY` antes (ex.: para vLLM ou AI Studio), pode deixar em branco ou remover ao usar só Vertex.

---

## Conferência rápida

| Secret                 | Exemplo / observação |
|------------------------|----------------------|
| `AI_CHAT_BASE_URL`     | `https://southamerica-east1-aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/southamerica-east1/endpoints/openapi` |
| `AI_CHAT_MODEL`        | `gemini-2.5-flash`   |
| `VERTEX_TOKEN_URL`     | URL da Cloud Function (vertex-token) |
| `VERTEX_TOKEN_SECRET`  | Mesmo valor do `TOKEN_SECRET` da Cloud Function |
| `VERTEX_RAG_DATASTORE` | (opcional) Path do data store Vertex AI Search para RAG em dúvidas gerais |
| `VERTEX_RAG_CORPUS`    | (opcional) Path do corpus RAG Engine; use um ou outro, não ambos |

Depois de salvar, as próximas chamadas ao assistente já usarão o Gemini 2.5 Flash no Vertex (desde que a Cloud Function esteja no ar e a conta de serviço tenha permissão no Vertex).
