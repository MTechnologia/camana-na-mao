type HistoryMessage = { role: string; content: string };

type ServiceRatingDeps = {
  getMsgText: (msg: { role: string; content: string | unknown }) => string;
  getLastFieldRequestType: (text: string) => string | null;
  parseRatingDimensionsMarker: (response: string) => Record<string, number> | null;
  applyCompleteRatingDimensionsToAccumulated: (
    target: Record<string, unknown>,
    dims: Record<string, number>,
  ) => void;
};

function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function extractServiceFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (context.includes("ubs") || context.includes("posto de saúde") || context.includes("posto de saude")) {
    fields.service_type = "ubs";
  } else if (context.includes("hospital")) {
    fields.service_type = "hospital";
  } else if (context.includes("escola")) {
    fields.service_type = "school";
  } else if (context.includes("ceu")) {
    fields.service_type = "ceu";
  } else if (context.includes("biblioteca")) {
    fields.service_type = "library";
  } else if (context.includes("centro esportivo") || context.includes("esporte")) {
    fields.service_type = "sports_center";
  }

  const typeNameMatch = context.match(/\b(ubs|hospital|escola|ceu|biblioteca|centro\s+esportivo)\s+([a-záàâãéèêíìóòôõúùç]+(?:\s+[a-záàâãéèêíìóòôõúùç]+)*?)(?=\s+que|\s*[.,!?]|$)/i);
  if (typeNameMatch) {
    const namePart = typeNameMatch[2].trim();
    if (namePart.length >= 2 && namePart.length <= 50) {
      fields.service_neighborhood = capitalizeWords(namePart);
    }
  }

  const starsMatch = context.match(/(\d)\s*(?:estrela|nota)/);
  if (starsMatch) {
    fields.rating_stars = parseInt(starsMatch[1], 10);
  }

  const shortCommentMatch = context.match(/^(excelente|ótimo|ótima|otimo|otima|bom|boa|ruim|regular|péssimo|maravilhoso|ótimo atendimento|atendimento excelente|muito bom|muito boa)$/i);
  if (shortCommentMatch && !fields.rating_text) {
    fields.rating_text = shortCommentMatch[1];
  }

  if (context.includes("péssim") || context.includes("horrível") || context.includes("ruim") || context.includes("terrível")) {
    fields.sentiment = "negative";
  } else if (
    context.includes("bom") ||
    context.includes("ótim") ||
    context.includes("excelente") ||
    context.includes("elogiar") ||
    context.includes("muito bom")
  ) {
    fields.sentiment = "positive";
  } else {
    fields.sentiment = "neutral";
  }

  return fields;
}

