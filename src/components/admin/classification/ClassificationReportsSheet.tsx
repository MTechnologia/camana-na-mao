import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassificationReports } from '@/hooks/useClassificationReports';
import {
  CLASSIFICATION_SHEET_TITLES,
  type ClassificationReportKind,
} from '@/lib/classificationReports';
import { CLASSIFICATION_KPI_LEGENDS } from '@/lib/analyticsParameterLegends';

type ClassificationReportsSheetProps = {
  kind: ClassificationReportKind | null;
  totalCount: number;
  onClose: () => void;
};

export function ClassificationReportsSheet({
  kind,
  totalCount,
  onClose,
}: ClassificationReportsSheetProps) {
  const { items, total, isLoading, error } = useClassificationReports(kind, totalCount);

  if (!kind) return null;

  const title = CLASSIFICATION_SHEET_TITLES[kind];
  const parameter = CLASSIFICATION_KPI_LEGENDS[kind];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Fechar painel de relatos"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="classification-reports-sheet-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2
              id="classification-reports-sheet-title"
              className="text-sm font-semibold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{parameter.description}</p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {isLoading
                ? 'Carregando…'
                : `${items.length.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} relatos`}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relato neste recorte.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((report) => (
                <li
                  key={`${report.id}-${report.createdAt}`}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{report.id}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {report.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium leading-snug text-foreground">{report.title}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div>
                      <dt className="text-muted-foreground">Categoria prevista</dt>
                      <dd className="font-medium text-foreground">{report.predictedCategory}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Confiança</dt>
                      <dd className="tabular-nums font-medium text-foreground">
                        {report.confidencePct != null ? `${report.confidencePct}%` : '—'}
                      </dd>
                    </div>
                    {report.feedbackLabel ? (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Tipo de feedback</dt>
                        <dd className="font-medium text-foreground">{report.feedbackLabel}</dd>
                      </div>
                    ) : null}
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Registrado em</dt>
                      <dd>{report.createdAt}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <Link
            to="/admin/reports"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Abrir gestão de relatos
          </Link>
        </div>
      </aside>
    </>
  );
}
