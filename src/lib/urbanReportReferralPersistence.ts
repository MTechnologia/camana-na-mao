import { supabase } from '@/integrations/supabase/client';
import { COMMISSION_REFERRAL_MIN_JUSTIFICATION } from '@/hooks/useCommissionReferrals';
import { reportCommissionKey } from '@/lib/reportCommissionReferrals';
import type { ReportReferral } from '@/types/urbanReportManagement';

export type UrbanCouncilReferralSnapshot = {
  referralId: string;
  commissionId: string | null;
  commissionName: string | null;
  councillorId: string;
  councillorName: string;
  referredAt: string;
  matchScore: number;
  note: string | null;
};

export type PersistUrbanReferralInput = {
  urbanReportId: string;
  commissionId: string;
  commissionName: string;
  councillorId: string;
  councillorName: string;
  councillorParty?: string | null;
  matchScore: number;
  note?: string;
};

function commissionJustification(note: string | undefined, commissionName: string): string {
  const trimmed = note?.trim() ?? '';
  if (trimmed.length >= COMMISSION_REFERRAL_MIN_JUSTIFICATION) return trimmed;
  const fallback = `Encaminhamento administrativo para ${commissionName}.`;
  return fallback.length >= COMMISSION_REFERRAL_MIN_JUSTIFICATION
    ? fallback
    : `${fallback} Registro automático.`;
}

async function resolveCouncilMemberParty(councillorId: string): Promise<string | null> {
  const { data } = await supabase
    .from('council_members_cache')
    .select('party')
    .eq('id', councillorId)
    .maybeSingle();
  return (data?.party as string | null) ?? null;
}

/** Grava encaminhamento a vereador + comissão temática (gestão de relatos urbanos). */
export async function persistUrbanManagementReferral(
  input: PersistUrbanReferralInput,
): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sessão expirada — faça login novamente.');

  const justification = commissionJustification(input.note, input.commissionName);
  const party =
    input.councillorParty !== undefined
      ? input.councillorParty
      : await resolveCouncilMemberParty(input.councillorId);

  const { error: councilErr } = await supabase.from('council_member_referrals').insert({
    user_id: userId,
    urban_report_id: input.urbanReportId,
    council_member_id: input.councillorId,
    council_member_name: input.councillorName,
    council_member_party: party,
    legislative_commission_id: input.commissionId,
    match_score: Math.round(Number(input.matchScore)),
    match_reasons: [],
    citizen_message: input.note?.trim() || null,
    status: 'pending',
  });
  if (councilErr) throw councilErr;

  const { error: commissionErr } = await supabase.from('report_commission_referrals').insert({
    source_table: 'urban_reports',
    report_id: input.urbanReportId,
    commission_id: input.commissionId,
    justification,
    referred_by: userId,
  });
  if (commissionErr) throw commissionErr;

  const { error: triageErr } = await supabase
    .from('report_triage')
    .upsert(
      {
        source_table: 'urban_reports',
        report_id: input.urbanReportId,
        responsible_commission_id: input.commissionId,
        triage_status: 'in_progress',
        assignee_id: null,
      },
      { onConflict: 'source_table,report_id' },
    );
  if (triageErr) {
    console.warn('[persistUrbanManagementReferral] triage upsert', triageErr);
  }

  try {
    await supabase.from('report_status_events').insert({
      source_table: 'urban_reports',
      report_id: input.urbanReportId,
      event_type: 'referred',
      event_data: {
        commission_id: input.commissionId,
        council_member_id: input.councillorId,
        justification,
      },
      actor_id: userId,
    });
  } catch (evErr) {
    console.warn('[persistUrbanManagementReferral] status event', evErr);
  }
}

/** Encaminhamento a vereador mais recente por relato urbano. */
export async function loadLatestCouncilReferralByUrbanIds(
  urbanIds: string[],
): Promise<Map<string, UrbanCouncilReferralSnapshot>> {
  const out = new Map<string, UrbanCouncilReferralSnapshot>();
  if (urbanIds.length === 0) return out;

  const { data, error } = await supabase
    .from('council_member_referrals')
    .select(
      `id, urban_report_id, council_member_id, council_member_name, legislative_commission_id,
       created_at, match_score, citizen_message,
       legislative_commissions(name, code)`,
    )
    .in('urban_report_id', urbanIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  for (const row of data ?? []) {
    const reportId = row.urban_report_id as string | null;
    if (!reportId || out.has(reportId)) continue;

    const comm = row.legislative_commissions as { name: string | null; code: string | null } | null;
    const commissionName =
      comm?.name?.trim() || comm?.code?.trim() || null;

    out.set(reportId, {
      referralId: row.id as string,
      commissionId: (row.legislative_commission_id as string | null) ?? null,
      commissionName,
      councillorId: row.council_member_id as string,
      councillorName: (row.council_member_name as string)?.trim() || 'Vereador',
      referredAt: (row.created_at as string) || new Date().toISOString(),
      matchScore: typeof row.match_score === 'number' ? row.match_score : Number(row.match_score) || 0,
      note: (row.citizen_message as string | null) ?? null,
    });
  }
  return out;
}

/** Comissão indicada na triagem (`report_triage.responsible_commission_id`). */
export async function loadUrbanTriageResponsibleCommissionByReportIds(
  reportIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  if (reportIds.length === 0) return map;

  const { data, error } = await supabase
    .from('report_triage')
    .select('report_id, responsible_commission_id, legislative_commissions(name, code)')
    .eq('source_table', 'urban_reports')
    .in('report_id', reportIds)
    .not('responsible_commission_id', 'is', null);
  if (error) throw error;

  for (const row of data ?? []) {
    const comm = row.legislative_commissions as { name: string | null; code: string | null } | null;
    const name = comm?.name?.trim() || comm?.code?.trim() || 'Comissão';
    const id = row.responsible_commission_id as string;
    map.set(row.report_id as string, { id, name });
  }
  return map;
}

export function councilReferralToReportReferral(
  snap: UrbanCouncilReferralSnapshot,
): ReportReferral {
  return {
    commissionId: snap.commissionId ?? '',
    commissionName: snap.commissionName ?? 'Comissão',
    councillorId: snap.councillorId,
    councillorName: snap.councillorName,
    referredAt: snap.referredAt,
    matchScore: snap.matchScore,
    note: snap.note ?? undefined,
  };
}

/** Mescla comissão temática, encaminhamento a vereador e triagem para exibição na lista. */
export function resolveUrbanReportResponsible(
  reportId: string,
  commissionByKey: Map<string, { id: string; name: string }>,
  councilByReportId: Map<string, UrbanCouncilReferralSnapshot>,
  triageCommissionByReportId: Map<string, { id: string; name: string }>,
): {
  responsibleId: string | null;
  responsibleName: string | null;
  councilMemberName: string | null;
  referral?: ReportReferral;
} {
  const thematic = commissionByKey.get(reportCommissionKey('urban_reports', reportId));
  const council = councilByReportId.get(reportId);
  const triageComm = triageCommissionByReportId.get(reportId);

  let responsibleId: string | null = thematic?.id ?? null;
  let responsibleName: string | null = thematic?.name ?? null;

  if (!responsibleId && council?.commissionId) {
    responsibleId = council.commissionId;
    responsibleName = council.commissionName;
  }
  if (!responsibleId && triageComm) {
    responsibleId = triageComm.id;
    responsibleName = triageComm.name;
  }

  const councilMemberName = council?.councillorName ?? null;
  const referral = council ? councilReferralToReportReferral(council) : undefined;

  return { responsibleId, responsibleName, councilMemberName, referral };
}
