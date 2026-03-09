# Lembrete D-1 (audiências)

Envia notificação no app para usuários inscritos em **videoconferência** cuja audiência é **amanhã** (data = dia seguinte).

## Uso

Invocar por HTTP GET ou POST (sem body). Exemplo:

```bash
curl -X POST "https://SEU_PROJETO.supabase.co/functions/v1/audiencia-reminder-d1" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

## Configurar o cron (passo a passo)

Use a URL do seu projeto (ex.: `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/audiencia-reminder-d1`).

1. **Title:** ex. `Lembrete audiência D-1`
2. **URL \*:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-d1`
3. **Headers (se o cron permitir):** adicione `Authorization: Bearer SEU_ANON_KEY`. A chave anon está em Supabase Dashboard → Settings → API → Project API keys → `anon` public.
4. **Fuso:** use `America/Sao_Paulo` para 08:00 em horário de Brasília.

### Testar o disparo com uma audiência futura (ex.: dia 26)

Para ver o lembrete aparecer **agora** (sem esperar até D-1), use o parâmetro **`for_date`** na URL. A função trata essa data como “dia alvo” em vez de amanhã.

- **URL de teste:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-d1?for_date=2026-02-26`
- No cron (cron-job.org), configure essa URL com `?for_date=2026-02-26` e rode **TEST RUN** ou deixe o cron a cada 1 minuto (`* * * * *`). Na primeira execução será criada a notificação “Lembrete: audiência amanhã” para quem está inscrito na audiência do dia 26. Nas próximas execuções, a função não duplica (evita reenviar nas últimas 48h).
- Quando terminar o teste, **remova o `?for_date=...`** da URL do cron e use o agendamento definitivo (08:00).

### Teste (1 em 1 minuto)

- Em **Execution schedule**, escolha **Custom**.
- No campo **Crontab expression** use: `* * * * *` (a cada 1 minuto).
- Salve e use **TEST RUN** para disparar na hora. Depois de conferir as notificações, mude para o agendamento definitivo.

### Produção (todo dia às 08:00)

- Em **Execution schedule**, escolha **Every day at** e defina **8 : 00** (hora 8, minuto 0).
- Ou em **Custom** use o crontab: `0 8 * * *` (08:00 no fuso do job).

A função evita duplicatas: não envia de novo o lembrete para o mesmo (user_id, audiencia_id) nas últimas 48h.

## Deploy

```bash
supabase functions deploy audiencia-reminder-d1
```
