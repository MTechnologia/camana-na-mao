import { PageShell } from '@/components/ui/PageShell';
import { useClassificationAccuracyMetrics } from '@/hooks/useClassificationAccuracyMetrics';
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
import { AlertTriangle, RefreshCw, Target, CheckCircle2, XCircle, Database, Info } from 'lucide-react';

const reportTypeLabel = (t: string | null) =>
  t === 'urban' ? 'Urbano' : t === 'transport' ? 'Transporte' : t ?? '—';

export function ClassificationAccuracyPage() {
  const { accuracyBySource, recentEvaluations, predictionsPending, summary, isLoading, error, refresh } =
    useClassificationAccuracyMetrics();

  return (
    <PageShell title="Acurácia da classificação" description="Predições da IA comparadas com correções no painel ou N8N.">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Acurácia da classificação (IA)
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Predições registradas no envio do relato comparadas com correções feitas no painel ou pelo
              N8N. Relatos ainda não corrigidos não entram na taxa de acerto.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Não foi possível carregar os dados</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Confirme se a migração <code className="bg-muted px-1 rounded">report_classification_prediction_log</code>{' '}
                  foi aplicada e se seu usuário tem perfil admin ou gestor.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading && !summary ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    Predições registradas
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {summary?.totalPredictions ?? 0}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Todos os relatos com log (chat + formulário manual)
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avaliados (com correção)</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {summary?.evaluatedWithFeedback ?? 0}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Passaram por ajuste de categoria no admin ou N8N
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Acertos de categoria
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {summary?.globalCategoryHits ?? 0}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Predição = categoria corrigida
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardDescription>Taxa global (categoria)</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {summary?.globalCategoryAccuracyPct != null
                      ? `${summary.globalCategoryAccuracyPct}%`
                      : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Sobre o subconjunto já corrigido
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {predictionsPending.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Info className="h-5 w-5" />
                Predições aguardando correção
              </CardTitle>
              <CardDescription>
                Para alimentar as métricas de acurácia, abra cada relato em <strong>Relatos</strong>, localize pelo
                protocolo e <strong>altere a categoria ou tipo</strong> (urbano: Categoria; transporte: Tipo). O salvamento
                grava a correção e ela entra nas tabelas abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Predição atual</TableHead>
                    <TableHead>Data registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictionsPending.map((row, i) => (
                    <TableRow key={row.report_id ?? `pending-${i}`}>
                      <TableCell className="font-mono font-medium">
                        {row.protocol_code ?? row.report_id?.slice(0, 8) + '…'}
                      </TableCell>
                      <TableCell>{reportTypeLabel(row.report_type)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {row.classification_source}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{row.predicted_category}</span>
                        {row.predicted_subcategory && (
                          <span className="text-muted-foreground text-sm ml-1">({row.predicted_subcategory})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Vá em <strong>Relatos</strong> → busque o protocolo ou filtre por data → abra o relato → altere
                Categoria (urbano) ou Tipo (transporte) → Salvar.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Por origem da predição</CardTitle>
            <CardDescription>
              Distribuição de acertos quando a fonte foi feedback automático, heurística, formulário
              manual, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading && accuracyBySource.length === 0 ? (
              <Skeleton className="h-48 w-full" />
            ) : accuracyBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Ainda não há relatos com predição <strong>e</strong> correção posterior. Quando um
                gestor ajustar categorias no painel, os números aparecerão aqui.
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
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {row.classification_source}
                        </code>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.evaluated_reports ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-700 dark:text-green-400">
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

        <Card>
          <CardHeader>
            <CardTitle>Últimas correções avaliadas</CardTitle>
            <CardDescription>
              Até 75 registros recentes: predição no envio vs categoria após validação
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading && recentEvaluations.length === 0 ? (
              <Skeleton className="h-64 w-full" />
            ) : recentEvaluations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
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
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {row.classification_source}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="text-sm">
                          <span className="font-medium">{row.predicted_category}</span>
                          <span className="text-muted-foreground mx-1">→</span>
                          <span className="font-medium">{row.corrected_category}</span>
                        </span>
                        {row.predicted_subcategory || row.corrected_subcategory ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {(row.predicted_subcategory ?? '—') +
                              ' → ' +
                              (row.corrected_subcategory ?? '—')}
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
                          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="h-4 w-4" /> Acerto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive text-sm">
                            <XCircle className="h-4 w-4" /> Divergente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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
    </PageShell>
  );
}
