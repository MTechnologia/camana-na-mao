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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterDatePicker } from "@/components/filters/FilterDatePicker";
import { FilterHint } from "@/components/analytics/FilterHint";
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
  /** Título exibido no cabeçalho do bloco de filtros (default "Filtros de volume"). */
  title?: string;
  /** Rótulo da MultiSelect de categorias (default "Categorias"). */
  categoryLabel?: string;
  /** Placeholder do campo de busca dentro da MultiSelect de categorias. */
  categorySearchPlaceholder?: string;
  /** aria-label do contêiner (default "Filtros de volume de relatos"). */
  ariaLabel?: string;
  /** Quando false, oculta a MultiSelect de Bairros (default true). */
  showRegions?: boolean;
  /** Quando false, oculta a MultiSelect de Zonas (default true). */
  showZones?: boolean;
  /** HU-14 — Quando false, oculta a MultiSelect de Categorias (default true).
   *  Audiências, por exemplo, não usa categorias. */
  showCategory?: boolean;
  /** HU-14 polish — Quando false, omite o cabeçalho próprio. Útil quando
   *  o wrapper (AnalyticsFiltersBar) já renderiza um cabeçalho hierárquico. */
  showHeader?: boolean;
  /** HU-14 polish — Tooltip da label "Período". */
  periodHint?: string;
  /** HU-14 polish — Tooltip da label de Categorias. */
  categoryHint?: string;
  /** HU-14 polish — Tooltip da label "Bairros". */
  regionHint?: string;
  /** HU-14 polish — Tooltip da label "Zonas". */
  zoneHint?: string;
}

const DEFAULT_PERIOD_HINT =
  "Filtra pela data de criação do relato. Ex: 'últimos 30 dias' mostra apenas relatos abertos nesse intervalo.";
const DEFAULT_CATEGORY_HINT =
  "Tipo de problema reportado (iluminação, buracos, lixo etc). Multi-seleção: marque vários para ver o conjunto.";
const DEFAULT_REGION_HINT =
  "Bairro do relato. Usa o bairro informado pelo usuário ou inferido pelo CEP/coordenada quando disponível.";
const DEFAULT_ZONE_HINT =
  "Zona administrativa de SP (Norte, Sul, Leste, Oeste, Centro). Calculada a partir do bairro do relato.";

export function VolumeFilters({
  value,
  onChange,
  availableCategories,
  availableRegions,
  loading,
  className,
  title = "Filtros de volume",
  categoryLabel = "Categorias",
  categorySearchPlaceholder = "Buscar categoria...",
  ariaLabel = "Filtros de volume de relatos",
  showRegions = true,
  showZones = true,
  showCategory = true,
  showHeader = true,
  periodHint = DEFAULT_PERIOD_HINT,
  categoryHint = DEFAULT_CATEGORY_HINT,
  regionHint = DEFAULT_REGION_HINT,
  zoneHint = DEFAULT_ZONE_HINT,
}: VolumeFiltersProps) {
  const activeCount = useMemo(() => {
    let count = 0;
    if (value.period?.from || value.period?.to) count += 1;
    if (showCategory) count += value.categories.length;
    if (showRegions) count += value.regions.length;
    if (showZones) count += value.zones.length;
    return count;
  }, [value, showCategory, showRegions, showZones]);

  const handleClearAll = () => onChange(EMPTY_VOLUME_FILTERS);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3",
        // HU-14 polish — quando vem dentro do AnalyticsFiltersBar (showHeader=false),
        // sem borda própria pra não duplicar o card externo.
        !showHeader && "border-none p-0 rounded-none",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span>{title}</span>
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
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Período</span>
          <FilterHint text={periodHint} />
        </div>
        <FilterDatePicker
          value={value.period}
          onChange={(period) => onChange({ ...value, period })}
          placeholder="Todos os períodos"
        />

        {/* HU-5.2 — não passar `loading` para `disabled` das MultiSelects:
            cada clique re-dispara fetch (isLoading=true) e desabilitar o trigger
            no meio da interação fecha o popover, quebrando a multisseleção. */}
        {showCategory && (
          <MultiSelectPopover
            icon={<Tag className="h-3.5 w-3.5" aria-hidden="true" />}
            label={categoryLabel}
            hintText={categoryHint}
            options={availableCategories}
            selected={value.categories}
            onChange={(categories) => onChange({ ...value, categories })}
            searchPlaceholder={categorySearchPlaceholder}
            disabled={availableCategories.length === 0}
          />
        )}

        {showRegions && (
          <MultiSelectPopover
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Bairros"
            hintText={regionHint}
            options={availableRegions}
            selected={value.regions}
            onChange={(regions) => onChange({ ...value, regions })}
            searchPlaceholder="Buscar bairro..."
            disabled={availableRegions.length === 0}
          />
        )}

        {showZones && (
          <MultiSelectPopover
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Zonas"
            hintText={zoneHint}
            options={ZONAS_FILTRO as unknown as readonly string[]}
            selected={value.zones}
            onChange={(zones) => onChange({ ...value, zones: zones as ZonaVolumeOuDesconhecida[] })}
            searchPlaceholder="Buscar zona..."
          />
        )}

        {/* Botão "Limpar tudo" inline quando o header está oculto. */}
        {!showHeader && activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={loading}
            className="text-xs h-7 ml-auto"
          >
            <X className="h-3 w-3 mr-1" aria-hidden="true" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

interface MultiSelectPopoverProps {
  icon: React.ReactNode;
  label: string;
  /** Texto do tooltip exibido ao lado do label. */
  hintText?: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
}

function MultiSelectPopover({
  icon,
  label,
  hintText,
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
    <div className="flex items-center gap-1">
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
      {hintText && <FilterHint text={hintText} />}
    </div>
  );
}
