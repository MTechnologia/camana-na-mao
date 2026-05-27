import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { bairroParaZona } from '@/lib/regionMapping';
import { centroidForZone } from '@/lib/saoPauloZoneCentroids';

export type WaitTimePeriod = '30d' | '90d' | '12m' | 'all';

export interface ZoneWaitTime {
  zone: string;
  count: number;
  /** Média do campo wait_time_score (1–5; maior = espera mais longa nas faixas do app). */
  avgWaitScore: number;
  lat: number;
  lng: number;
}

const PERIOD_DAYS: Record<WaitTimePeriod, number | null> = {
  '30d': 30,
  '90d': 90,
  '12m': 365,
  all: null,
};

function startDateFromPeriod(period: WaitTimePeriod): string | null {
  const days = PERIOD_DAYS[period];
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

export function useWaitTimeByZone(params: { period: WaitTimePeriod }) {
  const [zones, setZones] = useState<ZoneWaitTime[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startAt = startDateFromPeriod(params.period);
      const bucket = new Map<string, { sum: number; n: number }>();
      let truncated = false;

      for (let page = 0; page < MAX_PAGES; page += 1) {
        let query = supabase
          .from('service_ratings')
          .select('wait_time_score, public_services(district)')
          .not('wait_time_score', 'is', null)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (startAt) query = query.gte('created_at', startAt);
        const { data, error: qErr } = await query;
        if (qErr) throw qErr;
        const rows = data ?? [];
        if (rows.length === 0) break;

        for (const row of rows) {
          const score = row.wait_time_score;
          if (score == null) continue;
          const svc = Array.isArray(row.public_services)
            ? row.public_services[0]
            : row.public_services;
          const district = (svc as { district?: string | null } | null)?.district ?? null;
          const zone = bairroParaZona(district);
          const cur = bucket.get(zone) ?? { sum: 0, n: 0 };
          cur.sum += Number(score);
          cur.n += 1;
          bucket.set(zone, cur);
        }
        if (rows.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) truncated = true;
      }

      const next: ZoneWaitTime[] = [];
      for (const [zone, { sum, n }] of bucket) {
        if (n === 0) continue;
        const centroid = centroidForZone(zone);
        if (!centroid) continue;
        next.push({
          zone,
          count: n,
          avgWaitScore: sum / n,
          lat: centroid.lat,
          lng: centroid.lng,
        });
      }
      next.sort((a, b) => b.avgWaitScore - a.avgWaitScore);
      setZones(next);
      setIsTruncated(truncated);
    } catch (e) {
      console.error('[useWaitTimeByZone]', e);
      setError(e instanceof Error ? e.message : 'Erro ao carregar tempos de espera.');
      setZones([]);
      setIsTruncated(false);
    } finally {
      setIsLoading(false);
    }
  }, [params.period]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    if (zones.length === 0) {
      return {
        totalRatings: 0,
        avgScore: 0,
        worstZone: null as ZoneWaitTime | null,
        truncated: isTruncated,
      };
    }
    const totalRatings = zones.reduce((s, z) => s + z.count, 0);
    const weighted = zones.reduce((s, z) => s + z.avgWaitScore * z.count, 0);
    const worstZone = zones[0] ?? null;
    return {
      totalRatings,
      avgScore: totalRatings > 0 ? weighted / totalRatings : 0,
      worstZone,
      truncated: isTruncated,
    };
  }, [zones, isTruncated]);

  return { zones, summary, isLoading, error, refresh: fetchData };
}
