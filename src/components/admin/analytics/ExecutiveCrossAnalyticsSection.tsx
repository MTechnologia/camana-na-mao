import { CrossAnalyticsTab } from "@/components/analytics/CrossAnalyticsTab";
import { ParameterLegend } from "@/components/admin/analytics/ParameterLegend";
import { EXECUTIVE_CROSS_ANALYTICS_LEGENDS } from "@/lib/analyticsParameterLegends";

/**
 * HU-3.4 / HU-3.5 — Drill-across no dashboard executivo (/admin).
 * Matriz categoria × demografia (e outras dimensões) com drill na célula.
 */
export function ExecutiveCrossAnalyticsSection() {
  return (
    <section className="mt-8 space-y-4" aria-labelledby="executive-cross-heading">
      <div className="space-y-2">
        <h2 id="executive-cross-heading" className="text-sm font-medium text-foreground">
          Cruzamento analítico (drill-across)
        </h2>
        <p className="text-xs text-muted-foreground">
          Cruze tipo de problema com perfil demográfico ou outras dimensões. Clique em uma célula
          para abrir os relatos daquele cruzamento.
        </p>
        <ParameterLegend items={EXECUTIVE_CROSS_ANALYTICS_LEGENDS} />
      </div>

      <CrossAnalyticsTab urlPrefix="exec" defaultRow="category" defaultCol="gender" />
    </section>
  );
}
