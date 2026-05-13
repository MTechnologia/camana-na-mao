"""
Remove public_services com service_type = 'other' em camadas que nao sao
equipamentos (viario, diagnostico, limites administrativos, coberturas, etc.),
preservando linhas referenciadas em visitas/avaliacoes/etc. (ficam como other).

Antes do delete em massa, reclassifica poucas camadas "cinzentas" com tipo claro:
  aterro_sanitario -> recycling_point
  defesa_civil     -> social_assistance

Uso:
  python3 scripts/sql/run-delete-junk-other-batches.py
  python3 scripts/sql/run-delete-junk-other-batches.py --batch-size 8000 --sleep 0.15
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

# Camadas `other` que nao devem permanecer como equipamentos no app.
JUNK_OTHER_SOURCE_LAYERS: list[str] = [
    "quadra_viaria",
    "calcadas",
    "diagnostico_riscos",
    "cruzamentos_semaforizados",
    "diagnostico_potencialidades",
    "vaga_especial",
    "acidentes",
    "vaga_especial_estabelecimento",
    "zona_origem_destino",
    "ponto_entrega_voluntaria",
    "saude_abrangencia_ubs",
    "setor_educacional",
    "saude_cobertura_familia",
    "contagem_ciclistas",
    "hierarquia_pedestre",
    "limite_companhias_pm",
    "limite_delegacias_pc",
    "det",
    "vigilancia_saude",
    "get",
    "limite_batalhoes_pm",
    "saude_supervisao_tecnica",
    "junta_servico_militar",
    "diretoria_regional_educacao",
    "area_influencia_trem",
    "limite_comandos_pm",
    "limite_seccionais_pc",
    "saude_coordenadoria_regional",
    "area_influencia_metro",
    "restricao_mian",
    "restricao_zmrc",
    "restricao_zmrf",
]


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


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


def pre_reclassify_gray() -> None:
    """Poucas linhas: tipos canonicos antes do delete em massa."""
    run_sql(
        """
        SET lock_timeout = '15s';
        SET statement_timeout = '120s';

        UPDATE public.public_services ps
        SET
          service_type = 'recycling_point'::public.service_type,
          updated_at = now()
        WHERE ps.service_type = 'other'::public.service_type
          AND ps.source_layer = 'aterro_sanitario';

        UPDATE public.public_services ps
        SET
          service_type = 'social_assistance'::public.service_type,
          updated_at = now()
        WHERE ps.service_type = 'other'::public.service_type
          AND ps.source_layer = 'defesa_civil';

        SELECT 1 AS ok;
        """
    )


def setup_protected_ids() -> None:
    run_sql(
        """
        SET statement_timeout = '110s';

        CREATE TABLE IF NOT EXISTS public.public_services_junk_other_protected (
          id uuid PRIMARY KEY
        );

        TRUNCATE public.public_services_junk_other_protected;

        INSERT INTO public.public_services_junk_other_protected (id)
        SELECT service_id FROM public.service_visits
        UNION
        SELECT service_id FROM public.service_ratings
        UNION
        SELECT service_id FROM public.service_subscriptions
        UNION
        SELECT service_id FROM public.service_favorites
        UNION
        SELECT service_id FROM public.service_corrections
        UNION
        SELECT service_id FROM public.service_plan_items WHERE service_id IS NOT NULL
        UNION
        SELECT service_id FROM public.service_alerts WHERE service_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;

        SELECT count(*)::integer AS protected_ids
        FROM public.public_services_junk_other_protected;
        """
    )


def delete_batch(source_layer: str, batch_size: int) -> int:
    source = sql_literal(source_layer)

    def run_once(size: int) -> int:
        rows = run_sql(
            f"""
        SET lock_timeout = '10s';
        SET statement_timeout = '110s';

        WITH todo AS (
          SELECT ps.id
          FROM public.public_services ps
          WHERE ps.service_type = 'other'::public.service_type
            AND ps.source_layer = {source}
            AND NOT EXISTS (
              SELECT 1
              FROM public.public_services_junk_other_protected p
              WHERE p.id = ps.id
            )
          LIMIT {size}
        ),
        deleted AS (
          DELETE FROM public.public_services ps
          USING todo
          WHERE ps.id = todo.id
          RETURNING ps.id
        )
        SELECT count(*)::integer AS affected
        FROM deleted;
        """
        )
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
            print(f"{source_layer}: timeout/API, reduzindo lote para {size}", flush=True)
            time.sleep(3.0)


def cleanup(skip: bool) -> None:
    if skip:
        print("cleanup skipped; tabela public_services_junk_other_protected mantida.", flush=True)
        return
    run_sql(
        """
        DROP TABLE IF EXISTS public.public_services_junk_other_protected;
        SELECT 1 AS dropped;
        """
    )


def remaining_summary() -> list[dict[str, str]]:
    layers = ", ".join(sql_literal(x) for x in JUNK_OTHER_SOURCE_LAYERS)
    return run_sql(
        f"""
        SELECT source_layer, count(*)::bigint AS remaining
        FROM public.public_services
        WHERE service_type = 'other'::public.service_type
          AND source_layer IN ({layers})
        GROUP BY source_layer
        ORDER BY remaining DESC, source_layer;
        """
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove camadas 'other' que nao sao equipamentos.")
    parser.add_argument("--batch-size", type=int, default=10000)
    parser.add_argument("--sleep", type=float, default=0.15)
    parser.add_argument("--no-cleanup", action="store_true")
    parser.add_argument("--skip-pre-reclass", action="store_true")
    args = parser.parse_args()

    if not args.skip_pre_reclass:
        print("pre_reclassify aterro_sanitario + defesa_civil...", flush=True)
        pre_reclassify_gray()

    setup_protected_ids()

    total = 0
    for source_layer in JUNK_OTHER_SOURCE_LAYERS:
        layer_total = 0
        while True:
            affected = delete_batch(source_layer, args.batch_size)
            if affected == 0:
                break
            layer_total += affected
            total += affected
            print(f"{source_layer}: deleted {layer_total} (total {total})", flush=True)
            time.sleep(args.sleep)

    print("remaining junk other:", remaining_summary(), flush=True)
    print(f"total_deleted={total}", flush=True)
    cleanup(args.no_cleanup)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
