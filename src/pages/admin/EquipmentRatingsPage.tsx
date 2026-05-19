import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageShell } from '@/components/ui/PageShell';
import { KpiCard } from '@/components/ui/KpiCard';
import {
  EQUIPMENT_RATINGS_KPI_LEGENDS,
  EQUIPMENT_RATINGS_PAGE_LEGEND,
} from '@/lib/analyticsParameterLegends';
import { useEquipmentRatingsAdmin } from '@/hooks/useEquipmentRatingsAdmin';
import { toast } from 'sonner';

const statusUi: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  published: { label: 'Publicada', variant: 'default' },
  pending_review: { label: 'Em revisão', variant: 'secondary' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
};

export function EquipmentRatingsPage() {
  const { rows, kpis, loading, search, setSearch, refresh, moderate } = useEquipmentRatingsAdmin();

  const onModerate = async (id: string, status: 'published' | 'rejected') => {
    try {
      await moderate(id, status);
      toast.success(status === 'published' ? 'Avaliação publicada.' : 'Avaliação rejeitada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  };

  return (
    <PageShell title="Avaliações de equipamentos" titleInfo={EQUIPMENT_RATINGS_PAGE_LEGEND}>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total no período"
          value={loading ? '—' : String(kpis.total)}
          parameter={EQUIPMENT_RATINGS_KPI_LEGENDS.total}
        />
        <KpiCard
          label="Pendentes de moderação"
          value={loading ? '—' : String(kpis.pendingModeration)}
          parameter={EQUIPMENT_RATINGS_KPI_LEGENDS.pending}
        />
        <KpiCard
          label="Tempo de espera (média)"
          value={loading || kpis.avgWaitScore == null ? '—' : `${kpis.avgWaitScore}/5`}
          parameter={EQUIPMENT_RATINGS_KPI_LEGENDS.avgWait}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar equipamento, bairro ou comentário…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma avaliação no recorte selecionado.
          </p>
        ) : (
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
                      {r.rating_text && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {r.rating_text}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
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
                      {r.publication_status === 'pending_review' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => void onModerate(r.id, 'published')}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void onModerate(r.id, 'rejected')}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </PageShell>
  );
}