export function applyServiceRatingHistoryParsing(
  messages: HistoryMessage[],
  accumulated: Record<string, unknown>,
  deps: ServiceRatingDeps,
): void {
  const serviceTypeMap: Record<string, string> = {
    ubs: "ubs",
    hospital: "hospital",
    escola: "school",
    escolas: "school",
    ceu: "ceu",
    biblioteca: "library",
    bibliotecas: "library",
    "centro esportivo": "sports_center",
    esportes: "sports_center",
    parques: "park",
    park: "park",
    feiras: "street_market",
    creches: "daycare",
    museus: "museum",
    teatros: "theater",
    teatro: "theater",
    transporte: "transit_station",
    mercados: "market",
    "mercados municipais": "city_market",
    outros: "other",
  };

  const addressConfirmPatterns = [
    /^sim\.?$/i,
    /^s\.?$/i,
    /sim.*correto/i,
    /está correto/i,
    /esta correto/i,
    /isso mesmo/i,
    /pode ser/i,
    /é isso/i,
    /e isso/i,
    /confirmo/i,
  ];
  const addressDenyPatterns = [
    /^n[aã]o$/i,
    /^n$/i,
    /n[aã]o.*correto/i,
    /está errado/i,
    /esta errado/i,
    /outro endere[çc]o/i,
    /errado/i,
    /incorreto/i,
  ];

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = deps.getMsgText(msg);
    const contentLower = content.toLowerCase().trim();

    const serviceTypeMatch = content.match(/tipo de serviço:\s*(\w+)/i);
    if (serviceTypeMatch && !accumulated.service_type) {
      const typeName = serviceTypeMatch[1].toLowerCase();
      accumulated.service_type = serviceTypeMap[typeName] || typeName;
      console.log("[accumulateFields] Parsed service_type from picker:", accumulated.service_type);
    }

    const serviceNameMatch = content.match(/serviço:\s*(.+?)(?:\s*-\s*(.+))?(?:\n|$)/i);
    if (serviceNameMatch && !accumulated.service_name) {
      accumulated.service_name = serviceNameMatch[1].trim();
      if (serviceNameMatch[2]) {
        accumulated.service_neighborhood = serviceNameMatch[2].trim();
      }
      console.log("[accumulateFields] Parsed service_name from picker:", accumulated.service_name);
    }

    const addressMatch = content.match(/endereço:\s*(.+?)$/im);
    if (addressMatch && !accumulated.service_address) {
      accumulated.service_address = addressMatch[1].trim();
      console.log("[accumulateFields] Parsed service_address from picker:", accumulated.service_address);
    }

    const serviceIdMatch = content.match(/\[SERVICE_ID:([a-f0-9-]{36})\]/i);
    if (serviceIdMatch && !accumulated.service_id) {
      accumulated.service_id = serviceIdMatch[1];
      console.log("[accumulateFields] Parsed service_id from picker:", accumulated.service_id);
    }

    if (accumulated.service_address_confirmed === undefined) {
      if (addressConfirmPatterns.some((pattern) => pattern.test(contentLower))) {
        accumulated.service_address_confirmed = true;
        accumulated._needs_address_reconfirm = false;
        accumulated._address_reconfirmed = true;
        console.log("[accumulateFields] Service address confirmed by user (flexible match)");
      } else if (addressDenyPatterns.some((pattern) => pattern.test(contentLower))) {
        accumulated.service_address_confirmed = false;
        console.log("[accumulateFields] Service address denied by user - will ask for neighborhood");
      }
    }

    const rdParsed = deps.parseRatingDimensionsMarker(content);
    if (rdParsed) {
      deps.applyCompleteRatingDimensionsToAccumulated(accumulated, rdParsed);
      console.log("[accumulateFields] Parsed rating_dimensions from marker");
    }

    const waitTimeMarker = content.match(/\[WAIT_TIME:(\d+|null)\]/i);
    if (waitTimeMarker) {
      const rawWt = waitTimeMarker[1].toLowerCase();
      const parsedWt = rawWt === "null" ? null : parseInt(waitTimeMarker[1], 10);
      if (parsedWt === null || (parsedWt >= 2 && parsedWt <= 5)) {
        accumulated.wait_time_score = parsedWt;
        console.log("[accumulateFields] Parsed wait_time_score from marker:", accumulated.wait_time_score);
      }
    }

    const dimRatingMarker = content.match(/\[DIM_RATING:(\w+):(\d)\]/i);
    if (dimRatingMarker) {
      const dimKey = dimRatingMarker[1].toLowerCase();
      const dimScore = parseInt(dimRatingMarker[2], 10);
      if (dimScore >= 1 && dimScore <= 5) {
        const fieldKey = `${dimKey}_score`;
        accumulated[fieldKey] = dimScore;
        console.log(`[accumulateFields] Parsed ${fieldKey} from DIM_RATING marker:`, dimScore);
        if (dimKey === "tempo_espera") {
          accumulated.wait_time_score = Math.min(5, Math.max(2, dimScore));
        }
      }
    }

    const ratingSelectedTag = content.match(/\[RATING_SELECTED:([1-5])\]/);
    if (ratingSelectedTag && !accumulated.rating_stars && !/\[DIM_RATING:/i.test(content)) {
      accumulated.rating_stars = parseInt(ratingSelectedTag[1], 10);
      console.log("[accumulateFields] Parsed rating_stars from RATING_SELECTED marker");
    }

    const ratingMatch = content.match(/nota:\s*(\d)\s*estrelas?/i);
    if (ratingMatch && !accumulated.rating_stars && !accumulated.rating_dimensions) {
      accumulated.rating_stars = parseInt(ratingMatch[1], 10);
      console.log("[accumulateFields] Parsed rating_stars from picker:", accumulated.rating_stars);
    }

    if (!accumulated.rating_stars && !accumulated.rating_dimensions) {
      const naturalRatingMatch = contentLower.match(/(\d)\s*(?:estrela|nota)/);
      if (naturalRatingMatch) {
        accumulated.rating_stars = parseInt(naturalRatingMatch[1], 10);
      }
    }
  }

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const contextFields = extractServiceFields(deps.getMsgText(msg).toLowerCase());
    for (const [key, value] of Object.entries(contextFields)) {
      if (!accumulated[key]) {
        accumulated[key] = value;
      }
    }
  }

  const lastMsgIdx = messages.length - 1;
  if (messages[lastMsgIdx]?.role !== "user" || lastMsgIdx <= 0) return;

  const prevMsg = messages[lastMsgIdx - 1];
  if (prevMsg?.role !== "assistant") return;

  const prevAssistantTextSvc = deps.getMsgText(prevMsg);
  const fieldType = deps.getLastFieldRequestType(prevAssistantTextSvc);
  if (!fieldType) return;

  const answer = deps.getMsgText(messages[lastMsgIdx]).trim();

  switch (fieldType) {
    case "service_type": {
      const isJourneySwitchAttempt =
        answer.toLowerCase().includes("falar de") ||
        answer.toLowerCase().includes("falar do") ||
        answer.toLowerCase().includes("mudar para") ||
        answer.toLowerCase().includes("trocar para") ||
        answer.toLowerCase().includes("quero fazer") ||
        answer.toLowerCase().includes("na verdade");

      if (isJourneySwitchAttempt) {
        console.log("[accumulateFields] Detected journey switch attempt, skipping service_type capture");
        break;
      }

      const typeMatch = answer.match(/tipo de serviço:\s*(\w+)/i);
      if (typeMatch) {
        accumulated.service_type = serviceTypeMap[typeMatch[1].toLowerCase()] || typeMatch[1].toLowerCase();
      } else if (serviceTypeMap[answer.toLowerCase()]) {
        accumulated.service_type = serviceTypeMap[answer.toLowerCase()];
      } else if (answer.length <= 20) {
        accumulated.service_type = answer.toLowerCase();
      }
      break;
    }
    case "service_name": {
      const nameMatch = answer.match(/serviço:\s*(.+?)(?:\s*-\s*([^\n]*))?(?:\n|$)/i);
      if (nameMatch) {
        accumulated.service_name = nameMatch[1].trim();
        if (nameMatch[2] && nameMatch[2].trim()) accumulated.service_neighborhood = nameMatch[2].trim();
      } else {
        accumulated.service_name = answer.trim();
      }
      break;
    }
    case "rating_dimensions": {
      const rd = deps.parseRatingDimensionsMarker(answer);
      if (rd) {
        deps.applyCompleteRatingDimensionsToAccumulated(accumulated, rd);
      }
      const wmRd = answer.match(/\[WAIT_TIME:(\d+|null)\]/i);
      if (wmRd) {
        const rawW = wmRd[1].toLowerCase();
        const value = rawW === "null" ? null : parseInt(wmRd[1], 10);
        if (value === null || (value >= 2 && value <= 5)) {
          accumulated.wait_time_score = value;
        }
      }
      break;
    }
    case "rating_stars": {
      const rdAns = deps.parseRatingDimensionsMarker(answer);
      if (rdAns) {
        deps.applyCompleteRatingDimensionsToAccumulated(accumulated, rdAns);
      } else {
        const starsMatch = answer.match(/(\d)/);
        if (starsMatch) {
          accumulated.rating_stars = parseInt(starsMatch[1], 10);
        }
      }
      break;
    }
    case "wait_time": {
      const waitMarker = answer.match(/\[WAIT_TIME:(\d+|null)\]/i);
      if (waitMarker) {
        const rawW = waitMarker[1].toLowerCase();
        const value = rawW === "null" ? null : parseInt(waitMarker[1], 10);
        if (value === null || (value >= 2 && value <= 5)) {
          accumulated.wait_time_score = value;
          console.log("[accumulateFields] FIELD_REQUEST wait_time → wait_time_score:", value);
        }
      }
      break;
    }
    case "atendimento": {
      const dm = answer.match(/\[DIM_RATING:atendimento:(\d)\]/i);
      if (dm) {
        const dScore = parseInt(dm[1], 10);
        if (dScore >= 1 && dScore <= 5) {
          accumulated.atendimento_score = dScore;
          console.log("[accumulateFields] FIELD_REQUEST atendimento → atendimento_score:", dScore);
        }
      }
      break;
    }
    case "infraestrutura": {
      const dm = answer.match(/\[DIM_RATING:infraestrutura:(\d)\]/i);
      if (dm) {
        const dScore = parseInt(dm[1], 10);
        if (dScore >= 1 && dScore <= 5) {
          accumulated.infraestrutura_score = dScore;
          console.log("[accumulateFields] FIELD_REQUEST infraestrutura → infraestrutura_score:", dScore);
        }
      }
      break;
    }
    case "dim_tempo_espera": {
      const wm = answer.match(/\[WAIT_TIME:(\d+|null)\]/i);
      if (wm) {
        const rawW = wm[1].toLowerCase();
        const value = rawW === "null" ? null : parseInt(wm[1], 10);
        accumulated.wait_time_score = value;
        const dm = answer.match(/\[DIM_RATING:tempo_espera:([1-5])\]/i);
        const score = dm ? parseInt(dm[1], 10) : value === null ? 3 : value;
        if (!Number.isNaN(score) && score >= 1 && score <= 5) {
          accumulated.tempo_espera_score = score;
          console.log("[accumulateFields] FIELD_REQUEST dim_tempo_espera (WAIT_TIME) → tempo_espera_score:", score);
        }
        break;
      }
      const rs = answer.match(/\[RATING_SELECTED:([1-5])\]/);
      const dm = answer.match(/\[DIM_RATING:tempo_espera:([1-5])\]/i);
      const score = rs ? parseInt(rs[1], 10) : dm ? parseInt(dm[1], 10) : NaN;
      if (!Number.isNaN(score) && score >= 1 && score <= 5) {
        accumulated.tempo_espera_score = score;
        accumulated.wait_time_score = Math.min(5, Math.max(2, score));
        console.log("[accumulateFields] FIELD_REQUEST dim_tempo_espera → tempo_espera_score:", score);
      }
      break;
    }
    case "dim_atendimento": {
      const rs = answer.match(/\[RATING_SELECTED:([1-5])\]/);
      const dm = answer.match(/\[DIM_RATING:atendimento:([1-5])\]/i);
      const score = rs ? parseInt(rs[1], 10) : dm ? parseInt(dm[1], 10) : NaN;
      if (!Number.isNaN(score) && score >= 1 && score <= 5) {
        accumulated.atendimento_score = score;
        console.log("[accumulateFields] FIELD_REQUEST dim_atendimento → atendimento_score:", score);
      }
      break;
    }
    case "dim_infraestrutura": {
      const rs = answer.match(/\[RATING_SELECTED:([1-5])\]/);
      const dm = answer.match(/\[DIM_RATING:infraestrutura:([1-5])\]/i);
      const score = rs ? parseInt(rs[1], 10) : dm ? parseInt(dm[1], 10) : NaN;
      if (!Number.isNaN(score) && score >= 1 && score <= 5) {
        accumulated.infraestrutura_score = score;
        console.log("[accumulateFields] FIELD_REQUEST dim_infraestrutura → infraestrutura_score:", score);
      }
      break;
    }
    case "dim_limpeza": {
      const rs = answer.match(/\[RATING_SELECTED:([1-5])\]/);
      const dm = answer.match(/\[DIM_RATING:limpeza:([1-5])\]/i);
      const score = rs ? parseInt(rs[1], 10) : dm ? parseInt(dm[1], 10) : NaN;
      if (!Number.isNaN(score) && score >= 1 && score <= 5) {
        accumulated.limpeza_score = score;
        console.log("[accumulateFields] FIELD_REQUEST dim_limpeza → limpeza_score:", score);
      }
      break;
    }
    case "rating_text": {
      if (/\[RATING_SUBMIT_PREVIEW\]/i.test(prevAssistantTextSvc)) {
        console.log("[accumulateFields] rating_text: ignorando resposta pós-preview (publicar/editar)");
        break;
      }
      const lowerAns = answer.toLowerCase().trim();
      if (/^(pular|n[aã]o|pr[oó]ximo|nenhuma|nada)$/i.test(lowerAns)) {
        accumulated.rating_text = null;
        accumulated._rating_text_skipped = true;
        console.log("[accumulateFields] FIELD_REQUEST: rating_text skipped by user");
      } else {
        accumulated.rating_text = answer;
      }
      break;
    }
    case "service_address_confirmed": {
      const confirmLower = answer.toLowerCase().trim();
      if (/^(sim|s|isso|correto|confirmo)$/i.test(confirmLower) || confirmLower.includes("correto") || confirmLower.includes("isso mesmo")) {
        accumulated.service_address_confirmed = true;
        accumulated._needs_address_reconfirm = false;
        accumulated._address_reconfirmed = true;
        console.log("[accumulateFields] FIELD_REQUEST: Service address confirmed");
      } else if (/^(n[aã]o|n|errado|incorreto)$/i.test(confirmLower) || confirmLower.includes("errado") || confirmLower.includes("outro")) {
        accumulated.service_address_confirmed = false;
        console.log("[accumulateFields] FIELD_REQUEST: Service address denied");
      }
      break;
    }
    case "service_neighborhood": {
      if (answer.length >= 2 && answer.length <= 60) {
        accumulated.service_neighborhood = answer.trim();
        if (accumulated.service_name) {
          accumulated.service_address = `${accumulated.service_name} - ${answer.trim()}`;
        }
        accumulated.service_address_confirmed = undefined;
        const prevContent = prevMsg.content || "";
        if (/correto|ok.*bairro/i.test(prevContent)) {
          accumulated._needs_address_reconfirm = true;
        }
        const typeLabels: Record<string, string> = {
          ceu: "CEU",
          ubs: "UBS",
          hospital: "Hospital",
          school: "Escola",
          library: "Biblioteca",
          sports_center: "Centro esportivo",
        };
        const tl = typeLabels[String(accumulated.service_type || "")] || "";
        const generic = tl ? `${tl} - ${answer.trim()}` : "";
        const serviceNameStr = String(accumulated.service_name ?? "");
        if (serviceNameStr === generic || serviceNameStr.length < 5) {
          accumulated.service_name = undefined;
        }
        console.log("[accumulateFields] FIELD_REQUEST: Service neighborhood captured:", answer);
      }
      break;
    }
    case "service_address_reconfirm": {
      const reconfirmLower = answer.toLowerCase().trim();
      const denied =
        /^(n[aã]o|n|errado|incorreto)$/i.test(reconfirmLower) ||
        reconfirmLower.includes("errado") ||
        reconfirmLower.includes("incorreto") ||
        reconfirmLower.includes("outro");
      if (/^(sim|s|isso|correto|confirmo)$/i.test(reconfirmLower) || reconfirmLower.includes("correto") || reconfirmLower.includes("isso mesmo")) {
        accumulated.service_address_confirmed = true;
        accumulated._address_reconfirmed = true;
        accumulated._needs_address_reconfirm = false;
        console.log("[accumulateFields] FIELD_REQUEST: Service address reconfirmed");
      } else if (denied) {
        accumulated.service_address_confirmed = false;
        accumulated.service_neighborhood = undefined;
        accumulated.service_address = accumulated.service_name ? `${accumulated.service_name}` : undefined;
        accumulated._needs_address_reconfirm = false;
        accumulated._address_reconfirmed = false;
        console.log("[accumulateFields] FIELD_REQUEST: Service address denied on reconfirm - will ask for correct bairro");
      }
      break;
    }
  }
}
