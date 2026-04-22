import { type SupabaseClient } from "@supabase/supabase-js";
import {
  SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE,
  isVisitRatingWindowClosed,
} from "../_shared/service-visit-rating-deadline.ts";
import {
  SERVICE_RATING_DEDUP_TZ,
  SERVICE_RATING_DUPLICATE_DAY_MESSAGE,
  aggregateRatingDimensionsStars,
  buildServiceRatingDimensionsFromWizardScores,
  getZonedDayUtcBoundsISO,
  inferServiceRatingSentimentFromMean,
  isCompleteServiceRatingDimensions,
  shouldOfferServiceRatingReferral,
} from "./lib-service-rating.ts";
import { normalizeTransportRecurrenceFrequency, parseFlexibleOccurrenceTime } from "./lib-transport-parsing.ts";
import {
  getTransportSubcategoryLabel,
  isValidTransportSubcategory,
  normalizeTransportSubcategory,
} from "./lib-transport-subcategories.ts";
import {
  generateTransportLabelFromDescription,
  getTransportTypeLabel,
} from "./lib-transport-preview.ts";
import { handleCreateUrbanReport } from "./lib-create-urban-report.ts";
import { handleCreateTransportReport } from "./lib-create-transport-report.ts";
import { handleClassifyReportCategory, handleClassifyTransportType } from "./lib-classification-handlers.ts";
import { handleCreateServiceRating } from "./lib-create-service-rating.ts";
import { handleValidateCep } from "./lib-cep-handler.ts";
import {
  handleGetCitizenHistory,
  handleGetServiceOccupancyStatus,
  handleSearchKnowledgeBase,
  handleSuggestCouncilMember,
} from "./lib-basic-tool-handlers.ts";
import {
  handleFindNearbyServices,
  handleGetBusArrivalForecast,
  handleGetBusLineItinerary,
  handleGetBusStopForecastAllLines,
  handleSearchBusLines,
  handleSearchBusStops,
} from "./lib-transit-and-nearby-handlers.ts";
import {
  handleSearchAudiencias,
  handleSubscribeAudienciaTopicAlert,
  handleSubscribeService,
  handleSubscribeTransportLine,
} from "./lib-subscription-and-audiencia-handlers.ts";
import { searchAudiencias as searchAudienciasHelper } from "./lib-audiencias-search.ts";
import { findNearbyServices } from "./lib-service-discovery.ts";
import {
  getCitizenHistory,
  getServiceOccupancyStatusByName,
  getServiceOccupancyStatusByServiceId,
  searchKnowledgeBase,
  suggestCouncilMember,
} from "./lib-citizen-support.ts";
import {
  geocodeAddressToCoord,
  geocodeAddressWithGoogle,
  lookupCEP,
  reverseGeocodeLatLon,
} from "./lib-location-and-similarity.ts";
import {
  detectEmergingCategory,
  inferTransportClassificationSource,
  inferUrbanClassificationSource,
  insertClassificationPredictionLog,
} from "./lib-classification-feedback.ts";
import {
  PROXIMITY_RADIUS_METERS,
  URBAN_RISK_COLLECTION_CATEGORIES,
  VALID_URBAN_CATEGORIES,
  adjustSeverityForProximityToSensitiveEquipment,
  autoInferRisk,
  insertReportSeverityAuditLog,
  mapUrbanRiskLevelToSeverity,
  normalizeReportNature,
} from "./lib-urban-rules.ts";
import {
  olhoVivoGetStopsByLine,
  olhoVivoPrevisao,
  olhoVivoPrevisaoParada,
  olhoVivoSearchLines,
  olhoVivoSearchStops,
} from "./lib-olho-vivo.ts";
import {
  handleConfirmJourneySwitch,
  handleDetectUserIntent,
} from "./lib-journey-handlers.ts";
import {
  MESSAGE_OUTSIDE_SAO_PAULO,
  formatTransportAccessibilitySummary,
  getTransportReportLatLonForBounds,
  isCitySaoPaulo,
  isPointInSaoPauloBounds,
  isTransportLinePickerPayload,
  normalizeTransportAccessibilityDetails,
} from "./lib-transport-helpers.ts";
import { isValidDomainDescription } from "./lib-nlp-utils.ts";
import {
  TRANSPORT_SEVERITY_ORDER,
  applyPersonalImpactToSeverity,
} from "./lib-transport-severity.ts";

