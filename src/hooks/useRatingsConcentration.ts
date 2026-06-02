import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPointInSaoPauloBounds } from "@/lib/reportsHeatmapData";

/**
 * HU-4.2 — Concentração e polarização territorial de avaliações de serviços.
 *
 * Carrega `service_ratings` agregado por `service_id` calculando média de
 * estrelas (1-5), volume e índice de polarização. Faz JOIN com
 * `public_services` para obter lat/lng/name/district/service_type.
 *
 * O resultado é uma lista de "pontos de equipamento" prontos para renderizar
 * como bolhas no mapa, com:
 *   - tamanho proporcional ao volume de avaliações
 *   - cor proporcional à média de estrelas (gradiente vermelho→amarelo→verde)
 *
 * Também expõe os pontos em formato HeatmapPoint (peso=volume) pra camada de
 * heatmap de fundo.
 */

export type RatingsPeriod = "30d" | "90d" | "12m" | "all";

export interface ServiceRatingsAggregate {
  serviceId: string;
  serviceName: string | null;
  district: string | null;
  serviceType: string | null;
  lat: number;
  lng: number;
  /** Quantidade de avaliações no período. */
  count: number;
  /** Média de estrelas (1-5). */
  avgStars: number;
  /** Distribuição de estrelas: index 0 = 1*, 4 = 5*. */
  starsDistribution: number[];
  /** Índice de polarização: % de extremos (1-2 + 4-5). 0-100. */
  polarizationIndex: number;
  /** Top 3 dimensões com pior média (apenas avg < 3.5). */
  worstDimensions: Array<{ name: string; avg: number }>;
}

const PERIOD_TO_DAYS: Record<RatingsPeriod, number | null> = {
  "30d": 30,
  "90d": 90,
  "12m": 365,
  all: null,
};

