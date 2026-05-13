import type { SupabaseClient } from "@supabase/supabase-js";

import { createSseResponse } from "./lib-index-sse.ts";
import type { NextFieldInfo } from "./lib-next-missing-field.ts";
import type { CollectionIntent } from "./lib.ts";

type DeterministicShortcutsArgs = {
  accumulatedFields: Record<string, unknown>;
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  journeySwitched: boolean;
  lastUserMessage: string;
  lastUserMsg: string;
  msgLower: string;
  nextFieldInfo: NextFieldInfo;
  requestStartTime: number;
  supabase: SupabaseClient;
  lib: typeof import("./lib.ts");
};

type DeterministicShortcutsResult = {
  response?: Response;
};

function isUrgentFireLike(msgLower: string, accumulatedDesc: string): boolean {
  return msgLower.includes("incêndio") ||
    msgLower.includes("fogo") ||
    msgLower.includes("queimando") ||
    accumulatedDesc.toLowerCase().includes("incêndio") ||
    accumulatedDesc.toLowerCase().includes("fogo");
}

function isUrgentWiringLike(msgLower: string, accumulatedDesc: string): boolean {
  return msgLower.includes("fios") ||
    msgLower.includes("expostos") ||
    accumulatedDesc.toLowerCase().includes("fios") ||
    accumulatedDesc.toLowerCase().includes("expostos");
}

function isUrgentHighRiskLike(msgLower: string, accumulatedDesc: string): boolean {
  return msgLower.includes("risco") ||
    msgLower.includes("perigo") ||
    msgLower.includes("armado") ||
    msgLower.includes("arma") ||
    accumulatedDesc.toLowerCase().includes("armado") ||
    accumulatedDesc.toLowerCase().includes("arma") ||
    accumulatedDesc.toLowerCase().includes("drogas") ||
    accumulatedDesc.toLowerCase().includes("violência") ||
    accumulatedDesc.toLowerCase().includes("baderna");
}

function pickGreeting(msgLower: string): string {
  if (msgLower.includes("boa noite")) return "Boa noite!";
  if (msgLower.includes("bom dia")) return "Bom dia!";
  if (msgLower.includes("boa tarde")) return "Boa tarde!";
  return "Olá!";
}

