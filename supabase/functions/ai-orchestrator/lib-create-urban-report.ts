import { type SupabaseClient } from "@supabase/supabase-js";
import { appendConversationClosingIfNeeded } from "./lib-conversation-closing.ts";
import {
  URBAN_AFFECTED_SCOPE_FIELD_PROMPT,
  URBAN_RISK_LEVEL_FIELD_PROMPT,
} from "./lib-prompt-ux.ts";
import { URBAN_REPORT_TRAMITE_AFTER_REGISTRATION } from "./lib-urban-tramite.ts";

type ToolResult = { success: boolean; message: string; data?: unknown };

type GeocodeAddressInput = {
  street?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  cep?: string | null;
  city?: string | null;
};

type GeocodeCoords = { lat: number; lon: number } | null;
type ProximityAdjustment = { adjustedSeverity: string; proximityDetails: string[] } | null;
type AutoInferRiskResult = { risk_level: string | null; confidence: number; risk_types?: string[] };

type CreateUrbanReportDeps = {
  validUrbanCategories: readonly string[];
  urbanRiskCollectionCategories: readonly string[];
  proximityRadiusMeters: number;
  isCitySaoPaulo: (city: string | undefined | null) => boolean;
  messageOutsideSaoPaulo: (city: string | undefined) => string;
  isValidDomainDescription: (text: string, domain: "urban" | "transport" | "service") => boolean;
  mapUrbanRiskLevelToSeverity: (riskLevel: string | null | undefined) => string | null;
  geocodeAddressWithGoogle: (supabase: SupabaseClient, addressParts: GeocodeAddressInput) => Promise<GeocodeCoords>;
  geocodeAddressToCoord: (addressParts: GeocodeAddressInput) => Promise<GeocodeCoords>;
  adjustSeverityForProximityToSensitiveEquipment: (
    supabase: SupabaseClient,
    lat: number,
    lon: number,
    currentSeverity: string | null,
  ) => Promise<ProximityAdjustment>;
  normalizeReportNature: (reportNature: string | null | undefined) => string | null;
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
  inferUrbanClassificationSource: (accumulated: Record<string, unknown> | undefined) => string;
  autoInferRisk: (description: string) => AutoInferRiskResult;
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
  detectEmergingCategory: (description: string, category: string, supabase: SupabaseClient) => Promise<unknown>;
};

const URBAN_CATEGORY_LABELS: Record<string, string> = {
  iluminacao: "Iluminação",
  via_publica: "Via Pública",
  pavimentacao: "Pavimentação",
  calcada: "Calçada",
  sinalizacao: "Sinalização",
  drenagem: "Drenagem",
  lixo: "Lixo/Entulho",
  esgoto: "Esgoto/Bueiro",
  area_verde: "Área Verde",
  higiene_urbana: "Higiene Urbana",
  animais: "Animais",
  poluicao: "Poluição",
  feedback_camara: "Feedback Câmara",
  outro: "Outro",
};

const URBAN_RISK_CATEGORY_LABELS: Record<string, string> = {
  via_publica: "via pública",
  pavimentacao: "pavimentação",
  iluminacao: "iluminação",
  esgoto: "esgoto/alagamento",
  area_verde: "área verde",
  calcada: "calçada",
  sinalizacao: "sinalização",
  drenagem: "drenagem",
  poluicao: "poluição",
  lixo: "lixo/entulho",
  higiene_urbana: "higiene urbana",
  animais: "animais",
  outro: "outro tema",
};

const URBAN_RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  moderate: "Moderado",
  low: "Baixo",
  none: "Nenhum",
};

const URBAN_SCOPE_LABELS: Record<string, string> = {
  individual: "Apenas eu",
  local: "Local (rua/quadra)",
  street: "Toda a rua",
  building: "Meu prédio/vizinhança",
  block: "Quadra inteira",
  neighborhood: "Bairro",
  regional: "Regional (bairro)",
  citywide: "Cidade toda",
  zone: "Zona",
  city: "Cidade toda",
};

