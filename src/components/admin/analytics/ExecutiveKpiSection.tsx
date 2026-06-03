import { ExecutiveKpiRow } from "@/components/admin/analytics/ExecutiveKpiRow";
import { ParameterInfoListTrigger } from "@/components/admin/analytics/ParameterInfoTrigger";
import { EXECUTIVE_KPI_LEGENDS_LIST } from "@/lib/analyticsParameterLegends";

export function ExecutiveKpiSection() {
  return (
    <section className="space-y-3" aria-labelledby="executive-kpi-heading">
      <div className="flex items-center gap-2">
        <h2 id="executive-kpi-heading" className="text-sm font-medium text-foreground">
          Indicadores principais
        </h2>
        <ParameterInfoListTrigger
          items={EXECUTIVE_KPI_LEGENDS_LIST}
          tooltipTitle="KPIs analisados nesta tela"
          ariaLabel="Ver parâmetros dos quatro indicadores principais"
        />
        <p className="sr-only">
          Quatro indicadores oficiais do painel. Passe o mouse no ponto de interrogação ao lado do
          título ou em cada cartão para ver o que significa cada valor. Clique em um cartão para
          trocar a métrica do gráfico.
        </p>
      </div>

      <ExecutiveKpiRow />
    </section>
  );
}
