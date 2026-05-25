import { supabase } from '@/integrations/supabase/client';
import type { UnifiedManifest } from '@/hooks/useReportsAdmin';
import { resolveGlobalCategoryFilter } from '@/lib/globalCategoryFilter';
import { urbanReportMatchesGlobalRegion } from '@/lib/urbanReportRegion';
import type { FilteredCouncilReferralRow } from '@/lib/referralsGlobalFilters';
import type { UrbanReportRecord } from '@/types/urbanReportManagement';

const COUNCIL_REFERRAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Enc. pendente',
  sent: 'Enc. enviado',
  acknowledged: 'Enc. reconhecido',
  resolved: 'Enc. resolvido',
};

const URBAN_DRILLDOWN_FIELDS =
  'id,category,subcategory,description,severity,status,created_at,updated_at,location_address,neighborhood,latitude,longitude,user_id,protocol_code,n8n_priority';

const CHUNK_SIZE = 80;

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    out.push(ids.slice(i, i + CHUNK_SIZE));
  }
  return out;
}

function rowToUrbanManifest(r: Record<string, unknown>): UnifiedManifest {
  return {
    id: r.id as string,
    type: 'urban',
    title: (r.subcategory as string) || (r.category as string),
    description: r.description as string | null,
    severity: (r.severity as string) || 'medium',
    status: (r.status as string) || 'pending',
    created_at: (r.created_at as string) || '',
    updated_at: r.updated_at as string | null,
    location: r.location_address as string | null,
    author: null,
    n8n_priority: (r.n8n_priority as string | null) ?? null,
    urban_data: {
      category: r.category as string,
      subcategory: r.subcategory as string | null,
      photos: null,
      latitude: (r.latitude as number | null) ?? null,
      longitude: (r.longitude as number | null) ?? null,
      likes_count: 0,
      comments_count: 0,
      ai_classification: null,
      protocol_code: r.protocol_code as string | null,
      street: null,
      street_number: null,
      cep: null,
      neighborhood: r.neighborhood as string | null,
      reference_point: null,
      risk_level: null,
      risk_types: null,
      affected_scope: null,
      affected_estimate: null,
      urgency_reason: null,
    },
  };
}

/**
 * Carrega relatos urbanos pelos IDs dos encaminhamentos (sem filtrar `created_at` do relato),
 * aplicando só região e categoria globais — alinha Gestão de relatos ao funil da análise.
 */
export async function fetchUrbanManifestsForCouncilReferralIds(
  urbanIds: string[],
  region: string,
  category: string,
  options?: { trustReferralRecorte?: boolean },
): Promise<UnifiedManifest[]> {
  if (urbanIds.length === 0) return [];

  const trustRecorte = options?.trustReferralRecorte === true;
  const catSlice = resolveGlobalCategoryFilter(category);
  const chunks = chunkIds(urbanIds);
  const all: UnifiedManifest[] = [];

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('urban_reports')
      .select(URBAN_DRILLDOWN_FIELDS)
      .in('id', chunk)
      .neq('category', 'feedback_camara');
    if (error) throw error;

    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      if (!trustRecorte) {
        if (
          !catSlice.isAll
          && catSlice.urbanCategories.length > 0
          && (!r.category || !catSlice.urbanCategories.includes(r.category as string))
        ) {
          continue;
        }
        if (
          !urbanReportMatchesGlobalRegion(
            {
              location_address: r.location_address as string | null,
              neighborhood: r.neighborhood as string | null,
              latitude: r.latitude as number | null,
              longitude: r.longitude as number | null,
            },
            region,
          )
        ) {
          continue;
        }
      }
      all.push(rowToUrbanManifest(r));
    }
  }

  return all;
}

function stubUrbanRowFromReferral(
  ref: FilteredCouncilReferralRow,
): UrbanReportRecord {
  const shortId = ref.urbanReportId!.slice(0, 8).toUpperCase();
  return {
    id: ref.urbanReportId!,
    protocol: shortId,
    title: 'Relato urbano',
    summary: '',
    category: '—',
    region: '—',
    district: '—',
    stage: 'awaiting_triage',
    triagePriority: null,
    createdAt: ref.created_at,
    updatedAt: ref.created_at,
    timeline: [],
    councilReferralId: ref.id,
    councilReferralStatus: ref.status,
    councilReferralStatusLabel:
      COUNCIL_REFERRAL_STATUS_LABELS[ref.status] ?? ref.status,
    councilMemberName: ref.councilMemberName,
    responsibleName: ref.councilMemberName,
  };
}

/** Uma linha na tabela por encaminhamento urbano (mesma contagem do funil). */
export function buildUrbanReportRowsFromCouncilReferrals(
  referralRows: FilteredCouncilReferralRow[],
  reportsById: Map<string, UrbanReportRecord>,
): UrbanReportRecord[] {
  const out: UrbanReportRecord[] = [];
  for (const ref of referralRows) {
    if (!ref.urbanReportId) continue;
    const base = reportsById.get(ref.urbanReportId) ?? stubUrbanRowFromReferral(ref);
    out.push({
      ...base,
      councilReferralId: ref.id,
      councilReferralStatus: ref.status,
      councilReferralStatusLabel:
        COUNCIL_REFERRAL_STATUS_LABELS[ref.status] ?? ref.status,
      councilMemberName: ref.councilMemberName,
      responsibleName: ref.councilMemberName,
    });
  }
  return out;
}

export function countNonUrbanCouncilReferrals(
  rows: FilteredCouncilReferralRow[],
): number {
  return rows.filter((r) => !r.urbanReportId).length;
}
