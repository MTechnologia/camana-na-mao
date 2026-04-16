import { useMemo, useState } from "react";
import { Accessibility, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AccessibilityDetails = Record<string, unknown>;

interface InlineAccessibilityChecklistProps {
  onSelect: (details: AccessibilityDetails) => void;
}

const OPTIONS = [
  { key: "rampa", label: "Rampa" },
  { key: "elevador", label: "Elevador / escada rolante" },
  { key: "piso_tatil", label: "Piso tátil" },
  { key: "embarque_assistido", label: "Apoio para embarque" },
] as const;

export default function InlineAccessibilityChecklist({
  onSelect,
}: InlineAccessibilityChecklistProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const hasAnySelection = useMemo(() => {
    return Object.values(selected).some(Boolean) || details.trim().length > 0;
  }, [selected, details]);

  const handleConfirm = () => {
    if (!hasAnySelection) return;
    const payload: AccessibilityDetails = {};
    for (const option of OPTIONS) {
      if (selected[option.key]) payload[option.key] = true;
    }
    if (details.trim()) payload.observacoes = details.trim();
    setSubmitted(true);
    onSelect(payload);
  };

  if (submitted) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>Checklist de acessibilidade registrado ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Accessibility className="h-3 w-3" />
        <span>Marque o que se aplica e complemente se necessário</span>
      </div>

      <div className="space-y-2">
        {OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center gap-2">
            <Checkbox
              id={`accessibility-${option.key}`}
              checked={Boolean(selected[option.key])}
              onCheckedChange={(checked) =>
                setSelected((prev) => ({ ...prev, [option.key]: checked === true }))
              }
            />
            <Label htmlFor={`accessibility-${option.key}`} className="text-sm font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accessibility-observacoes" className="text-xs text-muted-foreground">
          Observações adicionais
        </Label>
        <Textarea
          id="accessibility-observacoes"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="resize-y min-h-[72px] text-sm"
          placeholder="Ex.: elevador parado, rampa bloqueada por obra, piso tátil interrompido..."
        />
      </div>

      <Button size="sm" onClick={handleConfirm} disabled={!hasAnySelection}>
        Confirmar acessibilidade
      </Button>
    </div>
  );
}
