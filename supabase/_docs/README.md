# Documentação técnica — Backend Supabase

HU-13.3 — Índice das APIs e mudanças no backend.

## Índice

| Documento | O quê cobre |
|---|---|
| [`./rpcs.md`](./rpcs.md) | RPCs Postgres (funções stored procedures expostas ao client) |
| [`../functions/_docs/README.md`](../functions/_docs/README.md) | Edge Functions (workers serverless) |
| [`../migrations/`](../migrations/) | Migrations SQL (schema evolution) |
| [`./changelog.md`](./changelog.md) | Histórico de mudanças por release |

## Stack

- **Banco**: PostgreSQL 15 (Supabase Cloud)
- **Auth**: Supabase Auth (email + magic link + invite por email)
- **Storage**: Supabase Storage (bucket `export-files` privado)
- **Realtime**: Supabase Realtime (broadcast subscriptions em tabelas chave)
- **Functions**: Deno edge runtime (regional `sa-east-1`)
- **Cron**: Google Cloud Scheduler → invoca edge functions com `X-Cron-Secret`

## Estrutura de pastas

```
supabase/
├── _docs/                       ← documentação geral
│   ├── README.md                ← este arquivo
│   ├── rpcs.md                  ← RPCs Postgres
│   └── changelog.md             ← histórico
├── functions/
│   ├── _docs/                   ← docs das edge functions
│   │   ├── README.md            ← catálogo
│   │   ├── invite-user.md
│   │   ├── detect-anomalies.md
│   │   └── ...
│   ├── invite-user/
│   ├── detect-anomalies/
│   └── ...
├── migrations/                  ← schema evolution (timestamp prefixo)
│   ├── 20251126032438_*.sql
│   ├── 20260514120000_hu10_triagem*.sql
│   └── ...
└── config.toml
```

## Princípios

### 1. RLS sempre habilitada

Toda nova tabela deve ter RLS + policies explícitas. Default: nenhum acesso.
A única exceção é `spatial_ref_sys` (PostGIS, conteúdo público) — alertada
no Security Advisor mas inviável de alterar (owner = supabase_admin).

### 2. Migrations são imutáveis após merge

Nunca editar migration que já foi para `dev` ou produção. Sempre criar
migration nova (ALTER, DROP, REPLACE) para mudanças.

### 3. RPCs são interface pública

Tudo que o cliente precisa fazer no banco deve ser via RPC (SECURITY DEFINER)
ou query CRUD respeitando RLS. Nunca expor tabelas internas/temporárias
ao client.

### 4. Edge Functions têm dupla auth

Cron + UI: aceitar `X-Cron-Secret` (Scheduler) OU `Authorization: Bearer <JWT>`
do usuário (admin). Padrão estabelecido em HU-9.3 e replicado nas demais.

### 5. Auditoria imutável

`audit_logs` é append-only. Triggers PG bloqueiam UPDATE/DELETE. Apenas a
RPC `purge_old_audit_logs` consegue mover registros para o archive (após
12 meses) via flag interna.

## Setup de desenvolvimento

### Aplicar migrations localmente

```bash
supabase db reset                 # recria com migrations + seed
# ou
supabase db push                  # aplica migrations pendentes em remoto
```

### Gerar tipos TypeScript

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Deploy de edge function

```bash
supabase functions deploy <name> --no-verify-jwt
supabase functions logs <name> --tail
```

### Secrets

```bash
supabase secrets set KEY=value
supabase secrets list
```

## Variáveis de ambiente padrão

Auto-injetadas em toda edge function:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Configuradas manualmente (via `supabase secrets set`):
- `CRON_SECRET` — validação header X-Cron-Secret
- `SENDGRID_API_KEY` / `SENDGRID_FROM` — email transacional
- `EMAIL_BRASAO_URL` — imagem do header dos emails
- `GOOGLE_MAPS_API_KEY` — usado em funções de geocoding
- `OLHOVIVO_API_TOKEN` — integração SPTrans
- `AI_API_KEY` / `AI_CHAT_BASE_URL` / `AI_CHAT_MODEL` — Gemini chat
- `VERTEX_*` — Vertex AI RAG

## Como pedir review

Mudanças que envolvam:

- **RLS** ou **políticas de auth**: revisor obrigatório do time de segurança.
- **Migrations destrutivas** (DROP TABLE, DROP COLUMN, ALTER de constraints): aprovar com plano de rollback.
- **Edge functions com side-effects** (envio de email, escrita em storage): dry-run em dev antes do merge.

## Suporte

- Schema visual: Supabase Dashboard → Database → Tables
- Security Advisor: Dashboard → Database → Advisor
- Logs: Dashboard → Edge Functions → logs (cada função separada)
- Realtime status: Dashboard → Database → Replication
