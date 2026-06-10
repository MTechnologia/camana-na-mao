import type { SupabaseClient } from "@supabase/supabase-js";

import type { CollectionIntent } from "./lib.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import { detectNamedServiceLocationQuery, prettyServiceName } from "./lib-service-location-query.ts";
import {
  detectVereadorContactQuery,
  formatVereadorContactReply,
  matchVereador,
  vereadorContactNoNameReply,
  vereadorNotFoundReply,
} from "./lib-vereador-contact-query.ts";

type PreAiShortcutsArgs = {
  accumulatedFields: Record<string, unknown>;
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  lastAssistantMessage: string;
  lastUserMessage: string;
  lightJourneyMarker: string;
  msgLower: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
  envGet?: (key: string) => string | undefined;
};

type PreAiShortcutsResult = {
  response?: Response;
};

type TransitDirections = {
  distanceText?: string;
  durationText?: string;
  ok?: boolean;
  steps: string[];
};

export function getMessageText(message: Record<string, unknown>): string {
  const raw = message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const part = raw.find((item: Record<string, unknown>) => item?.type === "text" && item?.text);
    return part ? String(part.text) : "";
  }
  return "";
}

function buildTransitRouteMessage(routeUrl: string, originLabel: string, destination: string): string {
  return `Trajeto de **${originLabel}** até **${destination}** (transporte público):\n\nNo link abaixo o Google Maps mostra o **passo a passo**: quais ônibus ou metrô pegar, onde embarcar e onde descer. Abra o link para ver as conduções detalhadas.\n\n[Abrir rota no Google Maps](${routeUrl})\n\nPosso ajudar em mais alguma coisa?`;
}

function prependTransitDirections(message: string, directions: TransitDirections): string {
  if (!directions.ok || (!directions.steps.length && !directions.durationText && !directions.distanceText)) {
    return message;
  }
  const forecast: string[] = [];
  if (directions.durationText) forecast.push(`**Tempo estimado:** cerca de ${directions.durationText}`);
  if (directions.distanceText) forecast.push(`**Distância:** ${directions.distanceText}`);
  const forecastLine = forecast.length ? `${forecast.join(" · ")}\n\n` : "";
  const stepsBlock = directions.steps.length ? `${directions.steps.join("\n")}\n\n` : "";
  return `**Passo a passo:**\n\n${forecastLine}${stepsBlock}---\n\n${message}`;
}

async function maybeAddTransitDirections(
  origin: string,
  destination: string,
  message: string,
  lib: typeof import("./lib.ts"),
  envGet: (key: string) => string | undefined,
): Promise<string> {
  const googleMapsKey = envGet("GOOGLE_MAPS_API_KEY");
  if (!googleMapsKey) return message;
  const directions = await lib.fetchGoogleDirectionsTransit(origin, destination, googleMapsKey);
  return prependTransitDirections(message, directions as TransitDirections);
}

