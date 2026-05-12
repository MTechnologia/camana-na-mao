import * as XLSX from "xlsx";
import type { CsvHeader } from "@/lib/csvSerialize";

/**
 * HU-7.2 — Geração de workbook XLSX para export configurável.
 *
 * Cria um workbook com:
 *  - Sheet "Detalhe" — sempre presente, mesma estrutura headers/rows do CSV.
 *  - Sheet "Resumo" — opcional, lista de KPIs + breakdowns simples (chave/valor).
 *
 * Reusa a tipagem `CsvHeader` da HU-7.1 para manter a serialização compatível
 * (mesmo catálogo de campos, mesmo escape semântico).
 */

export interface XlsxKpi {
  label: string;
  value: number | string;
}

export interface XlsxBreakdown {
  title: string;
  rows: { label: string; count: number; percentage?: number }[];
}

export interface XlsxSummaryInput {
  kpis: XlsxKpi[];
  breakdowns?: XlsxBreakdown[];
  /** Texto livre que aparece no topo da aba Resumo (ex.: "Filtros aplicados: ..."). */
  contextLines?: string[];
}

export interface XlsxBuildInput {
  detail: {
    headers: CsvHeader[];
    rows: Array<Record<string, unknown>>;
  };
  summary?: XlsxSummaryInput;
  /** Nome do workbook (apenas metadado; o filename vem do downloadXlsx). */
  workbookTitle?: string;
}

/**
 * Constrói o ArrayBuffer XLSX a partir do input. Não dispara download.
 */
export function buildXlsxWorkbook(input: XlsxBuildInput): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  if (input.workbookTitle) {
    wb.Props = { ...(wb.Props ?? {}), Title: input.workbookTitle };
  }

  // 1) Sheet "Resumo" (vem primeiro pra aparecer como aba inicial)
  if (input.summary) {
    const summaryRows: Array<Array<string | number>> = [];
    if (input.summary.contextLines?.length) {
      for (const line of input.summary.contextLines) {
        summaryRows.push([line]);
      }
      summaryRows.push([""]); // linha em branco
    }

    summaryRows.push(["Indicadores principais"]);
    summaryRows.push(["Métrica", "Valor"]);
    for (const k of input.summary.kpis) {
      summaryRows.push([k.label, k.value]);
    }
    summaryRows.push([""]); // separador

    for (const b of input.summary.breakdowns ?? []) {
      summaryRows.push([b.title]);
      summaryRows.push(["Categoria", "Quantidade", "%"]);
      for (const row of b.rows) {
        summaryRows.push([
          row.label,
          row.count,
          row.percentage !== undefined ? `${row.percentage.toFixed(1)}%` : "",
        ]);
      }
      summaryRows.push([""]); // separador
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    // Largura razoável da 1ª coluna
    summarySheet["!cols"] = [
      { wch: 32 },
      { wch: 16 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");
  }

  // 2) Sheet "Detalhe"
  const detailHeaderRow = input.detail.headers.map((h) => h.label);
  const detailRows = input.detail.rows.map((r) =>
    input.detail.headers.map((h) => normalizeCellValue(r[h.key])),
  );
  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaderRow, ...detailRows]);
  // Largura das colunas: usa o maior entre o label e ~16
  detailSheet["!cols"] = input.detail.headers.map((h) => ({
    wch: Math.max(12, Math.min(40, h.label.length + 2)),
  }));
  XLSX.utils.book_append_sheet(wb, detailSheet, "Detalhe");

  // Gera o ArrayBuffer
  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return ab as ArrayBuffer;
}

/**
 * Helper para download no navegador.
 */
export function downloadXlsx(buffer: ArrayBuffer, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Normaliza valores para a célula do XLSX:
 *  - null/undefined → ""
 *  - Date → mantido como Date (Excel preserva como data)
 *  - arrays → string com separador "; "
 *  - objetos → JSON.stringify
 *  - números/strings/booleans → mantidos
 */
function normalizeCellValue(v: unknown): string | number | boolean | Date {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
    return v;
  }
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join("; ");
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
