# CORS e cold start – ai-orchestrator

## Testar preflight (OPTIONS) no PowerShell

No Windows, `curl` é alias de `Invoke-WebRequest` e a sintaxe é diferente. Use:

```powershell
Invoke-WebRequest -Uri 'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/ai-orchestrator' -Method OPTIONS -Headers @{ Origin = 'https://camana-na-mao-767943602990.southamerica-east1.run.app' } -UseBasicParsing
```

Para ver só status e headers:

```powershell
Invoke-WebRequest -Uri 'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/ai-orchestrator' -Method OPTIONS -Headers @{ Origin = '...' } -UseBasicParsing | Select-Object StatusCode, Headers
```

## Cold start e timeout do preflight

Se o **OPTIONS retorna 200** quando testado direto, mas o **navegador** mostra "Response to preflight request doesn't pass access control check: It does not have HTTP ok status", a causa provável é:

- **Cold start** da Edge Function (primeira requisição após um tempo sem uso) leva vários segundos (ex.: 10–15 s).
- O navegador dá **timeout** no preflight antes de receber a resposta → trata como falha e bloqueia o POST (CORS).

**O que fazer:**

1. **Manter a função “quente”**  
   Chamar a função de tempos em tempos (ex.: cron job ou health check) para reduzir cold start na hora do uso:
   - Ex.: `GET` ou `OPTIONS` a cada 5–10 minutos para o mesmo projeto/URL.

2. **Segunda tentativa do usuário**  
   Na segunda tentativa a instância costuma estar quente e o OPTIONS responde rápido; aí o POST pode ir (e o 500 que aparece é do handler, não de CORS).

3. **Ver o erro real do POST (500)**  
   Nos logs da função (Dashboard → Edge Functions → ai-orchestrator → Logs) procure por:
   - `[ai-orchestrator] Load or handler error:`  
   Isso indica se o problema é `import` de `lib`, env, ou outro erro no handler.

4. **Supabase**  
   Planos pagos costumam ter cold start menor; em planos gratuitos o tempo de subida pode ser maior.
