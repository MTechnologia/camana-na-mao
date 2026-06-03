import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getDataset,
  type DatasetMeta,
  type ExportDataset,
  type ExportField,
} from "@/lib/exportFields";
import type { CsvHeader } from "@/lib/csvSerialize";
import {
  buildXlsxWorkbook,
  downloadXlsx,
  type XlsxBreakdown,
  type XlsxKpi,
} from "@/lib/xlsxSerialize";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-7.2 — Export XLSX configurável.
 *
 * Mesma paginação 1k × 50 do useCsvExport, mas:
 *  - Gera workbook XLSX com 2 sheets ("Resumo" + "Detalhe") quando
 *    includeSummary=true.
 *  - O Resumo agrega KPIs (total, por status, por categoria) sobre o conjunto
 *    baixado em memória (não exige query extra).
 *  - Loga em export_logs com format='xlsx'.
 *
 * O conjunto de filtros e a semântica do limite são idênticos ao CSV.
 */

export const XLSX_EXPORT_PAGE_SIZE = 1000;
export const XLSX_EXPORT_MAX_ROWS = 50_000;

export interface XlsxExportConfig {
  dataset: ExportDataset;
  fieldIds: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  /** Quando true, adiciona a aba "Resumo" com KPIs e breakdowns. */
  includeSummary?: boolean;
  filters?: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    categories?: string[];
    regions?: string[];
    zones?: ZonaVolumeOuDesconhecida[];
    status?: string;
  };
}

export interface XlsxExportResult {
  rowCount: number;
  filename: string;
}

export interface UseXlsxExportResult {
  exportXlsx: (config: XlsxExportConfig) => Promise<XlsxExportResult>;
  exporting: boolean;
  progressLoaded: number;
  error: string | null;
  cancel: () => void;
}

function toIsoStart(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toISOString();
  }
  return new Date(value).toISOString();
}

function toIsoEnd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
  }
  return new Date(value).toISOString();
}

