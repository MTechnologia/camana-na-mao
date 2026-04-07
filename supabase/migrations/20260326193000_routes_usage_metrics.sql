-- Telemetria de uso do Google Routes (RouteMatrix) para monitoramento de custo no admin.
create table if not exists public.routes_usage_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references public.profiles(id) on delete set null,
  context text not null default 'nearby_services',
  profile text not null default 'walking',
  cache_hit boolean not null default false,
  destinations_count integer not null default 0 check (destinations_count >= 0),
  elements_count integer not null default 0 check (elements_count >= 0),
  chunk_requests integer not null default 0 check (chunk_requests >= 0),
  origin_lat double precision null,
  origin_lng double precision null
);

create index if not exists routes_usage_metrics_created_at_idx
  on public.routes_usage_metrics (created_at desc);

create index if not exists routes_usage_metrics_context_idx
  on public.routes_usage_metrics (context);

alter table public.routes_usage_metrics enable row level security;

-- Inserção por usuários autenticados (telemetria do próprio uso).
drop policy if exists "routes_usage_metrics_insert_authenticated" on public.routes_usage_metrics;
create policy "routes_usage_metrics_insert_authenticated"
  on public.routes_usage_metrics
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

-- Leitura restrita a admin/gestor (dashboard administrativo).
drop policy if exists "routes_usage_metrics_select_admin_gestor" on public.routes_usage_metrics;
create policy "routes_usage_metrics_select_admin_gestor"
  on public.routes_usage_metrics
  for select
  to authenticated
  using (public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]));

