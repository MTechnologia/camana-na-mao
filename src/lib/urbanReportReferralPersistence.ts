import { supabase } from '@/integrations/supabase/client';
import { COMMISSION_REFERRAL_MIN_JUSTIFICATION } from '@/hooks/useCommissionReferrals';
import { reportCommissionKey } from '@/lib/reportCommissionReferrals';
import type { ReportReferral } from '@/types/urbanReportManagement';

/** Rótulo genérico quando o nome da comissão não foi resolvido (evitar exibir como nome real). */
export const GENERIC_COMMISSION_LABEL = 'Comissão';

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
  /** Quando informado (ou há encaminhamento prévio), atualiza em vez de inserir outro. */
  existingCouncilReferralId?: string | null;
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

  const { data: existingCouncilRows, error: listCouncilErr } = await supabase
    .from('council_member_referrals')
    .select('id')
    .eq('urban_report_id', input.urbanReportId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (listCouncilErr) throw listCouncilErr;

  const existingIds = (existingCouncilRows ?? []).map((r) => r.id as string);
  let councilReferralId =
    input.existingCouncilReferralId?.trim() || existingIds[0] || null;

  const councilPatch = {
    council_member_id: input.councillorId,
    council_member_name: input.councillorName,
    council_member_party: party,
    legislative_commission_id: input.commissionId,
    match_score: Math.round(Number(input.matchScore)),
    citizen_message: input.note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (existingIds.length > 0) {
    const { data: updatedRows, error: councilErr } = await supabase
      .from('council_member_referrals')
      .update(councilPatch)
      .in('id', existingIds)
      .select('id');
    if (councilErr) throw councilErr;
    if (!updatedRows?.length) {
      throw new Error('Não foi possível atualizar o encaminhamento ao vereador.');
    }
    councilReferralId = (updatedRows[0] as { id: string }).id;
  } else {
    const { data: inserted, error: councilErr } = await supabase
      .from('council_member_referrals')
      .insert({
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
      })
      .select('id')
      .single();
    if (councilErr) throw councilErr;
    councilReferralId = inserted.id as string;
  }

  const { data: existingCommissionRows, error: listCommErr } = await supabase
    .from('report_commission_referrals')
    .select('id')
    .eq('source_table', 'urban_reports')
    .eq('report_id', input.urbanReportId)
    .order('updated_at', { ascending: false })
    .order('referred_at', { ascending: false });
  if (listCommErr) throw listCommErr;

  const commissionIds = (existingCommissionRows ?? []).map((r) => r.id as string);

  if (commissionIds.length > 0) {
    const { data: updatedComm, error: commissionErr } = await supabase
      .from('report_commission_referrals')
      .update({
        commission_id: input.commissionId,
        justification,
        updated_at: new Date().toISOString(),
      })
      .in('id', commissionIds)
      .select('id');
    if (commissionErr) throw commissionErr;
    if (!updatedComm?.length) {
      throw new Error('Não foi possível atualizar o encaminhamento à comissão.');
    }
  } else {
    const { error: commissionErr } = await supabase.from('report_commission_referrals').insert({
      source_table: 'urban_reports',
      report_id: input.urbanReportId,
      commission_id: input.commissionId,
      justification,
      referred_by: userId,
    });
    if (commissionErr) throw commissionErr;
  }

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

/**
 * Alinha comissão do encaminhamento (vereador + temática) quando a triagem altera
 * `responsible_commission_id` e o relato já foi encaminhado.
 */
export async function syncReferralCommissionFromTriage(
  urbanReportId: string,
  commissionId: string,
  commissionName: string,
): Promise<void> {
  const justification = commissionJustification(undefined, commissionName);
  const now = new Date().toISOString();

  const { error: councilErr } = await supabase
    .from('council_member_referrals')
    .update({
      legislative_commission_id: commissionId,
      updated_at: now,
    })
    .eq('urban_report_id', urbanReportId);
  if (councilErr) throw councilErr;

  const { data: existingCommissionRows, error: listCommErr } = await supabase
    .from('report_commission_referrals')
    .select('id')
    .eq('source_table', 'urban_reports')
    .eq('report_id', urbanReportId)
    .order('updated_at', { ascending: false })
    .order('referred_at', { ascending: false });
  if (listCommErr) throw listCommErr;

  const commissionIds = (existingCommissionRows ?? []).map((r) => r.id as string);
  if (commissionIds.length > 0) {
    const { error: commissionErr } = await supabase
      .from('report_commission_referrals')
      .update({
        commission_id: commissionId,
        justification,
        updated_at: now,
      })
      .in('id', commissionIds);
    if (commissionErr) throw commissionErr;
  } else {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Sessão expirada — faça login novamente.');

    const { error: commissionErr } = await supabase.from('report_commission_referrals').insert({
      source_table: 'urban_reports',
      report_id: urbanReportId,
      commission_id: commissionId,
      justification,
      referred_by: userId,
    });
    if (commissionErr) throw commissionErr;
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
    .order('updated_at', { ascending: false })
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

/** Nome exibível da comissão: catálogo tem prioridade sobre join parcial do banco. */
export function resolveCommissionDisplayName(
  commissionId: string | null | undefined,
  rawName: string | null | undefined,
  catalog: Map<string, string>,
): string | null {
  if (commissionId) {
    const fromCatalog = catalog.get(commissionId)?.trim();
    if (fromCatalog) return fromCatalog;
  }
  const trimmed = rawName?.trim();
  if (trimmed && trimmed !== GENERIC_COMMISSION_LABEL) return trimmed;
  return null;
}

export function enrichCouncilReferralMap(
  map: Map<string, UrbanCouncilReferralSnapshot>,
  catalog: Map<string, string>,
): Map<string, UrbanCouncilReferralSnapshot> {
  const out = new Map<string, UrbanCouncilReferralSnapshot>();
  for (const [reportId, snap] of map) {
    const commissionName = resolveCommissionDisplayName(
      snap.commissionId,
      snap.commissionName,
      catalog,
    );
    out.set(reportId, { ...snap, commissionName });
  }
  return out;
}

export function enrichCommissionByReportId(
  map: Map<string, { id: string; name: string }>,
  catalog: Map<string, string>,
): Map<string, { id: string; name: string }> {
  const out = new Map<string, { id: string; name: string }>();
  for (const [reportId, ref] of map) {
    const name =
      resolveCommissionDisplayName(ref.id, ref.name, catalog) ?? ref.name;
    out.set(reportId, { id: ref.id, name });
  }
  return out;
}

export function councilReferralToReportReferral(
  snap: UrbanCouncilReferralSnapshot,
  catalog?: Map<string, string>,
): ReportReferral {
  const commissionName =
    resolveCommissionDisplayName(snap.commissionId, snap.commissionName, catalog ?? new Map())
    ?? snap.commissionName?.trim()
    ?? GENERIC_COMMISSION_LABEL;
  return {
    councilReferralId: snap.referralId,
    commissionId: snap.commissionId ?? '',
    commissionName,
    councillorId: snap.councillorId,
    councillorName: snap.councillorName,
    referredAt: snap.referredAt,
    matchScore: snap.matchScore,
    note: snap.note ?? undefined,
  };
}

/**
 * Comissão + vereador vêm do mesmo encaminhamento (`council_member_referrals`).
 * O registro temático só entra quando não há encaminhamento a vereador.
 */
export function resolveUrbanReportResponsible(
  reportId: string,
  commissionByReportId: Map<string, { id: string; name: string }>,
  councilByReportId: Map<string, UrbanCouncilReferralSnapshot>,
  triageCommissionByReportId: Map<string, { id: string; name: string }>,
  catalog: Map<string, string>,
): {
  responsibleId: string | null;
  responsibleName: string | null;
  councilMemberName: string | null;
  referral?: ReportReferral;
} {
  const council = councilByReportId.get(reportId);
  if (council) {
    const responsibleId = council.commissionId;
    const responsibleName = resolveCommissionDisplayName(
      council.commissionId,
      council.commissionName,
      catalog,
    );
    return {
      responsibleId: responsibleId ?? null,
      responsibleName,
      councilMemberName: council.councillorName,
      referral: councilReferralToReportReferral(council, catalog),
    };
  }

  const thematic = commissionByReportId.get(reportId);
  if (thematic) {
    return {
      responsibleId: thematic.id,
      responsibleName:
        resolveCommissionDisplayName(thematic.id, thematic.name, catalog) ?? thematic.name,
      councilMemberName: null,
    };
  }

  const triageComm = triageCommissionByReportId.get(reportId);
  if (triageComm) {
    return {
      responsibleId: triageComm.id,
      responsibleName:
        resolveCommissionDisplayName(triageComm.id, triageComm.name, catalog) ?? triageComm.name,
      councilMemberName: null,
    };
  }

  return { responsibleId: null, responsibleName: null, councilMemberName: null };
}
