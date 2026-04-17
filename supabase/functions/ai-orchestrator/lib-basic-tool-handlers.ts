import { type SupabaseClient } from "@supabase/supabase-js";

type ToolResult = { success: boolean; message: string; data?: unknown };

export async function handleSearchKnowledgeBase(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  deps: {
    searchKnowledgeBase: (supabase: SupabaseClient, query: string) => Promise<string | null>;
  },
): Promise<ToolResult> {
  const query = typeof args.query === "string" ? args.query.trim() : String(args.query ?? "");
  const result = await deps.searchKnowledgeBase(supabase, query);
  return {
    success: true,
    message: result || "Não encontrei informações sobre isso. Tente reformular a pergunta.",
  };
}

export async function handleGetServiceOccupancyStatus(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  deps: {
    getServiceOccupancyStatusByServiceId: (supabase: SupabaseClient, serviceId: string) => Promise<string>;
    getServiceOccupancyStatusByName: (
      supabase: SupabaseClient,
      serviceName: string,
      district?: string,
    ) => Promise<string>;
  },
): Promise<ToolResult> {
  const serviceId = typeof args.service_id === "string" ? args.service_id.trim() : "";
  if (serviceId && /^[a-f0-9-]{36}$/i.test(serviceId)) {
    const result = await deps.getServiceOccupancyStatusByServiceId(supabase, serviceId);
    return { success: true, message: result };
  }

  const serviceName = typeof args.service_name === "string" ? args.service_name.trim() : "";
  const district = typeof args.district === "string" ? args.district.trim() : "";
  if (!serviceName) {
    return {
      success: false,
      message: 'Me diga o nome do equipamento para eu consultar a ocupação (ex.: "CEU Butantã").',
    };
  }

  const result = await deps.getServiceOccupancyStatusByName(supabase, serviceName, district || undefined);
  return { success: true, message: result };
}

export async function handleSuggestCouncilMember(
  args: Record<string, unknown>,
  deps: {
    suggestCouncilMember: (issueType: string, description: string, district?: string) => Promise<string>;
  },
): Promise<ToolResult> {
  const issueType = String(args.issue_type ?? "");
  const description = String(args.description ?? "");
  const districtRaw = args.district;
  const district =
    districtRaw != null && String(districtRaw).trim() !== "" ? String(districtRaw).trim() : undefined;
  const result = await deps.suggestCouncilMember(issueType, description, district);
  return { success: true, message: result };
}

export async function handleGetCitizenHistory(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  deps: {
    getCitizenHistory: (
      supabase: SupabaseClient,
      userId: string,
      historyType: string,
      statusFilter: string,
      limit: number,
    ) => Promise<string>;
  },
): Promise<ToolResult> {
  const historyTypeArg =
    args.history_type != null && String(args.history_type).trim() !== ""
      ? String(args.history_type).trim()
      : "all";
  const statusFilterArg =
    args.status_filter != null && String(args.status_filter).trim() !== ""
      ? String(args.status_filter).trim()
      : "all";
  const rawLimit = args.limit;
  const limitParsed =
    typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? Math.floor(rawLimit)
      : parseInt(String(rawLimit ?? "5"), 10);
  const limitArg = Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 5;
  const result = await deps.getCitizenHistory(supabase, userId, historyTypeArg, statusFilterArg, limitArg);
  return { success: true, message: result };
}
