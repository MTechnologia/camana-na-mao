import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TRIAGE_PRIORITIES, TRIAGE_PRIORITY_ORDER, type TriagePriority } from "@/lib/triage";
import { cn } from "@/lib/utils";

type Props = {
  selectedPriorities: TriagePriority[];
  onToggle: (priority: TriagePriority) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function ReportsPriorityFilter({
  selectedPriorities,
  onToggle,
  onClear,
  open,
  onOpenChange,
  className,
}: Props) {
  const selectedSet = useMemo(() => new Set(selectedPriorities), [selectedPriorities]);

  const triggerLabel = useMemo(() => {
    if (selectedPriorities.length === 0) return "Todas as prioridades";
    if (selectedPriorities.length === 1) {
      return TRIAGE_PRIORITIES[selectedPriorities[0]].label;
    }
    return `${selectedPriorities.length} prioridades`;
  }, [selectedPriorities]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-between gap-1 font-normal sm:w-[200px]",
            selectedPriorities.length > 0 && "border-primary/60",
            className,
          )}
          aria-label="Filtrar por prioridade de triagem"
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-medium text-foreground">Prioridade</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Marque uma ou mais (P0–P3). Relatos sem prioridade inferida ficam de fora ao filtrar.
          </p>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
          {TRIAGE_PRIORITY_ORDER.map((p) => {
            const checked = selectedSet.has(p);
            return (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    if (v === "indeterminate") return;
                    if (Boolean(v) !== checked) onToggle(p);
                  }}
                  aria-labelledby={`priority-opt-${p}`}
                />
                <span id={`priority-opt-${p}`} className="truncate">
                  {TRIAGE_PRIORITIES[p].label}
                </span>
              </label>
            );
          })}
        </div>
        {selectedPriorities.length > 0 && (
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
              Limpar filtro (todas)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
