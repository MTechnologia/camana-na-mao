import { supabase } from '@/integrations/supabase/client';

export type DemographicsRpcArgs = {
  p_gender: string | null;
  p_race: string | null;
  p_social_class: string | null;
  p_age_group: string | null;
  p_report_type: string | null;
  p_start_date: string | null;
  p_end_date: string | null;
  p_categories: string[] | null;
  p_status?: string | null;
};

type RpcResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
  statusFilterInRpc: boolean;
};

const RPC_NAME = 'get_reports_with_demographics';

function buildRpcPayload(args: DemographicsRpcArgs, includeStatus: boolean) {
  const base = {
    p_gender: args.p_gender,
    p_race: args.p_race,
    p_social_class: args.p_social_class,
    p_age_group: args.p_age_group,
    p_report_type: args.p_report_type,
    p_start_date: args.p_start_date,
    p_end_date: args.p_end_date,
    p_categories: args.p_categories,
  };
  if (!includeStatus) return base;
  return { ...base, p_status: args.p_status ?? null };
}

/**
 * Chama RPC de demografia. Usa assinatura única com p_status quando disponível;
 * faz fallback sem p_status apenas se a função antiga (9 params) ainda existir.
 */
export async function callGetReportsWithDemographics(
  args: DemographicsRpcArgs,
): Promise<RpcResult> {
  const withStatus = await supabase.rpc(RPC_NAME, buildRpcPayload(args, true));

  if (!withStatus.error) {
    return { data: withStatus.data, error: null, statusFilterInRpc: true };
  }

  const code = withStatus.error.code;
  if (code === 'PGRST202' || code === 'PGRST203') {
    const legacy = await supabase.rpc(RPC_NAME, buildRpcPayload(args, false));
    return {
      data: legacy.data,
      error: legacy.error,
      statusFilterInRpc: false,
    };
  }

  return {
    data: withStatus.data,
    error: withStatus.error,
    statusFilterInRpc: false,
  };
}
