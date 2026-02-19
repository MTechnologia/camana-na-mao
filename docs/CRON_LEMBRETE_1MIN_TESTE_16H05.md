# Cron "Lembrete 1 minuto" – teste às 11h50

A audiência de teste foi criada no banco com **data = hoje** e **hora = 11:50**. O lembrete deve ser disparado **1 minuto antes**, ou seja, às **11:49**.

## O que preencher no "Create a job" (Google Cloud)

| Campo | Valor |
|-------|--------|
| **Name** | `Lembrete_Teste_1_Minuto` (ou outro nome único) |
| **Region** | `southamerica-east1 (São Paulo)` |
| **Description** | `Lembrete para teste de 1 minuto antes da audiência` |
| **Frequency** | `49 11 * * *` |
| **Timezone** | `America/Sao_Paulo` |

### Explicação da Frequency

- **`49 11 * * *`** = todo dia às **11:49** (minuto 49, hora 11).
- Formato: `minuto hora dia mês dia-da-semana`.
- Para testar **só uma vez** hoje: use o horário desejado, ex.: se agora são 11:40, use `49 11 * * *` para disparar às 11:49 (1 min antes das 11h50).

### Minute and Hour (se o formulário tiver)

- Selecione **"At 11:49 AM"** (11:49) ou o equivalente.
- Se não houver 11:49, use o campo **Frequency** com `49 11 * * *`.

### Resumo

1. **Timezone:** sempre `America/Sao_Paulo`.
2. **Frequency:** `49 11 * * *` para rodar todo dia às 11:49.
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

Para simular "agora = 11:49" sem esperar o cron (ajuste a data para hoje):  
`.../audiencia-reminder-1min?at=2026-02-19T11:49`

---

## Audiência de teste no banco

- **splegis_chave:** `TESTE-MOCK-16H05` (mantido para não duplicar registro).
- **data:** sempre o dia atual (atualizada no `ON CONFLICT` da migration).
- **hora:** `11:50:00`
- A migration `20260219160000_audiencia_teste_mock_16h05.sql` insere a linha; `20260219170000_audiencia_teste_mock_11h50.sql` atualiza para 11h50; `20260219180000_audiencia_teste_mock_amanha_11h.sql` define **data = amanhã, hora = 11:00** para testar o lembrete D-1 (24h antes).

Para aplicar a migration no projeto:

```bash
npx supabase db push --include-all
```

Ou execute o `INSERT` manualmente no SQL Editor do Supabase.

---

## Testar lembretes de 1h e 24h (D-1) com o mock

Sim, os lembretes **1h antes** e **24h antes (D-1)** podem ser testados usando a mesma audiência de teste (e eventualmente uma audiência “amanhã” para o D-1). Ambos só enviam notificação para usuários **inscritos** na audiência (tabela `audiencia_participacoes`).

### Lembrete 1h antes (audiencia-reminder-1h)

- A função considera audiências que começam entre **45 e 75 minutos** depois de “agora”.
- A audiência mock está às **11:50**. Para cair nessa janela, simule “agora” como **10:50** (60 min antes).

**Passos:**

1. Obter o **id** da audiência de teste (splegis_chave = `TESTE-MOCK-16H05`):
   ```sql
   SELECT id FROM audiencias WHERE splegis_chave = 'TESTE-MOCK-16H05';
   ```
2. Inserir uma **participação** (videoconferência) para um usuário de teste:
   ```sql
   INSERT INTO audiencia_participacoes (audiencia_id, tipo, user_id, nome, email, telefone)
   VALUES (
     '<ID_DA_AUDIENCIA_MOCK>',
     'videoconferencia',
     '<SEU_USER_ID>',
     'Teste',
     'seu@email.com',
     NULL
   );
   ```
3. Chamar a função simulando 10:50 (ajuste a data para hoje):
   ```
   GET/POST .../audiencia-reminder-1h?at=2026-02-19T10:50
   ```
   Com header `Authorization: Bearer SEU_ANON_KEY`.
4. O usuário inscrito deve receber a notificação “Lembrete: audiência em 1 hora” (ou aparecer em `notifications`).

### Lembrete 24h antes (audiencia-reminder-d1)

- A função considera audiências cuja **data** é “amanhã” (ou a data passada em `for_date`).
- A audiência mock tem **data = hoje**, então para testar o D-1 de forma coerente (“amanhã é o dia”) é melhor usar uma audiência com **data = amanhã**.

**Opção A – Audiência mock “amanhã”**

1. Inserir uma audiência de teste com data de amanhã (ou usar a mesma mock e alterar temporariamente a data para amanhã no banco).
2. Inserir uma participação para essa audiência (videoconferência + user_id).
3. Chamar:
   ```
   .../audiencia-reminder-d1?for_date=YYYY-MM-DD
   ```
   com `YYYY-MM-DD` = data de amanhã. Quem estiver inscrito nessa audiência recebe o lembrete “Lembrete: audiência amanhã”.

**Opção B – Testar com a mock de hoje**

- Chamar com `for_date=HOJE` (data da mock). A função vai listar participações de audiências que acontecem “hoje”; a mensagem do lembrete diz “Amanhã é o dia”, então o texto fica incoerente, mas o fluxo (busca, inserção em `notifications`) pode ser validado.

**Resumo:** Para **1h**, use a mock às 11:50 + uma inscrição + `?at=...T10:50`. Para **D-1**, use uma audiência com data = amanhã + uma inscrição + `?for_date=AMANHA`.
