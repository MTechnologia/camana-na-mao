import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bairroParaZona, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-1.6 — Como assessor/vereador, quero acessar o dashboard em web e mobile
 * para monitorar resultados em campo.
 *
 * Hook focado em métricas de efetividade do gabinete:
 *   - Taxa de resolução (% de encaminhamentos com resolved_at)
 *   - Tempo médio até acknowledgement (acknowledged_at - sent_at|created_at)
 *   - Tempo médio até resolução (resolved_at - sent_at|created_at)
 *   - Timeline semanal de encaminhamentos recebidos vs resolvidos
 *   - Breakdown por categoria (do relato vinculado) e por zona da cidade
 *
 * É independente do useReferralsVereador (que serve para listar e atualizar);
 * este hook é só leitura para alimentar o dashboard.
 */

export interface GabineteAnalyticsFilters {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface GabineteTimelinePoint {
  weekStart: string;
  recebidos: number;
  resolvidos: number;
}

export interface GabineteBreakdownItem {
  label: string;
  total: number;
  resolvidos: number;
  resolutionPct: number;
}

export interface GabineteAnalyticsStats {
  total: number;
  pending: number;
  acknowledged: number;
  sent: number;
  resolved: number;
  resolutionPct: number;
  avgAckHours: number;
  avgResolutionHours: number;
  timeline: GabineteTimelinePoint[];
  byCategory: GabineteBreakdownItem[];
  byZone: GabineteBreakdownItem[];
}

const EMPTY_STATS: GabineteAnalyticsStats = {
  total: 0,
  pending: 0,
  acknowledged: 0,
  sent: 0,
  resolved: 0,
  resolutionPct: 0,
  avgAckHours: 0,
  avgResolutionHours: 0,
  timeline: [],
  byCategory: [],
  byZone: [],
};

interface ReferralRow {
  id: string;
  status: string;
  created_at: string | null;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  urban_report_id: string | null;
  transport_report_id: string | null;
  service_rating_id: string | null;
}

interface RelatoLite {
  id: string;
  category?: string | null;
  region?: string | null;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function diffHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? ms / 36e5 : null;
}

function startOfWeek(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

async function fetchReferrals(
  councilMemberId: string,
  startIso: string | null,
  endIso: string | null,
): Promise<ReferralRow[]> {
  const out: ReferralRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("council_member_referrals")
      .select(
        "id, status, created_at, sent_at, acknowledged_at, resolved_at, urban_report_id, transport_report_id, service_rating_id",
      )
      .eq("council_member_id", councilMemberId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("created_at", startIso);
    if (endIso) q = q.lte("created_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as ReferralRow[];
    rows.forEach((r) => out.push(r));
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchRelatosLite(referrals: ReferralRow[]): Promise<{
  urban: Map<string, RelatoLite>;
  transport: Map<string, RelatoLite>;
  service: Map<string, RelatoLite>;
}> {
  const urbanIds = referrals.map((r) => r.urban_report_id).filter((id): id is string => !!id);
  const transportIds = referrals
    .map((r) => r.transport_report_id)
    .filter((id): id is string => !!id);
  const serviceIds = referrals.map((r) => r.service_rating_id).filter((id): id is string => !!id);

  const urban = new Map<string, RelatoLite>();
  const transport = new Map<string, RelatoLite>();
  const service = new Map<string, RelatoLite>();

  await Promise.all([
    urbanIds.length > 0
      ? supabase
          .from("urban_reports")
          .select("id, category, neighborhood")
          .in("id", urbanIds)
          .then(({ data }) => {
            (data ?? []).forEach(
              (r: { id: string; category: string | null; neighborhood: string | null }) => {
                urban.set(r.id, { id: r.id, category: r.category, region: r.neighborhood });
              },
            );
          })
      : Promise.resolve(),
    transportIds.length > 0
      ? supabase
          .from("transport_reports")
          .select("id, sub_category, report_type, location, stop_location")
          .in("id", transportIds)
          .then(({ data }) => {
            (data ?? []).forEach(
              (r: {
                id: string;
                sub_category: string | null;
                report_type: string | null;
                location: string | null;
                stop_location: string | null;
              }) => {
                transport.set(r.id, {
                  id: r.id,
                  category: r.sub_category || r.report_type,
                  region: r.location || r.stop_location,
                });
              },
            );
          })
      : Promise.resolve(),
    serviceIds.length > 0
      ? supabase
          .from("service_ratings")
          .select("id, public_services(service_type, district)")
          .in("id", serviceIds)
          .then(({ data }) => {
            (data ?? []).forEach(
              (r: {
                id: string;
                public_services:
                  | { service_type: string | null; district: string | null }
                  | { service_type: string | null; district: string | null }[]
                  | null;
              }) => {
                const svc = Array.isArray(r.public_services)
                  ? r.public_services[0]
                  : r.public_services;
                service.set(r.id, {
                  id: r.id,
                  category: svc?.service_type ?? null,
                  region: svc?.district ?? null,
                });
              },
            );
          })
      : Promise.resolve(),
  ]);

  return { urban, transport, service };
}

function pickRelato(
  ref: ReferralRow,
  relatos: {
    urban: Map<string, RelatoLite>;
    transport: Map<string, RelatoLite>;
    service: Map<string, RelatoLite>;
  },
): RelatoLite | undefined {
  if (ref.urban_report_id) return relatos.urban.get(ref.urban_report_id);
  if (ref.transport_report_id) return relatos.transport.get(ref.transport_report_id);
  if (ref.service_rating_id) return relatos.service.get(ref.service_rating_id);
  return undefined;
}

function buildBreakdown(
  rows: Array<{ key: string; resolved: boolean }>,
  limit = 10,
): GabineteBreakdownItem[] {
  const map = new Map<string, { total: number; resolved: number }>();
  rows.forEach(({ key, resolved }) => {
    const slot = map.get(key) || { total: 0, resolved: 0 };
    slot.total += 1;
    if (resolved) slot.resolved += 1;
    map.set(key, slot);
  });
  return Array.from(map.entries())
    .map(([label, info]) => ({
      label,
      total: info.total,
      resolvidos: info.resolved,
      resolutionPct: info.total > 0 ? Math.round((info.resolved / info.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function aggregate(
  referrals: ReferralRow[],
  relatos: {
    urban: Map<string, RelatoLite>;
    transport: Map<string, RelatoLite>;
    service: Map<string, RelatoLite>;
  },
): GabineteAnalyticsStats {
  if (referrals.length === 0) return EMPTY_STATS;

  const total = referrals.length;
  const byStatus = referrals.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const resolved = byStatus.resolved || 0;
  const acknowledged = byStatus.acknowledged || 0;
  const sent = byStatus.sent || 0;
  const pending = byStatus.pending || 0;

  const ackDurations: number[] = [];
  const resDurations: number[] = [];
  referrals.forEach((r) => {
    const start = r.sent_at || r.created_at;
    if (r.acknowledged_at) {
      const h = diffHours(start, r.acknowledged_at);
      if (h !== null) ackDurations.push(h);
    }
    if (r.resolved_at) {
      const h = diffHours(start, r.resolved_at);
      if (h !== null) resDurations.push(h);
    }
  });

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const avgAckHours = avg(ackDurations);
  const avgResolutionHours = avg(resDurations);

  const timelineMap = new Map<string, { recebidos: number; resolvidos: number }>();
  referrals.forEach((r) => {
    if (!r.created_at) return;
    const week = startOfWeek(r.created_at);
    const slot = timelineMap.get(week) || { recebidos: 0, resolvidos: 0 };
    slot.recebidos += 1;
    if (r.resolved_at) slot.resolvidos += 1;
    timelineMap.set(week, slot);
  });
  const timeline: GabineteTimelinePoint[] = Array.from(timelineMap.entries())
    .map(([weekStart, v]) => ({ weekStart, ...v }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const catRows: Array<{ key: string; resolved: boolean }> = [];
  const zoneRows: Array<{ key: string; resolved: boolean }> = [];
  referrals.forEach((r) => {
    const relato = pickRelato(r, relatos);
    const isResolved = !!r.resolved_at;
    catRows.push({
      key: relato?.category?.toString().trim() || "Sem categoria",
      resolved: isResolved,
    });
    const region = relato?.region?.toString().trim();
    const zone = region ? bairroParaZona(region) : ("Não informada" as ZonaVolumeOuDesconhecida);
    zoneRows.push({ key: String(zone), resolved: isResolved });
  });

  return {
    total,
    pending,
    acknowledged,
    sent,
    resolved,
    resolutionPct: total > 0 ? Math.round((resolved / total) * 100) : 0,
    avgAckHours,
    avgResolutionHours,
    timeline,
    byCategory: buildBreakdown(catRows),
    byZone: buildBreakdown(zoneRows, 6),
  };
}

export function useGabineteAnalytics(
  councilMemberId: string | null,
  filters: GabineteAnalyticsFilters = {},
) {
  const [stats, setStats] = useState<GabineteAnalyticsStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodKey = useMemo(() => {
    return `${toIso(filters.startDate) || ""}|${toIso(filters.endDate) || ""}`;
  }, [filters.startDate, filters.endDate]);

  const fetchData = useCallback(async () => {
    if (!councilMemberId) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const referrals = await fetchReferrals(
        councilMemberId,
        toIso(filters.startDate),
        toIso(filters.endDate),
      );
      const relatos = await fetchRelatosLite(referrals);
      setStats(aggregate(referrals, relatos));
    } catch (err) {
      console.error("[useGabineteAnalytics] fetch error", err);
      setError("Não foi possível carregar as métricas do gabinete. Tente novamente.");
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [councilMemberId, filters.startDate, filters.endDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, periodKey, councilMemberId]);

  return { stats, isLoading, error, refresh: fetchData };
}

export const __test__ = {
  aggregate,
  buildBreakdown,
  diffHours,
  startOfWeek,
};
