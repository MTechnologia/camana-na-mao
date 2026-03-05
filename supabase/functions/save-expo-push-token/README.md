# save-expo-push-token

Edge Function que persiste o **Expo Push Token** do usuário em `profiles.expo_push_token`.

## Por que existe

O frontend no app (WebView) obtém o token do native e envia para o backend. Fazer o update direto com o cliente Supabase no WebView pode falhar (RLS, cookies, timing). Esta função:

- Recebe o token no body e o JWT do usuário no header `Authorization`
- Valida o usuário e o formato do token
- Atualiza `profiles.expo_push_token` com **service role**, garantindo que o valor seja salvo

## Chamada

- **Método:** POST  
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <access_token>`  
- **Body:** `{ "token": "ExponentPushToken[...]" }`

## Deploy

Incluída no deploy geral das Edge Functions do projeto (ex.: `supabase functions deploy` ou pipeline que faz deploy de `supabase/functions/`).

Não exige secrets adicionais; usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do projeto.