const URBAN_RISK_TYPE_LABELS: Record<string, string> = {
  electrical: "Elétrico",
  traffic: "Trânsito",
  flooding: "Alagamento",
  structural: "Estrutural",
  health: "Saúde",
  fire: "Incêndio",
  pedestrian: "Pedestre",
  vehicle: "Veicular",
  environmental: "Ambiental",
};

const URBAN_CONSEQUENCE_LABELS: Record<string, string> = {
  power_outage: "Falta de luz",
  water_outage: "Falta de água",
  traffic_blocked: "Trânsito bloqueado",
  flooding: "Alagamento",
  health_hazard: "Risco à saúde",
  service_disruption: "Serviço interrompido",
  pedestrian_blocked: "Pedestres bloqueados",
  accidents_reported: "Acidentes reportados",
  property_damage: "Dano à propriedade",
  safety_risk: "Risco à segurança",
};

function buildUrbanLocationAddress(eff: Record<string, unknown>): string {
  const locationParts = [];
  if (eff.street) locationParts.push(eff.street);
  if (eff.street_number) locationParts.push(eff.street_number);
  if (eff.reference_point) locationParts.push(`(${eff.reference_point})`);
  if (eff.neighborhood) locationParts.push(`- ${eff.neighborhood}`);
  return locationParts.join(" ");
}

function buildUrbanSeveritySummaryLines(
  eff: Record<string, unknown>,
  acc: Record<string, unknown>,
  urbanRiskCollectionCategories: readonly string[],
): string[] {
  const summaryRiskLevel = String(
    eff.risk_level != null && eff.risk_level !== ""
      ? eff.risk_level
      : acc.risk_level != null && acc.risk_level !== ""
        ? acc.risk_level
        : "",
  ).trim();
  const summaryRiskTypes: string[] =
    Array.isArray(eff.risk_types) && (eff.risk_types as unknown[]).length > 0
      ? (eff.risk_types as string[])
      : Array.isArray(acc.risk_types) && (acc.risk_types as unknown[]).length > 0
        ? (acc.risk_types as string[])
        : [];
  const summaryAffected =
    eff.affected_scope != null && eff.affected_scope !== ""
      ? eff.affected_scope
      : acc.affected_scope != null && acc.affected_scope !== ""
        ? acc.affected_scope
        : null;

  const hasUrbanSeverity =
    urbanRiskCollectionCategories.includes(String(eff.category || "")) && summaryRiskLevel.length > 0;

  if (!hasUrbanSeverity) {
    return [];
  }

  const lines: string[] = [
    `⚠️ **Gravidade / criticidade:** ${URBAN_RISK_LABELS[summaryRiskLevel] || summaryRiskLevel}`,
  ];

  if (summaryRiskTypes.length) {
    const translatedTypes = summaryRiskTypes.map((t: string) => URBAN_RISK_TYPE_LABELS[t] || t);
    lines.push(`🔗 **Tipos de risco:** ${translatedTypes.join(", ")}`);
  }
  if (summaryAffected != null && summaryAffected !== "") {
    lines.push(`👥 **Afetação:** ${URBAN_SCOPE_LABELS[String(summaryAffected)] || summaryAffected}`);
  }
  if (eff.affected_estimate) {
    lines.push(`📊 **Pessoas afetadas (estimativa):** ~${eff.affected_estimate}`);
  }
  const activeConsequences = Array.isArray(eff.active_consequences) ? (eff.active_consequences as string[]) : [];
  if (activeConsequences.length) {
    const translatedConseq = activeConsequences.map((c: string) => URBAN_CONSEQUENCE_LABELS[c] || c);
    lines.push(`⚡ **Consequências ativas:** ${translatedConseq.join(", ")}`);
  }

  return lines;
}

