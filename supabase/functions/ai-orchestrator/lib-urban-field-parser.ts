type AutoClassifyCategoryResult = {
  category: string | null;
  confidence: number;
  suggestedLabel?: string | null;
};

type AutoInferRiskResult = {
  risk_level: string | null;
  confidence: number;
  risk_types?: string[];
};

type UrbanFieldParserDeps = {
  autoClassifyCategory: (text: string) => AutoClassifyCategoryResult;
  generateLabelFromDescription: (description: string) => string;
  autoInferRisk: (description: string) => AutoInferRiskResult;
  isTransportLinePickerPayload: (value: string) => boolean;
  isValidDomainDescription: (text: string, domain: "urban" | "transport" | "service") => boolean;
};

export function parseUrbanFieldResponse(
  fieldType: string,
  userResponse: string,
  deps: UrbanFieldParserDeps,
): Record<string, unknown> | null {
  const response = userResponse.trim();
  const responseLower = response.toLowerCase();
  const result: Record<string, unknown> = {};

  switch (fieldType) {
    case "location_method": {
      const t = response.trim();
      const tl = t.toLowerCase();
      if (/^usar endereço cadastrado$/i.test(t) || /^usar endereco cadastrado$/i.test(t)) {
        result.location_method = "registered_address";
        break;
      }
      if (/^digitar cep ou endereço$/i.test(t) || /^digitar cep ou endereco$/i.test(t)) {
        result.location_method = "manual";
        break;
      }
      const gpsLineLm = response.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i);
      if (gpsLineLm) {
        const la = parseFloat(gpsLineLm[1]);
        const lo = parseFloat(gpsLineLm[2]);
        if (!Number.isNaN(la) && !Number.isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
          result.user_lat = la;
          result.user_lon = lo;
          result.location_method = "gps";
        }
        break;
      }
      if (/usar\s+minha\s+localiza[cç][aã]o|^gps$/i.test(tl)) {
        result.location_method = "gps";
      }
      break;
    }

    case "gps_coords": {
      const gpsLine = response.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i);
      if (gpsLine) {
        const la = parseFloat(gpsLine[1]);
        const lo = parseFloat(gpsLine[2]);
        if (!Number.isNaN(la) && !Number.isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
          result.user_lat = la;
          result.user_lon = lo;
          result.location_method = "gps";
        }
      }
      break;
    }

    case "urban_registered_address_ack": {
      const t = responseLower.trim();
      if (/^(sim|s|yes|y|ok|correto|isso|confirmo|pode ser|certo|exato)\b/i.test(t) || /^👍/u.test(response.trim())) {
        result.urban_registered_address_ack = true;
        break;
      }
      if (/^(não|nao|n|no|nope|errado|outro|outra)\b/i.test(t)) {
        result.urban_registered_address_ack = true;
        result.location_method = "manual";
        result.street = "";
        result.neighborhood = "";
        result.cep = "";
        result.street_number = "";
        result.reference_point = "";
        result._location_from_user_profile = false;
        console.log("[parseFieldResponse] urban_registered_address_ack: user rejected profile address → manual");
      }
      break;
    }

    case "cep": {
      const cepMatch = response.match(/\b(\d{5}[-]?\d{3})\b/);
      if (cepMatch) {
        result.cep = cepMatch[1].replace(/\D/g, "");
        break;
      }
      const looksLikeAddr = /rua|av\.|avenida|praça|rua das|rua do|centro|vila|jardim|bairro/i.test(response) || (response.includes(",") && response.length > 15);
      if (looksLikeAddr && response.length >= 10) {
        const parts = response.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const streetParts = parts.slice(0, -1);
          const street = streetParts.join(", ");
          if (street.length >= 3 && lastPart.length >= 2) {
            result.street = street;
            result.neighborhood = lastPart;
            console.log("[parseFieldResponse] CEP: parsed free-form address:", { street, neighborhood: lastPart });
          }
        } else if (parts.length === 1 && parts[0].length >= 10 && /rua|av\.|avenida|praça/i.test(parts[0])) {
          result.street = parts[0];
          console.log("[parseFieldResponse] CEP: parsed single-part street:", parts[0]);
        }
      }
      break;
    }

    case "street_number": {
      const numberMatch = response.match(/^(\d+)/);
      if (numberMatch) {
        result.street_number = numberMatch[1];
      } else if (
        responseLower.includes("altura") ||
        responseLower.includes("perto") ||
        responseLower.includes("frente") ||
        responseLower.includes("próximo") ||
        responseLower.includes("esquina")
      ) {
        result.reference_point = response;
      } else if (response.length > 0 && response.length < 50) {
        result.street_number = response;
      }
      break;
    }

    case "category": {
      const confirmPatterns = /^(sim|s|yes|y|ok|pode|pode ser|isso|isso mesmo|confirmo|confirma|exato|correto)$/i;
      const denyPatterns = /^(não|nao|n|no|nope|outra|outro|diferente|errado|não é isso|nao e isso)$/i;

      if (confirmPatterns.test(responseLower)) {
        result._category_confirmed = true;
        console.log("[parseFieldResponse] Category confirmation detected: YES");
        break;
      }
      if (denyPatterns.test(responseLower)) {
        result._category_denied = true;
        console.log("[parseFieldResponse] Category confirmation detected: NO");
        break;
      }

      const categoryMap: Record<string, string> = {
        iluminação: "iluminacao", iluminacao: "iluminacao", luz: "iluminacao", poste: "iluminacao", lampada: "iluminacao",
        buraco: "via_publica", asfalto: "via_publica", "via pública": "via_publica", "via publica": "via_publica", rua: "via_publica",
        pavimentação: "pavimentacao", pavimentacao: "pavimentacao", recape: "pavimentacao", asfaltamento: "pavimentacao",
        sinalização: "sinalizacao", sinalizacao: "sinalizacao", semáforo: "sinalizacao", semaforo: "sinalizacao", faixa: "sinalizacao", placa: "sinalizacao",
        drenagem: "drenagem", "água pluvial": "drenagem", "agua pluvial": "drenagem", sarjeta: "drenagem", galeria: "drenagem", pluvial: "drenagem",
        calçada: "calcada", calcada: "calcada", passeio: "calcada",
        lixo: "lixo", entulho: "lixo", sujeira: "lixo",
        esgoto: "esgoto", bueiro: "esgoto", vazamento: "esgoto", alagamento: "esgoto", água: "esgoto", agua: "esgoto",
        "área verde": "area_verde", "area verde": "area_verde", árvore: "area_verde", arvore: "area_verde", praça: "area_verde", praca: "area_verde", mato: "area_verde",
        higiene: "higiene_urbana", fedor: "higiene_urbana", cheiro: "higiene_urbana",
        animais: "animais", rato: "animais", barata: "animais", animal: "animais",
        poluição: "poluicao", poluicao: "poluicao", "poluição sonora": "poluicao", "poluicao sonora": "poluicao",
        "poluição ambiental": "poluicao", "poluicao ambiental": "poluicao", "poluição atmosférica": "poluicao",
        barulho: "poluicao", ruido: "poluicao", ruído: "poluicao",
        som: "poluicao", "som alto": "poluicao", música: "poluicao", musica: "poluicao", festa: "poluicao",
        perturbação: "poluicao", perturbacao: "poluicao", "perturbação sonora": "poluicao",
        vizinho: "poluicao", bar: "poluicao", balada: "poluicao",
        outro: "outro", outros: "outro", diferente: "outro", "não sei": "outro", "nao sei": "outro", "outra coisa": "outro",
      };

      for (const [key, cat] of Object.entries(categoryMap)) {
        if (responseLower === key || responseLower.startsWith(key + " ") || responseLower.includes(key)) {
          result.category = cat;
          console.log("[parseFieldResponse] Category matched:", key, "→", cat);
          break;
        }
      }

      if (!result.category && response.length >= 3) {
        const autoClass = deps.autoClassifyCategory(response);
        if (autoClass.category && autoClass.confidence >= 0.5) {
          result.category = autoClass.category;
          result.subcategory = autoClass.suggestedLabel || deps.generateLabelFromDescription(response);
          result._auto_classified = true;
          result._classification_confidence = autoClass.confidence;
          if (response.length >= 20) {
            result.description = response;
          }
          console.log("[parseFieldResponse] Auto-classified category:", autoClass.category, "subcategory:", result.subcategory);
        } else {
          result.category = "outro";
          result.subcategory = deps.generateLabelFromDescription(response);
          result._fallback_category = true;
          if (response.length >= 20) {
            result.description = response;
          }
          console.log("[parseFieldResponse] Fallback to outro with subcategory:", result.subcategory);
        }
      }
      break;
    }

    case "risk_level": {
      const rl = responseLower.replace(/\bcheio(?=\s+t[óo]xic)/g, "cheiro");

      const riskQuickNorm = response
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      const riskQuickMap: Record<string, string> = {
        critical: "critical",
        moderate: "moderate",
        low: "low",
        none: "none",
        critica: "critical",
        critico: "critical",
        moderada: "moderate",
        moderado: "moderate",
        baixa: "low",
        baixo: "low",
        semriscoimediato: "none",
        semrisco: "none",
      };
      const riskQuickKey = riskQuickNorm.replace(/\s+/g, "");
      if (riskQuickMap[riskQuickKey]) {
        result.risk_level = riskQuickMap[riskQuickKey];
        result.urgency_reason = response;
        break;
      }

      if (rl === "sim" || rl === "s" || rl === "yes" || rl === "y") {
        result.risk_level = "critical";
        result.urgency_reason = response;
        break;
      }
      if (rl === "não" || rl === "nao" || rl === "n" || rl === "no") {
        result.risk_level = "none";
        result.urgency_reason = response;
        break;
      }

      const criticalKeywords = [
        "bloqueada", "bloqueado", "não passa", "nao passa", "não dá para", "nao da para",
        "fios expostos", "exposto", "choque", "eletricidade", "fio caído", "fio caido",
        "alagando", "água subindo", "inundando", "transbordando",
        "alagada", "alagado", "inundada", "inundado", "cheia de água", "cheia dágua", "cheia d'água",
        "completamente alagad", "totalmente alagad", "muito alagad",
        "desabando", "caindo", "desmoronando", "desabou", "caiu", "tombou", "rachando", "cedendo",
        "incêndio", "incendio", "fogo", "chamas", "pegando fogo", "fumaça preta", "fumaca preta", "explosão", "explosao",
        "risco imediato", "emergência", "urgente", "urgência", "gravíssimo", "muito grave", "muito perigoso",
        "ferido", "machucado", "hospital", "ambulância", "samu",
        "tóxico", "toxico", "veneno", "gás tóxico", "gas toxico", "vazamento de gás", "cheiro de gás",
        "foco de contamina", "contaminação forte", "cheiro forte", "fedor forte",
        "completamente", "totalmente", "extremamente",
      ];
      const moderateKeywords = [
        "risco de", "pode causar", "perigoso", "perigo", "acidente",
        "risco de doença", "doença", "doenças", "contaminação", "transtorno", "prejudica",
        "arriscado", "preocupante", "pode machucar", "pode alagar", "grande", "sério",
        "cheiro", "fedor", "fumaça", "fumaca", "olor", "mau cheiro", "odor", "poluição", "poluicao",
      ];
      const lowKeywords = ["incômodo", "incomodo", "chato", "desconfortável", "feio", "ruim", "só atrapalha", "so atrapalha"];
      const noRiskKeywords = ["sem risco", "não tem risco", "nao tem risco", "nenhum risco", "tranquilo", "não há risco", "nao ha risco", "só incômodo", "so incomodo"];

      if (noRiskKeywords.some((k) => rl.includes(k))) {
        result.risk_level = "none";
      } else if (criticalKeywords.some((k) => rl.includes(k))) {
        result.risk_level = "critical";
        const riskTypes: string[] = [];
        if (rl.includes("fio") || rl.includes("choque") || rl.includes("elétric") || rl.includes("eletric")) riskTypes.push("electrical");
        if (rl.includes("bloqueada") || rl.includes("não passa") || rl.includes("trânsito") || rl.includes("transito")) riskTypes.push("traffic");
        if (rl.includes("alagad") || rl.includes("inundad") || rl.includes("água") || rl.includes("agua") || rl.includes("enchente")) riskTypes.push("flooding");
        if (rl.includes("caindo") || rl.includes("desab") || rl.includes("tomb") || rl.includes("rachando")) riskTypes.push("structural");
        if (rl.includes("tóxic") || rl.includes("toxic") || rl.includes("contamina") || rl.includes("cheiro") || rl.includes("fedor") || rl.includes("fumaça") || rl.includes("fumaca") || rl.includes("gás")) riskTypes.push("health");
        if (rl.includes("incêndio") || rl.includes("incendio") || rl.includes("fogo") || rl.includes("chamas") || rl.includes("explosão") || rl.includes("explosao")) riskTypes.push("fire");
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (moderateKeywords.some((k) => rl.includes(k))) {
        result.risk_level = "moderate";
        const riskTypes: string[] = [];
        if (rl.includes("doença") || rl.includes("saúde") || rl.includes("contaminação") || rl.includes("contaminacao")) riskTypes.push("health");
        if (rl.includes("acidente") || rl.includes("trânsito") || rl.includes("transito")) riskTypes.push("traffic");
        if (rl.includes("tóxic") || rl.includes("toxic") || rl.includes("cheiro") || rl.includes("fedor") || rl.includes("fumaça") || rl.includes("fumaca") || rl.includes("odor") || rl.includes("poluição") || rl.includes("poluicao")) riskTypes.push("health");
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (lowKeywords.some((k) => rl.includes(k))) {
        result.risk_level = "low";
      }

      if (!result.risk_level) {
        const inferred = deps.autoInferRisk(response);
        if (inferred.risk_level != null && inferred.confidence >= 0.45) {
          result.risk_level = inferred.risk_level;
          if (inferred.risk_types?.length) result.risk_types = inferred.risk_types;
          result.urgency_reason = response;
        } else {
          const t = response.trim();
          const vague = /^(não sei|nao sei|sem ideia|não\s*opino|nao\s*opino)\b/i.test(t);
          const looksDescriptive = t.length >= 10 && /\s/.test(t);
          const looksLikeFlowToken = /^(confirmar|corrigir|continuar|registrar|novo_relato|ok|obrigad)/i.test(t);
          if (looksDescriptive && !vague && !/^(não|nao|n|no)\b/i.test(t) && !looksLikeFlowToken) {
            result.risk_level = "low";
            result.urgency_reason = response;
          }
        }
      }

      if (result.risk_level) {
        result.urgency_reason = response;
      }
      break;
    }

    case "affected_scope": {
      const normalized = responseLower
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

      const neighborhoodRegex =
        /\b(bairro|regiao|regiao\s+toda|varias\s+ruas|comunidade|vila|condominio\s+todo|conjunto\s+habitacional|todo\s+o\s+bairro|bairro\s+inteiro|bairro\s+todo)\b/i;
      const streetRegex =
        /\b(rua\s+toda|toda\s+a?\s*rua|rua\s+inteira|toda\s+rua|vizinhos|os?\s+vizinhos|quarteirao|minha\s+rua|nossa\s+rua|a\s+rua|predio\s+todo|condominio|quadra)\b/i;
      const individualRegex =
        /\b(so\s+eu|somente\s+eu|apenas\s+eu|so\s+a\s+mim|apenas\s+a\s+mim|somente\s+a\s+mim|a\s+mim|para\s+mim|pra\s+mim|so\s+comigo|comigo|so\s+minha?|minha\s+casa|na\s+minha\s+casa|minha\s+residencia|meu\s+apartamento|meu\s+apto|meu\s+predio|na\s+minha\s+familia|so\s+a\s+minha\s+familia)\b/i;

      if (neighborhoodRegex.test(normalized)) {
        result.affected_scope = "neighborhood";
      } else if (streetRegex.test(normalized)) {
        result.affected_scope = "street";
      } else if (individualRegex.test(normalized)) {
        result.affected_scope = "individual";
      }
      break;
    }

    case "active_consequences": {
      const consequences: string[] = [];
      if (responseLower.includes("luz") || responseLower.includes("apagão") || responseLower.includes("energia")) {
        consequences.push("power_outage");
      }
      if (responseLower.includes("água") && (responseLower.includes("falta") || responseLower.includes("sem"))) {
        consequences.push("water_outage");
      }
      if (responseLower.includes("trânsito parado") || responseLower.includes("transito parado") || responseLower.includes("não passa") || responseLower.includes("via bloqueada")) {
        consequences.push("traffic_blocked");
      }
      if (responseLower.includes("alagando") || responseLower.includes("inundando") || responseLower.includes("alagado") || responseLower.includes("inundado")) {
        consequences.push("flooding");
      }
      if (responseLower.includes("doença") || responseLower.includes("saúde") || responseLower.includes("contamin")) {
        consequences.push("health_hazard");
      }
      if (consequences.length > 0) {
        result.active_consequences = consequences;
      }
      break;
    }

    case "description": {
      if (deps.isTransportLinePickerPayload(response)) {
        break;
      }
      if (deps.isValidDomainDescription(response, "urban")) {
        result.description = response;
        console.log("[parseFieldResponse] Description accepted via isValidDomainDescription:", {
          length: response.length,
          preview: response.substring(0, 50),
        });

        const autoClass = deps.autoClassifyCategory(response);
        if (autoClass.category && autoClass.confidence >= 0.7) {
          result._suggested_category = autoClass.category;
          result._classification_confidence = autoClass.confidence;
          console.log("[parseFieldResponse] Suggested category from description:", autoClass.category);
        }
      }
      break;
    }

    default:
      return null;
  }

  return result;
}
