# Configurar RAG no Vertex AI

Este guia descreve como configurar **RAG (Retrieval-Augmented Generation)** no Vertex AI para o projeto Câmara na Mão, usando o Gemini já configurado via Vertex.

---

## Visão geral

No Vertex existem duas formas principais de usar RAG com o Gemini:

| Opção | Descrição | Uso típico |
|-------|-----------|------------|
| **Vertex AI Search** | Motor de busca gerenciado (site ou documentos no Cloud Storage). Grounding “direto” na geração. | Documentos da Câmara, site institucional, PDFs em um bucket. |
| **RAG Engine** | Corpus gerenciado no Vertex (ou vector DB externo). Você cria corpus, importa arquivos, o Vertex faz chunking e embedding. | Base de conhecimento própria, controle fino de chunking e índice. |

Ambas exigem que a chamada ao modelo use a **API nativa do Vertex** (`generateContent`), não o endpoint OpenAI-compatible (`chat/completions`). O **ai-orchestrator** hoje usa `chat/completions`; para usar RAG nativo do Vertex é preciso incluir a opção de chamar `generateContent` com `tools` de retrieval (ver seção [Integração com o ai-orchestrator](#integração-com-o-ai-orchestrator) abaixo).

---

## 1. Vertex AI Search (grounding com seus dados)

Respostas “ancoradas” em um data store (site ou documentos).

### 1.1 Pré-requisitos

- **Projeto GCP:** mesmo do Vertex (ex.: `arcane-atom-480020-f6`).
- **APIs:** Vertex AI já em uso; é preciso ativar o **Vertex AI Search** (AI Applications).
- **IAM:** permissão `discoveryengine.servingConfigs.search` (ex.: papel **Discovery Engine Viewer** ou **Discovery Engine Editor**). Ver [1.1.1 Corrigir 403 (Permission denied)](#111-corrigir-403-permission-denied) abaixo.
- **Região:** Vertex AI Search usa `global` ou multi-region (`eu` / `us`). O modelo pode estar em `southamerica-east1`; o data store fica em `global` (ou multi-region).

#### 1.1.1 Corrigir 403 (Permission denied)

Se aparecer **403** com `Permission 'discoveryengine.servingConfigs.search' denied` no log do ai-orchestrator, a **identidade que obtém o token do Vertex** (ex.: a conta de serviço da Cloud Function em `VERTEX_TOKEN_URL`) não tem permissão para buscar no data store.

**Passos no GCP:**

1. Abra [IAM e administração → IAM](https://console.cloud.google.com/iam-admin/iam) no projeto (ex.: `arcane-atom-480020-f6`).
2. Identifique a **conta de serviço** usada para gerar o token (a que a Cloud Function `vertex-token` usa, ou a que chama a API do Vertex).
3. Clique em **Conceder acesso** (ou edite essa conta) e adicione uma das funções:
   - **Discovery Engine Viewer** (`roles/discoveryengine.viewer`) — só leitura no Vertex AI Search (recomendado para RAG), ou  
   - **Discovery Engine Editor** (`roles/discoveryengine.editor`) — se precisar criar/editar recursos.
4. Salve. A alteração pode levar alguns minutos para propagar.

Depois disso, as chamadas ao RAG (generateContent com grounding no data store) devem deixar de retornar 403.

### 1.2 Ativar e criar o data store

1. **Ativar AI Applications (Vertex AI Search)**  
   - Console: [AI Applications](https://console.cloud.google.com/gen-app-builder/engines).  
   - Aceitar termos se solicitado.  
   - Escolher localização: `global` (ou `eu`/`us` conforme documentação).

2. **Criar um Data Store**  
   - [Create Data Store](https://console.cloud.google.com/gen-app-builder/data-stores/create).

   **Opção A – Conteúdo de site**  
   - Em “Website Content”, selecionar os sites a indexar (ex.: site da Câmara).  
   - Opcional: marcar “Advanced website indexing”.  
   - Definir nome e localização do data store → **Create**.

   **Opção B – Documentos (PDF, HTML, TXT, etc.)**  
   - Em “Cloud Storage”, selecionar pasta ou arquivos no GCS.  
   - Escolher “Unstructured documents”.  
   - Definir nome e localização → **Create**.

3. **Anotar o ID do data store**  
   - Em **AI Applications** → **Data stores** → abrir o data store.  
   - Na aba **Data**, copiar o **Data store ID**.  
   - O path completo será:  
     `projects/PROJECT_ID/locations/global/collections/default_collection/dataStores/DATASTORE_ID`  
     (para multi-region `eu`/`us`, troque `global` pelo valor correto).

### 1.3 Chamar o modelo com grounding (REST)

Para respostas grounded nesse data store, use a API **generateContent** (não `chat/completions`):

- **URL (exemplo):**  
  `POST https://southamerica-east1-aiplatform.googleapis.com/v1beta1/projects/arcane-atom-480020-f6/locations/southamerica-east1/publishers/google/models/gemini-2.5-flash:generateContent`

- **Headers:**  
  `Authorization: Bearer <token>` (o mesmo que você já obtém na Cloud Function `vertex-token`).

- **Body (exemplo):**

```json
{
  "contents": [{
    "role": "user",
    "parts": [{ "text": "O que a Câmara oferece sobre audiências públicas?" }]
  }],
  "tools": [{
    "retrieval": {
      "vertexAiSearch": {
        "datastore": "projects/arcane-atom-480020-f6/locations/global/collections/default_collection/dataStores/SEU_DATASTORE_ID"
      }
    }
  }]
}
```

A resposta pode incluir `groundingMetadata` (chunks usados, citações). Até 10 data stores podem ser usados no mesmo request (documentação oficial).

Documentação: [Grounding with Vertex AI Search](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-vertex-ai-search).

---

## 2. RAG Engine (corpus no Vertex)

Você cria um **RAG corpus**, importa arquivos (GCS, Drive, etc.) e o Vertex cuida de parsing, chunking e índice vetorial.

### 2.1 Habilitar e criar corpus

1. **Habilitar a RAG API** (se ainda não estiver):  
   - No projeto GCP: ativar a API do Vertex AI RAG (referência: [RAG Engine API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api)).

2. **Criar um RAG corpus**  
   - Via REST:  
     `POST https://LOCATION-aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/LOCATION/ragCorpora`  
   - Body (mínimo):  
     `{ "display_name": "Conhecimento Câmara", "description": "Base para RAG do assistente" }`  
   - Use a mesma `LOCATION` do seu modelo (ex.: `southamerica-east1`).

3. **Importar arquivos**  
   - **ImportRagFiles** com `gcs_source.uris` apontando para um bucket (ou outras fontes suportadas: Google Drive, etc.).  
   - Configurar chunking se quiser (ex.: `fixed_length_chunking` com `chunk_size` e `chunk_overlap`).

4. **Nome do corpus**  
   - Formato: `projects/PROJECT_ID/locations/LOCATION/ragCorpora/CORPUS_ID`.

### 2.2 Chamar o modelo com RAG Engine

No **generateContent**, use o tool de retrieval com `vertexRagStore`:

```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "Como funciona a solicitação de audiência?" }] }],
  "tools": [{
    "retrieval": {
      "vertexRagStore": {
        "ragResources": [{
          "ragCorpus": "projects/arcane-atom-480020-f6/locations/southamerica-east1/ragCorpora/CORPUS_ID"
        }]
      }
    }
  }]
}
```

Documentação: [RAG Engine API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api) e [Ground responses using RAG](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/ground-responses-using-rag).

---

## 3. Integração com o ai-orchestrator

O **ai-orchestrator** hoje usa:

- Endpoint: `.../endpoints/openapi` + `/chat/completions` (API compatível com OpenAI).  
- Body: `model`, `messages`, `tools` (function calling), `tool_choice`, `stream`.

O **grounding/RAG nativo do Vertex** (Vertex AI Search ou RAG Engine) é exposto na API **generateContent**, com `tools[].retrieval`, e não no endpoint `chat/completions`. Por isso:

- **Opção A – Manter só o fluxo atual**  
  Continuar usando apenas `chat/completions` e o RAG “em aplicação” que já existe: a ferramenta **search_knowledge_base** que consulta a tabela `knowledge_base` no Supabase. Nenhuma configuração de RAG no Vertex necessária.

- **Opção B – RAG no Vertex para perguntas “gerais”** *(implementada)*  
  1. No GCP: configurar Vertex AI Search (data store) ou RAG Engine (corpus) como acima.  
  2. No código: quando a intenção for **general**, o ai-orchestrator faz **uma chamada adicional** à API **generateContent** com `tools[].retrieval` (vertexAiSearch ou vertexRagStore), usando o mesmo token da Cloud Function.  
  3. O texto da resposta é injetado no **system prompt** da chamada ao `chat/completions` sob o rótulo `[Contexto da base de conhecimento da Câmara (Vertex RAG)]`.  
  **Secrets (opcionais):** `VERTEX_RAG_DATASTORE` (path do data store) ou `VERTEX_RAG_CORPUS` (path do corpus). Se nenhum estiver definido, o fluxo usa apenas a ferramenta `search_knowledge_base` (Supabase). Ver [SUPABASE_SECRETS_VERTEX.md](./SUPABASE_SECRETS_VERTEX.md).

- **Opção C – Migrar para generateContent**  
  Trocar a chamada principal do orchestrator de `chat/completions` para `generateContent`: converter `messages` → `contents`, tratar tool calls no formato Gemini, e adaptar o streaming. Trabalho maior, mas permite usar retrieval nativo em toda conversa.

Recomendação prática: começar com **Opção B** (Vertex AI Search ou RAG Engine só para um subfluxo) e, se quiser tudo grounded no Vertex, planejar a **Opção C**.

---

## 4. Resumo rápido

| O que fazer | Onde |
|-------------|------|
| Data store (site ou docs) | Console → AI Applications → Data stores |
| RAG corpus + importação | API RAG Engine (ragCorpora, ImportRagFiles) |
| Token para API | Já configurado: Cloud Function `vertex-token` + secrets Supabase |
| Chamada com RAG | API `generateContent` com `tools[].retrieval` (vertexAiSearch ou vertexRagStore) |
| ai-orchestrator | Manter chat/completions; opcionalmente chamar generateContent com RAG em fluxos específicos (Opção B) |

---

## 5. Referências

- [Grounding with Vertex AI Search](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-vertex-ai-search)  
- [RAG Engine API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api)  
- [Ground responses using RAG](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/ground-responses-using-rag)  
- [RAG infrastructure with Gemini and Vertex AI](https://cloud.google.com/architecture/rag-genai-gemini-enterprise-vertexai)  
- [SUPABASE_SECRETS_VERTEX.md](./SUPABASE_SECRETS_VERTEX.md) (configuração atual do Vertex no projeto)
