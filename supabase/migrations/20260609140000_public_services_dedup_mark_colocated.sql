-- Soft-merge (REVERSÍVEL) de duplicados REAIS em public_services via `duplicate_of`.
--
-- Contexto: o ETL do GeoSampa acumula cópias da MESMA unidade com caixa/acentos/espaços
-- diferentes (ex.: "CEU EMEF PARAISOPOLIS" vs "Ceu Emef Paraisopolis"), que apareciam
-- repetidas na busca de serviços do chatbot.
--
-- Critério CONSERVADOR (não funde unidades distintas):
--   mesma service_type
--   + mesma coordenada arredondada a 4 casas (~11 m)
--   + nome normalizado IDÊNTICO (unaccent + minúsculo + espaços colapsados)
-- Assim, EMEF vs EMEI vs CEI (nomes diferentes) NÃO são fundidos — só cópias do mesmo nome.
--
-- NÃO apaga linhas: marca as não-canônicas com duplicate_of = id da canônica
-- (as RPCs/consulta de serviços já filtram `duplicate_of IS NULL`). Idempotente
-- (só toca linhas com duplicate_of NULL). Reversível via tabela de backup criada abaixo.

create extension if not exists unaccent;

begin;

-- Evita corrida com o sync do GeoSampa enquanto marcamos os duplicados.
select pg_advisory_xact_lock(hashtext('public_services_dedup_mark_colocated'));

-- Backup para reversibilidade (Migration safety): guarda o estado de duplicate_of
-- das linhas que estavam canônicas antes desta marcação.
create table if not exists public_services_dedup_mark_bkp_20260609 as
  select id, duplicate_of
  from public_services
  where duplicate_of is null;

-- PREVIEW (rode isto ANTES, em staging, para conferir quantas linhas serão marcadas):
--   with k as (
--     select id, row_number() over (
--       partition by service_type, round(latitude, 4), round(longitude, 4),
--         lower(btrim(regexp_replace(unaccent(coalesce(name, '')), '\s+', ' ', 'g')))
--       order by total_ratings desc nulls last, updated_at desc nulls last, id
--     ) rn
--     from public_services
--     where duplicate_of is null and latitude is not null and longitude is not null
--   )
--   select count(*) as linhas_a_marcar from k where rn > 1;

with ranked as (
  select
    id,
    first_value(id) over w as canonical_id,
    row_number() over w as rn
  from public_services
  where duplicate_of is null
    and latitude is not null
    and longitude is not null
  window w as (
    partition by service_type, round(latitude, 4), round(longitude, 4),
      lower(btrim(regexp_replace(unaccent(coalesce(name, '')), '\s+', ' ', 'g')))
    order by total_ratings desc nulls last, updated_at desc nulls last, id
  )
)
update public_services p
set duplicate_of = r.canonical_id,
    updated_at = now()
from ranked r
where p.id = r.id
  and r.rn > 1
  and r.canonical_id <> p.id
  and p.duplicate_of is null;

commit;

-- ROLLBACK (reversível) — para desfazer ESTA marcação, restaure do backup:
--   update public_services p
--   set duplicate_of = b.duplicate_of
--   from public_services_dedup_mark_bkp_20260609 b
--   where p.id = b.id;
-- Depois de validado, o backup pode ser removido:
--   drop table if exists public_services_dedup_mark_bkp_20260609;
