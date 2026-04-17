type HistoryMessage = { role: string; content: string };

type UrbanHistoryDeps = {
  extractUrbanFields: (context: string) => Record<string, unknown>;
  getMsgText: (msg: { role: string; content: string | unknown }) => string;
  normalizeTextForMatching: (text: string) => string;
  getLastFieldRequestType: (text: string) => string | null;
  parseFieldResponse: (fieldType: string, userResponse: string) => Record<string, unknown>;
  isValidDomainDescription: (text: string, domain: string) => boolean;
  isBareUrbanReportNatureReply: (text: string) => boolean;
  generateLabelFromDescription: (description: string) => string;
  normalizeReportNature: (raw: string | undefined | null) => string | null;
};

function getContentU(msg: { role: string; content: string | unknown }): string {
  const raw = msg.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const part = raw.find((piece: Record<string, unknown>) => piece?.type === "text" && piece?.text);
    return part ? String((part as Record<string, unknown>).text) : "";
  }
  return "";
}

export function applyUrbanHistoryParsing(
  messages: HistoryMessage[],
  accumulated: Record<string, unknown>,
  deps: UrbanHistoryDeps,
): void {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const userContext = msg.content.toLowerCase();
    const detectedFields = deps.extractUrbanFields(userContext);
    if (detectedFields.category) {
      accumulated.category = detectedFields.category;
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const role = msg.role;
    const content = msg.content.toLowerCase();

    if (role === "assistant" && !accumulated.category) {
      const categoryPatterns = [
        { pattern: /problema de \*?\*?ilumina[çc][ãa]o\*?\*?/i, category: "iluminacao" },
        { pattern: /problema de \*?\*?via p[úu]blica\*?\*?/i, category: "via_publica" },
        { pattern: /problema de \*?\*?pavimenta[çc][ãa]o\*?\*?/i, category: "pavimentacao" },
        { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: "calcada" },
        { pattern: /problema de \*?\*?sinaliza[çc][ãa]o\*?\*?/i, category: "sinalizacao" },
        { pattern: /problema de \*?\*?drenagem\*?\*?/i, category: "drenagem" },
        { pattern: /problema de \*?\*?lixo\*?\*?/i, category: "lixo" },
        { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: "esgoto" },
        { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: "area_verde" },
        { pattern: /registrar\s+(?:como\s+)?feedback\s+(?:para|à|a)\s+(?:a\s+)?c[âa]mara/i, category: "feedback_camara" },
        { pattern: /registrar.*preocupa[çc][ãa]o.*c[âa]mara/i, category: "feedback_camara" },
        { pattern: /registrar como feedback/i, category: "feedback_camara" },
        { pattern: /feedback geral para a c[âa]mara/i, category: "feedback_camara" },
      ];

      for (const { pattern, category } of categoryPatterns) {
        if (pattern.test(msg.content)) {
          accumulated.category = category;
          console.log("[accumulateFields] Category detected from assistant message:", category);
          break;
        }
      }
    }

    if (role === "user" && i > 0 && !accumulated.category) {
      const prevMsg = messages[i - 1];
      if (prevMsg && prevMsg.role === "assistant") {
        const prevContent = prevMsg.content.toLowerCase();
        const isOfferingFeedback =
          prevContent.includes("registrar") &&
          (prevContent.includes("feedback") || prevContent.includes("preocupação") || prevContent.includes("câmara"));
        const userAccepts =
          content.includes("sim") ||
          content.includes("desejo") ||
          content.includes("quero") ||
          content.includes("pode") ||
          content.includes("ok") ||
          content.includes("aceito");

        if (isOfferingFeedback && userAccepts) {
          accumulated.category = "feedback_camara";
          console.log("[accumulateFields] Category set to feedback_camara from user acceptance");
        }
      }
    }
  }

  for (const msg of messages) {
    if (msg.role !== "user" || typeof msg.content !== "string") continue;
    const content = msg.content;
    const contentLower = content.toLowerCase();

    if (!accumulated.location_method) {
      if (/localiza[cç][aã]o\s*gps\s*[-:0-9]/i.test(content) || /^📍/u.test(content.trim())) {
        accumulated.location_method = "gps";
      } else if (/usar\s+endere[cç]o\s+cadastrado/i.test(contentLower)) {
        accumulated.location_method = "registered_address";
      } else if (/digitar\s+(cep|endere[cç]o)|digitar\s+cep\s+ou\s+endere[cç]o/i.test(contentLower)) {
        accumulated.location_method = "manual";
      }
    }

    const gpsM =
      content.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
      ((contentLower.includes("localização gps") || contentLower.includes("localizacao gps"))
        ? content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/)
        : null);
    if (gpsM && accumulated.user_lat == null) {
      const lat = parseFloat(gpsM[1].trim());
      const lon = parseFloat(gpsM[2].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        accumulated.user_lat = lat;
        accumulated.user_lon = lon;
        if (!accumulated.location_method) accumulated.location_method = "gps";
      }
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nextMsg = messages[i + 1];

    if (msg.role === "user") {
      const cepMatch = msg.content.match(/\b(\d{5}[-]?\d{3})\b/);
      if (cepMatch && !accumulated.cep) {
        accumulated.cep = cepMatch[1].replace("-", "");
      }
    }

    if (msg.role !== "assistant" || nextMsg?.role !== "user") continue;

    const rawQuestion = deps.getMsgText(msg);
    const question = deps.normalizeTextForMatching(rawQuestion);
    const answer = deps.getMsgText(nextMsg).trim();

    const fieldType = deps.getLastFieldRequestType(rawQuestion);
    if (fieldType) {
      const parsedFields = deps.parseFieldResponse(fieldType, answer);

      if (fieldType === "category") {
        if (parsedFields._category_confirmed && accumulated._pending_category) {
          accumulated.category = accumulated._pending_category;
          accumulated.subcategory = accumulated._pending_subcategory || deps.generateLabelFromDescription(String(accumulated.description ?? ""));
          delete accumulated._pending_category;
          delete accumulated._pending_subcategory;
          console.log("[accumulateFields] Category confirmed:", accumulated.category, "subcategory:", accumulated.subcategory);
          continue;
        } else if (parsedFields._category_denied) {
          delete accumulated._pending_category;
          delete accumulated._pending_subcategory;
          accumulated._asked_category = false;
          console.log("[accumulateFields] Category denied, will ask again");
          continue;
        }
      }

      Object.assign(accumulated, parsedFields);
      continue;
    }

    if ((question.includes("qual o cep") || question.includes("qual é o cep") || question.includes("cep do local")) && answer.length >= 8) {
      const cepMatch = answer.match(/\b(\d{5}[-]?\d{3})\b/);
      if (cepMatch) {
        accumulated.cep = cepMatch[1].replace("-", "");
      }
    }

    const askedForAddress =
      (question.includes("cep do local") ||
        question.includes("qual o cep") ||
        question.includes("qual o endereço") ||
        question.includes("rua e bairro") ||
        question.includes("me diz a rua") ||
        question.includes("cep ou endereço")) &&
      answer.length >= 10 &&
      !answer.toLowerCase().includes("endereço selecionado:");
    const hasCepInAnswer = /\b\d{5}[-]?\d{3}\b/.test(answer);
    const looksLikeAddress = /rua|av\.|avenida|praça|rua das|rua do|centro|vila|jardim|bairro/i.test(answer) || (answer.includes(",") && answer.length > 15);
    if (askedForAddress && !hasCepInAnswer && looksLikeAddress && (!accumulated.street || !accumulated.neighborhood)) {
      const parts = answer.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const streetParts = parts.slice(0, -1);
        const street = streetParts.join(", ");
        if (street.length >= 3 && lastPart.length >= 2) {
          accumulated.street = street;
          accumulated.neighborhood = lastPart;
          console.log("[accumulateFields] Parsed free-form address:", { street, neighborhood: lastPart });
        }
      } else if (parts.length === 1 && parts[0].length >= 10 && /rua|av\.|avenida|praça/i.test(parts[0])) {
        accumulated.street = parts[0];
        console.log("[accumulateFields] Parsed single-part address as street:", { street: parts[0] });
      }
    }

    if (
      (question.includes("qual o nome da rua") || question.includes("qual é o nome da rua") || question.includes("qual a rua") || question.includes("qual é a rua")) &&
      answer.length > 3 &&
      !answer.toLowerCase().includes("não sei")
    ) {
      let street = answer;
      if (street.toLowerCase().startsWith("rua rua ")) {
        street = street.substring(4);
      } else if (street.toLowerCase().startsWith("avenida avenida ")) {
        street = street.substring(8);
      }
      accumulated.street = street;
    }

    if (
      (question.includes("qual o número") || question.includes("qual é o número") || question.includes("número ou ponto") || question.includes("ponto de referência")) &&
      answer.length > 0
    ) {
      const answerLower = answer.toLowerCase().trim();
      const skipPhrases = ["pular", "não sei", "nao sei", "continuar", "não tenho", "nao tenho", "opcional", "próximo", "proximo", "sem número", "sem numero"];
      if (skipPhrases.some((phrase) => answerLower.includes(phrase))) {
        accumulated.reference_point = "não informado";
      } else {
        const numberMatch = answer.match(/^(\d+)/);
        if (numberMatch) {
          accumulated.street_number = numberMatch[1];
        } else if (answerLower.includes("altura") || answerLower.includes("perto") || answerLower.includes("frente") || answerLower.includes("próximo")) {
          accumulated.reference_point = answer;
        } else {
          accumulated.street_number = answer;
        }
      }
    }

    if ((question.includes("qual o bairro") || question.includes("qual é o bairro") || question.includes("bairro?")) && answer.length > 2) {
      accumulated.neighborhood = answer;
    }

    const riskQuestionHeuristic =
      /\[FIELD_REQUEST:risk_level\]/i.test(rawQuestion) ||
      /\[QUICK_REPLY:\s*critical\b/i.test(rawQuestion) ||
      /\bnova\s+gravidade\b/i.test(question) ||
      /\bqual\s+a\s+nova\s+gravidade\b/i.test(question) ||
      /\bn[ií]vel\s+de\s+gravidade\b/i.test(question) ||
      (/\bgravidade\s+do\s+problema\b/i.test(question) && /escolha|op(ç|c)[aã]o|risco\s+ou\s+impacto|uma\s+frase|descreva/i.test(question)) ||
      (/\bhá\s+algum\s+risco\b/i.test(question) || /\brisco\s+imediat/i.test(question));
    if (riskQuestionHeuristic) {
      const parsedRisk = deps.parseFieldResponse("risk_level", answer);
      if (parsedRisk.risk_level != null) {
        Object.assign(accumulated, parsedRisk);
      }
    }

    if ((question.includes("afetando só você") || question.includes("toda a rua") || question.includes("bairro todo") || question.includes("está afetando")) && !accumulated.affected_scope) {
      const parsedScope = deps.parseFieldResponse("affected_scope", answer);
      Object.assign(accumulated, parsedScope);
    }

    if ((question.includes("consequência") || question.includes("falta de luz") || question.includes("causando")) && !accumulated.active_consequences) {
      const parsedConsequences = deps.parseFieldResponse("active_consequences", answer);
      Object.assign(accumulated, parsedConsequences);
    }

    if (
      (question.includes("me conte mais") ||
        question.includes("descreva") ||
        question.includes("mais detalhes") ||
        question.includes("o que está acontecendo") ||
        question.includes("qual o problema") ||
        question.includes("qual é o problema") ||
        question.includes("sua dúvida") ||
        question.includes("sua duvida") ||
        question.includes("sua sugestão") ||
        question.includes("sua sugestao") ||
        question.includes("quer elogiar") ||
        question.includes("funcionando bem") ||
        question.includes("ideia de melhoria") ||
        question.includes("conta o que")) &&
      deps.isValidDomainDescription(answer, "urban") &&
      !deps.isBareUrbanReportNatureReply(answer) &&
      !accumulated.description
    ) {
      accumulated.description = answer;
    }
  }

  const lastMsgIdx = messages.length - 1;
  if (messages[lastMsgIdx]?.role === "user" && lastMsgIdx > 0) {
    const prevMsg = messages[lastMsgIdx - 1];
    if (prevMsg?.role === "assistant") {
      const prevAssistantText = deps.getMsgText(prevMsg);
      const fieldType = deps.getLastFieldRequestType(prevAssistantText);
      if (fieldType) {
        const answer = deps.getMsgText(messages[lastMsgIdx]).trim();
        const parsedFields = deps.parseFieldResponse(fieldType, answer);

        if (fieldType === "category") {
          if (parsedFields._category_confirmed && accumulated._pending_category) {
            accumulated.category = accumulated._pending_category;
            accumulated.subcategory = accumulated._pending_subcategory || deps.generateLabelFromDescription(String(accumulated.description ?? ""));
            delete accumulated._pending_category;
            delete accumulated._pending_subcategory;
            console.log("[accumulateFields] Last msg: Category confirmed:", accumulated.category, "subcategory:", accumulated.subcategory);
          } else if (parsedFields._category_denied) {
            delete accumulated._pending_category;
            delete accumulated._pending_subcategory;
            accumulated._asked_category = false;
            console.log("[accumulateFields] Last msg: Category denied, will ask again");
          } else {
            Object.assign(accumulated, parsedFields);
          }
        } else {
          Object.assign(accumulated, parsedFields);
        }
      }
    }
  }

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = getContentU(msg).trim();
    const contentLower = content.toLowerCase();
    if (!accumulated.location_method) {
      if (/^usar endereço cadastrado$/i.test(content) || /^usar endereco cadastrado$/i.test(content)) {
        accumulated.location_method = "registered_address";
      } else if (/^digitar cep ou endereço$/i.test(content) || /^digitar cep ou endereco$/i.test(content)) {
        accumulated.location_method = "manual";
      } else if (/usar\s+(minha\s+)?localiza[cç][aã]o|localiza[cç][aã]o\s*gps:/i.test(contentLower)) {
        accumulated.location_method = "gps";
      }
    }
    const gpsMatch =
      content.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
      ((contentLower.includes("localização gps") || contentLower.includes("localizacao gps")) &&
        content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/));
    if (gpsMatch && accumulated.user_lat == null) {
      const lat = parseFloat(gpsMatch[1].trim());
      const lon = parseFloat(gpsMatch[2].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        accumulated.user_lat = lat;
        accumulated.user_lon = lon;
        if (!accumulated.location_method) accumulated.location_method = "gps";
      }
    }
  }

  if (!accumulated.report_nature) {
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const text = msg.content.trim();
      if (text.length > 48) continue;
      const nature = deps.normalizeReportNature(text);
      if (nature) {
        accumulated.report_nature = nature;
        break;
      }
    }
  }
}
