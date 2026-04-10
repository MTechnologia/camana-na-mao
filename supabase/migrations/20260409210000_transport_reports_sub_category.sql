alter table public.transport_reports
add column if not exists sub_category text;

comment on column public.transport_reports.sub_category is
'Subcategoria estruturada do problema de transporte selecionada no chatbot.';
