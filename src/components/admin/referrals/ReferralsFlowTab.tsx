import { useNavigate } from "react-router-dom";
import { ReferralFunnelBarChart } from "@/components/admin/referrals/ReferralFunnelBarChart";
import { ChartCard, ChartHeight } from "@/components/admin/charts/ChartShell";
import { KpiCard } from "@/components/ui/KpiCard";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { useSectionChartData } from "@/hooks/useSectionChartData";
import type { CouncilReferralKpis } from "@/lib/referralsGlobalFilters";
import { REFERRAL_KPI_LEGENDS, SECTION_CHART_LEGENDS } from "@/lib/analyticsParameterLegends";
import {
  reportsManagementUrlForCouncilReferral,
  type CouncilReferralFilter,
} from "@/lib/commissionFilterNavigation";
import { cn } from "@/lib/utils";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle, CHART_COLORS } from "@/components/admin/analytics/chartTheme";

const KPI_ITEMS: {
  key: keyof CouncilReferralKpis;
  label: string;
  filter: CouncilReferralFilter;
  legend: keyof typeof REFERRAL_KPI_LEGENDS;
}[] = [
  { key: "total", label: "Total", filter: "any", legend: "total" },
  { key: "pending", label: "Pendentes", filter: "pending", legend: "pending" },
  { key: "sent", label: "Enviados", filter: "sent", legend: "sent" },
  { key: "resolved", label: "Resolvidos", filter: "resolved", legend: "resolved" },
];

/** Aba Fluxo — KPIs e funil clicáveis para Gestão de relatos. */
export function ReferralsFlowTab({ kpis }: { kpis: CouncilReferralKpis }) {
  const navigate = useNavigate();
  const { period, region, category } = useGlobalFilters();
  const { referralFunnel, referralTimeline } = useSectionChartData();

  const openFiltered = (filter: CouncilReferralFilter) => {
    navigate(
      reportsManagementUrlForCouncilReferral(filter, {
        queueTab: "all",
        global: { period, region, category },
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {KPI_ITEMS.map((item) => (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            className={cn(
              "cursor-pointer rounded-xl text-left transition-shadow",
              "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            onClick={() => openFiltered(item.filter)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFiltered(item.filter);
              }
            }}
          >
            <KpiCard
              label={item.label}
              value={String(kpis[item.key])}
              parameter={REFERRAL_KPI_LEGENDS[item.legend]}
              stopParameterPropagation
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Funil de encaminhamentos"
          subtitle="Do recebimento à resolução. Clique na barra para abrir a Gestão de relatos filtrada."
          legend={SECTION_CHART_LEGENDS.referralFunnel}
        >
          <ReferralFunnelBarChart data={referralFunnel} />
        </ChartCard>

        <ChartCard
          title="Ritmo diário"
          subtitle="Criados vs concluídos no recorte"
          legend={SECTION_CHART_LEGENDS.referralTimeline}
        >
          <ChartHeight>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={referralTimeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="criados"
                  name="Criados"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="concluidos"
                  name="Concluídos"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartHeight>
        </ChartCard>
      </div>
    </div>
  );
}
