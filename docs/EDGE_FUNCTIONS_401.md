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

**Sintoma:** Log com `[ai-orchestrator] Full error object: ... "message":"AI API error: 401"`.

**Significado:** O 401 **não** é da autenticação do usuário na Edge Function. É a **API de IA** (Vertex AI ou outro backend compatível com OpenAI) que está rejeitando a requisição feita pela Edge Function.

**Causas comuns:**

1. **Vertex AI (GCP)**  
   - `VERTEX_TOKEN_URL` ou a Cloud Function que gera o token está retornando token **expirado** ou **inválido**.  
   - Conta de serviço do GCP sem permissão (ex.: "Vertex AI User").  
   - Conferir: **VERTEX_TOKEN_URL**, **VERTEX_TOKEN_SECRET** e resposta da função que retorna o token.

2. **API key direta (OpenAI ou compatível)**  
   - **AI_CHAT_API_KEY** ou **AI_API_KEY** incorreta, revogada ou com restrições que bloqueiam a chamada.  
   - Conferir no Supabase: **Edge Functions** → **Secrets** e no painel do provedor de IA (cota, key ativa).

**O que conferir:**

- Supabase → **Edge Functions** → **ai-orchestrator** → **Secrets**:  
  - Se usar Vertex: `VERTEX_TOKEN_URL`, `VERTEX_TOKEN_SECRET` (e que a URL retorna `{ "token": "..." }` válido).  
  - Se usar API key: `AI_CHAT_API_KEY` ou `AI_API_KEY` correta e ativa.
- Logs da **ai-orchestrator** no horário do 401: mensagem já indica se o problema é na chamada à API de IA (401 da resposta do fetch).
- Se usar Vertex: testar a **VERTEX_TOKEN_URL** (por exemplo com `curl`) e ver se o token retornado é aceito pela API Vertex.

---

## Resumo

| Função                 | 401 significa                    | Ação principal                                      |
|------------------------|----------------------------------|-----------------------------------------------------|
| save-expo-push-token   | JWT ausente/inválido na função   | Deploy da função + cliente com `access_token` no body |
| ai-orchestrator        | API de IA rejeitou (token/key)   | Conferir Vertex token URL/secret ou API key nos secrets |
