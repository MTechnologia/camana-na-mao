import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LegislativeCommissionOption } from '@/lib/reportCommissionReferrals';
import { cn } from '@/lib/utils';

export type CommissionFilterLabels = {
  triggerAll: string;
  triggerOne: string;
  triggerMany: (count: number) => string;
  title: string;
  description: string;
  ariaLabel: string;
  clearButton: string;
};

export const RESPONSIBLE_COMMISSION_LABELS: CommissionFilterLabels = {
  triggerAll: 'Todos os responsáveis',
  triggerOne: '1 responsável',
  triggerMany: (n) => `${n} responsáveis`,
  title: 'Responsável',
  description: 'Comissões temáticas com encaminhamento ao relato. Marque uma ou mais.',
  ariaLabel: 'Filtrar por responsável (comissão temática)',
  clearButton: 'Limpar filtro (todos)',
};

export const COMMISSION_TAB_FILTER_LABELS: CommissionFilterLabels = {
  triggerAll: 'Todas as comissões',
  triggerOne: '1 comissão',
  triggerMany: (n) => `${n} comissões`,
  title: 'Comissão temática',
  description: 'Filtra encaminhamentos temáticos no recorte global. Marque uma ou mais.',
  ariaLabel: 'Filtrar por comissão temática',
  clearButton: 'Limpar filtro (todas)',
};

type Props = {
  catalog: LegislativeCommissionOption[];
  selectedIds: string[];
  onToggle: (commissionId: string) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  labels?: CommissionFilterLabels;
};

export function ReportsResponsibleFilter({
  catalog,
  selectedIds,
  onToggle,
  onClear,
  open,
  onOpenChange,
  className,
  labels = RESPONSIBLE_COMMISSION_LABELS,
}: Props) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const triggerLabel = useMemo(() => {
    if (selectedIds.length === 0) return labels.triggerAll;
    if (selectedIds.length === 1) {
      const entry = catalog.find((e) => e.commissionId === selectedIds[0]);
      return entry?.name ?? labels.triggerOne;
    }
    return labels.triggerMany(selectedIds.length);
  }, [selectedIds, catalog, labels]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 w-full justify-between gap-1 font-normal sm:w-[200px]',
            selectedIds.length > 0 && 'border-primary/60',
            className,
          )}
          aria-label={labels.ariaLabel}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-medium text-foreground">{labels.title}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">{labels.description}</p>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
          {catalog.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              Nenhuma comissão cadastrada.
            </p>
          ) : (
            catalog.map((c) => {
              const checked = selectedSet.has(c.commissionId);
              return (
                <label
                  key={c.commissionId}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      if (v === 'indeterminate') return;
                      if (Boolean(v) !== checked) onToggle(c.commissionId);
                    }}
                    aria-labelledby={`responsible-opt-${c.commissionId}`}
                  />
                  <span id={`responsible-opt-${c.commissionId}`} className="truncate">
                    {c.name}
                    {c.code ? (
                      <span className="text-muted-foreground"> ({c.code})</span>
                    ) : null}
                  </span>
                </label>
              );
            })
          )}
        </div>
        {selectedIds.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-xs"
              onClick={() => {
                onClear();
                onOpenChange(false);
              }}
            >
              {labels.clearButton}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