function buildGenericDeterministicResponse(args: {
  accumulatedFields: Record<string, unknown>;
  collectionIntent: CollectionIntent | null;
  hasReciprocalGreeting: boolean;
  hasUrgentInDescription: boolean;
  isEmpathyRequest: boolean;
  isGenericReport: boolean;
  isGreeting: boolean;
  isOffTopic: boolean;
  isUrgent: boolean;
  msgLower: string;
  nextFieldInfo: NextFieldInfo;
}): string {
  const {
    accumulatedFields,
    collectionIntent,
    hasReciprocalGreeting,
    hasUrgentInDescription,
    isEmpathyRequest,
    isGenericReport,
    isGreeting,
    isOffTopic,
    isUrgent,
    msgLower,
    nextFieldInfo,
  } = args;

  if (isOffTopic) {
    const greeting = pickGreeting(msgLower);
    const servicesList =
      "• Relato Urbano\n• Transporte\n• Avaliar serviço\n• Serviços próximos\n• Tirar dúvida sobre a Câmara";
    return `${greeting} Desculpe, o intuito deste canal é poder te ajudar com estes serviços:\n\n${servicesList}\n\n[SHOW_SERVICES_CHIPS]`;
  }

  let response = "";
  if (isEmpathyRequest) {
    response = "Claro! Desculpe. Boa tarde! Como posso ajudar?";
  } else if (msgLower.includes("bom dia")) {
    response = hasReciprocalGreeting
      ? "Bom dia! Tudo bem, e você? Como posso ajudar hoje?"
      : "Bom dia! Como posso ajudar hoje?";
  } else if (msgLower.includes("boa tarde")) {
    response = hasReciprocalGreeting ? "Boa tarde! Tudo bem? Como posso ajudar?" : "Boa tarde! Como posso ajudar?";
  } else if (msgLower.includes("boa noite")) {
    response = hasReciprocalGreeting ? "Boa noite! Tudo bem? Como posso ajudar?" : "Boa noite! Como posso ajudar?";
  } else if (msgLower.includes("olá") || msgLower.includes("oi")) {
    response = hasReciprocalGreeting ? "Olá! Tudo bem? Como posso ajudar?" : "Olá! Como posso ajudar?";
  } else if (isGenericReport) {
    response = "Olá! Claro, vou te ajudar. Descreva o problema, por favor.";
  } else {
    response = "Olá! Como posso ajudar?";
  }

  const accumulatedDesc = String(accumulatedFields?.description ?? "");
  if (isUrgent || hasUrgentInDescription) {
    const urbanUrgent = collectionIntent?.type === "urban_report" &&
      nextFieldInfo.field === "location_method";
    const fieldsJson = JSON.stringify(accumulatedFields || {});
    const progressUrban = `[COLLECTION_PROGRESS:urban_report:${fieldsJson}]`;
    const locationBody =
      "Como você quer informar **onde fica** o problema? Toque em **Usar minha localização (GPS)** abaixo, ou escolha **endereço cadastrado** / **digitar CEP ou endereço**.";

    if (urbanUrgent) {
      let intro = "Isso é perigoso! Vamos resolver rápido.\n\n";
      if (isUrgentFireLike(msgLower, accumulatedDesc)) {
        intro = "Isso é muito perigoso! Vamos registrar urgentemente.\n\n";
      } else if (isUrgentWiringLike(msgLower, accumulatedDesc)) {
        intro = "Isso é perigoso! Vamos resolver rápido.\n\n";
      } else if (isUrgentHighRiskLike(msgLower, accumulatedDesc)) {
        intro = "Entendi a gravidade da situação. Isso é muito preocupante! Vamos registrar como alto risco imediato.\n\n";
      }
      response = `${progressUrban}[FIELD_REQUEST:location_method]${intro}${locationBody}\n\n[LOCATION_METHOD_PICKER]`;
    } else {
      response =
        "Isso é urgente. Para registrar com segurança, escolha **Relato Urbano** nos serviços abaixo; em seguida você poderá informar o local por **GPS**, **endereço cadastrado** ou **CEP**.\n\n[SHOW_SERVICES_CHIPS]";
      if (isUrgentFireLike(msgLower, accumulatedDesc)) {
        response =
          "Isso é muito perigoso! Vamos registrar urgentemente. Escolha **Relato Urbano** abaixo e, na próxima etapa, indique o local por **GPS**, **endereço cadastrado** ou **CEP**.\n\n[SHOW_SERVICES_CHIPS]";
      }
    }
  } else if (msgLower.includes("problema") || msgLower.includes("relatar")) {
    if (response.includes("Como posso ajudar")) {
      response = response.replace("Como posso ajudar?", "Claro, vou te ajudar. Descreva o problema, por favor.");
    }
  }

  if (
    isGreeting &&
    !isOffTopic &&
    !isGenericReport &&
    !isEmpathyRequest &&
    !response.includes("[LOCATION_METHOD_PICKER]") &&
    !response.includes("[SHOW_SERVICES_CHIPS]")
  ) {
    response = `${response}\n\n[SHOW_SERVICES_CHIPS]`;
  }

  return response;
}