function buildUrbanSuccessMessage(
  data: { id: string; protocol_code: string | null },
  eff: Record<string, unknown>,
  acc: Record<string, unknown>,
  urbanRiskCollectionCategories: readonly string[],
): string {
  const categoryLabel = URBAN_CATEGORY_LABELS[String(eff.category)] || String(eff.category);
  const addressParts: string[] = [];
  if (eff.street) addressParts.push(String(eff.street));
  if (eff.street_number) addressParts.push(String(eff.street_number));
  const addressLine = addressParts.join(", ");
  const neighborhoodLine = String(eff.neighborhood || "");
  const cepLine = eff.cep ? `CEP ${eff.cep}` : "";
  const urbanSeveritySummaryLines = buildUrbanSeveritySummaryLines(eff, acc, urbanRiskCollectionCategories);
  const photosSection = Array.isArray(eff.photos) && eff.photos.length > 0
    ? `📷 **Fotos anexadas:** ${eff.photos.length} imagem(ns)`
    : null;

  const lines: (string | null)[] = [
    `[REPORT_CREATED:${data.id}]`,
    "",
    "✅ **Relato registrado com sucesso!**",
    "",
    data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`` : null,
    data.protocol_code ? "" : null,
    "**Resumo do seu relato:**",
    "",
    `📋 **Categoria:** ${categoryLabel}${eff.subcategory ? ` - ${eff.subcategory}` : ""}`,
    "",
    `📝 **Descrição:** ${eff.description}`,
    ...(urbanSeveritySummaryLines.length > 0 ? ["", ...urbanSeveritySummaryLines] : []),
    "",
    "📍 **Endereço:**",
    addressLine ? `- ${addressLine}` : null,
    neighborhoodLine ? `- ${neighborhoodLine}` : null,
    cepLine ? `- ${cepLine}` : null,
    eff.reference_point ? `- Referência: ${eff.reference_point}` : null,
    photosSection ? "" : null,
    photosSection,
    "",
    "---",
    "",
    URBAN_REPORT_TRAMITE_AFTER_REGISTRATION,
    "",
    "---",
    "",
    "🔗 [Ver Meus Relatos](/relato-urbano/historico) para acompanhar o status",
    "",
    "**Quer que eu encaminhe esse relato para algum vereador?**",
    "",
    "Posso ajudar com mais alguma coisa?",
  ];

  const body = lines.filter((line): line is string => line !== null).join("\n");
  return appendConversationClosingIfNeeded(body, {
    kind: "urban_report_created",
    reportNature: eff.report_nature != null ? String(eff.report_nature) : null,
  });
}

