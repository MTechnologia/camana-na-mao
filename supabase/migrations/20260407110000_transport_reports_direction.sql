alter table public.transport_reports
add column if not exists direction text;

alter table public.transport_reports
drop constraint if exists transport_reports_direction_check;

alter table public.transport_reports
add constraint transport_reports_direction_check
check (direction is null or direction in ('ida', 'volta', 'circular'));
