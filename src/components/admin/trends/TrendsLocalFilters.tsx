import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReportsTrendPeriod, ReportsTrendTypeFilter } from '@/hooks/useReportsTrend';
import { cn } from '@/lib/utils';

type TrendLineOption = {
  id: string;
  line_code: string;
  line_name: string;
};

type TrendsLocalFiltersProps = {
  typeFilter: ReportsTrendTypeFilter;
  onTypeFilterChange: (value: ReportsTrendTypeFilter) => void;
  lineId: string | null;
  onLineIdChange: (value: string | null) => void;
  period: ReportsTrendPeriod;
  onPeriodChange: (value: ReportsTrendPeriod) => void;
  lines: TrendLineOption[];
  linesLoading: boolean;
  className?: string;
};

export function TrendsLocalFilters({
  typeFilter,
  onTypeFilterChange,
  lineId,
  onLineIdChange,
  period,
  onPeriodChange,
  lines,
  linesLoading,
  className,
}: TrendsLocalFiltersProps) {
  const lineFilterVisible = typeFilter === 'all' || typeFilter === 'transport';

  return (
    <section
      aria-label="Filtros da série temporal"
      className={cn(
        'rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm md:p-4',
        className,
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="trend-type" className="text-xs font-medium text-muted-foreground">
            Tipo
          </Label>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              const next = v as ReportsTrendTypeFilter;
              onTypeFilterChange(next);
              if (next !== 'all' && next !== 'transport') onLineIdChange(null);
            }}
          >
            <SelectTrigger id="trend-type" className="h-9 bg-background">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="urban">Relatos urbanos</SelectItem>
              <SelectItem value="transport">Relatos de transporte</SelectItem>
              <SelectItem value="evaluation">Avaliações de serviços</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trend-line" className="text-xs font-medium text-muted-foreground">
            Linha (transporte)
          </Label>
          <Select
            value={lineId ?? '__all__'}
            onValueChange={(v) => onLineIdChange(v === '__all__' ? null : v)}
            disabled={!lineFilterVisible || linesLoading}
          >
            <SelectTrigger id="trend-line" className="h-9 bg-background">
              <SelectValue placeholder={linesLoading ? 'Carregando…' : 'Todas as linhas'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as linhas</SelectItem>
              {lines.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.line_code} — {l.line_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!lineFilterVisible ? (
            <p className="text-[11px] text-muted-foreground">Aplica-se a relatos de transporte.</p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="trend-period" className="text-xs font-medium text-muted-foreground">
            Período
          </Label>
          <Select value={period} onValueChange={(v) => onPeriodChange(v as ReportsTrendPeriod)}>
            <SelectTrigger id="trend-period" className="h-9 bg-background">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
