# Relatório técnico — Recálculo automático da média do serviço

**Ticket:** 5619219  
**OS:** OS-06 (Fluxo Completo de Avaliação Conversacional de Serviços Públicos via Chatbot)  
**Regra de negócio:** RN-AVA-006  
**Status:** Implementado

## Escopo atendido

Implementado mecanismo automático em banco para recalcular média e contagem de avaliações de um serviço sempre que uma avaliação publicada for inserida/atualizada/excluída.

## Laudo técnico

### 1) RPC de recálculo

- Migration criada com a função `public.recalculate_service_rating_stats(uuid)`.
- A função calcula agregados apenas com `publication_status = 'published'`.
- Atualiza `average_rating` e a contagem (`rating_count` quando existir; fallback para `total_ratings` no schema atual).

**Arquivo de evidência:** `supabase/migrations/20260414143000_recalculate_service_rating_stats.sql`

### 2) Trigger automática após alterações em `service_ratings`

- Função trigger `public.trg_recalculate_service_rating_stats()`.
- Trigger `AFTER INSERT OR UPDATE OR DELETE` em `public.service_ratings`.
- Recalcula quando há impacto em avaliações publicadas:
  - `INSERT` com `NEW.publication_status = 'published'`;
  - `UPDATE` com transição de status, alteração de serviço, ou linha publicada envolvida;
  - `DELETE` de linha publicada.

**Arquivo de evidência:** `supabase/migrations/20260414143000_recalculate_service_rating_stats.sql`

### 3) Atualização dos campos em `public_services`

- `average_rating` atualizado pela RPC.
- Contagem atualizada no campo de contagem do projeto:
  - `rating_count` se presente no schema;
  - `total_ratings` no schema atual do repositório.

## Testes e evidências

### Teste SQL de inserção publicada

Criado script de teste transacional que:
1. Seleciona um serviço e usuário existentes;
2. Insere `service_visit`;
3. Insere `service_rating` com `publication_status = 'published'`;
4. Compara agregados esperados (`AVG/COUNT` em `service_ratings`) com os valores persistidos em `public_services`;
5. Emite `NOTICE` de sucesso e faz `ROLLBACK`.

**Arquivo:** `scripts/sql/test-recalculate-service-rating-stats.sql`

### Comando de execução (PowerShell)

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f .\scripts\sql\test-recalculate-service-rating-stats.sql
```

## Critérios de aceite — verificação

- **RPC recalculate_service_rating_stats calcula média e contagem publicadas:** ✅
- **Trigger aciona RPC após INSERT/UPDATE em `service_ratings` (publicado):** ✅
- **Campos em `public_services` são atualizados corretamente:** ✅

## Observações

- O projeto usa hoje o campo `total_ratings`; por compatibilidade, a implementação suporta também `rating_count` se o schema evoluir.
- A trigger anterior `update_service_rating_trigger` foi substituída para centralizar o comportamento na nova RPC.
