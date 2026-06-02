import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { CouncilMemberQueueBarChart } from "@/components/admin/referrals/CouncilMemberQueueBarChart";
import { ReferralDestinationsTable } from "@/components/admin/referrals/ReferralDestinationsTable";
import {
  ReportsResponsibleFilter,
  type CommissionFilterLabels,
} from "@/components/admin/reports/ReportsResponsibleFilter";
import { ChartCard } from "@/components/admin/charts/ChartShell";
import { SECTION_CHART_LEGENDS } from "@/lib/analyticsParameterLegends";
import { reportsManagementUrlForCouncilMember } from "@/lib/commissionFilterNavigation";
import { useReferralsCouncilorsTab } from "@/hooks/useReferralsCouncilorsTab";

const COUNCILLOR_TAB_FILTER_LABELS: CommissionFilterLabels = {
  triggerAll: "Todos os vereadores",
  triggerOne: "1 vereador",
  triggerMany: (n) => `${n} vereadores`,
  title: "Vereador",
  description: "Filtra encaminhamentos a parlamentares no recorte global. Marque um ou mais.",
  ariaLabel: "Filtrar por vereador",
  clearButton: "Limpar filtro (todos)",
};

function sortCouncilMemberIds(
  ids: string[],
  catalog: { councilMemberId: string; name: string }[],
): string[] {
  return [...ids].sort((a, b) => {
    const nameA = catalog.find((c) => c.councilMemberId === a)?.name ?? a;
    const nameB = catalog.find((c) => c.councilMemberId === b)?.name ?? b;
    return nameA.localeCompare(nameB, "pt-BR");
  });
}

/** Aba Vereadores — filtro local + gráfico e tabela alinhados ao recorte global. */
export function ReferralsCouncilorsTab() {
  const navigate = useNavigate();
  const { period, region, category } = useGlobalFilters();
  const [selectedCouncilMemberIds, setSelectedCouncilMemberIds] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { catalog, destinations, chartData, resultCount, isLoading } =
    useReferralsCouncilorsTab(selectedCouncilMemberIds);

  const filterCatalog = useMemo(
    () =>
      catalog.map((c) => ({
        commissionId: c.councilMemberId,
        name: c.name,
        code: null as string | null,
      })),
    [catalog],
  );

  const toggleCouncilMember = (councilMemberId: string) => {
    setSelectedCouncilMemberIds((prev) => {
      const exists = prev.includes(councilMemberId);
      const next = exists
        ? prev.filter((id) => id !== councilMemberId)
        : [...prev, councilMemberId];
      return sortCouncilMemberIds(next, catalog);
    });
  };

  const openReportsForCouncilMember = (councilMemberId: string) => {
    navigate(
      reportsManagementUrlForCouncilMember(councilMemberId, {
        queueTab: "all",
        global: { period, region, category },
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Encaminhamentos a vereadores no recorte global
          {isLoading
            ? " · carregando…"
            : ` · ${resultCount} registro${resultCount === 1 ? "" : "s"}`}
        </p>
        <ReportsResponsibleFilter
          catalog={filterCatalog}
          selectedIds={selectedCouncilMemberIds}
          onToggle={toggleCouncilMember}
          onClear={() => setSelectedCouncilMemberIds([])}
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          labels={COUNCILLOR_TAB_FILTER_LABELS}
          className="sm:w-[220px]"
        />
      </div>

      <ChartCard
        title="Encaminhamentos por vereador"
        subtitle="Carga ativa no período. Clique na barra para abrir a Gestão de relatos filtrada."
        legend={SECTION_CHART_LEGENDS.councilMemberQueue}
      >
        <CouncilMemberQueueBarChart data={chartData} />
      </ChartCard>

      <ReferralDestinationsTable
        title="Vereadores"
        description="Parlamentares com encaminhamentos no recorte. Clique na linha para ver os relatos."
        destinations={destinations}
        nameColumnLabel="Vereador(a)"
        onDestinationClick={(d) => openReportsForCouncilMember(d.id)}
      />
    </div>
  );
}
