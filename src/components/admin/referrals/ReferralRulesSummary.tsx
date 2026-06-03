import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferralRoutingRules } from "@/contexts/ReferralRoutingRulesContext";

type ReferralRulesSummaryProps = {
  className?: string;
};

export function ReferralRulesSummary({ className }: ReferralRulesSummaryProps) {
  const { rules } = useReferralRoutingRules();

  const summary = rules.enabled
    ? `Sugestão ativa: tema ${rules.themeMatchWeight}% · fila ${rules.loadWeight}%${
        rules.preferLowerLoad ? " (prefere menor fila)" : ""
      }`
    : "Sugestão desativada — destinos sem ordenação por afinidade";

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Regras de encaminhamento inteligente</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
        <Link to="/admin/settings/referral-rules">
          <Settings2 className="h-4 w-4" />
          Editar regras
        </Link>
      </Button>
    </div>
  );
}
