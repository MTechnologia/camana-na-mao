-- OS-06: ponto de embarque/parada (nome + geolocalizacao)
alter table public.transport_reports
  add column if not exists stop_name text,
  add column if not exists stop_location GEOGRAPHY(POINT, 4326);
