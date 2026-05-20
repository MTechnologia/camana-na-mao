import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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
}: {
  queueTab: ReportQueueTab;
  onTabChange: (tab: ReportQueueTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
}) {
  return (
    <div className="space-y-3 border-b border-border/80 pb-4">
      <Tabs value={queueTab} onValueChange={(v) => onTabChange(v as ReportQueueTab)}>
        <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 lg:grid-cols-4">
            {TAB_LABELS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  'h-9 rounded-md text-xs font-medium sm:text-sm',
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>
      </Tabs>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {TAB_LABELS.find((t) => t.id === queueTab)?.hint} · {resultCount} registro
          {resultCount === 1 ? '' : 's'}
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar protocolo, título ou tema…"
            className="h-9 bg-background pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar relatos"
          />
        </div>
      </div>
    </div>
  );
}
