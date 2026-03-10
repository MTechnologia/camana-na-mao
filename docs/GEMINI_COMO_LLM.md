# Usar Gemini como LLM no Câmara na Mão

O **ai-orchestrator** (e outras funções que chamam o modelo) usam um endpoint **compatível com OpenAI**: `POST .../chat/completions`, com `messages`, `tools`, `tool_choice` e `stream`. O Gemini oferece essa mesma interface, então a troca pode ser feita **só por configuração** (variáveis de ambiente), sem alterar código.

---

## 1. Viabilidade

- **Formato:** O orchestrator envia `model`, `messages`, `temperature`, `stream`, `tools`, `tool_choice`. O Gemini (via API compatível com OpenAI) aceita esse formato.
- **Function calling:** O Gemini suporta `tools` e `tool_choice: "auto"` na mesma forma que você já usa.
- **Streaming:** Suportado.
- **Conclusão:** Sim, é viável trocar a LLM atual (vLLM/Llama) pelo Gemini apenas configurando URL, chave e modelo.

---

## 2. Opção A – Gemini via Google AI Studio (mais simples)

Não exige projeto GCP. Você usa apenas uma **API key** do Google AI Studio.

### Passos

1. **Criar API key**
   - Acesse: **https://aistudio.google.com/apikey**
   - Crie uma chave (ou use uma existente).

