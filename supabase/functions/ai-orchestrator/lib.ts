import { inferServiceTypeFromText } from "./lib-service-discovery.ts";
import { resolveAllowedOrigin } from "../_shared/cors.ts";
import {
  applyUrbanNatureCategoryDefaults,
  extractUrbanFields,
  isBareUrbanReportNatureReply,
  buildUrbanNonComplaintLlmInstruction,
  isUrbanDuvidaReadyForAnswer,
  isUrbanNonComplaintReadyForLlmTurn,
  normalizeReportNature,
  urbanNatureSkipsLocationCollection,
  urbanNonComplaintLlmStatusLine,
} from "./lib-urban-rules.ts";
import {
  applyCompleteRatingDimensionsToAccumulated,
  parseRatingDimensionsMarker,
} from "./lib-service-rating.ts";
import {
  generateTransportLabelFromDescription,
} from "./lib-transport-preview.ts";
import {
  generateLabelFromDescription,
} from "./lib-classification-feedback.ts";
import {
  isTransportLinePickerPayload,
} from "./lib-transport-helpers.ts";
import {
  applyServiceRatingHistoryParsing,
} from "./lib-service-rating-history.ts";
import { normalizeServiceRatingNeighborhood } from "./lib-service-rating-utils.ts";
import {
  applyCollectionProgressMarkers,
  getHistoryMessageText,
  getLastFieldRequestType,
} from "./lib-history-utils.ts";
import {
  applySelectedAddressFieldsFromHistory,
  detectLatestDomainDescriptionFromHistory,
} from "./lib-history-address-and-description.ts";
import { accumulateServiceSearchFieldsFromHistory } from "./lib-services-history.ts";
import { applyTransportHistoryParsing } from "./lib-transport-history.ts";
import { applyUrbanHistoryParsing } from "./lib-urban-history.ts";
import { parseFieldResponse } from "./lib-field-response.ts";
import {
  detectCollectionIntent as detectCollectionIntentFacade,
} from "./lib-detect-collection-intent.ts";
import type { CollectionIntent } from "./lib-intent-detection.ts";
import {
  extractTransportFields,
  parseAccessibilityDetailsMarker,
} from "./lib-transport-helpers.ts";
import {
  hasTransportKeywords,
  isGenericIntentText,
  isSubstantiveUrbanNatureDescription,
  isValidDomainDescription,
  isValidUrbanReportDescription,
  normalizeTextForMatching,
} from "./lib-nlp-utils.ts";

