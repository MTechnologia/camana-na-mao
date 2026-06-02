import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { aggregatePeakHours, type PatternEntry } from "@/hooks/usePatternsList";

/**
 * HU-9.1 — Visualizações complementares para a página /admin/padroes.
 *
 *  - PatternsTimeline: barra horizontal por padrão mostrando vida útil
 *    (first_detected_at → last_occurrence_at) ranked por severidade.
 *  - PeakHoursHeatmap: grid 24 colunas com intensidade média de peak_hours
 *    agregado de todos os padrões ativos.
 */

const SEVERITY_COLORS_BAR: Record<string, string> = {
  baixa: "bg-blue-500",
  media: "bg-amber-500",
  alta: "bg-orange-500",
  critica: "bg-red-500",
};

function severityKey(s: string | null | undefined): string {
  if (!s) return "media";
  const n = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("critic")) return "critica";
  if (n.includes("alta") || n.includes("high")) return "alta";
  if (n.includes("baixa") || n.includes("low")) return "baixa";
  return "media";
}

// ============================================================================
// Timeline
// ============================================================================

interface TimelineProps {
  patterns: PatternEntry[];
  /** Filtra apenas ativos (default true). */
  onlyActive?: boolean;
  /** Limite de padrões exibidos. */
  limit?: number;
}

export function PatternsTimeline({ patterns, onlyActive = true, limit = 25 }: TimelineProps) {
  const { rows, minDate, maxDate } = useMemo(() => {
    const filtered = patterns
      .filter((p) => (onlyActive ? p.status === "active" : true))
      .filter((p) => p.firstDetectedAt) // precisa do ponto inicial pra plotar
      .slice(0, limit);

    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    for (const p of filtered) {
      const a = p.firstDetectedAt ? new Date(p.firstDetectedAt).getTime() : 0;
      const b = p.lastOccurrenceAt ? new Date(p.lastOccurrenceAt).getTime() : Date.now();
      if (a < minT) minT = a;
      if (b > maxT) maxT = b;
    }
    if (!Number.isFinite(minT) || !Number.isFinite(maxT) || maxT <= minT) {
      return { rows: [] as PatternEntry[], minDate: null, maxDate: null };
    }

    return {
      rows: filtered.sort((a, b) => b.occurrenceCount - a.occurrenceCount),
      minDate: new Date(minT),
      maxDate: new Date(maxT),
    };
  }, [patterns, onlyActive, limit]);

  if (rows.length === 0 || !minDate || !maxDate) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Sem dados suficientes para a timeline.
      </Card>
    );
  }

  const totalMs = maxDate.getTime() - minDate.getTime();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Linha do tempo dos padrões</h3>
          <p className="text-xs text-muted-foreground">
            Vida útil de cada padrão (primeira detecção → última ocorrência)
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {rows.length} padrões
        </Badge>
      </div>

      <div className="space-y-1.5">
        {rows.map((p) => {
          const start = new Date(p.firstDetectedAt!).getTime();
          const end = p.lastOccurrenceAt
            ? new Date(p.lastOccurrenceAt).getTime()
            : maxDate.getTime();
          const leftPct = ((start - minDate.getTime()) / totalMs) * 100;
          const widthPct = Math.max(2, ((end - start) / totalMs) * 100);
          const sev = severityKey(p.averageSeverity);
          return (
            <div key={p.id} className="flex items-center gap-2">
              <div
                className="text-xs truncate text-right"
                style={{ width: "30%", maxWidth: 240 }}
                title={p.description}
              >
                {p.description}
              </div>
              <div className="relative flex-1 h-5 bg-muted rounded-sm">
                <div
                  className={cn("absolute top-0 bottom-0 rounded-sm", SEVERITY_COLORS_BAR[sev])}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${p.firstDetectedAt} → ${p.lastOccurrenceAt ?? "agora"}`}
                />
              </div>
              <div className="text-[10px] text-muted-foreground text-right" style={{ width: 56 }}>
                {p.occurrenceCount} occ
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{minDate.toLocaleDateString("pt-BR")}</span>
        <div className="flex gap-3">
          {(["baixa", "media", "alta", "critica"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-sm", SEVERITY_COLORS_BAR[s])} />
              {s}
            </span>
          ))}
        </div>
        <span>{maxDate.toLocaleDateString("pt-BR")}</span>
      </div>
    </Card>
  );
}

// ============================================================================
// Peak Hours Heatmap
// ============================================================================

interface PeakHoursHeatmapProps {
  patterns: PatternEntry[];
  onlyActive?: boolean;
}

export function PeakHoursHeatmap({ patterns, onlyActive = true }: PeakHoursHeatmapProps) {
  const vec = useMemo(() => {
    const filtered = onlyActive ? patterns.filter((p) => p.status === "active") : patterns;
    return aggregatePeakHours(filtered);
  }, [patterns, onlyActive]);

  const max = useMemo(() => Math.max(1, ...vec), [vec]);

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Concentração horária dos padrões</h3>
        <p className="text-xs text-muted-foreground">
          Quantos padrões {onlyActive ? "ativos" : ""} apontam cada hora como pico.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-1 mb-2">
        {vec.map((count, hour) => {
          const intensity = count / max;
          const opacity = count === 0 ? 0.08 : 0.3 + intensity * 0.7;
          return (
            <div
              key={hour}
              className="aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium"
              style={{
                backgroundColor: `hsl(var(--primary) / ${opacity})`,
                color: intensity > 0.5 ? "white" : "currentColor",
              }}
              title={`${hour}h — ${count} padrão${count === 1 ? "" : "ões"}`}
            >
              {hour}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </Card>
  );
}
