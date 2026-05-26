import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TRIAGE_PRIORITIES,
  TRIAGE_PRIORITY_ORDER,
  TRIAGE_STATUSES,
  TRIAGE_STATUS_ORDER,
  type TriagePriority,
  type TriageStatus,
} from "@/lib/triage";
import {
  useReportTriage,
  type TriageRecord,
} from "@/hooks/useReportTriage";
import {
  fetchActiveLegislativeCommissions,
  type LegislativeCommissionOption,
} from "@/lib/reportCommissionReferrals";
import type { ReportSource } from "@/contexts/ReportDetailContext";

/**
 * HU-10.1 — Editor de triagem: prioridade, comissão responsável e status do funil.
 */

interface TriageEditorProps {
  reportId: string;
  source: ReportSource;
  canEdit?: boolean;
  onSaved?: (record: TriageRecord) => void;
  /** Muda quando o encaminhamento é salvo — força recarga da triagem. */
  referralSyncToken?: string | null;
}

const UNASSIGNED_VALUE = "__unassigned__";

export function TriageEditor({
  reportId,
  source,
  canEdit = true,
  onSaved,
  referralSyncToken = null,
}: TriageEditorProps) {
  const { triage, isLoading, error, upsert, refresh } = useReportTriage(reportId, source);
  const [commissions, setCommissions] = useState<LegislativeCommissionOption[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(true);

  const [priority, setPriority] = useState<TriagePriority | null>(null);
  const [responsibleCommissionId, setResponsibleCommissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<TriageStatus>("untriaged");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoadingCommissions(true);
      try {
        const list = await fetchActiveLegislativeCommissions();
        setCommissions(list);
      } catch (err) {
        console.error("[TriageEditor] commissions", err);
      } finally {
        setLoadingCommissions(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!referralSyncToken) return;
    void refresh();
  }, [referralSyncToken, refresh]);

  useEffect(() => {
    if (triage) {
      setPriority(triage.priority);
      setResponsibleCommissionId(triage.responsibleCommissionId);
      setStatus(triage.triageStatus);
      setNotes(triage.notes ?? "");
    } else {
      setPriority(null);
      setResponsibleCommissionId(null);
      setStatus("untriaged");
      setNotes("");
    }
  }, [triage?.id, triage?.updatedAt, triage?.responsibleCommissionId]);

  const dirty =
    (triage?.priority ?? null) !== priority
    || (triage?.responsibleCommissionId ?? null) !== responsibleCommissionId
    || (triage?.triageStatus ?? "untriaged") !== status
    || (triage?.notes ?? "") !== notes;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await upsert({
        priority,
        responsibleCommissionId,
        assigneeId: null,
        triageStatus: status,
        notes: notes.trim() || null,
      });
      toast.success("Triagem salva.");
      if (saved) onSaved?.(saved);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Você não tem permissão para editar a triagem deste relato.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Triagem
          {triage && (
            <Badge variant="outline" className="text-[10px]">
              {TRIAGE_STATUSES[triage.triageStatus].label}
            </Badge>
          )}
        </h3>
        <p className="text-xs text-muted-foreground">
          Defina prioridade, comissão responsável e status para guiar o tratamento.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Prioridade
        </label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {TRIAGE_PRIORITY_ORDER.map((code) => {
            const meta = TRIAGE_PRIORITIES[code];
            const active = priority === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setPriority(active ? null : code)}
                className={cn(
                  "rounded-md py-2 px-1 text-xs font-semibold border transition-colors",
                  active
                    ? `${meta.bgClass} ${meta.colorClass} border-transparent`
                    : "bg-card hover:bg-muted border-border text-foreground",
                )}
                title={meta.description}
                disabled={saving || isLoading}
              >
                <div>{code}</div>
                <div className="text-[10px] font-normal opacity-90">
                  {meta.shortLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Comissão responsável
        </label>
        <Select
          value={responsibleCommissionId ?? UNASSIGNED_VALUE}
          onValueChange={(v) =>
            setResponsibleCommissionId(v === UNASSIGNED_VALUE ? null : v)
          }
          disabled={saving || loadingCommissions}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione a comissão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_VALUE}>
              <span className="text-muted-foreground">Sem comissão</span>
            </SelectItem>
            {commissions.map((c) => (
              <SelectItem key={c.commissionId} value={c.commissionId}>
                <span className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  {c.name}
                  {c.code ? (
                    <span className="text-muted-foreground text-[10px]">
                      ({c.code})
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Status do funil
        </label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as TriageStatus)}
          disabled={saving}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIAGE_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {TRIAGE_STATUSES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-1">
          {TRIAGE_STATUSES[status].description}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Nota interna (opcional)
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contexto, hipótese, próxima ação..."
          rows={3}
          disabled={saving}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || saving || isLoading}
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar triagem
        </Button>
      </div>
    </Card>
  );
}