export async function handleCreateUrbanReport(
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
  accumulatedFields: Record<string, unknown> | undefined,
  deps: CreateUrbanReportDeps,
): Promise<ToolResult> {
  const acc = (accumulatedFields || {}) as Record<string, unknown>;
  const rawArgs = (args || {}) as Record<string, unknown>;
  const argsSanitized = Object.fromEntries(
    Object.entries(rawArgs).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
  const eff: Record<string, unknown> = { ...acc, ...argsSanitized };

  const restoreEmptyFromAcc = (key: "risk_level" | "affected_scope" | "urgency_reason") => {
    const value = eff[key];
    const fromAcc = acc[key];
    const empty = value === undefined || value === null || value === "";
    if (empty && fromAcc != null && fromAcc !== "") eff[key] = fromAcc;
  };
  restoreEmptyFromAcc("risk_level");
  restoreEmptyFromAcc("affected_scope");
  restoreEmptyFromAcc("urgency_reason");

  const rtEff = eff.risk_types;
  const rtAcc = acc.risk_types;
  if ((!Array.isArray(rtEff) || rtEff.length === 0) && Array.isArray(rtAcc) && rtAcc.length > 0) {
    eff.risk_types = rtAcc;
  }

  const reportCity = (eff.city ?? acc.city) as string | undefined;
  if (reportCity && !deps.isCitySaoPaulo(reportCity)) {
    return {
      success: false,
      message: deps.messageOutsideSaoPaulo(reportCity),
    };
  }

  if (!eff.category) {
    return {
      success: false,
      message: "Preciso saber a categoria do relato (iluminação, buraco, esgoto, lixo, área verde, etc.). Pode descrever melhor o local ou o tema?",
    };
  }

  if (!deps.validUrbanCategories.includes(String(eff.category))) {
    console.error("[create_urban_report] Invalid category:", eff.category);
    return {
      success: false,
      message: `Categoria inválida: ${eff.category}. Categorias válidas: ${deps.validUrbanCategories.join(", ")}`,
    };
  }

  const isValidDescription = eff.description && deps.isValidDomainDescription(String(eff.description).trim(), "urban");
  if (!isValidDescription) {
    return {
      success: false,
      message: "[FIELD_REQUEST:description]Por favor, descreva o problema com mais detalhes. O que está acontecendo exatamente?",
    };
  }

  if (!eff.street || !eff.neighborhood) {
    return {
      success: false,
      message: "Preciso saber a rua e o bairro para registrar o relato. Qual o CEP ou endereço do local?",
    };
  }

  if (deps.urbanRiskCollectionCategories.includes(String(eff.category || ""))) {
    if (!eff.risk_level) {
      const label = URBAN_RISK_CATEGORY_LABELS[String(eff.category)] || eff.category;
      return {
        success: false,
        message: `${URBAN_RISK_LEVEL_FIELD_PROMPT} _(Categoria: ${label})_`,
      };
    }

    if (!eff.affected_scope) {
      return {
        success: false,
        message: URBAN_AFFECTED_SCOPE_FIELD_PROMPT,
      };
    }
  }

  const locationAddress = buildUrbanLocationAddress(eff);

  const { data: protocolData, error: protocolError } = await supabase.rpc("generate_protocol_code", { p_type: "urban" });
  if (protocolError) {
    console.error("[executeTool] Protocol generation failed:", protocolError);
  }
  const protocolCode = protocolData || null;

  let derivedSeverity = deps.mapUrbanRiskLevelToSeverity((eff.risk_level as string) || null);
  let reportLat: number | null = null;
  let reportLon: number | null = null;
  let proximityAdjustment: ProximityAdjustment = null;

  const addrForGeocode = {
    street: (eff.street as string) || null,
    street_number: (eff.street_number as string) || null,
    neighborhood: (eff.neighborhood as string) || null,
    cep: (eff.cep as string) || null,
    city: ((eff.city ?? acc.city) as string | null) || "São Paulo",
  };
  let coords = await deps.geocodeAddressWithGoogle(supabase, addrForGeocode);
  if (!coords) {
    coords = await deps.geocodeAddressToCoord(addrForGeocode);
  }
  if (coords) {
    reportLat = coords.lat;
    reportLon = coords.lon;
    proximityAdjustment = await deps.adjustSeverityForProximityToSensitiveEquipment(
      supabase,
      reportLat,
      reportLon,
      derivedSeverity,
    );
    if (proximityAdjustment) {
      derivedSeverity = proximityAdjustment.adjustedSeverity;
    }
  }

  const reportNatureResolved =
    deps.normalizeReportNature((eff.report_nature as string) ?? (acc.report_nature as string)) ?? "reclamacao";

  console.log("[create_urban_report] Attempting to insert report:", {
    userId,
    category: eff.category,
    report_nature: reportNatureResolved,
    hasDescription: !!eff.description,
    hasStreet: !!eff.street,
    hasNeighborhood: !!eff.neighborhood,
    location_address: locationAddress,
    derivedSeverity,
  });

  const { data, error } = await supabase
    .from("urban_reports")
    .insert({
      user_id: userId,
      protocol_code: protocolCode,
      category: eff.category,
      subcategory: eff.subcategory || null,
      report_nature: reportNatureResolved,
      description: eff.description,
      location_address: locationAddress,
      cep: eff.cep || null,
      street: eff.street || null,
      street_number: eff.street_number || null,
      reference_point: eff.reference_point || null,
      neighborhood: eff.neighborhood || null,
      latitude: reportLat,
      longitude: reportLon,
      photos: Array.isArray(eff.photos) && eff.photos.length > 0 ? eff.photos : null,
      ai_classification: {
        council_member_name: eff.council_member_name || null,
        council_member_party: eff.council_member_party || null,
      },
      risk_level: eff.risk_level || null,
      risk_types: eff.risk_types || [],
      affected_scope: eff.affected_scope || null,
      affected_estimate: eff.affected_estimate || null,
      active_consequences: eff.active_consequences || [],
      urgency_reason: eff.urgency_reason || null,
      severity: derivedSeverity,
      status: "pending",
    })
    .select("id, protocol_code")
    .single();

  if (error) {
    console.error("[create_urban_report] Database insert error:", error);
    throw error;
  }

  console.log("[create_urban_report] Report saved successfully:", {
    id: data.id,
    protocol_code: data.protocol_code,
  });

  try {
    await deps.insertClassificationPredictionLog(supabase, {
      userId,
      reportId: data.id,
      reportType: "urban",
      predictedCategory: String(eff.category),
      predictedSubcategory: eff.subcategory ? String(eff.subcategory) : null,
      classificationSource: deps.inferUrbanClassificationSource(accumulatedFields as Record<string, unknown> | undefined),
    });
  } catch (metricErr) {
    console.warn("[create_urban_report] classification metric log failed:", metricErr);
  }

  if (eff.risk_level) {
    const desc = String(eff.description || "").trim();
    const snippet = desc.slice(0, 240);
    const autoAgain = desc ? deps.autoInferRisk(desc) : null;
    const isAuto = String(eff.urgency_reason || "").startsWith("Auto-inferido");
    const justification =
      (eff.urgency_reason && String(eff.urgency_reason).trim()) ||
      `Nível de risco registrado na coleta estruturada: ${eff.risk_level}.`;
    await deps.insertReportSeverityAuditLog(supabase, {
      urban_report_id: data.id,
      metric: "risk_level",
      previous_value: null,
      new_value: String(eff.risk_level),
      justification,
      source_snippet: snippet || null,
      confidence: isAuto && autoAgain?.confidence != null ? autoAgain.confidence : null,
      metadata: {
        risk_types: eff.risk_types ?? [],
        derived_severity: derivedSeverity,
        category: eff.category,
        auto_inferred: isAuto,
      },
    });
  }

  if (proximityAdjustment) {
    const prevSev = deps.mapUrbanRiskLevelToSeverity((eff.risk_level as string) || null);
    await deps.insertReportSeverityAuditLog(supabase, {
      urban_report_id: data.id,
      metric: "severity_proximity_adjustment",
      previous_value: prevSev,
      new_value: proximityAdjustment.adjustedSeverity,
      justification: `Severidade elevada por proximidade a ${proximityAdjustment.proximityDetails.join(", ")} (até ${deps.proximityRadiusMeters}m).`,
      source_snippet: null,
      metadata: {
        latitude: reportLat,
        longitude: reportLon,
        proximity_details: proximityAdjustment.proximityDetails,
      },
    });
  }

  const successMessage = buildUrbanSuccessMessage(data, eff, acc, deps.urbanRiskCollectionCategories);

  try {
    await deps.detectEmergingCategory(String(eff.description || ""), String(eff.category || ""), supabase);
    console.log("[executeTool] Emerging category detection completed for urban report");
  } catch (detectError) {
    console.error("[executeTool] Emerging category detection failed:", detectError);
  }

  return {
    success: true,
    message: successMessage,
    data: { id: data.id, protocol_code: data.protocol_code, type: "urban" },
  };
}
