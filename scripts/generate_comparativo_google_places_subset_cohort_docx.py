"""Gera docs/comparativo-google-places-subset-cohort-1.docx."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "comparativo-google-places-subset-cohort-1.docx"
ZIP_TIMESTAMP = (2026, 1, 1, 0, 0, 0)

SUBSET_ROWS = [
    ["Escola (4 camadas SME/GeoSampa)", "57.962"],
    ["Transporte (metro, trem, terminal)", "13.199"],
    ["Parque", "6.125"],
    ["Centro esportivo", "620"],
    ["CEU", "513"],
    ["Teatro / cinema", "410"],
    ["Biblioteca", "384"],
    ["Museu", "167"],
    ["Total", "79.380"],
]


def _text(value: str) -> str:
    return escape(value, {'"': "&quot;"})


def _run(value: str, *, bold: bool = False, size: int | None = None) -> str:
    rpr = ""
    if bold or size:
        bits = []
        if bold:
            bits.append("<w:b/>")
        if size:
            bits.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
        rpr = f"<w:rPr>{''.join(bits)}</w:rPr>"
    return f'<w:r>{rpr}<w:t xml:space="preserve">{_text(value)}</w:t></w:r>'


def _paragraph(*runs: str, spacing_after: int = 120) -> str:
    return (
        "<w:p>"
        f'<w:pPr><w:spacing w:after="{spacing_after}"/></w:pPr>'
        f"{''.join(runs)}"
        "</w:p>"
    )


def _heading(text: str, level: int) -> str:
    size = 32 if level == 0 else 24
    return _paragraph(_run(text, bold=True, size=size), spacing_after=180)


def _cell(text: str, *, bold: bool = False) -> str:
    return (
        "<w:tc>"
        "<w:tcPr><w:tcW w:w=\"0\" w:type=\"auto\"/></w:tcPr>"
        f"{_paragraph(_run(text, bold=bold), spacing_after=0)}"
        "</w:tc>"
    )


def _table(headers: list[str], rows: list[list[str]]) -> str:
    table_rows = []
    table_rows.append("<w:tr>" + "".join(_cell(header, bold=True) for header in headers) + "</w:tr>")
    for row in rows:
        is_total = row[0].lower() == "total"
        table_rows.append(
            "<w:tr>" + "".join(_cell(value, bold=is_total) for value in row) + "</w:tr>"
        )

    borders = "".join(
        f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="666666"/>'
        for side in ["top", "left", "bottom", "right", "insideH", "insideV"]
    )
    return (
        "<w:tbl>"
        '<w:tblPr><w:tblW w:w="0" w:type="auto"/>'
        f"<w:tblBorders>{borders}</w:tblBorders></w:tblPr>"
        f"{''.join(table_rows)}"
        "</w:tbl>"
        + _paragraph(_run(""), spacing_after=120)
    )


def _bold_label_paragraph(label: str, text: str) -> str:
    return _paragraph(_run(label, bold=True), _run(text))


def _content_types_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""


def _rels_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""


def _document_xml(body: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


def _write_docx(body: str) -> None:
    def write_part(docx: ZipFile, name: str, content: str) -> None:
        info = ZipInfo(name, ZIP_TIMESTAMP)
        info.compress_type = ZIP_DEFLATED
        docx.writestr(info, content)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as docx:
        write_part(docx, "[Content_Types].xml", _content_types_xml())
        write_part(docx, "_rels/.rels", _rels_xml())
        write_part(docx, "word/document.xml", _document_xml(body))


def main() -> None:
    body = []
    body.append(_heading("Google Places — subconjunto por coorte (Marco C)", 0))
    body.append(
        _paragraph(
            _run(
                "Estimativa de custo (Place Details) para o recorte definido no comparativo geral "
                "de equipamentos (secao 5), com base na query "
                "scripts/sql/diagnostic-google-places-subset-cohort.sql."
            )
        )
    )
    body.append(_bold_label_paragraph("Cambio ilustrativo: ", "R$ 5,50 por US$ 1,00."))
    body.append(
        _bold_label_paragraph(
            "Google Places (estimativa): ",
            "1 chamada Place Details (Enterprise + Atmosphere) por POI; "
            "US$ 25 / 1.000 apos 1.000 gratis/mes; sem ponto de onibus; sem Popular times.",
        )
    )

    body.append(_heading("1. O que entra no subconjunto", 1))
    body.append(
        _table(
            ["Area", "Criterio (resumo)"],
            [
                ["Metro", "transit_station + estacao_metro / estacao_metro_projeto"],
                ["Trem", "transit_station + estacao_trem / estacao_trem_projeto"],
                ["Terminal de onibus", "transit_station + terminal_onibus"],
                [
                    "Escola (4 camadas SME/GeoSampa)",
                    "school + ensino_fundamental_medio, educacao_infantil, "
                    "ensino_tecnico, senai_sesi_senac",
                ],
                [
                    "Parque, centro esportivo, CEU, teatro/cinema, biblioteca, museu",
                    "service_type: park, sports_center, ceu, theater, library, museum",
                ],
            ],
        )
    )

    body.append(_heading("2. Contagens por coorte e service_type (Marco C)", 1))
    body.append(_table(["Linha", "N"], SUBSET_ROWS))
    body.append(
        _paragraph(
            _run(
                "As linhas de Escola e Transporte entram pela primeira parte do recorte SQL "
                "(por coorte/source_layer). As demais linhas entram diretamente por service_type. "
                "O transporte desta tabela representa somente metro, trem e terminal de onibus; "
                "nao inclui pontos/paradas de onibus."
            )
        )
    )

    body.append(_heading("3. Total do subconjunto e custo ilustrativo (Marco C)", 1))
    body.append(
        _bold_label_paragraph(
            "Formula: ",
            "max(0, N - 1.000) * 0,025 USD; BRL = USD * 5,50.",
        )
    )
    body.append(
        _table(
            ["Metrica", "Valor"],
            [
                ["POIs (N)", "79.380"],
                ["USD (aprox.)", "1.959,50"],
                ["BRL (aprox.)", "10.777,25"],
            ],
        )
    )
    body.append(
        _paragraph(
            _run(
                "Valores ilustrativos; nao substituem fatura Google. Ver tambem: "
                "comparativo-equipamentos-antes-depois-google-places.md."
            )
        )
    )

    _write_docx("\n".join(body))
    print(f"Escrito: {OUT}")


if __name__ == "__main__":
    main()
