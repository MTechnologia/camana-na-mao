-- HU-8.1 — Refinamento dos agendamentos de export
--
-- Adiciona suporte a:
--   * Período relativo (recalculado a cada execução): "ontem", "últimos 7 dias",
--     "últimos 30 dias", "mês anterior", "mês atual", "último trimestre",
--     "último ano". Default 'last_7d' para novos agendamentos.
--   * Notificação in-app ao concluir cada execução (default true).
--
-- Período fixo continua vivendo dentro de `filters.startDate/endDate`
-- (snapshot capturado no momento da criação). Quando period_kind='relative',
-- a edge function `cron-scheduled-exports` calcula o período dinamicamente
-- e sobrescreve as datas no `export_jobs.filters` antes de disparar.

ALTER TABLE public.scheduled_exports
  ADD COLUMN IF NOT EXISTS period_kind text NOT NULL DEFAULT 'relative'
    CHECK (period_kind IN ('relative', 'fixed')),
  ADD COLUMN IF NOT EXISTS period_relative text
    CHECK (period_relative IN (
      'yesterday',
      'last_7d',
      'last_30d',
      'previous_month',
      'current_month',
      'last_quarter',
      'last_year'
    )),
  ADD COLUMN IF NOT EXISTS notify_in_app boolean NOT NULL DEFAULT true;

-- Para registros pré-existentes (criados na HU-7.4), assume período relativo
-- 'last_7d' como default quando period_kind='relative' (já é o default acima).
UPDATE public.scheduled_exports
   SET period_relative = 'last_7d'
 WHERE period_kind = 'relative' AND period_relative IS NULL;

COMMENT ON COLUMN public.scheduled_exports.period_kind IS
  'HU-8.1 — relative: recalcula período a cada execução; fixed: usa filters.startDate/endDate exatos.';
COMMENT ON COLUMN public.scheduled_exports.period_relative IS
  'HU-8.1 — Chave do período relativo. Resolução em src/lib/relativePeriod.ts (client) e na edge function.';
COMMENT ON COLUMN public.scheduled_exports.notify_in_app IS
  'HU-8.1 — Quando true, cria uma linha em `notifications` ao concluir cada execução do agendamento.';
