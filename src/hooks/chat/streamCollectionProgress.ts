import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import { normalizeServiceTypeToDbEnum } from "@/lib/publicServiceType";
import { shouldIgnoreStaleCollectionProgress } from "@/lib/chatOrchestratorClient";
import { shouldEnterLightJourney } from "@/lib/chatJourneyState";
import { VALID_TRACKER_TYPES, LIGHT_JOURNEY_TYPES } from "@/hooks/useChatJourneyConstants";

export interface ApplyStreamCollectionProgressParams {
  progressType: string;
  fieldsJson: Record<string, unknown>;
  lastUserMessageContent: string;
  currentCollectionType: CollectionType | null;
  currentLightJourneyType: string | null;
  validTrackerTypes?: CollectionType[];
  lightJourneyTypes?: readonly string[];
}

export interface ApplyStreamCollectionProgressResult {
  collectionType: CollectionType | null;
  lightJourneyType: string | null;
  fieldsPatch: CollectedFields | null;
  ignoredStale: boolean;
}

/** CHB-010: lógica testável de COLLECTION_PROGRESS no stream SSE. */
export function applyStreamCollectionProgress(
  params: ApplyStreamCollectionProgressParams,
): ApplyStreamCollectionProgressResult {
  const validTracker = params.validTrackerTypes ?? VALID_TRACKER_TYPES;
  const lightTypes = params.lightJourneyTypes ?? LIGHT_JOURNEY_TYPES;
  const type = params.progressType as CollectionType;

  if (
    shouldIgnoreStaleCollectionProgress({
      progressType: type,
      lastUserMessageContent: params.lastUserMessageContent,
    })
  ) {
    return {
      collectionType: params.currentCollectionType,
      lightJourneyType: params.currentLightJourneyType,
      fieldsPatch: null,
      ignoredStale: true,
    };
  }

  const fieldsNorm = { ...params.fieldsJson };
  if (typeof fieldsNorm.service_type === "string") {
    const n = normalizeServiceTypeToDbEnum(fieldsNorm.service_type);
    if (n) fieldsNorm.service_type = n;
  }

  if (validTracker.includes(type)) {
    return {
      collectionType: type,
      lightJourneyType: null,
      fieldsPatch: fieldsNorm as CollectedFields,
      ignoredStale: false,
    };
  }

  if (params.currentCollectionType && validTracker.includes(params.currentCollectionType)) {
    return {
      collectionType: params.currentCollectionType,
      lightJourneyType: params.currentLightJourneyType,
      fieldsPatch: fieldsNorm as CollectedFields,
      ignoredStale: false,
    };
  }

  return {
    collectionType: params.currentCollectionType,
    lightJourneyType: params.currentLightJourneyType,
    fieldsPatch: null,
    ignoredStale: false,
  };
}

export function applyLightJourneyMarker(params: {
  journey: string;
  currentCollectionType: CollectionType | null;
  currentLightJourneyType: string | null;
  lastUserMessageContent: string;
  lightJourneyTypes?: readonly string[];
}): { lightJourneyType: string | null; clearStructured: boolean } {
  const lightTypes = params.lightJourneyTypes ?? LIGHT_JOURNEY_TYPES;
  if (!lightTypes.includes(params.journey)) {
    return { lightJourneyType: params.currentLightJourneyType, clearStructured: false };
  }
  const explicitSwitch = params.lastUserMessageContent.includes(
    `[JOURNEY_SWITCHED:${params.journey}]`,
  );
  const canEnter = shouldEnterLightJourney({
    currentCollectionType: params.currentCollectionType,
    validTrackerTypes: VALID_TRACKER_TYPES,
    explicitSwitchToLight: explicitSwitch,
  });
  if (!canEnter) {
    return { lightJourneyType: params.currentLightJourneyType, clearStructured: false };
  }
  return { lightJourneyType: params.journey, clearStructured: !!params.currentCollectionType };
}
