import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type PublicHearingsListTab = 'top' | 'zero' | 'low';

const TAB_LABELS: { id: PublicHearingsListTab; label: string; hint: string }[] = [
  { id: 'top', label: 'Principais', hint: 'Maior engajamento no recorte' },
  { id: 'zero', label: 'Sem inscritos', hint: 'Próximas sem participação' },
  { id: 'low', label: 'Baixa ocupação', hint: 'Vagas disponíveis com pouca adesão' },
];

type PublicHearingsQueueToolbarProps = {
  listTab: PublicHearingsListTab;
  onListTabChange: (tab: PublicHearingsListTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  loading?: boolean;
  onRefresh: () => void;
};

export function PublicHearingsQueueToolbar({
  listTab,
  onListTabChange,
  search,
  onSearchChange,
  resultCount,
  loading,
  onRefresh,
}: PublicHearingsQueueToolbarProps) {
  const hint = TAB_LABELS.find((t) => t.id === listTab)?.hint ?? '';

  return (
    <div className="space-y-3 border-b border-border/80 pb-4">
      <Tabs value={listTab} onValueChange={(v) => onListTabChange(v as PublicHearingsListTab)}>
        <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0">
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
          {hint} · {resultCount} audiência{resultCount === 1 ? '' : 's'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar título, comissão ou zona…"
              className="h-9 bg-background pl-9"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar audiências"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
