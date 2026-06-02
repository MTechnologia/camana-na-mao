import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Eye,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SEVERITY_LABEL_PT, DIRECTION_LABEL_PT, type AnomalySeverity } from "@/lib/detectAnomalies";
import type { AnomalyEntry, AnomalyStatus } from "@/hooks/useReportAnomalies";

/**
 * HU-9.3 — Tabela cronológica de anomalias detectadas.
 *
 * Mostra: data, sinal, magnitude (z-score), observado vs esperado, severidade,
 * direção (spike/drop) e status. Tem filtros por status/severidade e busca
 * textual nas notas.
 */

interface AnomaliesTableProps {
  anomalies: AnomalyEntry[];
  onSelectAnomaly: (a: AnomalyEntry) => void;
}

const STATUS_LABELS: Record<AnomalyStatus, string> = {
  active: "Ativa",
  acknowledged: "Reconhecida",
  dismissed: "Dispensada",
};

const STATUS_OPTIONS: { value: AnomalyStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Apenas ativas" },
  { value: "acknowledged", label: "Reconhecidas" },
  { value: "dismissed", label: "Dispensadas" },
];

const SEVERITY_OPTIONS: { value: AnomalySeverity | "all"; label: string }[] = [
  { value: "all", label: "Todas as severidades" },
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Moderada" },
  { value: "low", label: "Leve" },
];

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-yellow-200 text-yellow-900",
};

const STATUS_STYLES: Record<AnomalyStatus, string> = {
  active: "bg-destructive/15 text-destructive border-destructive/30",
  acknowledged: "bg-blue-100 text-blue-900 border-blue-300",
  dismissed: "bg-muted text-muted-foreground border-border",
};

function formatDateBr(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}`;
}

function formatPt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function AnomaliesTable({ anomalies, onSelectAnomaly }: AnomaliesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return anomalies.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (q) {
        const hay = `${a.notes ?? ""} ${a.signalDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [anomalies, search, statusFilter, severityFilter]);

  if (anomalies.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma anomalia detectada no período monitorado. Os volumes estão dentro do esperado pelo
          modelo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar nas notas ou data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as AnomalyStatus | "all")}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v as AnomalySeverity | "all")}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma anomalia corresponde aos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Severidade</th>
                <th className="px-4 py-2 font-medium">Direção</th>
                <th className="px-4 py-2 font-medium text-right">Observado</th>
                <th className="px-4 py-2 font-medium text-right">Esperado</th>
                <th className="px-4 py-2 font-medium text-right">|z|</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const dir = a.direction;
                const DirIcon = dir === "spike" ? ArrowUp : ArrowDown;
                return (
                  <tr
                    key={a.id}
                    className={cn(
                      "border-t border-border/60 hover:bg-muted/30 transition-colors",
                      a.status === "dismissed" && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{formatDateBr(a.signalDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        className={cn(
                          "text-[10px] h-5 px-2 border-none",
                          SEVERITY_STYLES[a.severity],
                        )}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {SEVERITY_LABEL_PT[a.severity]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          dir === "spike" ? "text-red-600" : "text-blue-600",
                        )}
                      >
                        <DirIcon className="h-3 w-3" />
                        {DIRECTION_LABEL_PT[dir]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatPt(a.observedValue)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {formatPt(a.expectedValue)}
                      <span className="text-[10px] ml-1">
                        ±{formatPt(Math.max(0, a.expectedUpper - a.expectedValue))}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {Math.abs(a.zScore).toFixed(1)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 px-2", STATUS_STYLES[a.status])}
                      >
                        {a.status === "dismissed" && <XCircle className="h-3 w-3 mr-1" />}
                        {a.status === "acknowledged" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => onSelectAnomaly(a)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
