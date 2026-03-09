# Lembrete 1h antes (audiências)

Envia notificação no app para usuários inscritos em **videoconferência** cuja audiência começa em **aproximadamente 1 hora** (janela: 45–75 minutos a partir do momento da execução).

## Uso

Invocar por HTTP GET ou POST (sem body). Exemplo:

```bash
curl -X POST "https://SEU_PROJETO.supabase.co/functions/v1/audiencia-reminder-1h" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

## Configurar o cron

Para não perder a janela de 1h, execute a função **a cada 15 minutos**.

1. **URL:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-1h`
2. **Headers:** `Authorization: Bearer SEU_ANON_KEY` (Supabase → Settings → API → anon public).
3. **Agendamento:** a cada 15 min. No cron-job.org:
   - **Custom** → Crontab: `*/15 * * * *`
   - Ou “Every 15 minutes”.
4. **Fuso:** use `America/Sao_Paulo` para que “agora” seja horário de Brasília.

### Testar com data/hora fixas

Use o parâmetro **`at`** para simular “agora” e disparar lembretes para audiências que, naquele momento, estariam na janela de 1h:

- **Exemplo:** audiência no dia 26/02/2026 às 14:00 BRT. Para receber o lembrete “em 1h”, simule agora = 13:00.
- **URL de teste:**  
  `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-1h?at=2026-02-26T13:00`

A função interpreta `at` em BRT (UTC-3). Só serão notificadas audiências cujo início esteja entre 45 e 75 minutos após esse “agora”.

### Evitar duplicatas

A função não envia de novo o lembrete 1h para o mesmo `(user_id, audiencia_id)` nas últimas 2 horas.

## Deploy

```bash
supabase functions deploy audiencia-reminder-1h
```

## Fluxo de notificação

Assim como o lembrete D-1, esta função apenas **insere linhas na tabela `notifications`**. O envio por push/e-mail/SMS é feito pelo webhook que chama a Edge Function `send-web-push` (Database Webhook em `notifications` INSERT).
