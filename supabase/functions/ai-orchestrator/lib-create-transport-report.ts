import { type SupabaseClient } from "@supabase/supabase-js";
import { appendConversationClosingIfNeeded } from "./lib-conversation-closing.ts";
import { TRANSPORT_REPORT_TRAMITE_AFTER_REGISTRATION } from "./lib-urban-tramite.ts";

type ToolResult = { success: boolean; message: string; data?: unknown };

type CreateTransportReportDeps = {
  isTransportLinePickerPayload: (value: string) => boolean;
  isValidDomainDescription: (text: string, domain: "urban" | "transport" | "service") => boolean;
  normalizeTransportSubcategory: (value: string) => string;
  generateTransportLabelFromDescription: (description: string) => string;
  isValidTransportSubcategory: (reportType: string, subcategory: string) => boolean;
  getTransportSubcategoryLabel: (reportType: string, subcategory: string) => string | null;
  getTransportTypeLabel: (reportType: string) => string;
  parseFlexibleOccurrenceTime: (value: string) => string | null;
  normalizeTransportRecurrenceFrequency: (value: string) => string | null;
  transportSeverityOrder: readonly string[];
  applyPersonalImpactToSeverity: (baseSeverity: string, personalImpactScore: number) => string;
  getTransportReportLatLonForBounds: (
    fields: Record<string, unknown>,
    fallback?: Record<string, unknown>,
  ) => { lat: number; lon: number } | null;
  isPointInSaoPauloBounds: (lat: number, lng: number) => boolean;
  normalizeTransportAccessibilityDetails: (raw: unknown) => Record<string, unknown> | null;
  insertClassificationPredictionLog: (
    supabase: SupabaseClient,
    params: {
      userId: string;
      reportId: string;
      reportType: "urban" | "transport";
      predictedCategory: string;
      predictedSubcategory: string | null;
      classificationSource: string;
    },
  ) => Promise<void>;
  inferTransportClassificationSource: (accumulated: Record<string, unknown> | undefined) => string;
  insertReportSeverityAuditLog: (
    supabase: SupabaseClient,
    entry: {
      urban_report_id?: string;
      transport_report_id?: string;
      metric: string;
      previous_value?: string | null;
      new_value: string;
      justification: string;
      source_snippet?: string | null;
      confidence?: number | null;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<void>;
  formatTransportAccessibilitySummary: (raw: unknown) => string | null;
  detectEmergingCategory: (description: string, category: string, supabase: SupabaseClient) => Promise<unknown>;
};

const TRANSPORT_TYPE_LABELS: Record<string, string> = {
  atraso: "Atraso",
  lotacao: "Lotação",
  seguranca: "Segurança",
  acessibilidade: "Acessibilidade",
  limpeza: "Limpeza",
  conducao: "Condução",
  outro: "Outro",
};

const TRANSPORT_SEVERITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const TRANSPORT_RECURRENCE_LABELS: Record<string, string> = {
  primeira_vez: "Primeira vez",
  algumas_vezes_mes: "Algumas vezes/mês",
  toda_semana: "Toda semana",
  todos_os_dias: "Todos os dias",
};

function inferReportTypeFromDescription(description: string): string | null {
  const desc = description.toLowerCase();

  if (/ass[ée]dio|encox|importun|importuna[cç][aã]o|abuso|agress|ameaç|roubo|furto|assalto|arma|facão|faca|briga|violên|estup|molest|insegur/i.test(desc)) {
    return "seguranca";
  }
  if (/atras|demor|não (veio|passou|chegou)|espera|aguard|15\s*min|20\s*min|30\s*min|meia hora|uma hora/i.test(desc)) {
    return "atraso";
  }
  if (/lot[aç]|cheio|superlot|aperta|empurr|não (coube|cabe)|sardinha/i.test(desc)) {
    return "lotacao";
  }
  if (/elevador|rampa|cadeira|deficien|acessib|cego|surdo|mobilidade/i.test(desc)) {
    return "acessibilidade";
  }
  if (/suj[oa]|lixo|fedido|mal cheiro|imundo|nojento|barata|rato|inseto/i.test(desc)) {
    return "limpeza";
  }
  if (/motorista|dirig|freiada|acelera|imprudên|perigos|costur/i.test(desc)) {
    return "conducao";
  }

  return null;
}

function buildTransportSuccessMessage(
  data: { id: string; protocol_code: string | null },
  args: Record<string, unknown>,
  validReportType: string,
  validSubCategory: string,
  subcategoryLabel: unknown,
  inferredSeverity: string,
  stopNameInsert: string | null,
  stopLocationInsert: string | null,
  accessibilityInsert: Record<string, unknown>,
  photosArray: unknown[] | null,
  deps: CreateTransportReportDeps,
): string {
  const typeLabel = TRANSPORT_TYPE_LABELS[validReportType] || validReportType;
  const subDetailLabel =
    deps.getTransportSubcategoryLabel(validReportType, validSubCategory) ||
    String(subcategoryLabel ?? "") ||
    "";
  const severityLabel = TRANSPORT_SEVERITY_LABELS[String(inferredSeverity)] || String(inferredSeverity);
  const recurrenceLabel =
    TRANSPORT_RECURRENCE_LABELS[String(args.recurrence_frequency)] || String(args.recurrence_frequency || "");
  const descPreview = String(args.description ?? "");
  const accessibilitySummary = deps.formatTransportAccessibilitySummary(accessibilityInsert);

  const body = [
    `[TRANSPORT_CREATED:${data.id}]`,
    "",
    "✅ **Relato de transporte registrado!**",
    "",
    data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`\n` : "",
    "**Resumo do seu relato:**",
    "",
    `📋 **Tipo:** ${typeLabel}${subDetailLabel ? ` - ${subDetailLabel}` : ""}`,
    `🚌 **Linha:** ${args.line_code || "Não informada"}`,
    `📅 **Data:** ${args.occurrence_date}`,
    args.occurrence_time ? `🕐 **Horário:** ${args.occurrence_time}` : "",
    args.direction ? `🧭 **Sentido:** ${String(args.direction).charAt(0).toUpperCase()}${String(args.direction).slice(1)}` : "",
    recurrenceLabel ? `🔁 **Frequência:** ${recurrenceLabel}` : "",
    args.location ? `📍 **Local:** ${args.location}` : "",
    stopNameInsert ? `🚏 **Parada / estação:** ${stopNameInsert}` : "",
    stopLocationInsert ? `📌 **Ponto / referência:** ${stopLocationInsert}` : "",
    accessibilitySummary ? `♿ **Acessibilidade:** ${accessibilitySummary}` : "",
    photosArray?.length ? `📷 **Fotos anexadas:** ${photosArray.length} imagem(ns)` : "",
    `⚠️ **Gravidade:** ${severityLabel}`,
    "",
    `📝 **Descrição:** ${descPreview.substring(0, 100)}${descPreview.length > 100 ? "..." : ""}`,
    "",
    "---",
    "",
    TRANSPORT_REPORT_TRAMITE_AFTER_REGISTRATION,
    "",
    "---",
    "",
    "🔗 [Ver Meus Relatos](/transporte/meus-relatos) para acompanhar.",
    "",
    "**Quer que eu encaminhe esse relato para algum vereador?**",
    "",
    "Posso ajudar com mais alguma coisa?",
  ].filter((line) => line !== "").join("\n");

  return appendConversationClosingIfNeeded(body, { kind: "transport_report_created" });
}

export async function handleCreateTransportReport(
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
  accumulatedFields: Record<string, unknown> | undefined,
  deps: CreateTransportReportDeps,
): Promise<ToolResult> {
  const argsState = { ...args } as Record<string, unknown>;
  const acc = accumulatedFields ?? {};

  if (acc.date_confirmed && !argsState.date_confirmed) {
    argsState.date_confirmed = true;
    console.log("[create_transport_report] Inherited date_confirmed from accumulatedFields");
  }
  if (acc.occurrence_date && !argsState.occurrence_date) {
    argsState.occurrence_date = acc.occurrence_date;
  }
  if (acc.line_code && !argsState.line_code) {
    argsState.line_code = acc.line_code;
  }
  if (acc.line_id && !argsState.line_id) {
    argsState.line_id = acc.line_id;
  }
  if (acc.personal_impact != null && argsState.personal_impact == null) {
    argsState.personal_impact = acc.personal_impact;
  }
  if (acc.impact_description && !argsState.impact_description) {
    argsState.impact_description = acc.impact_description;
  }
  if (acc.stop_name != null && !argsState.stop_name) {
    argsState.stop_name = acc.stop_name as string;
  }
  if (acc.stop_location != null && argsState.stop_location == null) {
    argsState.stop_location = acc.stop_location as string;
  }
  if (acc.accessibility_details != null && argsState.accessibility_details == null) {
    argsState.accessibility_details = acc.accessibility_details;
  }

  const accDescRaw = typeof acc.description === "string" ? String(acc.description).trim() : "";
  const argDescRaw = String(argsState.description ?? "").trim();
  if (accDescRaw && !deps.isTransportLinePickerPayload(accDescRaw) && (!argDescRaw || deps.isTransportLinePickerPayload(argDescRaw))) {
    argsState.description = accDescRaw;
    console.log("[create_transport_report] Using narrative description from accumulatedFields (tool args had line picker or empty)");
  }

  const descTrimmed = String(argsState.description ?? "").trim();
  if (!descTrimmed || !deps.isValidDomainDescription(descTrimmed, "transport")) {
    return {
      success: false,
      message: "[FIELD_REQUEST:description]**O que aconteceu?** Me conta o problema com mais detalhes.",
    };
  }
  if (descTrimmed.length < 20) {
    return {
      success: false,
      message: "[FIELD_REQUEST:description]Para registrar com qualidade, preciso de **pelo menos 20 caracteres**: o que aconteceu, em qual trecho ou parada, e como isso te afetou?",
    };
  }

  let validReportType = argsState.report_type;
  let subcategoryLabel = argsState.subcategory_label || null;
  const rawSubCategory = argsState.sub_category ?? acc.sub_category;
  let validSubCategory = rawSubCategory ? deps.normalizeTransportSubcategory(String(rawSubCategory)) : "";

  if (!validReportType || validReportType === "outro") {
    const inferred = inferReportTypeFromDescription(descTrimmed);
    if (inferred) {
      validReportType = inferred;
      console.log("[create_transport_report] Inferred report_type:", validReportType, "from description");
    } else {
      validReportType = "outro";
      subcategoryLabel = deps.generateTransportLabelFromDescription(descTrimmed);
      console.log("[create_transport_report] Fallback to outro with label:", subcategoryLabel);
    }
  }

  if (!validSubCategory) {
    return {
      success: false,
      message: `[FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:${String(validReportType).toLowerCase()}]`,
    };
  }
  if (!deps.isValidTransportSubcategory(String(validReportType), validSubCategory)) {
    return {
      success: false,
      message: `[FIELD_REQUEST:sub_category]Escolha uma opção da lista para detalhar o problema.[SUBCATEGORY_PICKER:${String(validReportType).toLowerCase()}]`,
    };
  }
  argsState.sub_category = validSubCategory;

  if (!subcategoryLabel && validReportType !== "outro") {
    const reportTypeStr = String(validReportType);
    subcategoryLabel =
      deps.getTransportSubcategoryLabel(reportTypeStr, validSubCategory) ||
      deps.getTransportTypeLabel(reportTypeStr);
  }

  let effectiveLineCode = String(argsState.line_code ?? "").trim();
  const rawLineIdForLine = typeof argsState.line_id === "string" ? argsState.line_id.trim() : "";
  if (!effectiveLineCode && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLineIdForLine)) {
    const { data: hydratedLine } = await supabase
      .from("transport_lines")
      .select("line_code")
      .eq("id", rawLineIdForLine)
      .maybeSingle();
    if (hydratedLine?.line_code) effectiveLineCode = String(hydratedLine.line_code).trim();
  }
  if (!effectiveLineCode) {
    return {
      success: false,
      message: "[FIELD_REQUEST:line_code]**Qual linha ou estação** teve o problema?",
    };
  }
  argsState.line_code = effectiveLineCode;

  if (!argsState.occurrence_date) {
    return {
      success: false,
      message: "[FIELD_REQUEST:occurrence_date]**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)",
    };
  }

  const todayYmd = new Date().toISOString().split("T")[0];
  const occYmd = String(argsState.occurrence_date).trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  if (occYmd && occYmd > todayYmd) {
    return {
      success: false,
      message: "[FIELD_REQUEST:occurrence_date]A data da ocorrência **não pode ser no futuro**. Quando isso aconteceu (hoje, ontem ou a data correta)?",
    };
  }

  if (!argsState.occurrence_time) {
    return {
      success: false,
      message: "[FIELD_REQUEST:occurrence_time]Qual foi o **horário exato** da ocorrência? [TIME_PICKER]",
    };
  }

  const normalizedTime = deps.parseFlexibleOccurrenceTime(String(argsState.occurrence_time || ""));
  if (!normalizedTime) {
    return {
      success: false,
      message: "[FIELD_REQUEST:occurrence_time]Não consegui entender o horário. Pode informar no formato **HH:MM**? [TIME_PICKER]",
    };
  }
  argsState.occurrence_time = normalizedTime;

  if (!argsState.direction || !["ida", "volta", "circular"].includes(String(argsState.direction).toLowerCase())) {
    return {
      success: false,
      message: "[FIELD_REQUEST:direction]Qual era o **sentido** da viagem? [DIRECTION_PICKER]",
    };
  }
  argsState.direction = String(argsState.direction).toLowerCase();

  const normalizedRecurrence = deps.normalizeTransportRecurrenceFrequency(
    String(argsState.recurrence_frequency || acc.recurrence_frequency || ""),
  );
  if (!normalizedRecurrence) {
    return {
      success: false,
      message: "[FIELD_REQUEST:recurrence_frequency]Com qual frequência isso acontece? [RECURRENCE_FREQUENCY_PICKER]",
    };
  }
  argsState.recurrence_frequency = normalizedRecurrence;

  const piRaw = argsState.personal_impact ?? acc.personal_impact;
  const personalImpactScore =
    typeof piRaw === "number" && Number.isFinite(piRaw)
      ? piRaw
      : parseInt(String(piRaw ?? ""), 10);
  if (!Number.isFinite(personalImpactScore) || personalImpactScore < 2 || personalImpactScore > 5) {
    return {
      success: false,
      message: "[FIELD_REQUEST:personal_impact]Como isso afetou **sua rotina**? Toque em uma opção abaixo. [IMPACT_PICKER]",
    };
  }

  if (argsState.occurrence_date === todayYmd && !argsState.date_confirmed) {
    console.log("[create_transport_report] Date is today but not explicitly confirmed, asking user");
    return {
      success: false,
      message: "[FIELD_REQUEST:occurrence_date]Isso aconteceu **hoje**? Me confirma a data.",
    };
  }

  let lineId: string | null = null;
  const rawLineId = typeof argsState.line_id === "string" ? argsState.line_id.trim() : "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLineId)) {
    const { data: byId } = await supabase
      .from("transport_lines")
      .select("id")
      .eq("id", rawLineId)
      .maybeSingle();
    lineId = byId?.id ?? null;
  }
  if (!lineId && argsState.line_code) {
    const { data: lineRows } = await supabase
      .from("transport_lines")
      .select("id")
      .ilike("line_code", String(argsState.line_code).trim())
      .limit(1);
    lineId = lineRows?.[0]?.id ?? null;
  }

  let baseSeverity = validReportType === "seguranca" ? "alta" : String(argsState.severity || "media").toLowerCase();
  if (!deps.transportSeverityOrder.includes(baseSeverity)) {
    baseSeverity = "media";
  }
  const inferredSeverity = deps.applyPersonalImpactToSeverity(baseSeverity, personalImpactScore);

  const { data: protocolData, error: protocolError } = await supabase.rpc("generate_protocol_code", { p_type: "transport" });
  if (protocolError) {
    console.error("[executeTool] Protocol generation failed:", protocolError);
  }
  const protocolCode = protocolData || null;

  console.log("[create_transport_report] Attempting to insert report:", {
    userId,
    report_type: validReportType,
    hasDescription: !!argsState.description,
    hasLineCode: !!argsState.line_code,
    hasOccurrenceDate: !!argsState.occurrence_date,
    lineId,
  });

  const photosArray = Array.isArray(argsState.photos) && argsState.photos.length > 0
    ? argsState.photos.slice(0, 3)
    : null;

  const coordsForSp = deps.getTransportReportLatLonForBounds(argsState, acc);
  if (coordsForSp && !deps.isPointInSaoPauloBounds(coordsForSp.lat, coordsForSp.lon)) {
    return {
      success: false,
      message: "[FIELD_REQUEST:stop_location]As coordenadas informadas estão **fora do município de São Paulo**. Este canal atende ocorrências na capital; ajuste o GPS ou informe um ponto dentro da cidade.",
    };
  }

  const rawStopName = String(argsState.stop_name ?? "").trim();
  const stopNameInsert = rawStopName.length >= 2 ? rawStopName.slice(0, 200) : null;
  const rawStopLoc = String(argsState.stop_location ?? "").trim();
  const stopLocationInsert = rawStopLoc.length >= 2 ? rawStopLoc.slice(0, 500) : null;
  const accessibilityInsert =
    deps.normalizeTransportAccessibilityDetails(argsState.accessibility_details ?? acc.accessibility_details) ?? {};

  const { data, error } = await supabase
    .from("transport_reports")
    .insert({
      user_id: userId,
      protocol_code: protocolCode,
      report_type: validReportType,
      description: argsState.description,
      occurrence_date: argsState.occurrence_date,
      occurrence_time: argsState.occurrence_time || null,
      direction: argsState.direction || null,
      recurrence_frequency: argsState.recurrence_frequency || null,
      line_id: lineId,
      line_code_custom: argsState.line_code || null,
      sub_category: validSubCategory,
      location: argsState.location || null,
      stop_name: stopNameInsert,
      stop_location: stopLocationInsert,
      accessibility_details: accessibilityInsert,
      severity: inferredSeverity,
      personal_impact: personalImpactScore,
      impact_description: argsState.impact_description || null,
      status: "pending",
      photos: photosArray,
    })
    .select("id, protocol_code")
    .single();

  if (error) {
    console.error("[create_transport_report] Database insert error:", error);
    throw error;
  }

  console.log("[create_transport_report] Report saved successfully:", {
    id: data.id,
    protocol_code: data.protocol_code,
  });

  try {
    await deps.insertClassificationPredictionLog(supabase, {
      userId,
      reportId: data.id,
      reportType: "transport",
      predictedCategory: String(validReportType),
      predictedSubcategory: subcategoryLabel ? String(subcategoryLabel) : null,
      classificationSource: deps.inferTransportClassificationSource(accumulatedFields as Record<string, unknown> | undefined),
    });
  } catch (metricErr) {
    console.warn("[create_transport_report] classification metric log failed:", metricErr);
  }

  const transportSeverityJustification =
    validReportType === "seguranca"
      ? "Política: relato classificado como 'seguranca' → severidade base 'alta'."
      : argsState.severity
        ? `Severidade informada na coleta: ${argsState.severity}.`
        : "Severidade padrão 'media' (sem valor explícito na coleta).";
  const impactNote = ` Impacto na rotina (HU-5.3): escala ${personalImpactScore}/5 aplicada sobre a severidade base.`;

  await deps.insertReportSeverityAuditLog(supabase, {
    transport_report_id: data.id,
    metric: "severity",
    previous_value: null,
    new_value: inferredSeverity,
    justification: transportSeverityJustification + impactNote,
    source_snippet: String(argsState.description || "").trim().slice(0, 240) || null,
    metadata: {
      report_type: validReportType,
      user_provided_severity: argsState.severity ?? null,
      personal_impact: personalImpactScore,
    },
  });

  const successMessage = buildTransportSuccessMessage(
    data,
    argsState,
    String(validReportType),
    validSubCategory,
    subcategoryLabel,
    inferredSeverity,
    stopNameInsert,
    stopLocationInsert,
    accessibilityInsert,
    photosArray,
    deps,
  );

  try {
    await deps.detectEmergingCategory(String(argsState.description ?? ""), String(validReportType), supabase);
    console.log("[executeTool] Emerging category detection completed for transport report");
  } catch (detectError) {
    console.error("[executeTool] Transport emerging pattern detection failed:", detectError);
  }

  return {
    success: true,
    message: successMessage,
    data: { id: data.id, protocol_code: data.protocol_code, type: "transport" },
  };
}
