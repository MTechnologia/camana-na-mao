import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsPriorityFilter } from '@/components/admin/reports/ReportsPriorityFilter';
import { ReportsResponsibleFilter } from '@/components/admin/reports/ReportsResponsibleFilter';
import type { TriagePriority } from '@/lib/triage';
import type { LegislativeCommissionOption } from '@/lib/reportCommissionReferrals';
import type { ReportQueueTab } from '@/types/urbanReportManagement';

const TAB_LABELS: { id: ReportQueueTab; label: string; hint: string }[] = [
  { id: 'triage', label: 'Fila de triagem', hint: 'Priorizar relatos recebidos' },
  { id: 'all', label: 'Todos', hint: 'Visão completa' },
  { id: 'referrals', label: 'Encaminhamentos', hint: 'Enviados à comissão ou vereador' },
  { id: 'tracking', label: 'Acompanhamento', hint: 'Status e linha do tempo' },
];

export function ReportsQueueToolbar({
  queueTab,
  onTabChange,
  search,
  onSearchChange,
  resultCount,
  responsibleCatalog,
  selectedResponsibleIds,
  responsiblePopoverOpen,
  onResponsiblePopoverOpenChange,
  onToggleResponsible,
  onClearResponsibleFilter,
  selectedPriorities,
  priorityPopoverOpen,
  onPriorityPopoverOpenChange,
  onTogglePriority,
  onClearPriorityFilter,
  councilReferralFilterLabel,
  councilReferralStats,
}: {
  queueTab: ReportQueueTab;
  onTabChange: (tab: ReportQueueTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  responsibleCatalog: LegislativeCommissionOption[];
  selectedResponsibleIds: string[];
  responsiblePopoverOpen: boolean;
  onResponsiblePopoverOpenChange: (open: boolean) => void;
  onToggleResponsible: (commissionId: string) => void;
  onClearResponsibleFilter: () => void;
  selectedPriorities: TriagePriority[];
  priorityPopoverOpen: boolean;
  onPriorityPopoverOpenChange: (open: boolean) => void;
  onTogglePriority: (priority: TriagePriority) => void;
  onClearPriorityFilter: () => void;
  councilReferralFilterLabel?: string | null;
  councilReferralStats?: {
    referralTotal: number;
    urbanLinked: number;
    nonUrban: number;
  } | null;
}) {
  return (
    <div className="space-y-3">
      <Tabs value={queueTab} onValueChange={(v) => onTabChange(v as ReportQueueTab)}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="inline-flex h-auto w-max flex-nowrap gap-1 p-1">
            {TAB_LABELS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="shrink-0 whitespace-nowrap px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {TAB_LABELS.find((t) => t.id === queueTab)?.hint}
          {councilReferralFilterLabel ? ` · ${councilReferralFilterLabel}` : ''}
          {councilReferralStats
            ? ` · ${councilReferralStats.referralTotal} encaminhamento${
                councilReferralStats.referralTotal === 1 ? '' : 's'
              } (${councilReferralStats.urbanLinked} urbano${
                councilReferralStats.urbanLinked === 1 ? '' : 's'
              }${
                councilReferralStats.nonUrban > 0
                  ? `, ${councilReferralStats.nonUrban} transporte/avaliação fora desta lista`
                  : ''
              })`
            : ''}
          {' · '}
          {resultCount} registro{resultCount === 1 ? '' : 's'} na lista
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ReportsPriorityFilter
            selectedPriorities={selectedPriorities}
            onToggle={onTogglePriority}
            onClear={onClearPriorityFilter}
            open={priorityPopoverOpen}
            onOpenChange={onPriorityPopoverOpenChange}
          />
          <ReportsResponsibleFilter
            catalog={responsibleCatalog}
            selectedIds={selectedResponsibleIds}
            onToggle={onToggleResponsible}
            onClear={onClearResponsibleFilter}
            open={responsiblePopoverOpen}
            onOpenChange={onResponsiblePopoverOpenChange}
          />
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar protocolo, título ou responsável…"
              className="pl-9"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar relatos"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
