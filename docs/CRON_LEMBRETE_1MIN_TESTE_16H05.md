# Cron "Lembrete 1 minuto" – teste às 16h05

A audiência de teste foi criada no banco com **data = hoje** e **hora = 16:05**. O lembrete deve ser disparado **1 minuto antes**, ou seja, às **16:04**.

## O que preencher no "Create a job" (Google Cloud)

| Campo | Valor |
|-------|--------|
| **Name** | `Lembrete_Teste_1_Minuto` (ou outro nome único) |
| **Region** | `southamerica-east1 (São Paulo)` |
| **Description** | `Lembrete para teste de 1 minuto antes da audiência` |
| **Frequency** | `4 16 * * *` |
| **Timezone** | `America/Sao_Paulo` |

### Explicação da Frequency

- **`4 16 * * *`** = todo dia às **16:04** (minuto 4, hora 16).
- Formato: `minuto hora dia mês dia-da-semana`.
- Para testar **só uma vez** hoje: use o horário desejado, ex.: se agora são 15:50, use `51 15 * * *` para disparar às 15:51 (e ajuste a audiência de teste no banco para 15:52 se quiser "1 min depois").

### Minute and Hour (se o formulário tiver)

- Selecione **"At 4:04 PM"** (16:04) ou o equivalente.
- Se não houver 16:04, use o campo **Frequency** com `4 16 * * *`.

### Resumo

1. **Timezone:** sempre `America/Sao_Paulo`.
2. **Frequency:** `4 16 * * *` para rodar todo dia às 16:04.
3. **URL e header** — veja a seção **"Como configurar a URL no job"** abaixo.

---

## Como configurar a URL no job

### 1. Deploy da function (uma vez)

```bash
npx supabase functions deploy audiencia-reminder-1min
```

### 2. URL para colocar no job

```
https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-1min
```

- Troque **SEU_PROJECT_REF** pelo Reference ID do projeto: **Supabase Dashboard → Project Settings → General → Reference ID** (ex.: `vjzkzsczlbtmrzewffdx`).
- Exemplo: `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/audiencia-reminder-1min`

### 3. Método HTTP

O job deve fazer **POST** (ou GET) para essa URL.

### 4. Cabeçalho obrigatório

As Edge Functions exigem a chave anon. No HTTP target do job, adicione o header:

| Name | Value |
|------|--------|
| `Authorization` | `Bearer SEU_ANON_KEY` |

- **anon key:** **Dashboard → Project Settings → API** → campo **anon** (chave pública).

### 5. Teste manual (opcional)

Para simular "agora = 16:04" sem esperar o cron (ajuste a data para hoje):  
`.../audiencia-reminder-1min?at=2026-02-19T16:04`

---

## Audiência de teste no banco

- **splegis_chave:** `TESTE-MOCK-16H05`
- **data:** sempre o dia atual (atualizada no `ON CONFLICT` da migration).
- **hora:** `16:05:00`
- A migration `20260219160000_audiencia_teste_mock_16h05.sql` insere ou atualiza essa linha.

Para aplicar a migration no projeto:

```bash
npx supabase db push --include-all
```

Ou execute o `INSERT` manualmente no SQL Editor do Supabase.
