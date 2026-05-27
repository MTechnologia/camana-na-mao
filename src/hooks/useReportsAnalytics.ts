import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { getAnalyticsRealtimeTables } from '@/lib/analyticsRealtimeTables';
import type { DemographicData } from '@/components/analytics/DemographicsPieChart';
import type { FunnelStep } from '@/components/analytics/EngagementFunnel';
import type { TopReport } from '@/components/analytics/TopReportsList';
import type { PatternAlert } from '@/components/analytics/PatternAlerts';
import {
  AGE_GROUP_LABELS,
  GENDER_LABELS,
  RACE_LABELS,
  SOCIAL_CLASS_LABELS,
} from "@/lib/demographicDrill";
import {
  categoryDbValuesForRpc,
  hasCategoryFilterTargets,
  resolveGlobalCategoryFilter,
} from '@/lib/globalCategoryFilter';
import {
  applyVolumeTerritoryZones,
  buildResponseTimeDrillStats,
  EMPTY_RESPONSE_TIME_DRILL,
  fetchTriageResolvedAtMap,
  filterResponseTimeRecords,
  recordsFromTerritoryGeoRows,
  type ResponseTimeDrillStats,
} from '@/lib/responseTimeAggregates';
import { normalizeCitizenReportStatus } from '@/lib/citizenReportStatus';
import type { RegionPatternSummary } from '@/types/analyticsDrill';
import { callGetReportsWithDemographics } from '@/lib/reportsDemographicsRpc';
import { regionLabel } from '@/lib/analyticsLabels';
import {
  buildNeighborhoodBreakdownFromGeoRows,
  buildStreetBreakdownFromGeoRows,
  buildTimelineFromUrbanReports,
  buildVolumeByZoneFromGeoRows,
  filterGeoRowsByRegion,
  buildCategoryDistributionFromTerritoryRows,
  buildTerritoryPatternSummaries,
  filterUrbanReportsByRegion,
  patternsFromCategories,
  type GeoReportRow,
  type TerritoryGeoRow,
  type UrbanReportRow,
} from '@/lib/reportsAnalyticsAggregates';

function normalizeSeverityBucket(value: unknown): 'critical' | 'high' | 'medium' | 'low' | null {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!raw) return null;
  if (raw === 'critical' || raw === 'critico' || raw === 'critica') return 'critical';
  if (raw === 'high' || raw === 'alto' || raw === 'alta') return 'high';
  if (raw === 'medium' || raw === 'medio' || raw === 'media') return 'medium';
  if (raw === 'low' || raw === 'baixo' || raw === 'baixa') return 'low';
  return null;
}

function sentimentToScore(value: unknown): number | null {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!raw) return null;
  if (raw === 'positive' || raw === 'positivo') return 100;
  if (raw === 'negative' || raw === 'negativo') return 0;
  if (raw === 'neutral' || raw === 'neutro') return 50;
  return null;
}

export interface ReportsAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  severity?: string;
  status?: string;
  /** Restringe fontes a relatos urbanos (página de análise dedicada). */
  scope?: 'urban_only';
  region?: string;
  // Demographic filters
  gender?: string;
  race?: string;
  socialClass?: string;
  ageGroup?: string;
}

export interface TimelineDataPoint {
  date: string;
  urban: number;
  transport: number;
  evaluation: number;
  total: number;
  /** Resolvidos no dia (relatos urbanos). */
  resolved?: number;
}

export interface ReportsAnalyticsStats {
  // Geral
  total: number;
  urban: number;
  transport: number;
  evaluation: number;
  pending: number;
  resolved: number;
  critical: number;
  trend: number;
  
  // REAL Trends (calculated from data)
  resolvedTrend: number;
  criticalTrend: number;
  pendingTrend: number;
  
  // Temporal
  timeline: TimelineDataPoint[];
  
  // Status
  byStatus: { status: string; count: number; color: string }[];
  
  // Categorias
  categories: { category: string; count: number }[];
  
  // Demografia
  demographics: {
    byGender: DemographicData[];
    byRace: DemographicData[];
    bySocialClass: DemographicData[];
    byAgeGroup: DemographicData[];
    byRegion: { region: string; count: number; sentiment: number }[];
  };
  