export async function handleDeterministicShortcuts(
  args: DeterministicShortcutsArgs,
): Promise<DeterministicShortcutsResult> {
  const {
    accumulatedFields,
    chatMessages,
    collectionIntent,
    journeySwitched,
    lastUserMessage,
    lastUserMsg,
    msgLower,
    nextFieldInfo,
    requestStartTime,
    supabase,
    lib,
  } = args;

  const addressLookupMatch = msgLower.match(
    /(?:qual\s+(?:é\s+)?o\s+)?(?:endere[cç]o\s+(?:do\s+|de\s+)?|onde\s+fica\s+)(.+?)(?:\?|\.|$)/i,
  );
  const serviceNameForAddress = addressLookupMatch?.[1]?.trim();
  if (serviceNameForAddress && serviceNameForAddress.length >= 3) {
    const addressFromDb = await lib.getServiceAddressByName(supabase, serviceNameForAddress);
    if (addressFromDb) {
      console.log("[ai-orchestrator] Service address from DB for:", serviceNameForAddress);
      return { response: createSseResponse(addressFromDb, lib.corsHeaders) };
    }
  }

  const cepOnlyMatch = lastUserMessage.trim().match(/^(\d{5}-?\d{3})$/);
  if (cepOnlyMatch) {
    const cepRaw = cepOnlyMatch[1].replace(/\D/g, "");
    if (cepRaw.length === 8) {
      const previousUserMessages = chatMessages
        .filter((m: Record<string, unknown>) => m.role === "user")
        .map((m: Record<string, unknown>) => (typeof m.content === "string" ? m.content : "").toLowerCase());
      let serviceType: string | null = null;
      for (let i = previousUserMessages.length - 1; i >= 0 && !serviceType; i--) {
        if (previousUserMessages[i] === lastUserMessage.toLowerCase()) continue;
        serviceType = lib.inferServiceTypeFromText(previousUserMessages[i]);
      }
      if (serviceType) {
        const cepLookup = await lib.lookupCEP(cepRaw);
        const district = cepLookup.valid ? cepLookup.neighborhood : undefined;
        const listFromDb = await lib.findNearbyServices(supabase, serviceType, district, 5);
        const intro = cepLookup.valid && district
          ? `Com o CEP ${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}, aqui estão opções de ${lib.getServiceTypeName(serviceType)} próximas a você:\n\n${listFromDb}`
          : `Aqui estão opções de ${lib.getServiceTypeName(serviceType)}:\n\n${listFromDb}`;
        console.log("[ai-orchestrator] Find nearby services from DB:", serviceType, district || "city-wide");
        return { response: createSseResponse(intro, lib.corsHeaders) };
      }
    }
  }

  const greetingPatterns = [
    /^(olá|oi|bom dia|boa tarde|boa noite)/i,
    /(olá|oi|bom dia|boa tarde|boa noite).*problema/i,
    /(você poderia ser mais empática|seja mais simpático|me diga boa tarde|me diga bom dia)/i,
  ];
  const isGreeting = greetingPatterns.some((pattern) => pattern.test(msgLower));
  const isEmpathyRequest = /(empática|simpático|simpática|empático)/i.test(msgLower);

  if (lib.isGeneralKnowledgeOutOfScope(lastUserMsg)) {
    const outOfScopeMessage =
      "Essa pergunta não está relacionada aos serviços da Câmara Municipal de São Paulo. Posso ajudar com informações sobre vereadores, projetos de lei, audiências públicas ou outros serviços da Câmara.\n\n[SHOW_SERVICES_CHIPS]";
    console.log("[ai-orchestrator] Resposta fora do escopo (conhecimento geral):", lastUserMsg.slice(0, 60));
    return { response: createSseResponse(outOfScopeMessage, lib.corsHeaders) };
  }

  if (lib.isPoliticianPerformanceEvaluationQuestion(lastUserMsg)) {
    console.log("[ai-orchestrator] Bloqueio: avaliação/desempenho de políticos:", lastUserMsg.slice(0, 80));
    return { response: createSseResponse(lib.POLITICIAN_EVALUATION_BLOCKED_MESSAGE, lib.corsHeaders) };
  }

  const reciprocalGreetingPatterns = [
    /tudo bem\??/i,
    /tudo bom\??/i,
    /como vai\??/i,
    /como (está|esta) (você|vc|voce)\??/i,
    /(que )?tal\??/i,
    /e (aí|ai)\??/i,
  ];
  const realOffTopicPatterns = [
    /céu (está|esta) azul/i,
    /(o )?que acha\??/i,
    /(o )?tempo (está|esta|hoje)/i,
    /(está|esta) (frio|calor|bonito)/i,
    /(bom|ótimo) dia (pra|para) (todos|você)/i,
  ];
  const hasReciprocalGreeting = reciprocalGreetingPatterns.some((p) => p.test(msgLower));
  const hasRealOffTopic = realOffTopicPatterns.some((p) => p.test(msgLower));
  const serviceKeywords =
    /relatar|problema|transporte|avaliar|serviço|servicos|dúvida|duvida|câmara|camara|audiência|audiencia|vereador|histórico|historico|denúncia|denuncia|reclamar|reportar|inscrever/i;
  const hasServiceIntent = serviceKeywords.test(msgLower);
  const isOffTopic = isGreeting && hasRealOffTopic && !hasServiceIntent;

  const genericReportPatterns = [
    /^quero relatar (um )?problema/i,
    /^tenho (um )?problema/i,
    /^preciso relatar/i,
    /^problema na (cidade|rua|bairro)/i,
    /^relatar (um )?problema/i,
    /quero relatar um problema na cidade/i,
    /relatar problema/i,
  ];
  const isGenericReport = genericReportPatterns.some((pattern) => pattern.test(msgLower));

  const urgentPatterns = [
    /(incêndio|fogo|queimando|chamas)/i,
    /(fios expostos|cabos soltos|eletricidade)/i,
    /(explosão|transformador)/i,
    /(alagamento|enchente|água subindo)/i,
    /(acidente|atropelamento)/i,
    /(risco iminente|perigo|armado|arma|armas)/i,
    /(drogas?|tráfico|trafico|drogados?|usuários? de droga)/i,
    /(violência|violencia|agressão|agressao|briga|confronto)/i,
    /(baderna|vandalismo|destruição|destruicao)/i,
    /(funkeiros?|grupo.*armado|pessoas.*armadas?)/i,
  ];
  const isUrgent = urgentPatterns.some((pattern) => pattern.test(msgLower));
  const accumulatedDesc = String(accumulatedFields?.description ?? "");
  const hasUrgentInDescription = accumulatedDesc.length > 0 &&
    urgentPatterns.some((pattern) => pattern.test(accumulatedDesc.toLowerCase()));

  const skipDeterministicForUrbanNature = collectionIntent?.type === "urban_report" &&
    nextFieldInfo.field === "report_nature";

  if (!skipDeterministicForUrbanNature && (isGreeting || isEmpathyRequest || isGenericReport || isOffTopic)) {
    console.log("[ai-orchestrator] Deterministic response detected:", {
      isGreeting,
      isEmpathyRequest,
      isGenericReport,
      isOffTopic,
      isUrgent,
      msgLower,
    });
    const response = buildGenericDeterministicResponse({
      accumulatedFields,
      collectionIntent,
      hasReciprocalGreeting,
      hasUrgentInDescription,
      isEmpathyRequest,
      isGenericReport,
      isGreeting,
      isOffTopic,
      isUrgent,
      msgLower,
      nextFieldInfo,
    });
    console.log("[ai-orchestrator] Deterministic response:", response);
    return { response: createSseResponse(response, lib.corsHeaders) };
  }

  const shouldShortCircuit = collectionIntent &&
    nextFieldInfo.field &&
    ["urban_report", "transport_report", "service_rating"].includes(collectionIntent.type);

  if (shouldShortCircuit && nextFieldInfo.prompt) {
    const prefix = journeySwitched ? "Ok! " : "";
    console.log(
      "[ai-orchestrator] SHORT-CIRCUIT: Responding deterministically for field:",
      nextFieldInfo.field,
      journeySwitched ? "(journey switch)" : "",
    );

    const fieldsJson = JSON.stringify(accumulatedFields);
    const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent!.type}:${fieldsJson}]`;
    const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
    const pickerMarker = nextFieldInfo.picker || "";

    let serviceRatingDimensionHints = "";
    if (
      collectionIntent!.type === "service_rating" &&
      nextFieldInfo.field === "rating_dimensions" &&
      accumulatedFields?.service_type
    ) {
      try {
        serviceRatingDimensionHints = await lib.fetchServiceTypeRatingQuestionHints(
          supabase,
          String(accumulatedFields.service_type),
        );
      } catch (e) {
        console.warn("[ai-orchestrator] service_type_rating_questions:", (e as Error).message);
      }
    }

    const deterministicResponse =
      `${progressMarker}${fieldMarker}${prefix}${nextFieldInfo.prompt}${serviceRatingDimensionHints}${
        pickerMarker ? "\n\n" + pickerMarker : ""
      }`;
    console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (deterministic)");
    return { response: createSseResponse(deterministicResponse, lib.corsHeaders) };
  }

  return {};
}
