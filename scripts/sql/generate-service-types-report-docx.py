"""
Gera documento Word (.docx) com contagens atuais de public_services por service_type
e previsao apos os ajustes planejados (soft-duplicatas escola, limpeza other transporte, limpeza other junk).

O .docx e escrito em OOXML (zip + XML) apenas com a biblioteca padrao do Python.

Requisitos: SUPABASE_DB_PASSWORD ou `# db` no .env; supabase link; CLI `supabase` no PATH (ex.: WSL).

Uso:
  python3 scripts/sql/generate-service-types-report-docx.py
  python3 scripts/sql/generate-service-types-report-docx.py -o caminho/saida.docx
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]


def int_csv(value: str | None) -> int:
    if value is None or str(value).strip() == "":
        return 0
    s = str(value).strip()
    try:
        return int(s)
    except ValueError:
        return int(float(s))


SERVICE_TYPE_LABELS: dict[str, str] = {
    "ubs": "UBS",
    "school": "Escola",
    "ceu": "CEU",
    "hospital": "Hospital",
    "library": "Biblioteca",
    "sports_center": "Centro esportivo",
    "street_market": "Feira / mercado de rua",
    "community_center": "Centro comunitário",
    "daycare": "Creche / educação infantil",
    "park": "Parque",
    "social_assistance": "Assistência social",
    "police_station": "Polícia / segurança",
    "transit_station": "Transporte (estações, terminais, pontos)",
    "bicycle": "Bicicletário / paraciclo",
    "subprefeitura": "Subprefeitura",
    "market": "Mercado",
    "city_market": "Mercado municipal",
    "theater": "Teatro / cinema",
    "museum": "Museu / memória",
    "cemetery": "Cemitério",
    "accessibility": "Acessibilidade",
    "recycling_point": "Reciclagem / ponto de descarte",
    "fire_station": "Corpo de bombeiros",
    "other": "Outros (camada genérica)",
}

# Ordem estável para o relatório (alinhada ao types.ts / enum no app)
SERVICE_TYPE_ORDER: list[str] = [
    "ubs",
    "school",
    "ceu",
    "hospital",
    "library",
    "sports_center",
    "street_market",
    "community_center",
    "daycare",
    "park",
    "social_assistance",
    "police_station",
    "transit_station",
    "bicycle",
    "subprefeitura",
    "market",
    "city_market",
    "theater",
    "museum",
    "cemetery",
    "accessibility",
    "recycling_point",
    "fire_station",
    "other",
]

TRANSPORT_SOURCE_LAYERS = [
    "estacao_metro_projeto",
    "estacao_trem_projeto",
    "terminal_onibus",
    "estacao_trem",
    "estacao_metro",
    "ponto_onibus",
]

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

PROTECTED_IDS_SUBQUERY = """
  SELECT service_id AS id FROM public.service_visits
  UNION SELECT service_id FROM public.service_ratings
  UNION SELECT service_id FROM public.service_subscriptions
  UNION SELECT service_id FROM public.service_favorites
  UNION SELECT service_id FROM public.service_corrections
  UNION SELECT service_id FROM public.service_plan_items WHERE service_id IS NOT NULL
  UNION SELECT service_id FROM public.service_alerts WHERE service_id IS NOT NULL
