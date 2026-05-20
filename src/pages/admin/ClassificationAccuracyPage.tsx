import { useClassificationAccuracyMetrics } from '@/hooks/useClassificationAccuracyMetrics';
import { ClassificationAccuracyKpiCards } from '@/components/admin/classification-accuracy/ClassificationAccuracyKpiCards';
import { PendingPredictionsTable } from '@/components/admin/classification-accuracy/PendingPredictionsTable';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import { CLASSIFICATION_ACCURACY_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

const reportTypeLabel = (t: string | null) =>
  t === 'urban' ? 'Urbano' : t === 'transport' ? 'Transporte' : t ?? '—';

export function ClassificationAccuracyPage() {
  const { accuracyBySource, recentEvaluations, predictionsPending, summary, isLoading, error, refresh } =
    useClassificationAccuracyMetrics();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Gestão
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              Acurácia da classificação
            </h1>
            <ParameterInfoListTrigger
              items={[CLASSIFICATION_ACCURACY_PAGE_LEGEND]}
              tooltipTitle="Sobre esta tela"
              ariaLabel="Ajuda sobre acurácia da classificação"
              className="h-5 w-5 shrink-0 text-[11px]"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 shadow-sm"
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
          Atualizar
        </Button>
      </header>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-destructive">Não foi possível carregar os dados</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Confirme se a migração{' '}
                <code className="rounded bg-muted px-1">report_classification_prediction_log</code> foi
                aplicada e se seu usuário tem perfil admin ou gestor.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ClassificationAccuracyKpiCards summary={summary} isLoading={isLoading} />

      <section aria-label="Fila de correção" className="space-y-3">
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-400">
                <Info className="h-5 w-5 shrink-0" aria-hidden />
                Predições aguardando correção
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                {predictionsPending.length} na fila
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Abra o relato em Relatos, ajuste categoria ou tipo e salve — a correção entra nas métricas
              abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading && predictionsPending.length === 0 ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : predictionsPending.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nenhuma predição aguardando correção no momento.
              </p>
            ) : (
              <PendingPredictionsTable rows={predictionsPending} />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Por origem da predição</CardTitle>
          <CardDescription>
            Acertos quando a fonte foi feedback automático, heurística, formulário manual, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {isLoading && accuracyBySource.length === 0 ? (
            <Skeleton className="h-48 w-full" />
          ) : accuracyBySource.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não há relatos com predição <strong>e</strong> correção posterior. Quando um gestor
              ajustar categorias no painel, os números aparecerão aqui.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Avaliados</TableHead>
                  <TableHead className="text-right">Acertos</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead className="text-right">Acurácia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accuracyBySource.map((row, idx) => (
                  <TableRow key={`${row.report_type}-${row.classification_source}-${idx}`}>
                    <TableCell>{reportTypeLabel(row.report_type)}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {row.classification_source}
                      </code>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.evaluated_reports ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.category_hits ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {row.category_misses ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.category_accuracy_pct != null ? `${row.category_accuracy_pct}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimas correções avaliadas</CardTitle>
          <CardDescription>
            Até 75 registros recentes: predição no envio vs categoria após validação
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {isLoading && recentEvaluations.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : recentEvaluations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma linha para exibir. Corrija categorias em Relatos para alimentar esta lista.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem pred.</TableHead>
                  <TableHead>Predito → Corrigido</TableHead>
                  <TableHead>Fonte correção</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="whitespace-nowrap">Data correção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvaluations.map((row, i) => (
                  <TableRow
                    key={
                      row.prediction_log_id && row.feedback_id
                        ? `${row.prediction_log_id}-${row.feedback_id}`
                        : `row-${i}`
                    }
                  >
                    <TableCell className="whitespace-nowrap">
                      {reportTypeLabel(row.report_type)}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {row.classification_source}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="text-sm">
                        <span className="font-medium">{row.predicted_category}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="font-medium">{row.corrected_category}</span>
                      </span>
                      {row.predicted_subcategory || row.corrected_subcategory ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {(row.predicted_subcategory ?? '—') + ' → ' + (row.corrected_subcategory ?? '—')}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {row.correction_source ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.category_match ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          Acerto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-destructive">
                          <XCircle className="h-4 w-4" aria-hidden />
                          Divergente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.corrected_at
                        ? new Date(row.corrected_at).toLocaleString('pt-BR')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