type ToolResult = { success: boolean; message: string; data?: unknown };

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
  accumulatedFields?: Record<string, unknown>,
): Promise<ToolResult> {
  console.log(`[executeTool] Executing ${name} with args:`, JSON.stringify(args));
  console.log(`[executeTool] Accumulated fields:`, JSON.stringify(accumulatedFields || {}));

  try {
    switch (name) {
      case "classify_report_category":
        return handleClassifyReportCategory(args, VALID_URBAN_CATEGORIES);

      case "classify_transport_type":
        return handleClassifyTransportType(args);

      case "validate_cep":
        return await handleValidateCep(args, {
          lookupCEP,
          isCitySaoPaulo,
          messageOutsideSaoPaulo: MESSAGE_OUTSIDE_SAO_PAULO,
        });

      case "create_urban_report":
        return await handleCreateUrbanReport(args, userId, supabase, accumulatedFields, {
          validUrbanCategories: VALID_URBAN_CATEGORIES,
          urbanRiskCollectionCategories: URBAN_RISK_COLLECTION_CATEGORIES,
          proximityRadiusMeters: PROXIMITY_RADIUS_METERS,
          isCitySaoPaulo,
          messageOutsideSaoPaulo: MESSAGE_OUTSIDE_SAO_PAULO,
          isValidDomainDescription,
          mapUrbanRiskLevelToSeverity,
          geocodeAddressWithGoogle,
          geocodeAddressToCoord,
          adjustSeverityForProximityToSensitiveEquipment,
          normalizeReportNature,
          insertClassificationPredictionLog,
          inferUrbanClassificationSource,
          autoInferRisk,
          insertReportSeverityAuditLog,
          detectEmergingCategory,
        });

      case "create_transport_report":
        return await handleCreateTransportReport(args, userId, supabase, accumulatedFields, {
          isTransportLinePickerPayload,
          isValidDomainDescription,
          normalizeTransportSubcategory,
          generateTransportLabelFromDescription,
          isValidTransportSubcategory,
          getTransportSubcategoryLabel,
          getTransportTypeLabel,
          parseFlexibleOccurrenceTime,
          normalizeTransportRecurrenceFrequency,
          transportSeverityOrder: TRANSPORT_SEVERITY_ORDER,
          applyPersonalImpactToSeverity,
          getTransportReportLatLonForBounds,
          isPointInSaoPauloBounds,
          normalizeTransportAccessibilityDetails,
          insertClassificationPredictionLog,
          inferTransportClassificationSource,
          insertReportSeverityAuditLog,
          formatTransportAccessibilitySummary,
          detectEmergingCategory,
        });

      case "create_service_rating":
        return await handleCreateServiceRating(args, userId, supabase, accumulatedFields, {
          isCompleteServiceRatingDimensions,
          buildServiceRatingDimensionsFromWizardScores,
          aggregateRatingDimensionsStars,
          serviceRatingVisitDeadlineExpiredMessage: SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE,
          isVisitRatingWindowClosed,
          getZonedDayUtcBoundsISO,
          serviceRatingDedupTz: SERVICE_RATING_DEDUP_TZ,
          serviceRatingDuplicateDayMessage: SERVICE_RATING_DUPLICATE_DAY_MESSAGE,
          inferServiceRatingSentimentFromMean,
          shouldOfferServiceRatingReferral,
        });

      case "search_knowledge_base":
        return await handleSearchKnowledgeBase(args, supabase, { searchKnowledgeBase });

      case "get_service_occupancy_status":
        return await handleGetServiceOccupancyStatus(args, supabase, {
          getServiceOccupancyStatusByServiceId,
          getServiceOccupancyStatusByName,
        });

      case "find_nearby_services":
        return await handleFindNearbyServices(args, supabase, userId, accumulatedFields, {
          geocodeAddressWithGoogle,
          geocodeAddressToCoord,
          reverseGeocodeLatLon,
          findNearbyServices,
        });

      case "search_audiencias":
        return await handleSearchAudiencias(args, supabase, { searchAudiencias: searchAudienciasHelper });

      case "subscribe_audiencia_topic_alert":
        return await handleSubscribeAudienciaTopicAlert(args, supabase, userId);

      case "subscribe_service":
        return await handleSubscribeService(args, supabase, userId);

      case "subscribe_transport_line":
        return await handleSubscribeTransportLine(args, supabase, userId);

      case "suggest_council_member":
        return await handleSuggestCouncilMember(args, { suggestCouncilMember });

      case "get_citizen_history":
        return await handleGetCitizenHistory(args, supabase, userId, { getCitizenHistory });

      case "search_bus_lines":
        return await handleSearchBusLines(args, {
          olhoVivoSearchLines,
          olhoVivoSearchStops,
          olhoVivoGetStopsByLine,
          olhoVivoPrevisao,
          olhoVivoPrevisaoParada,
        });

      case "search_bus_stops":
        return await handleSearchBusStops(args, {
          olhoVivoSearchLines,
          olhoVivoSearchStops,
          olhoVivoGetStopsByLine,
          olhoVivoPrevisao,
          olhoVivoPrevisaoParada,
        });

      case "get_bus_line_itinerary":
        return await handleGetBusLineItinerary(args, {
          olhoVivoSearchLines,
          olhoVivoSearchStops,
          olhoVivoGetStopsByLine,
          olhoVivoPrevisao,
          olhoVivoPrevisaoParada,
        });

      case "get_bus_arrival_forecast":
        return await handleGetBusArrivalForecast(args, {
          olhoVivoSearchLines,
          olhoVivoSearchStops,
          olhoVivoGetStopsByLine,
          olhoVivoPrevisao,
          olhoVivoPrevisaoParada,
        });

      case "get_bus_stop_forecast_all_lines":
        return await handleGetBusStopForecastAllLines(args, {
          olhoVivoSearchLines,
          olhoVivoSearchStops,
          olhoVivoGetStopsByLine,
          olhoVivoPrevisao,
          olhoVivoPrevisaoParada,
        });

      case "detect_user_intent":
        return handleDetectUserIntent(args);

      case "confirm_journey_switch":
        return handleConfirmJourneySwitch(args);

      default:
        return { success: false, message: `Função ${name} não reconhecida.` };
    }
  } catch (error) {
    console.error(`[executeTool] Error executing ${name}:`, error);
    return { success: false, message: `Erro ao executar ${name}: ${(error as Error).message}` };
  }
}
