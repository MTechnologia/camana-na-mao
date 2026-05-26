import { supabase } from '@/integrations/supabase/client';

export type ReportSourceTable = 'urban_reports' | 'transport_reports';

export type ReportCommissionRef = {
  commissionId: string;
  commissionName: string;
};

interface CommissionReferralRow {
  source_table: ReportSourceTable;
  report_id: string;
  commission_id: string;
  referred_at: string;
  updated_at: string;
  legislative_commissions: { name: string | null; code: string | null } | null;
};

export function reportCommissionKey(
  sourceTable: ReportSourceTable,
  reportId: string,
): string {
  return `${sourceTable}|${reportId}`;
}

/** Encaminhamento temático mais recente por relato (urbano e/ou transporte). */
export async function loadLatestCommissionByReportKey(
  urbanIds: string[],
  transportIds: string[],
): Promise<Map<string, ReportCommissionRef>> {
  const acc = new Map<string, ReportCommissionRef>();

  const mergeRows = (rows: CommissionReferralRow[]) => {
    for (const row of rows) {
      const key = reportCommissionKey(row.source_table, row.report_id);
      if (acc.has(key)) continue;
      const name =
        row.legislative_commissions?.name?.trim()
        || row.legislative_commissions?.code?.trim()
        || 'Comissão';
      acc.set(key, {
        commissionId: row.commission_id,
        commissionName: name,
      });
    }
  };

  if (urbanIds.length > 0) {
    const { data, error } = await supabase
      .from('report_commission_referrals')
      .select(
        'source_table, report_id, commission_id, referred_at, updated_at, legislative_commissions(name, code)',
      )
      .eq('source_table', 'urban_reports')
      .in('report_id', urbanIds)
      .order('updated_at', { ascending: false })
      .order('referred_at', { ascending: false });
    if (error) throw error;
    mergeRows((data ?? []) as CommissionReferralRow[]);
  }

  if (transportIds.length > 0) {
    const { data, error } = await supabase
      .from('report_commission_referrals')
      .select(
        'source_table, report_id, commission_id, referred_at, updated_at, legislative_commissions(name, code)',
      )
      .eq('source_table', 'transport_reports')
      .in('report_id', transportIds)
      .order('updated_at', { ascending: false })
      .order('referred_at', { ascending: false });
    if (error) throw error;
    mergeRows((data ?? []) as CommissionReferralRow[]);
  }

  return acc;
}

export type LegislativeCommissionOption = {
  commissionId: string;
  name: string;
  code: string | null;
};

export async function fetchActiveLegislativeCommissions(): Promise<LegislativeCommissionOption[]> {
  const { data, error } = await supabase
    .from('legislative_commissions')
    .select('id, name, code')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    commissionId: row.id,
    name: row.name,
    code: row.code ?? null,
  }));
}