export async function handlePreAiShortcuts(
  args: PreAiShortcutsArgs,
): Promise<PreAiShortcutsResult> {
  const {
    accumulatedFields,
    chatMessages,
    collectionIntent,
    lastAssistantMessage,
    lastUserMessage,
    lightJourneyMarker,
    msgLower,
    supabase,
    userId,
    lib,
    envGet = (key: string) => Deno.env.get(key),
  } = args;

  const lastAssistantLower = lastAssistantMessage.toLowerCase();
  const userMessagesOrdered = chatMessages.filter((message: Record<string, unknown>) => message.role === "user");

  const occupancyServiceIdMatch = lastUserMessage.match(/\[SERVICE_ID:([a-f0-9-]{36})\]/i);
  const lastAssistantHadOccupancyPicker = /\[OCCUPANCY_SERVICE_PICK\]/i.test(lastAssistantMessage) ||
    (/consultar a ocupação correta/i.test(lastAssistantMessage) && /\[SERVICE_PICKER/i.test(lastAssistantMessage)) ||
    (/Selecione na lista abaixo \(ou refine por nome\/bairro\)/i.test(lastAssistantMessage) &&
      /\[SERVICE_PICKER/i.test(lastAssistantMessage));
  if (occupancyServiceIdMatch && lastAssistantHadOccupancyPicker) {
    try {
      const toolResult = await lib.executeTool(
        "get_service_occupancy_status",
        { service_id: occupancyServiceIdMatch[1] },
        userId,
        supabase,
        accumulatedFields,
      );
      const replyBody = toolResult.message || "Não consegui consultar a ocupação agora.";
      return { response: createSseResponse(`[LIGHT_JOURNEY:occupancy]${replyBody}`, lib.corsHeaders) };
    } catch (error) {
      console.error("[ai-orchestrator] Occupancy short-circuit failed:", error);
    }
  }

  const lastBotWasRatingSuccess = /\[RATING_CREATED:/i.test(lastAssistantMessage);
  const userWantsForwardRatingToCouncil =
    /encaminhar\s+minha\s+avalia[cç][aã]o|avalia[cç][aã]o\s+.*vereador|encaminhar.*avalia[cç][aã]o.*vereador/i.test(
      lastUserMessage.trim(),
    );
  if (lastBotWasRatingSuccess && userWantsForwardRatingToCouncil) {
    const serviceMatch = lastAssistantMessage.match(/\*\*Servi[cç]o:\*\*\s*([^\n]+)/i);
    const commentMatch = lastAssistantMessage.match(/📝\s*\*\*Coment[aá]rio:\*\*\s*([^\n]+)/i) ||
      lastAssistantMessage.match(/\*\*Coment[aá]rio:\*\*\s*([^\n]+)/i);
    const description = [
      "Manifestação do cidadão sobre avaliação de serviço público.",
      serviceMatch ? `Equipamento: ${serviceMatch[1].trim()}` : "",
      commentMatch ? `Trecho do comentário: ${commentMatch[1].trim().slice(0, 240)}` : "",
    ].filter(Boolean).join("\n");
    const councilResult = await lib.suggestCouncilMember(
      "urbanismo",
      description || "Avaliação de serviço público",
      undefined,
    );
    const reply =
      `Certo. Para encaminhar sua **avaliação** a um vereador, seguem sugestões de parlamentares:\n\n${councilResult}\n\nPosso ajudar com mais alguma coisa?`;
    console.log("[ai-orchestrator] Encaminhar avaliação para vereador: short-circuit suggest_council_member");
    return { response: createSseResponse(reply, lib.corsHeaders) };
  }

  const isFirstMessageComoChegar = userMessagesOrdered.length === 1 &&
    (/como\s+chegar\s+(?:em|na|no|ao|à|a)\s+/i.test(lastUserMessage) || /como\s+chegar\s+ao?\s+/i.test(lastUserMessage));
  if (isFirstMessageComoChegar) {
    const routeAskOrigin =
      "[FIELD_REQUEST:location_method]Para te ajudar com a rota, preciso saber de onde você está saindo. Como você quer informar sua localização?\n\n[LOCATION_METHOD_PICKER]";
    console.log("[ai-orchestrator] Como chegar (first turn): returning location method picker");
    return { response: createSseResponse(routeAskOrigin, lib.corsHeaders) };
  }

  if (userMessagesOrdered.length >= 2) {
    const originCandidate = getMessageText(userMessagesOrdered[userMessagesOrdered.length - 1]).trim();
    let destinationFromHistory = "";
    for (const userMessage of userMessagesOrdered) {
      const content = getMessageText(userMessage).trim();
      const matchDest = content.match(/como\s+chegar\s+(?:em|na|no|ao|à|a)\s+(.+)/i) ||
        content.match(/como\s+chegar\s+ao?\s+(.+)/i);
      if (matchDest) {
        destinationFromHistory = matchDest[1].trim();
        break;
      }
    }

    const assistantAskedOrigin =
      /(de\s+onde|ponto\s+de\s+partida|onde\s+(você|voce)\s+(está|esta)\s+saindo|qual\s+(é|e)\s+(o\s+)?seu\s+ponto|saindo\s+de\s+qual|gostaria\s+de\s+sair|como\s+você\s+quer\s+informar|informar\s+sua\s+localiza[cç][aã]o|LOCATION_METHOD_PICKER|qual\s+seu\s+cep)/i
        .test(lastAssistantMessage);
    const assistantAskedCepOrAddress = /(qual\s+seu\s+cep|qual\s+o\s+endere[cç]o|digite\s+o\s+cep)/i.test(
      lastAssistantMessage,
    );
    const assistantAskedStreetNumber = /(qual\s+o\s+n[uú]mero|n[uú]mero\s+do\s+endere[cç]o|n[uú]mero\s+de\s+partida)/i
      .test(lastAssistantMessage);
    const isInComoChegarFlow = assistantAskedOrigin || assistantAskedCepOrAddress || assistantAskedStreetNumber;

    if (isInComoChegarFlow && destinationFromHistory) {
      const isChoiceDigitarCep = /^digitar\s+cep\s+ou\s+endere[cç]o$/i.test(originCandidate);
      if (isChoiceDigitarCep) {
        const askCepForRoute =
          "[FIELD_REQUEST:cep]Qual seu CEP ou endereço de partida? (Digite o CEP ou a rua e o bairro.)\n\n[ADDRESS_PICKER]";
        console.log("[ai-orchestrator] Como chegar: user chose digitar CEP, asking for address");
        return { response: createSseResponse(askCepForRoute, lib.corsHeaders) };
      }

      let originForUrl = "";
      if (assistantAskedStreetNumber && userMessagesOrdered.length >= 2) {
        const streetNumberCandidate = originCandidate.trim();
        const looksLikeNumber = /^[\d\s-]+$/.test(streetNumberCandidate) ||
          /^(casa|n[°º]?|n[uú]mero)\s*[\d-]+$/i.test(streetNumberCandidate);
        if (looksLikeNumber) {
          const prevAddress = getMessageText(userMessagesOrdered[userMessagesOrdered.length - 2]).trim();
          const prevAddressRaw = prevAddress.replace(/^Endere[cç]o\s+selecionado\s*:\s*/i, "").trim();
          const num = streetNumberCandidate.replace(/^(casa|n[°º]?|n[uú]mero)\s*/i, "").trim();
          if (prevAddressRaw.length >= 5 && num.length > 0) {
            originForUrl = prevAddressRaw.includes(" - ")
              ? prevAddressRaw.replace(/\s+-\s+/, `, ${num} - `)
              : `${prevAddressRaw}, ${num}`;
          }
        }
      }

      const originAddressRaw = originCandidate.replace(/^Endere[cç]o\s+selecionado\s*:\s*/i, "").trim();
      const looksLikeAddress = (originAddressRaw.length >= 5 &&
          (/\d/.test(originAddressRaw) ||
            /(rua|av\.|avenida|r\.|alameda|praça|travessa|jd\.|jardim|endereço|cep)/i.test(originAddressRaw))) ||
        /Endere[cç]o\s+selecionado\s*:/i.test(originCandidate);
      const hasStreetNumber = /,\s*\d{1,5}(\s+[A-Za-z])?\s*-\s+/.test(originAddressRaw);

      if (looksLikeAddress && !hasStreetNumber && !originForUrl) {
        console.log("[ai-orchestrator] Como chegar: address without number, asking for number");
        return {
          response: createSseResponse(
            "Qual o número do endereço de partida? (Ex.: 100, 456 A, sobrado)",
            lib.corsHeaders,
          ),
        };
      }

      const originFinal = originForUrl || (looksLikeAddress ? originAddressRaw : originCandidate);
      const hasGps = /Localiza[cç][aã]o\s*GPS/i.test(originCandidate);
      const coordMatch = originCandidate.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
        (hasGps ? originCandidate.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/) : null);
      const isRegisteredAddress = /usar\s+endere[cç]o\s+cadastrado/i.test(originCandidate);

      if ((looksLikeAddress || originForUrl) && originFinal.length >= 5) {
        const routeUrl = lib.buildGoogleMapsDirectionsUrlFromAddresses(originFinal, destinationFromHistory);
        let routeMessage = buildTransitRouteMessage(routeUrl, originFinal, destinationFromHistory);
        routeMessage = await maybeAddTransitDirections(originFinal, destinationFromHistory, routeMessage, lib, envGet);
        console.log("[ai-orchestrator] Route link generated (two addresses):", originFinal, "->", destinationFromHistory);
        return { response: createSseResponse(routeMessage, lib.corsHeaders) };
      }

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1].trim());
        const lon = parseFloat(coordMatch[2].trim());
        if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const routeUrl = lib.buildGoogleMapsDirectionsUrl(lat, lon, destinationFromHistory);
          let routeMessage = `Trajeto da sua localização atual até **${destinationFromHistory}** (transporte público):\n\nNo link abaixo o Google Maps mostra o **passo a passo**: quais ônibus ou metrô pegar, onde embarcar e onde descer. Abra o link para ver as conduções detalhadas.\n\n[Abrir rota no Google Maps](${routeUrl})\n\nPosso ajudar em mais alguma coisa?`;
          routeMessage = await maybeAddTransitDirections(`${lat},${lon}`, destinationFromHistory, routeMessage, lib, envGet);
          console.log("[ai-orchestrator] Route link generated (GPS -> destination):", lat, lon, "->", destinationFromHistory);
          return { response: createSseResponse(routeMessage, lib.corsHeaders) };
        }
      }

      if (isRegisteredAddress) {
        const { data: addr } = await supabase.from("user_addresses")
          .select("latitude, longitude, street, street_number, neighborhood")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle();
        if (addr?.latitude != null && addr?.longitude != null) {
          const routeUrl = lib.buildGoogleMapsDirectionsUrl(Number(addr.latitude), Number(addr.longitude), destinationFromHistory);
          const originLabel = [addr.street, addr.street_number, addr.neighborhood].filter(Boolean).join(", ") ||
            "seu endereço cadastrado";
          let routeMessage = buildTransitRouteMessage(routeUrl, originLabel, destinationFromHistory);
          routeMessage = await maybeAddTransitDirections(
            `${addr.latitude},${addr.longitude}`,
            destinationFromHistory,
            routeMessage,
            lib,
            envGet,
          );
          console.log("[ai-orchestrator] Route link generated (registered address -> destination)");
          return { response: createSseResponse(routeMessage, lib.corsHeaders) };
        }
      }
    }
  }

  const justShowedServicesList = lastAssistantLower.includes("quer que eu calcule a rota") ||
    lastAssistantLower.includes("opções mais próximas") ||
    lastAssistantLower.includes("opções mais próximas de");
  const wantsRoute = /(calcule?\s+a\s+rota|calcular\s+rota|rota\s+para|quero\s+a\s+rota)/i.test(lastUserMessage) ||
    lastUserMessage.includes(" | ");
  let destinationAddress = "";
  if (lastUserMessage.includes(" | ")) {
    destinationAddress = lastUserMessage.split(" | ").pop()?.trim() || lastUserMessage.trim();
  } else if (/rota\s+para\s+(.+)/i.test(lastUserMessage)) {
    destinationAddress = lastUserMessage.replace(/rota\s+para\s+/i, "").trim();
  } else if (wantsRoute && lastUserMessage.trim().length > 5) {
    destinationAddress = lastUserMessage.replace(/^(calcule?\s+a\s+rota\s+para?\s*|calcular\s+rota\s+para?\s*)/i, "").trim();
  }

  if (justShowedServicesList && wantsRoute && destinationAddress) {
    let originLat: number | null = null;
    let originLon: number | null = null;
    const allMessages = [...chatMessages].reverse();
    for (const message of allMessages) {
      const content = getMessageText(message).trim();
      if (!content) continue;
      const hasGpsHint = /Localiza[cç][aã]o\s*GPS/i.test(content) || /localiza[cç][aã]o\s*gps/i.test(content);
      const coordMatch = content.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
        (hasGpsHint ? content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/) : null) ||
        content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1].trim());
        const lon = parseFloat(coordMatch[2].trim());
        if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          originLat = lat;
          originLon = lon;
          console.log("[ai-orchestrator] Route origin from conversation GPS:", originLat, originLon);
          break;
        }
      }
    }
    if ((originLat == null || originLon == null) && accumulatedFields.user_lat != null && accumulatedFields.user_lon != null) {
      originLat = Number(accumulatedFields.user_lat);
      originLon = Number(accumulatedFields.user_lon);
      console.log("[ai-orchestrator] Route origin from accumulatedFields (user_lat/user_lon):", originLat, originLon);
    }
    if (originLat == null || originLon == null) {
      const { data: addr } = await supabase.from("user_addresses")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();
      if (addr?.latitude != null && addr?.longitude != null) {
        originLat = Number(addr.latitude);
        originLon = Number(addr.longitude);
        console.log("[ai-orchestrator] Route origin from user_addresses (fallback)");
      }
    }
    if (originLat != null && originLon != null) {
      const routeUrl = lib.buildGoogleMapsDirectionsUrl(originLat, originLon, destinationAddress);
      const routeMessage =
        `Aqui está a rota até **${destinationAddress}**:\n\n🗺️ [Abrir no Google Maps](${routeUrl})\n\nO link abre o trajeto da sua localização até o endereço. Posso ajudar em mais alguma coisa?`;
      console.log("[ai-orchestrator] Route link generated, origin:", originLat, originLon);
      return { response: createSseResponse(routeMessage, lib.corsHeaders) };
    }
  }

  if (collectionIntent?.type === "general") {
    const isBusQuery = lib.isBusInformationalQuery(lastUserMessage);
    const isDuvidaOpener = /d[uú]vida|pergunta|como funciona|quero saber|informa[cç][aã]o/i.test(lastUserMessage);
    if (!isBusQuery && isDuvidaOpener && userMessagesOrdered.length <= 1) {
      const greeting =
        "[LIGHT_JOURNEY:general]Claro! Pode perguntar sobre a Câmara Municipal: funcionamento, audiências, vereadores, processos ou qualquer outra dúvida. Qual sua pergunta?";
      return { response: createSseResponse(greeting, lib.corsHeaders) };
    }
  }

  const isOnlyCepEarly = /^\d{5}-?\d{3}$/.test(lastUserMessage.trim());
  const proximityPhrases = [
    /mais\s+perto\s+de\s+mim/i,
    /mais\s+pr[oó]ximo[s]?\s+(?:de\s+)?mim/i,
    /perto\s+de\s+mim/i,
    /pr[oó]ximo[s]?\s+a\s+mim/i,
    /perto\s+aqui/i,
    /na\s+minha\s+regi[aã]o/i,
    /(?:mais\s+)?pr[oó]ximo[s]?\b/i,
    /procurando|buscar|encontrar/i,
  ];
  const serviceSearchMatchEarly = !isOnlyCepEarly && proximityPhrases.some((pattern) => pattern.test(msgLower));
  const inferredServiceTypeEarly = lib.inferServiceTypeFromText(lastUserMessage);
  if (
    inferredServiceTypeEarly &&
    serviceSearchMatchEarly &&
    lastUserMessage.length < 120 &&
    (!collectionIntent || collectionIntent.type === "general")
  ) {
    const askCepMsg =
      `Vou te ajudar a encontrar ${lib.getServiceTypeName(inferredServiceTypeEarly)} próximas a você. Qual é o CEP da sua região? (Se não souber, pode informar o bairro.)`;
    const progressPayload = { service_type: inferredServiceTypeEarly };
    const withMarker = `${lightJourneyMarker || ""}[COLLECTION_PROGRESS:services:${JSON.stringify(progressPayload)}]${askCepMsg}`;
    console.log("[ai-orchestrator] Services: ask CEP first (tipo já na pergunta):", inferredServiceTypeEarly);
    return { response: createSseResponse(withMarker, lib.corsHeaders) };
  }

  // GUARDA ANTI-ALUCINAÇÃO (qualquer intent/turno, inclusive follow-ups "E a UBS X?"):
  // localização de serviço público NOMEADO é respondida de forma DETERMINÍSTICA a
  // partir do public_services — ou com um "não encontrei" honesto (ex.: serviço de
  // outro município, como uma UBS de Guarulhos). A LLM nunca responde isto, pois
  // estava inventando nome, endereço e telefone.
  //
  // EXCEÇÃO: dentro do fluxo de Avaliação de Serviço (service_rating) a UBS já foi
  // escolhida numa lista e a bolha de seleção carrega [SERVICE_ID:<uuid>]. Esse caso
  // deve ser resolvido pelo service_id pelo fluxo de coleta — NÃO por busca textual de
  // nome. Sem essa exceção, a guarda concatena nome+bairro+endereço+marcador num termo
  // que não casa no full-text e responde "não encontrei" para um serviço que existe.
  // (Mesmo princípio do picker de ocupação acima, que resolve por service_id.)
  // Ver bug-2026-06-08-avaliacao-de-servico-ubs-selecionada-na-lista-retorna-nao-encontrei.
  const isExplicitServicePick = /\[SERVICE_ID:[a-f0-9-]{36}\]/i.test(lastUserMessage);
  const inServiceRatingFlow = collectionIntent?.type === "service_rating";
  const namedServiceQuery = (isExplicitServicePick || inServiceRatingFlow)
    ? null
    : detectNamedServiceLocationQuery(lastUserMessage);
  if (namedServiceQuery) {
    try {
      const grounded = await lib.getServiceAddressByName(supabase, namedServiceQuery.term);
      if (grounded) {
        if (namedServiceQuery.wantsHours) {
          // Endereço/telefone vêm da base; horário NÃO existe no public_services →
          // honesto, sem inventar.
          console.log("[ai-orchestrator] Service hours (determinístico): sem horário na base de", namedServiceQuery.term);
          return {
            response: createSseResponse(
              `${grounded}\n\nℹ️ Não tenho o **horário de funcionamento** dessa unidade por aqui. Posso ajudar em mais alguma coisa?`,
              lib.corsHeaders,
            ),
          };
        }
        console.log("[ai-orchestrator] Service location (determinístico): endereço real de", namedServiceQuery.term);
        return {
          response: createSseResponse(
            `Encontrei na base de serviços públicos de São Paulo:\n\n${grounded}\n\nPosso ajudar em mais alguma coisa?`,
            lib.corsHeaders,
          ),
        };
      }
      const pretty = prettyServiceName(namedServiceQuery.term);
      console.log("[ai-orchestrator] Service location (determinístico): não encontrado em SP →", namedServiceQuery.term);
      return {
        response: createSseResponse(
          `Não encontrei **${pretty}** na base de serviços públicos da cidade de São Paulo. ` +
            `Ela pode pertencer a outro município (eu só tenho dados de São Paulo) ou ainda não estar cadastrada. ` +
            `Posso ajudar em mais alguma coisa?`,
          lib.corsHeaders,
        ),
      };
    } catch (error) {
      console.error("[ai-orchestrator] Service location shortcut failed:", error);
      // Em erro NÃO caímos na LLM para localização (evita alucinação): resposta honesta.
      return {
        response: createSseResponse(
          "Não consegui consultar a base de serviços agora. Tente novamente em instantes. " +
            "Posso ajudar em mais alguma coisa?",
          lib.corsHeaders,
        ),
      };
    }
  }

  // GUARDA ANTI-ALUCINAÇÃO: contato de vereador (telefone/e-mail/gabinete/sala) é
  // respondido de forma DETERMINÍSTICA a partir da lista oficial (fetch-vereadores /
  // CMSP); campo ausente → canal oficial; vereador inexistente/erro → resposta
  // honesta. A LLM nunca responde contato de vereador (inventava nome/tel/e-mail).
  const vereadorContactQuery = detectVereadorContactQuery(lastUserMessage);
  if (vereadorContactQuery) {
    if (!vereadorContactQuery.name) {
      console.log("[ai-orchestrator] Vereador contato (determinístico): sem nome específico → canal oficial");
      return { response: createSseResponse(vereadorContactNoNameReply(), lib.corsHeaders) };
    }
    try {
      const vereadores = await lib.fetchVereadorRecords();
      if (vereadores.length === 0) {
        return {
          response: createSseResponse(
            "Não consegui carregar a lista de vereadores agora. Você pode consultar os contatos em " +
              "[/institucional/vereadores](/institucional/vereadores). Posso ajudar em mais alguma coisa?",
            lib.corsHeaders,
          ),
        };
      }
      const match = matchVereador(vereadorContactQuery.name, vereadores);
      if (match) {
        console.log("[ai-orchestrator] Vereador contato (determinístico): dado real de", match.name);
        return { response: createSseResponse(formatVereadorContactReply(match), lib.corsHeaders) };
      }
      console.log("[ai-orchestrator] Vereador contato (determinístico): não encontrado →", vereadorContactQuery.name);
      return {
        response: createSseResponse(vereadorNotFoundReply(vereadorContactQuery.name), lib.corsHeaders),
      };
    } catch (error) {
      console.error("[ai-orchestrator] Vereador contact shortcut failed:", error);
      return {
        response: createSseResponse(
          "Não consegui consultar a lista de vereadores agora. Veja os contatos em " +
            "[/institucional/vereadores](/institucional/vereadores). Posso ajudar em mais alguma coisa?",
          lib.corsHeaders,
        ),
      };
    }
  }

  return {};
}
