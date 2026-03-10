# 401 nas Edge Functions – causas e como corrigir

## 1. save-expo-push-token → 401

**Sintoma:** Várias invocations com `POST | 401` na função `save-expo-push-token`.

**Causas comuns:**

1. **Token de autenticação não chega à função**  
   Em **WebView no Android**, o header `Authorization` às vezes é removido em requisições cross-origin. A função passou a aceitar o JWT também no **body** (`access_token`) como fallback.

2. **O que foi feito no código:**
   - A Edge Function agora lê o JWT do header `Authorization` **ou** do body `access_token`.
   - O cliente (useExpoPushToken) envia `access_token` no body além do header.

**O que conferir:**

- Fazer **deploy** da nova versão de `save-expo-push-token` e do frontend que envia `access_token` no body.
- Se ainda der 401: verificar nos logs se a função recebe corpo (body) e se `getSubFromJwt` está conseguindo extrair o `sub` (ex.: JWT expirado ou malformado).

---

## 2. ai-orchestrator → "AI API error: 401"

**Sintoma:** Log com `[ai-orchestrator] Full error object: ... "message":"AI API error: 401"` e corpo do erro contendo `aiplatform.googleapis.com`, `UNAUTHENTICATED`, `ACCESS_TOKEN_TYPE_UNSUPPORTED`.

**Significado:** O 401 **não** é da autenticação do usuário na Edge Function. É a **Vertex AI** (`aiplatform.googleapis.com`) que está rejeitando a requisição porque o tipo de credencial enviado não é aceito.

### Erro exato: `ACCESS_TOKEN_TYPE_UNSUPPORTED`

O Vertex AI **só aceita OAuth 2.0 access token** do Google (obtido com conta de serviço ou credenciais Google). **Não aceita**:

- API key (tipo `AI_API_KEY` / `AI_CHAT_API_KEY`) na URL do Vertex  
- Token de outro provedor  
- Token em formato errado  

**O que fazer:**

1. **Garantir que a `VERTEX_TOKEN_URL` retorna um OAuth2 access token do Google**
   - A Cloud Function (ou outro endpoint) apontada por `VERTEX_TOKEN_URL` deve usar **Google Auth Library** com a **conta de serviço** que tem permissão "Vertex AI User".
   - Exemplo em Node: `const { GoogleAuth } = require('google-auth-library'); const auth = new GoogleAuth(); const client = await auth.getClient(); const token = await client.getAccessToken();` e responder `{ "token": token.token }`.
   - O valor em `token` deve ser um **access_token** OAuth2 do Google (string longa), não uma API key.

2. **Não usar `AI_API_KEY` para chamar o Vertex**
   - Se `VERTEX_TOKEN_URL` falhar ou não estiver configurada, o código pode estar caindo no fallback e enviando `AI_API_KEY` como Bearer. O Vertex rejeita isso → `ACCESS_TOKEN_TYPE_UNSUPPORTED`.
   - Conferir nos logs se aparece `[ai-orchestrator] Vertex token obtained from ...`. Se não aparecer, a função está usando `AI_API_KEY` na URL do Vertex; aí é preciso corrigir a Cloud Function da token ou a ordem de preferência no código.

3. **Conferir conta de serviço no GCP**
   - A conta de serviço usada para obter o token deve ter papel **Vertex AI User** (ou equivalente) no projeto onde está o Vertex AI.

### Testar o endpoint vertex-token manualmente

No terminal (substitua pela sua URL e pelo valor de VERTEX_TOKEN_SECRET):

```bash
curl -s -w "\nHTTP_CODE:%{http_code}" -H "X-Token-Secret: SEU_VERTEX_TOKEN_SECRET" "SUA_VERTEX_TOKEN_URL"
```

- Se retornar **HTTP 200** e um JSON com `"token": "ya29...."` (ou string longa), o token está sendo gerado.
- Se retornar **401/403**, o `X-Token-Secret` não confere com o `TOKEN_SECRET` do Cloud Run.
- Se retornar **500** ou body sem `token`, verifique os logs do serviço vertex-token no Cloud Run.

### Como ver ou alterar os secrets no Supabase

- **Ver valor:** No dashboard, em **Project Settings** → **Edge Functions** → **Secrets**, use o menu **⋮** (três pontos) na linha do secret → **View value** ou **Copy**. Em alguns projetos só é possível **editar** (substituir), sem visualizar o valor antigo.
- **Alterar:** Clique em **Edit** no secret, cole o novo valor e salve. Não é necessário redeploy da função; as Edge Functions leem os secrets em cada invocação.

---

## Resumo

| Função                 | 401 significa                    | Ação principal                                      |
|------------------------|----------------------------------|-----------------------------------------------------|
| save-expo-push-token   | JWT ausente/inválido na função   | Deploy da função + cliente com `access_token` no body |
| ai-orchestrator        | API de IA rejeitou (token/key)   | Conferir Vertex token URL/secret ou API key nos secrets |
