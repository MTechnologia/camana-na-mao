-- Dedup de `transit_station` (pontos de ônibus) por LOCALIZAÇÃO — corrige o critério antigo.
--
-- Contexto / causa raiz:
--   A procedure anterior (dedup_transit_station_colocated) particionava por
--   `round(lat,4), round(lon,4)` + NOME normalizado IDÊNTICO. Para escola/UBS isso é
--   correto (nomes distintos = unidades distintas), MAS em ponto de ônibus o campo `name`
--   carrega a LINHA / lixo de ETL (ex.: "C07 VÁRZEA PAULISTA - JUNDIAÍ , 0", "PCA MAUA",
--   "AV. ALDA , 1800" — com name/address trocados na mesma coordenada). Resultado: o mesmo
--   poste tinha N linhas com nomes diferentes e NÃO era fundido → ~52% de duplicados ativos
--   sobravam (44.626 ativos vs. ~22.827 pontos físicos reais ≈ ordem da SPTrans). O loop
--   também parava em lat −23.30, deixando a faixa norte (até −23.195) sem processar.
--
-- Correção (transit_station SOMENTE — NÃO mexe nos outros tipos):
--   Particiona por COORDENADA (~11 m, round 4 casas), SEM exigir nome. Mantém 1 ponto por
--   local. ~11 m preserva pontos de sentidos opostos (~15-25 m) como distintos. O canônico
--   preferido é uma linha com ENDEREÇO VÁLIDO (o chat filtra "Endereço não informado"),
--   depois maior total_ratings / mais recente. Faixa de latitude ampliada (−24.10 a −23.10).
--
-- ⚠️ RODAR VIA psql/pgAdmin (conexão de sessão, SEM timeout HTTP). A limpeza atinge ~22k
--    linhas; via MCP/HTTP estoura o timeout. NÃO apaga linhas. Idempotente. Reversível.

SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Backup p/ rollback (reutiliza a tabela da dedup de 2026-06-09; só insere o que faltar).
CREATE TABLE IF NOT EXISTS public_services_dedup_mark_bkp_20260609 (
  id uuid NOT NULL,
  canonical_id uuid NOT NULL,
  service_type text,
  marked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public_services_dedup_mark_bkp_20260609 ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS ux_dedup_bkp_20260609_id
  ON public_services_dedup_mark_bkp_20260609 (id);

-- 1) Procedure corrigida (para futuras cargas do ETL — processa em faixas de latitude p/
--    desempenho, commit por faixa). Critério agora é coordenada-only + canônico c/ endereço.
CREATE OR REPLACE PROCEDURE public.dedup_transit_station_colocated(IN step numeric DEFAULT 0.0002)
LANGUAGE plpgsql
AS $procedure$
declare lo numeric; hi numeric; n bigint;
begin
  lo := -24.10;
  while lo < -23.10 loop
    hi := lo + step;
    with ranked as (
      select id,
        first_value(id) over w as canonical_id,
        row_number()    over w as rn
      from public_services
      where service_type = 'transit_station'::service_type and duplicate_of is null
        and latitude >= lo and latitude < hi and longitude is not null
      window w as (
        partition by round(latitude, 4), round(longitude, 4)
        order by
          (address is not null and btrim(address) <> ''
            and lower(unaccent(btrim(address))) <> 'endereco nao informado') desc,
          total_ratings desc nulls last, updated_at desc nulls last, id
      )
    ),
    to_mark as (select id, canonical_id from ranked where rn > 1 and canonical_id <> id),
    ins as (
      insert into public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
      select id, canonical_id, 'transit_station' from to_mark
      where not exists (
        select 1 from public_services_dedup_mark_bkp_20260609 b where b.id = to_mark.id
      )
      returning 1
    )
    update public_services p
    set duplicate_of = tm.canonical_id, updated_at = now()
    from to_mark tm
    where p.id = tm.id and p.duplicate_of is null;
    get diagnostics n = row_count;
    if n > 0 then raise notice 'transit lat [%, %): % marcadas', lo, hi, n; end if;
    commit;
    lo := hi;
  end loop;
end $procedure$;

-- 2) LIMPEZA do resíduo atual (44.626 ativos → ~22.827). Statement único (sem faixas, evita
--    resíduo de borda); como só restam ~44k ativos, roda em segundos. Reversível via backup.
WITH ranked AS (
  SELECT id,
    first_value(id) OVER w AS canonical_id,
    row_number()    OVER w AS rn
  FROM public_services
  WHERE service_type = 'transit_station'::service_type AND duplicate_of IS NULL
    AND latitude IS NOT NULL AND longitude IS NOT NULL
  WINDOW w AS (
    PARTITION BY round(latitude, 4), round(longitude, 4)
    ORDER BY
      (address IS NOT NULL AND btrim(address) <> ''
        AND lower(unaccent(btrim(address))) <> 'endereco nao informado') DESC,
      total_ratings DESC NULLS LAST, updated_at DESC NULLS LAST, id
  )
),
to_mark AS (
  SELECT id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id
),
ins AS (
  INSERT INTO public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
  SELECT id, canonical_id, 'transit_station' FROM to_mark
  WHERE NOT EXISTS (
    SELECT 1 FROM public_services_dedup_mark_bkp_20260609 b WHERE b.id = to_mark.id
  )
  RETURNING 1
)
UPDATE public_services p
SET duplicate_of = tm.canonical_id, updated_at = now()
FROM to_mark tm
WHERE p.id = tm.id AND p.duplicate_of IS NULL;

-- VERIFICAÇÃO (esperado ~22.827 ativos):
--   SELECT count(*) FROM public_services
--   WHERE service_type='transit_station' AND duplicate_of IS NULL;
--
-- ROLLBACK desta limpeza (desfaz só o transit marcado por ela; o backup mistura a dedup de
-- 2026-06-09, então restaure por data se precisar isolar):
--   UPDATE public_services p SET duplicate_of = NULL
--   FROM public_services_dedup_mark_bkp_20260609 b
--   WHERE p.id = b.id AND b.service_type = 'transit_station'
--     AND p.duplicate_of = b.canonical_id
--     AND b.marked_at >= '2026-06-11';
