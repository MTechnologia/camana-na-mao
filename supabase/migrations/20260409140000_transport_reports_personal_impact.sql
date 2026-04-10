-- HU-5.3: impacto pessoal na rotina (escala 2–5, coletada via ImpactPicker)
alter table public.transport_reports
  add column if not exists personal_impact smallint null;

alter table public.transport_reports
  drop constraint if exists transport_reports_personal_impact_check;

alter table public.transport_reports
  add constraint transport_reports_personal_impact_check
  check (personal_impact is null or (personal_impact >= 2 and personal_impact <= 5));

comment on column public.transport_reports.personal_impact is
  'Impacto na rotina do cidadão (2=desconforto … 5=compromisso perdido / não embarcou).';