  // Engajamento
  engagement: {
    totalLikes: number;
    totalComments: number;
    avgLikesPerReport: number;
    avgCommentsPerReport: number;
    likesTrend: number;
    commentsTrend: number;
    topReports: TopReport[];
    conversionFunnel: FunnelStep[];
  };
  
  /** Volume por zona (coords + bairro dos relatos no recorte). */
  volumeByZone: { zone: string; count: number }[];

  /** Bairros/locais por zona — base do drill-down por distrito (volume). */
  neighborhoodBreakdown: { neighborhood: string; zone: string; count: number }[];

  /** Logradouros por bairro/zona — drill cidade → região → bairro → rua (HU-3.1). */
  streetBreakdown: { street: string; neighborhood: string; zone: string; count: number }[];

  /** HU-2.2 — tempo médio até resposta/resolução (relatos resolvidos no recorte). */
  responseTime: ResponseTimeDrillStats;

  /** Tema recorrente por bairro/local no recorte (agregado dos relatos filtrados). */
  territoryPatterns: RegionPatternSummary[];

  // Criticidade
  criticality: {
    criticalScore: number;
    bySeverity: { severity: string; count: number; percentage: number; color?: string }[];
    patterns: PatternAlert[];
    criticalPendingReports: PatternAlert[];
  };
}

const emptyStats: ReportsAnalyticsStats = {
  total: 0,
  urban: 0,
  transport: 0,
  evaluation: 0,
  pending: 0,
  resolved: 0,
  critical: 0,
  trend: 0,
  resolvedTrend: 0,
  criticalTrend: 0,
  pendingTrend: 0,
  timeline: [],
  byStatus: [],
  categories: [],
  volumeByZone: [],
  neighborhoodBreakdown: [],
  streetBreakdown: [],
  territoryPatterns: [],
  demographics: {
    byGender: [],
    byRace: [],
    bySocialClass: [],
    byAgeGroup: [],
    byRegion: [],
  },
  engagement: {
    totalLikes: 0,
    totalComments: 0,
    avgLikesPerReport: 0,
    avgCommentsPerReport: 0,
    likesTrend: 0,
    commentsTrend: 0,
    topReports: [],
    conversionFunnel: [],
  },
  criticality: {
    criticalScore: 0,
    bySeverity: [],
    patterns: [],
    criticalPendingReports: [],
  },
  responseTime: EMPTY_RESPONSE_TIME_DRILL,
};

