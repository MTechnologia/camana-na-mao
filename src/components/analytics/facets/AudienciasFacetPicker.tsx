import { useEffect, useState } from "react";
import { Building2, CheckSquare } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, X } from "lucide-react";
import { FilterHint } from "@/components/analytics/FilterHint";
import { cn } from "@/lib/utils";
import {
  AUDIENCIA_STATUS_LABELS,
  EMPTY_AUDIENCIAS_FACET,
  type AudienciaStatus,
  type AudienciasFacet,
} from "@/lib/analyticsFilters";

const HINT_COMISSOES =
  "Comissões legislativas que pautaram a audiência (ex: Saúde, Educação, Trânsito). Multi-seleção: selecione várias para ver o conjunto.";
const HINT_STATUS =
  "Estado atual da audiência: Agendada (futura), Realizada (já aconteceu), Cancelada ou Adiada. Multi-seleção.";

/**
 * HU-14.5 — Picker do facet de Audiências.
 *
 *   - Comissões: multi-seleção com busca (popula da lista vinda da prop)
 *   - Status: multi-toggle (agendada, realizada, cancelada, adiada)
 */

interface AudienciasFacetPickerProps {
  value: AudienciasFacet;
  onChange: (next: AudienciasFacet) => void;
  /** Lista de comissões disponíveis (vinda dos dados carregados). */
  availableComissoes?: string[];
  disabled?: boolean;
}

const STATUSES: AudienciaStatus[] = ["agendada", "realizada", "cancelada", "adiada"];

export function AudienciasFacetPicker({
  value,
  onChange,
  availableComissoes = [],
  disabled,
}: AudienciasFacetPickerProps) {
  const selectedStatuses = new Set(value.statuses ?? []);
  const selectedComissoes = new Set(value.comissoes ?? []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Reset busca quando fecha
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const toggleStatus = (s: AudienciaStatus) => {
    const next = new Set(selectedStatuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({
      ...value,
      statuses: Array.from(next) as AudienciaStatus[],
    });
  };

  const toggleComissao = (c: string) => {
    const next = new Set(selectedComissoes);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({
      ...value,
      comissoes: Array.from(next),
    });
  };

  const clearComissoes = () => onChange({ ...value, comissoes: [] });

  return (
    <div className="space-y-3">
      {/* Comissões — multi-select com busca */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
          <Building2 className="h-3 w-3" />
          Comissões
          <FilterHint text={HINT_COMISSOES} />
        </Label>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className="h-8 text-xs justify-between gap-2 flex-1"
              >
                <span className="truncate">
                  {selectedComissoes.size === 0
                    ? "Todas as comissões"
                    : selectedComissoes.size === 1
                      ? Array.from(selectedComissoes)[0]
                      : `${selectedComissoes.size} comissões`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[300px] p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar comissão..."
                  value={query}
                  onValueChange={setQuery}
                />
                <CommandList>
                  <CommandEmpty>Nenhuma comissão encontrada.</CommandEmpty>
                  <CommandGroup>
                    {availableComissoes
                      .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
                      .map((c) => {
                        const selected = selectedComissoes.has(c);
                        return (
                          <CommandItem
                            key={c}
                            onSelect={() => toggleComissao(c)}
                            className="text-xs"
                          >
                            <Checkbox
                              checked={selected}
                              className="mr-2"
                              onCheckedChange={() => toggleComissao(c)}
                            />
                            {c}
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedComissoes.size > 0 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={clearComissoes}
              disabled={disabled}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {selectedComissoes.size > 0 && selectedComissoes.size <= 4 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(selectedComissoes).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
          <CheckSquare className="h-3 w-3" />
          Status da audiência
          <FilterHint text={HINT_STATUS} />
        </Label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const active = selectedStatuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                disabled={disabled}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card hover:bg-muted text-muted-foreground border-border",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {AUDIENCIA_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function resetAudienciasFacet(): AudienciasFacet {
  return { ...EMPTY_AUDIENCIAS_FACET };
}