"""


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
        raise RuntimeError("SUPABASE_DB_PASSWORD nao encontrado (nem `# db` no .env).")

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
            cwd=str(ROOT),
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if result.returncode != 0:
        out = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        detail = "\n".join(p for p in (out, err) if p)
        raise RuntimeError("Falha supabase db query:\n" + detail[:8000])

    output = result.stdout.strip()
    if not output:
        return []
    return list(csv.DictReader(output.splitlines()))


def sql_in_text_list(values: list[str]) -> str:
    return ", ".join("'" + v.replace("'", "''") + "'" for v in values)


def fetch_adjustment_metrics() -> dict[str, int]:
    transport_in = sql_in_text_list(TRANSPORT_SOURCE_LAYERS)
    junk_in = sql_in_text_list(JUNK_OTHER_SOURCE_LAYERS)

    rows = run_sql(
        f"""
        SET statement_timeout = '120s';

        WITH prot AS (
          {PROTECTED_IDS_SUBQUERY}
        ),
        school AS (
          SELECT
            count(*) FILTER (WHERE duplicate_of IS NULL)::bigint AS school_canon,
            count(*) FILTER (WHERE duplicate_of IS NOT NULL)::bigint AS school_soft_dupes
          FROM public.public_services
          WHERE service_type = 'school'::public.service_type
        ),
        tr AS (
          SELECT
            count(*)::bigint AS transport_other_total,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM prot p WHERE p.id = ps.id))::bigint AS transport_other_protected,
            count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM prot p WHERE p.id = ps.id))::bigint AS transport_other_deletavel
          FROM public.public_services ps
          WHERE ps.service_type = 'other'::public.service_type
            AND ps.source_layer IN ({transport_in})
        ),
        jk AS (
          SELECT
            count(*)::bigint AS junk_other_total,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM prot p WHERE p.id = ps.id))::bigint AS junk_other_protected,
            count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM prot p WHERE p.id = ps.id))::bigint AS junk_other_deletavel
          FROM public.public_services ps
          WHERE ps.service_type = 'other'::public.service_type
            AND ps.source_layer IN ({junk_in})
        ),
        gray AS (
          SELECT
            count(*) FILTER (
              WHERE service_type = 'other'::public.service_type AND source_layer = 'aterro_sanitario'
            )::bigint AS aterro_other,
            count(*) FILTER (
              WHERE service_type = 'other'::public.service_type AND source_layer = 'defesa_civil'
            )::bigint AS defesa_other
          FROM public.public_services
        )
        SELECT
          (SELECT school_canon FROM school) AS school_canon,
          (SELECT school_soft_dupes FROM school) AS school_soft_dupes,
          (SELECT transport_other_total FROM tr) AS transport_other_total,
          (SELECT transport_other_protected FROM tr) AS transport_other_protected,
          (SELECT transport_other_deletavel FROM tr) AS transport_other_deletavel,
          (SELECT junk_other_total FROM jk) AS junk_other_total,
          (SELECT junk_other_protected FROM jk) AS junk_other_protected,
          (SELECT junk_other_deletavel FROM jk) AS junk_other_deletavel,
          (SELECT aterro_other FROM gray) AS aterro_other,
          (SELECT defesa_other FROM gray) AS defesa_other;
        """
    )
    if not rows:
        return {}
    r = rows[0]

    def i(k: str) -> int:
        return int_csv(r.get(k))

    return {
        "school_canon": i("school_canon"),
        "school_soft_dupes": i("school_soft_dupes"),
        "transport_other_total": i("transport_other_total"),
        "transport_other_protected": i("transport_other_protected"),
        "transport_other_deletavel": i("transport_other_deletavel"),
        "junk_other_total": i("junk_other_total"),
        "junk_other_protected": i("junk_other_protected"),
        "junk_other_deletavel": i("junk_other_deletavel"),
        "aterro_other": i("aterro_other"),
        "defesa_other": i("defesa_other"),
    }


def fetch_counts_by_type() -> dict[str, int]:
    rows = run_sql(
        """
        SET statement_timeout = '120s';
        SELECT service_type::text AS service_type, count(*)::bigint AS n
        FROM public.public_services
        GROUP BY service_type
        ORDER BY service_type;
        """
    )
    out: dict[str, int] = {}
    for row in rows:
        k = (row.get("service_type") or "").strip()
        if k:
            out[k] = int_csv(row.get("n"))
    return out


def fetch_total() -> int:
    rows = run_sql(
        """
        SET statement_timeout = '120s';
        SELECT count(*)::bigint AS n FROM public.public_services;
        """
    )
    if not rows:
        return 0
    return int_csv(rows[0].get("n"))


def projected_count(
    service_type: str,
    current: int,
    m: dict[str, int],
    current_by_type: dict[str, int],
) -> int:
    if service_type == "school":
        return m["school_canon"]

    if service_type == "transit_station":
        return current + m["transport_other_protected"]

    if service_type == "recycling_point":
        return current + m["aterro_other"]

    if service_type == "social_assistance":
        return current + m["defesa_other"]

    if service_type == "other":
        other = current_by_type.get("other", 0)
        return (
            other
            - m["transport_other_total"]
            - m["junk_other_deletavel"]
            - m["aterro_other"]
            - m["defesa_other"]
        )

    return current


def projected_grand_total(current_total: int, m: dict[str, int]) -> int:
    return (
        current_total
        - m["school_soft_dupes"]
        - m["transport_other_deletavel"]
        - m["junk_other_deletavel"]
    )


def _w_p(text: str, *, title: bool = False) -> str:
    t = escape(text)
    if title:
        r_pr = "<w:rPr><w:b/><w:sz w:val=\"36\"/><w:szCs w:val=\"36\"/></w:rPr>"
    else:
        r_pr = ""
    return f'<w:p><w:pPr><w:jc w:val="{"center" if title else "start"}"/></w:pPr><w:r>{r_pr}<w:t xml:space="preserve">{t}</w:t></w:r></w:p>'


def _w_cell(text: str) -> str:
    return (
        "<w:tc><w:tcPr><w:tcW w:type=\"pct\" w:w=\"2000\"/></w:tcPr>"
        f"{_w_p(text)}"
        "</w:tc>"
    )


def build_docx(
    out_path: Path,
    counts: dict[str, int],
    total: int,
    m: dict[str, int],
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body_parts: list[str] = []

    body_parts.append(_w_p("Tipos de serviço — contagens e previsão pós-ajustes", title=True))
    body_parts.append(
        _w_p(
            f"Relatório gerado automaticamente em {now}. "
            "Fonte: tabela public.public_services (projeto Supabase linkado). "
            "As previsões assumem que os scripts de limpeza e reclassificação descritos na nota final "
            "foram ou serão aplicados por completo, com base no estado atual do banco."
        )
    )

    body_parts.append(_w_p("Resumo das operações consideradas na previsão", title=True))
    bullets = [
        f"Escolas: remoção de soft-duplicatas (duplicate_of IS NOT NULL). "
        f"Hoje há {m['school_soft_dupes']:,} duplicatas e {m['school_canon']:,} canônicos; "
        f"previsão de linhas school = {m['school_canon']:,}.",
        f"Transporte (camadas GeoSampa em other): {m['transport_other_total']:,} linhas other nessas camadas — "
        f"{m['transport_other_deletavel']:,} sem referência em uso serão apagadas; "
        f"{m['transport_other_protected']:,} com referência serão reclassificadas para transit_station.",
        f"Camadas other não-equipamento (junk): {m['junk_other_total']:,} linhas — "
        f"{m['junk_other_deletavel']:,} apagáveis; {m['junk_other_protected']:,} permanecem como other por terem referências.",
        f"Pré-reclassificação (script junk): aterro_sanitario → recycling_point ({m['aterro_other']:,} ainda como other); "
        f"defesa_civil → social_assistance ({m['defesa_other']:,} ainda como other).",
    ]
    for b in bullets:
        body_parts.append(_w_p("• " + b))

    body_parts.append(
        _w_p(
            f"Total de linhas em public_services (hoje): {total:,}. "
            f"Total previsto após remoções (escola + deletes transporte/junk): {projected_grand_total(total, m):,}. "
            "Esse total subtrai apenas linhas apagadas; transit_station, recycling_point e social_assistance "
            "absorvem parte do que saía de other."
        )
    )

    body_parts.append(_w_p("Detalhamento por tipo", title=True))

    tbl_rows: list[str] = []
    hdr = (
        "<w:tr>"
        + _w_cell("Código (enum)")
        + _w_cell("Nome amigável")
        + _w_cell("Quantidade atual")
        + _w_cell("Previsão pós-ajustes")
        + _w_cell("Observação")
        + "</w:tr>"
    )
    tbl_rows.append(hdr)

    for st in SERVICE_TYPE_ORDER:
        cur = counts.get(st, 0)
        proj = projected_count(st, cur, m, counts)
        note = ""
        if st == "school" and m["school_soft_dupes"]:
            note = "Remove duplicatas soft (duplicate_of)."
        elif st == "other":
            note = "Reduz other de transporte + junk + pré-reclass aterro/defesa."
        elif st == "transit_station" and m["transport_other_protected"]:
            note = "Soma other de transporte com referências."
        elif st == "recycling_point" and m["aterro_other"]:
            note = "Soma other em aterro_sanitario (pré-reclass)."
        elif st == "social_assistance" and m["defesa_other"]:
            note = "Soma other em defesa_civil (pré-reclass)."
        tbl_rows.append(
            "<w:tr>"
            + _w_cell(st)
            + _w_cell(SERVICE_TYPE_LABELS.get(st, st))
            + _w_cell(f"{cur:,}")
            + _w_cell(f"{proj:,}")
            + _w_cell(note)
            + "</w:tr>"
        )

    sum_cur = sum(counts.get(st, 0) for st in SERVICE_TYPE_ORDER)
    sum_proj = sum(projected_count(st, counts.get(st, 0), m, counts) for st in SERVICE_TYPE_ORDER)
    tbl_rows.append(
        "<w:tr>"
        + _w_cell("—")
        + _w_cell("Soma das linhas da tabela acima")
        + _w_cell(f"{sum_cur:,}")
        + _w_cell(f"{sum_proj:,}")
        + _w_cell("Pode diferir do count(*) se existir enum não listado.")
        + "</w:tr>"
    )

    table_xml = (
        '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="666666"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="666666"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="666666"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="666666"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="cccccc"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="cccccc"/>'
        "</w:tblBorders></w:tblPr>"
        "<w:tblGrid>"
        + "".join('<w:gridCol w:w="1800"/>' for _ in range(5))
        + "</w:tblGrid>"
        + "".join(tbl_rows)
        + "</w:tbl>"
    )
    body_parts.append(table_xml)

    body_parts.append(_w_p("Notas", title=True))
    body_parts.append(
        _w_p(
            "Valores atuais vêm de uma consulta em tempo real. A previsão é determinística a partir das regras "
            "dos scripts run-delete-school-soft-duplicates-batches.py, run-delete-transport-other-batches.py "
            "e run-delete-junk-other-batches.py. Se parte do job já tiver sido executada, os números atual e "
            "previsão se aproximam."
        )
    )
    body_parts.append(
        _w_p(
            "Tipos sem linhas aparecem com 0. Enum completo conforme app "
            "(src/integrations/supabase/types.ts, Constants.public.Enums.service_type)."
        )
    )

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(body_parts)
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        "</w:body></w:document>"
    )

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

    core_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Tipos de serviço — contagens e previsão</dc:title>
<dc:creator>Câmã na Mão — script generate-service-types-report-docx</dc:creator>
<cp:created xsi:type="dcterms:W3CDTF">{datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}</cp:created>
</cp:coreProperties>"""

    app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>generate-service-types-report-docx.py</Application></Properties>"""

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document_xml.encode("utf-8"))
        z.writestr("docProps/core.xml", core_xml.encode("utf-8"))
        z.writestr("docProps/app.xml", app_xml.encode("utf-8"))

    print(f"Escrito: {out_path}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=ROOT / "docs" / "relatorio-tipos-servico-contagens-e-previsao.docx",
        help="Caminho do .docx de saída",
    )
    args = parser.parse_args()

    counts = fetch_counts_by_type()
    total = fetch_total()
    m = fetch_adjustment_metrics()
    build_docx(args.output.resolve(), counts, total, m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
