import { useState } from 'react';
import { useGlobalHeatmapExtendedPeriod } from '@/hooks/useGlobalHeatmapExtendedPeriod';
import { Activity, Clock, AlertTriangle, RefreshCw, MapPinned } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { IntensityDemandMap, type IntensityMapColorBy } from '@/components/admin/IntensityDemandMap';
import { HeatmapFilterLabel } from '@/components/admin/heatmap/HeatmapFilterLabel';
import { HeatmapPanelIntro } from '@/components/admin/heatmap/HeatmapPanelIntro';
import { HeatmapVisualScale } from '@/components/admin/heatmap/HeatmapVisualScale';
import {
  useIntensityDemand,
  type IntensityScope,
  type ZoneIntensity,
} from '@/hooks/useIntensityDemand';
import {
  INTENSITY_HEATMAP_SCOPE_LEGEND,
  intensityDemandPanelLegends,
} from '@/lib/analyticsParameterLegends';

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

type Props = {
  colorBy?: IntensityMapColorBy;
};

export function IntensityDemandPanel({ colorBy = 'volume' }: Props) {
  const period = useGlobalHeatmapExtendedPeriod();
  const [scope, setScope] = useState<IntensityScope>('all');
  const [selected, setSelected] = useState<ZoneIntensity | null>(null);

  const { zones, summary, isLoading, error, refresh } = useIntensityDemand({ period, scope });

  return (
    <div className="space-y-4">
      <HeatmapPanelIntro
        intro={
          <>
            Demanda de relatos por zona da capital (urbano e/ou transporte). Passe o mouse nos
            parâmetros (<span className="font-medium text-foreground">?</span>) ou expanda a legenda
            para entender volume, tempo composto e prioridade.
          </>
        }
        legends={intensityDemandPanelLegends()}
        tooltipTitle="Parâmetros — intensidade de demanda"
        ariaLabel="Ver todos os parâmetros do mapa de intensidade de demanda"
      />

      {!isLoading && zones.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Zonas com dados" value={zones.length} />
          <KpiCard label="Total de relatos" value={summary.totalReports} />
          <KpiCard
            label="Tempo médio geral"
            value={formatHours(summary.avgWaitHours)}
            accentClass={summary.avgWaitHours >= 168 ? 'text-destructive' : 'text-amber-600'}
          />
          <KpiCard label="Zona mais crítica" value={summary.worstZone?.zone ?? '—'} accentClass="text-destructive" />
        </div>
      )}

      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-4 md:max-w-md">
            <div className="space-y-2">
              <HeatmapFilterLabel htmlFor="intensity-scope" legend={INTENSITY_HEATMAP_SCOPE_LEGEND} />
              <Select value={scope} onValueChange={(v) => setScope(v as IntensityScope)}>
                <SelectTrigger id="intensity-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Urbanos + Transporte</SelectItem>
                  <SelectItem value="urban">Apenas urbanos</SelectItem>
                  <SelectItem value="transport">Apenas transporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

        <HeatmapVisualScale variant="volume" className="mb-3" />

        {isLoading && zones.length === 0 ? (
          <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
        ) : (
          <IntensityDemandMap zones={zones} colorBy={colorBy} onSelect={setSelected} />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Referência rápida:</span>
          <Badge style={{ backgroundColor: 'hsl(120,75%,45%)', color: 'white' }}>Baixa demanda</Badge>
          <Badge style={{ backgroundColor: 'hsl(0,75%,45%)', color: 'white' }}>Alta demanda</Badge>
        </div>
      </Card>

      {zones.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4" />
            Ranking de zonas por prioridade
          </h2>
          <ul className="divide-y">
            {zones.map((z) => (
              <li
                key={z.zone}
                className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/40"
                onClick={() => setSelected(z)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(z);
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{z.zone}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {z.count} relatos · {z.resolved} resolvidos · {z.pending} pendentes
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-bold tabular-nums">{z.priorityScore}/100</div>
                  <div className="text-muted-foreground">⏱ {formatHours(z.avgWaitHours)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {selected && (
        <Card className="border-primary/40 p-4 md:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4" />
                {selected.zone}
              </h3>
              <p className="text-xs text-muted-foreground">Detalhes da zona selecionada</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <KpiCard label="Volume" value={selected.count} />
            <KpiCard label="Tempo médio" value={formatHours(selected.avgWaitHours)} />
            <KpiCard label="Score" value={`${selected.priorityScore}/100`} />
            <KpiCard
              label="% resolvido"
              value={`${selected.count > 0 ? Math.round((selected.resolved / selected.count) * 100) : 0}%`}
              accentClass="text-emerald-600"
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-bold tabular-nums ${accentClass ?? ''}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
