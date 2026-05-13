import { useState } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * HU-11.1 — Dialog de suspensão de conta.
 *
 * Pede motivo (opcional) e chama RPC suspend_user. O alvo não consegue
 * mais logar enquanto suspended_at não for limpado.
 */

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string | null;
  targetUserName: string | null;
  onSuspended?: () => void;
}

export function SuspendUserDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onSuspended,
}: SuspendUserDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!targetUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("suspend_user", {
        _target_id: targetUserId,
        _reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.success(`Conta de ${targetUserName} suspensa.`);
      onSuspended?.();
      onOpenChange(false);
      setReason("");
    } catch (err) {
      console.error("[SuspendUserDialog]", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível suspender: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-destructive" />
            Suspender conta
          </DialogTitle>
          <DialogDescription>
            {targetUserName ? (
              <>
                <strong>{targetUserName}</strong> não conseguirá mais acessar o
                sistema. A reativação pode ser feita a qualquer momento.
              </>
            ) : (
              "Usuário ficará impedido de acessar até que seja reativado."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="suspend-reason">Motivo (opcional)</Label>
          <Textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Acesso revogado por motivo de..."
            rows={3}
            className="mt-1"
            disabled={submitting}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4 mr-2" />
            )}
            Suspender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
