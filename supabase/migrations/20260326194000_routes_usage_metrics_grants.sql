-- Grants necessários para o RLS funcionar corretamente.
-- Sem grants explícitos, policies podem existir mas INSERT/SELECT falhar silenciosamente no client.

grant select on table public.routes_usage_metrics to authenticated;
grant insert on table public.routes_usage_metrics to authenticated;

