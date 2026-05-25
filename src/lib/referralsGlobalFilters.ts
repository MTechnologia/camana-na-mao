import { supabase } from '@/integrations/supabase/client';
import type { ReferralDestination } from '@/lib/referralDestinations';
import { globalFiltersToReportsAnalytics, type PeriodCompareFilterInput } from '@/lib/globalFiltersToAnalytics';
import { resolveGlobalCategoryFilter } from '@/lib/globalCategoryFilter';
import {
  kanbanTransportRowMatchesRegion,
  kanbanUrbanRowMatchesRegion,
} from '@/lib/triageKanbanGlobalFilters';

export type CouncilReferralKpis = {
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  resolved: number;
};

export type FilteredCouncilReferralRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  councilMemberId: string;
  urbanReportId: string | null;
  transportReportId: string | null;
  councilMemberName: string;
};

type ReferralQueryRow = FilteredCouncilReferralRow & {
  urban_report_id: string | null;
  transport_report_id: string | null;
  service_rating_id: string | null;
  urban_reports: {
    category: string | null;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    location_address: string | null;
  } | null;
  transport_reports: {
    report_type: string | null;
    location: string | null;
    stop_name: string | null;
  } | null;
  service_ratings: {
    public_services: { district: string | null; service_type: string | null } | null;
  } | null;
};

const REFERRAL_SELECT = `
  id,
  status,
  created_at,
  resolved_at,
  council_member_id,
  council_member_name,
  urban_report_id,
  transport_report_id,
  service_rating_id,
  urban_reports(category, neighborhood, latitude, longitude, location_address),
  transport_reports(report_type, location, stop_name),
  service_ratings(public_services(district, service_type))
`;

function referralMatchesGlobalRecorte(
  row: ReferralQueryRow,
  region: string,
  category: string,
): boolean {
  const catSlice = resolveGlobalCategoryFilter(category);

  if (row.urban_report_id && row.urban_reports) {
    const u = row.urban_reports;
    if (!catSlice.isAll && catSlice.urbanCategories.length > 0) {
      if (!u.category || !catSlice.urbanCategories.includes(u.category)) return false;
    }
    if (!kanbanUrbanRowMatchesRegion(
      {
        location_address: u.location_address,
        neighborhood: u.neighborhood,
        latitude: u.latitude,
        longitude: u.longitude,
      },
      region,
    )) {
      return false;
    }
    return true;
  }

  if (row.transport_report_id && row.transport_reports) {
    const t = row.transport_reports;
    if (!catSlice.isAll && catSlice.transportSubcategories.length > 0) {
      if (!t.report_type || !catSlice.transportSubcategories.includes(t.report_type)) {
        return false;
      }
    } else if (!catSlice.isAll && catSlice.urbanCategories.length > 0 && catSlice.transportSubcategories.length === 0) {
      return false;
    }
    if (!kanbanTransportRowMatchesRegion(
      { location: t.location, stop_name: t.stop_name },
      region,
    )) {
      return false;
    }
    return true;
  }

  if (row.service_rating_id && row.service_ratings) {
    const ps = row.service_ratings.public_services;
    if (!catSlice.isAll) {
      if (catSlice.publicServiceTypes.length === 0) return false;
      if (!ps?.service_type || !catSlice.publicServiceTypes.includes(ps.service_type)) {
        return false;
      }
    }
    if (!kanbanTransportRowMatchesRegion(
      { location: ps?.district ?? null, stop_name: null },
      region,
    )) {
      return false;
    }
    return true;
  }

  if (region !== 'all' || !catSlice.isAll) return false;
  return true;
}

/** Encaminhamentos a vereadores no recorte global (período, região, categoria). */
export async function fetchFilteredCouncilMemberReferrals(
  period: string,
  region: string,
  category: string,
  periodCompare?: PeriodCompareFilterInput | null,
): Promise<FilteredCouncilReferralRow[]> {
  const f = globalFiltersToReportsAnalytics(period, 'all', 'all', periodCompare ?? undefined);

  let query = supabase.from('council_member_referrals').select(REFERRAL_SELECT);

  if (f.startDate) {
    query = query.gte('created_at', `${f.startDate}T00:00:00`);
  }
  if (f.endDate) {
    query = query.lte('created_at', `${f.endDate}T23:59:59`);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(5000);
  if (error) throw error;

  const rows = (data ?? []) as ReferralQueryRow[];
  return rows
    .filter((row) => referralMatchesGlobalRecorte(row, region, category))
    .map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at ?? '',
      resolved_at: row.resolved_at,
      councilMemberId: row.council_member_id,
      urbanReportId: row.urban_report_id,
      transportReportId: row.transport_report_id,
      councilMemberName: row.council_member_name?.trim() || 'Vereador',
    }));
}

