-- NREF056: consolidar políticas RLS permissivas DUPLICADAS.
-- Advisors apontaram ~700 `multiple_permissive_policies`. Parte vem de pares
-- EXATAMENTE idênticos (mesmo command, role {public}, mesma expressão USING/CHECK):
-- uma com nome verboso ("Users can ...") e outra `<tabela>_<cmd>_own`.
-- Removemos a verbosa e mantemos a `_own` → acesso INALTERADO, menos políticas
-- avaliadas por query.
--
-- NÃO tocamos nas políticas distintas (staff/admin/gestor/gabinete/community),
-- nem nos casos sem par (ex.: DELETE próprio de service_visits/urban_reports,
-- e os DOIS INSERT distintos de notifications: admin vs self).

-- ai_conversations (4 pares)
drop policy if exists "Users can delete their own conversations" on public.ai_conversations;
drop policy if exists "Users can insert their own conversations" on public.ai_conversations;
drop policy if exists "Users can view their own conversations" on public.ai_conversations;
drop policy if exists "Users can update their own conversations" on public.ai_conversations;

-- notifications (3 pares; mantém os dois INSERT distintos)
drop policy if exists "Users can delete their own notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;

-- service_visits (3 pares; DELETE próprio não tem par → mantido)
drop policy if exists "Users can insert their own visits" on public.service_visits;
drop policy if exists "Users can view their own visits" on public.service_visits;
drop policy if exists "Users can update their own visits" on public.service_visits;

-- transport_reports (3 pares; staff/admin/gestor/gabinete/community mantidos)
drop policy if exists "Users can insert their own reports" on public.transport_reports;
drop policy if exists "Users can view their own reports" on public.transport_reports;
drop policy if exists "Users can update their own reports" on public.transport_reports;

-- urban_reports (3 pares; staff/admin/gestor/gabinete/community e DELETE próprio mantidos)
drop policy if exists "Users can create their own reports" on public.urban_reports;
drop policy if exists "Users can view their own reports" on public.urban_reports;
drop policy if exists "Users can update their own reports" on public.urban_reports;
