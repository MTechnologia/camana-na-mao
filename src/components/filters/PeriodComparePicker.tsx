import { useMemo } from "react";
import { ArrowLeftRight, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterDatePicker } from "@/components/filters/FilterDatePicker";
import type { DateRangeValue } from "@/components/filters/types";
import { cn } from "@/lib/utils";

/**
 * HU-5.1 — Seletor de dois períodos lado a lado para comparação A vs B.
 *
 * Apresenta um date picker principal (Período A) + toggle "Comparar com..."
 * + seletor de período B com 3 presets pré-calculados:
 *   - "Período anterior": mesma duração imediatamente antes de A
 *   - "Mesmo período do ano passado": A com ano -1
 *   - "Personalizado": data picker livre
 *
 * Quando o toggle está desligado, periodB é null e a comparação fica oculta.
 */

export type ComparePreset = "previous" | "year_ago" | "custom";

export interface PeriodComparePickerValue {
  periodA: DateRangeValue | undefined;
  /** null quando comparação desativada. */
  periodB: DateRangeValue | null;
  preset: ComparePreset;
}

export interface PeriodComparePickerProps {
  value: PeriodComparePickerValue;
  onChange: (next: PeriodComparePickerValue) => void;
  /** Esconde os date pickers e usa apenas presets (modo compacto). */
  compact?: boolean;
}

/**
 * Calcula o período B com base no A e no preset.
 * Exportado para teste.
 */
export function computePeriodB(
  periodA: DateRangeValue | undefined,
  preset: ComparePreset,
  customB?: DateRangeValue | null,
): DateRangeValue | null {
  if (!periodA?.from || !periodA?.to) return null;

  if (preset === "previous") {
    const ms = periodA.to.getTime() - periodA.from.getTime();
    const to = new Date(periodA.from.getTime() - 24 * 3600 * 1000); // dia anterior ao início de A
    const from = new Date(to.getTime() - ms);
    return { from, to };
  }
  if (preset === "year_ago") {
    const from = new Date(periodA.from);
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date(periodA.to);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  // custom
  return customB ?? null;
}

function formatRange(p: DateRangeValue | null | undefined): string {
  if (!p?.from || !p?.to) return "—";
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `${fmt(p.from)} – ${fmt(p.to)}`;
}

export function PeriodComparePicker({ value, onChange, compact = false }: PeriodComparePickerProps) {
  const { periodA, periodB, preset } = value;
  const compareEnabled = periodB !== null;

  const computedB = useMemo(
    () => computePeriodB(periodA, preset, periodB),
    [periodA, preset, periodB],
  );

  const handleTogglePeriodCompare = (enabled: boolean) => {
    if (enabled) {
      const next = computePeriodB(periodA, preset === "custom" ? "previous" : preset);
      onChange({
        periodA,
        periodB: next,
        preset: preset === "custom" ? "previous" : preset,
      });
    } else {
      onChange({ periodA, periodB: null, preset });
    }
  };

  const handlePresetChange = (next: ComparePreset) => {
    const nextB =
      next === "custom" ? periodB ?? { from: undefined, to: undefined } : computePeriodB(periodA, next);
    onChange({ periodA, periodB: nextB, preset: next });
  };

  const handlePeriodAChange = (next: DateRangeValue | undefined) => {
    // Se houver comparação ativa com preset baseado em A, recalcula B
    let nextB = periodB;
    if (compareEnabled && (preset === "previous" || preset === "year_ago")) {
      nextB = computePeriodB(next, preset);
    }
    onChange({ periodA: next, periodB: nextB, preset });
  };

  const handlePeriodBChange = (next: DateRangeValue | undefined) => {
    onChange({ periodA, periodB: next ?? null, preset: "custom" });
  };

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Período principal (A)
          </Label>
          <FilterDatePicker value={periodA} onChange={handlePeriodAChange} />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id="period-compare-toggle"
              checked={compareEnabled}
              onCheckedChange={handleTogglePeriodCompare}
            />
            <Label htmlFor="period-compare-toggle" className="text-sm cursor-pointer">
              Comparar com outro período
            </Label>
          </div>
        </div>
      </div>

      {compareEnabled && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Período de comparação (B)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ periodA, periodB: null, preset })}
              aria-label="Cancelar comparação"
              className="h-7 px-2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Preset</Label>
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as ComparePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">Período anterior (mesma duração)</SelectItem>
                  <SelectItem value="year_ago">Mesmo período do ano passado</SelectItem>
                  <SelectItem value="custom">Personalizado…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Datas do período B</Label>
                <FilterDatePicker value={periodB ?? undefined} onChange={handlePeriodBChange} />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Comparando <strong>{formatRange(periodA)}</strong> com{" "}
            <strong>{formatRange(computedB)}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
