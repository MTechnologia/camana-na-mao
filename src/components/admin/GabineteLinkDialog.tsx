import { useEffect, useState } from "react";
import { Building, Link2, Loader2, Unlink } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/hooks/useUserRole";

/**
 * HU-11.1 — Dialog de vínculo de usuário a gabinete.
 *
 * Pode ser usado tanto para criar quanto para alterar/remover o vínculo.
 * Mostra select de vereadores + select de papel (vereador/assessor).
 *
 * Apenas faz sentido para roles 'vereador' e 'assessor' — o componente
 * presume que o usuário já tem um desses dois roles.
 */

interface GabineteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string | null;
  targetUserName: string | null;
  targetUserRole: UserRole | null;
  currentCouncilMemberId?: string | null;
  onSaved?: () => void;
}

interface CouncilMemberOption {
  id: string;
  name: string;
  party: string;
}

export function GabineteLinkDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  targetUserRole,
  currentCouncilMemberId,
  onSaved,
}: GabineteLinkDialogProps) {
  const [councilMemberId, setCouncilMemberId] = useState<string>("");
  const [linkRole, setLinkRole] = useState<"vereador" | "assessor">("assessor");
  const [councilMembers, setCouncilMembers] = useState<CouncilMemberOption[]>([]);
  const [loadingCouncil, setLoadingCouncil] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCouncilMemberId(currentCouncilMemberId ?? "");
      if (targetUserRole === "vereador") {
        setLinkRole("vereador");
      } else {
        setLinkRole("assessor");
      }
    }
  }, [open, currentCouncilMemberId, targetUserRole]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCouncil(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("council_members_cache")
          .select("id, name, party")
          .eq("is_on_leave", false)
          .order("name", { ascending: true });
        if (!cancelled && !error) {
          setCouncilMembers((data ?? []) as CouncilMemberOption[]);
        }
      } finally {
        if (!cancelled) setLoadingCouncil(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    if (!targetUserId || !councilMemberId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("vereador_user_links").upsert(
        {
          user_id: targetUserId,
          council_member_id: councilMemberId,
          role: linkRole,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      toast.success("Vínculo salvo.");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[GabineteLinkDialog] save", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível salvar: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!targetUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("vereador_user_links")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
      toast.success("Vínculo removido.");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[GabineteLinkDialog] remove", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível remover: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const valid = !!councilMemberId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Vínculo a gabinete
          </DialogTitle>
          <DialogDescription>
            {targetUserName ? (
              <>
                Vincula <strong>{targetUserName}</strong> ao gabinete de um vereador.
              </>
            ) : (
              "Vincula o usuário ao gabinete de um vereador."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Vereador</Label>
            <Select
              value={councilMemberId}
              onValueChange={setCouncilMemberId}
              disabled={submitting || loadingCouncil}
            >
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={loadingCouncil ? "Carregando..." : "Selecione o vereador"}
                />
              </SelectTrigger>
              <SelectContent>
                {councilMembers.map((cm) => (
                  <SelectItem key={cm.id} value={cm.id}>
                    {cm.name} ({cm.party})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Papel no gabinete</Label>
            <Select
              value={linkRole}
              onValueChange={(v) => setLinkRole(v as "vereador" | "assessor")}
              disabled={submitting}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vereador">Vereador (único)</SelectItem>
                <SelectItem value="assessor">Assessor</SelectItem>
              </SelectContent>
            </Select>
            {linkRole === "vereador" && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Cada vereador pode ter apenas um usuário vinculado como &quot;vereador&quot;.
                Assessores são ilimitados.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {currentCouncilMemberId && (
            <Button variant="outline" onClick={() => void handleRemove()} disabled={submitting}>
              <Unlink className="h-4 w-4 mr-2" />
              Remover vínculo
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!valid || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
