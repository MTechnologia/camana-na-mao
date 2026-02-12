# fetch-audiencias

Sincroniza audiências públicas com o banco a partir do **Web Service SPLEGIS** da Câmara Municipal de São Paulo.

- **API:** https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx  
- **Método usado:** `AudienciasPublicasV2JSON` (parâmetros: `DataInicial`, `DataFinal`).

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

| Parâmetro     | Padrão       | Descrição |
|---------------|--------------|-----------|
| `dataInicial` | 2020-01-01   | Data inicial (YYYY-MM-DD) |
| `dataFinal`   | 2030-12-31   | Data final (YYYY-MM-DD) |
| `replace`     | false        | Se `1` ou `true`, remove todas as linhas com `splegis_chave` preenchido antes de inserir as da API (evita duplicar ao re-sincronizar). |

## Banco

- A tabela `audiencias` deve ter a coluna `splegis_chave` (ver migration `20260206120000_audiencias_splegis_chave.sql`).
- Inserções/atualizações usam `splegis_chave` para identificar a mesma audiência e evitar duplicatas.

## Deploy

```bash
supabase functions deploy fetch-audiencias
```

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

### 2. Pelo app (página Audiências Públicas)

Na listagem de **Audiências Públicas** há um botão **Sincronizar com a API**. Clique para disparar a função; ao terminar, um toast mostra o resultado e a lista é atualizada.

**Se aparecer 401 (Unauthorized):** no Dashboard do Supabase vá em **Edge Functions** → **fetch-audiencias** e confira se a função aceita chamadas com a chave **anon**. Em **Settings → API** verifique se "Allow anonymous key" está habilitado. O app envia a chave anon (ou o JWT do usuário logado) no header `Authorization`.

### 3. Conferir no sistema

- Abra **Audiências Públicas** no menu e veja se as audiências aparecem.
- No **Dashboard do Supabase**: **Table Editor → audiencias** para ver os registros e a coluna `splegis_chave` preenchida nos que vieram da API.
- Em **Edge Functions → fetch-audiencias → Logs** você vê as chamadas e possíveis erros.
