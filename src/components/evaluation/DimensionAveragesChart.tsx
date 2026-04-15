import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const DIMENSION_KEYS = ["atendimento", "limpeza", "infraestrutura", "tempo_espera"] as const;

const LABELS: Record<(typeof DIMENSION_KEYS)[number], string> = {
  atendimento: "Atendimento",
  limpeza: "Limpeza",
  infraestrutura: "Infraestrutura",
  tempo_espera: "Tempo de espera",
};

export type DimensionAveragesRpcPayload = {
  atendimento: number | null;
  limpeza: number | null;
  infraestrutura: number | null;
  tempo_espera: number | null;
  sample_count: number | null;
};

type ChartRow = { key: string; name: string; media: number };

interface DimensionAveragesChartProps {
  serviceId: string | null;
  /** Quando falso, não renderiza o cartão (ex.: sem UUID resolvido). */
  enabled?: boolean;
}

export function DimensionAveragesChart({ serviceId, enabled = true }: DimensionAveragesChartProps) {
  const [payload, setPayload] = useState<DimensionAveragesRpcPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !serviceId) {
      setPayload(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.rpc("get_service_rating_dimension_averages", {
        p_service_id: serviceId,
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setLoadError(error.message);
        setPayload(null);
        return;
      }
      setPayload((data as DimensionAveragesRpcPayload) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, enabled]);

  const chartData = useMemo((): ChartRow[] => {
    if (!payload) return [];
    return DIMENSION_KEYS.map((key) => {
      const v = payload[key];
      if (v == null || Number.isNaN(Number(v))) return null;
      return { key, name: LABELS[key], media: Number(v) };
    }).filter((r): r is ChartRow => r !== null);
  }, [payload]);

  if (!enabled || !serviceId) return null;

  const sampleCount = payload?.sample_count ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Médias por dimensão</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Média das notas por aspecto nas avaliações publicadas (escala 1 a 5).
        </p>
      </div>

      {loading && <Skeleton className="h-52 w-full rounded-md" />}

      {!loading && loadError && (
        <p className="text-xs text-muted-foreground">Não foi possível carregar o gráfico agora.</p>
      )}

      {!loading && !loadError && sampleCount === 0 && (
        <p className="text-sm text-muted-foreground">
          Ainda não há avaliações publicadas com notas por dimensão para este equipamento.
        </p>
      )}

      {!loading && !loadError && sampleCount > 0 && chartData.length === 0 && (
        <p className="text-sm text-muted-foreground">
          As avaliações existentes ainda não incluem médias por dimensão agregáveis.
        </p>
      )}

      {!loading && !loadError && sampleCount > 0 && chartData.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground tabular-nums">
            Amostra: {sampleCount} avaliação{sampleCount === 1 ? "" : "ões"}
          </p>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis domain={[0, 5]} tickCount={6} width={32} tick={{ fontSize: 11 }} allowDecimals />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)} / 5`, "Média"]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar dataKey="media" name="Média" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
