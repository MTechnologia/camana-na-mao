import { useMemo } from "react";
import {
  useReportsVolume,
  type ReportsVolumeFilters,
  type ReportsVolumeStats,
  type VolumeByCategory,
} from "@/hooks/useReportsVolume";

/**
 * HU-5.1 — Wrap do useReportsVolume que carrega dois períodos paralelos
 * e calcula deltas para comparação A vs B.
 *
 * Os dois hooks chamados em paralelo compartilham todos os filtros não-temporais
 * (categories, regions, zones, types) — só os startDate/endDate diferem.
 */

export interface VolumeCompareDelta {
  /** Delta absoluto (B - A) e relativo (% de A). */
  total: { absolute: number; percent: number };
  urbano: { absolute: number; percent: number };
  transporte: { absolute: number; percent: number };
  avaliacao: { absolute: number; percent: number };
}

export interface VolumeCompareCategoryRow {
  category: string;
  countA: number;
  countB: number;
  deltaPercent: number;
}

export interface UseReportsVolumeCompareResult {
  /** Stats do período A. */
  statsA: ReportsVolumeStats;
  /** Stats do período B. */
  statsB: ReportsVolumeStats;
  /** Diferenças entre B e A nos KPIs principais. */
  delta: VolumeCompareDelta;
  /** Top categorias com volume nos dois períodos + delta %. */
  byCategoryCompare: VolumeCompareCategoryRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Calcula delta absoluto + percentual. Exportado para teste. */
export function computeDelta(a: number, b: number): { absolute: number; percent: number } {
  const absolute = b - a;
  if (a === 0) {
    return { absolute, percent: b === 0 ? 0 : 100 };
  }
  return { absolute, percent: Math.round((absolute / a) * 100) };
}

/** Combina topCategories de 2 períodos em linhas comparativas. Exportado para teste. */
export function buildCategoryCompare(
  byCategoryA: VolumeByCategory[],
  byCategoryB: VolumeByCategory[],
  limit = 10,
): VolumeCompareCategoryRow[] {
  const mapA = new Map(byCategoryA.map((c) => [c.category, c.count]));
  const mapB = new Map(byCategoryB.map((c) => [c.category, c.count]));
  const allCategories = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const rows: VolumeCompareCategoryRow[] = [];
  allCategories.forEach((category) => {
    const countA = mapA.get(category) ?? 0;
    const countB = mapB.get(category) ?? 0;
    if (countA === 0 && countB === 0) return;
    const { percent } = computeDelta(countA, countB);
    rows.push({ category, countA, countB, deltaPercent: percent });
  });
  // Ordena por soma A+B descendente (top categorias absolutas)
  rows.sort((a, b) => b.countA + b.countB - (a.countA + a.countB));
  return rows.slice(0, limit);
}

export function useReportsVolumeCompare(params: {
  baseFilters: Omit<ReportsVolumeFilters, "startDate" | "endDate">;
  periodA: { startDate?: Date; endDate?: Date } | undefined;
  periodB: { startDate?: Date; endDate?: Date } | null;
}): UseReportsVolumeCompareResult {
  const filtersA: ReportsVolumeFilters = useMemo(
    () => ({
      ...params.baseFilters,
      startDate: params.periodA?.startDate ?? null,
      endDate: params.periodA?.endDate ?? null,
    }),
    [params.baseFilters, params.periodA],
  );
  const filtersB: ReportsVolumeFilters = useMemo(
    () => ({
      ...params.baseFilters,
      startDate: params.periodB?.startDate ?? null,
      endDate: params.periodB?.endDate ?? null,
    }),
    [params.baseFilters, params.periodB],
  );

  const a = useReportsVolume(filtersA);
  const b = useReportsVolume(params.periodB ? filtersB : filtersA);

  const delta = useMemo<VolumeCompareDelta>(
    () => ({
      total: computeDelta(a.stats.total, b.stats.total),
      urbano: computeDelta(a.stats.urbano, b.stats.urbano),
      transporte: computeDelta(a.stats.transporte, b.stats.transporte),
      avaliacao: computeDelta(a.stats.avaliacao, b.stats.avaliacao),
    }),
    [a.stats, b.stats],
  );

  const byCategoryCompare = useMemo(
    () => buildCategoryCompare(a.stats.byCategory, b.stats.byCategory),
    [a.stats.byCategory, b.stats.byCategory],
  );

  return {
    statsA: a.stats,
    statsB: b.stats,
    delta,
    byCategoryCompare,
    isLoading: a.isLoading || b.isLoading,
    error: a.error ?? b.error,
    refresh: async () => {
      await Promise.all([a.refresh(), b.refresh()]);
    },
  };
}

export const __test__ = { computeDelta, buildCategoryCompare };
