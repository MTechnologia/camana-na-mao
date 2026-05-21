import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EXPORT_DATASETS,
  type DatasetMeta,
  type ExportDataset,
  type ExportField,
  getDataset,
} from "@/lib/exportFields";
import { downloadCsv, serializeCsv, type CsvHeader } from "@/lib/csvSerialize";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-7.1 — Hook que orquestra a exportação CSV configurável.
 *
 * Recebe a configuração (dataset + campos + ordenação + filtros) e:
 *  1. Pagina a query do Supabase em batches de 1000 (até `maxRows`, default 50k).
 *  2. Aplica filtros: período (defaultDateColumn), categorias (in), bairros
 *     (in), zonas (em memória após fetch).
 *  3. Aplica ordenação.
 *  4. Serializa CSV (BOM UTF-8, RFC-4180).
 *  5. Faz download e registra em export_logs.
 *
 * Reporta progresso via callback `onProgress(loaded, estimated)`. Após
 * conclusão, expõe o número de linhas exportadas no return.
 */

export const CSV_EXPORT_PAGE_SIZE = 1000;
export const CSV_EXPORT_MAX_ROWS = 50_000;

export interface CsvExportConfig {
  dataset: ExportDataset;
  fieldIds: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  filters?: {
    /** Período aplica sobre dataset.defaultDateColumn. */
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    /** Filtro de categoria (urban_reports.category ou transport_reports.report_type). */
    categories?: string[];
    /** Filtro de bairro (urban_reports.neighborhood). */
    regions?: string[];
    /** Filtro de zona (derivado em memória do bairro/localização). */
    zones?: ZonaVolumeOuDesconhecida[];
    /** Status do relato (apenas `urban_reports`). */
    status?: string;
  };
}

export interface CsvExportResult {
  rowCount: number;
  filename: string;
}

export interface UseCsvExportResult {
  /** Executa a exportação. Resolve com o resultado ou rejeita em erro. */
  exportCsv: (config: CsvExportConfig) => Promise<CsvExportResult>;
  /** True enquanto uma exportação está rodando. */
  exporting: boolean;
  /** Progresso: linhas baixadas até agora. */
  progressLoaded: number;
  /** Erro da última tentativa (ou null). */
  error: string | null;
  /** Cancela a exportação em andamento (best-effort). */
  cancel: () => void;
}

function toIsoStart(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // Trata "YYYY-MM-DD" como meia-noite local pra evitar D-1 em UTC negativo.
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
    // Fim do dia local.
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
  }
  return new Date(value).toISOString();
}

function buildFilename(dataset: DatasetMeta): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${dataset.id}_${ts}.csv`;
}

function resolveFields(dataset: DatasetMeta, fieldIds: string[]): ExportField[] {
  const byId = new Map(dataset.fields.map((f) => [f.id, f]));
  return fieldIds
    .map((id) => byId.get(id))
    .filter((f): f is ExportField => !!f);
}

export function useCsvExport(): UseCsvExportResult {
  const [exporting, setExporting] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const exportCsv = useCallback(
    async (config: CsvExportConfig): Promise<CsvExportResult> => {
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

      // Garante que o campo de ordenação está nos selecionados (caso contrário
      // usa o defaultOrderColumn, sempre presente).
      const orderField = fields.find((f) => f.id === config.orderBy.fieldId);
      const orderColumn = orderField?.dbColumn ?? dataset.defaultOrderColumn;
      const orderAsc = config.orderBy.direction === "asc";

      // Coluna alvo dos filtros de categoria (varia por dataset).
      const categoryColumn =
        dataset.id === "urban_reports" ? "category" : "report_type";
      // Bairro (urban) ou "location" (transport, é um texto livre, não fizemos
      // filtro server-side). Pra transport_reports, regions/zones não fazem
      // sentido no schema atual — apenas urban_reports usa.
      const useRegionsServerSide = dataset.id === "urban_reports";

      // Colunas SELECT (sempre inclui as colunas filtráveis + defaultOrderColumn
      // mesmo se não estiverem selecionadas, para a query funcionar — e os
      // filtros server-side só funcionam em colunas que vêm no result set).
      const requiredSelectCols = new Set<string>([
        ...fields.map((f) => f.dbColumn),
        dataset.defaultOrderColumn,
        orderColumn,
        dataset.defaultDateColumn,
        categoryColumn,
      ]);
      if (useRegionsServerSide) requiredSelectCols.add("neighborhood");
      const selectCols = Array.from(requiredSelectCols).join(",");

      // Paginação acumulando rows.
      const allRows: Array<Record<string, unknown>> = [];
      let offset = 0;
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (cancelRef.current) throw new Error("CANCELLED");
          if (offset >= CSV_EXPORT_MAX_ROWS) break;

          // Constrói query
          let q = supabase.from(dataset.table).select(selectCols);

          // Filtros server-side
          const startIso = toIsoStart(config.filters?.startDate);
          const endIso = toIsoEnd(config.filters?.endDate);
          if (startIso) q = q.gte(dataset.defaultDateColumn, startIso);
          if (endIso) q = q.lte(dataset.defaultDateColumn, endIso);

          const cats = config.filters?.categories ?? [];
          if (cats.length > 0) q = q.in(categoryColumn, cats);

          const regions = config.filters?.regions ?? [];
          if (useRegionsServerSide && regions.length > 0) {
            q = q.in("neighborhood", regions);
          }

          const status = config.filters?.status;
          if (useRegionsServerSide && status) {
            q = q.eq("status", status);
          }

          q = q.order(orderColumn, { ascending: orderAsc });
          const to = Math.min(
            offset + CSV_EXPORT_PAGE_SIZE - 1,
            CSV_EXPORT_MAX_ROWS - 1,
          );
          q = q.range(offset, to);

          const { data, error: queryError } = await q;
          if (queryError) throw queryError;
          const batch = (data ?? []) as Array<Record<string, unknown>>;
          if (batch.length === 0) break;
          allRows.push(...batch);
          setProgressLoaded(allRows.length);

          if (batch.length < CSV_EXPORT_PAGE_SIZE) break;
          offset += CSV_EXPORT_PAGE_SIZE;
        }

        // Filtro client-side de zonas (necessita derivar do neighborhood/location).
        let filtered = allRows;
        const zones = config.filters?.zones ?? [];
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

        // Monta CSV
        const headers: CsvHeader[] = fields.map((f) => ({
          key: f.dbColumn,
          label: f.label,
        }));
        // Para campos do tipo `datetime`/`date`, mantém ISO; deixar o usuário
        // formatar no Excel (Data → texto longo geralmente lê ok).
        const csv = serializeCsv(headers, filtered);
        const filename = buildFilename(dataset);
        downloadCsv(csv, filename);

        // Log do export. Falha aqui não interrompe o download (best-effort).
        try {
          const { data: userResp } = await supabase.auth.getUser();
          const userId = userResp.user?.id;
          if (userId) {
            await supabase.from("export_logs").insert([
              {
                user_id: userId,
                export_type: dataset.id,
                format: "csv",
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
                },
              } as never,
            ]);
          }
        } catch (logErr) {
          console.warn("[useCsvExport] falha ao gravar export_logs", logErr);
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
    },
    [],
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { exportCsv, exporting, progressLoaded, error, cancel };
}

/** Exposto para tooling/tests. */
export const __testInternals = { EXPORT_DATASETS };