export {
  SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE,
  isPastVisitRating48hDeadline,
  isVisitRatingWindowClosed,
} from "../_shared/service-visit-rating-deadline.ts";
export { formatAudienciaStatus, localParaZona, searchAudiencias } from "./lib-audiencias-search.ts";
export { cleanServiceAddress } from "./lib-service-address-format.ts";
export {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromAddresses,
  fetchGoogleDirectionsTransit,
  findNearbyServices,
  formatServicesWithContext,
  getServiceAddressByName,
  getServiceTypeName,
  inferServiceTypeFromText,
} from "./lib-service-discovery.ts";
export {
  fetchVereadorRecords,
  getCitizenHistory,
  getServiceOccupancyStatusByName,
  getServiceOccupancyStatusByServiceId,
  getUltimasNoticias,
  isCamaraFuncionamentoInternoQuery,
  extractUrbanDuvidaSearchTerms,
  isUrbanDuvidaKbResultRelevant,
  searchKnowledgeBase,
  searchKnowledgeBaseForUrbanDuvida,
  suggestCouncilMember,
} from "./lib-citizen-support.ts";
export {
  fetchNearestUrbanReportsForSimilarity,
  fetchSimilarTransportReportsForSupport,
  geocodeAddressToCoord,
  geocodeAddressWithGoogle,
  lookupCEP,
  resolveUrbanCoordsForSimilarSearch,
  reverseGeocodeLatLon,
} from "./lib-location-and-similarity.ts";
export {
  createDynamicCategory,
  detectEmergingCategory,
  extractCategoryKeywords,
  generateIntelligentLabel,
  generateLabelFromDescription,
  getClassificationFromFeedback,
  inferTransportClassificationSource,
  inferUrbanClassificationSource,
  insertClassificationPredictionLog,
  logCategoryUsage,
  mapLabelToCategory,
  tryPatternBasedLabel,
} from "./lib-classification-feedback.ts";
export {
  PROXIMITY_RADIUS_METERS,
  REPORT_NATURE_LABELS,
  URBAN_REPORT_NATURE_VALUES,
  URBAN_RISK_COLLECTION_CATEGORIES,
  VALID_URBAN_CATEGORIES,
  adjustSeverityForProximityToSensitiveEquipment,
  autoClassifyCategory,
  autoInferRisk,
  classifiedCategories,
  extractUrbanFields,
  formatUrbanReportPreviewAfterCategory,
  formatUrbanReportPreviewAfterDescription,
  insertReportSeverityAuditLog,
  applyUrbanNatureCategoryDefaults,
  isBareUrbanReportNatureReply,
  buildUrbanNonComplaintLlmInstruction,
  isUrbanDuvidaReadyForAnswer,
  isUrbanNonComplaintReadyForLlmTurn,
  mapUrbanRiskLevelToSeverity,
  messageLooksLikeUrbanIncidentStarter,
  normalizeReportNature,
  urbanNatureSkipsLocationCollection,
  urbanNonComplaintLlmStatusLine,
} from "./lib-urban-rules.ts";
export type { UrbanReportNature } from "./lib-urban-rules.ts";
export type { CitizenLearningProfile } from "./lib-citizen-learning.ts";
export {
  getPersonalizedPromptAdditions,
  learnFromConversation,
  loadCitizenProfile,
} from "./lib-citizen-learning.ts";
export {
  POLITICIAN_EVALUATION_BLOCKED_MESSAGE,
  STRUCTURED_JOURNEY_TYPES,
  detectExistingJourney,
  getToolHintForIntent,
  INTENT_KEYWORDS,
  isBusInformationalQuery,
  isGeneralKnowledgeOutOfScope,
  isInformationalQuestionAboutAudience,
  isInformationalQuestionAboutBuscarAudiencia,
  isInformationalQuestionAboutContact,
  isInformationalQuestionAboutProjetosTramitacao,
  isInformationalQuestionAboutVereadorOrCamara,
  isOutOfScopeQuestion,
  isPoliticianPerformanceEvaluationQuestion,
  isQuestionAboutProximasOuQuaisAudiencias,
} from "./lib-intent-detection.ts";
export type { CollectionIntent, DetectionScore } from "./lib-intent-detection.ts";
export {
  COUNCIL_MEMBERS,
  extractChamberFields,
  findCouncilMemberMatches,
  isChamberIntentOrSelectionText,
} from "./lib-chamber-feedback.ts";
import { isChamberIntentOrSelectionText as isChamberIntentOrSelectionTextImpl } from "./lib-chamber-feedback.ts";
export {
  MESSAGE_OUTSIDE_SAO_PAULO,
  SAO_PAULO_TRANSPORT_MAP_BOUNDS,
  extractTransportFields,
  formatTransportAccessibilitySummary,
  fuzzyMatchKeyword,
  getTransportReportLatLonForBounds,
  inferTransportTypeFromText,
  isCitySaoPaulo,
  isPointInSaoPauloBounds,
  isTransportLinePickerPayload,
  levenshteinDistance,
  normalizeForMatching,
  normalizeTransportAccessibilityDetails,
  parseAccessibilityDetailsMarker,
} from "./lib-transport-helpers.ts";
export {
  extractImplicitData,
  hasTransportKeywords,
  isAffirmativeResponse,
  isGenericIntentText,
  isNegativeResponse,
  isSubstantiveUrbanNatureDescription,
  isValidDomainDescription,
  isValidUrbanReportDescription,
  normalizeTextForMatching,
} from "./lib-nlp-utils.ts";
export {
  olhoVivoGetStopsByLine,
  olhoVivoPrevisao,
  olhoVivoPrevisaoParada,
  olhoVivoSearchLines,
  olhoVivoSearchStops,
} from "./lib-olho-vivo.ts";
export {
  SERVICE_RATING_DEDUP_TZ,
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DUPLICATE_DAY_MESSAGE,
  aggregateRatingDimensionsStars,
  applyCompleteRatingDimensionsToAccumulated,
  buildServiceRatingDimensionsFromWizardScores,
  buildServiceRatingBairroPrompt,
  buildServiceRatingDimensionsPrompt,
  fetchServiceTypeRatingQuestionHints,
  getServiceRatingNounPt,
  getZonedDayUtcBoundsISO,
  inferServiceRatingSentimentFromMean,
  inferServiceRatingNeighborhoodFromCompositeName,
  isCompleteServiceRatingDimensions,
  isServiceRatingTypeOnlyEquipmentName,
  normalizeGenericServiceRatingName,
  parseRatingDimensionsMarker,
  shouldOfferServiceRatingReferral,
} from "./lib-service-rating.ts";
export { normalizeServiceRatingNeighborhood } from "./lib-service-rating-utils.ts";
export { normalizeTransportRecurrenceFrequency, parseFlexibleOccurrenceTime } from "./lib-transport-parsing.ts";
export {
  TRANSPORT_SEVERITY_ORDER,
  applyPersonalImpactToSeverity,
} from "./lib-transport-severity.ts";
export {
  TRANSPORT_SUBCATEGORIES,
  getTransportSubcategoryLabel,
  isValidTransportSubcategory,
  normalizeTransportSubcategory,
} from "./lib-transport-subcategories.ts";
export {
  formatTransportPreviewTypeLine,
  generateTransportLabelFromDescription,
  getTransportTypeLabel,
} from "./lib-transport-preview.ts";
export { parseFieldResponse } from "./lib-field-response.ts";
export {
  analyzeConversationTone,
  buildConversationToneInstruction,
} from "./lib-conversation-tone.ts";

