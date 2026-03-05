# Deploy do front no Cloud Run e validação (token Expo)

Este doc descreve como **disparar um novo deploy** do front e como **validar** que o build tem o código certo e o Supabase correto (para o fluxo do token Expo push).

---

## 1. Como o deploy é feito

O front é buildado e publicado no **Cloud Run** pelo **Cloud Build** (GCP), usando:

- **`cloudbuild.yaml`** – passa `CAMARA_URL`, `CAMARA_PUBLISHABLE_KEY`, `CAMARA_PROJECT_ID` como build args para o Docker.
- **`Dockerfile`** – usa esses args no `npm run build`; o Vite expõe `CAMARA_*` e `VITE_*` no bundle.

Os **valores** dessas variáveis vêm das **substitution variables** do **trigger** do Cloud Build no GCP (não do `cloudbuild.yaml`, onde estão vazios por padrão).

---

## 2. Disparar um novo deploy

### Opção A: Push na branch que dispara o trigger

1. Faça commit e push das alterações (incluindo `useExpoPushToken`, logs, etc.) na branch que o Cloud Build usa (ex.: `main` ou `dev` – confirme no GCP qual branch está configurada no trigger).
2. O trigger do Cloud Build roda o build e o deploy no Cloud Run.
3. Aguarde o build terminar (alguns minutos). A nova revisão do Cloud Run passa a servir o front atualizado.

### Opção B: Build manual (gcloud)

Se tiver o `gcloud` configurado e permissões no projeto:

```bash
# Na raiz do repositório
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_CAMARA_URL=https://vjzkzsczlbtmrzewffdx.supabase.co,_CAMARA_PUBLISHABLE_KEY=SEU_ANON_KEY,_CAMARA_PROJECT_ID=vjzkzsczlbtmrzewffdx"
```

Substitua `SEU_ANON_KEY` pela chave anon do projeto Supabase `vjzkzsczlbtmrzewffdx`.

---

## 3. Validar os passos

### 3.1 Build do front no Cloud Run tem o código novo?

- **O que validar:** o deploy foi feito **depois** das alterações no `useExpoPushToken` (Edge Function, polling, logs como `[useExpoPushToken] ativo no app`).
- **Como validar:**
  1. Confirme que o commit com essas alterações está na branch que o trigger do Cloud Build usa.
  2. Dispare um novo deploy (push ou build manual).
  3. Depois do deploy, abra o app (WebView carregando a URL do Cloud Run), faça login e inspecione o WebView (Chrome → `chrome://inspect`). No **Console** deve aparecer algo como:  
     `[useExpoPushToken] ativo no app (WebView), userId: ...`  
     Se aparecer, o bundle servido pelo Cloud Run é o que contém o hook atualizado.

### 3.2 Supabase do front é o projeto certo?

- **O que validar:** o front no Cloud Run foi buildado com **`CAMARA_URL`** (ou `VITE_SUPABASE_URL`) apontando para **`https://vjzkzsczlbtmrzewffdx.supabase.co`** (o mesmo projeto onde estão `send-web-push` e `save-expo-push-token`).
- **Como validar:**
  1. **GCP Console** → **Cloud Build** → **Triggers** → abra o trigger que faz o deploy do front.
  2. Em **Substitution variables** (ou equivalente), confira:
     - `_CAMARA_URL` = `https://vjzkzsczlbtmrzewffdx.supabase.co`
     - `_CAMARA_PUBLISHABLE_KEY` = chave anon do projeto **vjzkzsczlbtmrzewffdx**
     - `_CAMARA_PROJECT_ID` = `vjzkzsczlbtmrzewffdx` (se usado).
  3. Se estiverem vazios ou com outro projeto, o front chama outro Supabase e o token pode estar sendo salvo (ou falhando) no projeto errado. Corrija as variáveis no trigger e rode um novo build.

### 3.3 Depois do deploy: token no app

1. Abra o app (WebView com a URL do Cloud Run), faça login.
2. No **Console** do WebView: deve aparecer `[useExpoPushToken] ativo no app (WebView), userId: ...` e, em seguida, "token já injetado" ou "chamando Edge Function" (ou "token encontrado no polling").
3. Na aba **Rede**, filtre por **`save-expo-push-token`**: deve haver uma requisição **POST** com status **200**.
4. No **Supabase** → **Table Editor** → **profiles** → sua linha → coluna **expo_push_token** deve estar preenchida com `ExponentPushToken[...]`.
5. Em **Edge Functions** → **save-expo-push-token** → **Logs**: deve aparecer `[save-expo-push-token] token saved for user ...`.

---

## 4. Resumo

| O que fazer | Como |
|-------------|------|
| **Novo deploy** | Push na branch do trigger ou `gcloud builds submit` com as substitutions. |
| **Código novo no Cloud Run** | Deploy após o commit do useExpoPushToken; no WebView, conferir log `[useExpoPushToken] ativo no app`. |
| **Supabase certo** | No trigger do Cloud Build, `_CAMARA_URL` = `https://vjzkzsczlbtmrzewffdx.supabase.co` (e anon key do mesmo projeto). |

Depois disso, o app (WebView no Cloud Run) deve registrar o token e a `send-web-push` deve encontrar `expo_push_token` em `profiles`.
