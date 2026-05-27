import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bairroParaZona, ZONA_DESCONHECIDA } from "@/lib/regionMapping";
import { centroidForZone, SP_ZONE_CENTROIDS } from "@/lib/saoPauloZoneCentroids";

/**
 * HU-4.3 — Mapa de intensidade de demanda × tempo de espera por zona.
 *
 * Combina volume de relatos (urban + transport) com tempo composto de espera
 * para identificar zonas onde a ação é prioritária (alta demanda + alta espera).
 *
 * Tempo de espera por relato (em horas) usa média ponderada:
 *   - 50% tempo de resolução (updated_at - created_at quando status=resolved)
 *   - 30% tempo até primeira resposta (responded_at - created_at, ou
 *     first_response_time quando disponível)
 *   - 20% tempo decorrido em pendente (now - created_at quando ainda aberto)
 *
 * Quando uma das parcelas não se aplica (ex: relato resolvido sem
 * primeira resposta registrada), o peso é redistribuído entre as
 * parcelas disponíveis.
 */

export type IntensityPeriod = "30d" | "90d" | "12m" | "all";
export type IntensityScope = "all" | "urban" | "transport";

export interface ZoneIntensity {
  zone: string;
  count: number;
  /** Tempo médio composto em horas. */
  avgWaitHours: number;
  /** Total resolvidos / pendentes / outros */
  resolved: number;
  pending: number;
  rejected: number;
  /** Score de prioridade 0-100 (volume normalizado × tempo normalizado). */
  priorityScore: number;
  /** Coordenadas do centroide da zona. */
  lat: number;
  lng: number;
}

