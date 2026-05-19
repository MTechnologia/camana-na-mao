import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useReferralRoutingRules } from '@/contexts/ReferralRoutingRulesContext';
import { REFERRAL_RULE_LABELS } from '@/lib/referralRoutingRulesDefaults';
import type { ReferralRoutingRules } from '@/types/referralRoutingRules';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type ReferralRulesEditorProps = {
  /** Formulário compacto para o painel lateral do relato. */
  compact?: boolean;
  /** Inicia expandido (útil no detalhe do relato). */
  defaultExpanded?: boolean;
  onSaved?: () => void;
};

export function ReferralRulesEditor({
  compact = false,
  defaultExpanded = false,
  onSaved,
}: ReferralRulesEditorProps) {
  const { rules, updateRules, resetRules, environmentKey } = useReferralRoutingRules();
  const [expanded, setExpanded] = useState(defaultExpanded || !compact);

  const setBoolean = (key: keyof ReferralRoutingRules, value: boolean) => {
    updateRules({ [key]: value });
    onSaved?.();
  };

  const setNumber = (key: keyof ReferralRoutingRules, raw: string, min: number, max: number) => {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    updateRules({ [key]: Math.min(max, Math.max(min, n)) });
    onSaved?.();
  };

  const summary = rules.enabled
    ? `Tema ${rules.themeMatchWeight}% · Fila ${rules.loadWeight}%${
        rules.preferLowerLoad ? ' (menor fila)' : ''
      }`
    : 'Sugestão desativada — listas sem ordenação por afinidade';

  return (
    <div className="rounded-lg border border-border bg-card/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
        onClick={() => compact && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>
          <span className="font-semibold text-foreground">Regras de encaminhamento</span>
          {compact ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
          ) : null}
        </span>
        {compact ? (
          expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : null}
      </button>

      {expanded ? (
        <div className={`space-y-4 border-t border-border px-3 py-3 ${compact ? '' : 'pt-4'}`}>
          {!compact ? (
            <p className="text-sm text-muted-foreground">
              Definem como comissões e vereadores são ordenados e como o % de afinidade é calculado
              ao abrir um relato. Ambiente:{' '}
              <strong className="text-foreground">{environmentKey}</strong>.
            </p>
          ) : null}

          <ul className="space-y-3">
            {REFERRAL_RULE_LABELS.map((field) => {
              const value = rules[field.key];
              if (field.type === 'boolean') {
                return (
                  <li
                    key={field.key}
                    className="flex items-start justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Label className="text-sm font-medium">{field.label}</Label>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      checked={Boolean(value)}
                      onChange={(e) => setBoolean(field.key, e.target.checked)}
                      aria-label={field.label}
                    />
                  </li>
                );
              }
              return (
                <li key={field.key} className="space-y-1">
                  <Label htmlFor={`rule-${field.key}`}>{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  <input
                    id={`rule-${field.key}`}
                    type="number"
                    className={inputClass}
                    min={field.min}
                    max={field.max}
                    value={Number(value)}
                    onChange={(e) =>
                      setNumber(field.key, e.target.value, field.min ?? 0, field.max ?? 100)
                    }
                  />
                </li>
              );
            })}
          </ul>

          {rules.updatedAt ? (
            <p className="text-[11px] text-muted-foreground">
              Última alteração:{' '}
              {new Date(rules.updatedAt).toLocaleString('pt-BR')}
            </p>
          ) : null}

          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetRules}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
        </div>
      ) : null}
    </div>
  );
}
