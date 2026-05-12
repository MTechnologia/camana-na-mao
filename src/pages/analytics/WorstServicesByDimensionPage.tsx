import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorstServicesByDimension } from '@/hooks/useWorstServicesByDimension';
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  type ServiceRatingDimensionKey,
} from '@/lib/serviceRatingDimensions';

export default function WorstServicesByDimensionPage() {
  const navigate = useNavigate();
  const { loading: roleLoading, canViewDashboards } = useUserRole();
  const [dimension, setDimension] = useState<ServiceRatingDimensionKey>('tempo_espera');
  const { data, isLoading, error, refresh } = useWorstServicesByDimension({
    dimension,
    period: '30d',
    limit: 25,
  });
  const rows = data?.items ?? [];

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[60px] max-w-4xl mx-auto px-6 py-10 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canViewDashboards) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[60px] max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground mb-6">Esta página está disponível apenas para perfis com acesso a painéis.</p>
        <Button variant="outline" onClick={() => navigate('/paineis')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Piores avaliações por dimensão" backTo="/paineis" />

      <div className="pt-[60px] pb-24 max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
        <p className="text-sm text-muted-foreground">
          Equipamentos com <strong>média mais baixa</strong> na dimensão escolhida (mínimo de 2 avaliações publicadas).
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Dimensão</span>
          <Select value={dimension} onValueChange={(v) => setDimension(v as ServiceRatingDimensionKey)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_RATING_DIMENSION_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {SERVICE_RATING_DIMENSION_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhum equipamento encontrado com dados suficientes.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Média ({SERVICE_RATING_DIMENSION_LABELS[dimension]})</TableHead>
                  <TableHead className="text-right">Nº avaliações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.service_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.district}</TableCell>
                    <TableCell className="capitalize">{r.service_type}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.avg_dimension).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.rating_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
