import type { AnalyticsMetric, DrillKpis } from "@/types/analyticsDrill";

const REGION_LABELS: Record<string, string> = {
  central: "Centro",
  north: "Zona Norte",
  south: "Zona Sul",
  east: "Zona Leste",
  west: "Zona Oeste",
  unknown: "Não informada",
  nao_informada: "Não informada",
  Centro: "Centro",
  "Zona Norte": "Zona Norte",
  "Zona Sul": "Zona Sul",
  "Zona Leste": "Zona Leste",
  "Zona Oeste": "Zona Oeste",
  "Não informada": "Não informada",
};

export function metricLabel(metric: AnalyticsMetric): string {
  const map: Record<AnalyticsMetric, string> = {
    volume: "Volume de relatos",
    response_time: "Tempo médio de resposta",
    sentiment: "Sentimento agregado",
    patterns: "Padrões recorrentes",
  };
  return map[metric];
}

export function formatKpiValue(metric: AnalyticsMetric, kpis: DrillKpis): string {
  switch (metric) {
    case "volume":
      return kpis.volume.toLocaleString("pt-BR");
    case "response_time":
      return kpis.responseHours > 0 ? `${kpis.responseHours.toFixed(1)} h` : "—";
    case "sentiment":
      return kpis.sentimentPct != null ? `${kpis.sentimentPct}%` : "—";
    case "patterns":
      return String(kpis.patterns);
  }
}

export function regionLabel(id: string): string {
  return REGION_LABELS[id] ?? id;
}

export function zoneToFilterId(zoneLabel: string): string {
  if (zoneLabel === "Não informada") return "unknown";
  const entry = Object.entries(REGION_LABELS).find(([, label]) => label === zoneLabel);
  return entry?.[0] ?? zoneLabel.toLowerCase().replace(/\s+/g, "_");
}