function startDateFromPeriod(period: RatingsPeriod): string | null {
  const days = PERIOD_TO_DAYS[period];
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

interface RawRating {
  service_id: string;
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  public_services: {
    name: string | null;
    district: string | null;
    service_type: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

async function fetchRawRatings(period: RatingsPeriod): Promise<RawRating[]> {
  const out: RawRating[] = [];
  const startAt = startDateFromPeriod(period);
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabase
      .from("service_ratings")
      .select(
        "service_id, rating_stars, rating_dimensions, public_services(name, district, service_type, latitude, longitude)",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startAt) query = query.gte("created_at", startAt);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      service_id: string;
      rating_stars: number;
      rating_dimensions: Record<string, number> | null;
      public_services:
        | {
            name: string | null;
            district: string | null;
            service_type: string | null;
            latitude: number | null;
            longitude: number | null;
          }
        | {
            name: string | null;
            district: string | null;
            service_type: string | null;
            latitude: number | null;
            longitude: number | null;
          }[]
        | null;
    }>;
    rows.forEach((r) => {
      const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
      out.push({
        service_id: r.service_id,
        rating_stars: r.rating_stars,
        rating_dimensions: r.rating_dimensions,
        public_services: svc,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

/**
 * Agrega lista bruta de ratings por service_id. Exposto para teste.
 */
export function aggregateRatings(
  raw: RawRating[],
  serviceTypeFilter: string | null = null,
): ServiceRatingsAggregate[] {
  type Bucket = {
    serviceId: string;
    serviceName: string | null;
    district: string | null;
    serviceType: string | null;
    lat: number;
    lng: number;
    starsSum: number;
    count: number;
    starsDist: number[]; // índices 0..4
    dimensionsSum: Map<string, { sum: number; count: number }>;
  };
  const buckets = new Map<string, Bucket>();

  raw.forEach((r) => {
    const svc = r.public_services;
    if (!svc?.latitude || !svc?.longitude) return;
    if (!isPointInSaoPauloBounds(svc.latitude, svc.longitude)) return;
    if (serviceTypeFilter && svc.service_type !== serviceTypeFilter) return;
    const stars = Math.max(1, Math.min(5, Math.round(r.rating_stars)));

    let b = buckets.get(r.service_id);
    if (!b) {
      b = {
        serviceId: r.service_id,
        serviceName: svc.name,
        district: svc.district,
        serviceType: svc.service_type,
        lat: svc.latitude,
        lng: svc.longitude,
        starsSum: 0,
        count: 0,
        starsDist: [0, 0, 0, 0, 0],
        dimensionsSum: new Map(),
      };
      buckets.set(r.service_id, b);
    }
    b.starsSum += stars;
    b.count += 1;
    b.starsDist[stars - 1] += 1;

    if (r.rating_dimensions) {
      Object.entries(r.rating_dimensions).forEach(([name, value]) => {
        const v = Number(value);
        if (Number.isNaN(v)) return;
        const slot = b!.dimensionsSum.get(name) || { sum: 0, count: 0 };
        slot.sum += v;
        slot.count += 1;
        b!.dimensionsSum.set(name, slot);
      });
    }
  });

  const result: ServiceRatingsAggregate[] = [];
  buckets.forEach((b) => {
    const avg = b.count > 0 ? b.starsSum / b.count : 0;
    const extremes = b.starsDist[0] + b.starsDist[1] + b.starsDist[3] + b.starsDist[4];
    const polarization = b.count > 0 ? Math.round((extremes / b.count) * 100) : 0;
    const worst: Array<{ name: string; avg: number }> = [];
    b.dimensionsSum.forEach((v, name) => {
      if (v.count === 0) return;
      const dimAvg = v.sum / v.count;
      if (dimAvg < 3.5) worst.push({ name, avg: dimAvg });
    });
    worst.sort((a, b) => a.avg - b.avg);
    result.push({
      serviceId: b.serviceId,
      serviceName: b.serviceName,
      district: b.district,
      serviceType: b.serviceType,
      lat: b.lat,
      lng: b.lng,
      count: b.count,
      avgStars: avg,
      starsDistribution: b.starsDist,
      polarizationIndex: polarization,
      worstDimensions: worst.slice(0, 3),
    });
  });
  result.sort((a, b) => b.count - a.count);
  return result;
}

export interface UseRatingsConcentrationResult {
  aggregates: ServiceRatingsAggregate[];
  /** Tipos de serviço presentes nos dados (para popular filtro). */
  availableServiceTypes: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Resumo geral: avg geral, polarização média, totais. */
  summary: {
    totalRatings: number;
    avgStars: number;
    avgPolarization: number;
    serviceCount: number;
  };
}

export function useRatingsConcentration(params: {
  period: RatingsPeriod;
  serviceTypeFilter: string | null;
}): UseRatingsConcentrationResult {
  const [raw, setRaw] = useState<RawRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRawRatings(params.period);
      setRaw(data);
    } catch (e) {
      console.error("[useRatingsConcentration]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar avaliações");
      setRaw([]);
    } finally {
      setIsLoading(false);
    }
  }, [params.period]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const aggregates = useMemo(
    () => aggregateRatings(raw, params.serviceTypeFilter),
    [raw, params.serviceTypeFilter],
  );

  const availableServiceTypes = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((r) => {
      const svc = r.public_services;
      if (svc?.service_type) set.add(svc.service_type);
    });
    return Array.from(set).sort();
  }, [raw]);

  const summary = useMemo(() => {
    let totalRatings = 0;
    let weightedStars = 0;
    let weightedPolarization = 0;
    aggregates.forEach((a) => {
      totalRatings += a.count;
      weightedStars += a.avgStars * a.count;
      weightedPolarization += a.polarizationIndex * a.count;
    });
    return {
      totalRatings,
      avgStars: totalRatings > 0 ? weightedStars / totalRatings : 0,
      avgPolarization: totalRatings > 0 ? weightedPolarization / totalRatings : 0,
      serviceCount: aggregates.length,
    };
  }, [aggregates]);

  return { aggregates, availableServiceTypes, isLoading, error, refresh: fetchAll, summary };
}

// Helpers exportados para teste
export const __test__ = { startDateFromPeriod, aggregateRatings };
