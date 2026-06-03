/** Rótulos PT-BR para valores de `export_logs.export_type` e datasets. */
const EXPORT_TYPE_LABELS: Record<string, string> = {
  all: "Todos os dados",
  all_manifests: "Todas as manifestações",
  urban_reports: "Relatos urbanos",
  transport_reports: "Relatos de transporte",
  urban: "Relatos urbanos",
  transport: "Relatos de transporte",
  service_ratings: "Avaliações de equipamentos",
  manifests: "Manifestações",
};

export function getExportTypeLabel(exportType: string): string {
  const key = exportType.trim().toLowerCase();
  if (EXPORT_TYPE_LABELS[key]) return EXPORT_TYPE_LABELS[key];
  return exportType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
