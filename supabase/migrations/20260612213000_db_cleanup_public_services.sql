-- NREF056: limpeza de espaço e índices em public_services (tabela de 14 GB).
-- Diagnóstico (pg_stat_*, advisors): a tabela domina o tamanho do banco e tem
-- índices redundantes/sem uso que incham o storage e tornam os INSERTs do sync
-- GeoSampa lentos (~1s cada, pois cada insert mantém ~19 índices).

-- 1) Tabela de backup do dedup (reversibilidade). O dedup já foi aplicado
--    (duplicate_of populado), então o backup cumpriu seu papel. Remove ~393 MB.
drop table if exists public.public_services_dedup_mark_bkp_20260609;

-- 2) Índices sem uso (idx_scan = 0) e redundantes (~2,5 GB no total). Todos são
--    reversíveis (podem ser recriados). Mantidos os índices efetivamente usados
--    (lat_lng_id, canonical_type_latlng, equipment_nature, *_trgm, search_tsv, etc.).
drop index if exists public.idx_public_services_location;               -- 912 MB — redundante com idx_public_services_lat_lng_id
drop index if exists public.idx_public_services_equipment_nature_lat_lng; -- 954 MB — redundante com idx_public_services_equipment_nature
drop index if exists public.idx_public_services_canonical_type_lat_lng; -- 524 MB — redundante com idx_public_services_canonical_type_latlng
drop index if exists public.idx_public_services_district;               -- 121 MB — busca usa idx_public_services_district_trgm (gin)
drop index if exists public.idx_public_services_dedupe_key;             -- 7,7 MB — usado apenas durante o dedup (concluído)
