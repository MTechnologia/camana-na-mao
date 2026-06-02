import type { DateRangeValue } from "@/components/filters/types";
import { PERIOD_COMPARE_VALUE } from "@/lib/globalFilterOptions";
import { isCompleteDateRange } from "@/lib/dateRangeUtils";

export type GlobalPeriodKey =
  | "last_7d"
  | "last_30d"
  | "last_90d"
  | "ytd"
  | typeof PERIOD_COMPARE_VALUE;

export type DateRangeBounds = {
  from: Date;
  to: Date;
};

/** Converte chave do filtro global em intervalo de datas (alinhado a globalFiltersToReportsAnalytics). */
export function globalPeriodKeyToDateRange(
  period: string,
  now: Date = new Date(),
): DateRangeBounds {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  switch (period) {
    case "last_7d":
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case "last_90d":
      start = new Date(now.getTime() - 90 * 86400000);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "last_30d":
    case PERIOD_COMPARE_VALUE:
    default:
      start = new Date(now.getTime() - 30 * 86400000);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return { from: start, to: end };
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateRangeToIsoDates(range: DateRangeBounds): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: toLocalDateString(range.from),
    endDate: toLocalDateString(range.to),
  };
}

/** Atalhos de período usados por tendências, mapas de calor e RPCs legadas (`7d`, `30d`, …). */
export type AnalyticsShortcutPeriod = "7d" | "30d" | "90d" | "12m";

export function globalPeriodToShortcutPeriod(
  period: string,
  periodCompare?: { periodA?: DateRangeValue } | null,
): AnalyticsShortcutPeriod {
  if (period === PERIOD_COMPARE_VALUE && isCompleteDateRange(periodCompare?.periodA)) {
    return "30d";
  }
  switch (period) {
    case "last_7d":
      return "7d";
    case "last_30d":
      return "30d";
    case "last_90d":
      return "90d";
    case "ytd":
      return "12m";
    default:
      return "30d";
  }
}

/** Períodos dos painéis de calor que não oferecem atalho de 7 dias. */
export type HeatmapExtendedPeriod = "30d" | "90d" | "12m";

export function globalPeriodToHeatmapExtendedPeriod(
  period: string,
  periodCompare?: { periodA?: DateRangeValue } | null,
): HeatmapExtendedPeriod {
  const shortcut = globalPeriodToShortcutPeriod(period, periodCompare);
  if (shortcut === "90d") return "90d";
  if (shortcut === "12m") return "12m";
  return "30d";
}
