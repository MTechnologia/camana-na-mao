import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ClassificationReportKind = keyof typeof CLASSIFICATION_SHEET_TITLES;

export type ClassificationReportItem = {
  id: string;
  title: string;
  status: string;
  predictedCategory: string;
  confidencePct: number | null;
  feedbackLabel?: string;
  createdAt: string;
};

export const CLASSIFICATION_SHEET_TITLES = {
  precision: 'Predições corretas (amostra)',
  pending: 'Predições aguardando revisão',
  feedback: 'Relatos com feedback de classificação',
} as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  triaged: 'Triado',
  referred: 'Encaminhado',
  in_analysis: 'Em análise',
  in_progress: 'Em análise',
  resolved: 'Resolvido',
  closed: 'Encerrado',
  open: 'Aberto',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  urban: 'Urbano',
  transport: 'Transporte',
};

const CORRECTION_SOURCE_LABELS: Record<string, string> = {
  admin_panel: 'Painel admin',
  n8n: 'N8N',
  manual: 'Manual',
};

type VsRow = Database['public']['Views']['v_classification_prediction_vs_feedback']['Row'];
type PendingRow = Database['public']['Views']['v_classification_predictions_pending']['Row'];

type ReportMeta = {
  title: string;
  status: string;
  protocolCode: string | null;
};

async function loadReportMeta(
  rows: { report_id: string; report_type: string }[],
): Promise<Map<string, ReportMeta>> {
  const urbanIds = rows.filter((r) => r.report_type === 'urban').map((r) => r.report_id);
  const transportIds = rows.filter((r) => r.report_type === 'transport').map((r) => r.report_id);
  const map = new Map<string, ReportMeta>();

  const [urbanRes, transportRes] = await Promise.all([
    urbanIds.length
      ? supabase
          .from('urban_reports')
          .select('id, description, status, protocol_code')
          .in('id', urbanIds)
      : Promise.resolve({ data: [], error: null }),
    transportIds.length
      ? supabase
          .from('transport_reports')
          .select('id, description, status, protocol_code')
          .in('id', transportIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const row of urbanRes.data ?? []) {
    map.set(`urban:${row.id}`, {
      title: (row.description ?? 'Relato urbano').slice(0, 80),
      status: STATUS_LABELS[row.status ?? ''] ?? row.status ?? '—',
      protocolCode: row.protocol_code,
    });
  }
  for (const row of transportRes.data ?? []) {
    map.set(`transport:${row.id}`, {
      title: (row.description ?? 'Relato transporte').slice(0, 80),
      status: STATUS_LABELS[row.status ?? ''] ?? row.status ?? '—',
      protocolCode: row.protocol_code,
    });
  }

  return map;
}

function displayId(reportId: string, reportType: string, meta?: ReportMeta): string {
  return meta?.protocolCode ?? `${REPORT_TYPE_LABELS[reportType] ?? reportType} · ${reportId.slice(0, 8)}`;
}

function mapVsRow(row: VsRow, meta: Map<string, ReportMeta>): ClassificationReportItem | null {
  if (!row.report_id || !row.report_type) return null;
  const key = `${row.report_type}:${row.report_id}`;
  const details = meta.get(key);
  return {
    id: displayId(row.report_id, row.report_type, details),
    title: details?.title ?? 'Relato',
    status: details?.status ?? '—',
    predictedCategory: row.predicted_category ?? '—',
    confidencePct: null,
    feedbackLabel: row.category_match
      ? 'Categoria confirmada'
      : `Corrigido (${CORRECTION_SOURCE_LABELS[row.correction_source ?? ''] ?? row.correction_source ?? '—'})`,
    createdAt: row.corrected_at
      ? new Date(row.corrected_at).toLocaleString('pt-BR')
      : row.predicted_at
        ? new Date(row.predicted_at).toLocaleString('pt-BR')
        : '—',
  };
}

function mapPendingRow(row: PendingRow, meta: Map<string, ReportMeta>): ClassificationReportItem | null {
  if (!row.report_id || !row.report_type) return null;
  const key = `${row.report_type}:${row.report_id}`;
  const details = meta.get(key);
  return {
    id: row.protocol_code ?? displayId(row.report_id, row.report_type, details),
    title: details?.title ?? 'Relato',
    status: details?.status ?? 'Aguardando revisão',
    predictedCategory: row.predicted_category ?? '—',
    confidencePct: null,
    feedbackLabel: row.classification_source
      ? `Origem: ${row.classification_source}`
      : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '—',
  };
}

const SHEET_LIMIT = 12;

export async function fetchClassificationReports(
  kind: ClassificationReportKind,
  totalCount: number,
): Promise<{ items: ClassificationReportItem[]; total: number }> {
  if (kind === 'pending') {
    const { data, error } = await supabase
      .from('v_classification_predictions_pending')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(SHEET_LIMIT);

    if (error) throw error;

    const rows = (data ?? []) as PendingRow[];
    const meta = await loadReportMeta(
      rows.map((r) => ({ report_id: r.report_id!, report_type: r.report_type! })),
    );
    const items = rows.map((r) => mapPendingRow(r, meta)).filter((r): r is ClassificationReportItem => !!r);
    return { items, total: totalCount || rows.length };
  }

  let query = supabase
    .from('v_classification_prediction_vs_feedback')
    .select('*')
    .order('corrected_at', { ascending: false })
    .limit(SHEET_LIMIT);

  if (kind === 'precision') {
    query = query.eq('category_match', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as VsRow[];
  const meta = await loadReportMeta(
    rows.map((r) => ({ report_id: r.report_id!, report_type: r.report_type! })),
  );
  const items = rows.map((r) => mapVsRow(r, meta)).filter((r): r is ClassificationReportItem => !!r);

  const total =
    kind === 'precision'
      ? rows.length > 0
        ? totalCount
        : 0
      : totalCount || items.length;

  return { items, total };
}
