import { useEffect, useState } from "react";
import { Loader2, Mail, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/hooks/useUserRole";

/**
 * HU-11.1 — Modal de convite por email.
 *
 * Campos:
 *   - Email obrigatório
 *   - Nome completo (opcional, vira metadata.full_name)
 *   - Role (obrigatório)
 *   - Gabinete (visível apenas quando role for vereador/assessor)
 */

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

interface CouncilMemberOption {
  id: string;
  name: string;
  party: string;
}

const INVITE_ROLES: UserRole[] = [
  "admin",
  "gestor",
  "vereador",
  "assessor",
  "cidadao_engajado",
];

export function InviteUserDialog({
  open,
  onOpenChange,
  onInvited,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("gestor");
  const [councilMemberId, setCouncilMemberId] = useState<string>("");
  const [councilMembers, setCouncilMembers] = useState<CouncilMemberOption[]>([]);
  const [loadingCouncil, setLoadingCouncil] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const needsGabinete = role === "vereador" || role === "assessor";

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setRole("gestor");
      setCouncilMemberId("");
    }
  }, [open]);

  // Carrega lista de vereadores quando o role muda para vereador/assessor.
  useEffect(() => {
    if (!open || !needsGabinete || councilMembers.length > 0) return;
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
  }, [open, needsGabinete, councilMembers.length]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const gabineteValid = !needsGabinete || !!councilMemberId;
  const formValid = emailValid && !!role && gabineteValid;

  const handleSubmit = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: email.trim(),
          role,
          fullName: fullName.trim() || undefined,
          councilMemberId: needsGabinete ? councilMemberId : undefined,
        },
      });
      if (error) throw error;
      const message =
        (data as { error?: string })?.error
          ? `Aviso: ${(data as { error: string }).error}`
          : `Convite enviado para ${email.trim()}.`;
      toast.success(message);
      onInvited?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[InviteUserDialog] error", err);
      const msg =
        err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível convidar: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Convidar novo usuário
          </DialogTitle>
          <DialogDescription>
            Um email de convite será enviado para o endereço informado. O
            usuário cria a senha ao acessar o link e já recebe o papel definido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <div className="relative mt-1">
              <Mail className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="nome@orgao.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8"
                disabled={submitting}
                autoFocus
              />
            </div>
            {email && !emailValid && (
              <p className="text-[11px] text-destructive mt-1">
                Email inválido.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="invite-name">Nome completo (opcional)</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Maria da Silva"
              disabled={submitting}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Papel</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={submitting}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsGabinete && (
            <div>
              <Label>Gabinete (vereador)</Label>
              <Select
                value={councilMemberId}
                onValueChange={setCouncilMemberId}
                disabled={submitting || loadingCouncil}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      loadingCouncil ? "Carregando..." : "Selecione o vereador"
                    }
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
              {needsGabinete && !councilMemberId && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Obrigatório para vereador/assessor.
                </p>
              )}
            </div>
          )}
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
            onClick={() => void handleSubmit()}
            disabled={!formValid || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
