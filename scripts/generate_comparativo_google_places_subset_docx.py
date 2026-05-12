"""Gera docs/comparativo-google-places-subset-cohort.docx (subconjunto Marco C + Google Places)."""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "comparativo-google-places-subset-cohort.docx"

# Resultado da 2.ª query em diagnostic-google-places-subset-cohort.sql (Marco C)
N_TOTAL = 79_380
USD_APPROX = "1.959,50"
BRL_APPROX = "10.777,25"


def _add_table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = "Table Grid"
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        for p in hdr[i].paragraphs:
            p.runs[0].bold = True
    for ri, row in enumerate(rows, start=1):
        for ci, val in enumerate(row):
            t.rows[ri].cells[ci].text = val


def main() -> None:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    h0 = doc.add_heading(
        "Google Places — subconjunto por coorte (Marco C)",
        level=0,
    )
    h0.runs[0].font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    doc.add_paragraph(
        "Estimativa de custo (Place Details) para o recorte definido no comparativo geral "
        "de equipamentos (secção 5), com base na query "
        "scripts/sql/diagnostic-google-places-subset-cohort.sql."
    )

    p = doc.add_paragraph()
    p.add_run("Câmbio ilustrativo: ").bold = True
    p.add_run("R$ 5,50 por US$ 1,00.")

    p2 = doc.add_paragraph()
    p2.add_run("Google Places (estimativa): ").bold = True
    p2.add_run(
        "1 chamada Place Details (Enterprise + Atmosphere) por POI; "
        "US$ 25 / 1.000 após 1.000 grátis/mês; sem ponto de ônibus; sem Popular times."
    )

    doc.add_heading("1. O que entra no subconjunto", level=1)
    _add_table(
        doc,
        ["Área", "Critério (resumo)"],
        [
            [
                "Metrô",
                "transit_station + estacao_metro / estacao_metro_projeto",
            ],
            [
                "Trem",
                "transit_station + estacao_trem / estacao_trem_projeto",
            ],
            [
                "Terminal de ônibus",
                "transit_station + terminal_onibus",
            ],
            [
                "Escola (4 camadas SME/GeoSampa)",
                "school + ensino_fundamental_medio, educacao_infantil, ensino_tecnico, senai_sesi_senac",
            ],
            [
                "Parque, centro esportivo, CEU, teatro/cinema, biblioteca, museu",
                "service_type: park, sports_center, ceu, theater, library, museum",
            ],
        ],
    )

    doc.add_heading(
        "2. Contagens só por service_type (Marco C, alinhado ao comparativo geral)",
        level=1,
    )
    _add_table(
        doc,
        ["Linha", "N"],
        [
            ["Parque", "6.125"],
            ["Centro esportivo", "620"],
            ["CEU", "513"],
            ["Teatro / cinema", "410"],
            ["Biblioteca", "384"],
            ["Museu", "167"],
        ],
    )
    doc.add_paragraph(
        "Metrô, trem, terminal e as quatro linhas de escola contam na primeira query do SQL "
        "(por coorte); entram na soma N total abaixo."
    )

    doc.add_heading("3. Total do subconjunto e custo ilustrativo (Marco C)", level=1)
    p3 = doc.add_paragraph()
    p3.add_run("Fórmula: ").bold = True
    p3.add_run("max(0, N − 1.000) × 0,025 USD; BRL = USD × 5,50.")

    n_fmt = f"{N_TOTAL:,}".replace(",", ".")
    _add_table(
        doc,
        ["Métrica", "Valor"],
        [
            ["POIs (N)", n_fmt],
            ["USD (≈)", USD_APPROX],
            ["BRL (≈)", BRL_APPROX],
        ],
    )
    doc.add_paragraph(f"({n_fmt} − 1.000) × 0,025 = {USD_APPROX} USD.")

    foot = doc.add_paragraph(
        "Valores ilustrativos; não substituem fatura Google. "
        "Ver também: comparativo-equipamentos-antes-depois-google-places.md."
    )
    foot.italic = True

    for para in doc.paragraphs:
        if para.style.name.startswith("Heading"):
            continue
        if para.alignment is None:
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(f"Escrito: {OUT}")


if __name__ == "__main__":
    main()
