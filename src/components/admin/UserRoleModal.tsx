import { useEffect, useMemo, useState } from "react";
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
import { AdminUser } from "@/hooks/useAdminUsers";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVereadores } from "@/hooks/useVereadores";
import { toast } from "sonner";

type UserRole = Database["public"]["Enums"]["app_role"];

interface UserRoleModalProps {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onUpdateRoles: (
    userId: string,
    role: UserRole | null,
    councilMemberId?: string | null,
  ) => Promise<void>;
  vereadorSlotsByCouncilId?: Map<string, string>;
}

const availableRoles: Array<{
  value: UserRole;
  label: string;
  description: string;
  color: string;
}> = [
  { value: "admin", label: "Admin", description: "Controle total do sistema", color: "bg-red-500" },
  {
    value: "gestor",
    label: "Gestor",
    description: "Análises avançadas e gestão",
    color: "bg-purple-500",
  },
  {
    value: "vereador",
    label: "Vereador",
    description: "Acesso aos dados do gabinete",
    color: "bg-blue-500",
  },
  {
    value: "assessor",
    label: "Assessor",
    description: "Suporte ao gabinete",
    color: "bg-green-500",
  },
  {
    value: "cidadao_engajado",
    label: "Cidadão Engajado",
    description: "Pode criar dashboards e encaminhar para vereadores",
    color: "bg-yellow-500",
  },
  {
    value: "cidadao",
    label: "Cidadão",
    description: "Acesso público padrão",
    color: "bg-gray-500",
  },
];

export const UserRoleModal = ({
  user,
  open,
  onClose,
  onUpdateRoles,
  vereadorSlotsByCouncilId,
}: UserRoleModalProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(user.roles[0] ?? null);
  const [selectedCouncilMemberId, setSelectedCouncilMemberId] = useState<string>(
    user.council_member_id ?? "",
  );
  const [loading, setLoading] = useState(false);
  const { data: vereadores = [], isLoading: vereadoresLoading } = useVereadores();

  useEffect(() => {
    if (!open) return;
    setSelectedRole(user.roles[0] ?? null);
    setSelectedCouncilMemberId(user.council_member_id ?? "");
  }, [open, user]);

  const gabineteRoleSelected = useMemo(
    () => selectedRole === "vereador" || selectedRole === "assessor",
    [selectedRole],
  );

  const handleSave = async () => {
    if (!selectedRole) {
      toast.error("Selecione um perfil para continuar.");
      return;
    }

    if (gabineteRoleSelected && !selectedCouncilMemberId) {
      toast.error("Selecione o vereador vinculado para continuar.");
      return;
    }

    setLoading(true);
    try {
      await onUpdateRoles(
        user.id,
        selectedRole,
        gabineteRoleSelected ? selectedCouncilMemberId : null,
      );
      onClose();
    } catch (error) {
      console.error("Error updating roles:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 text-left">
          <DialogTitle>Editar Perfil de {user.full_name}</DialogTitle>
          <DialogDescription>
            Selecione o único perfil que este usuário deve ter no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <RadioGroup
            value={selectedRole ?? ""}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
            className="space-y-3"
          >
            {availableRoles.map((role) => (
              <div
                key={role.value}
                className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={role.value} id={role.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={role.value} className="text-sm font-medium cursor-pointer">
                      {role.label}
                    </Label>
                    <div className={`w-2 h-2 rounded-full ${role.color}`}></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {gabineteRoleSelected && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label htmlFor="council-member-select">Gabinete vinculado</Label>
              <Select
                value={selectedCouncilMemberId}
                onValueChange={setSelectedCouncilMemberId}
                disabled={vereadoresLoading || loading}
              >
                <SelectTrigger id="council-member-select">
                  <SelectValue placeholder="Selecione o vereador responsável" />
                </SelectTrigger>
                <SelectContent>
                  {vereadores.map((vereador) => {
                    const occupiedBy = vereadorSlotsByCouncilId?.get(vereador.id);
                    const isCurrentUserSlot =
                      user.council_member_role === "vereador" &&
                      user.council_member_id === vereador.id;
                    const vereadorSlotTaken =
                      selectedRole === "vereador" && !!occupiedBy && !isCurrentUserSlot;

                    return (
                      <SelectItem
                        key={vereador.id}
                        value={vereador.id}
                        disabled={vereadorSlotTaken}
                      >
                        {vereador.name} {vereador.party ? `(${vereador.party})` : ""}
                        {vereadorSlotTaken ? ` — já vinculado a ${occupiedBy}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Esse vínculo define quais encaminhamentos e manifestações o gabinete poderá
                visualizar.
                {selectedRole === "vereador" && (
                  <> Cada vereador aceita apenas um usuário com perfil Vereador.</>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <p className="text-sm font-medium mb-2">Perfil selecionado:</p>
          <div className="flex flex-wrap gap-2">
            {selectedRole ? (
              <Badge variant="outline">
                {availableRoles.find((role) => role.value === selectedRole)?.label || selectedRole}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum perfil selecionado</span>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
