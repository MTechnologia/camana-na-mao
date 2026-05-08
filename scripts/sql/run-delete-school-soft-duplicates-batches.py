"""
Remove linhas `public_services` escolares soft-duplicadas (`duplicate_of IS NOT NULL`),
apos reatribuir referencias para o id canônico (`duplicate_of`).

Ordem: tabelas com UNIQUE em (user_id, service_id) primeiro (conflitos removidos antes do UPDATE),
depois visitas/avaliacoes/correcoes/planos/alertas, dedupe RN-AVA-003 em avaliacoes, por fim DELETE em lotes em public_services.

Requisitos: SUPABASE_DB_PASSWORD ou linha `# db <senha>` no .env; projeto linkado (`supabase link`).

Uso:
  python3 scripts/sql/run-delete-school-soft-duplicates-batches.py --dry-run
  python3 scripts/sql/run-delete-school-soft-duplicates-batches.py --batch-size 4000 --sleep 0.1
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read_db_password() -> str:
    db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    if db_password:
        return db_password

    env_file = ROOT / ".env"
    if not env_file.is_file():
        return ""

    match = re.search(r"^#\s*db\s+(.+)$", env_file.read_text(encoding="utf-8"), flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def run_sql(sql: str) -> list[dict[str, str]]:
    db_password = read_db_password()
    if not db_password:
        raise RuntimeError("SUPABASE_DB_PASSWORD nao encontrado.")

    env = {**os.environ, "SUPABASE_DB_PASSWORD": db_password}
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8", newline="\n") as tmp:
        tmp.write(sql)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["supabase", "db", "query", "--linked", "--output", "csv", "-f", tmp_path],
            env=env,
            text=True,
            capture_output=True,
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if result.returncode != 0:
        out = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        if out:
            print(out)
        if err:
            print(err, file=sys.stderr)
        detail = "\n".join(part for part in (out, err) if part)
        raise RuntimeError("Falha ao executar SQL via Supabase CLI.\n" + detail[:8000])

    output = result.stdout.strip()
    if not output:
        return []

    return list(csv.DictReader(output.splitlines()))


def count_school_dupes() -> dict[str, int]:
    rows = run_sql(
        """
        SET statement_timeout = '120s';
        SELECT
          count(*)::bigint AS total_school,
          count(*) FILTER (WHERE duplicate_of IS NULL)::bigint AS canonicos,
          count(*) FILTER (WHERE duplicate_of IS NOT NULL)::bigint AS soft_dupes
        FROM public.public_services
        WHERE service_type = 'school'::public.service_type;
        """
    )
    if not rows:
        return {"total_school": 0, "canonicos": 0, "soft_dupes": 0}
    r = rows[0]
    return {
        "total_school": int(r.get("total_school") or 0),
        "canonicos": int(r.get("canonicos") or 0),
        "soft_dupes": int(r.get("soft_dupes") or 0),
    }


def sql_uuid(u: str) -> str:
    return "'" + u.replace("'", "") + "'::uuid"


def phase_visit_detection_one_shot() -> tuple[int, int]:
    """Tabela pequena: remove conflitos de PK (user_id, service_id) e atualiza o restante."""
    rows_del = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH del AS (
          DELETE FROM public.visit_detection_state v
          USING public.public_services ps
          WHERE v.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.visit_detection_state v2
              WHERE v2.user_id = v.user_id
                AND v2.service_id = ps.duplicate_of
            )
          RETURNING v.user_id
        )
        SELECT count(*)::integer AS affected FROM del;
        """
    )
    n1 = int(rows_del[0].get("affected") or 0) if rows_del else 0
    rows_upd = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH u AS (
          UPDATE public.visit_detection_state v
          SET service_id = ps.duplicate_of, updated_at = now()
          FROM public.public_services ps
          WHERE v.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
          RETURNING v.user_id
        )
        SELECT count(*)::integer AS affected FROM u;
        """
    )
    n2 = int(rows_upd[0].get("affected") or 0) if rows_upd else 0
    print(f"visit_detection_state: del_conflito={n1} update={n2}", flush=True)
    return n1, n2


def phase_subscriptions_one_shot() -> tuple[int, int]:
    rows_del = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH del AS (
          DELETE FROM public.service_subscriptions s
          USING public.public_services ps
          WHERE s.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.service_subscriptions s2
              WHERE s2.user_id = s.user_id
                AND s2.service_id = ps.duplicate_of
            )
          RETURNING s.id
        )
        SELECT count(*)::integer AS affected FROM del;
        """
    )
    n1 = int(rows_del[0].get("affected") or 0) if rows_del else 0
    rows_upd = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH u AS (
          UPDATE public.service_subscriptions s
          SET service_id = ps.duplicate_of
          FROM public.public_services ps
          WHERE s.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
          RETURNING s.id
        )
        SELECT count(*)::integer AS affected FROM u;
        """
    )
    n2 = int(rows_upd[0].get("affected") or 0) if rows_upd else 0
    print(f"service_subscriptions: del_conflito={n1} update={n2}", flush=True)
    return n1, n2


def phase_favorites_one_shot() -> tuple[int, int]:
    rows_del = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH del AS (
          DELETE FROM public.service_favorites f
          USING public.public_services ps
          WHERE f.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.service_favorites f2
              WHERE f2.user_id = f.user_id
                AND f2.service_id = ps.duplicate_of
            )
          RETURNING f.id
        )
        SELECT count(*)::integer AS affected FROM del;
        """
    )
    n1 = int(rows_del[0].get("affected") or 0) if rows_del else 0
    rows_upd = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '120s';

        WITH u AS (
          UPDATE public.service_favorites f
          SET service_id = ps.duplicate_of
          FROM public.public_services ps
          WHERE f.service_id = ps.id
            AND ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
          RETURNING f.id
        )
        SELECT count(*)::integer AS affected FROM u;
        """
    )
    n2 = int(rows_upd[0].get("affected") or 0) if rows_upd else 0
    print(f"service_favorites: del_conflito={n1} update={n2}", flush=True)
    return n1, n2


def run_keyset_updates(
    name: str,
    update_sql: str,
    batch_size: int,
    sleep_s: float,
    *,
    soft_dupes: int,
) -> int:
    """
    Pagina duplicatas de escola por ps.id (keyset) para nao parar no primeiro lote com 0 linhas na tabela filha.
    update_sql must contain {last_uuid} and {batch_size} placeholders.
    soft_dupes: total de public_services school com duplicate_of (para progresso fatia i/N).
    """
    est_slices = max(1, (soft_dupes + batch_size - 1) // batch_size)
    total = 0
    last_uuid = "00000000-0000-0000-0000-000000000000"
    slice_idx = 0
    while True:
        slice_idx += 1
        sql = update_sql.format(last_uuid=sql_uuid(last_uuid), batch_size=batch_size)
        rows = run_sql(
            f"""
        SET lock_timeout = '20s';
        SET statement_timeout = '110s';
        {sql}
        """
        )
        if not rows:
            break
        r0 = rows[0]
        n = int(r0.get("affected") or 0)
        slice_n = int(r0.get("slice_n") or 0)
        max_dup = (r0.get("max_dup") or "").strip()
        total += n
        print(
            f"{name}: fatia {slice_idx}/{est_slices} slice_ids={slice_n} affected={n} (acum. {total})",
            flush=True,
        )
        if slice_n == 0:
            break
        if max_dup:
            last_uuid = max_dup
        time.sleep(sleep_s)
    return total


def phase_visits_keyset(batch_size: int, sleep_s: float, soft_dupes: int) -> int:
    sql = """
        WITH slice AS (
          SELECT ps.id AS dup_id, ps.duplicate_of AS canon_id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND ps.id > {last_uuid}
          ORDER BY ps.id
          LIMIT {batch_size}
        ),
        u AS (
          UPDATE public.service_visits v
          SET service_id = s.canon_id, updated_at = now()
          FROM slice s
          WHERE v.service_id = s.dup_id
          RETURNING v.id
        )
        SELECT
          (SELECT count(*)::integer FROM u) AS affected,
          (SELECT count(*)::integer FROM slice) AS slice_n,
          (SELECT s.dup_id::text FROM slice s ORDER BY s.dup_id DESC LIMIT 1) AS max_dup;
    """
    return run_keyset_updates("service_visits", sql, batch_size, sleep_s, soft_dupes=soft_dupes)


def phase_ratings_keyset(batch_size: int, sleep_s: float, soft_dupes: int) -> int:
    """
    Reatribui avaliacoes de escolas duplicadas ao canônico.
    Remove conflitos RN-AVA-003 antes do UPDATE (idx_one_rating_per_service_per_day).
    """
    sql_template = """
        WITH slice AS (
          SELECT ps.id AS dup_id, ps.duplicate_of AS canon_id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND ps.id > {last_uuid}
          ORDER BY ps.id
          LIMIT {batch_size}
        ),
        dup_ratings AS (
          SELECT
            r.id,
            r.user_id,
            s.canon_id,
            (timezone('America/Sao_Paulo', r.created_at))::date AS dday,
            r.created_at
          FROM public.service_ratings r
          INNER JOIN slice s ON r.service_id = s.dup_id
          WHERE r.created_at IS NOT NULL
        ),
        ranked_intra AS (
          SELECT
            id,
            row_number() OVER (
              PARTITION BY user_id, canon_id, dday
              ORDER BY created_at ASC, id ASC
            ) AS rn
          FROM dup_ratings
        ),
        del_intra AS (
          DELETE FROM public.service_ratings sr
          USING ranked_intra ri
          WHERE sr.id = ri.id AND ri.rn > 1
          RETURNING sr.id
        ),
        conflict_pairs AS (
          SELECT
            CASE
              WHEN r_dup.created_at < r_can.created_at
                OR (r_dup.created_at = r_can.created_at AND r_dup.id < r_can.id)
              THEN r_can.id
              ELSE r_dup.id
            END AS loser_id
          FROM slice s
          INNER JOIN public.service_ratings r_dup
            ON r_dup.service_id = s.dup_id AND r_dup.created_at IS NOT NULL
          INNER JOIN public.service_ratings r_can
            ON r_can.service_id = s.canon_id
            AND r_can.user_id = r_dup.user_id
            AND r_can.created_at IS NOT NULL
            AND (timezone('America/Sao_Paulo', r_dup.created_at))::date
              = (timezone('America/Sao_Paulo', r_can.created_at))::date
        ),
        del_inter AS (
          DELETE FROM public.service_ratings sr
          USING conflict_pairs cp
          WHERE sr.id = cp.loser_id
          RETURNING sr.id
        ),
        u AS (
          UPDATE public.service_ratings r
          SET service_id = s.canon_id, updated_at = now()
          FROM slice s
          WHERE r.service_id = s.dup_id
          RETURNING r.id
        )
        SELECT
          (SELECT count(*)::integer FROM del_intra) AS del_intra_n,
          (SELECT count(*)::integer FROM del_inter) AS del_inter_n,
          (SELECT count(*)::integer FROM u) AS affected,
          (SELECT count(*)::integer FROM slice) AS slice_n,
          (SELECT s.dup_id::text FROM slice s ORDER BY s.dup_id DESC LIMIT 1) AS max_dup;
    """
    est_slices = max(1, (soft_dupes + batch_size - 1) // batch_size)
    total = 0
    total_del = 0
    last_uuid = "00000000-0000-0000-0000-000000000000"
    slice_idx = 0
    while True:
        slice_idx += 1
        sql = sql_template.format(last_uuid=sql_uuid(last_uuid), batch_size=batch_size)
        rows = run_sql(
            f"""
        SET lock_timeout = '30s';
        SET statement_timeout = '180s';
        {sql}
        """
        )
        if not rows:
            break
        r0 = rows[0]
        n = int(r0.get("affected") or 0)
        di = int(r0.get("del_intra_n") or 0)
        de = int(r0.get("del_inter_n") or 0)
        slice_n = int(r0.get("slice_n") or 0)
        max_dup = (r0.get("max_dup") or "").strip()
        total += n
        total_del += di + de
        print(
            f"service_ratings: fatia {slice_idx}/{est_slices} slice_ids={slice_n} "
            f"del_intra={di} del_inter={de} upd={n} (acum. upd={total}, del_conf={total_del})",
            flush=True,
        )
        if slice_n == 0:
            break
        if max_dup:
            last_uuid = max_dup
        time.sleep(sleep_s)
    return total


def phase_corrections_keyset(batch_size: int, sleep_s: float, soft_dupes: int) -> int:
    sql = """
        WITH slice AS (
          SELECT ps.id AS dup_id, ps.duplicate_of AS canon_id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND ps.id > {last_uuid}
          ORDER BY ps.id
          LIMIT {batch_size}
        ),
        u AS (
          UPDATE public.service_corrections c
          SET service_id = s.canon_id
          FROM slice s
          WHERE c.service_id = s.dup_id
          RETURNING c.id
        )
        SELECT
          (SELECT count(*)::integer FROM u) AS affected,
          (SELECT count(*)::integer FROM slice) AS slice_n,
          (SELECT s.dup_id::text FROM slice s ORDER BY s.dup_id DESC LIMIT 1) AS max_dup;
    """
    return run_keyset_updates("service_corrections", sql, batch_size, sleep_s, soft_dupes=soft_dupes)


def phase_plan_items_keyset(batch_size: int, sleep_s: float, soft_dupes: int) -> int:
    sql = """
        WITH slice AS (
          SELECT ps.id AS dup_id, ps.duplicate_of AS canon_id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND ps.id > {last_uuid}
          ORDER BY ps.id
          LIMIT {batch_size}
        ),
        u AS (
          UPDATE public.service_plan_items p
          SET service_id = s.canon_id
          FROM slice s
          WHERE p.service_id IS NOT NULL AND p.service_id = s.dup_id
          RETURNING p.id
        )
        SELECT
          (SELECT count(*)::integer FROM u) AS affected,
          (SELECT count(*)::integer FROM slice) AS slice_n,
          (SELECT s.dup_id::text FROM slice s ORDER BY s.dup_id DESC LIMIT 1) AS max_dup;
    """
    return run_keyset_updates("service_plan_items", sql, batch_size, sleep_s, soft_dupes=soft_dupes)


def phase_alerts_keyset(batch_size: int, sleep_s: float, soft_dupes: int) -> int:
    sql = """
        WITH slice AS (
          SELECT ps.id AS dup_id, ps.duplicate_of AS canon_id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
            AND ps.id > {last_uuid}
          ORDER BY ps.id
          LIMIT {batch_size}
        ),
        u AS (
          UPDATE public.service_alerts a
          SET service_id = s.canon_id
          FROM slice s
          WHERE a.service_id IS NOT NULL AND a.service_id = s.dup_id
          RETURNING a.id
        )
        SELECT
          (SELECT count(*)::integer FROM u) AS affected,
          (SELECT count(*)::integer FROM slice) AS slice_n,
          (SELECT s.dup_id::text FROM slice s ORDER BY s.dup_id DESC LIMIT 1) AS max_dup;
    """
    return run_keyset_updates("service_alerts", sql, batch_size, sleep_s, soft_dupes=soft_dupes)


def dedupe_ratings_one_per_day() -> int:
    """Remove avaliacoes duplicadas por RN-AVA-003 (pos-merge de service_id)."""
    rows = run_sql(
        """
        SET lock_timeout = '30s';
        SET statement_timeout = '300s';

        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY
                user_id,
                service_id,
                ((timezone('America/Sao_Paulo', created_at))::date)
              ORDER BY created_at ASC, id ASC
            ) AS rn
          FROM public.service_ratings
          WHERE created_at IS NOT NULL
        ),
        del AS (
          DELETE FROM public.service_ratings sr
          USING ranked r
          WHERE sr.id = r.id AND r.rn > 1
          RETURNING sr.id
        )
        SELECT count(*)::integer AS affected FROM del;
        """
    )
    if not rows:
        return 0
    return int(rows[0].get("affected") or 0)


def delete_school_dupes_batch(batch_size: int) -> int:
    """DELETE um lote de public_services escolares com duplicate_of preenchido."""
    sql = f"""
        SET lock_timeout = '15s';
        SET statement_timeout = '110s';

        WITH d AS (
          SELECT ps.id
          FROM public.public_services ps
          WHERE ps.service_type = 'school'::public.service_type
            AND ps.duplicate_of IS NOT NULL
          LIMIT {batch_size}
        ),
        del AS (
          DELETE FROM public.public_services ps
          USING d
          WHERE ps.id = d.id
          RETURNING ps.id
        )
        SELECT count(*)::integer AS affected FROM del;
    """

    def run_once(size: int) -> int:
        s = sql.replace(f"LIMIT {batch_size}", f"LIMIT {size}")
        rows = run_sql(s)
        if not rows:
            return 0
        return int(rows[0].get("affected") or 0)

    size = batch_size
    min_batch = 1000
    while True:
        try:
            return run_once(size)
        except RuntimeError as exc:
            msg = str(exc).lower()
            retryable = (
                "57014" in msg
                or "statement timeout" in msg
                or "canceling statement" in msg
                or "query canceled" in msg
                or "524" in msg
                or "gateway timeout" in msg
            )
            if not retryable or size <= min_batch:
                raise
            size = max(min_batch, size // 2)
            print(f"delete public_services: reduzindo lote para {size}", flush=True)
            time.sleep(3.0)


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove soft-duplicatas de escola e reatribui FKs.")
    parser.add_argument("--batch-size", type=int, default=4000)
    parser.add_argument("--sleep", type=float, default=0.12)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    counts = count_school_dupes()
    print("antes:", counts, flush=True)
    if args.dry_run:
        return 0

    if counts["soft_dupes"] == 0:
        print("Nada a fazer (soft_dupes=0).", flush=True)
        return 0

    sd = counts["soft_dupes"]
    bs = args.batch_size
    est_slices = max(1, (sd + bs - 1) // bs)
    sec_guess = 12.0
    t_keyset_min = (5 * est_slices * (sec_guess + args.sleep)) / 60.0
    t_del_min = (est_slices * (sec_guess + args.sleep)) / 60.0
    print(
        f"Plano: {sd:,} duplicatas escola; ~{est_slices} fatias de até {bs} ids por fase keyset "
        f"(visitas, ratings, correcoes, planos, alertas).",
        flush=True,
    )
    print(
        f"Estimativa grosseira (supondo ~{sec_guess:.0f}s por chamada + sleep {args.sleep}s): "
        f"keyset ~{t_keyset_min:.0f} min; dedupe ratings; DELETE public_services ~{t_del_min:.0f} min "
        f"(~{est_slices} lotes cheios). Valores reais variam com rede e carga.",
        flush=True,
    )

    phase_visit_detection_one_shot()
    phase_subscriptions_one_shot()
    phase_favorites_one_shot()
    phase_visits_keyset(args.batch_size, args.sleep, sd)
    phase_ratings_keyset(args.batch_size, args.sleep, sd)
    phase_corrections_keyset(args.batch_size, args.sleep, sd)
    phase_plan_items_keyset(args.batch_size, args.sleep, sd)
    phase_alerts_keyset(args.batch_size, args.sleep, sd)

    n_dedupe = dedupe_ratings_one_per_day()
    print(f"service_ratings dedupe RN-AVA-003: removed={n_dedupe}", flush=True)
    print(
        f"Iniciando DELETE em public_services (soft_dup escola), ~{est_slices} lotes típicos de até {bs} linhas.",
        flush=True,
    )

    del_total = 0
    del_batch_idx = 0
    while True:
        n = delete_school_dupes_batch(args.batch_size)
        if n == 0:
            break
        del_batch_idx += 1
        del_total += n
        print(
            f"public_services DELETE soft_dup school: lote {del_batch_idx} (+{n} linhas, acum. {del_total})",
            flush=True,
        )
        time.sleep(args.sleep)

    print("depois:", count_school_dupes(), flush=True)
    print(f"total_deleted_public_services_school_dupes={del_total}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