const COUNCIL_QUEUE_ACTIVE_STATUSES = new Set(['pending', 'sent', 'acknowledged']);

/** Fila por vereador no recorte global (encaminhamentos ativos no período). */
export function buildCouncilMemberDestinationsFromReferrals(
  rows: FilteredCouncilReferralRow[],
  catalog: { id: string; name: string; themes: string[] }[],
): ReferralDestination[] {
  const countById = new Map<string, number>();
  const metaById = new Map<string, { name: string; themes: string[] }>();

  for (const row of rows) {
    if (!COUNCIL_QUEUE_ACTIVE_STATUSES.has(row.status)) continue;
    countById.set(
      row.councilMemberId,
      (countById.get(row.councilMemberId) ?? 0) + 1,
    );
    metaById.set(row.councilMemberId, {
      name: row.councilMemberName,
      themes: [],
    });
  }

  for (const c of catalog) {
    if (!metaById.has(c.id)) {
      metaById.set(c.id, { name: c.name, themes: c.themes });
    }
  }

  const ids = new Set([...catalog.map((c) => c.id), ...metaById.keys()]);

  return [...ids]
    .map((id) => {
      const catalogEntry = catalog.find((c) => c.id === id);
      const meta = metaById.get(id)!;
      return {
        id,
        name: catalogEntry?.name ?? meta.name,
        themes: catalogEntry?.themes.length ? catalogEntry.themes : meta.themes,
        activeReferrals: countById.get(id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.activeReferrals - a.activeReferrals
        || a.name.localeCompare(b.name, 'pt-BR'),
    );
}

/** IDs urbanos com pelo menos um encaminhamento no status do filtro. */
export function buildUrbanIdsForCouncilReferralFilter(
  rows: FilteredCouncilReferralRow[],
  filter: 'any' | 'pending' | 'sent' | 'acknowledged' | 'resolved',
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.urbanReportId) continue;
    if (filter === 'any' || row.status === filter) ids.add(row.urbanReportId);
  }
  return ids;
}

export function filterCouncilReferralRows(
  rows: FilteredCouncilReferralRow[],
  filter: 'any' | 'pending' | 'sent' | 'acknowledged' | 'resolved',
): FilteredCouncilReferralRow[] {
  if (filter === 'any') return rows;
  return rows.filter((r) => r.status === filter);
}

export function countCouncilReferralsForFilter(
  rows: FilteredCouncilReferralRow[],
  filter: 'any' | 'pending' | 'sent' | 'acknowledged' | 'resolved',
): number {
  return filterCouncilReferralRows(rows, filter).length;
}

export function computeCouncilReferralKpis(rows: FilteredCouncilReferralRow[]): CouncilReferralKpis {
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    sent: rows.filter((r) => r.status === 'sent').length,
    acknowledged: rows.filter((r) => r.status === 'acknowledged').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
  };
}

const COMMISSION_REFERRAL_SELECT = `
  commission_id,
  status,
  referred_at,
  source_table,
  report_id,
  legislative_commissions(name, code, match_keywords)
`;

type CommissionReferralBaseRow = {
  commission_id: string;
  status: string;
  referred_at: string;
  source_table: 'urban_reports' | 'transport_reports';
  report_id: string;
  legislative_commissions: {
    name: string;
    code: string | null;
    match_keywords: string[] | null;
  } | null;
};

type CommissionReferralQueryRow = CommissionReferralBaseRow & {
  urban_reports: ReferralQueryRow['urban_reports'];
  transport_reports: ReferralQueryRow['transport_reports'];
};

