import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  EXPORT_DATASETS,
  filterFieldsByRole,
  getRowCap,
  type ExportRole,
} from "./exportFields";
import { effectiveExportRole } from "./exportStaffRole";
import { buildXlsxWorkbook } from "./xlsxSerialize";

/**
 * Regressão A1.2 — "gestor sem relatório".
 *
 * Amarra o fluxo completo do DataExportDialog server-agnostic:
 *   role do usuário → role efetiva → cap de linhas → campos visíveis →
 *   geração do workbook XLSX não-vazio.
 *
 * Guarda contra a regressão em que um gestor pedia uma planilha e recebia
 * cap 0 (nenhuma linha) ou um arquivo vazio. Se qualquer elo quebrar, a
 * planilha do gestor fica sem dados — e este teste falha.
 */

const SAMPLE_ROWS = [
  { protocol_code: "URB-1", category: "Iluminação", status: "resolved" },
  { protocol_code: "URB-2", category: "Buracos", status: "pending" },
  { protocol_code: "URB-3", category: "Lixo", status: "in_progress" },
];

function readBack(buffer: ArrayBuffer) {
  return XLSX.read(buffer, { type: "array" });
}

describe("Export do gestor (regressão end-to-end)", () => {
  it("gestor → role efetiva 'gestor' → cap > 0 → planilha com as linhas", () => {
    // 1) Role efetiva a partir dos flags do useUserRole (gestor logado).
    const role: ExportRole | null = effectiveExportRole({
      isAdmin: false,
      isGestor: true,
      isAssessor: false,
      isVereador: false,
    });
    expect(role).toBe("gestor");

    // 2) Cap de linhas — TEM de ser > 0, senão o gestor não recebe nada.
    const cap = getRowCap(role, "xlsx");
    expect(cap).toBeGreaterThan(0);

    // 3) Campos visíveis para a role — lista não-vazia.
    const dataset = EXPORT_DATASETS.urban_reports;
    const visibleFields = filterFieldsByRole(dataset.fields, role);
    expect(visibleFields.length).toBeGreaterThan(0);

    // 4) Constrói o workbook como o DataExportDialog faria (respeitando o cap).
    const headers = visibleFields
      .filter((f) => f.id in SAMPLE_ROWS[0])
      .map((f) => ({ key: f.id, label: f.label }));
    // Garante que pelo menos os campos do sample (básicos) estão visíveis.
    expect(headers.length).toBeGreaterThan(0);

    const rows = SAMPLE_ROWS.slice(0, cap);
    const buffer = buildXlsxWorkbook({
      detail: { headers, rows },
      workbookTitle: "Relatos urbanos",
    });

    // 5) Planilha não-vazia e com as linhas exportadas (round-trip).
    expect(buffer.byteLength).toBeGreaterThan(0);
    const wb = readBack(buffer);
    expect(wb.SheetNames).toContain("Detalhe");
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets["Detalhe"], {
      header: 1,
    }) as unknown[][];
    // 1 linha de cabeçalho + 3 de dados.
    expect(aoa.length).toBe(rows.length + 1);
    expect(aoa[1]).toContain("URB-1");
  });

  it("usuário sem perfil staff → cap 0 (caller detecta 'sem relatório', não gera planilha)", () => {
    const role = effectiveExportRole({
      isAdmin: false,
      isGestor: false,
      isAssessor: false,
      isVereador: false,
    });
    expect(role).toBeNull();
    expect(getRowCap(role, "xlsx")).toBe(0);
    expect(getRowCap(role, "csv")).toBe(0);
  });
});
