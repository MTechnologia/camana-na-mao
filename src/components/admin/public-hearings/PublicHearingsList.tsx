import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AudienciaRanking } from '@/hooks/useAudienciasAnalytics';

type PublicHearingsListProps = {
  items: AudienciaRanking[];
  loading?: boolean;
  embedded?: boolean;
};

export function PublicHearingsList({ items, loading, embedded }: PublicHearingsListProps) {
  if (loading) {
    return (
      <div className={embedded ? 'space-y-2 px-4 pb-4 md:px-5' : 'space-y-2 p-4'}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
        Nenhuma audiência nesta visão.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/30 md:px-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{a.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {a.comissao ?? 'Sem comissão'} ·{' '}
              {format(new Date(a.data), 'dd/MM/yyyy', { locale: ptBR })} · {a.zona}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {a.inscricoes} {a.inscricoes === 1 ? 'inscrição' : 'inscrições'}
            </Badge>
            {a.ocupacaoPct != null ? (
              <Badge variant="outline">{a.ocupacaoPct}% vagas</Badge>
            ) : null}
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to={`/audiencias/${a.id}`}>Ver detalhe</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