export const useReportsAnalytics = (filters: ReportsAnalyticsFilters = {}) => {
  const [stats, setStats] = useState<ReportsAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isFirstLoadRef = useRef(true);

  // Serializar filters para comparação estável
  const filtersKey = JSON.stringify(filters);

  const fetchAnalytics = useCallback(async (isMounted: boolean = true) => {
    try {
      if (!isMounted) return;
      const showSpinner = isFirstLoadRef.current;
      if (showSpinner) setIsLoading(true);
      setError(null);

      // Mapear filtros para o formato do banco
      const ageGroupMap: Record<string, string> = {
        '< 18': 'under_18',
        '18-24': '18_24',
        '25-34': '25_34',
        '35-44': '35_44',
        '45-54': '45_54',
        '55-64': '55_64',
        '65+': '65_plus',
        'Não informado': 'not_informed',
      };

      const mappedAgeGroup = filters.ageGroup 
        ? ageGroupMap[filters.ageGroup] || filters.ageGroup
        : null;

      const mappedGender = filters.gender === 'Não informado' 
        ? 'not_informed' 
        : filters.gender || null;

      const mappedRace = filters.race === 'Não informado' 
        ? 'not_informed' 
        : filters.race || null;

      const mappedSocialClass = filters.socialClass === 'Não informado' 
        ? 'not_informed' 
        : filters.socialClass || null;

      // Converter datas para ISO (TIMESTAMPTZ compatível)
      const startDateISO = filters.startDate ? new Date(filters.startDate).toISOString() : null;
      const endDateISO = filters.endDate ? new Date(filters.endDate).toISOString() : null;

      const urbanOnly = filters.scope === 'urban_only';
      const categorySlice = resolveGlobalCategoryFilter(filters.category);
      const pCategories = categorySlice.isAll
        ? null
        : urbanOnly
          ? categorySlice.urbanCategories.length > 0
            ? categorySlice.urbanCategories
            : null
          : categoryDbValuesForRpc(categorySlice);

      const hasCategoryTargets = urbanOnly
        ? categorySlice.isAll || categorySlice.urbanCategories.length > 0
        : hasCategoryFilterTargets(categorySlice);

      if (!categorySlice.isAll && !hasCategoryTargets) {
        if (isMounted) {
          setStats(emptyStats);
          setIsLoading(false);
        }
        return;
      }

      const {
        data: rpcResult,
        error: rpcError,
        statusFilterInRpc,
      } = await callGetReportsWithDemographics({
        p_gender: mappedGender,
        p_race: mappedRace,
        p_social_class: mappedSocialClass,
        p_age_group: mappedAgeGroup,
        p_report_type: urbanOnly ? 'urban' : null,
        p_start_date: startDateISO,
        p_end_date: endDateISO,
        p_categories: pCategories,
        p_status: filters.status ?? null,
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        if (isMounted) {
          setError('Não foi possível carregar os dados de análise.');
          setStats(emptyStats);
          setIsLoading(false);
        }
        return;
      }

      const demographicsFromRpc = rpcResult as Record<string, unknown>;

      let total = Number(demographicsFromRpc?.total) || 0;
      let urbanCount = Number(demographicsFromRpc?.urban_count) || 0;
      let transportCount = Number(demographicsFromRpc?.transport_count) || 0;
      let evaluationCount = Number(demographicsFromRpc?.evaluation_count) || 0;
      let critical = Number(demographicsFromRpc?.critical_count) || 0;
      let pending = Number(demographicsFromRpc?.pending_count) || 0;
      let resolved = Number(demographicsFromRpc?.resolved_count) || 0;
      
      // Processar demographics
      const demoData = demographicsFromRpc?.demographics || {};
      
      const byGender: DemographicData[] = Object.entries(demoData.gender || {})
        .map(([key, count]) => ({
          key,
          label: GENDER_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byRace: DemographicData[] = Object.entries(demoData.race || {})
        .map(([key, count]) => ({
          key,
          label: RACE_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const bySocialClass: DemographicData[] = Object.entries(demoData.social_class || {})
        .map(([key, count]) => ({
          key,
          label: SOCIAL_CLASS_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byAgeGroup: DemographicData[] = Object.entries(demoData.age_group || {})
        .map(([key, count]) => ({
          key,
          label: AGE_GROUP_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      // Processar categorias (RPC; pode ser substituído pelos relatos filtrados no território)
      let categories = (demographicsFromRpc?.category_distribution || [])
        .map((c: { category?: string; count?: number }) => ({ category: c.category || 'Outros', count: c.count || 0 }));

      // Processar regiões
      const byRegion = (demographicsFromRpc?.neighborhood_distribution || [])
        .map((n: { neighborhood?: string; count?: number }) => ({
          region: n.neighborhood || 'Não especificado',
          count: Number(n.count) || 0,
          sentiment: 50,
        }));

      // Processar status
      const statusData = demographicsFromRpc?.status_distribution || [];
      const statusMap = new Map<string, number>(
        statusData.map((s: { status?: string; count?: number }) => [s.status ?? '', Number(s.count) || 0])
      );
      
      let byStatus = [
        { status: 'Pendente', count: statusMap.get('pending') || 0, color: 'hsl(var(--chart-3))' },
        { status: 'Em Análise', count: statusMap.get('in_progress') || 0, color: 'hsl(var(--chart-2))' },
        { status: 'Resolvido', count: statusMap.get('resolved') || 0, color: 'hsl(var(--chart-1))' },
        { status: 'Rejeitado', count: statusMap.get('rejected') || 0, color: 'hsl(var(--chart-5))' },
      ];

      // Calcular severidade (ajustada depois com base nos relatos filtrados).
      let criticalScore = total > 0 ? (critical / total) * 100 : 0;
      const bySeverity = [
        { severity: 'Crítico', count: critical, percentage: criticalScore, color: 'hsl(var(--chart-5))' },
        { severity: 'Alto', count: 0, percentage: 0, color: 'hsl(var(--chart-3))' },
        { severity: 'Médio', count: 0, percentage: 0, color: 'hsl(var(--chart-2))' },
        { severity: 'Baixo', count: 0, percentage: 0, color: 'hsl(var(--chart-1))' },
      ];

      // Relatos urbanos no recorte (timeline, engajamento e padrões)
      let urbanReports: Record<string, unknown>[] = [];
      let urbanForTimeline: UrbanReportRow[] = [];
      let timeline: TimelineDataPoint[] = [];
      let patternAlerts: PatternAlert[] = patternsFromCategories(categories);
      let territoryPatterns: RegionPatternSummary[] = [];
      let volumeByZone: { zone: string; count: number }[] = [];
      let neighborhoodBreakdown: { neighborhood: string; zone: string; count: number }[] = [];
      let streetBreakdown: { street: string; neighborhood: string; zone: string; count: number }[] = [];

      let responseTime: ResponseTimeDrillStats = EMPTY_RESPONSE_TIME_DRILL;

      try {
        const geoRows: GeoReportRow[] = [];
        const territoryGeoRows: TerritoryGeoRow[] = [];
        const includeUrban =
          categorySlice.isAll || categorySlice.urbanCategories.length > 0;
        const includeTransport =
          !urbanOnly &&
          (categorySlice.isAll || categorySlice.transportSubcategories.length > 0);
        const includeEvaluations =
          !urbanOnly &&
          (categorySlice.isAll || categorySlice.publicServiceTypes.length > 0);

        if (includeUrban) {
          let urbanQuery = supabase
            .from('urban_reports')
            .select(`
            id, description, category, location_address, status, created_at, updated_at, severity, neighborhood,
            street, street_number, latitude, longitude,
            urban_report_likes(count),
            urban_report_comments(count)
          `)
            .order('created_at', { ascending: true })
            .limit(3000);

          if (filters.startDate) {
            urbanQuery = urbanQuery.gte('created_at', `${filters.startDate}T00:00:00`);
          }
          if (filters.endDate) {
            urbanQuery = urbanQuery.lte('created_at', `${filters.endDate}T23:59:59`);
          }
          if (!categorySlice.isAll) {
            urbanQuery = urbanQuery.in('category', categorySlice.urbanCategories);
          }
          if (filters.status) {
            urbanQuery = urbanQuery.eq('status', filters.status);
          }

          const { data: urbanData } = await urbanQuery;
          urbanReports = urbanData || [];
        }

        urbanForTimeline = filterUrbanReportsByRegion(
          urbanReports as UrbanReportRow[],
          filters.region,
        );
        timeline = buildTimelineFromUrbanReports(urbanForTimeline);

        urbanForTimeline.forEach((r) => {
          const geo = {
            neighborhood: r.neighborhood,
            location: r.location_address ?? null,
            latitude: r.latitude ?? null,
            longitude: r.longitude ?? null,
          };
          geoRows.push(geo);
          territoryGeoRows.push({
            ...geo,
            id: r.id,
            source: 'urbano',
            status: r.status,
            category: r.category,
            created_at: r.created_at,
            updated_at: r.updated_at ?? null,
            street: (r.street as string | null) ?? null,
            street_number: (r.street_number as string | null) ?? null,
          });
        });

        if (includeTransport) {
          let transportQuery = supabase
            .from('transport_reports')
            .select(
              'id, location, stop_location, stop_name, sub_category, report_type, status, created_at, updated_at, responded_at, ai_sentiment',
            )
            .order('created_at', { ascending: true })
            .limit(3000);
          if (filters.startDate) {
            transportQuery = transportQuery.gte('created_at', `${filters.startDate}T00:00:00`);
          }
          if (filters.endDate) {
            transportQuery = transportQuery.lte('created_at', `${filters.endDate}T23:59:59`);
          }
          if (!categorySlice.isAll) {
            const orParts = categorySlice.transportSubcategories.flatMap((sc) => [
              `sub_category.eq.${sc}`,
              `report_type.eq.${sc}`,
            ]);
            transportQuery = transportQuery.or(orParts.join(','));
          }
          const { data: transportData } = await transportQuery;
          (transportData ?? []).forEach((t) => {
            const location =
              [(t.stop_name as string), (t.location as string), (t.stop_location as string)]
                .filter(Boolean)
                .join(' — ') || null;
            const geo = {
              neighborhood: (t.stop_name as string) || null,
              location,
            };
            geoRows.push(geo);
            territoryGeoRows.push({
              ...geo,
              id: t.id as string,
              source: 'transporte',
              status: t.status as string,
              category: (t.sub_category as string) || (t.report_type as string),
              ai_sentiment: (t.ai_sentiment as string) ?? null,
              reportType: t.report_type as string,
              created_at: t.created_at as string,
              updated_at: (t.updated_at as string) ?? null,
              responded_at: (t.responded_at as string) ?? null,
            });
          });
        }

        if (includeEvaluations) {
          let evalQuery = supabase
            .from('service_ratings')
            .select(
              'created_at, public_services!inner(district, latitude, longitude, address, service_type)',
            )
            .eq('publication_status', 'published')
            .order('created_at', { ascending: true })
            .limit(3000);
          if (filters.startDate) {
            evalQuery = evalQuery.gte('created_at', `${filters.startDate}T00:00:00`);
          }
          if (filters.endDate) {
            evalQuery = evalQuery.lte('created_at', `${filters.endDate}T23:59:59`);
          }
          if (!categorySlice.isAll) {
            evalQuery = evalQuery.in(
              'public_services.service_type',
              categorySlice.publicServiceTypes,
            );
          }
          const { data: evalData } = await evalQuery;
          (evalData ?? []).forEach((row) => {
            const ps = row.public_services as {
              district?: string | null;
              latitude?: number | null;
              longitude?: number | null;
              address?: string | null;
            } | null;
            geoRows.push({
              neighborhood: ps?.district ?? null,
              location: ps?.address ?? null,
              latitude: ps?.latitude ?? null,
              longitude: ps?.longitude ?? null,
            });
          });
        }

        const geoForTerritory = filterGeoRowsByRegion(geoRows, filters.region);
        volumeByZone = buildVolumeByZoneFromGeoRows(geoForTerritory).map((z) => ({
          zone: z.zone,
          count: z.count,
        }));
        neighborhoodBreakdown = buildNeighborhoodBreakdownFromGeoRows(geoForTerritory).map((r) => ({
          neighborhood: r.neighborhood,
          zone: r.zone,
          count: r.count,
        }));
        streetBreakdown = buildStreetBreakdownFromGeoRows(
          filterGeoRowsByRegion(territoryGeoRows, filters.region) as TerritoryGeoRow[],
        ).map((r) => ({
          street: r.street,
          neighborhood: r.neighborhood,
          zone: r.zone,
          count: r.count,
        }));

        const territoryForTime = filterGeoRowsByRegion(
          territoryGeoRows,
          filters.region,
        ) as TerritoryGeoRow[];
        const triageResolvedAt = await fetchTriageResolvedAtMap();
        let rtRecords = recordsFromTerritoryGeoRows(territoryForTime, triageResolvedAt);
        rtRecords = applyVolumeTerritoryZones(rtRecords, neighborhoodBreakdown);
        responseTime = buildResponseTimeDrillStats(
          filterResponseTimeRecords(rtRecords, filters),
        );

        if (filters.region && filters.region !== 'all') {
          const zoneLabel = regionLabel(filters.region);
          const zoneVol = volumeByZone.find((z) => z.zone === zoneLabel)?.count;
          if (zoneVol != null && zoneVol >= 0) {
            total = zoneVol;
            if (urbanOnly) {
              urbanCount = total;
              transportCount = 0;
              evaluationCount = 0;
            }
          }
        }

        const territoryFiltered = filterGeoRowsByRegion(
          territoryForTime,
          filters.region,
        ) as TerritoryGeoRow[];
        const categoriesFromTerritory = buildCategoryDistributionFromTerritoryRows(territoryFiltered);
        if (categoriesFromTerritory.length > 0) {
          categories = categoriesFromTerritory;
        }
        patternAlerts = patternsFromCategories(categories);
        territoryPatterns = buildTerritoryPatternSummaries(territoryFiltered);

        // Usa `ai_sentiment` de transporte quando disponível para reduzir placeholder 50%.
        const transportSentimentByRegion = new Map<string, { sum: number; n: number }>();
        for (const row of territoryFiltered) {
          if (row.source !== 'transporte') continue;
          const score = sentimentToScore((row as { ai_sentiment?: unknown }).ai_sentiment);
          if (score == null) continue;
          const region = String(row.neighborhood ?? '').trim();
          if (!region) continue;
          const cur = transportSentimentByRegion.get(region) ?? { sum: 0, n: 0 };
          cur.sum += score;
          cur.n += 1;
          transportSentimentByRegion.set(region, cur);
        }
        if (transportSentimentByRegion.size > 0) {
          byRegion.forEach((regionRow) => {
            const scored = transportSentimentByRegion.get(regionRow.region);
            if (scored && scored.n > 0) {
              regionRow.sentiment = Math.round(scored.sum / scored.n);
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch urban reports timeline/patterns', err);
        patternAlerts = patternsFromCategories(categories);
        territoryPatterns = [];
      }

      // Sem migration p_status no RPC: KPIs e pipeline alinhados à query urban_reports.
      if (filters.status && !statusFilterInRpc && urbanOnly) {
        const rows = urbanReports as UrbanReportRow[];
        const statusCounts = { pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
        let criticalLocal = 0;
        for (const row of rows) {
          const st = normalizeCitizenReportStatus(row.status);
          statusCounts[st] += 1;
          if (row.severity === 'critical') criticalLocal += 1;
        }
        total = rows.length;
        urbanCount = total;
        transportCount = 0;
        evaluationCount = 0;
        critical = criticalLocal;
        pending = statusCounts.pending;
        resolved = statusCounts.resolved;
        byStatus = [
          { status: 'Pendente', count: statusCounts.pending, color: 'hsl(var(--chart-3))' },
          { status: 'Em Análise', count: statusCounts.in_progress, color: 'hsl(var(--chart-2))' },
          { status: 'Resolvido', count: statusCounts.resolved, color: 'hsl(var(--chart-1))' },
          { status: 'Rejeitado', count: statusCounts.rejected, color: 'hsl(var(--chart-5))' },
        ];
        const categoriesFromUrban = buildCategoryDistributionFromTerritoryRows(
          (urbanReports as UrbanReportRow[]).map((r) => ({
            neighborhood: r.neighborhood,
            source: 'urbano' as const,
            category: r.category,
          })),
        );
        if (categoriesFromUrban.length > 0) {
          categories = categoriesFromUrban;
          patternAlerts = patternsFromCategories(categories);
        }
      }

      const engagementBaseTotal = urbanForTimeline.length;
      const totalLikes = urbanForTimeline.reduce((sum, r: Record<string, unknown>) => 
        sum + ((r.urban_report_likes as { count?: number }[])?.[0]?.count || 0), 0);
      const totalComments = urbanForTimeline.reduce((sum, r: Record<string, unknown>) => 
        sum + (r.urban_report_comments?.[0]?.count || 0), 0);

      const topReports: TopReport[] = urbanForTimeline
        .map((report: Record<string, unknown>) => ({
          id: report.id,
          description: report.description || 'Sem descrição',
          category: report.category,
          location: report.location_address || 'Não especificado',
          likes: report.urban_report_likes?.[0]?.count || 0,
          comments: report.urban_report_comments?.[0]?.count || 0,
          status: report.status,
          created_at: report.created_at,
        }))
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 10);

      const withInteraction = urbanForTimeline.filter((r: Record<string, unknown>) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0 || (r.urban_report_comments?.[0]?.count || 0) > 0
      ).length;
      const withLikes = urbanForTimeline.filter((r: Record<string, unknown>) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0
      ).length;

      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const row of urbanForTimeline) {
        const bucket = normalizeSeverityBucket((row as { severity?: unknown }).severity);
        if (!bucket) continue;
        severityCounts[bucket] += 1;
      }
      const severityTotal = Object.values(severityCounts).reduce((s, n) => s + n, 0);
      critical = severityCounts.critical;
      criticalScore = severityTotal > 0 ? (severityCounts.critical / severityTotal) * 100 : 0;
      bySeverity[0] = {
        severity: 'Crítico',
        count: severityCounts.critical,
        percentage: severityTotal > 0 ? (severityCounts.critical / severityTotal) * 100 : 0,
        color: 'hsl(var(--chart-5))',
      };
      bySeverity[1] = {
        severity: 'Alto',
        count: severityCounts.high,
        percentage: severityTotal > 0 ? (severityCounts.high / severityTotal) * 100 : 0,
        color: 'hsl(var(--chart-3))',
      };
      bySeverity[2] = {
        severity: 'Médio',
        count: severityCounts.medium,
        percentage: severityTotal > 0 ? (severityCounts.medium / severityTotal) * 100 : 0,
        color: 'hsl(var(--chart-2))',
      };
      bySeverity[3] = {
        severity: 'Baixo',
        count: severityCounts.low,
        percentage: severityTotal > 0 ? (severityCounts.low / severityTotal) * 100 : 0,
        color: 'hsl(var(--chart-1))',
      };

      const resolvedUrban = urbanForTimeline.reduce((sum, row) => {
        const status = normalizeCitizenReportStatus((row as { status?: string }).status);
        return sum + (status === 'resolved' ? 1 : 0);
      }, 0);

      const conversionFunnel: FunnelStep[] = [
        { label: 'Relatos Criados', count: engagementBaseTotal, percentage: engagementBaseTotal > 0 ? 100 : 0, color: 'hsl(var(--chart-2))' },
        { label: 'Com Interação', count: withInteraction, percentage: engagementBaseTotal > 0 ? (withInteraction / engagementBaseTotal) * 100 : 0, color: 'hsl(var(--chart-6))' },
        { label: 'Apoiados', count: withLikes, percentage: engagementBaseTotal > 0 ? (withLikes / engagementBaseTotal) * 100 : 0, color: 'hsl(var(--chart-3))' },
        { label: 'Resolvidos', count: resolvedUrban, percentage: engagementBaseTotal > 0 ? (resolvedUrban / engagementBaseTotal) * 100 : 0, color: 'hsl(var(--chart-1))' },
      ];

      if (isMounted) {
        setStats({
          total,
          urban: urbanCount,
          transport: transportCount,
          evaluation: evaluationCount,
          pending,
          resolved,
          critical,
          trend: 0,
          resolvedTrend: 0,
          criticalTrend: 0,
          pendingTrend: 0,
          timeline,
          byStatus,
          categories,
          volumeByZone,
          neighborhoodBreakdown,
          streetBreakdown,
          territoryPatterns,
          responseTime,
          demographics: {
            byGender,
            byRace,
            bySocialClass,
            byAgeGroup,
            byRegion,
          },
          engagement: {
            totalLikes,
            totalComments,
            avgLikesPerReport: engagementBaseTotal > 0 ? totalLikes / engagementBaseTotal : 0,
            avgCommentsPerReport: engagementBaseTotal > 0 ? totalComments / engagementBaseTotal : 0,
            likesTrend: 0,
            commentsTrend: 0,
            topReports,
            conversionFunnel,
          },
          criticality: {
            criticalScore,
            bySeverity,
            patterns: patternAlerts,
            criticalPendingReports: [],
          },
        });
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (isMounted) {
        setError('Ocorreu um erro ao carregar os dados. Tente novamente.');
        if (isFirstLoadRef.current) setStats(emptyStats);
      }
    } finally {
      if (isMounted) {
        isFirstLoadRef.current = false;
        setIsLoading(false);
      }
    }
  }, [filtersKey]);

  useEffect(() => {
    let isMounted = true;
    fetchAnalytics(isMounted);
    return () => { isMounted = false; };
  }, [filtersKey, fetchAnalytics]);

  const realtimeTables = getAnalyticsRealtimeTables(filters.scope);
  const { refresh: realtimeRefresh } = useRealtimeRefresh(realtimeTables, () => {
    void fetchAnalytics(true);
  });

  return {
    stats,
    isLoading,
    error,
    lastUpdate,
    refresh: () => {
      realtimeRefresh();
    },
  };
};
