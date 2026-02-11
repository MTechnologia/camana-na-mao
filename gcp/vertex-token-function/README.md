# Cloud Function: Vertex AI access token

Função que devolve um **access token** OAuth 2.0 para chamadas ao Vertex AI (Gemini). O **Supabase ai-orchestrator** chama esta URL com um segredo, recebe `{ "token": "..." }` e usa o token como `Authorization: Bearer` nas requisições ao endpoint Vertex (OpenAI-compatible).

---

## 1. Variáveis de ambiente (secrets)

| Nome | Obrigatório | Descrição |
|------|-------------|-----------|
| `TOKEN_SECRET` | Sim | Valor que o **cliente** (Supabase) deve enviar no header `X-Token-Secret` (ou `Authorization: Bearer TOKEN_SECRET`). Escolha uma string longa e aleatória. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Sim | JSON **inteiro** da chave da conta de serviço (o arquivo que você baixou ao criar a chave no GCP). Deve ser uma única string (o conteúdo do .json). |

---

## 2. Deploy (gcloud)

### Pré-requisitos

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) instalado e `gcloud auth login` feito.
- Projeto GCP com **Vertex AI API** ativada e conta de serviço `supabase-gemini` com papel **Vertex AI User**.

### Passo a passo

1. **Navegue até a pasta da função**

   ```bash
   cd gcp/vertex-token-function
   ```

2. **Instale dependências (opcional, para testar localmente)**

   ```bash
   npm install
   ```

3. **Crie o segredo para o cliente (ex.: uma string aleatória)**

   ```bash
   # Exemplo: gere um valor e guarde para usar no Supabase
   openssl rand -base64 32
   ```

   Guarde esse valor: será o `TOKEN_SECRET` na função e o `VERTEX_TOKEN_SECRET` no Supabase.

4. **Prepare o JSON da conta de serviço**

   Você já tem o arquivo `.json` da chave (ex.: `supabase-gemini-xxxx.json`). O conteúdo inteiro será passado como variável de ambiente. Em Windows (PowerShell) pode escapar assim:

   ```powershell
   $json = Get-Content -Raw -Path "C:\caminho\para\supabase-gemini-xxxx.json"
   # Use $json no próximo passo (--set-env-vars)
   ```

5. **Deploy da Cloud Function (2nd gen)**

   Substitua `SEU_PROJETO`, `REGION` (ex.: `us-central1`), `TOKEN_SECRET` e o valor de `GOOGLE_APPLICATION_CREDENTIALS_JSON`:

   ```bash
   gcloud functions deploy vertex-token \
     --gen2 \
     --runtime=nodejs20 \
     --region=us-central1 \
     --source=. \
     --entry-point=vertexToken \
     --trigger-http \
     --allow-unauthenticated \
     --set-env-vars "TOKEN_SECRET=SEU_TOKEN_SECRET_AQUI,GOOGLE_APPLICATION_CREDENTIALS_JSON={\"type\":\"service_account\",\"project_id\":\"...\"}"
   ```

   **Usando arquivo YAML (evita problemas de escape):**

   O `--env-vars-file` do gcloud espera **YAML**, não .env. Crie `env.yaml` (não commitar):

   ```yaml
   TOKEN_SECRET: "seu_token_aqui"
   GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"type":"service_account","project_id":"..."}'
   ```

   O valor do JSON deve estar entre **aspas simples** para o YAML não interpretar `:` como chave. No PowerShell (com o JSON já em uma linha em `$jsonOneLine`):

   ```powershell
   "TOKEN_SECRET: ""SEU_TOKEN_AQUI""" | Set-Content env.yaml -Encoding UTF8
   "GOOGLE_APPLICATION_CREDENTIALS_JSON: '" + $jsonOneLine + "'" | Add-Content env.yaml -Encoding UTF8
   ```

   Deploy: `--env-vars-file=env.yaml`. Ou use **Secret Manager** (veja seção abaixo).

6. **URL da função**

   Após o deploy, a URL será algo como:

   ```
   https://us-central1-SEU_PROJETO.cloudfunctions.net/vertex-token
   ```

   Use essa URL no Supabase como `VERTEX_TOKEN_URL`.

---

## 3. Usar Secret Manager (recomendado em produção)

Em vez de colocar o JSON em variável de ambiente no deploy, use o Secret Manager:

1. **Crie o secret com o JSON da conta de serviço**

   ```bash
   gcloud secrets create vertex-sa-credentials --data-file=./supabase-gemini-xxxx.json
   ```

2. **Conceda à conta padrão do Cloud Functions acesso ao secret**

   ```bash
   # Nome da conta padrão (ajuste REGION e PROJETO)
   PROJECT_ID=$(gcloud config get-value project)
   PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
   SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

   gcloud secrets add-iam-policy-binding vertex-sa-credentials \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Deploy referenciando o secret**

   ```bash
   gcloud functions deploy vertex-token \
     --gen2 \
     --runtime=nodejs20 \
     --region=us-central1 \
     --source=. \
     --entry-point=vertexToken \
     --trigger-http \
     --allow-unauthenticated \
     --set-env-vars "TOKEN_SECRET=SEU_TOKEN_SECRET" \
     --set-secrets "GOOGLE_APPLICATION_CREDENTIALS_JSON=vertex-sa-credentials:latest"
   ```

   O Cloud Functions injeta o **conteúdo** do secret em `GOOGLE_APPLICATION_CREDENTIALS_JSON`. O código atual espera uma string JSON; se o secret for o conteúdo do arquivo da chave, funciona igual.

---

## 4. Configurar no Supabase

No **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**, defina:

| Secret | Valor |
|--------|--------|
| `AI_CHAT_BASE_URL` | URL do Vertex (OpenAI-compatible), ex.: `https://us-central1-aiplatform.googleapis.com/v1/projects/SEU_PROJETO/locations/us-central1/endpoints/openapi` |
| `AI_CHAT_MODEL` | Ex.: `gemini-2.0-flash` |
| `VERTEX_TOKEN_URL` | URL da Cloud Function, ex.: `https://us-central1-SEU_PROJETO.cloudfunctions.net/vertex-token` |
| `VERTEX_TOKEN_SECRET` | O mesmo valor que você definiu em `TOKEN_SECRET` na Cloud Function |

**Não** é necessário definir `AI_CHAT_API_KEY`: o token é obtido dinamicamente via `VERTEX_TOKEN_URL` + `VERTEX_TOKEN_SECRET`.

---

## 5. Testar a função

```bash
curl -H "X-Token-Secret: SEU_TOKEN_SECRET" \
  "https://us-central1-SEU_PROJETO.cloudfunctions.net/vertex-token"
```

Resposta esperada: `{ "token": "ya29...." }`.

---

## 6. Segurança

- **TOKEN_SECRET:** Use uma string longa e aleatória; não commite em repositório.
- **allow-unauthenticated:** A função está aberta na internet, mas só devolve token se `X-Token-Secret` (ou `Authorization: Bearer TOKEN_SECRET`) for correto. Quem não souber o segredo recebe 401.
- O token retornado expira em ~1 hora. A função faz cache e renova automaticamente antes de expirar.
