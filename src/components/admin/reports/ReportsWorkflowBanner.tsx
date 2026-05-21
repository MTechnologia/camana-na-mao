import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function ReportsWorkflowBanner() {
  return (
    <details className="group rounded-xl border border-primary/20 bg-accent/40 shadow-sm">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span>Como funciona o fluxo operacional</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-primary/15 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Triagem e priorização → encaminhamento à comissão ou vereador → acompanhamento até conclusão.
          Cada mudança de status fica na linha do tempo do protocolo.
        </p>
        <Link
          to="/admin/referrals?tab=comissoes"
          className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
        >
          Ver análise de encaminhamentos
        </Link>
      </div>
    </details>
  );
}
