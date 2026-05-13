import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * HU-9.3 — Edge function `detect-anomalies`.
 *
 * Executada diariamente via Cloud Scheduler (header X-Cron-Secret).
 * Também pode ser chamada manualmente pelo botão "Detectar agora" na UI.
 *
 * Pipeline:
 *   1. Busca created_at dos últimos 60 dias em urban_reports + transport_reports.
 *   2. Agrupa por dia local, densifica (preenche dias sem relato com 0).
 *   3. Treina modelo (trend linear × sazonalidade semanal) sobre o histórico.
 *   4. Para cada um dos últimos 7 dias, calcula z-score e classifica severity.
 *   5. UPSERT em report_anomalies (dedup por signal_type + signal_date).
 *
 * A matemática é uma cópia literal de src/lib/forecastVolume.ts e
 * src/lib/detectAnomalies.ts — mantida em sincronia manual porque o
 * runtime Deno não importa diretamente código do bundle React.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Valida a requisição: aceita OU o header `X-Cron-Secret` (cron) OU um JWT
 * de usuário autenticado com role admin/gestor (botão "Detectar agora" na UI).
 *
 * Retorna { ok: true } quando autorizado, ou { ok: false, status, message }
 * quando rejeitado. Não lança — o handler decide como responder.
 */
async function authorizeRequest(
  req: Request,
  supabaseUrl: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const cronSecret = Deno.env.get('CRON_SECRET')?.trim();
  const headerSecret = req.headers.get('x-cron-secret')?.trim();

  // 1) Cron path — header secret bate com env.
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return { ok: true };
  }

  // 2) User path — JWT do Supabase + role admin/gestor.
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) {
      return { ok: false, status: 500, message: 'SUPABASE_ANON_KEY ausente' };
    }
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return { ok: false, status: 401, message: 'JWT inválido' };
      }
      const { data: roles, error: rolesErr } = await userClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id);
      if (rolesErr) {
        return { ok: false, status: 500, message: 'Erro lendo user_roles' };
      }
      const allowed = (roles ?? []).some(
        (r: { role: string }) => r.role === 'admin' || r.role === 'gestor',
      );
      if (!allowed) {
        return { ok: false, status: 403, message: 'Apenas admin/gestor' };
      }
      return { ok: true };
    } catch (err) {
      console.error('[detect-anomalies] auth check error', err);
      return { ok: false, status: 401, message: 'Falha ao validar JWT' };
    }
  }

  return { ok: false, status: 401, message: 'Unauthorized' };
}

const Z_95 = 1.96;
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_HISTORY_DAYS = 60;
const DEFAULT_Z_THRESHOLD = 2.5;

interface VolumePoint {
  date: string;
  count: number;
}

interface ForecastDiagnostics {
  trendSlope: number;
  trendIntercept: number;
  weekdayFactors: number[];
  residualStdDev: number;
}

// =========================================================================
// Matemática do forecast (copy from src/lib/forecastVolume.ts).
// =========================================================================

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function trainModel(history: VolumePoint[]): ForecastDiagnostics {
  const counts = history.map((p) => p.count);
  const { slope, intercept } = linearRegression(counts);
  const trendValues = counts.map((_, i) => slope * i + intercept);

  const weekdaySums = Array(7).fill(0);
  const weekdayCounts = Array(7).fill(0);
  history.forEach((p, i) => {
    const dow = parseLocalDate(p.date).getDay();
    const t = trendValues[i];
    if (t > 0.0001) {
      weekdaySums[dow] += p.count / t;
      weekdayCounts[dow] += 1;
    }
  });
  const weekdayFactors = weekdaySums.map((sum, i) =>
    weekdayCounts[i] > 0 ? sum / weekdayCounts[i] : 1,
  );

  const residuals: number[] = [];
  history.forEach((p, i) => {
    const dow = parseLocalDate(p.date).getDay();
    const fitted = trendValues[i] * weekdayFactors[dow];
    residuals.push(p.count - fitted);
  });
  const meanRes = residuals.reduce((a, b) => a + b, 0) / Math.max(1, residuals.length);
  const variance =
    residuals.reduce((a, b) => a + (b - meanRes) ** 2, 0) / Math.max(1, residuals.length - 1);
  const residualStdDev = Math.sqrt(variance);

  return {
    trendSlope: slope,
    trendIntercept: intercept,
    weekdayFactors,
    residualStdDev,
  };
}

