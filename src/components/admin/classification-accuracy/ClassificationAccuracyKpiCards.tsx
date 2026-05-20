import type { ClassificationAccuracySummary } from '@/hooks/useClassificationAccuracyMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Database } from 'lucide-react';

type ClassificationAccuracyKpiCardsProps = {
  summary: ClassificationAccuracySummary | null;
  isLoading?: boolean;
};

export function ClassificationAccuracyKpiCards({ summary, isLoading }: ClassificationAccuracyKpiCardsProps) {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Indicadores de acurácia" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <Database className="h-3.5 w-3.5" aria-hidden />
            Predições registradas
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums">{summary?.totalPredictions ?? 0}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Todos os relatos com log (chat + formulário manual)
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription>Avaliados (com correção)</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{summary?.evaluatedWithFeedback ?? 0}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Passaram por ajuste de categoria no admin ou N8N
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Acertos de categoria
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums">{summary?.globalCategoryHits ?? 0}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Predição = categoria corrigida</CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription>Taxa global (categoria)</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {summary?.globalCategoryAccuracyPct != null
              ? `${summary.globalCategoryAccuracyPct}%`
              : '—'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Sobre o subconjunto já corrigido</CardContent>
      </Card>
    </section>
  );
}
