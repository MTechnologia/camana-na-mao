import { applySelectedAddressFieldsFromHistory } from "./lib-history-address-and-description.ts";
import {
  applyCollectionProgressMarkers,
  getHistoryMessageText,
} from "./lib-history-utils.ts";

type HistoryMessage = { role: string; content: string | unknown };

const SERVICE_TYPE_LABEL_TO_ID: Record<string, string> = {
  "ubs": "ubs",
  "escolas": "school",
  "ceus": "ceu",
  "hospitais": "hospital",
  "bibliotecas": "library",
  "esportes": "sports_center",
  "centros esportivos": "sports_center",
  "parques": "park",
  "feiras": "street_market",
  "centros comunitários": "community_center",
  "creches": "daycare",
  "mercados": "market",
  "mercados municipais": "city_market",
  "teatro/cinema": "theater",
  "teatros": "theater",
  "museus": "museum",
  "assistência social": "social_assistance",
  "transporte": "transit_station",
  "delegacia/polícia": "police_station",
  "cemitério": "cemetery",
  "acessibilidade": "accessibility",
  "reciclagem/limpeza": "recycling_point",
  "bombeiros": "fire_station",
  "outros": "other",
};

const SERVICE_CHOICE_LABEL_TO_TYPE: Record<string, string> = {
  "ubs": "ubs",
  "escolas": "school",
  "ceus": "ceu",
  "hospitais": "hospital",
  "bibliotecas": "library",
  "centros esportivos": "sports_center",
  "esportes": "sports_center",
  "parques": "park",
  "feiras": "street_market",
  "creches": "daycare",
  "museus": "museum",
  "teatros": "theater",
  "transporte": "transit_station",
  "bombeiros": "fire_station",
};

