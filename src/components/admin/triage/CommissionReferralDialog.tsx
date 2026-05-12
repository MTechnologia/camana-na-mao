import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  COMMISSION_REFERRAL_MIN_JUSTIFICATION,
  JustificationTooShortError,
  useCommissionReferrals,
} from "@/hooks/useCommissionReferrals";
import type { ReportSource } from "@/contexts/ReportDetailContext";

/**
 * HU-10.2 — Modal para encaminhar um relato a uma comissão temática.
 *
 * Mostra select de comissões ativas + textarea de justificativa com contador
 * (mín. 20 chars). Salva via submit() do hook.
 */

interface CommissionReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  source: ReportSource;
  onSubmitted?: () => void;
}

interface CommissionOption {
  id: string;
  code: string;
  name: string;
}

export function CommissionReferralDialog({
  open,
  onOpenChange,
  reportId,
  source,
  onSubmitted,
}: CommissionReferralDialogProps) {
  const { submit } = useCommissionReferrals(reportId, source);
  const [commissionId, setCommissionId] = useState<string>("");
  const [justification, setJustification] = useState("");
  const [commissions, setCommissions] = useState<CommissionOption[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state ao abrir.
  useEffect(() => {
    if (open) {
      setCommissionId("");
      setJustification("");
    }
  }, [open]);

  // Busca comissões ativas quando o modal abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCommissions(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("legislative_commissions")
          .select("id, code, name")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (!cancelled && !error) {
          setCommissions((data ?? []) as CommissionOption[]);
        }
      } finally {
        if (!cancelled) setLoadingCommissions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const trimmedLength = justification.trim().length;
  const justificationValid = trimmedLength >= COMMISSION_REFERRAL_MIN_JUSTIFICATION;
  const formValid = !!commissionId && justificationValid;

  const counterColor = useMemo(() => {
    if (trimmedLength === 0) return "text-muted-foreground";
    if (trimmedLength < COMMISSION_REFERRAL_MIN_JUSTIFICATION) return "text-destructive";
    return "text-green-600";
  }, [trimmedLength]);

  const handleSubmit = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      await submit({ commissionId, justification });
      toast.success("Encaminhamento registrado.");
      onSubmitted?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      if (err instanceof JustificationTooShortError) {
        toast.error(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "Erro desconhecido.";
        toast.error(`Não foi possível encaminhar: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Encaminhar a comissão temática
          </DialogTitle>
          <DialogDescription>
            A comissão receberá o relato com sua justificativa e poderá
            registrar a decisão (aceitar, rejeitar ou processar).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Comissão
            </label>
            <Select
              value={commissionId}
              onValueChange={setCommissionId}
              disabled={loadingCommissions || submitting}
            >
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    loadingCommissions
                      ? "Carregando..."
                      : "Selecione a comissão"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {commissions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Justificativa
              </label>
              <span className={cn("text-[10px]", counterColor)}>
                {trimmedLength}/{COMMISSION_REFERRAL_MIN_JUSTIFICATION} mínimo
              </span>
            </div>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique por que este relato é pertinente à comissão escolhida (mín. 20 caracteres)..."
              rows={5}
              disabled={submitting}
              className="mt-1"
            />
            {trimmedLength > 0 && !justificationValid && (
              <p className="text-[10px] text-destructive mt-1">
                Adicione mais {COMMISSION_REFERRAL_MIN_JUSTIFICATION - trimmedLength} caracteres.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!formValid || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