2. **Configurar secrets na Edge Function (Supabase)**

   No Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**, defina:

   | Nome               | Valor |
   |--------------------|--------|
   | `AI_CHAT_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
   | `AI_CHAT_API_KEY`  | Sua API key do AI Studio |
   | `AI_CHAT_MODEL`    | `gemini-2.5-flash` (ou `gemini-2.0-flash`, etc.) |

   Não use barra no final da URL (o código já faz `replace(/\/$/, '')` e adiciona `/chat/completions`).

3. **Testar**

   Dispare o chat no app. O orchestrator passará a chamar o Gemini; não é necessário alterar código.

### Modelos úteis (AI Studio)

- `gemini-2.5-flash` – rápido, bom custo/benefício
- `gemini-2.0-flash`
- `gemini-2.5-pro` – mais capaz, mais custo

Lista atual: https://ai.google.dev/gemini-api/docs/models

---

## 3. Opção B – Gemini no GCP (Vertex AI)

Use quando quiser tudo dentro do GCP (projeto, faturamento, políticas, VPC, etc.). O Vertex AI expõe o Gemini com **API compatível com OpenAI**, mas a autenticação é por **conta de serviço** (token OAuth), não por API key.

### Passos gerais no GCP

1. **Projeto e APIs**
   - Crie ou escolha um projeto no [Google Cloud Console](https://console.cloud.google.com).
   - Ative a **Vertex AI API**: no console, APIs e Serviços → Biblioteca → “Vertex AI API” → Ativar.

2. **Conta de serviço**
   - IAM e administração → Contas de serviço → Criar conta de serviço (ex.: `supabase-gemini`).
   - Conceda a ela o papel **“Vertex AI User”** (ou o mínimo necessário para usar o endpoint de geração).
   - Crie uma chave JSON e guarde em local seguro (nunca no repositório).

3. **Endpoint compatível com OpenAI (Vertex)**

   Formato da URL (documentação atual em [Vertex AI – OpenAI compatibility](https://cloud.google.com/vertex-ai/generative-ai/docs/start/openai)):

   ```
   https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/endpoints/openapi
   ```

   Exemplo para região `us-central1` e projeto `meu-projeto`:

   ```
   https://us-central1-aiplatform.googleapis.com/v1/projects/meu-projeto/locations/us-central1/endpoints/openapi
   ```

   O path completo da chamada será: `.../openapi/chat/completions` (conforme a doc do Vertex).

4. **Autenticação a partir da Edge Function**

   A Edge Function (Deno) não usa o SDK do Google nativamente. Duas abordagens:

   - **Obter token com a chave JSON (recomendado em ambiente controlado)**  
     Em um backend seu (ou uma função que só gera token), use a conta de serviço para gerar um **access token** (OAuth 2.0) e exponha um endpoint que a Edge Function chama para obter esse token. A Edge Function então usa:
     - `AI_CHAT_BASE_URL` = URL do Vertex acima (sem `/chat/completions`).
     - `AI_CHAT_API_KEY` = o **access token** (Bearer) que você renova periodicamente (ex.: a cada 50 min).

   - **Proxy no GCP**  
     Crie uma Cloud Function ou Cloud Run que recebe a requisição da Edge Function, adiciona o token (usando Application Default Credentials no GCP) e chama o Vertex. A Edge Function apontaria então para a URL do seu proxy; o proxy usa “Gemini as service” no GCP.

5. **Secrets na Edge Function (Supabase)**

   - `AI_CHAT_BASE_URL`: URL do Vertex (até `.../openapi`, sem `/chat/completions`).
   - `AI_CHAT_API_KEY`: access token (se usar abordagem de token) ou um identificador que seu proxy use para autenticar.
   - `AI_CHAT_MODEL`: por exemplo `gemini-2.0-flash` ou o nome exato do modelo no Vertex (conforme a [documentação de modelos do Vertex](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models)).

### Próximos passos após criar a chave (Vertex)

1. **Permissões**  
   No GCP: **IAM e administração** → **IAM** → localize a conta `supabase-gemini@SEU_PROJETO.iam.gserviceaccount.com`. Garanta o papel **"Vertex AI User"** (ou "Vertex AI Administrator"). Se não tiver, clique em "Conceder acesso" e adicione.

2. **Arquivo JSON da chave**  
   Ao criar a chave você baixou um arquivo `.json`. Guarde em local seguro (nunca no repositório). Você vai usá-lo para obter o **access token** que o Vertex exige.

3. **Ativar Vertex AI API**  
   No console: **APIs e serviços** → **Biblioteca** → procure **"Vertex AI API"** → **Ativar**.

4. **Escolher como a Edge Function vai autenticar**
   - **Opção simples (recomendada para começar):** Use a **Google AI Studio** (Opção A do doc): crie uma API key em https://aistudio.google.com/apikey e configure só `AI_CHAT_BASE_URL`, `AI_CHAT_API_KEY` e `AI_CHAT_MODEL` no Supabase. Não usa a chave da conta de serviço na Edge Function.
   - **Opção Vertex (usa a chave):** Use a **Cloud Function** pronta no repositório: `gcp/vertex-token-function/`. Ela recebe um header secreto, usa o JSON da conta de serviço (env ou Secret Manager) com `google-auth-library`, devolve `{ "token": "..." }`. O **ai-orchestrator** já suporta obter o token dinamicamente: configure no Supabase os secrets `VERTEX_TOKEN_URL` (URL da Cloud Function) e `VERTEX_TOKEN_SECRET` (o mesmo valor do header esperado pela função). Veja instruções de deploy em `gcp/vertex-token-function/README.md`.

5. **Configurar no Supabase**  
   Com o token (ou URL do proxy) em mãos: **Project Settings** → **Edge Functions** → **Secrets** → defina `AI_CHAT_BASE_URL`, `AI_CHAT_API_KEY` e `AI_CHAT_MODEL` conforme a opção escolhida.

---

## 4. Resumo

| Critério        | Google AI Studio (Opção A) | Vertex AI no GCP (Opção B) |
|-----------------|----------------------------|-----------------------------|
| Configuração    | Só URL + API key           | Projeto, conta de serviço, token ou proxy |
| Código          | Nenhuma alteração          | Nenhuma no orchestrator; eventual serviço de token ou proxy |
| Onde “roda”     | Serviço Google (AI Studio) | GCP (Vertex AI)             |
| Uso típico      | Protótipo, MVP, testes     | Produção em GCP, compliance, rede/VPC     |

Para **testar rápido**: use a **Opção A** (AI Studio) apenas trocando as três variáveis de ambiente. Para **usar Gemini como serviço no GCP** de forma nativa: use **Opção B** (Vertex AI) com token ou proxy e as mesmas variáveis no Supabase.

---

## 5. Referências

- [Gemini API – Compatibilidade com OpenAI](https://ai.google.dev/gemini-api/docs/openai)
- [Gemini API – Chaves](https://ai.google.dev/gemini-api/docs/api-key)
- [Vertex AI – Início com OpenAI](https://cloud.google.com/vertex-ai/generative-ai/docs/start/openai)
- [Vertex AI – Autenticação (OpenAI)](https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/auth-and-credentials)
