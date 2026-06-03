import { Clock, ClipboardCheck, Hourglass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterHint } from "@/components/analytics/FilterHint";
import { cn } from "@/lib/utils";
import {
  EMPTY_EFICIENCIA_FACET,
  REPORT_STATUS_LABELS,
  SLA_WINDOW_LABELS,
  type EficienciaFacet,
  type ReportStatus,
  type SlaWindow,
} from "@/lib/analyticsFilters";

const HINT_SLA =
  "Janela de tempo aceitável para a resolução do relato. 24h = atendimento de urgência; 7 dias = SLA padrão; 30 dias = casos longos. Quando ativo, mantém apenas relatos resolvidos DENTRO dessa janela.";
const HINT_RANGE =
  "Mostra apenas relatos cujo tempo entre abertura e resolução cai nessa faixa (em dias). Útil para investigar outliers (ex: 'resolvidos entre 15 e 30 dias').";
const HINT_STATUS =
  "Estado atual do relato. Nas abas que só agregam resolvidos (KPIs de tempo médio), este filtro não tem efeito.";

/**
 * HU-14.4 — Picker do facet de Eficiência (tempo de resposta).
 *
 *   - Janela SLA: dropdown (24h, 48h, 7d, 30d, Sem limite)
 *   - Status: multi-toggle (pending, in_progress, resolved, rejected)
 *   - Range de dias de resposta: min/max inputs numéricos
 */

interface EficienciaFacetPickerProps {
  value: EficienciaFacet;
  onChange: (next: EficienciaFacet) => void;
  disabled?: boolean;
}

const SLA_OPTIONS: SlaWindow[] = ["24h", "48h", "7d", "30d", "all"];
const STATUSES: ReportStatus[] = ["pending", "in_progress", "resolved", "rejected"];

export function EficienciaFacetPicker({ value, onChange, disabled }: EficienciaFacetPickerProps) {
  const selectedStatuses = new Set(value.statuses ?? []);

  const toggleStatus = (s: ReportStatus) => {
    const next = new Set(selectedStatuses);
    if (next.has(s)) {
      next.delete(s);
    } else {
      next.add(s);
    }
    onChange({
      ...value,
      statuses: Array.from(next) as ReportStatus[],
    });
  };

  const handleMinChange = (val: string) => {
    const num = val === "" ? undefined : Math.max(0, Number(val));
    onChange({
      ...value,
      responseMinDays: Number.isFinite(num) ? (num as number) : undefined,
    });
  };

  const handleMaxChange = (val: string) => {
    const num = val === "" ? undefined : Math.max(0, Number(val));
    onChange({
      ...value,
      responseMaxDays: Number.isFinite(num) ? (num as number) : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SLA Window */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
            <Hourglass className="h-3 w-3" />
            Janela de SLA
            <FilterHint text={HINT_SLA} />
          </Label>
          <Select
            value={value.slaWindow ?? "all"}
            onValueChange={(v) => onChange({ ...value, slaWindow: v as SlaWindow })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLA_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {SLA_WINDOW_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Range de dias */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
            <Clock className="h-3 w-3" />
            Tempo de resposta (dias)
            <FilterHint text={HINT_RANGE} />
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Mín"
              value={value.responseMinDays ?? ""}
              onChange={(e) => handleMinChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Máx"
              value={value.responseMaxDays ?? ""}
              onChange={(e) => handleMaxChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Statuses */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
          <ClipboardCheck className="h-3 w-3" />
          Status do relato
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
                {REPORT_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function resetEficienciaFacet(): EficienciaFacet {
  return { ...EMPTY_EFICIENCIA_FACET };
}
