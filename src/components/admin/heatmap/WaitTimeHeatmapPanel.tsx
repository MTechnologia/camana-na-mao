import { useMemo, useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { IntensityDemandMap, colorForWait } from '@/components/admin/IntensityDemandMap';
import type { ZoneIntensity } from '@/hooks/useIntensityDemand';
import { useWaitTimeByZone, type WaitTimePeriod } from '@/hooks/useWaitTimeByZone';

/** Converte score 1–5 em horas equivalentes para a escala de cor do mapa. */
function scoreToHours(score: number): number {
  return ((5 - score) / 4) * 168;
}

export function WaitTimeHeatmapPanel() {
  const [period, setPeriod] = useState<WaitTimePeriod>('90d');
  const { zones, summary, isLoading, error, refresh } = useWaitTimeByZone({ period });

  const mapZones: ZoneIntensity[] = useMemo(
    () =>
      zones.map((z) => ({
        zone: z.zone,
        count: z.count,
        avgWaitHours: scoreToHours(z.avgWaitScore),
        resolved: 0,
        pending: 0,
        rejected: 0,
        priorityScore: Math.round(z.avgWaitScore * 20),
        lat: z.lat,
        lng: z.lng,
      })),
    [zones],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Média do tempo de espera informado nas avaliações de equipamentos (campo{' '}
          <strong>wait_time_score</strong>), agregado por zona da cidade. Verde = espera menor; vermelho =
          espera maior.
        </span>
      </div>

      {!isLoading && zones.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-2xl font-bold tabular-nums">{summary.totalRatings}</div>
            <div className="mt-1 text-xs text-muted-foreground">Avaliações com tempo informado</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {summary.avgScore.toFixed(1)}/5
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Média geral do recorte</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold tabular-nums text-destructive">
              {summary.worstZone?.zone ?? '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Zona com maior tempo médio</div>
          </Card>
        </div>
      )}

      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Label htmlFor="wait-period">Período</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as WaitTimePeriod)}>
              <SelectTrigger id="wait-period" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading && zones.length === 0 ? (
          <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
        ) : (
          <IntensityDemandMap zones={mapZones} colorBy="wait" onSelect={() => undefined} />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Legenda (faixa informada):</span>
          <Badge style={{ backgroundColor: colorForWait(24), color: 'white' }}>Espera menor</Badge>
          <Badge style={{ backgroundColor: colorForWait(120), color: 'black' }}>Intermediária</Badge>
          <Badge style={{ backgroundColor: colorForWait(168), color: 'white' }}>Espera maior</Badge>
        </div>
      </Card>
    </div>
  );
}
