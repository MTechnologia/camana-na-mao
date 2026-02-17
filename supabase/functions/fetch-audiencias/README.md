# fetch-audiencias

Sincroniza audiências públicas com o banco a partir do **Web Service SPLEGIS** da Câmara Municipal de São Paulo.

- **API:** https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx  
- **Método usado:** `AudienciasPublicasV2JSON` via **GET** (parâmetros na query: `DataInicial`, `DataFinal`). A API não aceita POST para esse método.

## Uso

Chamada via HTTP (com service role ou em cron):

```bash
# Sincronizar período padrão (2020-01-01 a 2030-12-31), fazendo upsert por splegis_chave
POST https://SEU_PROJECT.supabase.co/functions/v1/fetch-audiencias

# Período customizado
POST "https://SEU_PROJECT.supabase.co/functions/v1/fetch-audiencias?dataInicial=2025-01-01&dataFinal=2025-12-31"

# Substituir todas as audiências vindas do SPLEGIS (apaga as que têm splegis_chave e reimporta)
POST "https://SEU_PROJECT.supabase.co/functions/v1/fetch-audiencias?replace=1"
```

## Query params

| Parâmetro     | Padrão                | Descrição |
|---------------|------------------------|-----------|
| `dataInicial` | **2008-01-01**        | Data inicial (YYYY-MM-DD). Cobertura desde 2008. |
| `dataFinal`   | 31/12 do próximo ano  | Data final (YYYY-MM-DD). |
| `replace`     | false                  | Se `1` ou `true`, remove todas as linhas com `splegis_chave` preenchido antes de inserir as da API. |

A função usa **upsert em lotes**; período padrão cobre de 2008 até o próximo ano. Se der timeout (504) com muitos registros, chame com intervalo menor (ex.: `?dataInicial=2020-01-01&dataFinal=2022-12-31`) e depois repita para outros anos.

## Banco

- A tabela `audiencias` deve ter a coluna `splegis_chave` (ver migration `20260206120000_audiencias_splegis_chave.sql`).
- Inserções/atualizações usam `splegis_chave` para identificar a mesma audiência e evitar duplicatas.

## Horário (hora)

O horário é lido dos campos **Hora**, **Horario**, **HorarioInicio** ou **DataHora** (ISO) da resposta da API SPLEGIS. Formatos aceitos: `HH:MM`, `HH:MM:SS`, `HHhMM`, ou data/hora ISO (o tempo é extraído). Se a API não enviar horário, a coluna `hora` fica `NULL` e o app exibe "Horário a definir". Se o **site oficial** da Câmara mostrar um horário diferente (ex.: 10h30 no site e 09h00 no app), é provável que o SPLEGIS não esteja retornando esse campo ou use outra fonte; rodar a sync de novo após a API expor o horário correto atualiza os dados.

## Deploy

A função está configurada com `verify_jwt = false` em `supabase/config.toml` para aceitar chamadas sem validar JWT (sync é público, sem dados do usuário).

```bash
supabase functions deploy fetch-audiencias
```

Se precisar forçar sem JWT (quando o config não for lido): `supabase functions deploy fetch-audiencias --no-verify-jwt`

## Como testar

### 1. Pelo terminal (curl)

Use a URL do seu projeto e a **chave anon** (ou service role). No `.env` ou no Dashboard do Supabase: **Settings → API** (Project URL e anon key).

```bash
curl -X POST "https://SEU_PROJECT_REF.supabase.co/functions/v1/fetch-audiencias" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json"
```

Resposta esperada (exemplo):

```json
{
  "ok": true,
  "source": "splegis",
  "totalFromApi": 42,
  "inserted": 40,
  "updated": 2,
  "message": "Sincronizadas: 40 inseridas, 2 atualizadas."
}
```

Se der erro (ex.: API SPLEGIS fora ou formato diferente), virá `"ok": false` e `"error": "..."`.

**Se aparecer 401 (Unauthorized):** no Dashboard do Supabase confira se a função aceita chamadas com a chave **anon** (Settings → API; em Edge Functions, fetch-audiencias está com `verify_jwt = false`).

### 2. Pelo app / cron

A sincronização pode ser disparada por um cron (recomendado) ou manualmente via curl/Postman. Veja a seção **Configurar o cron** abaixo.

### 3. Conferir no sistema

- Abra **Audiências Públicas** no menu e veja se as audiências aparecem.
- No **Dashboard do Supabase**: **Table Editor → audiencias** para ver os registros e a coluna `splegis_chave` preenchida nos que vieram da API.
- Em **Edge Functions → fetch-audiencias → Logs** você vê as chamadas e possíveis erros.

---

## Configurar o cron (atualização automática)

Para que as audiências sejam atualizadas automaticamente (como notícias/agenda), configure um job que chame a função em um intervalo fixo.

**URL da função:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/fetch-audiencias`  
Ex.: `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/fetch-audiencias`

### Opção A – cron-job.org (ou similar)

1. Crie um novo cron job.
2. **URL:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/fetch-audiencias`
3. **Método:** POST.
4. **Headers:** adicione `Authorization: Bearer SEU_ANON_KEY`. A chave anon está em **Supabase Dashboard → Settings → API → Project API keys → anon (public)**.
5. **Fuso:** `America/Sao_Paulo` para horário de Brasília.
6. **Agendamento sugerido:** 1x por dia, por exemplo **06:00** (manhã), para não sobrecarregar a API SPLEGIS.
   - **Custom crontab:** `0 6 * * *` (todo dia às 06:00).
   - Ou use a opção “Every day at” e defina 6 : 00.

### Opção B – Google Cloud Scheduler (GCP)

1. No **Cloud Console**, vá em **Cloud Scheduler** e crie um job.
2. **URL:** a mesma acima.
3. **Método:** POST.
4. **Headers:** `Authorization: Bearer SEU_ANON_KEY`.
5. **Frequência:** ex. `0 6 * * *` (todo dia às 06:00, fuso do job em America/Sao_Paulo).

### Período sincronizado

Por padrão a função usa `dataInicial=2008-01-01` e `dataFinal` = fim do próximo ano. Para alterar, use query params na URL do cron, por exemplo:

- `https://.../fetch-audiencias?dataInicial=2020-01-01&dataFinal=2027-12-31`

### Timeout (erro "connection closed before message completed")

Se o job falhar com **Http: connection closed before message completed**, o cliente (ex.: Cloud Scheduler) fechou a conexão antes da função terminar — a sync com muitos registros pode levar vários minutos. Ajuste o **attempt deadline** do job para até **30 minutos** (máximo para HTTP no GCP):

```bash
gcloud scheduler jobs update http Atualiza_Audiencias \
  --location=southamerica-east1 \
  --attempt-deadline=1800s
```

`1800s` = 30 min. Se preferir 10 min: `--attempt-deadline=600s`. No console: edite o job → "Configure optional settings" → **Attempt deadline**.
