import { CheckCircle2, ClipboardCheck, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * HU-1.6 — Quick actions de status para um encaminhamento.
 *
 * Mobile-first: botões com 44px de toque mínimo, ações principais inline no
 * card, sem precisar abrir detalhe. As transições válidas são:
 *
 *   pending  -> sent -> acknowledged -> resolved
 *
 * O componente exibe apenas as próximas transições válidas conforme o status
 * atual, evitando estados inválidos. Recebe `onChangeStatus` (vindo do
 * useReferralsVereador.updateStatus) para persistir.
 */

export type ReferralStatus = "pending" | "sent" | "acknowledged" | "resolved";

interface ReferralQuickActionsProps {
  status: ReferralStatus;
  onChangeStatus: (next: ReferralStatus) => void | Promise<void>;
  isUpdating?: boolean;
  hideSent?: boolean;
  className?: string;
  size?: "sm" | "md";
}

interface ActionConfig {
  next: ReferralStatus;
  label: string;
  icon: typeof Send;
  variant: "default" | "secondary" | "outline";
}

const NEXT_BY_STATUS: Record<ReferralStatus, ActionConfig[]> = {
  pending: [
    { next: "sent", label: "Marcar como enviado", icon: Send, variant: "outline" },
    { next: "acknowledged", label: "Confirmar recebimento", icon: ClipboardCheck, variant: "secondary" },
    { next: "resolved", label: "Marcar resolvido", icon: CheckCircle2, variant: "default" },
  ],
  sent: [
    { next: "acknowledged", label: "Confirmar recebimento", icon: ClipboardCheck, variant: "secondary" },
    { next: "resolved", label: "Marcar resolvido", icon: CheckCircle2, variant: "default" },
  ],
  acknowledged: [
    { next: "resolved", label: "Marcar resolvido", icon: CheckCircle2, variant: "default" },
  ],
  resolved: [],
};

export function ReferralQuickActions({
  status,
  onChangeStatus,
  isUpdating,
  hideSent,
  className,
  size = "md",
}: ReferralQuickActionsProps) {
  const actions = NEXT_BY_STATUS[status].filter((a) => !(hideSent && a.next === "sent"));
  if (actions.length === 0) return null;

  const buttonSize = size === "sm" ? "sm" : "default";
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Ações de status"
    >
      {actions.map((action) => {
        const Icon = isUpdating ? Loader2 : action.icon;
        return (
          <Button
            key={action.next}
            type="button"
            variant={action.variant}
            size={buttonSize}
            disabled={!!isUpdating}
            onClick={() => void onChangeStatus(action.next)}
            className={cn(
              "min-h-[44px] gap-2",
              isUpdating && "opacity-70 cursor-not-allowed",
            )}
          >
            <Icon className={cn(iconClass, isUpdating && "animate-spin")} aria-hidden="true" />
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
