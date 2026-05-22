import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EquipmentRatingRow } from '@/hooks/useEquipmentRatingsAdmin';

const statusUi: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  published: { label: 'Publicada', variant: 'default' },
  pending_review: { label: 'Em revisão', variant: 'secondary' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
};

type EquipmentRatingsDataTableProps = {
  rows: EquipmentRatingRow[];
  loading?: boolean;
  embedded?: boolean;
  onModerate: (id: string, status: 'published' | 'rejected') => void;
};

export function EquipmentRatingsDataTable({
  rows,
  loading,
  embedded,
  onModerate,
}: EquipmentRatingsDataTableProps) {
  if (loading) {
    return (
      <div className={embedded ? 'space-y-2 px-4 pb-4 md:px-5' : 'space-y-2 p-4'}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
        Nenhuma avaliação no recorte selecionado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipamento</TableHead>
          <TableHead>Nota</TableHead>
          <TableHead>Espera</TableHead>
          <TableHead>Região</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const st = statusUi[r.publication_status] ?? {
            label: r.publication_status,
            variant: 'outline' as const,
          };
          return (
            <TableRow key={r.id}>
              <TableCell>
                <p className="font-medium">{r.service_name}</p>
                {r.rating_text ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.rating_text}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                  {r.rating_stars}
                </span>
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {r.wait_time_score != null ? `${r.wait_time_score}/5` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.district ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={st.variant}>{st.label}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                {r.publication_status === 'pending_review' ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onModerate(r.id, 'published')}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onModerate(r.id, 'rejected')}
                    >
                      Rejeitar
                    </Button>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
