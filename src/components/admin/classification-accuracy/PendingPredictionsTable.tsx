import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PredictionsPendingRow } from '@/hooks/useClassificationAccuracyMetrics';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
const PREVIEW_COUNT = 5;

const reportTypeLabel = (t: string | null) =>
  t === 'urban' ? 'Urbano' : t === 'transport' ? 'Transporte' : t ?? '—';

type PendingPredictionsTableProps = {
  rows: PredictionsPendingRow[];
};

export function PendingPredictionsTable({ rows }: PendingPredictionsTableProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = rows.length > PREVIEW_COUNT;
  const visibleRows = expanded ? rows : rows.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, rows.length - PREVIEW_COUNT);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Predição</TableHead>
              <TableHead className="whitespace-nowrap">Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row, i) => (
              <TableRow key={row.report_id ?? `pending-${i}`}>
                <TableCell className="font-mono text-sm font-medium">
                  {row.protocol_code ?? `${row.report_id?.slice(0, 8) ?? '—'}…`}
                </TableCell>
                <TableCell className="text-sm">{reportTypeLabel(row.report_type)}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {row.classification_source}
                  </code>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium">{row.predicted_category}</span>
                  {row.predicted_subcategory ? (
                    <span className="ml-1 text-muted-foreground">({row.predicted_subcategory})</span>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {expanded
              ? `Exibindo ${rows.length} de ${rows.length}`
              : `Exibindo ${PREVIEW_COUNT} de ${rows.length}`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                Ver todas ({hiddenCount} restantes)
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'predição na fila' : 'predições na fila'}
        </p>
      )}
    </div>
  );
}