/** Enriquece encaminhamentos temáticos com dados do relato (sem FK polimórfica no PostgREST). */
async function enrichCommissionReferralRows(
  rows: CommissionReferralBaseRow[],
): Promise<CommissionReferralQueryRow[]> {
  if (rows.length === 0) return [];

  const urbanIds = [
    ...new Set(
      rows
        .filter((r) => r.source_table === 'urban_reports')
        .map((r) => r.report_id),
    ),
  ];
  const transportIds = [
    ...new Set(
      rows
        .filter((r) => r.source_table === 'transport_reports')
        .map((r) => r.report_id),
    ),
  ];

  const [urbanRes, transportRes] = await Promise.all([
    urbanIds.length > 0
      ? supabase
          .from('urban_reports')
          .select('id, category, neighborhood, latitude, longitude, location_address')
          .in('id', urbanIds)
      : Promise.resolve({ data: [], error: null }),
    transportIds.length > 0
      ? supabase
          .from('transport_reports')
          .select('id, report_type, location, stop_name')
          .in('id', transportIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (urbanRes.error) throw urbanRes.error;
  if (transportRes.error) throw transportRes.error;

  type UrbanSlice = NonNullable<ReferralQueryRow['urban_reports']>;
  type TransportSlice = NonNullable<ReferralQueryRow['transport_reports']>;

  const urbanById = new Map(
    (urbanRes.data ?? []).map((u) => [
      u.id as string,
      {
        category: u.category,
        neighborhood: u.neighborhood,
        latitude: u.latitude,
        longitude: u.longitude,
        location_address: u.location_address,
      } satisfies UrbanSlice,
    ]),
  );
  const transportById = new Map(
    (transportRes.data ?? []).map((t) => [
      t.id as string,
      {
        report_type: t.report_type,
        location: t.location,
        stop_name: t.stop_name,
      } satisfies TransportSlice,
    ]),
  );

  return rows.map((row) => ({
    ...row,
    urban_reports:
      row.source_table === 'urban_reports'
        ? urbanById.get(row.report_id) ?? null
        : null,
    transport_reports:
      row.source_table === 'transport_reports'
        ? transportById.get(row.report_id) ?? null
        : null,
  }));
}

export type FilteredCommissionReferralRow = {
  commissionId: string;
  commissionName: string;
  commissionCode: string | null;
  themes: string[];
  status: string;
  referredAt: string;
};

function commissionReferralMatchesGlobalRecorte(
  row: CommissionReferralQueryRow,
  region: string,
  category: string,
): boolean {
  const pseudo: ReferralQueryRow = {
    status: row.status,
    created_at: row.referred_at,
    resolved_at: null,
    urban_report_id: row.source_table === 'urban_reports' ? row.report_id : null,
    transport_report_id: row.source_table === 'transport_reports' ? row.report_id : null,
    service_rating_id: null,
    urban_reports: row.urban_reports,
    transport_reports: row.transport_reports,
    service_ratings: null,
  };
  return referralMatchesGlobalRecorte(pseudo, region, category);
}

/** Encaminhamentos temáticos (`report_commission_referrals`) no recorte global. */
export async function fetchFilteredReportCommissionReferrals(
  period: string,
  region: string,
  category: string,
  periodCompare?: PeriodCompareFilterInput | null,
): Promise<FilteredCommissionReferralRow[]> {
  const f = globalFiltersToReportsAnalytics(period, 'all', 'all', periodCompare ?? undefined);

  let query = supabase.from('report_commission_referrals').select(COMMISSION_REFERRAL_SELECT);

  if (f.startDate) {
    query = query.gte('referred_at', `${f.startDate}T00:00:00`);
  }
  if (f.endDate) {
    query = query.lte('referred_at', `${f.endDate}T23:59:59`);
  }

  const { data, error } = await query.order('referred_at', { ascending: false }).limit(5000);
  if (error) throw error;

  const enriched = await enrichCommissionReferralRows(
    (data ?? []) as CommissionReferralBaseRow[],
  );

  return enriched
    .filter((row) => commissionReferralMatchesGlobalRecorte(row, region, category))
    .map((row) => ({
      commissionId: row.commission_id,
      commissionName:
        row.legislative_commissions?.name?.trim()
        || row.legislative_commissions?.code?.trim()
        || 'Comissão',
      commissionCode: row.legislative_commissions?.code ?? null,
      themes: (row.legislative_commissions?.match_keywords ?? []).filter(Boolean),
      status: row.status,
      referredAt: row.referred_at,
    }));
}

const COMMISSION_ACTIVE_STATUSES = new Set(['pending', 'accepted']);

export function buildCommissionDestinationsFromReferrals(
  rows: FilteredCommissionReferralRow[],
  catalog: { commissionId: string; name: string; code: string | null; themes: string[] }[],
): ReferralDestination[] {
  const countById = new Map<string, number>();
  const metaById = new Map<string, { name: string; code: string | null; themes: string[] }>();

  for (const row of rows) {
    if (!COMMISSION_ACTIVE_STATUSES.has(row.status)) continue;
    countById.set(row.commissionId, (countById.get(row.commissionId) ?? 0) + 1);
    metaById.set(row.commissionId, {
      name: row.commissionName,
      code: row.commissionCode,
      themes: row.themes,
    });
  }

  for (const c of catalog) {
    if (!metaById.has(c.commissionId)) {
      metaById.set(c.commissionId, { name: c.name, code: c.code, themes: c.themes });
    }
  }

  const ids = new Set([...catalog.map((c) => c.commissionId), ...metaById.keys()]);

  return [...ids]
    .map((id) => {
      const meta = metaById.get(id)!;
      const catalogEntry = catalog.find((c) => c.commissionId === id);
      return {
        id,
        name: catalogEntry?.name ?? meta.name,
        themes: catalogEntry?.themes.length ? catalogEntry.themes : meta.themes,
        activeReferrals: countById.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.activeReferrals - a.activeReferrals || a.name.localeCompare(b.name, 'pt-BR'));
}
