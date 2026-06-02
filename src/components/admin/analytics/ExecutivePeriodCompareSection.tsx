import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { VolumeCompareView } from "@/components/analytics/VolumeCompareView";
import { useReportsVolumeCompare } from "@/hooks/useReportsVolumeCompare";
import { resolveGlobalCategoryFilter } from "@/lib/globalCategoryFilter";
import { isCompleteDateRange } from "@/lib/dateRangeUtils";

/**
 * HU-5.1 — Comparação temporal A vs B no dashboard executivo.
 */
export function ExecutivePeriodCompareSection() {
  const { region, category, periodCompare, compareActive } = useGlobalFilters();

  const baseFilters = useMemo(() => {
    const slice = resolveGlobalCategoryFilter(category);
    return {
      categories: slice.isAll
        ? undefined
        : [...slice.urbanCategories, ...slice.transportSubcategories],
      regions: region !== "all" ? [region] : undefined,
    };
  }, [region, category]);

  const compare = useReportsVolumeCompare({
    baseFilters: {
      categories: baseFilters.categories,
      regions: baseFilters.regions,
    },
    periodA: isCompleteDateRange(periodCompare.periodA)
      ? { startDate: periodCompare.periodA.from, endDate: periodCompare.periodA.to }
      : undefined,
    periodB: isCompleteDateRange(periodCompare.periodB)
      ? { startDate: periodCompare.periodB.from, endDate: periodCompare.periodB.to }
      : null,
  });

  if (!compareActive) return null;

  return (
    <section
      className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5"
      aria-labelledby="executive-period-compare-heading"
    >
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden />
        <h2 id="executive-period-compare-heading" className="text-sm font-semibold text-foreground">
          Comparação de períodos (A vs B)
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Período A alimenta os KPIs e o gráfico territorial acima; abaixo, o delta entre A e B no
        mesmo recorte de região e categoria.
      </p>
      <VolumeCompareView
        totalsA={{
          total: compare.statsA.total,
          urbano: compare.statsA.urbano,
          transporte: compare.statsA.transporte,
          avaliacao: compare.statsA.avaliacao,
        }}
        totalsB={{
          total: compare.statsB.total,
          urbano: compare.statsB.urbano,
          transporte: compare.statsB.transporte,
          avaliacao: compare.statsB.avaliacao,
        }}
        delta={compare.delta}
        byCategoryCompare={compare.byCategoryCompare}
        isLoading={compare.isLoading}
      />
    </section>
  );
}
