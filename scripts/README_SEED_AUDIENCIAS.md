# Importar audiências do JSON (scraper Splegis) para o Supabase

O script `seed-audiencias-from-json.mjs` lê o arquivo JSON gerado pelo crawler e insere os registros na tabela `public.audiencias`.

## Pré-requisitos

- Node.js 18+
- Arquivo `audiencias_splegis.json` (do crawler)
- **Chave Service Role** do Supabase (não use a chave anon em produção). Em: Supabase Dashboard → Project Settings → API → `service_role` (secret).

## Variáveis de ambiente

Crie ou use o `.env` na raiz do projeto e defina:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (chave service_role)
```

Ou exporte no terminal antes de rodar:

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## Uso

```bash
# Caminho completo do JSON (no Windows use aspas se houver espaços)
node scripts/seed-audiencias-from-json.mjs "C:\Users\Felipe\Desktop\Crawler audiencias publicas\audiencias_splegis.json"
```

### Importar só as primeiras N audiências (teste)

```bash
LIMIT=100 node scripts/seed-audiencias-from-json.mjs "C:\caminho\audiencias_splegis.json"
```

## Mapeamento do JSON para a tabela

| Campo no JSON | Campo na tabela `audiencias` |
|---------------|------------------------------|
| Comissao / Tema | `tema`, e parte do `titulo` |
| Data (dd/MM/yyyy) | `data` (convertido para yyyy-MM-dd) |
| Horario (ex: 12:00 AM) | `hora` (convertido para HH:MM:SS) |
| Local | `local` |
| Tema (texto longo) | `descricao` |
| FormInscricoes | `inscricoes_abertas` |
| LinkTeleconferencia | `link_transmissao` |
| Projetos | `documentos` (JSONB) |
| Data no passado | `status` = "encerrada"; caso contrário "agendada" |

## Limpar antes de reimportar (opcional)

Se quiser recriar tudo do zero, apague os registros no Supabase (Dashboard → Table Editor → `audiencias` → Delete) ou rode um SQL:

```sql
TRUNCATE public.audiencias CASCADE;
```

Depois rode o script novamente.