function buildFilename(dataset: DatasetMeta): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${dataset.id}_${ts}.xlsx`;
}

function resolveFields(dataset: DatasetMeta, fieldIds: string[]): ExportField[] {
  const byId = new Map(dataset.fields.map((f) => [f.id, f]));
  return fieldIds.map((id) => byId.get(id)).filter((f): f is ExportField => !!f);
}

/**
 * Constrói o resumo agregando rows em memória. Não precisa de queries
 * adicionais — usa o mesmo conjunto que vai para a aba Detalhe.
 */
function buildSummary(
  dataset: DatasetMeta,
  rows: Array<Record<string, unknown>>,
  filterContext: string[],
): { kpis: XlsxKpi[]; breakdowns: XlsxBreakdown[]; contextLines: string[] } {
  const total = rows.length;
  const isUrban = dataset.id === "urban_reports";
  const categoryColumn = isUrban ? "category" : "report_type";

  // Agrupa por status e por categoria
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    const status = String(r.status ?? "—");
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    const cat = String(r[categoryColumn] ?? "—");
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const kpis: XlsxKpi[] = [
    { label: "Total exportado", value: total },
    {
      label: "Resolvidos",
      value: (byStatus.get("resolved") ?? 0) + (byStatus.get("completed") ?? 0),
    },
    { label: "Pendentes", value: byStatus.get("pending") ?? 0 },
    { label: "Em análise / em andamento", value: byStatus.get("in_progress") ?? 0 },
  ];

  const toBreakdownRows = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }));

  const breakdowns: XlsxBreakdown[] = [
    { title: "Por status", rows: toBreakdownRows(byStatus) },
    {
      title: isUrban ? "Por categoria" : "Por tipo de relato",
      rows: toBreakdownRows(byCategory).slice(0, 20),
    },
  ];

  return { kpis, breakdowns, contextLines: filterContext };
}

export function useXlsxExport(): UseXlsxExportResult {
  const [exporting, setExporting] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const exportXlsx = useCallback(async (config: XlsxExportConfig): Promise<XlsxExportResult> => {
    cancelRef.current = false;
    setExporting(true);
    setProgressLoaded(0);
    setError(null);

    const dataset = getDataset(config.dataset);
    const fields = resolveFields(dataset, config.fieldIds);
    if (fields.length === 0) {
      const err = "Nenhum campo selecionado para exportação.";
      setError(err);
      setExporting(false);
      throw new Error(err);
    }

    const orderField = fields.find((f) => f.id === config.orderBy.fieldId);
    const orderColumn = orderField?.dbColumn ?? dataset.defaultOrderColumn;
    const orderAsc = config.orderBy.direction === "asc";

    const categoryColumn = dataset.id === "urban_reports" ? "category" : "report_type";
    const useRegionsServerSide = dataset.id === "urban_reports";

    const requiredSelectCols = new Set<string>([
      ...fields.map((f) => f.dbColumn),
      dataset.defaultOrderColumn,
      orderColumn,
      dataset.defaultDateColumn,
      categoryColumn,
      "status", // Necessário para o Resumo agrupar por status
    ]);
    if (useRegionsServerSide) requiredSelectCols.add("neighborhood");
    const selectCols = Array.from(requiredSelectCols).join(",");

    const allRows: Array<Record<string, unknown>> = [];
    let offset = 0;
    const startIso = toIsoStart(config.filters?.startDate);
    const endIso = toIsoEnd(config.filters?.endDate);
    const cats = config.filters?.categories ?? [];
    const regions = config.filters?.regions ?? [];
    const zones = config.filters?.zones ?? [];

    try {
      while (true) {
        if (cancelRef.current) throw new Error("CANCELLED");
        if (offset >= XLSX_EXPORT_MAX_ROWS) break;

        let q = supabase.from(dataset.table).select(selectCols);
        if (startIso) q = q.gte(dataset.defaultDateColumn, startIso);
        if (endIso) q = q.lte(dataset.defaultDateColumn, endIso);
        if (cats.length > 0) q = q.in(categoryColumn, cats);
        if (useRegionsServerSide && regions.length > 0) {
          q = q.in("neighborhood", regions);
        }
        const status = config.filters?.status;
        if (useRegionsServerSide && status) {
          q = q.eq("status", status);
        }
        q = q.order(orderColumn, { ascending: orderAsc });
        const to = Math.min(offset + XLSX_EXPORT_PAGE_SIZE - 1, XLSX_EXPORT_MAX_ROWS - 1);
        q = q.range(offset, to);

        const { data, error: queryError } = await q;
        if (queryError) throw queryError;
        const batch = (data ?? []) as Array<Record<string, unknown>>;
        if (batch.length === 0) break;
        allRows.push(...batch);
        setProgressLoaded(allRows.length);

        if (batch.length < XLSX_EXPORT_PAGE_SIZE) break;
        offset += XLSX_EXPORT_PAGE_SIZE;
      }

      // Filtro client-side de zonas
      let filtered = allRows;
      if (zones.length > 0 && useRegionsServerSide) {
        const { bairroParaZona } = await import("@/lib/regionMapping");
        filtered = allRows.filter((r) => {
          const bairro = (r.neighborhood as string | null) ?? "";
          const lat = r.latitude as number | null | undefined;
          const lng = r.longitude as number | null | undefined;
          const z = bairroParaZona(bairro, lat ?? null, lng ?? null);
          return zones.includes(z as ZonaVolumeOuDesconhecida);
        });
      }

      const headers: CsvHeader[] = fields.map((f) => ({
        key: f.dbColumn,
        label: f.label,
      }));

      // Contexto humano para a aba Resumo: lista os filtros aplicados.
      const contextLines: string[] = [
        `Dataset: ${dataset.label}`,
        startIso || endIso
          ? `Período: ${startIso ?? "início"} → ${endIso ?? "agora"}`
          : "Período: todo o histórico",
      ];
      if (cats.length > 0) contextLines.push(`Categorias: ${cats.join(", ")}`);
      if (regions.length > 0) contextLines.push(`Bairros: ${regions.join(", ")}`);
      if (zones.length > 0) contextLines.push(`Zonas: ${zones.join(", ")}`);
      contextLines.push(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);

      const summary = config.includeSummary
        ? buildSummary(dataset, filtered, contextLines)
        : undefined;

      const buffer = buildXlsxWorkbook({
        detail: { headers, rows: filtered },
        summary,
        workbookTitle: `Câmara na Mão — ${dataset.label}`,
      });
      const filename = buildFilename(dataset);
      downloadXlsx(buffer, filename);

      try {
        const { data: userResp } = await supabase.auth.getUser();
        const userId = userResp.user?.id;
        if (userId) {
          await supabase.from("export_logs").insert([
            {
              user_id: userId,
              export_type: dataset.id,
              format: "xlsx",
              row_count: filtered.length,
              status: "completed",
              completed_at: new Date().toISOString(),
              filters: {
                startDate: startIso,
                endDate: endIso,
                categories: cats,
                regions,
                zones,
                fields: fields.map((f) => f.id),
                orderBy: {
                  fieldId: orderField?.id ?? dataset.defaultOrderColumn,
                  direction: orderAsc ? "asc" : "desc",
                },
                includeSummary: !!config.includeSummary,
              },
            } as never,
          ]);
        }
      } catch (logErr) {
        console.warn("[useXlsxExport] falha ao gravar export_logs", logErr);
      }

      setExporting(false);
      return { rowCount: filtered.length, filename };
    } catch (err) {
      const message =
        err instanceof Error && err.message === "CANCELLED"
          ? "Exportação cancelada."
          : err instanceof Error
            ? err.message
            : "Erro desconhecido ao exportar.";
      setError(message);
      setExporting(false);
      throw err;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { exportXlsx, exporting, progressLoaded, error, cancel };
}
