alter table public.transport_reports
add column if not exists recurrence_frequency text;

alter table public.transport_reports
drop constraint if exists transport_reports_recurrence_frequency_check;

alter table public.transport_reports
add constraint transport_reports_recurrence_frequency_check
check (
  recurrence_frequency is null
  or recurrence_frequency in (
    'primeira_vez',
    'algumas_vezes_mes',
    'toda_semana',
    'todos_os_dias'
  )
);
