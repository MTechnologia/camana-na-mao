import { useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWorstServicesByDimension,
  type DimensionRankingPeriod,
} from "@/hooks/useWorstServicesByDimension";
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  type ServiceRatingDimensionKey,
} from "@/lib/serviceRatingDimensions";
import { SERVICE_TYPE_LABELS } from "@/components/icons/serviceTypeIcons";
import { ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";

const LIMIT_OPTIONS = [10, 20, 50] as const;

export default function EvaluationAnalyticsPage() {
  const [dimension, setDimension] = useState<ServiceRatingDimensionKey>("atendimento");
  const [period, setPeriod] = useState<DimensionRankingPeriod>("30d");
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, error, refresh } = useWorstServicesByDimension({
    dimension,
    period,
    limit,
  });

  return (
    <PageShell
      title="Avaliações por dimensão"
      description="Rankings dos equipamentos com menores médias em cada dimensão (notas 1 a 5), considerando apenas avaliações publicadas com preenchimento multidimensional no período selecionado."
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Período e quantidade de itens do ranking aplicam-se à dimensão selecionada.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div className="space-y-2 sm:min-w-[200px]">
              <Label htmlFor="dim-period">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as DimensionRankingPeriod)}>
                <SelectTrigger id="dim-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:min-w-[160px]">
              <Label htmlFor="dim-limit">Limite do ranking</Label>
              <Select
                value={String(limit)}
                onValueChange={(v) => setLimit(Number.parseInt(v, 10))}
              >
                <SelectTrigger id="dim-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} equipamentos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Tabs
          value={dimension}
          onValueChange={(v) => setDimension(v as ServiceRatingDimensionKey)}
          className="space-y-4"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
            {SERVICE_RATING_DIMENSION_KEYS.map((k) => (
              <TabsTrigger key={k} value={k} className="text-xs sm:text-sm">
                {SERVICE_RATING_DIMENSION_LABELS[k]}
              </TabsTrigger>
            ))}
          </TabsList>

          {SERVICE_RATING_DIMENSION_KEYS.map((k) => (
            <TabsContent key={k} value={k} className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Piores médias — {SERVICE_RATING_DIMENSION_LABELS[k]}
                  </CardTitle>
                  <CardDescription>
                    Média apenas nesta dimensão (não a nota geral). Clique no nome ou em &quot;Detalhes&quot; para
                    abrir a ficha do equipamento.
                    {dimension === k && data?.start_at ? (
                      <span className="block mt-1 text-xs">
                        Referência: a partir de {new Date(data.start_at).toLocaleString("pt-BR")}.
                      </span>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dimension === k && isLoading ? (
                    <Skeleton className="h-64 w-full rounded-md" />
                  ) : dimension === k && data?.dimension === k && !data.items.length ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nenhuma avaliação com esta dimensão preenchida no período.
                    </p>
                  ) : dimension === k && data?.dimension === k && data.items.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Equipamento</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Distrito</TableHead>
                            <TableHead className="text-right">Média (dimensão)</TableHead>
                            <TableHead className="text-right">Nº avaliações</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.items.map((row, idx) => (
                            <TableRow key={row.service_id}>
                              <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                              <TableCell>
                                <Link
                                  to={`/servico/${row.service_id}`}
                                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {row.name}
                                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {SERVICE_TYPE_LABELS[row.service_type] ?? row.service_type}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{row.district}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {row.avg_dimension.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{row.rating_count}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/servico/${row.service_id}`}>Detalhes</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">Selecione a aba para carregar o ranking.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PageShell>
  );
}
