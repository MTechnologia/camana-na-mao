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
import { FilterDateRangeFields } from "@/components/filters/FilterDateRangeFields";
import type { DateRangeValue } from "@/components/filters/types";
import { PERIOD_FILTER_OPTIONS, PERIOD_COMPARE_VALUE } from "@/lib/globalFilterOptions";
import { globalPeriodKeyToDateRange } from "@/lib/globalPeriodRange";
import { isCompleteDateRange, normalizeDateRange } from "@/lib/dateRangeUtils";
import { cn } from "@/lib/utils";

/**
 * HU-5.1 — Seletor de dois períodos para comparação A vs B.
 * Período A: data inicial + data final (inputs nativos).
 * Período B: preset ou intervalo personalizado com os mesmos campos.
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
  compact?: boolean;
}

export function computePeriodB(
  periodA: DateRangeValue | undefined,
  preset: ComparePreset,
  customB?: DateRangeValue | null,
): DateRangeValue | null {
  if (!isCompleteDateRange(periodA)) return null;

  if (preset === "previous") {
    const ms = periodA.to.getTime() - periodA.from.getTime();
    const to = new Date(periodA.from.getTime() - 24 * 3600 * 1000);
    const from = new Date(to.getTime() - ms);
    return normalizeDateRange(from, to) ?? null;
  }
  if (preset === "year_ago") {
    const from = new Date(periodA.from);
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date(periodA.to);
    to.setFullYear(to.getFullYear() - 1);
    return normalizeDateRange(from, to) ?? null;
  }
  if (isCompleteDateRange(customB)) return customB;
  return null;
}

function formatRange(p: DateRangeValue | null | undefined): string {
  if (!isCompleteDateRange(p)) return "—";
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `${fmt(p.from)} – ${fmt(p.to)}`;
}

const QUICK_PERIOD_PRESETS = PERIOD_FILTER_OPTIONS.filter((p) => p.value !== PERIOD_COMPARE_VALUE);

export function PeriodComparePicker({
  value,
  onChange,
  compact = false,
}: PeriodComparePickerProps) {
  const { periodA, periodB, preset } = value;
  const compareEnabled = periodB !== null;
  const periodAComplete = isCompleteDateRange(periodA);

  const computedB = useMemo(
    () => computePeriodB(periodA, preset, periodB),
    [periodA, preset, periodB],
  );

  const applyQuickPeriod = (periodKey: string) => {
    const { from, to } = globalPeriodKeyToDateRange(periodKey);
    const nextA = normalizeDateRange(from, to);
    let nextB = periodB;
    if (compareEnabled && preset !== "custom") {
      nextB = computePeriodB(nextA, preset, periodB);
    }
    onChange({ periodA: nextA, periodB: nextB, preset });
  };

  const handleTogglePeriodCompare = (enabled: boolean) => {
    if (enabled) {
      const nextPreset = preset === "custom" ? "previous" : preset;
      const next = computePeriodB(periodA, nextPreset, periodB);
      onChange({ periodA, periodB: next, preset: nextPreset });
    } else {
      onChange({ periodA, periodB: null, preset });
    }
  };

  const handlePresetChange = (next: ComparePreset) => {
    const nextB =
      next === "custom"
        ? periodB && (periodB.from || periodB.to)
          ? periodB
          : { from: undefined, to: undefined }
        : computePeriodB(periodA, next, periodB);
    onChange({ periodA, periodB: nextB, preset: next });
  };

  const handlePeriodAChange = (next: DateRangeValue | undefined) => {
    let nextB = periodB;
    if (compareEnabled && preset !== "custom") {
      nextB = computePeriodB(next, preset, periodB);
    }
    onChange({ periodA: next, periodB: nextB, preset });
  };

  const handlePeriodBChange = (next: DateRangeValue | undefined) => {
    onChange({
      periodA,
      periodB: next ?? null,
      preset: "custom",
    });
  };

  return (
    <div className="space-y-3">
      <div className={cn("space-y-2", compact ? "" : "md:pr-4")}>
        <Label className="flex items-center gap-1 text-xs">
          <Calendar className="h-3.5 w-3.5" />
          Período principal (A)
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PERIOD_PRESETS.map((p) => (
            <Button
              key={p.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyQuickPeriod(p.value)}
            >
              {p.short}
            </Button>
          ))}
        </div>
        <FilterDateRangeFields
          value={periodA}
          onChange={handlePeriodAChange}
          fromId="period-compare-a-from"
          toId="period-compare-a-to"
          inputClassName="border-analytics-bar-border bg-analytics-bar-surface text-analytics-bar-control"
        />
        {!periodAComplete ? (
          <p className="text-[11px] text-analytics-bar-muted">
            Informe data inicial e data final para aplicar o recorte.
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="period-compare-toggle"
          checked={compareEnabled}
          onCheckedChange={handleTogglePeriodCompare}
          disabled={!periodAComplete}
        />
        <Label htmlFor="period-compare-toggle" className="cursor-pointer text-sm">
          Comparar com outro período
        </Label>
      </div>

      {compareEnabled ? (
        <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
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

          <div className="space-y-1.5">
            <Label className="text-xs">Como definir o período B</Label>
            <Select value={preset} onValueChange={(v) => handlePresetChange(v as ComparePreset)}>
              <SelectTrigger className="h-9 border-analytics-bar-border bg-analytics-bar-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous">Período anterior (mesma duração)</SelectItem>
                <SelectItem value="year_ago">Mesmo período do ano passado</SelectItem>
                <SelectItem value="custom">Personalizado (data inicial e final)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" ? (
            <FilterDateRangeFields
              value={periodB ?? undefined}
              onChange={handlePeriodBChange}
              fromId="period-compare-b-from"
              toId="period-compare-b-to"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Período B calculado: <strong>{formatRange(computedB)}</strong>
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Comparando <strong>{formatRange(periodA)}</strong> com{" "}
            <strong>{formatRange(preset === "custom" ? periodB : computedB)}</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
