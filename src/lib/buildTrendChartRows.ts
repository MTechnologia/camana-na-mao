import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TrendPoint = { bucket: string; category: string; count: number };

export type TrendChartRow = Record<string, string | number>;

const DEFAULT_MAX_SERIES = 12;

export function formatTrendBucketLabel(bucket: string, granularity: string): string {
  try {
    const d = parseISO(bucket);
    if (Number.isNaN(d.getTime())) return bucket;
    if (granularity === "month") return format(d, "MMM yyyy", { locale: ptBR });
    return format(d, "dd/MM", { locale: ptBR });
  } catch {
    return bucket;
  }
}

export function buildTrendChartRows(
  points: TrendPoint[],
  granularity: string,
  maxSeries: number = DEFAULT_MAX_SERIES,
): { rows: TrendChartRow[]; categoryKeys: string[] } {
  if (!points.length) {
    return { rows: [], categoryKeys: [] };
  }

  const totals = new Map<string, number>();
  for (const p of points) {
    totals.set(p.category, (totals.get(p.category) ?? 0) + p.count);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, maxSeries).map(([c]) => c);
  const topSet = new Set(top);

  const normalized: TrendPoint[] = points.map((p) => ({
    ...p,
    category: topSet.has(p.category) ? p.category : "Outros",
  }));

  const buckets = [...new Set(normalized.map((p) => p.bucket))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const categoryKeys = [...new Set(normalized.map((p) => p.category))].sort((a, b) => {
    if (a === "Outros") return 1;
    if (b === "Outros") return -1;
    return (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
  });

  const rows: TrendChartRow[] = buckets.map((bucket) => {
    const row: TrendChartRow = {
      bucket,
      bucketLabel: formatTrendBucketLabel(bucket, granularity),
    };
    for (const ck of categoryKeys) {
      row[ck] = 0;
    }
    for (const p of normalized) {
      if (p.bucket !== bucket) continue;
      const k = p.category;
      row[k] = (row[k] as number) + p.count;
    }
    return row;
  });

  return { rows, categoryKeys };
}
