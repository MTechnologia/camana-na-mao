import type { CollectionIntent } from "./lib.ts";
import { LIGHT_JOURNEY_TYPES } from "./lib-index-collection-intent.ts";
import { buildJourneySnapshotV1, type JourneySnapshotV1 } from "./lib-index-journey-snapshot.ts";

type ChatHistoryEntry = {
  role: string;
  content: string;
};

type BuildAccumulatedContextArgs = {
  chatHistoryTyped: ChatHistoryEntry[];
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  evaluationContext: unknown;
  journeyDeclined: boolean;
  journeySwitched: boolean;
  lastUserMsg: string;
  lib: typeof import("./lib.ts");
};

type BuildAccumulatedContextResult = {
  accumulatedFields: Record<string, unknown>;
  journeySnapshot: JourneySnapshotV1 | null;
  lightJourneyMarker: string;
};

export async function buildAccumulatedContext(
  args: BuildAccumulatedContextArgs,
): Promise<BuildAccumulatedContextResult> {
  const {
    chatHistoryTyped,
    chatMessages,
    collectionIntent,
    evaluationContext,
    journeyDeclined,
    journeySwitched,
    lastUserMsg,
    lib,
  } = args;

  let accumulatedFields: Record<string, unknown> = {};
  if (collectionIntent) {
    if (journeySwitched) {
      accumulatedFields = {};
      console.log("[ai-orchestrator] Journey switched, starting with fresh fields");
    } else {
      accumulatedFields = lib.accumulateFieldsFromHistory(chatHistoryTyped, collectionIntent.type);
      accumulatedFields = { ...accumulatedFields, ...collectionIntent.fields };

      if (evaluationContext && collectionIntent.type === "service_rating") {
        if (typeof evaluationContext === "object" && evaluationContext !== null && !Array.isArray(evaluationContext)) {
          const evalCtx = evaluationContext as Record<string, unknown>;
          accumulatedFields = { ...accumulatedFields, ...evalCtx };
          console.log("[ai-orchestrator] Evaluation context injected:", Object.keys(evalCtx));
        }
      }
    }

    const needsCepLookup = accumulatedFields.cep && (
      !accumulatedFields.street ||
      !accumulatedFields.neighborhood ||
      (collectionIntent.type === "urban_report" && !accumulatedFields.city)
    );
    if (needsCepLookup) {
      const cepLookup = await lib.lookupCEP(String(accumulatedFields.cep ?? ""));
      if (cepLookup.valid) {
        console.log(
          "[ai-orchestrator] Auto-resolved CEP:",
          accumulatedFields.cep,
          "→",
          cepLookup.street,
          cepLookup.neighborhood,
          cepLookup.city,
        );
        if (!accumulatedFields.street && cepLookup.street) {
          accumulatedFields.street = cepLookup.street;
        }
        if (!accumulatedFields.neighborhood && cepLookup.neighborhood) {
          accumulatedFields.neighborhood = cepLookup.neighborhood;
        }
        if (!accumulatedFields.city && cepLookup.city) {
          accumulatedFields.city = cepLookup.city;
        }
        if (!accumulatedFields.state && cepLookup.state) {
          accumulatedFields.state = cepLookup.state;
        }
      }
    }

    if (collectionIntent.type === "urban_report" && !journeySwitched && !journeyDeclined) {
      const userMessages = chatMessages.filter((message: Record<string, unknown>) => message.role === "user");
      const nU = userMessages.length;
      const lastTrim = String(lastUserMsg || "").trim();
      const firstU = nU >= 1 ? String(userMessages[0].content || "").trim() : "";
      const firstIsNature = lib.normalizeReportNature(firstU) !== null;
      const firstIsShortGreeting = firstU.length > 0 &&
        firstU.length <= 24 &&
        /^(oi|ol[aá]|opa|hey|bom\s+dia|boa\s+tarde|boa\s+noite)\b/i.test(firstU);
      const incidentOk = lib.messageLooksLikeUrbanIncidentStarter(lastTrim) &&
        lib.isValidDomainDescription(lastTrim, "urban") &&
        !lib.isGenericIntentText(lastTrim) &&
        !lib.isBareUrbanReportNatureReply(lastTrim);
      const shapeOk = (nU === 1 && lastTrim === String(userMessages[0].content || "").trim()) ||
        (nU === 2 &&
          lastTrim === String(userMessages[1].content || "").trim() &&
          (firstIsNature || firstIsShortGreeting));

      if (shapeOk && incidentOk && accumulatedFields.location_method == null && !accumulatedFields.urban_registered_address_ack) {
        if (!accumulatedFields.report_nature) {
          accumulatedFields.report_nature = "reclamacao";
        }
        accumulatedFields.description = lastTrim;
        console.log(
          "[ai-orchestrator] Urban incident opening: report_nature + description definidos → fluxo até location_method",
        );
      }
    }

    console.log("[ai-orchestrator] Effective collectionType:", collectionIntent.type);
    console.log("[ai-orchestrator] Accumulated fields:", JSON.stringify(accumulatedFields));
  }

  let lightJourneyMarker = "";
  if (collectionIntent && LIGHT_JOURNEY_TYPES.includes(collectionIntent.type as (typeof LIGHT_JOURNEY_TYPES)[number])) {
    lightJourneyMarker = `[LIGHT_JOURNEY:${collectionIntent.type}]`;
    console.log("[ai-orchestrator] Will emit light journey marker:", lightJourneyMarker);
  }

  const journeySnapshot = collectionIntent
    ? buildJourneySnapshotV1(collectionIntent.type, accumulatedFields)
    : null;

  return {
    accumulatedFields,
    journeySnapshot,
    lightJourneyMarker,
  };
}