interface RawReport {
  source: "urban" | "transport";
  zone: string;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  respondedAt: string | null;
  /** Em segundos, quando disponível. */
  firstResponseSeconds: number | null;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

const PERIOD_DAYS: Record<IntensityPeriod, number | null> = {
  "30d": 30,
  "90d": 90,
  "12m": 365,
  all: null,
};

function startDateFromPeriod(period: IntensityPeriod): string | null {
  const days = PERIOD_DAYS[period];
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isResolved(status: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "resolved" || s === "resolvido" || s === "concluido" || s === "concluído";
}
function isRejected(status: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "rejected" || s === "rejeitado";
}

function diffHours(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const t1 = new Date(later).getTime();
  const t2 = new Date(earlier).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  if (t1 < t2) return null;
  return (t1 - t2) / (1000 * 3600);
}

/**
 * Calcula tempo de espera composto (em horas) para um relato.
 * Exportada para teste.
 */
export function compositeWaitHours(r: RawReport): number | null {
  const resolvedTime = isResolved(r.status)
    ? diffHours(r.updatedAt, r.createdAt)
    : null;
  let firstRespTime: number | null = null;
  if (r.firstResponseSeconds !== null) {
    firstRespTime = r.firstResponseSeconds / 3600;
  } else {
    firstRespTime = diffHours(r.respondedAt, r.createdAt);
  }
  const pendingTime =
    !isResolved(r.status) && !isRejected(r.status)
      ? diffHours(new Date().toISOString(), r.createdAt)
      : null;

  // Pesos originais
  const weights = { resolved: 0.5, firstResp: 0.3, pending: 0.2 };
  let total = 0;
  let totalWeight = 0;
  if (resolvedTime !== null) {
    total += resolvedTime * weights.resolved;
    totalWeight += weights.resolved;
  }
  if (firstRespTime !== null) {
    total += firstRespTime * weights.firstResp;
    totalWeight += weights.firstResp;
  }
  if (pendingTime !== null) {
    total += pendingTime * weights.pending;
    totalWeight += weights.pending;
  }
  if (totalWeight === 0) return null;
  return total / totalWeight;
}

/** Parser de Postgres interval em string para segundos (best-effort). */
function parsePgInterval(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value > 0 ? value : null;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    const days = Number(v.days ?? 0);
    const seconds = Number(v.seconds ?? 0);
    const hours = Number(v.hours ?? 0);
    const minutes = Number(v.minutes ?? 0);
    const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  }
  if (typeof value === "string") {
    // Formatos típicos: "01:23:45", "1 day 02:30:00", "00:30:15.123"
    const dayMatch = /^(\d+)\s*days?\s*(.*)$/.exec(value);
    let extraSec = 0;
    let rest = value;
    if (dayMatch) {
      extraSec += Number(dayMatch[1]) * 86400;
      rest = dayMatch[2] || "00:00:00";
    }
    const hms = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(rest.trim());
    if (hms) {
      const total = extraSec + Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
      return total > 0 ? total : null;
    }
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

async function fetchUrban(period: IntensityPeriod): Promise<{ reports: RawReport[]; truncated: boolean }> {
  const out: RawReport[] = [];
  const startAt = startDateFromPeriod(period);
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("urban_reports")
      .select("status, neighborhood, latitude, longitude, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startAt) q = q.gte("created_at", startAt);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      status: string | null;
      neighborhood: string | null;
      latitude: number | null;
      longitude: number | null;
      created_at: string | null;
      updated_at: string | null;
    }>;
    rows.forEach((r) => {
      const zone = bairroParaZona(r.neighborhood ?? "", r.latitude, r.longitude);
      if (zone === ZONA_DESCONHECIDA) return;
      out.push({
        source: "urban",
        zone: String(zone),
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        respondedAt: null,
        firstResponseSeconds: null,
      });
    });
    if (rows.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  return { reports: out, truncated };
}

async function fetchTransport(period: IntensityPeriod): Promise<{ reports: RawReport[]; truncated: boolean }> {
  const out: RawReport[] = [];
  const startAt = startDateFromPeriod(period);
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("transport_reports")
      .select(
        "status, location, stop_location, responded_at, first_response_time, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startAt) q = q.gte("created_at", startAt);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      status: string | null;
      location: string | null;
      stop_location: string | null;
      responded_at: string | null;
      first_response_time: unknown;
      created_at: string | null;
      updated_at: string | null;
    }>;
    rows.forEach((r) => {
      const text = r.location || r.stop_location || "";
      const zone = bairroParaZona(text);
      if (zone === ZONA_DESCONHECIDA) return;
      out.push({
        source: "transport",
        zone: String(zone),
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        respondedAt: r.responded_at,
        firstResponseSeconds: parsePgInterval(r.first_response_time),
      });
    });
    if (rows.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  return { reports: out, truncated };
}

/**
 * Agrega lista bruta por zona, calcula avg wait e priorityScore.
 * Exportado para teste.
 */
export function aggregateByZone(reports: RawReport[]): ZoneIntensity[] {
  type Bucket = {
    zone: string;
    count: number;
    waitSum: number;
    waitCount: number;
    resolved: number;
    pending: number;
    rejected: number;
  };
  const buckets = new Map<string, Bucket>();
  reports.forEach((r) => {
    let b = buckets.get(r.zone);
    if (!b) {
      b = { zone: r.zone, count: 0, waitSum: 0, waitCount: 0, resolved: 0, pending: 0, rejected: 0 };
      buckets.set(r.zone, b);
    }
    b.count += 1;
    if (isResolved(r.status)) b.resolved += 1;
    else if (isRejected(r.status)) b.rejected += 1;
    else b.pending += 1;
    const wait = compositeWaitHours(r);
    if (wait !== null) {
      b.waitSum += wait;
      b.waitCount += 1;
    }
  });

  const totalCount = Array.from(buckets.values()).reduce((acc, b) => acc + b.count, 0);
  const maxAvgWait = Math.max(
    ...Array.from(buckets.values()).map((b) => (b.waitCount > 0 ? b.waitSum / b.waitCount : 0)),
    1,
  );

  const result: ZoneIntensity[] = [];
  buckets.forEach((b) => {
    const centroid = centroidForZone(b.zone);
    if (!centroid) return;
    const avgWait = b.waitCount > 0 ? b.waitSum / b.waitCount : 0;
    const volumeNorm = totalCount > 0 ? b.count / totalCount : 0;
    const waitNorm = maxAvgWait > 0 ? avgWait / maxAvgWait : 0;
    // Score: prioridade 0-100. Pesos 50/50 entre demanda e tempo.
    const priorityScore = Math.round((volumeNorm * 0.5 + waitNorm * 0.5) * 100);
    result.push({
      zone: b.zone,
      count: b.count,
      avgWaitHours: avgWait,
      resolved: b.resolved,
      pending: b.pending,
      rejected: b.rejected,
      priorityScore,
      lat: centroid.lat,
      lng: centroid.lng,
    });
  });

  // Inclui zonas sem dados pra mostrar "vazias" no mapa? Não — só as que têm dados.
  result.sort((a, b) => b.priorityScore - a.priorityScore);
  return result;
}

export interface UseIntensityDemandResult {
  zones: ZoneIntensity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  summary: {
    totalReports: number;
    avgWaitHours: number;
    worstZone: ZoneIntensity | null;
    truncated: boolean;
  };
}

export function useIntensityDemand(params: {
  period: IntensityPeriod;
  scope: IntensityScope;
}): UseIntensityDemandResult {
  const [reports, setReports] = useState<RawReport[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [urban, transport] = await Promise.all([
        params.scope === "all" || params.scope === "urban"
          ? fetchUrban(params.period)
          : Promise.resolve({ reports: [] as RawReport[], truncated: false }),
        params.scope === "all" || params.scope === "transport"
          ? fetchTransport(params.period)
          : Promise.resolve({ reports: [] as RawReport[], truncated: false }),
      ]);
      setReports([...urban.reports, ...transport.reports]);
      setIsTruncated(urban.truncated || transport.truncated);
    } catch (e) {
      console.error("[useIntensityDemand]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar intensidade de demanda");
      setReports([]);
      setIsTruncated(false);
    } finally {
      setIsLoading(false);
    }
  }, [params.period, params.scope]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const zones = useMemo(() => aggregateByZone(reports), [reports]);

  const summary = useMemo(() => {
    const totalReports = zones.reduce((acc, z) => acc + z.count, 0);
    const totalWaitWeighted = zones.reduce((acc, z) => acc + z.avgWaitHours * z.count, 0);
    const avgWaitHours = totalReports > 0 ? totalWaitWeighted / totalReports : 0;
    return {
      totalReports,
      avgWaitHours,
      worstZone: zones[0] ?? null,
      truncated: isTruncated,
    };
  }, [zones, isTruncated]);

  return { zones, isLoading, error, refresh: fetchAll, summary };
}

// Helpers para teste
export const __test__ = { compositeWaitHours, aggregateByZone, parsePgInterval, SP_ZONE_CENTROIDS };
