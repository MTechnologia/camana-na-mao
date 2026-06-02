import { AlertTriangle, Activity, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FilterHint } from "@/components/analytics/FilterHint";
import { cn } from "@/lib/utils";
import {
  EMPTY_CRITICIDADE_FACET,
  SEVERITY_LABELS,
  type CriticidadeFacet,
  type Severity,
} from "@/lib/analyticsFilters";

const HINT_SEVERITY =
  "Nível de criticidade classificado automaticamente pela IA. Combina urgência, escopo e consequências descritas no relato.";
const HINT_CRITICAL_ONLY =
  "Atalho: mantém apenas relatos com severidade 'Crítica'. Útil para auditoria rápida do que exige ação imediata.";
const HINT_CONSEQUENCES =
  "Mantém apenas relatos onde o cidadão descreveu consequências em andamento (ex: alagamento ativo, risco de queda). Indica situação real, não apenas potencial.";

/**
 * HU-14.3 — Picker do facet de Criticidade/Diagnóstico.
 *
 * Permite filtrar relatos por:
 *   - Severidade (multi: low, medium, high, critical)
 *   - Mostrar apenas críticos (toggle)
 *   - Mostrar apenas com consequências ativas (toggle)
 *
 * O catálogo Severity vem de `lib/analyticsFilters.ts` para garantir
 * consistência com os hooks que consomem o facet.
 */

interface CriticidadeFacetPickerProps {
  value: CriticidadeFacet;
  onChange: (next: CriticidadeFacet) => void;
  disabled?: boolean;
}

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

const SEVERITY_BG: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-amber-100 text-amber-900 border-amber-300",
  high: "bg-orange-100 text-orange-900 border-orange-300",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
};

export function CriticidadeFacetPicker({ value, onChange, disabled }: CriticidadeFacetPickerProps) {
  const selectedSeverities = new Set(value.severities ?? []);

  const toggleSeverity = (s: Severity) => {
    const next = new Set(selectedSeverities);
    if (next.has(s)) {
      next.delete(s);
    } else {
      next.add(s);
    }
    onChange({
      ...value,
      severities: Array.from(next) as Severity[],
    });
  };

  return (
    <div className="space-y-3">
      {/* Severidades */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
          <AlertTriangle className="h-3 w-3" />
          Severidade do relato
          <FilterHint text={HINT_SEVERITY} />
        </Label>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((s) => {
            const active = selectedSeverities.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSeverity(s)}
                disabled={disabled}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? SEVERITY_BG[s]
                    : "bg-card hover:bg-muted text-muted-foreground border-border",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {SEVERITY_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label
          className={cn(
            "flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <Checkbox
            checked={!!value.criticalOnly}
            onCheckedChange={(checked) => onChange({ ...value, criticalOnly: checked === true })}
            disabled={disabled}
          />
          <span className="text-xs flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-destructive" />
            Apenas críticos
            <FilterHint text={HINT_CRITICAL_ONLY} />
          </span>
        </label>

        <label
          className={cn(
            "flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <Checkbox
            checked={!!value.hasActiveConsequences}
            onCheckedChange={(checked) =>
              onChange({ ...value, hasActiveConsequences: checked === true })
            }
            disabled={disabled}
          />
          <span className="text-xs flex items-center gap-1">
            <Activity className="h-3 w-3 text-amber-600" />
            Com consequências ativas
            <FilterHint text={HINT_CONSEQUENCES} />
          </span>
        </label>
      </div>
    </div>
  );
}

/** Helper para resetar o facet (usado pelo botão "Limpar" da UI). */
export function resetCriticidadeFacet(): CriticidadeFacet {
  return { ...EMPTY_CRITICIDADE_FACET };
}
