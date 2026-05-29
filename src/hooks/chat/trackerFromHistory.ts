import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import { parseTransportReportPreviewJson } from "@/lib/parseTransportReportPreview";
import type { CreatedReport } from "@/hooks/chat/types";

export interface HistoryTrackerRestore {
  createdReport: CreatedReport | null;
  collectionType: CollectionType | null;
  collectedFields: CollectedFields;
}

/** Reconstrói tracker a partir de marcadores em mensagens salvas (navegação ida/volta). */
export function restoreTrackerFromSavedMessages(
  savedMessages: Array<Record<string, unknown>>,
): HistoryTrackerRestore | null {
  for (const msg of savedMessages) {
    const text = typeof msg.content === "string" ? msg.content : "";
    const urban = restoreUrbanFromHistory(text);
    if (urban) return urban;
    const transport = restoreTransportFromHistory(text);
    if (transport) return transport;
    const rating = restoreRatingFromHistory(text);
    if (rating) return rating;
  }
  return null;
}

function restoreUrbanFromHistory(text: string): HistoryTrackerRestore | null {
  const urbanMatch = text.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
  if (!urbanMatch) return null;

  const reconstructedFields: CollectedFields = {};
  const catMatch = text.match(/Categoria:[*]?[*]?\s*([^\n•*]+)/i);
  if (catMatch) {
    reconstructedFields.category = catMatch[1].trim().toLowerCase().replace(/\s+/g, "_");
  }
  const descMatch = text.match(/Descrição:[*]?[*]?\s*([^\n•*]+)/i);
  if (descMatch) reconstructedFields.description = descMatch[1].trim();
  const ruaMatch = text.match(/Rua:[*]?[*]?\s*([^\n•*]+)/i);
  if (ruaMatch) reconstructedFields.street = ruaMatch[1].trim();
  const bairroMatch = text.match(/Bairro:[*]?[*]?\s*([^\n•*]+)/i);
  if (bairroMatch) reconstructedFields.neighborhood = bairroMatch[1].trim();
  const cepMatch = text.match(/CEP:[*]?[*]?\s*(\d{5}-?\d{3})/i);
  if (cepMatch) reconstructedFields.cep = cepMatch[1].replace("-", "");
  const numMatch = text.match(/Número:[*]?[*]?\s*([^\n•*]+)/i);
  if (numMatch) reconstructedFields.street_number = numMatch[1].trim();
  const riskMatch = text.match(/Nível de risco:[*]?[*]?\s*(\w+)/i);
  if (riskMatch) {
    const riskMap: Record<string, string> = {
      crítico: "critical",
      critico: "critical",
      moderado: "moderate",
      baixo: "low",
      nenhum: "none",
    };
    reconstructedFields.risk_level = riskMap[riskMatch[1].toLowerCase()] || riskMatch[1];
  }
  const scopeMatch = text.match(/Escopo[^:]*:[*]?[*]?\s*([^\n•*]+)/i);
  if (scopeMatch) {
    const scopeMap: Record<string, string> = {
      "bairro todo": "neighborhood",
      bairro: "neighborhood",
      "rua toda": "street",
      rua: "street",
      "apenas eu": "individual",
      zona: "zone",
      cidade: "city",
    };
    const scopeKey = scopeMatch[1].toLowerCase().trim();
    reconstructedFields.affected_scope = scopeMap[scopeKey] || scopeKey;
  }

  return {
    createdReport: { type: "urban_report", id: urbanMatch[1] },
    collectionType: "urban_report",
    collectedFields: reconstructedFields,
  };
}

