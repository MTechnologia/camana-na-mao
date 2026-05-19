import { AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReportsWorkflowBanner() {
  return (
    <div className="rounded-xl border border-primary/20 bg-accent/50 px-4 py-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Como funciona o fluxo</p>
            <p className="mt-1 text-muted-foreground">
              Primeiro triagem e priorização; depois encaminhamento à comissão ou vereador. Cada
              alteração de status aparece na linha do tempo do protocolo.
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
              <li>Triar e priorizar na fila</li>
              <li>Encaminhar à comissão temática (e vereador quando aplicável)</li>
              <li>Acompanhar até conclusão</li>
            </ol>
          </div>
        </div>
        <Link
          to="/admin/referrals?tab=comissoes"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Análise de encaminhamentos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