// Valor inicial; sobrescrito por request via Object.assign(lib.corsHeaders, buildCorsHeaders(origin)) no index.ts.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': resolveAllowedOrigin(null),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Commission to themes mapping for council member suggestions
const COMMISSION_THEMES: Record<string, string[]> = {
  'transporte': ['atraso', 'lotacao', 'superlotacao', 'onibus', 'metro', 'trem', 'mobilidade', 'transito'],
  'urbanismo': ['buraco', 'calcada', 'iluminacao', 'praca', 'lixo', 'entulho', 'poda', 'arvore', 'infraestrutura'],
  'saude': ['ubs', 'hospital', 'posto', 'saude', 'medico', 'atendimento'],
  'educacao': ['escola', 'creche', 'ceu', 'educacao', 'ensino'],
  'meio_ambiente': ['poluicao', 'rio', 'corrego', 'desmatamento', 'verde', 'parque', 'ambiental'],
  'seguranca': ['seguranca', 'policia', 'violencia', 'assalto', 'roubo'],
  'habitacao': ['moradia', 'habitacao', 'ocupacao', 'favela', 'desabrigado'],
  'assistencia_social': ['social', 'vulnerabilidade', 'morador_rua', 'fome', 'abrigo'],
};

// Parse user response for specific field types
// Accumulate fields from all messages in conversation for better tracking
export function accumulateFieldsFromHistory(
  messages: Array<{ role: string; content: string }>,
  collectionType: 'urban_report' | 'transport_report' | 'service_rating' | 'services' | 'audiencias' | 'general' | 'history' | 'occupancy' | 'vereadores' | 'noticias'
): Record<string, unknown> {
  // === LIGHT JOURNEY: services (busca de serviços próximos) ===
  // Ordem: 1) location_method (GPS / cadastrado / manual), 2) se manual → CEP/endereço, 3) service_type
  if (collectionType === 'services') {
    return accumulateServiceSearchFieldsFromHistory(messages, { inferServiceTypeFromText });
  }

  // Only accumulate for structured journeys
  if (!['urban_report', 'transport_report', 'service_rating'].includes(collectionType)) {
    return {};
  }
  const structuredCollectionType = collectionType as 'urban_report' | 'transport_report' | 'service_rating';
  const accumulated: Record<string, unknown> = {};
  
  // Check for fields already collected via [COLLECTION_PROGRESS] markers
  applyCollectionProgressMarkers(messages, accumulated);
  
  applySelectedAddressFieldsFromHistory(messages, accumulated);
  if (accumulated.street || accumulated.neighborhood || accumulated.cep || accumulated.city) {
    console.log('[accumulateFields] Parsed Google Places address:', {
      street: accumulated.street,
      neighborhood: accumulated.neighborhood,
      cep: accumulated.cep,
      city: accumulated.city
    });
  }
  
  // === CRITICAL: Detect description using CENTRALIZED NLP FUNCTION ===
  // Uses isValidDomainDescription for flexible threshold (8+ chars with keyword)
  if (!accumulated.description) {
    const detectedDescription = detectLatestDomainDescriptionFromHistory(messages, structuredCollectionType, {
      isGenericIntentText,
      isValidDomainDescription,
      isBareUrbanReportNatureReply,
      isSubstantiveUrbanNatureDescription,
      normalizeReportNature,
    });
    if (detectedDescription) {
      accumulated.description = detectedDescription;
      const domain = structuredCollectionType === 'transport_report' ? 'transport' :
                     structuredCollectionType === 'service_rating' ? 'service' : 'urban';
      console.log('[accumulateFields] Auto-detected description via isValidDomainDescription:', {
        length: detectedDescription.length,
        domain
      });
    }
  }
  
  // For urban reports, scan ALL user messages for category and structured fields
  if (collectionType === 'urban_report') {
    applyUrbanHistoryParsing(messages, accumulated, {
      extractUrbanFields,
      getMsgText: getHistoryMessageText,
      normalizeTextForMatching,
      getLastFieldRequestType,
      parseFieldResponse,
      isValidDomainDescription,
      isBareUrbanReportNatureReply,
      generateLabelFromDescription,
      normalizeReportNature,
    });

    // Feedback à Câmara: a seleção do picker de vereador chega como
    // "Vereador(a): Nome (PARTIDO)". Esse formato é exclusivo desse fluxo, então
    // marca a jornada como feedback_camara — assim a coleta não pede CEP/endereço
    // como um relato urbano comum e o relato é criado com o vereador correto.
    let chamberSelected = false;
    for (const m of messages) {
      if (m.role !== 'user') continue;
      const sel = getHistoryMessageText(m).match(
        /vereador(?:\(a\)|a)?\s*:\s*(.+?)\s*\(([^)]+)\)/i,
      );
      if (sel) {
        chamberSelected = true;
        accumulated.category = 'feedback_camara';
        accumulated.council_member_name = sel[1].trim();
        accumulated.council_member_party = sel[2].trim();
        // O picker oficial (InlineVereadorPicker → fetch-vereadores/CMSP) é a fonte
        // de verdade da lista de vereadores. Uma seleção nesse formato é autoritativa
        // e NÃO deve ser revalidada contra a lista estática COUNCIL_MEMBERS (que é um
        // subconjunto desatualizado) — senão vereadores reais fora dela (ex.: Dheison
        // Silva) reabrem o picker em loop. Marca a origem para a coleta confiar.
        accumulated._council_member_from_picker = true;
        if (!accumulated.subcategory) {
          accumulated.subcategory = `Feedback: ${sel[1].trim()}`;
        }
      }
    }

    // A frase de intenção ("quero falar sobre um vereador") e a própria seleção do picker
    // NÃO são a descrição do feedback. Sem isso, o bot achava que já tinha a descrição e
    // pulava direto para a conclusão sem o cidadão contar o que quer reclamar/sugerir/elogiar.
    // Roda para QUALQUER feedback_camara (não só quando o vereador veio do picker), pois a
    // categoria também é definida pela classificação da intenção.
    const isChamberFeedback = chamberSelected ||
      String(accumulated.category ?? '') === 'feedback_camara';
    if (isChamberFeedback && accumulated.description != null) {
      if (isChamberIntentOrSelectionTextImpl(String(accumulated.description))) {
        delete accumulated.description;
      }
    }
  }
  
  // ========== SERVICE_RATING SPECIFIC PARSING ==========
  if (collectionType === 'service_rating') {
    applyServiceRatingHistoryParsing(messages, accumulated, {
      getMsgText: getHistoryMessageText,
      getLastFieldRequestType,
      parseRatingDimensionsMarker,
      applyCompleteRatingDimensionsToAccumulated,
    });

    // NREF004 — não perder contexto: se o cidadão já disse o tipo ("quero avaliar
    // o CEU/UBS/hospital…") antes de trocar para a avaliação, infere o service_type
    // das mensagens recentes para o fluxo NÃO re-perguntar "qual tipo de serviço?".
    if (!accumulated.service_type) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role !== 'user') continue;
        const inferred = inferServiceTypeFromText(getHistoryMessageText(messages[i]));
        if (inferred) {
          accumulated.service_type = inferred;
          break;
        }
      }
    }
  }
  
  // ========== TRANSPORT_REPORT SPECIFIC PARSING ==========
  if (collectionType === 'transport_report') {
    applyTransportHistoryParsing(messages, accumulated, {
      getMsgText: getHistoryMessageText,
      parseFieldResponse,
      extractTransportFields,
      hasTransportKeywords,
      isGenericIntentText,
      parseAccessibilityDetailsMarker,
      isTransportLinePickerPayload,
    });
  }

  if (collectionType === "service_rating" && accumulated.service_neighborhood != null) {
    accumulated.service_neighborhood = normalizeServiceRatingNeighborhood(accumulated.service_neighborhood);
  }

  return accumulated;
}

export function detectCollectionIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): CollectionIntent | null {
  return detectCollectionIntentFacade(userMessage, conversationHistory, accumulateFieldsFromHistory);
}

// Tools moved to lib-tools.ts to reduce bundle size
export { tools } from "./lib-tools.ts";


// System prompt moved to lib-prompts.ts to reduce bundle size
export { systemPrompt } from "./lib-prompts.ts";
export { executeTool } from "./lib-execute-tool.ts";
