type ToolResult = { success: boolean; message: string; data?: unknown };

export function handleDetectUserIntent(args: Record<string, unknown>): ToolResult {
  const {
    intent,
    confidence,
    reasoning,
    suggested_alternatives,
    urban_category,
    transport_type,
    extracted_description,
    category_confidence,
  } = args;

  const intentKey = String(intent ?? "");
  const confParsed = Number(confidence);
  const confidenceScore = Number.isFinite(confParsed) ? confParsed : 0;
  const catConfParsed = Number(category_confidence);
  const categoryConfidenceScore = Number.isFinite(catConfParsed) ? catConfParsed : 0;
  const extractedDescStr = String(extracted_description ?? "");
  const suggestedAlts = Array.isArray(suggested_alternatives)
    ? (suggested_alternatives as unknown[]).map((alternative) => String(alternative))
    : [];

  console.log("[detect_user_intent] Intent:", intentKey, "Confidence:", confidenceScore);
  console.log("[detect_user_intent] Reasoning:", reasoning);
  console.log("[detect_user_intent] Extracted - Category:", urban_category, "Type:", transport_type, "Description:", extracted_description);

  const intentToCollection: Record<string, string | null> = {
    urban_report: "urban_report",
    transport_report: "transport_report",
    service_rating: "service_rating",
    services: null,
    general: null,
    unknown: null,
  };

  const collectionType = intentToCollection[intentKey];

  const categoryLabels: Record<string, string> = {
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

  const intentNames: Record<string, string> = {
    urban_report: "Relato Urbano",
    transport_report: "Diagnóstico de Transporte",
    service_rating: "Avaliação de Serviço",
    services: "Busca de Serviços",
    general: "Dúvidas Gerais",
  };

  if (confidenceScore >= 0.8 && collectionType) {
    const progressData: Record<string, unknown> = {};

    if (intentKey === "urban_report") {
      if (urban_category && categoryConfidenceScore >= 0.8) {
        progressData.category = urban_category;
        progressData.category_confidence = category_confidence;
      }
      if (extractedDescStr.length >= 30) {
        progressData.description = extractedDescStr;
      }
    } else if (intentKey === "transport_report") {
      if (transport_type && transport_type !== "outro" && categoryConfidenceScore >= 0.8) {
        progressData.report_type = transport_type;
      }
      const genericPhrases = ["problema no transporte", "reclamar do transporte", "problema com onibus", "problema com ônibus"];
      const isGeneric = genericPhrases.some((phrase) => extractedDescStr.toLowerCase().includes(phrase));
      if (extractedDescStr.length >= 30 && !isGeneric) {
        progressData.description = extractedDescStr;
      }
    }

    const progressMarker = `[COLLECTION_PROGRESS:${collectionType}:${JSON.stringify(progressData)}]`;
    let naturalResponse = "";

    switch (intentKey) {
      case "urban_report":
        if (urban_category && categoryConfidenceScore >= 0.8) {
          const catLabel = categoryLabels[String(urban_category)] || String(urban_category);
          naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema de **${catLabel}**. Para localizar o local exato, qual o **CEP**?\n\n_Se não souber, me diz a rua e bairro._`;
        } else {
          naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema. Para localizar o local exato, qual o **CEP**?\n\n_Se não souber, me diz a rua e bairro._`;
        }
        break;
      case "transport_report":
        if (transport_type && transport_type !== "outro" && categoryConfidenceScore >= 0.8) {
          const typeLabels: Record<string, string> = {
            atraso: "Atraso",
            lotacao: "Lotação",
            seguranca: "Segurança",
            acessibilidade: "Acessibilidade",
            limpeza: "Limpeza",
          };
          const typeLabel = typeLabels[String(transport_type)] || String(transport_type);
          naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema de **${typeLabel}** no transporte. Qual **linha ou estação** teve o problema?`;
        } else {
          naturalResponse = `${progressMarker}Entendi! Vou registrar o problema no transporte.\n\n**O que aconteceu?** Me conta o problema.`;
        }
        break;
      case "service_rating":
        naturalResponse = `${progressMarker}Entendi! Vou registrar sua avaliação. Qual **tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU...)`;
        break;
      default:
        naturalResponse = `${progressMarker}Entendi! Como posso ajudar?`;
    }

    return {
      success: true,
      message: naturalResponse,
      data: {
        status: "activated",
        journey: intentKey,
        collection_type: collectionType,
        confidence: confidenceScore,
        extracted_data: progressData,
      },
    };
  }

  if (confidenceScore < 0.8 && collectionType) {
    const alternativesList = suggestedAlts
      .map((alternative) => intentNames[alternative] || alternative)
      .slice(0, 2)
      .join(" ou ");

    return {
      success: true,
      message: `Isso é um problema para **${intentNames[intentKey] || intentKey}** ou ${alternativesList}? Me ajuda a entender melhor.`,
      data: {
        status: "needs_confirmation",
        detected: intentKey,
        alternatives: suggestedAlts,
        confidence: confidenceScore,
      },
    };
  }

  return {
    success: true,
    message: "Claro! Como posso ajudar?",
    data: {
      status: "light_journey",
      intent: intentKey,
    },
  };
}

export function handleConfirmJourneySwitch(args: Record<string, unknown>): ToolResult {
  const { current_journey, detected_journey, current_progress_summary } = args;

  const currentKey = String(current_journey ?? "");
  const detectedKey = String(detected_journey ?? "");

  console.log("[confirm_journey_switch] Current:", currentKey, "Detected:", detectedKey);
  console.log("[confirm_journey_switch] Progress summary:", current_progress_summary);

  const journeyNames: Record<string, string> = {
    urban_report: "Relato Urbano",
    transport_report: "Diagnóstico de Transporte",
    service_rating: "Avaliação de Serviço",
    services: "Busca de Serviços",
    audiencias: "Audiências Públicas",
    history: "Meu Histórico",
    general: "Dúvidas Gerais",
    vereadores: "Vereadores da Região",
    noticias: "Notícias Legislativas",
    chamber_feedback: "Feedback sobre Vereador",
  };

  const currentName = journeyNames[currentKey] || currentKey;
  const detectedName = journeyNames[detectedKey] || detectedKey;
  const switchMarker = `[JOURNEY_SWITCH_PROMPT:${detectedKey}:${currentKey}]`;

  return {
    success: true,
    message: `Percebi que você quer falar sobre **${detectedName}**, mas ainda não terminamos seu **${currentName}**${current_progress_summary ? ` (${current_progress_summary})` : ""}. O que prefere fazer?\n\n${switchMarker}`,
    data: {
      status: "switch_pending",
      current: currentKey,
      current_name: currentName,
      detected: detectedKey,
      detected_name: detectedName,
      progress: current_progress_summary,
    },
  };
}
