import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SEVERITY_LABEL_PT,
  DIRECTION_LABEL_PT,
  type AnomalySeverity,
} from "@/lib/detectAnomalies";
import type {
  AnomalyEntry,
  AnomalyStatus,
  UseReportAnomaliesResult,
} from "@/hooks/useReportAnomalies";

/**
 * HU-9.3 — Painel lateral com detalhes e ações de uma anomalia.
 *
 * Mostra valor observado vs esperado (com IC95%), z-score, gráfico mini
 * comparativo e botões para reconhecer/dispensar/anotar.
 */

interface AnomalyDetailSheetProps {
  anomaly: AnomalyEntry | null;
  onOpenChange: (open: boolean) => void;
  actions: Pick<
    UseReportAnomaliesResult,
    "acknowledge" | "dismiss" | "setNotes"
  >;
}

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-yellow-200 text-yellow-900",
};

const STATUS_LABELS: Record<AnomalyStatus, string> = {
  active: "Ativa",
  acknowledged: "Reconhecida",
  dismissed: "Dispensada",
};

function formatDateLong(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function ObservedVsExpected({
  observed,
  lower,
  expected,
  upper,
}: {
  observed: number;
  lower: number;
  expected: number;
  upper: number;
}) {
  // Calcula uma escala simétrica visual.
  const min = Math.min(lower, observed) * 0.95;
  const max = Math.max(upper, observed) * 1.05;
  const span = Math.max(1, max - min);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));

  return (
    <div className="relative h-16 mt-2">
      {/* Faixa IC */}
      <div
        className="absolute top-6 h-3 rounded-sm bg-primary/15"
        style={{
          left: `${pct(lower)}%`,
          width: `${Math.max(2, pct(upper) - pct(lower))}%`,
        }}
        title={`IC 95%: ${formatPt(lower)} – ${formatPt(upper)}`}
      />
      {/* Marca esperado */}
      <div
        className="absolute top-4 h-7 w-0.5 bg-primary"
        style={{ left: `${pct(expected)}%` }}
        title={`Esperado: ${formatPt(expected)}`}
      />
      {/* Marca observado */}
      <div
        className={cn(
          "absolute top-3 h-9 w-1 rounded-sm",
          observed > upper || observed < lower ? "bg-destructive" : "bg-foreground",
        )}
        style={{ left: `calc(${pct(observed)}% - 2px)` }}
        title={`Observado: ${formatPt(observed)}`}
      />
      {/* Labels */}
      <div className="absolute top-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatPt(min)}</span>
        <span>{formatPt(max)}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px]">
        <span className="text-muted-foreground">IC inferior</span>
        <span className="text-muted-foreground">IC superior</span>
      </div>
    </div>
  );
}

export function AnomalyDetailSheet({
  anomaly,
  onOpenChange,
  actions,
}: AnomalyDetailSheetProps) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [acking, setAcking] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setNotes(anomaly?.notes ?? "");
  }, [anomaly?.id]);

  if (!anomaly) return null;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await actions.setNotes(anomaly.id, notes);
      toast.success("Notas salvas.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as notas.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcking(true);
    try {
      await actions.acknowledge(anomaly.id, notes || undefined);
      toast.success("Anomalia reconhecida.");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível reconhecer.");
    } finally {
      setAcking(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await actions.dismiss(anomaly.id, notes || undefined);
      toast.success("Anomalia dispensada.");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível dispensar.");
    } finally {
      setDismissing(false);
    }
  };

  const isSpike = anomaly.direction === "spike";
  const DirIcon = isSpike ? ArrowUp : ArrowDown;

  return (
    <Sheet open={!!anomaly} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Anomalia detectada
          </SheetTitle>
          <SheetDescription>{formatDateLong(anomaly.signalDate)}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Badges principais */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "border-none",
                SEVERITY_STYLES[anomaly.severity],
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {SEVERITY_LABEL_PT[anomaly.severity]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                isSpike ? "text-red-600 border-red-300" : "text-blue-600 border-blue-300",
              )}
            >
              <DirIcon className="h-3 w-3 mr-1" />
              {DIRECTION_LABEL_PT[anomaly.direction]}
            </Badge>
            <Badge variant="outline">{STATUS_LABELS[anomaly.status]}</Badge>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Volume observado</p>
              <p className="text-2xl font-semibold mt-1">
                {formatPt(anomaly.observedValue)}
              </p>
              <p className="text-[11px] text-muted-foreground">relatos no dia</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Volume esperado</p>
              <p className="text-2xl font-semibold mt-1">
                {formatPt(anomaly.expectedValue)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                IC 95%: {formatPt(anomaly.expectedLower)} – {formatPt(anomaly.expectedUpper)}
              </p>
            </Card>
          </div>

          {/* Visualização da magnitude */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Desvio do esperado</p>
              <p className="text-xs text-muted-foreground">
                |z| = {Math.abs(anomaly.zScore).toFixed(2)} (
                {isSpike ? "+" : ""}
                {anomaly.zScore.toFixed(2)} σ)
              </p>
            </div>
            <ObservedVsExpected
              observed={anomaly.observedValue}
              lower={anomaly.expectedLower}
              expected={anomaly.expectedValue}
              upper={anomaly.expectedUpper}
            />
          </Card>

          {/* Metadados */}
          <Card className="p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3 w-3" />
              Detectada em{" "}
              {new Date(anomaly.detectedAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </div>
            {anomaly.acknowledgedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Reconhecida em{" "}
                {new Date(anomaly.acknowledgedAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
            )}
          </Card>

          <Separator />

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Notas internas
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anote a investigação, hipóteses, ação tomada..."
              className="mt-1 min-h-[80px]"
              disabled={savingNotes}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void handleSaveNotes()}
              disabled={savingNotes || notes === (anomaly.notes ?? "")}
            >
              {savingNotes ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-2" />
              )}
              Salvar notas
            </Button>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-2 border-t pt-4">
          {anomaly.status !== "dismissed" && (
            <Button
              variant="outline"
              onClick={() => void handleDismiss()}
              disabled={acking || dismissing}
            >
              {dismissing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Dispensar
            </Button>
          )}
          {anomaly.status !== "acknowledged" && (
            <Button
              onClick={() => void handleAcknowledge()}
              disabled={acking || dismissing}
            >
              {acking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Reconhecer
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
