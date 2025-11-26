import { useState } from 'react';
import { Calendar, MapPin, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  activeFilters: any;
}

export const FilterBar = ({ onFilterChange, activeFilters }: FilterBarProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = Object.keys(activeFilters).filter(
    key => activeFilters[key] !== null && activeFilters[key] !== undefined
  ).length;

  const clearAllFilters = () => {
    onFilterChange({});
    setDateRange(undefined);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                    {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                )
              ) : (
                'Período'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                onFilterChange({ ...activeFilters, dateRange: range });
              }}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* Region Filter */}
        <Button variant="outline" size="sm" className="gap-2">
          <MapPin className="w-4 h-4" />
          Região
        </Button>

        {/* Advanced Filters */}
        <Button
          variant={showAdvanced ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="w-4 h-4" />
          Filtros avançados
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-2 text-muted-foreground"
          >
            <X className="w-4 h-4" />
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option>Todas</option>
                <option>Saúde</option>
                <option>Educação</option>
                <option>Transporte</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option>Todos</option>
                <option>Pendente</option>
                <option>Em análise</option>
                <option>Resolvido</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Criticidade</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option>Todas</option>
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