export function accumulateServiceSearchFieldsFromHistory(
  messages: HistoryMessage[],
  deps: {
    inferServiceTypeFromText: (text: string) => string | null;
  },
): Record<string, unknown> {
  const acc: Record<string, unknown> = {};

  applyCollectionProgressMarkers(messages, acc);

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = getHistoryMessageText(msg).trim();
    const contentLower = content.toLowerCase();

    if (!acc.location_method) {
      if (/usar\s+(minha\s+)?localização|localização\s+gps|gps\s*$/i.test(contentLower) || contentLower.includes("localização gps:")) {
        acc.location_method = "gps";
      } else if (/usar\s+endereço\s+cadastrado|endereço\s+cadastrado\s*$/i.test(contentLower)) {
        acc.location_method = "registered_address";
      } else if (/digitar\s+(cep|endereço)|digitar\s+cep\s+ou\s+endereço/i.test(contentLower)) {
        acc.location_method = "manual";
      }
    }

    const gpsMatch = content.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i)
      || (contentLower.includes("localização gps") || contentLower.includes("localizacao gps")
        ? content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/)
        : null);
    if (gpsMatch && !acc.user_lat) {
      const lat = parseFloat(gpsMatch[1].trim());
      const lon = parseFloat(gpsMatch[2].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        acc.user_lat = lat;
        acc.user_lon = lon;
        if (!acc.location_method) acc.location_method = "gps";
      }
    }

    if (!acc.service_type && /tipo de serviço:\s*(.+)/i.test(content)) {
      const match = content.match(/tipo de serviço:\s*(.+?)(?:\s*\.\s*Especificação|$)/im);
      const raw = match?.[1]?.trim().toLowerCase().replace(/\s+/g, " ");
      if (raw) {
        acc.service_type = SERVICE_TYPE_LABEL_TO_ID[raw] || raw;
      }
    }

    if (!acc.cep) {
      const cepMatch = content.match(/\b(\d{5}-?\d{3})\b/);
      if (cepMatch) {
        acc.cep = cepMatch[1].replace(/-/g, "");
      }
    }
  }

  applySelectedAddressFieldsFromHistory(messages, acc);

  const lastAssistantContent = messages
    .filter((m) => m.role === "assistant")
    .map((m) => getHistoryMessageText(m))
    .pop() || "";
  const lastUserContent = messages
    .filter((m) => m.role === "user")
    .map((m) => getHistoryMessageText(m))
    .pop()?.trim() || "";

  if (
    lastUserContent &&
    (lastAssistantContent.includes("número") || lastAssistantContent.includes("ponto de referência")) &&
    !acc.street_number &&
    !acc.reference_point
  ) {
    const skipPhrases = [
      "pular",
      "não sei",
      "nao sei",
      "continuar",
      "não tenho",
      "nao tenho",
      "opcional",
      "próximo",
      "proximo",
      "sem número",
      "sem numero",
    ];
    if (skipPhrases.some((p) => lastUserContent.toLowerCase().includes(p))) {
      acc.reference_point = "não informado";
    } else {
      const numberMatch = lastUserContent.match(/^(\d+)/);
      if (numberMatch) acc.street_number = numberMatch[1];
      else if (/altura|perto|frente|próximo|proximo/.test(lastUserContent.toLowerCase())) acc.reference_point = lastUserContent;
      else if (lastUserContent.length < 50) acc.street_number = lastUserContent;
    }
  }

  if (!acc.service_type) {
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const inferred = deps.inferServiceTypeFromText(getHistoryMessageText(msg));
      if (inferred) {
        acc.service_type = inferred;
        break;
      }
    }
  }

  const lastAssistant = messages.filter((m) => m.role === "assistant").pop();
  const lastUser = messages.filter((m) => m.role === "user").pop();
  if (lastAssistant && lastUser && getHistoryMessageText(lastAssistant).includes("Qual desses te interessa?")) {
    const assistantText = getHistoryMessageText(lastAssistant);
    const userText = getHistoryMessageText(lastUser).trim();
    let chosenType: string | null = null;
    const digitMatch = userText.match(/^(\d)\s*$/);
    if (digitMatch) {
      const num = parseInt(digitMatch[1], 10);
      const listMatch = assistantText.match(new RegExp(`^${num}\\.\\s*(.+)$`, "m"));
      if (listMatch) {
        const label = listMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
        chosenType = (
          SERVICE_CHOICE_LABEL_TO_TYPE[label]
          || Object.entries(SERVICE_CHOICE_LABEL_TO_TYPE).find(([key]) => label.includes(key))?.[1]
        ) ?? null;
      }
    } else {
      chosenType = deps.inferServiceTypeFromText(userText);
    }
    if (chosenType) {
      acc.service_type = chosenType;
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const content = getHistoryMessageText(messages[i]).trim();
    const contentLower = content.toLowerCase();

    if (!acc.radius_meters) {
      const radiusMatch = content.match(/raio\s*[:\s]*(\d+)\s*(km|m)/i) || contentLower.match(/raio\s*(\d+)\s*(km|m)/);
      if (radiusMatch) {
        const value = parseInt(radiusMatch[1], 10);
        acc.radius_meters = (radiusMatch[2] || "").toLowerCase() === "km" ? value * 1000 : value;
      }
    }

    if (acc.min_rating === undefined || acc.min_rating === null || /avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*todas/i.test(content)) {
      if (/avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*todas/i.test(content)) {
        acc.min_rating = 0;
      } else {
        const ratingMatch = content.match(/avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*(\d+)\s*\+?/i) || content.match(/(\d+)\s*\+?\s*estrelas?/i);
        if (ratingMatch) {
          const stars = parseInt(ratingMatch[2] || ratingMatch[1], 10);
          if (stars >= 2 && stars <= 5) acc.min_rating = stars;
        }
      }
    }

    if (!acc.search_query) {
      const searchMatch = content.match(/busca\s*[:\s]+([^.\n]+)/i) || content.match(/buscar\s+por\s+[^:]+[:\s]+([^.\n]+)/i);
      if (searchMatch?.[1]?.trim()) acc.search_query = searchMatch[1].trim();
    }
  }

  return acc;
}
