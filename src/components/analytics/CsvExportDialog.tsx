/**
 * HU-7.2 — Este arquivo virou um re-export do DataExportDialog unificado
 * (CSV + XLSX no mesmo dialog). Mantido apenas para preservar imports
 * que possam existir no working tree. Pode ser apagado quando todos os
 * consumidores migrarem para `@/components/analytics/DataExportDialog`.
 */
export { DataExportDialog as CsvExportDialog } from "@/components/analytics/DataExportDialog";
