import { useMemo, useState } from "react";
import { Search, AlertTriangle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PatternEntry } from "@/hooks/usePatternsList";

/**
 * HU-9.1 — Tabela ranqueada de padrões identificados pela IA.
 *
 * Cards com: descrição + tipo + occurrence_count + severity badge +
 * last_occurrence relative + ação de drill-down.
 */

interface PatternsTableProps {
  patterns: PatternEntry[];
  availableTypes: string[];
  availableStatuses: string[];
  onSelectPattern: (pattern: PatternEntry) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  baixa: "bg-blue-100 text-blue-700 border-blue-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  critica: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  resolved: "Resolvido",
  ignored: "Ignorado",
  monitoring: "Monitorando",
};

const PATTERN_TYPE_LABELS: Record<string, string> = {
  volume_spike: "Pico de volume",
  recurrent_issue: "Recorrência",
  hotspot: "Concentração local",
  trend: "Tendência",
  anomaly: "Anomalia",
};

function severityKey(s: string | null | undefined): string {
  if (!s) return "media";
  const n = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("critic")) return "critica";
  if (n.includes("alta") || n.includes("high")) return "alta";
  if (n.includes("baixa") || n.includes("low")) return "baixa";
  return "media";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export function PatternsTable({
  patterns,
  availableTypes,
  availableStatuses,
  onSelectPattern,
}: PatternsTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patterns.filter((p) => {
      if (typeFilter !== "all" && p.patternType !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (term && !p.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [patterns, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Buscar descrição</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Ex.: "atraso linha 8"'
                className="pl-7 h-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PATTERN_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filtered.length} padr{filtered.length === 1 ? "ão" : "ões"} encontrado
          {filtered.length === 1 ? "" : "s"}
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhum padrão corresponde aos filtros aplicados.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <PatternRow key={p.id} pattern={p} onClick={() => onSelectPattern(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PatternRowProps {
  pattern: PatternEntry;
  onClick: () => void;
}

function PatternRow({ pattern, onClick }: PatternRowProps) {
  const sev = severityKey(pattern.averageSeverity);
  const typeLabel = PATTERN_TYPE_LABELS[pattern.patternType] ?? pattern.patternType;

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:bg-muted/30 transition-colors",
        pattern.status !== "active" && "opacity-70",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {typeLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-4 px-1 border", SEVERITY_COLORS[sev])}
            >
              {pattern.averageSeverity ?? "—"}
            </Badge>
            {pattern.status !== "active" && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {STATUS_LABELS[pattern.status] ?? pattern.status}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{pattern.description}</p>
          {pattern.suggestedAction && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              💡 {pattern.suggestedAction}
            </p>
          )}
          <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap gap-x-3">
            <span>
              <strong>{pattern.occurrenceCount}</strong> ocorrências
            </span>
            <span>Última: {formatRelative(pattern.lastOccurrenceAt)}</span>
            {pattern.peakHours && pattern.peakHours.length > 0 && (
              <span>
                Pico:{" "}
                {pattern.peakHours
                  .slice(0, 3)
                  .map((h) => `${h}h`)
                  .join(", ")}
                {pattern.peakHours.length > 3 ? "..." : ""}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
      </div>
    </Card>
  );
}
