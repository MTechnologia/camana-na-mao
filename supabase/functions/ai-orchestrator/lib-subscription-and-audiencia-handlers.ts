import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ToolResult = { success: boolean; message: string; data?: unknown };

export async function handleSearchAudiencias(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  deps: {
    searchAudiencias: (
      supabase: SupabaseClient,
      tema?: string,
      status?: string,
      inscricoesAbertas?: boolean,
      dataInicio?: string,
      dataFim?: string,
      regiao?: string,
    ) => Promise<string>;
  },
): Promise<ToolResult> {
  const tema = args.tema != null && String(args.tema).trim() !== "" ? String(args.tema).trim() : undefined;
  const statusAud = args.status != null && String(args.status).trim() !== "" ? String(args.status).trim() : undefined;
  const inscricoesAbertas = typeof args.inscricoes_abertas === "boolean" ? args.inscricoes_abertas : undefined;
  const dataInicio = args.data_inicio != null && String(args.data_inicio).trim() !== "" ? String(args.data_inicio).trim() : undefined;
  const dataFim = args.data_fim != null && String(args.data_fim).trim() !== "" ? String(args.data_fim).trim() : undefined;
  const regiaoAud = args.regiao != null && String(args.regiao).trim() !== "" ? String(args.regiao).trim() : undefined;
  const result = await deps.searchAudiencias(
    supabase,
    tema,
    statusAud,
    inscricoesAbertas,
    dataInicio,
    dataFim,
    regiaoAud,
  );
  return { success: true, message: result };
}

export async function handleSubscribeAudienciaTopicAlert(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  if (!userId) {
    return {
      success: false,
      message: 'Para receber avisos quando houver audiências sobre um tema, faça login no app. Depois peça de novo: "avise quando tiver audiências sobre [tema]".',
    };
  }
  const temaRaw = typeof args.tema === "string" ? args.tema.trim() : "";
  if (!temaRaw) {
    return {
      success: false,
      message: "Informe o tema sobre o qual você quer receber avisos (ex.: Esportes, Saúde, Educação).",
    };
  }
  const tema = temaRaw.charAt(0).toUpperCase() + temaRaw.slice(1).toLowerCase();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client = serviceKey && supabaseUrl ? createClient(supabaseUrl, serviceKey) : supabase;
  const { error } = await client.from("audiencia_topic_alerts").upsert({ user_id: userId, tema }, { onConflict: "user_id,tema" });
  if (error) {
    console.error("[subscribe_audiencia_topic_alert]", error.code, error.message, error.details);
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return {
        success: false,
        message: "O recurso de avisos por tema ainda não está disponível neste ambiente. Em breve você poderá ativar esse aviso.",
      };
    }
    return { success: false, message: "Não foi possível registrar seu aviso. Tente novamente em instantes." };
  }
  return {
    success: true,
    message: `Anotado! Você receberá uma notificação no app quando houver novas audiências públicas sobre **${tema}**. Quer que eu busque agora se já existe alguma agendada sobre esse tema?`,
  };
}

export async function handleSubscribeService(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  if (!userId) {
    return {
      success: false,
      message: "Para acompanhar um equipamento público e receber avisos de novas avaliações, faça login no app. Depois peça de novo por aqui.",
    };
  }
  const rawServiceId = typeof args.service_id === "string" ? args.service_id.trim() : "";
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!rawServiceId || !uuidRe.test(rawServiceId)) {
    return {
      success: false,
      message: "Preciso do identificador do equipamento (UUID). No app, abra a página do equipamento ou use a busca por serviços próximos; a partir daí posso registrar o acompanhamento.",
    };
  }
  const supabaseUrlSvc = Deno.env.get("SUPABASE_URL");
  const serviceKeySvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientSvc = serviceKeySvc && supabaseUrlSvc ? createClient(supabaseUrlSvc, serviceKeySvc) : supabase;
  const { data: svcRow, error: svcErr } = await clientSvc
    .from("public_services")
    .select("id, name")
    .eq("id", rawServiceId)
    .maybeSingle();
  if (svcErr) {
    console.error("[subscribe_service]", svcErr.code, svcErr.message, svcErr.details);
    return { success: false, message: "Não foi possível confirmar o equipamento. Tente novamente em instantes." };
  }
  if (!svcRow?.id) {
    return { success: false, message: "Não encontrei esse equipamento na base. Confira o identificador ou busque o serviço no app." };
  }
  const { error: upErr } = await clientSvc.from("service_subscriptions").upsert(
    { user_id: userId, service_id: svcRow.id },
    { onConflict: "user_id,service_id" },
  );
  if (upErr) {
    console.error("[subscribe_service] upsert", upErr.code, upErr.message, upErr.details);
    if (upErr.code === "42P01" || upErr.message?.includes("does not exist")) {
      return {
        success: false,
        message: "O recurso de acompanhamento de equipamentos ainda não está disponível neste ambiente.",
      };
    }
    return { success: false, message: "Não foi possível registrar o acompanhamento. Tente novamente em instantes." };
  }
  const nome = typeof svcRow.name === "string" && svcRow.name.trim() !== "" ? svcRow.name.trim() : "este equipamento";
  return {
    success: true,
    message: `Pronto! Você passará a acompanhar **${nome}** e receberá aviso no app quando houver nova avaliação publicada por outros cidadãos.`,
  };
}

