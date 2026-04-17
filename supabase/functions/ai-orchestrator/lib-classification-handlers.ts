type ToolResult = { success: boolean; message: string; data?: unknown };

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

const TRANSPORT_TYPE_LABELS: Record<string, string> = {
  atraso: "Atraso",
  lotacao: "Lotação",
  seguranca: "Segurança",
  acessibilidade: "Acessibilidade",
  limpeza: "Limpeza",
  conducao: "Condução",
  outro: "Outro",
};

export function handleClassifyReportCategory(
  args: Record<string, unknown>,
  validUrbanCategories: readonly string[],
): ToolResult {
  const category = String(args.category ?? "");
  if (!(validUrbanCategories as readonly string[]).includes(category)) {
    console.error("[classify_report_category] Invalid category:", args.category);
    return {
      success: false,
      message: `Categoria inválida. Categorias válidas: ${validUrbanCategories.join(", ")}`,
    };
  }

  console.log("[classify_report_category] Classification:", {
    category,
    confidence: args.confidence,
    reasoning: args.reasoning,
    user_confirmed: args.user_confirmed,
    alternatives: args.alternative_categories,
  });

  const categoryLabel = URBAN_CATEGORY_LABELS[category] || category;
  const categoryConfidence =
    typeof args.confidence === "number" ? args.confidence : Number(args.confidence);
  const categoryConfidenceValue = Number.isFinite(categoryConfidence) ? categoryConfidence : 0;

  if (categoryConfidenceValue < 0.8 && !args.user_confirmed && Array.isArray(args.alternative_categories) && args.alternative_categories.length) {
    const alternatives = args.alternative_categories
      .map((cat: unknown) => URBAN_CATEGORY_LABELS[String(cat)] || String(cat))
      .join(", ");

    return {
      success: true,
      message: `Não tenho certeza da categoria. É mais um problema de **${categoryLabel}** ou de **${alternatives}**?`,
      data: {
        category,
        confidence: args.confidence,
        user_confirmed: false,
        needs_confirmation: true,
      },
    };
  }

  const progressData = {
    category,
    category_confidence: args.confidence,
    category_user_confirmed: args.user_confirmed,
  };
  const progressMarker = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(progressData)}]`;
  const confirmationText = args.user_confirmed
    ? `Entendido, **${categoryLabel}**.`
    : `Certo, é um problema de **${categoryLabel}**.`;

  return {
    success: true,
    message: `${progressMarker}${confirmationText}\n\nQual o **CEP** do local?\n\n_Se não souber, me diz a rua e bairro._`,
    data: {
      category,
      confidence: args.confidence,
      user_confirmed: args.user_confirmed,
    },
  };
}

export function handleClassifyTransportType(args: Record<string, unknown>): ToolResult {
  const validTransportTypes = ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "conducao", "outro"];
  const reportType = String(args.report_type ?? "");
  if (!(validTransportTypes as readonly string[]).includes(reportType)) {
    return {
      success: false,
      message: `Tipo inválido. Tipos válidos: ${validTransportTypes.join(", ")}`,
    };
  }

  console.log("[classify_transport_type] Classification:", {
    report_type: reportType,
    subcategory_label: args.subcategory_label,
    confidence: args.confidence,
    reasoning: args.reasoning,
    user_confirmed: args.user_confirmed,
    alternatives: args.alternative_types,
  });

  const typeLabel = TRANSPORT_TYPE_LABELS[reportType] || reportType;
  const confidence = typeof args.confidence === "number" ? args.confidence : Number(args.confidence);
  const confidenceValue = Number.isFinite(confidence) ? confidence : 0;

  if (confidenceValue < 0.8 && !args.user_confirmed && Array.isArray(args.alternative_types) && args.alternative_types.length) {
    const alternatives = args.alternative_types
      .map((value: unknown) => TRANSPORT_TYPE_LABELS[String(value)] || String(value))
      .join(", ");

    return {
      success: true,
      message: `Não tenho certeza do tipo. É mais um problema de **${typeLabel}** ou de **${alternatives}**?`,
      data: {
        report_type: reportType,
        subcategory_label: args.subcategory_label,
        confidence: args.confidence,
        user_confirmed: false,
        needs_confirmation: true,
      },
    };
  }

  const progressData = {
    report_type: reportType,
    subcategory_label: args.subcategory_label,
    type_confidence: args.confidence,
    type_user_confirmed: args.user_confirmed,
  };
  const progressMarker = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(progressData)}]`;
  const confirmationText = args.user_confirmed
    ? `Entendido, **${typeLabel}**.`
    : `Certo, é um problema de **${typeLabel}**.`;

  return {
    success: true,
    message: `${progressMarker}${confirmationText}\n\n**Qual linha ou estação** teve o problema?`,
    data: {
      report_type: reportType,
      subcategory_label: args.subcategory_label,
      confidence: args.confidence,
      user_confirmed: args.user_confirmed,
    },
  };
}
