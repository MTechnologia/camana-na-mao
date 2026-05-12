import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildXlsxWorkbook } from "./xlsxSerialize";

function readBack(buffer: ArrayBuffer) {
  return XLSX.read(buffer, { type: "array" });
}

const SAMPLE_HEADERS = [
  { key: "id", label: "ID" },
  { key: "nome", label: "Nome" },
  { key: "valor", label: "Valor" },
];

const SAMPLE_ROWS = [
  { id: 1, nome: "Maria", valor: 100 },
  { id: 2, nome: "José", valor: 250 },
  { id: 3, nome: "Ana, B.", valor: null },
];

describe("buildXlsxWorkbook", () => {
  it("sempre cria a aba 'Detalhe' com headers e rows", () => {
    const buf = buildXlsxWorkbook({
      detail: { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS },
    });
    expect(buf.byteLength).toBeGreaterThan(0);

    const wb = readBack(buf);
    expect(wb.SheetNames).toContain("Detalhe");
    const sheet = wb.Sheets["Detalhe"];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    expect(aoa[0]).toEqual(["ID", "Nome", "Valor"]);
    expect(aoa[1]).toEqual([1, "Maria", 100]);
    expect(aoa[3]).toEqual([3, "Ana, B.", ""]); // null vira ""
  });

  it("não cria a aba 'Resumo' quando summary é omitido", () => {
    const buf = buildXlsxWorkbook({
      detail: { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS },
    });
    const wb = readBack(buf);
    expect(wb.SheetNames).not.toContain("Resumo");
  });

  it("cria a aba 'Resumo' quando summary é fornecido, e ela vem antes do Detalhe", () => {
    const buf = buildXlsxWorkbook({
      detail: { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS },
      summary: {
        kpis: [
          { label: "Total exportado", value: 3 },
          { label: "Resolvidos", value: 1 },
        ],
        breakdowns: [
          {
            title: "Por status",
            rows: [
              { label: "resolved", count: 1, percentage: 33.3 },
              { label: "pending", count: 2, percentage: 66.7 },
            ],
          },
        ],
        contextLines: ["Dataset: Relatos urbanos", "Gerado em: agora"],
      },
    });
    const wb = readBack(buf);
    expect(wb.SheetNames[0]).toBe("Resumo");
    expect(wb.SheetNames[1]).toBe("Detalhe");
  });

  it("a aba Resumo contém os KPIs e linhas de breakdown", () => {
    const buf = buildXlsxWorkbook({
      detail: { headers: SAMPLE_HEADERS, rows: [] },
      summary: {
        kpis: [{ label: "Total exportado", value: 99 }],
        breakdowns: [
          {
            title: "Por categoria",
            rows: [{ label: "Iluminação", count: 50, percentage: 50.5 }],
          },
        ],
      },
    });
    const wb = readBack(buf);
    const sheet = wb.Sheets["Resumo"];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    // Deve conter linha "Total exportado | 99" em algum lugar
    const flat = aoa.map((row) => row.join("|"));
    expect(flat.some((l) => l.includes("Total exportado") && l.includes("99"))).toBe(true);
    expect(flat.some((l) => l.includes("Iluminação") && l.includes("50"))).toBe(true);
  });

  it("normaliza arrays e objetos para texto", () => {
    const buf = buildXlsxWorkbook({
      detail: {
        headers: [
          { key: "tags", label: "Tags" },
          { key: "meta", label: "Meta" },
        ],
        rows: [
          { tags: ["a", "b", "c"], meta: { x: 1 } },
        ],
      },
    });
    const wb = readBack(buf);
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets["Detalhe"], {
      header: 1,
    }) as unknown[][];
    expect(aoa[1][0]).toBe("a; b; c");
    expect(aoa[1][1]).toBe('{"x":1}');
  });
});