function densifyHistory(
  sparse: VolumePoint[],
  start: string,
  end: string,
): VolumePoint[] {
  const map = new Map(sparse.map((p) => [p.date, p.count]));
  const out: VolumePoint[] = [];
  const cur = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cur.getTime() <= last.getTime()) {
    const k = formatLocalDate(cur);
    out.push({ date: k, count: map.get(k) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// =========================================================================
// Detecção de anomalias.
// =========================================================================

type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
type AnomalyDirection = 'spike' | 'drop';

interface DetectedAnomaly {
  signalDate: string;
  observedValue: number;
  expectedValue: number;
  expectedLower: number;
  expectedUpper: number;
  zScore: number;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
}

function classifySeverity(absZ: number): AnomalySeverity {
  if (absZ >= 5) return 'critical';
  if (absZ >= 4) return 'high';
  if (absZ >= 3) return 'medium';
  return 'low';
}

function detectAnomalies(
  history: VolumePoint[],
  windowDays: number,
  zThreshold: number,
): DetectedAnomaly[] {
  if (history.length < 14) return [];
  const diag = trainModel(history);
  if (diag.residualStdDev <= 1e-9) return [];

  const startIdx = Math.max(0, history.length - windowDays);
  const out: DetectedAnomaly[] = [];
  for (let i = startIdx; i < history.length; i += 1) {
    const point = history[i];
    const dow = parseLocalDate(point.date).getDay();
    const trend = diag.trendSlope * i + diag.trendIntercept;
    const expected = Math.max(0, trend * diag.weekdayFactors[dow]);
    const half = Z_95 * diag.residualStdDev;
    const lower = Math.max(0, expected - half);
    const upper = expected + half;
    const z = (point.count - expected) / diag.residualStdDev;
    const absZ = Math.abs(z);
    if (absZ < zThreshold) continue;
    out.push({
      signalDate: point.date,
      observedValue: point.count,
      expectedValue: expected,
      expectedLower: lower,
      expectedUpper: upper,
      zScore: z,
      severity: classifySeverity(absZ),
      direction: z >= 0 ? 'spike' : 'drop',
    });
  }
  return out;
}

// =========================================================================
// Pipeline de busca de dados.
// =========================================================================

async function fetchDailyCounts(
  supabase: ReturnType<typeof createClient>,
  table: 'urban_reports' | 'transport_reports',
  fromIso: string,
  toIso: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const PAGE_SIZE = 1000;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('created_at')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as Array<{ created_at: string | null }>;
    if (batch.length === 0) break;
    for (const row of batch) {
      if (!row.created_at) continue;
      const d = new Date(row.created_at);
      const key = formatLocalDate(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return map;
}

// =========================================================================
// Handler.
// =========================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'SUPABASE_URL ausente' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const authz = await authorizeRequest(req, supabaseUrl);
  if (!authz.ok) {
    return new Response(
      JSON.stringify({ success: false, error: authz.message }),
      {
        status: authz.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Variáveis de ambiente não configuradas',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Permite override via body { historyDays, windowDays, zThreshold }.
    let historyDays = DEFAULT_HISTORY_DAYS;
    let windowDays = DEFAULT_WINDOW_DAYS;
    let zThreshold = DEFAULT_Z_THRESHOLD;
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        const body = await req.json();
        if (Number.isFinite(body?.historyDays)) historyDays = Number(body.historyDays);
        if (Number.isFinite(body?.windowDays)) windowDays = Number(body.windowDays);
        if (Number.isFinite(body?.zThreshold)) zThreshold = Number(body.zThreshold);
      }
    } catch (_e) {
      // body malformado é não-fatal.
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - historyDays);
    const fromIso = start.toISOString();
    const toIso = new Date(today.getTime() + 24 * 3600_000 - 1).toISOString();

    const [urban, transport] = await Promise.all([
      fetchDailyCounts(supabase, 'urban_reports', fromIso, toIso),
      fetchDailyCounts(supabase, 'transport_reports', fromIso, toIso),
    ]);

    const combined = new Map<string, number>();
    for (const [k, v] of urban) combined.set(k, (combined.get(k) ?? 0) + v);
    for (const [k, v] of transport) combined.set(k, (combined.get(k) ?? 0) + v);

    const sparse: VolumePoint[] = Array.from(combined.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dense = densifyHistory(
      sparse,
      formatLocalDate(start),
      formatLocalDate(new Date(today.getTime() - 24 * 3600_000)),
    );

    const anomalies = detectAnomalies(dense, windowDays, zThreshold);

    // UPSERT por (signal_type, signal_date).
    let upsertCount = 0;
    if (anomalies.length > 0) {
      const rows = anomalies.map((a) => ({
        signal_type: 'volume_daily',
        signal_date: a.signalDate,
        observed_value: a.observedValue,
        expected_value: Number(a.expectedValue.toFixed(2)),
        expected_lower: Number(a.expectedLower.toFixed(2)),
        expected_upper: Number(a.expectedUpper.toFixed(2)),
        z_score: Number(a.zScore.toFixed(3)),
        severity: a.severity,
        direction: a.direction,
        // status mantido como 'active' por default; se já existir e não foi
        // reconhecido, fica intacto. O upsert preserva status do registro
        // existente porque NÃO listamos status no DO UPDATE.
        detected_at: new Date().toISOString(),
      }));
      const { error: upsertErr, count } = await supabase
        .from('report_anomalies')
        .upsert(rows, {
          onConflict: 'signal_type,signal_date',
          ignoreDuplicates: false,
          count: 'exact',
        });
      if (upsertErr) {
        console.error('[detect-anomalies] upsert error', upsertErr);
        throw upsertErr;
      }
      upsertCount = count ?? rows.length;
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        history_days: historyDays,
        window_days: windowDays,
        z_threshold: zThreshold,
        anomalies_found: anomalies.length,
        upserts: upsertCount,
        anomalies,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[detect-anomalies] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Erro inesperado ao detectar anomalias',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