export async function handleSubscribeTransportLine(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  if (!userId) {
    return {
      success: false,
      message: 'Para acompanhar uma linha de transporte, faça login no app. Depois peça de novo: por exemplo, "acompanhar linha 8000-10".',
    };
  }
  const lineIdArg = typeof args.line_id === "string" ? args.line_id.trim() : "";
  const lineCodeArg = typeof args.line_code === "string" ? args.line_code.trim() : "";
  if (!lineIdArg && !lineCodeArg) {
    return {
      success: false,
      message: "Informe o código da linha (ex.: 8000-10) ou o identificador UUID da linha, se você tiver.",
    };
  }
  const uuidLineRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const supabaseUrlLn = Deno.env.get("SUPABASE_URL");
  const serviceKeyLn = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientLn = serviceKeyLn && supabaseUrlLn ? createClient(supabaseUrlLn, serviceKeyLn) : supabase;

  let resolvedLineId: string | null = null;
  let lineDisplay = "";

  if (lineIdArg && uuidLineRe.test(lineIdArg)) {
    const { data: byId, error: byIdErr } = await clientLn
      .from("transport_lines")
      .select("id, line_code, line_name")
      .eq("id", lineIdArg)
      .maybeSingle();
    if (byIdErr) {
      console.error("[subscribe_transport_line] by id", byIdErr);
      return { success: false, message: "Erro ao buscar a linha. Tente novamente em instantes." };
    }
    if (byId?.id) {
      resolvedLineId = byId.id as string;
      lineDisplay = `${byId.line_code} - ${byId.line_name}`;
    }
  }

  if (!resolvedLineId && lineCodeArg) {
    const safeCode = lineCodeArg.replace(/[%_\\]/g, "").trim();
    if (safeCode.length < 2) {
      return { success: false, message: "Use pelo menos 2 caracteres no código ou nome da linha." };
    }
    const { data: exact, error: exErr } = await clientLn
      .from("transport_lines")
      .select("id, line_code, line_name")
      .eq("line_code", safeCode)
      .maybeSingle();
    if (exErr) {
      console.error("[subscribe_transport_line] exact", exErr);
      return { success: false, message: "Erro ao buscar a linha. Tente novamente em instantes." };
    }
    if (exact?.id) {
      resolvedLineId = exact.id as string;
      lineDisplay = `${exact.line_code} - ${exact.line_name}`;
    } else {
      const { data: cand, error: candErr } = await clientLn
        .from("transport_lines")
        .select("id, line_code, line_name")
        .or(`line_code.ilike.%${safeCode}%,line_name.ilike.%${safeCode}%`)
        .limit(6);
      if (candErr) {
        console.error("[subscribe_transport_line] ilike", candErr);
        return { success: false, message: "Erro ao buscar a linha. Tente novamente em instantes." };
      }
      const list = cand ?? [];
      if (list.length === 0) {
        return {
          success: false,
          message: "Não encontrei essa linha. Confira o código oficial (ex.: 8000-10) ou busque a linha no app em Novo relato de transporte.",
        };
      }
      if (list.length > 1) {
        const amostra = list
          .slice(0, 4)
          .map((row: { line_code: string; line_name: string }) => `${row.line_code} (${row.line_name})`)
          .join("; ");
        return {
          success: false,
          message: `Há mais de uma linha parecida (${amostra}). Diga o código oficial completo da linha que deseja acompanhar.`,
        };
      }
      resolvedLineId = list[0].id as string;
      lineDisplay = `${list[0].line_code} - ${list[0].line_name}`;
    }
  }

  if (!resolvedLineId) {
    return {
      success: false,
      message: "Não consegui identificar a linha. Informe o código oficial completo (ex.: 8000-10) ou escolha a linha no app.",
    };
  }

  const { error: lnUpErr } = await clientLn.from("transport_subscriptions").upsert(
    { user_id: userId, line_id: resolvedLineId, subscription_type: "alert" },
    { onConflict: "user_id,line_id,subscription_type" },
  );
  if (lnUpErr) {
    console.error("[subscribe_transport_line] upsert", lnUpErr.code, lnUpErr.message, lnUpErr.details);
    if (lnUpErr.code === "42P01" || lnUpErr.message?.includes("does not exist")) {
      return {
        success: false,
        message: "O recurso de acompanhamento de linhas ainda não está disponível neste ambiente.",
      };
    }
    return { success: false, message: "Não foi possível registrar o acompanhamento. Tente novamente em instantes." };
  }

  return {
    success: true,
    message: `Pronto! Você acompanha a linha **${lineDisplay}** e receberá avisos no app sobre novos relatos e padrões relacionados a ela.`,
  };
}
