import { useMemo, useState } from "react";
import { Calendar, Filter, MapPin, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterDatePicker } from "@/components/filters/FilterDatePicker";
import { cn } from "@/lib/utils";
import { ZONAS_FILTRO, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";
import {
  EMPTY_VOLUME_FILTERS,
  type VolumeFiltersValue,
} from "@/components/analytics/volumeFiltersConstants";

/**
 * Filtros do dashboard de Volume de Relatos (HU-1.1).
 *
 * Composição:
 *   - Período: presets rápidos + range customizado (FilterDatePicker existente).
 *   - Categorias: multiseleção com busca, populada a partir dos dados reais.
 *   - Bairros: multiseleção com busca, populada a partir dos dados reais.
 *   - Zonas: multiseleção fixa (Norte, Sul, Leste, Oeste, Centro, Não informada).
 */

interface VolumeFiltersProps {
  value: VolumeFiltersValue;
  onChange: (next: VolumeFiltersValue) => void;
  availableCategories: string[];
  availableRegions: string[];
  loading?: boolean;
  className?: string;
}

export function VolumeFilters({
  value,
  onChange,
  availableCategories,
  availableRegions,
  loading,
  className,
}: VolumeFiltersProps) {
  const activeCount = useMemo(() => {
    let count = 0;
    if (value.period?.from || value.period?.to) count += 1;
    count += value.categories.length;
    count += value.regions.length;
    count += value.zones.length;
    return count;
  }, [value]);

  const handleClearAll = () => onChange(EMPTY_VOLUME_FILTERS);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3",
        className,
      )}
      role="region"
      aria-label="Filtros de volume de relatos"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span>Filtros de volume</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={loading}
            className="text-xs h-8"
          >
            <X className="h-3 w-3 mr-1" aria-hidden="true" />
            Limpar tudo
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Período</span>
        </div>
        <FilterDatePicker
          value={value.period}
          onChange={(period) => onChange({ ...value, period })}
          placeholder="Todos os períodos"
        />

        <MultiSelectPopover
          icon={<Tag className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Categorias"
          options={availableCategories}
          selected={value.categories}
          onChange={(categories) => onChange({ ...value, categories })}
          searchPlaceholder="Buscar categoria..."
          disabled={loading || availableCategories.length === 0}
        />

        <MultiSelectPopover
          icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Bairros"
          options={availableRegions}
          selected={value.regions}
          onChange={(regions) => onChange({ ...value, regions })}
          searchPlaceholder="Buscar bairro..."
          disabled={loading || availableRegions.length === 0}
        />

        <MultiSelectPopover
          icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Zonas"
          options={ZONAS_FILTRO as unknown as readonly string[]}
          selected={value.zones}
          onChange={(zones) =>
            onChange({ ...value, zones: zones as ZonaVolumeOuDesconhecida[] })
          }
          searchPlaceholder="Buscar zona..."
          disabled={loading}
        />
      </div>
    </div>
  );
}

interface MultiSelectPopoverProps {
  icon: React.ReactNode;
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
}

function MultiSelectPopover({
  icon,
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  disabled,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);

  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return label;
    if (selected.length === 1) return `${label}: ${selected[0]}`;
    return `${label} (${selected.length})`;
  }, [label, selected]);

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clear = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-9 gap-2 text-xs font-normal",
            selected.length > 0 && "border-primary text-foreground",
          )}
          aria-label={`Filtrar por ${label.toLowerCase()}`}
        >
          {icon}
          <span className="truncate max-w-[160px]">{triggerLabel}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggle(option)}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mr-2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <div className="border-t border-border p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="w-full justify-center text-xs h-7"
                >
                  Limpar seleção
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
