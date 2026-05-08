"""
Reclassifica public_services ainda como `other` para o service_type canônico,
usando o mesmo mapeamento de scripts/geosampa-layers.json + aliases para nomes
de camada abreviados que aparecem no banco.

Nao altera camadas viárias/diagnóstico (nao estao no JSON de equipamentos).

Uso (no repo, com Supabase linkado e SUPABASE_DB_PASSWORD ou # db no .env):
  python3 scripts/sql/run-reclassify-other-equipment-by-layer.py
  python3 scripts/sql/run-reclassify-other-equipment-by-layer.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
GEOSAMPA_LAYERS_JSON = ROOT / "scripts" / "geosampa-layers.json"

# Camadas no banco com nome diferente do `source_layer` do JSON GeoSampa.
SOURCE_LAYER_ALIASES: dict[str, str] = {
    "clubes": "sports_center",
    "clubes_comunidade": "sports_center",
    "estadios": "sports_center",
    "esporte_outros": "sports_center",
    "ambulatorios_especializados": "hospital",
    "saude_mental": "hospital",
    "saude_outros": "hospital",
    "unidades_dst_aids": "hospital",
    "policia_militar": "police_station",
    "policia_civil": "police_station",
    "gcm": "police_station",
    "bombeiros": "fire_station",
    "casas_mediacao": "community_center",
    "cultura_outros": "community_center",
    "fomento_cultura_periferia": "community_center",
}


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


def load_mapping_from_geosampa_json() -> dict[str, str]:
    if not GEOSAMPA_LAYERS_JSON.is_file():
        raise RuntimeError(f"Arquivo nao encontrado: {GEOSAMPA_LAYERS_JSON}")

    raw = json.loads(GEOSAMPA_LAYERS_JSON.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise RuntimeError("geosampa-layers.json deve ser um array.")

    out: dict[str, str] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        layer = item.get("source_layer")
        st = item.get("service_type")
        if not layer or not st:
            continue
        if st == "other":
            continue
        out[str(layer)] = str(st)
    return out


def assert_safe_enum_label(label: str) -> None:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", label):
        raise ValueError(f"service_type invalido: {label!r}")


def count_other_for_layer(source_layer: str) -> int:
    layer = sql_literal(source_layer)
    rows = run_sql(
        f"""
        SET statement_timeout = '60s';
        SELECT count(*)::bigint AS c
        FROM public.public_services
        WHERE service_type = 'other'::public.service_type
          AND source_layer = {layer};
        """
    )
    if not rows:
        return 0
    return int(rows[0].get("c") or 0)


def reclassify_layer(source_layer: str, service_type: str, dry_run: bool) -> int:
    assert_safe_enum_label(service_type)
    layer_lit = sql_literal(source_layer)
    type_lit = sql_literal(service_type)

    if dry_run:
        return count_other_for_layer(source_layer)

    rows = run_sql(
        f"""
        SET lock_timeout = '15s';
        SET statement_timeout = '120s';

        WITH updated AS (
          UPDATE public.public_services ps
          SET
            service_type = {type_lit}::public.service_type,
            updated_at = now()
          WHERE ps.service_type = 'other'::public.service_type
            AND ps.source_layer = {layer_lit}
          RETURNING ps.id
        )
        SELECT count(*)::bigint AS affected FROM updated;
        """
    )
    if not rows:
        return 0
    return int(rows[0].get("affected") or 0)


def main() -> int:
    parser = argparse.ArgumentParser(description="Reclassifica other -> tipo canônico por source_layer.")
    parser.add_argument("--dry-run", action="store_true", help="So conta linhas other por camada, sem UPDATE.")
    args = parser.parse_args()

    mapping = load_mapping_from_geosampa_json()
    for layer, st in SOURCE_LAYER_ALIASES.items():
        if layer not in mapping:
            mapping[layer] = st

    total_affected = 0
    for source_layer in sorted(mapping.keys()):
        service_type = mapping[source_layer]
        assert_safe_enum_label(service_type)
        n = reclassify_layer(source_layer, service_type, args.dry_run)
        if n > 0:
            tag = "would_update" if args.dry_run else "updated"
            print(f"{source_layer} -> {service_type}: {tag}={n}", flush=True)
            total_affected += n

    print(f"total_{'would_update' if args.dry_run else 'updated'}={total_affected}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