function restoreTransportFromHistory(text: string): HistoryTrackerRestore | null {
  const transportMatch = text.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
  if (!transportMatch) return null;

  const reconstructedFields: CollectedFields = {};
  const tipoMatch = text.match(/Tipo:[*]?[*]?\s*([^\n•*]+)/i);
  if (tipoMatch) reconstructedFields.report_type = tipoMatch[1].trim();
  const linhaMatch = text.match(/Linha:[*]?[*]?\s*([^\n•*]+)/i);
  if (linhaMatch) reconstructedFields.line_code = linhaMatch[1].trim();
  const dataMatch = text.match(/Data:[*]?[*]?\s*([^\n•*]+)/i);
  if (dataMatch) reconstructedFields.occurrence_date = dataMatch[1].trim();
  const horaMatch = text.match(/Horário:[*]?[*]?\s*([^\n•*]+)/i);
  if (horaMatch) reconstructedFields.occurrence_time = horaMatch[1].trim();
  const directionMatch = text.match(/Sentido:[*]?[*]?\s*([^\n•*]+)/i);
  if (directionMatch) reconstructedFields.direction = directionMatch[1].trim().toLowerCase();
  const recurrenceMatch = text.match(/Frequência:[*]?[*]?\s*([^\n•*]+)/i);
  if (recurrenceMatch) {
    const recurrenceRaw = recurrenceMatch[1].trim().toLowerCase();
    if (recurrenceRaw.includes("primeira vez")) reconstructedFields.recurrence_frequency = "primeira_vez";
    else if (recurrenceRaw.includes("algumas vezes"))
      reconstructedFields.recurrence_frequency = "algumas_vezes_mes";
    else if (recurrenceRaw.includes("toda semana"))
      reconstructedFields.recurrence_frequency = "toda_semana";
    else if (recurrenceRaw.includes("todos os dias"))
      reconstructedFields.recurrence_frequency = "todos_os_dias";
  }
  const descMatch = text.match(/Descrição:[*]?[*]?\s*([^\n•*]+)/i);
  if (descMatch) reconstructedFields.description = descMatch[1].trim();
  const sevMatch = text.match(/Gravidade:[*]?[*]?\s*(\w+)/i);
  if (sevMatch) {
    const sevMap: Record<string, string> = {
      alta: "high",
      crítica: "critical",
      critica: "critical",
      média: "medium",
      media: "medium",
      moderada: "moderate",
      baixa: "low",
    };
    reconstructedFields.severity = sevMap[sevMatch[1].toLowerCase()] || sevMatch[1];
  }
  const localMatch = text.match(/Local:[*]?[*]?\s*([^\n•*]+)/i);
  if (localMatch) reconstructedFields.location = localMatch[1].trim();
  const transportPreview = parseTransportReportPreviewJson(text);
  if (transportPreview?.personal_impact != null) {
    reconstructedFields.personal_impact = transportPreview.personal_impact;
  }

  return {
    createdReport: { type: "transport", id: transportMatch[1] },
    collectionType: "transport_report",
    collectedFields: reconstructedFields,
  };
}

function restoreRatingFromHistory(text: string): HistoryTrackerRestore | null {
  const ratingMatch = text.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
  if (!ratingMatch) return null;

  const reconstructedFields: CollectedFields = {};
  const tipoMatch = text.match(/Tipo:[*]?[*]?\s*([^\n•*]+)/i);
  if (tipoMatch) {
    const typeMap: Record<string, string> = {
      ubs: "ubs",
      "posto de saúde": "ubs",
      "unidade básica": "ubs",
      escola: "school",
      emef: "school",
      emei: "school",
      ceu: "ceu",
      hospital: "hospital",
      biblioteca: "library",
      "centro esportivo": "sports_center",
    };
    const typeKey = tipoMatch[1].toLowerCase().trim();
    reconstructedFields.service_type = typeMap[typeKey] || tipoMatch[1].trim();
  }
  const nomeMatch = text.match(/Serviço:[*]?[*]?\s*([^\n•*]+)/i);
  if (nomeMatch) reconstructedFields.service_name = nomeMatch[1].trim();
  const bairroMatch = text.match(/Bairro:[*]?[*]?\s*([^\n•*]+)/i);
  if (bairroMatch) reconstructedFields.service_neighborhood = bairroMatch[1].trim();
  const notaMatch = text.match(/Nota:[*]?[*]?\s*(\d)/i);
  if (notaMatch) reconstructedFields.rating_stars = parseInt(notaMatch[1], 10);
  const comentarioMatch = text.match(/Comentário:[*]?[*]?\s*([^\n•*]+)/i);
  if (comentarioMatch) reconstructedFields.rating_text = comentarioMatch[1].trim();

  return {
    createdReport: { type: "rating", id: ratingMatch[1] },
    collectionType: "service_rating",
    collectedFields: reconstructedFields,
  };
}
