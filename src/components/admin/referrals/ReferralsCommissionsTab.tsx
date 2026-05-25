import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { ReferralDestinationsTable } from '@/components/admin/referrals/ReferralDestinationsTable';
import { CommissionQueueBarChart } from '@/components/admin/referrals/CommissionQueueBarChart';
import {
  COMMISSION_TAB_FILTER_LABELS,
  ReportsResponsibleFilter,
} from '@/components/admin/reports/ReportsResponsibleFilter';
import { ChartCard } from '@/components/admin/charts/ChartShell';
import { SECTION_CHART_LEGENDS } from '@/lib/analyticsParameterLegends';
import { reportsManagementUrlForCommission } from '@/lib/commissionFilterNavigation';
import { useReferralsCommissionsTab } from '@/hooks/useReferralsCommissionsTab';

function sortCommissionIds(
  ids: string[],
  catalog: { commissionId: string; name: string }[],
): string[] {
  return [...ids].sort((a, b) => {
    const nameA = catalog.find((c) => c.commissionId === a)?.name ?? a;
    const nameB = catalog.find((c) => c.commissionId === b)?.name ?? b;
    return nameA.localeCompare(nameB, 'pt-BR');
  });
}

/** Aba Comissões — filtro local + gráfico e tabela alinhados ao recorte global. */
export function ReferralsCommissionsTab() {
  const navigate = useNavigate();
  const { period, region, category } = useGlobalFilters();
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { catalog, destinations, chartData, resultCount, isLoading } =
    useReferralsCommissionsTab(selectedCommissionIds);

  const filterCatalog = useMemo(
    () =>
      catalog.map((c) => ({
        commissionId: c.commissionId,
        name: c.name,
        code: c.code,
      })),
    [catalog],
  );

  const toggleCommission = (commissionId: string) => {
    setSelectedCommissionIds((prev) => {
      const exists = prev.includes(commissionId);
      const next = exists
        ? prev.filter((id) => id !== commissionId)
        : [...prev, commissionId];
      return sortCommissionIds(next, catalog);
    });
  };

  const openReportsForCommission = (commissionId: string) => {
    navigate(
      reportsManagementUrlForCommission(commissionId, {
        queueTab: 'all',
        global: { period, region, category },
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Encaminhamentos temáticos no recorte global
          {isLoading ? ' · carregando…' : ` · ${resultCount} registro${resultCount === 1 ? '' : 's'}`}
        </p>
        <ReportsResponsibleFilter
          catalog={filterCatalog}
          selectedIds={selectedCommissionIds}
          onToggle={toggleCommission}
          onClear={() => setSelectedCommissionIds([])}
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          labels={COMMISSION_TAB_FILTER_LABELS}
          className="sm:w-[220px]"
        />
      </div>

      <ChartCard
        title="Fila por comissão temática"
        subtitle="Encaminhamentos pendentes ou em análise no período. Clique na barra para abrir a Gestão de relatos filtrada."
        legend={SECTION_CHART_LEGENDS.commissionByTheme}
      >
        <CommissionQueueBarChart data={chartData} />
      </ChartCard>

      <ReferralDestinationsTable
        title="Comissões temáticas"
        description="Destinos institucionais para encaminhamento após triagem do relato. Clique na linha para ver relatos da comissão."
        destinations={destinations}
        nameColumnLabel="Comissão"
        onDestinationClick={(d) => openReportsForCommission(d.id)}
      />
    </div>
  );
}
